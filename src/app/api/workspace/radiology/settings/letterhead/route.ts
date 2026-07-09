import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// FETCH the existing letterhead images when the page loads
export async function GET() {
  try {
    const config = await prisma.systemConfig.findFirst({
      select: {
        letterheadHeader: true,
        letterheadFooter: true,
      }
    });
    
    return NextResponse.json(config || {});
  } catch (error) {
    console.error("Letterhead fetch error:", error);
    return NextResponse.json({ error: "Failed to load letterhead" }, { status: 500 });
  }
}

// SAVE the new letterhead images to the database
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Explicitly check for null so users can delete their letterhead if they want to
    const letterheadHeader = body.letterheadHeader === null ? null : body.letterheadHeader;
    const letterheadFooter = body.letterheadFooter === null ? null : body.letterheadFooter;

    const config = await prisma.systemConfig.findFirst();

    if (!config) {
      // If no config exists yet, create one
      await prisma.systemConfig.create({
        data: { letterheadHeader, letterheadFooter }
      });
    } else {
      // Otherwise update the existing one
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: { letterheadHeader, letterheadFooter },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Letterhead save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}