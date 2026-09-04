import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(req);
    const currentUser = await getCurrentUser();
    const user = userFromToken || currentUser;

    let labId = user?.labId;
    if (!labId && user) {
      const uid = user.userId || user.id;
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: {
            lab: true,
            staffLabs: { include: { lab: true } },
          },
        });
        const activeLab = dbUser?.lab || dbUser?.staffLabs?.[0]?.lab;
        if (activeLab) labId = activeLab.id;
      }
    }

    if (!labId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      baseAmount,
    } = await req.json();

    // 1. Fetch Secrets & System Config
    const config = await prisma.systemConfig.findFirst();
    const key_secret = config?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      return NextResponse.json({ error: "Payment gateway misconfigured" }, { status: 500 });
    }

    // 2. Verify Razorpay Signature
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 3. Update Wallet & Create Ledger Entry atomically
    const newTx = await prisma.$transaction(async (tx) => {
      let wallet = await tx.labWallet.findUnique({ where: { labId } });
      if (!wallet) {
        wallet = await tx.labWallet.create({
          data: {
            labId,
            balance: 0,
            perPatientFee: 2.5,
          },
        });
      }

      // Extend validity by 1 year from today
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const updatedWallet = await tx.labWallet.update({
        where: { labId },
        data: {
          balance: { increment: Number(baseAmount) },
          validityEndDate: oneYearFromNow,
          isActive: true,
        },
        select: { balance: true }
      });

      // Create and return the transaction record
      return await tx.walletTransaction.create({
        data: {
          labId,
          type: "RECHARGE",
          amount: Number(baseAmount),
          closingBalance: Number(updatedWallet.balance),
          description: `Wallet Recharge (Payment ID: ${razorpay_payment_id})`,
        },
        include: {
          wallet: {
            include: { lab: true }
          }
        }
      });
    });

    // ============================================================================
    // 4. GENERATE INVOICE PDF AND SEND EMAIL (Non-Blocking)
    // ============================================================================
    try {
      const lab = newTx.wallet.lab;
      const dbAmount = Number(newTx.amount);
      const taxRate = 0.18;
      const totalTax = dbAmount * taxRate;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;
      const totalPaid = dbAmount + totalTax;

      // -- Generate PDF in Memory --
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(0, 0, 210, 6, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("TAX INVOICE", 190, 22, { align: "right" });

      // Left Column (Billed To)
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("BILLED TO", 20, 25);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(lab.name, 20, 32);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      let leftY = 38;
      if (lab.address || lab.city) {
        doc.text(`${lab.address || ""}, ${lab.city || ""} ${lab.pincode || ""}`.replace(/^, /, ""), 20, leftY);
        leftY += 5;
      }
      doc.text(`Phone: ${lab.phone}`, 20, leftY); leftY += 5;
      doc.text(`Email: ${lab.email}`, 20, leftY); leftY += 7;
      doc.setFont("helvetica", "bold");
      doc.text(`GSTIN: ${lab.gstNumber || "UNREGISTERED"}`, 20, leftY);

      // Right Column (Details)
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("TRANSACTION ID", 190, 35, { align: "right" });
      doc.setTextColor(15, 23, 42);
      doc.text(`${newTx.id.split('-')[0].toUpperCase()}-${newTx.id.split('-')[4].toUpperCase()}`, 190, 40, { align: "right" });
      
      doc.setTextColor(148, 163, 184);
      doc.text("DATE & TIME", 190, 48, { align: "right" });
      doc.setTextColor(15, 23, 42);
      doc.text(format(new Date(newTx.createdAt), "dd MMM yyyy, hh:mm a"), 190, 53, { align: "right" });

      // Billed By
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

      doc.setDrawColor(16, 185, 129);
      doc.line(160, 95, 190, 95);

      // Table
      const tableStartY = 105;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(20, tableStartY, 170, 10, "FD");

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("DESCRIPTION / SERVICE", 25, tableStartY + 6.5);
      doc.text("SAC CODE", 140, tableStartY + 6.5, { align: "right" });
      doc.text("NET AMOUNT", 185, tableStartY + 6.5, { align: "right" });

      doc.rect(20, tableStartY + 10, 170, 20, "S");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Wallet Recharge`, 25, tableStartY + 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Prepaid wallet recharge for clinical software services.", 25, tableStartY + 24);
      doc.text("998314", 140, tableStartY + 18, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`Rs. ${dbAmount.toFixed(2)}`, 185, tableStartY + 18, { align: "right" });

      // Totals
      const totalsBoxY = tableStartY + 30;
      doc.setFillColor(248, 250, 252);
      doc.rect(90, totalsBoxY, 100, 45, "FD");

      let textY = totalsBoxY + 8;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Subtotal (Wallet Credit):", 95, textY);
      doc.setTextColor(30, 41, 59);
      doc.text(`Rs. ${dbAmount.toFixed(2)}`, 185, textY, { align: "right" });

      textY += 8; doc.setTextColor(71, 85, 105); doc.text("CGST (9%):", 95, textY); doc.setTextColor(30, 41, 59); doc.text(`Rs. ${cgst.toFixed(2)}`, 185, textY, { align: "right" });
      textY += 8; doc.setTextColor(71, 85, 105); doc.text("SGST (9%):", 95, textY); doc.setTextColor(30, 41, 59); doc.text(`Rs. ${sgst.toFixed(2)}`, 185, textY, { align: "right" });

      textY += 6; doc.setDrawColor(203, 213, 225); doc.line(95, textY, 185, textY);
      
      textY += 8; doc.setFontSize(12); doc.setTextColor(16, 185, 129);
      doc.text("TOTAL AMOUNT PAID:", 95, textY);
      doc.text(`+Rs. ${totalPaid.toFixed(2)}`, 185, textY, { align: "right" });

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Computer generated tax invoice. No signature required.", 105, 280, { align: "center" });
      doc.text("Powered by Patholab.cloud", 105, 285, { align: "center" });

      // Build PDF Buffer
      const arrayBuffer = doc.output("arraybuffer");
      const pdfBuffer = Buffer.from(arrayBuffer);
      const fileName = `Invoice_${format(new Date(newTx.createdAt), "yyyyMMdd")}_${newTx.id.split('-')[0].toUpperCase()}.pdf`;

      // -- Configure Nodemailer (Using Explicit process.env overrides) --
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true, // Use true for 465, false for 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"Patholab Cloud Billing" <${process.env.SMTP_USER}>`,
        to: `${user.email}, ${lab.email}, admin@globizhub.com`,
        subject: `Payment Successful - Tax Invoice from Patholab.cloud`,
        html: `
          <h3>Payment Received Successfully</h3>
          <p>Dear ${lab.name},</p>
          <p>Thank you for your recharge. Your wallet has been successfully credited with <strong>Rs. ${dbAmount.toFixed(2)}</strong>.</p>
          <p>Please find your official tax invoice attached for your accounting records.</p>
          <br/>
          <p>Regards,<br/>Patholab.cloud Billing Team</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log("Invoice Email sent successfully to", user.email, "and admin@globizhub.com");
      
    } catch (emailError) {
      // Catch error so payment still returns success to frontend
      console.error("Failed to generate PDF or send email:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}