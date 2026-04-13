import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const tests = await prisma.testTemplate.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      include: { department: true }
    });
    return NextResponse.json(tests);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch global tests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newTest = await prisma.testTemplate.create({
      data: {
        ...body,
        isGlobal: true, // Force this to be a global template
        labId: null,    // Global tests don't belong to a specific lab
      }
    });

    return NextResponse.json(newTest, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_GLOBAL_TEST_ERROR", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}