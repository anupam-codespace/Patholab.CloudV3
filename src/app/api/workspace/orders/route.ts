import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { groupTestsByContainer } from '@/lib/lab-logic';

const generateShortId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { 
        patientId, 
        doctorId, 
        agencyName, 
        paymentMode,
        collectedBy, 
        collectedAt,
        notes,
        tests, 
        financials,
        isUrgent // ✅ NEW: Extract Urgent flag from Accession UI
    } = body;

    const finalCollectionDate = collectedAt ? new Date(collectedAt) : new Date();

    const isDbId = (str: string) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const isCuid = /^c[a-z0-9]{20,}$/i.test(str);
        return isUuid || isCuid;
    };
    
    let finalDoctorId = null;
    let finalReferredBy = null;
    let doctorData = null;

    if (doctorId && doctorId !== 'Self') {
        if (isDbId(doctorId)) {
            finalDoctorId = doctorId; 
            doctorData = await prisma.doctor.findUnique({ 
                where: { id: doctorId },
                include: { customTestCommissions: true }
            });
        } else {
            const doc = await prisma.doctor.findFirst({
                where: { labId: user.labId, name: { equals: doctorId, mode: 'insensitive' } },
                include: { customTestCommissions: true }
            });
            if (doc) {
                finalDoctorId = doc.id;
                doctorData = doc;
            } else {
                finalReferredBy = doctorId;
            }
        }
    }

    let finalAgencyId = null;
    let agencyData = null;

    if (agencyName && agencyName !== 'Direct') {
        if (isDbId(agencyName)) {
            finalAgencyId = agencyName;
            agencyData = await prisma.agency.findUnique({ 
                where: { id: agencyName },
                include: { customTestCommissions: true } 
            });
        } else {
            const agency = await prisma.agency.findFirst({
                where: { labId: user.labId, agencyName: { equals: agencyName, mode: 'insensitive' } },
                include: { customTestCommissions: true }
            });
            if (agency) {
                finalAgencyId = agency.id;
                agencyData = agency;
            }
        }
    }

    let newInvoiceNumber = `INV-${generateShortId()}`;
    let isUnique = false;
    while (!isUnique) {
        const existing = await prisma.invoice.findUnique({
            where: { invoiceNumber: newInvoiceNumber }
        });
        if (!existing) {
            isUnique = true;
        } else {
            newInvoiceNumber = `INV-${generateShortId()}`; 
        }
    }

    const templateIds = tests.filter((t: any) => t.type !== 'PARAMETER').map((t: any) => t.id);
    const parameterIds = tests.filter((t: any) => t.type === 'PARAMETER').map((t: any) => t.id);

    // ✅ FIXED: Included sampleType so we can pull its strict ID 
    const [dbTemplates, dbParameters] = await Promise.all([
        prisma.testTemplate.findMany({
            where: { id: { in: templateIds } },
            include: { containerType: true, sampleType: true, parameters: { include: { parameter: true } } }
        }),
        prisma.labTestParameter.findMany({
            where: { id: { in: parameterIds } },
            include: { containerType: true }
        })
    ]);

    const itemMap = new Map<string, any>();
    const allItemsToGroup: any[] = [];

    dbTemplates.forEach(template => {
        const inputItem = tests.find((t: any) => t.id === template.id);
        const mergedItem = {
            ...template,
            _finalPrice: inputItem?.price || template.price,
            _type: 'TEMPLATE'
        };
        allItemsToGroup.push(mergedItem);
        itemMap.set(template.id, mergedItem); 
    });

    dbParameters.forEach(param => {
        const inputItem = tests.find((t: any) => t.id === param.id);
        const mergedItem = {
            id: param.id,
            name: param.name,
            code: param.code,
            containerTypeId: param.containerTypeId || null,
            sampleTypeId: null, // standalone params usually inherit from the template level
            containerType: param.containerType,
            parameters: [{ parameter: param, order: 1 }],
            _finalPrice: inputItem?.price || param.price,
            _type: 'PARAMETER'
        };
        allItemsToGroup.push(mergedItem);
        itemMap.set(param.id, mergedItem); 
    });

    const sampleGroups = groupTestsByContainer(allItemsToGroup);

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          labId: user.labId,
          patientId: patientId,
          invoiceNumber: newInvoiceNumber,
          agencyId: finalAgencyId,
          subtotal: financials.subTotal,
          notes: notes,
          discount: financials.discount,
          taxableAmount: financials.subTotal - financials.discount,
          totalTax: 0, 
          grandTotal: financials.netPayable ?? (financials.subTotal - financials.discount), 
          status: (financials.balance || 0) <= 0 ? 'PAID' : 'PENDING',
          paymentMode: paymentMode || 'CASH', 
          items: {
            create: tests.map((t: any) => {
                const realItem = itemMap.get(t.id);
                let finalDescription = 'Lab Test';
                if (realItem && realItem.name) finalDescription = realItem.name;
                else if (t.name) finalDescription = t.name;

                return {
                    description: finalDescription, 
                    unitPrice: t.price,
                    total: t.price,
                    taxAmount: 0,
                    taxRate: 0,
                    quantity: 1
                };
            })
          }
        }
      });

      const dateStr = new Date().toISOString().slice(2,10).replace(/-/g, "");

      for (const group of sampleGroups) {
          const uniqueSampleId = `${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
          
          // ✅ FIXED: Get strict relational IDs from the grouped tests
          const firstTest = group.tests[0];
          const containerTypeId = firstTest?.containerTypeId || null;
          const sampleTypeId = firstTest?.sampleTypeId || null;

          await tx.sample.create({
              data: {
                  labId: user.labId,
                  patientId: patientId,
                  sampleId: uniqueSampleId,
                  
                  // Replacing old plain-text strings with correct relational IDs
                  sampleTypeId: sampleTypeId, 
                  containerTypeId: containerTypeId, 
                  
                  status: 'COLLECTED', 
                  collectedAt: finalCollectionDate,
                  collectedBy: collectedBy || "Self", 
                  tests: {
                      create: group.tests.map((item: any) => {
                          const testPrice = Number(item._finalPrice);
                          const commissionsToCreate = [];
                          
                          // -- DOCTOR COMMISSIONS --
                          if (doctorData) {
                              let docRate = doctorData.commissionRate;
                              let docType = doctorData.commissionType;

                              if (item._type === 'TEMPLATE' && doctorData.customTestCommissions) {
                                  const customOverride = doctorData.customTestCommissions.find((c: any) => c.testTemplateId === item.id);
                                  if (customOverride) {
                                      docRate = customOverride.commissionRate;
                                      docType = customOverride.commissionType;
                                  }
                              }

                              if (docRate !== undefined && docRate !== null && docRate > 0) {
                                  const amt = docType === 'PERCENTAGE' 
                                      ? (testPrice * docRate) / 100 
                                      : docRate;
                                      
                                  commissionsToCreate.push({
                                      doctorId: finalDoctorId,
                                      amount: amt,
                                      type: docType,
                                      rate: docRate,
                                      status: 'PENDING'
                                  });
                              }
                          }

                          // -- AGENCY COMMISSIONS --
                          if (agencyData) {
                              let agencyRate = agencyData.commissionRate;
                              let agencyType = agencyData.commissionType;

                              if (item._type === 'TEMPLATE' && agencyData.customTestCommissions) {
                                  const customOverride = agencyData.customTestCommissions.find((c: any) => c.testTemplateId === item.id);
                                  if (customOverride) {
                                      agencyRate = customOverride.commissionRate;
                                      agencyType = customOverride.commissionType;
                                  }
                              }

                              if (agencyRate !== undefined && agencyRate !== null && agencyRate > 0) {
                                  const amt = agencyType === 'PERCENTAGE' 
                                      ? (testPrice * agencyRate) / 100 
                                      : agencyRate;
                                      
                                  commissionsToCreate.push({
                                      agencyId: finalAgencyId,
                                      amount: amt,
                                      type: agencyType,
                                      rate: agencyRate,
                                      status: 'PENDING'
                                  });
                              }
                          }

                          return {
                              labId: user.labId,
                              testNumber: item._type === 'PARAMETER' 
                                ? `P-${Date.now()}-${Math.floor(Math.random()*1000)}` 
                                : `T-${Math.floor(Math.random() * 1000000)}`,
                              patientId: patientId,
                              invoiceId: invoice.id,
                              testTemplateId: item._type === 'TEMPLATE' ? item.id : null,
                              testName: item.name, 
                              testCode: item.code || 'CUSTOM',
                              price: testPrice,
                              finalPrice: testPrice,
                              status: 'PENDING',
                              priority: isUrgent ? 'URGENT' : 'NORMAL', // ✅ NEW: Maps to Enum
                              doctorId: finalDoctorId,
                              referredBy: finalReferredBy,
                              agencyId: finalAgencyId,
                              sampleCollectedAt: finalCollectionDate,
                              
                              commissions: commissionsToCreate.length > 0 
                                  ? { create: commissionsToCreate } 
                                  : undefined,

                              results: {
                                  create: item.parameters.map((tp: any) => ({
                                      parameterName: tp.parameter.name,
                                      value: "",
                                      unit: tp.parameter.unit || "",
                                      order: tp.order || 1
                                  }))
                              }
                          };
                      })
                  }
              }
          });
      }

      return invoice;
    }, { 
      maxWait: 5000, 
      timeout: 20000 
    });

    return NextResponse.json({ success: true, invoiceId: result.id });

  } catch (error: any) {
    console.error("Order Creation Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}