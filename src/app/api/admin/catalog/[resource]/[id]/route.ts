import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const resourceMap: Record<string, keyof typeof prisma> = {
  tests: 'testTemplate',
  parameters: 'labTestParameter',
  departments: 'department',
  samples: 'sampleType',
  containers: 'containerType',
  categories: 'testCategory',
};

export async function PATCH(request: Request, { params }: { params: { resource: string, id: string } }) {
  const modelName = resourceMap[params.resource];
  if (!modelName) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });

  try {
    const body = await request.json();
    const updated = await (prisma[modelName] as any).update({
      where: { id: params.id, isGlobal: true },
      data: body,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { resource: string, id: string } }) {
  const modelName = resourceMap[params.resource];
  if (!modelName) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });

  try {
    // Soft Delete for models that support it (Tests, Parameters, Categories)
    // Hard Delete for simple configs (Departments, Samples, Containers)
    if (['tests', 'parameters', 'categories'].includes(params.resource)) {
      await (prisma[modelName] as any).update({
        where: { id: params.id, isGlobal: true },
        data: { isActive: false },
      });
    } else {
      await (prisma[modelName] as any).delete({
        where: { id: params.id, isGlobal: true }
      });
    }
    
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}