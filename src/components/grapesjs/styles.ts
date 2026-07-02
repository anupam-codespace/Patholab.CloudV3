// styles.ts
export const defaultStyles = `
  /* Reset */
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm;
    background: white;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif;
    color: #334155;
    line-height: 1.5;
  }

  /* Print styles */
  @media print {
    body { box-shadow: none; margin: 0; padding: 10mm; }
  }

  /* Utility classes */
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .mt-2 { margin-top: 10px; }
  .mb-2 { margin-bottom: 10px; }
`;