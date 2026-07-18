import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Adjust import to your auth setup

export async function GET(
  req: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the appointment along with Patient details and Test Parameters
    const appointment = await prisma.appointment.findUnique({
      where: { 
        id: params.appointmentId,
        labId: user.labId 
      },
      include: {
        patient: {
          select: {
            patientId: true,
            name: true,
            phone: true,
            gender: true,
            age: true, // or dateOfBirth depending on your schema
          }
        },
        tests: {
          include: {
            testTemplate: {
              include: {
                parameters: {
                  where: { parameter: { isActive: true } },
                  include: {
                    parameter: {
                      include: { referenceRanges: true },
                    },
                  },
                  orderBy: { order: "asc" },
                },
              },
            },
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // The UI expects each test to expose a flat `parameters` list. Parameters
    // belong to TestTemplate through TestTemplateParameter, not directly to Test.
    const entryAppointment = {
      ...appointment,
      tests: appointment.tests.map((test) => ({
        ...test,
        name: test.testName,
        parameters: (test.testTemplate?.parameters || []).map(({ parameter }) => {
          const range = parameter.referenceRanges[0];
          const normalRange = range?.displayText
            || range?.textValue
            || (range?.lowValue != null || range?.highValue != null
              ? `${range.lowValue ?? ""} - ${range.highValue ?? ""}`
              : "N/A");
          return {
            id: parameter.id,
            name: parameter.printName || parameter.name,
            unit: parameter.unit,
            normalRange,
          };
        }),
      })),
    };

    return NextResponse.json({ appointment: entryAppointment }, { status: 200 });

  } catch (error: any) {
    console.error("Fetch Entry Error:", error);
    return NextResponse.json({ error: "Failed to load test parameters" }, { status: 500 });
  }
}
