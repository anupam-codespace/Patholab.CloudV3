// app/api/admin/search/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ labs: [], users: [], invoices: [] });
  }

  try {
    // Run searches in parallel for maximum performance
    const [labs, users, invoices] = await Promise.all([
      // 1. Search Labs
      prisma.lab.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { licenseNumber: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, licenseNumber: true },
        take: 5,
      }),

      // 2. Search Users
      prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, role: true },
        take: 5,
      }),

      // 3. Search Invoices
      prisma.invoice.findMany({
        where: {
          deletedAt: null,
          invoiceNumber: { contains: query, mode: "insensitive" },
        },
        select: { id: true, invoiceNumber: true, grandTotal: true, status: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ labs, users, invoices });
  } catch (error) {
    console.error("Global Search Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}