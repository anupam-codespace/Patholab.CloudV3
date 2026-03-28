import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// 1. GET: Fetch all modalities for the lab
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const modalities = await prisma.modality.findMany({
      where: { labId: user.labId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(modalities);
  } catch (error) {
    console.error("Modalities GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch modalities" }, { status: 500 });
  }
}

// 2. POST: Register a new machine
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { 
      name, type, aeTitle, ipAddress, port, 
      location, manufacturer, status, lastMaintenance, nextMaintenance 
    } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
    }

    const newModality = await prisma.modality.create({
      data: {
        labId: user.labId,
        name,
        type,
        aeTitle: aeTitle?.toUpperCase() || null,
        ipAddress: ipAddress || null,
        port: port ? parseInt(port) : null,
        location: location || null,
        manufacturer: manufacturer || null,
        status: status || 'ACTIVE',
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
      }
    });

    return NextResponse.json({ success: true, data: newModality, message: 'Machine added successfully' });
  } catch (error) {
    console.error("Modality POST Error:", error);
    return NextResponse.json({ error: "Failed to add machine" }, { status: 500 });
  }
}

// 3. PATCH: Update existing machine config (e.g., changing IP or Status)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Modality ID is required' }, { status: 400 });

    // Format specific fields
    if (updateData.aeTitle) updateData.aeTitle = updateData.aeTitle.toUpperCase();
    if (updateData.port) updateData.port = parseInt(updateData.port);
    if (updateData.lastMaintenance) updateData.lastMaintenance = new Date(updateData.lastMaintenance);
    if (updateData.nextMaintenance) updateData.nextMaintenance = new Date(updateData.nextMaintenance);

    const updatedModality = await prisma.modality.update({
      where: { id, labId: user.labId },
      data: updateData
    });

    return NextResponse.json({ success: true, data: updatedModality, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error("Modality PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}

// 4. DELETE: Remove a machine
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Modality ID is required' }, { status: 400 });

    // Note: If there are existing studies linked to this machine, Prisma will throw a foreign key error. 
    // In a real production app, you might want to "Soft Delete" (set status to INACTIVE) instead.
    await prisma.modality.delete({
      where: { id, labId: user.labId }
    });

    return NextResponse.json({ success: true, message: 'Machine removed successfully' });
  } catch (error: any) {
    console.error("Modality DELETE Error:", error);
    if (error.code === 'P2003') {
      return NextResponse.json({ error: "Cannot delete machine: It has existing patient scans linked to it. Please mark it as INACTIVE instead." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete machine" }, { status: 500 });
  }
}