import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Adjust to your auth setup

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        labId: user.labId,
        collectionMode: "HOME_COLLECTION",
        status: {
          in: ["RECEIVED_AT_LAB", "RESULT_ENTERED", "COMPLETED"],
        },
      },
      select: {
        id: true,
        status: true,
        appointmentDate: true,
        timeSlot: true,
        collectionAddress: true,
        pincode: true,
        updatedAt: true,
        patient: {
          select: {
            name: true,
            phone: true,
            gender: true,
          },
        },
        invoice: {
          select: {
            grandTotal: true,
          },
        },
        trip: {
          select: {
            phlebotomist: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    console.error("Fetch received home collections error:", error);
    return NextResponse.json({ error: "Failed to fetch received history." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🚀 ADD THIS ROLE GUARD
    const allowedRoles = ["LAB_OWNER", "LAB_MANAGER", "TECHNICIAN"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Only Lab Technicians or Managers can receive samples." }, { status: 403 });
    }

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json({ error: "Please provide an Appointment/Sample ID." }, { status: 400 });
    }

    // Use a transaction to ensure data integrity during handover
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the Appointment and ensure it's actually coming from the field
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId, labId: user.labId },
        include: {
          patient: true,
          trip: {
            include: { phlebotomist: true }
          }
        }
      });

      if (!appointment) {
        throw new Error("Sample/Appointment not found.");
      }

      // If it's already received, prevent double scanning
      if (appointment.status === "RECEIVED_AT_LAB") {
        throw new Error("This sample has already been received at the lab.");
      }

      // If the phlebotomist hasn't marked it collected yet, warn the lab!
      if (appointment.status !== "SAMPLE_COLLECTED") {
        throw new Error(`Cannot receive. Current status is ${appointment.status}. Phlebotomist must mark as collected first.`);
      }

      // 2. Update the status to officially transfer custody to the lab
      const updatedApt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { 
          status: "RECEIVED_AT_LAB",
          // If you have a receivedAt field, uncomment this:
          // receivedAt: new Date(), 
        }
      });

      // 3. Log the audit trail (Who handed it over, Who received it)
      // Look for the activityLog.create block and update it:
     await tx.activityLog.create({
     data: {
     labId: user.labId,
     userId: user.id,
     action: "SAMPLE_RECEIVED",
     entity: "APPOINTMENT",
     entityType: "APPOINTMENT", // 🚀 ADD THIS MISSING FIELD
     entityId: appointmentId,
     description: `Sample custody transferred from Phlebotomist (${appointment.trip?.phlebotomist?.name || "Unknown"}) to Lab Technician (${user.name}).`
     }
     });

     if (appointment.tripId) {
        const remainingTasks = await tx.appointment.count({
          where: {
            tripId: appointment.tripId,
            status: { notIn: ["RECEIVED_AT_LAB", "COMPLETED", "CANCELLED"] }
          }
        });

        if (remainingTasks === 0) {
          await tx.homeCollectionTrip.update({
            where: { id: appointment.tripId },
            data: { status: "COMPLETED" }
          });
        }
      }

      return {
        patientName: appointment.patient.name,
        phlebotomistName: appointment.trip?.phlebotomist?.name || "N/A"
      };
    });

    return NextResponse.json({ 
      success: true, 
      message: `Sample for ${result.patientName} received successfully!`,
      data: result
    });

  } catch (error: any) {
    console.error("Sample Reception Error:", error);
    return NextResponse.json({ error: error.message || "Failed to receive sample" }, { status: 500 });
  }
}