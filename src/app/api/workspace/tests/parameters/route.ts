import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';

    // 2. Fetch with Fork-Hiding Logic & Search
    const parameters = await prisma.labTestParameter.findMany({
      where: {
        isActive: true, // Only show active parameters
        
        // A. Handle the Global vs Local Forking visibility
        OR: [
          { labId: user.labId }, // Show my local custom parameters
          { 
            isGlobal: true,
            forks: { none: { labId: user.labId } } // Show globals ONLY if I haven't forked them
          }
        ],
        
        // B. Handle the Search Bar filtering (if a query exists)
        ...(query ? {
          AND: [
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { code: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        } : {})
      },
      orderBy: { name: 'asc' },
      
      // 3. Deep Fetch for the Datatable and Edit Form Hydration
      include: {
        referenceRanges: true,
        containerType: { 
          select: { code: true, name: true, capColor: true } 
        },
        reagents: {
          include: {
            inventoryItem: { select: { name: true, usageUnit: true } }
          }
        }
      }
    });

    return NextResponse.json({ parameters }, { status: 200 });
  } catch (error) {
    console.error("Fetch Parameters Error:", error);
    return NextResponse.json({ error: "Failed to fetch parameters" }, { status: 500 });
  }
}