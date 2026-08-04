import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode");

  if (!pincode) return NextResponse.json({ error: "Pincode required" }, { status: 400 });

  // Filter labs that have a ServiceArea covering this pincode
  const labs = await prisma.lab.findMany({
    where: {
      serviceAreas: {
        some: {
          pincode: pincode,
          isActive: true
        }
      },
      isActive: true
    },
    select: {
      id: true,
      name: true,
      portalSlug: true, // Used for redirection
      address: true
    }
  });

  return NextResponse.json({ labs });
}