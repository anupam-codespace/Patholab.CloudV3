// src/lib/pdf/pdf-generator.ts
// PDF Generation using jsPDF and html2canvas

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface LabInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber: string;
  logo?: string;
}

export interface PatientInfo {
  name: string;
  age?: number;
  gender?: string;
  phone: string;
  patientId: string;
  medicalHistory?: any;
  allergies?: string;
}

// ==========================================
// PDF GENERATION FUNCTIONS
// ==========================================

export async function generateTestReport(data: {
  lab: LabInfo;
  patient: PatientInfo;
  test: any;
  results: any[];
}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 20;

  // Header with Logo
  if (data.lab.logo) pdf.addImage(data.lab.logo, 'PNG', 15, yPos, 30, 30);

  // Lab Info
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.lab.name, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.lab.address, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  pdf.text(`Phone: ${data.lab.phone} | Email: ${data.lab.email}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  pdf.text(`License No: ${data.lab.licenseNumber}`, pageWidth / 2, yPos, { align: 'center' });

  // Line
  yPos += 8;
  pdf.setLineWidth(0.5);
  pdf.line(15, yPos, pageWidth - 15, yPos);

  // Report Title
  yPos += 10;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LABORATORY TEST REPORT', pageWidth / 2, yPos, { align: 'center' });

  // Patient Details
  yPos += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Patient Details:', 15, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 6;
  pdf.text(`Name: ${data.patient.name}`, 15, yPos);
  pdf.text(`Patient ID: ${data.patient.patientId}`, pageWidth / 2 + 10, yPos);
  yPos += 5;
  pdf.text(`Age: ${data.patient.age || 'N/A'} | Gender: ${data.patient.gender || 'N/A'}`, 15, yPos);
  pdf.text(`Phone: ${data.patient.phone}`, pageWidth / 2 + 10, yPos);

  // Test Details
  yPos += 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Test Details:', 15, yPos);
  pdf.setFont('helvetica', 'normal');
  yPos += 6;
  pdf.text(`Test: ${data.test.testName}`, 15, yPos);
  pdf.text(`Test Code: ${data.test.testCode}`, pageWidth / 2 + 10, yPos);
  yPos += 5;
  pdf.text(`Sample Type: ${data.test.sampleType || 'Blood'}`, 15, yPos);
  pdf.text(`Collection Date: ${new Date(data.test.sampleCollectedAt).toLocaleDateString()}`, pageWidth / 2 + 10, yPos);
  yPos += 5;
  pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, yPos);

  // Results Table
  yPos += 12;
  pdf.setFont('helvetica', 'bold');
  pdf.text('TEST RESULTS', pageWidth / 2, yPos, { align: 'center' });

  yPos += 8;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(15, yPos - 5, pageWidth - 30, 8, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Parameter', 20, yPos);
  pdf.text('Result', pageWidth / 2 - 20, yPos);
  pdf.text('Normal Range', pageWidth - 60, yPos);
  pdf.text('Unit', pageWidth - 20, yPos);

  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');

  data.results.forEach((result, index) => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = 20;
    }
    if (index % 2 === 0) pdf.setFillColor(245, 245, 245), pdf.rect(15, yPos - 5, pageWidth - 30, 7, 'F');

    pdf.text(result.parameter, 20, yPos);
    pdf.text(result.value.toString(), pageWidth / 2 - 20, yPos);
    pdf.text(result.normalRange || 'N/A', pageWidth - 60, yPos);
    pdf.text(result.unit || '', pageWidth - 20, yPos);

    yPos += 7;
  });

  // Footer
  const footerY = pageHeight - 30;
  pdf.setLineWidth(0.3);
  pdf.line(15, footerY, pageWidth - 15, footerY);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Authorized Signatory', pageWidth - 50, footerY + 8);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('This is a computer-generated report and does not require a signature.', pageWidth / 2, footerY + 15, { align: 'center' });

  return pdf;
}

// ==========================================
// Utility functions
// ==========================================
export async function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(filename);
}

export async function getPDFBlob(pdf: jsPDF): Promise<Blob> {
  return pdf.output('blob');
}

// ==========================================
// Optional Class Wrapper
// ==========================================
export class PDFGenerator {
  static async testReport(data: {
    lab: LabInfo;
    patient: PatientInfo;
    test: any;
    results: any[];
  }) {
    return await generateTestReport(data);
  }

  static async download(pdf: jsPDF, filename: string) {
    return await downloadPDF(pdf, filename);
  }

  static async blob(pdf: jsPDF) {
    return await getPDFBlob(pdf);
  }
}
