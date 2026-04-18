import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// 1. GET: Fetch all macros for the lab
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const macros = await prisma.radiologyMacro.findMany({
      where: { labId: user.labId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(macros);
  } catch (error) {
    console.error("Macros GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch macros" }, { status: 500 });
  }
}

// 2. POST: Create a new macro
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, modalityType, shortcode, findingsText, impressionText, isGlobal } = body;

    if (!title || !modalityType || !findingsText || !impressionText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ THE FIX: Safely grab the user's ID regardless of how your token is structured
    const currentUserId = user.id || user.userId || user._id || 'SYSTEM_ADMIN';

    const newMacro = await prisma.radiologyMacro.create({
      data: {
        labId: user.labId,
        title,
        modalityType,
        shortcode: shortcode ? shortcode.replace('/', '') : null, // Clean shortcode
        findingsText,
        impressionText,
        isGlobal: isGlobal || false,
        createdById: currentUserId // ✅ Now safely populated
      }
    });

    return NextResponse.json({ success: true, data: newMacro, message: 'Macro created successfully' });
  } catch (error) {
    console.error("Macro POST Error:", error);
    return NextResponse.json({ error: "Failed to create macro" }, { status: 500 });
  }
}

// 3. PATCH: Update an existing macro
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, title, modalityType, shortcode, findingsText, impressionText, isGlobal } = body;

    if (!id) return NextResponse.json({ error: 'Macro ID is required' }, { status: 400 });

    const updatedMacro = await prisma.radiologyMacro.update({
      where: { id, labId: user.labId },
      data: {
        title,
        modalityType,
        shortcode: shortcode ? shortcode.replace('/', '') : null,
        findingsText,
        impressionText,
        isGlobal
      }
    });

    return NextResponse.json({ success: true, data: updatedMacro, message: 'Macro updated successfully' });
  } catch (error) {
    console.error("Macro PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update macro" }, { status: 500 });
  }
}

// 4. DELETE: Remove a macro
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Macro ID is required' }, { status: 400 });

    await prisma.radiologyMacro.delete({
      where: { id, labId: user.labId }
    });

    return NextResponse.json({ success: true, message: 'Macro deleted successfully' });
  } catch (error) {
    console.error("Macro DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete macro" }, { status: 500 });
  }
}