import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Adjust to your auth setup

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🚀 ADD THIS ROLE GUARD
    const allowedRoles = ["LAB_OWNER", "LAB_MANAGER", "TECHNICIAN", "PATHOLOGIST"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Only authorized clinical staff can enter results." }, { status: 403 });
    }

    const { appointmentId, results } = await req.json();

    if (!appointmentId || !results || Object.keys(results).length === 0) {
      return NextResponse.json({ error: "Missing appointment ID or results data" }, { status: 400 });
    }

    // Wrap the saves in a transaction so we don't get partial results if something fails
    await prisma.$transaction(async (tx) => {
      
      // 1. Get the appointment to find the actual testId
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId, labId: user.labId },
        include: { tests: true }
      });

      if (!appointment || appointment.tests.length === 0) {
        throw new Error("Appointment or Tests not found");
      }

      // Assuming one test per appointment for this workflow:
      const testId = appointment.tests[0].id;

      // 2. Fetch the parameter definitions so we can get their printName and code
      const parameterIds = Object.keys(results);
      const labParameters = await tx.labTestParameter.findMany({
        where: { id: { in: parameterIds } }
      });

      // 3. Delete any existing results for this test to prevent duplicates when re-saving
      await tx.testResultParameter.deleteMany({
        where: { testId: testId }
      });

      // 4. Map the frontend results to match your TestResultParameter schema
      const resultEntries = labParameters.map((param) => {
        const val = results[param.id];
        const numericVal = parseFloat(val);

        return {
          testId: testId,
          parameterCode: param.code,
          printName: param.name,
          textValue: val,
          numericValue: isNaN(numericVal) ? null : numericVal,
          entryMethod: "MANUAL"
        };
      });

      // 5. Insert the new results
      await tx.testResultParameter.createMany({
        data: resultEntries
      });

      // 6. Advance the appointment status
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: "RESULT_ENTERED" } 
      });

      // 7. Log the audit trail
      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: "RESULTS_ENTERED",
          entity: "APPOINTMENT",
          entityType: "APPOINTMENT", // Fixed missing field
          entityId: appointmentId,
          description: `Test results manually entered by ${user.name || "Technician"}. Awaiting doctor validation.`
        }
      });
    });

    return NextResponse.json({ success: true, message: "Results saved and sent for review." });

  } catch (error: any) {
    console.error("Save Results Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save results securely." }, { status: 500 });
  }
}