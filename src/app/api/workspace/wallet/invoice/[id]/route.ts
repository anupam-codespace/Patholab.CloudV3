import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { format } from "date-fns";

// ✅ Safely handle Next.js/Webpack module resolution
const pdfMakeModule = require("pdfmake");
const PdfPrinter = pdfMakeModule.default || pdfMakeModule;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDataFromToken(req);

    if (!session?.labId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. Fetch Transaction & Lab Data
    const tx = await prisma.walletTransaction.findFirst({
      where: {
        id: params.id,
        labId: session.labId,
        type: "RECHARGE",
      },
    });

    if (!tx) return new NextResponse("Invoice not found", { status: 404 });

    const lab = await prisma.lab.findUnique({
      where: { id: session.labId },
    });

    const config = await prisma.systemConfig.findFirst();

    // 2. Financial Calculations
    const baseAmount = Number(tx.amount);
    const taxRate = Number(config?.taxRate || 18);
    const gstAmount = Number((baseAmount * (taxRate / 100)).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));
    
    // Half for CGST, Half for SGST (Standard Indian Tax Format)
    const splitTax = (gstAmount / 2).toFixed(2); 

    // 3. ✅ CONFIGURE BUILT-IN FONTS (NO CUSTOM FILES NEEDED!)
    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };

    const printer = new PdfPrinter(fonts);

    // 4. Document Definition (Professional Layout)
    const docDefinition: any = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 60],
      defaultStyle: {
        font: "Helvetica", // Use the built-in font
        fontSize: 10,
        color: "#333333",
        lineHeight: 1.3,
      },
      content: [
        // --- TOP HEADER ---
        {
          columns: [
            {
              width: "*",
              text: config?.systemName || "Patholab Cloud Platform",
              fontSize: 24,
              bold: true,
              color: "#1e40af", // Professional deep blue
            },
            {
              width: "auto",
              text: "TAX INVOICE",
              fontSize: 20,
              bold: true,
              color: "#64748b",
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 10],
        },

        // --- COMPANY DETAILS & INVOICE META ---
        {
          canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }],
          margin: [0, 0, 0, 15],
        },
        {
          columns: [
            {
              width: "*",
              text: [
                { text: `${config?.systemAddress || "HQ Address Unavailable"}\n` },
                { text: `Email: ${config?.systemEmail || "billing@patholab.cloud"}\n` },
                { text: `Phone: ${config?.systemPhone || "+91-0000000000"}\n` },
                { text: `GSTIN: ${config?.gstNumber || "Unregistered"}`, bold: true },
              ],
            },
            {
              width: 200,
              text: [
                { text: "Invoice Number: ", bold: true }, `INV-${tx.id.substring(0, 8).toUpperCase()}\n`,
                { text: "Date of Issue: ", bold: true }, `${format(new Date(tx.createdAt), "dd MMM yyyy")}\n`,
                { text: "Time: ", bold: true }, `${format(new Date(tx.createdAt), "hh:mm a")}\n`,
                { text: "Payment Mode: ", bold: true }, "Prepaid Wallet (Online)\n",
                { text: "Status: ", bold: true }, { text: "PAID", color: "#16a34a" },
              ],
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // --- BILLED TO SECTION ---
        {
          fillColor: "#f8fafc",
          padding: [15, 10, 15, 10],
          layout: "noBorders",
          margin: [0, 0, 0, 25],
          table: {
            widths: ["*"],
            body: [
              [
                {
                  text: [
                    { text: "BILLED TO:\n", fontSize: 9, color: "#64748b", bold: true },
                    { text: `${lab?.name || "Unknown Lab"}\n`, fontSize: 14, bold: true, color: "#0f172a" },
                    { text: `${lab?.address || "Address not provided"}\n` },
                    { text: `Phone: ${lab?.phone || "N/A"}  |  Email: ${lab?.email || "N/A"}\n` },
                  ],
                },
              ],
            ],
          },
        },

        // --- ITEMS TABLE ---
        {
          table: {
            headerRows: 1,
            widths: ["*", 80, 100],
            body: [
              // Table Header
              [
                { text: "DESCRIPTION", bold: true, fillColor: "#1e40af", color: "#ffffff", border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: "TAX %", bold: true, alignment: "center", fillColor: "#1e40af", color: "#ffffff", border: [false, false, false, false], margin: [5, 5, 5, 5] },
                { text: "AMOUNT (₹)", bold: true, alignment: "right", fillColor: "#1e40af", color: "#ffffff", border: [false, false, false, false], margin: [5, 5, 5, 5] },
              ],
              // Table Row
              [
                { text: "Wallet Recharge (Platform Credits)\nSAC Code: 9983", margin: [5, 10, 5, 10], border: [false, false, false, true] },
                { text: `${taxRate}%`, alignment: "center", margin: [5, 10, 5, 10], border: [false, false, false, true] },
                { text: baseAmount.toFixed(2), alignment: "right", margin: [5, 10, 5, 10], border: [false, false, false, true] },
              ],
            ],
          },
          layout: {
            hLineColor: function () { return "#e2e8f0"; },
            vLineWidth: function () { return 0; },
          },
          margin: [0, 0, 0, 15],
        },

        // --- FINANCIAL SUMMARY ---
        {
          columns: [
            { width: "*", text: "" }, // Spacer
            {
              width: 220,
              table: {
                widths: ["*", 80],
                body: [
                  [{ text: "Subtotal:", color: "#475569" }, { text: baseAmount.toFixed(2), alignment: "right" }],
                  [{ text: `CGST (${taxRate / 2}%):`, color: "#475569" }, { text: splitTax, alignment: "right" }],
                  [{ text: `SGST (${taxRate / 2}%):`, color: "#475569" }, { text: splitTax, alignment: "right" }],
                  [
                    { text: "Grand Total:", bold: true, fontSize: 12, margin: [0, 5, 0, 0] },
                    { text: `₹ ${totalAmount.toFixed(2)}`, bold: true, fontSize: 12, alignment: "right", margin: [0, 5, 0, 0] }
                  ],
                ],
              },
              layout: "noBorders",
            },
          ],
          margin: [0, 0, 0, 40],
        },

        // --- SIGNATURE & STAMP ---
        {
          columns: [
            { width: "*", text: "" },
            {
              width: 200,
              text: [
                { text: `For ${config?.systemName || "Patholab Cloud"}\n\n\n\n`, bold: true, alignment: "center" },
                { text: "Authorized Signatory", alignment: "center", border: [false, true, false, false] }
              ]
            }
          ],
          margin: [0, 0, 0, 30]
        },

        // --- TERMS & CONDITIONS ---
        {
          text: "Terms & Conditions:",
          fontSize: 9,
          bold: true,
          color: "#64748b",
        },
        {
          ul: [
            "This is a computer-generated invoice and does not require a physical signature.",
            "Wallet recharges are strictly non-refundable and non-transferable.",
            "Credits are valid for 1 year from the date of recharge.",
            "All disputes are subject to the jurisdiction of the company's registered address."
          ],
          fontSize: 8,
          color: "#64748b",
          margin: [0, 5, 0, 0]
        }
      ],
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice_${tx.id.substring(0, 8)}.pdf"`, // Changed to 'inline' so it previews in browser nicely
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return new NextResponse("Error generating invoice PDF", { status: 500 });
  }
}