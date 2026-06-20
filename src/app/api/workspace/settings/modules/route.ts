import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ensure only authorized roles can change global modules
    if (user.role !== "LAB_OWNER" && user.role !== "SUPER_ADMIN" && user.role !== "LAB_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get the incoming array of active modules
    const body = await req.json();
    const { activeModules } = body;

    // Validate that it's an array
    if (!Array.isArray(activeModules)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // 4. Update the Lab record in the database
    const updatedLab = await prisma.lab.update({
      where: { id: user.labId },
      data: {
        activeModules: activeModules, // Saves the string array: ["inventory", "b2b", ...]
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Modules updated successfully",
      activeModules: updatedLab.activeModules 
    });

  } catch (error: any) {
    console.error("[MODULES_UPDATE_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}