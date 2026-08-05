import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Map URL resources to actual Prisma models
const resourceMap: Record<string, keyof typeof prisma> = {
  tests: 'testTemplate',
  parameters: 'labTestParameter',
  departments: 'department',
  samples: 'sampleType',
  containers: 'containerType',
  categories: 'testCategory',
};

export async function GET(request: Request, { params }: { params: { resource: string } }) {
  const modelName = resourceMap[params.resource];
  if (!modelName) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });

  try {
    const data = await (prisma[modelName] as any).findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch ${params.resource}` }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { resource: string } }) {
  const modelName = resourceMap[params.resource];
  if (!modelName) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });

  try {
    const body = await request.json();
    
    // Force global flags and remove lab bindings for Super Admin creations
    const data = await (prisma[modelName] as any).create({
      data: {
        ...body,
        isGlobal: true,
        labId: null,
      }
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error(`CREATE_${params.resource.toUpperCase()}_ERROR:`, error);
    return NextResponse.json({ error: `Failed to create ${params.resource}` }, { status: 500 });
  }
}