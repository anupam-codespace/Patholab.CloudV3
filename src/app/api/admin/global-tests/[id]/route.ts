import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const test = await prisma.testTemplate.findUnique({
      where: { id: params.id, isGlobal: true }
    });
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    return NextResponse.json(test);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch test" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updatedTest = await prisma.testTemplate.update({
      where: { id: params.id, isGlobal: true },
      data: body,
    });
    return NextResponse.json(updatedTest);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // SOFT DELETE: We set isActive to false instead of wiping the record
    // This preserves referential integrity for historical patient reports.
    await prisma.testTemplate.update({
      where: { id: params.id, isGlobal: true },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "Test soft-deleted (deactivated)" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}