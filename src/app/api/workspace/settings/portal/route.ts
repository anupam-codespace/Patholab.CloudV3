import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getDataFromToken } from "@/lib/auth"; // Adjust path if needed

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest) {
  try {
    // 1. Authenticate the Lab Owner
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the incoming request
    const body = await req.json();
    const { portalSlug } = body; // This will be a string like "my-lab" or null

    // 3. Validate uniqueness (if they are trying to claim a new slug)
    if (portalSlug) {
      const existingLab = await prisma.lab.findUnique({
        where: { portalSlug },
        select: { id: true }
      });

      // If a lab exists with this slug, and it's NOT the current user's lab
      if (existingLab && existingLab.id !== user.labId) {
        return NextResponse.json(
          { error: "This URL is already taken by another lab. Please choose a different one." },
          { status: 400 }
        );
      }
    }

    // 4. Update the Lab record in the database
    const updatedLab = await prisma.lab.update({
      where: { id: user.labId },
      data: { portalSlug }
    });

    return NextResponse.json({ 
      success: true, 
      portalSlug: updatedLab.portalSlug 
    });

  } catch (error: any) {
    console.error("Portal Settings Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Could not update settings." },
      { status: 500 }
    );
  }
}