import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { format } from "date-fns";
import path from "path";

const PdfPrinter = require("pdfmake");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDataFromToken(req);

    if (!session?.labId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tx = await prisma.walletTransaction.findFirst({
      where: {
        id: params.id,
        labId: session.labId,
        type: "RECHARGE",
      },
    });

    if (!tx) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const lab = await prisma.lab.findUnique({
      where: { id: session.labId },
    });

    const config = await prisma.systemConfig.findFirst();

    const baseAmount = Number(tx.amount);
    const taxRate = Number(config?.taxRate || 18);
    const gstAmount = Number(
      (baseAmount * (taxRate / 100)).toFixed(2)
    );
    const totalAmount = Number(
      (baseAmount + gstAmount).toFixed(2)
    );

    const fonts = {
      Roboto: {
        normal: path.join(
          process.cwd(),
          "public/fonts/Roboto-Regular.ttf"
        ),
        bold: path.join(
          process.cwd(),
          "public/fonts/Roboto-Medium.ttf"
        ),
        italics: path.join(
          process.cwd(),
          "public/fonts/Roboto-Italic.ttf"
        ),
        bolditalics: path.join(
          process.cwd(),
          "public/fonts/Roboto-MediumItalic.ttf"
        ),
      },
    };

    const printer = new PdfPrinter(fonts);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 50, 40, 60],

      content: [
        {
          text:
            config?.systemName ||
            "Patholab Cloud Platform",
          style: "header",
        },

        {
          text: [
            `${config?.systemAddress || ""}\n`,
            `Email: ${
              config?.systemEmail ||
              "billing@patholab.cloud"
            }\n`,
            `Phone: ${
              config?.systemPhone ||
              "+91-0000000000"
            }\n`,
            `GSTIN: ${
              config?.gstNumber || "Unregistered"
            }`,
          ],
          style: "subHeader",
          margin: [0, 5, 0, 15],
        },

        {
          text: "TAX INVOICE",
          style: "invoiceTitle",
          margin: [0, 10, 0, 20],
        },

        {
          columns: [
            [
              {
                text: "BILLED TO",
                bold: true,
                margin: [0, 0, 0, 5],
              },
              lab?.name || "Unknown Lab",
              lab?.address || "Address not provided",
              `Phone: ${lab?.phone || "N/A"}`,
              `Email: ${lab?.email || "N/A"}`,
            ],

            [
              {
                text: "INVOICE DETAILS",
                bold: true,
                alignment: "right",
                margin: [0, 0, 0, 5],
              },
              {
                text: `Receipt No: RCPT-${tx.id
                  .substring(0, 8)
                  .toUpperCase()}`,
                alignment: "right",
              },
              {
                text: `Date: ${format(
                  new Date(tx.createdAt),
                  "dd MMM yyyy"
                )}`,
                alignment: "right",
              },
              {
                text: `Time: ${format(
                  new Date(tx.createdAt),
                  "hh:mm a"
                )}`,
                alignment: "right",
              },
              {
                text: "Payment Mode: Online",
                alignment: "right",
              },
            ],
          ],
        },

        {
          margin: [0, 25, 0, 0],
          table: {
            headerRows: 1,
            widths: ["*", 80, 120],

            body: [
              [
                {
                  text: "Description",
                  bold: true,
                },
                {
                  text: "GST %",
                  bold: true,
                  alignment: "right",
                },
                {
                  text: "Amount (₹)",
                  bold: true,
                  alignment: "right",
                },
              ],

              [
                "Wallet Recharge (Platform Credits)",
                {
                  text: `${taxRate}%`,
                  alignment: "right",
                },
                {
                  text: baseAmount.toFixed(2),
                  alignment: "right",
                },
              ],
            ],
          },
          layout: "lightHorizontalLines",
        },

        {
          margin: [0, 20, 0, 0],
          columns: [
            {
              width: "*",
              text: "",
            },

            {
              width: 250,

              table: {
                widths: ["*", 100],

                body: [
                  [
                    {
                      text: "Subtotal",
                      alignment: "right",
                    },
                    {
                      text: baseAmount.toFixed(2),
                      alignment: "right",
                    },
                  ],

                  [
                    {
                      text: `GST (${taxRate}%)`,
                      alignment: "right",
                    },
                    {
                      text: gstAmount.toFixed(2),
                      alignment: "right",
                    },
                  ],

                  [
                    {
                      text: "Total Paid",
                      bold: true,
                      alignment: "right",
                    },
                    {
                      text: totalAmount.toFixed(2),
                      bold: true,
                      alignment: "right",
                    },
                  ],
                ],
              },

              layout: "lightHorizontalLines",
            },
          ],
        },

        {
          text:
            "This is a computer-generated invoice and does not require a signature.",
          style: "footer",
          margin: [0, 50, 0, 0],
        },
      ],

      styles: {
        header: {
          fontSize: 20,
          bold: true,
        },

        subHeader: {
          fontSize: 9,
          color: "#666666",
        },

        invoiceTitle: {
          fontSize: 16,
          bold: true,
          alignment: "center",
          decoration: "underline",
        },

        footer: {
          fontSize: 9,
          italics: true,
          color: "#777777",
          alignment: "center",
        },
      },

      defaultStyle: {
        font: "Roboto",
      },
    };

    const pdfDoc =
      printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];

    const pdfBuffer = await new Promise<Buffer>(
      (resolve, reject) => {
        pdfDoc.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on("end", () => {
          resolve(Buffer.concat(chunks));
        });

        pdfDoc.on("error", reject);

        pdfDoc.end();
      }
    );

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="Patholab_Invoice_${tx.id.substring(
            0,
            8
          )}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);

    return new NextResponse(
      "Error generating invoice PDF",
      {
        status: 500,
      }
    );
  }
}