import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { groupTestsByContainer } from "@/lib/lab-logic";

const generateShortId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const labId = user.labId;

    const body = await req.json();
    const {
      patientId,
      doctorId,
      agencyName,
      collectedBy,
      collectedAt,
      notes,
      tests,
      financials,
      isUrgent,
    } = body;

    const finalCollectionDate = collectedAt
      ? new Date(collectedAt)
      : new Date();

    const isDbId = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        str,
      ) || /^c[a-z0-9]{20,}$/i.test(str);

    let finalDoctorId = null,
      finalReferredBy = null,
      doctorData = null;

    if (doctorId && doctorId !== "Self") {
      if (isDbId(doctorId)) {
        finalDoctorId = doctorId;
        doctorData = await prisma.doctor.findUnique({
          where: { id: doctorId },
          include: { customTestCommissions: true },
        });
      } else {
        const doc = await prisma.doctor.findFirst({
          where: { labId, name: { equals: doctorId, mode: "insensitive" } },
          include: { customTestCommissions: true },
        });
        if (doc) {
          finalDoctorId = doc.id;
          doctorData = doc;
        } else {
          finalReferredBy = doctorId;
        }
      }
    }

    let finalAgencyId = null,
      agencyData = null;

    if (agencyName && agencyName !== "Direct") {
      if (isDbId(agencyName)) {
        finalAgencyId = agencyName;
        agencyData = await prisma.agency.findUnique({
          where: { id: agencyName },
          include: { customTestCommissions: true },
        });
      } else {
        const agency = await prisma.agency.findFirst({
          where: { labId, name: { equals: agencyName, mode: "insensitive" } },
          include: { customTestCommissions: true },
        });
        if (agency) {
          finalAgencyId = agency.id;
          agencyData = agency;
        }
      }
    }

    let invoiceNumber = `INV-${generateShortId()}`;
    while (await prisma.invoice.findUnique({ where: { invoiceNumber } })) {
      invoiceNumber = `INV-${generateShortId()}`;
    }

    const templateIds = tests
      .filter((t: any) => t.type !== "PARAMETER")
      .map((t: any) => t.id);
    const parameterIds = tests
      .filter((t: any) => t.type === "PARAMETER")
      .map((t: any) => t.id);

    const [dbTemplates, dbParameters] = await Promise.all([
      prisma.testTemplate.findMany({
        where: { id: { in: templateIds } },
        include: {
          ContainerType: true,
          SampleType: true,
          parameters: { include: { parameter: true } },
        },
      }),
      prisma.labTestParameter.findMany({
        where: { id: { in: parameterIds } },
        include: { ContainerType: true },
      }),
    ]);

    const itemMap = new Map<string, any>();
    const allItemsToGroup: any[] = [];

    dbTemplates.forEach((t) => {
      const input = tests.find((i: any) => i.id === t.id);
      const item = {
        ...t,
        _finalPrice: input?.price || t.price || 0,
        _type: "TEMPLATE",
      };
      allItemsToGroup.push(item);
      itemMap.set(t.id, item);
    });

    dbParameters.forEach((p) => {
      const input = tests.find((i: any) => i.id === p.id);
      const item = {
        id: p.id,
        name: p.name,
        code: p.code,
        containerTypeId: p.containerTypeId,
        sampleTypeId: null,
        ContainerType: p.ContainerType,
        parameters: [{ parameter: p, order: 1 }],
        _finalPrice: input?.price || 0,
        _type: "PARAMETER",
      };
      allItemsToGroup.push(item);
      itemMap.set(p.id, item);
    });

    const sampleGroups = groupTestsByContainer(allItemsToGroup);

    const result = await prisma.$transaction(
      async (tx) => {
        const discount = financials.discount || 0;
        const subtotal = financials.subTotal || 1;
        const netPayable = financials.netPayable ?? subtotal - discount;

        const invoice = await tx.invoice.create({
          data: {
            lab: { connect: { id: labId } },
            patient: { connect: { id: patientId } },
            invoiceNumber,
            ...(finalAgencyId && {
              Agency: { connect: { id: finalAgencyId } },
            }),
            subtotal,
            discount,
            taxableAmount: subtotal - discount,
            totalTax: 0,
            grandTotal: netPayable,
            status: (financials.balance || 0) <= 0 ? "PAID" : "PENDING",
            notes: notes || null,
            items: {
              create: tests.map((t: any) => {
                const realItem = itemMap.get(t.id);
                const desc = realItem?.name || t.name || "Lab Test";
                return {
                  description: desc,
                  unitPrice: t.price || 0,
                  total: t.price || 0,
                  taxAmount: 0,
                  taxRate: 0,
                  quantity: 1,
                };
              }),
            },
          },
        });

        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");

        for (const group of sampleGroups) {
          const uniqueSampleId = `${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
          const first = group.tests[0];
          const sampleTypeId = first?.SampleType?.id || null;
          const containerTypeId = first?.ContainerType?.id || null;

          await tx.sample.create({
            data: {
              lab: { connect: { id: labId } },
              patient: { connect: { id: patientId } },
              sampleId: uniqueSampleId,
              ...(sampleTypeId && {
                sampleType: { connect: { id: sampleTypeId } },
              }),
              ...(containerTypeId && {
                containerType: { connect: { id: containerTypeId } },
              }),
              status: "COLLECTED",
              collectedAt: finalCollectionDate,
              collectedBy: collectedBy || "Self",
              tests: {
                create: group.tests.map((item: any) => {
                  const testPrice = Number(item._finalPrice) || 0;
                  const proportionalDiscount =
                    (testPrice / subtotal) * discount;
                  const effectiveFinalPrice = Number(Math.max(0, testPrice - proportionalDiscount).toFixed(2));

                  const commissionsToCreate: any[] = [];
                 // DOCTOR COMMISSION
                  if (doctorData) {
                    let docRate = doctorData.commissionRate;
                    let docType = doctorData.commissionType;
                    if (
                      item._type === "TEMPLATE" &&
                      doctorData.customTestCommissions
                    ) {
                      const customOverride =
                        doctorData.customTestCommissions.find(
                          (c: any) => c.testTemplateId === item.id,
                        );
                      if (customOverride) {
                        docRate = customOverride.commissionRate;
                        docType = customOverride.commissionType;
                      }
                    }
                    if (docRate && docRate > 0) {
                      // FIX: Support all 3 Commission Types & Round to 2 decimals
                      let amt = 0;
                      if (docType === "PERCENTAGE") {
                        amt = (effectiveFinalPrice * docRate) / 100;
                      } else if (docType === "NET_PRICE") {
                        amt = Math.max(0, effectiveFinalPrice - docRate); // Commission is whatever is charged ABOVE the net price
                      } else {
                        amt = docRate; // FIXED
                      }

                      commissionsToCreate.push({
                        doctorId: finalDoctorId,
                        amount: Number(amt.toFixed(2)), // Prevents infinite float DB crashes
                        type: docType,
                        rate: docRate,
                        status: "PENDING",
                      });
                    }
                  }

                 // AGENCY COMMISSION
                  if (agencyData) {
                    let agencyRate = agencyData.commissionRate;
                    let agencyType = agencyData.commissionType;
                    if (
                      item._type === "TEMPLATE" &&
                      agencyData.customTestCommissions
                    ) {
                      const customOverride =
                        agencyData.customTestCommissions.find(
                          (c: any) => c.testTemplateId === item.id,
                        );
                      if (customOverride) {
                        agencyRate = customOverride.commissionRate;
                        agencyType = customOverride.commissionType;
                      }
                    }
                    if (agencyRate && agencyRate > 0) {
                      // FIX: Support all 3 Commission Types & Round to 2 decimals
                      let amt = 0;
                      if (agencyType === "PERCENTAGE") {
                        amt = (effectiveFinalPrice * agencyRate) / 100;
                      } else if (agencyType === "NET_PRICE") {
                        amt = Math.max(0, effectiveFinalPrice - agencyRate); // Commission is whatever is charged ABOVE the net price
                      } else {
                        amt = agencyRate; // FIXED
                      }

                      commissionsToCreate.push({
                        agencyId: finalAgencyId,
                        amount: Number(amt.toFixed(2)), // Prevents infinite float DB crashes
                        type: agencyType,
                        rate: agencyRate,
                        status: "PENDING",
                      });
                    }
                  }

                  // Build the test object
                  const testData: any = {
                    lab: { connect: { id: labId } },
                    patient: { connect: { id: patientId } },
                    testNumber:
                      item._type === "PARAMETER"
                        ? `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                        : `T-${Math.floor(Math.random() * 1000000)}`,
                    invoiceId: invoice.id,
                    testTemplateId: item._type === "TEMPLATE" ? item.id : null,
                    testName: item.name,
                    testCode: item.code || "CUSTOM",
                    price: testPrice,
                    finalPrice: effectiveFinalPrice, // FIX: Save the actual discounted price to DB
                    status: "PENDING",
                    priority: isUrgent ? "URGENT" : "NORMAL",
                    doctorId: finalDoctorId,
                    referredBy: finalReferredBy,
                    agencyId: finalAgencyId,
                    sampleCollectedAt: finalCollectionDate,
                    results: {
                      create: item.parameters.map((tp: any) => ({
                        parameterCode: tp.parameter.code, // required
                        printName: tp.parameter.printName || tp.parameter.name, // required
                        unit: tp.parameter.unit || "",
                        displayOrder: tp.order || 1,
                      })),
                    },
                  };

                  // Only add commissions if there are any
                  if (commissionsToCreate.length > 0) {
                    testData.commissions = { create: commissionsToCreate };
                  }

                  return testData;
                }),
              },
            },
          });
        }

        return invoice;
      },
      { maxWait: 5000, timeout: 20000 },
    );

    return NextResponse.json({ success: true, invoiceId: result.id });
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
