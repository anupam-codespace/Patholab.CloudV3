import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Secure Authentication
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Fetch Transaction & Lab Data safely
    const tx = await prisma.walletTransaction.findUnique({
      where: {
        id: params.id,
        labId: user.labId, // Enforce row-level security
      },
      include: {
        wallet: {
          include: { lab: true },
        },
      },
    });

    if (!tx) {
      return new NextResponse("Transaction Not Found", { status: 404 });
    }

    const lab = tx.wallet.lab;
    const isRecharge = tx.type === "RECHARGE" || tx.type === "REFUND";

    // 3. Invoice Math (Forward Calculation)
    const dbAmount = Number(tx.amount); // Usable Wallet Credit
    const closingBalance = Number(tx.closingBalance);
    
    let subtotal = dbAmount;
    let cgst = 0;
    let sgst = 0;
    let totalPaid = dbAmount;

    if (isRecharge) {
      const taxRate = 0.18; // 18% Total GST
      const totalTax = subtotal * taxRate;
      cgst = totalTax / 2; // 9% CGST
      sgst = totalTax / 2; // 9% SGST
      totalPaid = subtotal + totalTax; // Total charged via Razorpay
    }

    // 4. Initialize jsPDF Document (A4 Portrait)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // --- PDF DESIGN START ---
    
    // Top Color Bar
    if (isRecharge) doc.setFillColor(16, 185, 129); // Emerald-500
    else doc.setFillColor(244, 63, 94); // Rose-500
    doc.rect(0, 0, 210, 6, "F");

    // Document Title
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(isRecharge ? "TAX INVOICE" : "USAGE STATEMENT", 190, 22, { align: "right" });

    // --- LEFT COLUMN: BILLED TO (The Client Lab) ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("BILLED TO", 20, 25);

    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(16);
    doc.text(lab.name, 20, 32);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // Slate-600
    
    let leftY = 38;
    if (lab.address || lab.city) {
      doc.text(`${lab.address || ""}, ${lab.city || ""} ${lab.pincode || ""}`.replace(/^, /, ""), 20, leftY);
      leftY += 5;
    }
    doc.text(`Phone: ${lab.phone}`, 20, leftY);
    leftY += 5;
    doc.text(`Email: ${lab.email}`, 20, leftY);
    leftY += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: ${lab.gstNumber || "UNREGISTERED"}`, 20, leftY);

    // --- RIGHT COLUMN: DETAILS & BILLED BY ---
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("TRANSACTION ID", 190, 35, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.text(`${tx.id.split('-')[0].toUpperCase()}-${tx.id.split('-')[4].toUpperCase()}`, 190, 40, { align: "right" });

    doc.setTextColor(148, 163, 184);
    doc.text("DATE & TIME", 190, 48, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.text(format(new Date(tx.createdAt), "dd MMM yyyy, hh:mm a"), 190, 53, { align: "right" });

    // Billed By (Globizhub India Pvt Ltd.)
    doc.setTextColor(148, 163, 184);
    doc.text("BILLED BY", 190, 63, { align: "right" });
    
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Globizhub India Pvt Ltd.", 190, 68, { align: "right" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("1st Floor, No 59, Nayanpur Rd", 190, 73, { align: "right" });
    doc.text("GMC Ward Number 44, Ganeshguri", 190, 78, { align: "right" });
    doc.text("Guwahati, Assam 781006", 190, 83, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN: 18AAHCG6385Q1ZN", 190, 89, { align: "right" });

    // Status Badge background simulation
    if (isRecharge) doc.setDrawColor(16, 185, 129); // Emerald
    else doc.setDrawColor(244, 63, 94); // Rose
    doc.line(160, 95, 190, 95); // simple underline for status

    // --- TABLE HEADER ---
    const tableStartY = 105;
    doc.setDrawColor(226, 232, 240); // border-slate-200
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.rect(20, tableStartY, 170, 10, "FD");

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("DESCRIPTION / SERVICE", 25, tableStartY + 6.5);
    doc.text("SAC CODE", 140, tableStartY + 6.5, { align: "right" });
    doc.text("NET AMOUNT", 185, tableStartY + 6.5, { align: "right" });

    // --- TABLE ROW ---
    doc.rect(20, tableStartY + 10, 170, 20, "S");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(tx.description || `Wallet ${tx.type}`, 25, tableStartY + 18);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(isRecharge ? "Prepaid wallet recharge for clinical software services." : "Pay-as-you-go deduction for software usage.", 25, tableStartY + 24);

    doc.text("998314", 140, tableStartY + 18, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 185, tableStartY + 18, { align: "right" });

    // --- TOTALS BLOCK ---
    const totalsBoxY = tableStartY + 30;
    const totalsBoxHeight = isRecharge ? 45 : 25;
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.rect(90, totalsBoxY, 100, totalsBoxHeight, "FD");

    let textY = totalsBoxY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // slate-600
    
    doc.text("Subtotal (Wallet Credit):", 95, textY);
    doc.setTextColor(30, 41, 59);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 185, textY, { align: "right" });

    if (isRecharge) {
        textY += 8;
        doc.setTextColor(71, 85, 105);
        doc.text("CGST (9%):", 95, textY);
        doc.setTextColor(30, 41, 59);
        doc.text(`Rs. ${cgst.toFixed(2)}`, 185, textY, { align: "right" });

        textY += 8;
        doc.setTextColor(71, 85, 105);
        doc.text("SGST (9%):", 95, textY);
        doc.setTextColor(30, 41, 59);
        doc.text(`Rs. ${sgst.toFixed(2)}`, 185, textY, { align: "right" });
    }

    textY += 6;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(95, textY, 185, textY);

    textY += 8;
    doc.setFontSize(12);
    if (isRecharge) doc.setTextColor(16, 185, 129); // Emerald
    else doc.setTextColor(244, 63, 94); // Rose
    
    doc.text(isRecharge ? "TOTAL AMOUNT PAID:" : "TOTAL DEDUCTED:", 95, textY);
    doc.text(`${isRecharge ? '+' : '-'}Rs. ${totalPaid.toFixed(2)}`, 185, textY, { align: "right" });

    textY += 8;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("NEW WALLET BALANCE:", 95, textY);
    doc.text(`Rs. ${closingBalance.toFixed(2)}`, 185, textY, { align: "right" });

    // --- FOOTER ---
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("Computer generated tax invoice. No signature required.", 105, 280, { align: "center" });
    doc.text("Powered by Patholab.cloud", 105, 285, { align: "center" });

    // 5. Convert to Buffer and Return
    const arrayBuffer = doc.output("arraybuffer");
    const buffer = Buffer.from(arrayBuffer);

    // Provide friendly, unique file name
    const dateStr = format(new Date(tx.createdAt), "yyyyMMdd");
    const fileName = `Invoice_${dateStr}_${tx.id.split('-')[0].toUpperCase()}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`, // Triggers download
      },
    });

  } catch (error) {
    console.error("[WALLET_INVOICE_PDF_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}