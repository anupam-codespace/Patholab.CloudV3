// FILE: src/lib/barcode-generator.ts
// Barcode Generation for Test Samples
// ==========================================
import JsBarcode from 'jsbarcode';

export class BarcodeGenerator {
  static generate(text: string, format: 'CODE128' | 'CODE39' | 'EAN13' = 'CODE128') {
    const canvas = document.createElement('canvas');
    
    JsBarcode(canvas, text, {
      format,
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 12,
      margin: 10,
    });

    return canvas.toDataURL('image/png');
  }

  static generateAndDownload(testNumber: string) {
    const barcodeImage = this.generate(testNumber);
    const link = document.createElement('a');
    link.href = barcodeImage;
    link.download = `barcode-${testNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static printBarcode(testNumber: string, patientName: string) {
    const barcodeImage = this.generate(testNumber);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Sample Barcode - ${testNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .barcode-container {
              border: 2px solid #000;
              padding: 20px;
              text-align: center;
              background: white;
            }
            .header {
              font-weight: bold;
              margin-bottom: 10px;
              font-size: 16px;
            }
            .patient-info {
              margin: 10px 0;
              font-size: 14px;
            }
            .barcode-image {
              margin: 15px 0;
            }
            .instructions {
              font-size: 11px;
              color: #666;
              margin-top: 10px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="header">LABORATORY TEST SAMPLE</div>
            <div class="patient-info">
              <strong>Patient:</strong> ${patientName}<br>
              <strong>Test #:</strong> ${testNumber}<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            <div class="barcode-image">
              <img src="${barcodeImage}" alt="Barcode">
            </div>
            <div class="instructions">
              Handle with care • Store properly • Scan before processing
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }
}