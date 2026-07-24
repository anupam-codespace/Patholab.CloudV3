import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth'; // Ensure this path matches your auth utility

export async function GET(req: Request) {
  try {
    // 1. Authenticate the Super Admin
    const user = await getCurrentUser();
    
    // Optional: Add strict role checking if required
     if (!user || user.role !== 'SUPER_ADMIN') {
       return new NextResponse('Unauthorized', { status: 401 });
     }

    // 2. Fetch ALL Labs (Notice there is no 'skip' or 'take' here)
    const rawLabs = await prisma.lab.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { 
          select: { name: true, email: true, phone: true } 
        },
        wallet: true,
        _count: {
          select: {
            tests: true,
            patients: true,
            staff: true
          }
        }
      }
    });

    // 3. Define the CSV Headers
    const headers = [
      "Lab ID",
      "Laboratory Name",
      "License Number",
      "City",
      "State",
      "Owner Name",
      "Owner Email",
      "Owner Phone",
      "Total Tests",
      "Total Patients",
      "Total Staff",
      "Wallet Balance (INR)",
      "Wallet Status",
      "System Status",
      "Joined Date"
    ];

    // 4. Map the data into CSV format
    const csvRows = rawLabs.map((lab) => {
      // Helper function to safely escape strings that might contain commas
      const escape = (str: string | null | undefined) => 
        `"${(str || "").replace(/"/g, '""')}"`;

      return [
        lab.id,
        escape(lab.name),
        escape(lab.licenseNumber),
        escape(lab.city),
        escape(lab.state),
        escape(lab.owner?.name),
        escape(lab.owner?.email),
        escape(lab.owner?.phone),
        lab._count.tests,
        lab._count.patients,
        lab._count.staff,
        lab.wallet ? Number(lab.wallet.balance) : 0,
        lab.wallet?.isActive ? "Active" : "Inactive",
        lab.isActive ? "Active" : "Suspended",
        lab.createdAt.toISOString().split("T")[0] // Extracts just the YYYY-MM-DD
      ].join(",");
    });

    // 5. Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // 6. Return as a downloadable file (Streamed directly to the browser)
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="All_Labs_Export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Labs Export API Error:', error);
    return new NextResponse('Internal Server Error while exporting data', { status: 500 });
  }
}