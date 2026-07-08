import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import PrintButton from "./printButton";

// This is a Server Component, so it fetches data directly from Prisma before rendering
export default async function RadiologyPrintPage({ params }: { params: { studyId: string } }) {
  const { studyId } = params;

  // 1. Fetch the Study and the Report
  const study = await prisma.radiologyStudy.findUnique({
    where: { id: studyId },
    include: {
      patient: true,
      modality: true,
      report:  true // Assuming you have a relation to get the doctor's name
        
      
    }
  });

 if (!study || !study.report) {
  return notFound();
}

// Fetch the real config from your database (which now has the letterhead fields!)
const config = await prisma.systemConfig.findFirst();

  // Fallbacks for patient data
  const pName = study.patient?.name || "Unknown Patient";
  const pAge = study.patient?.age ? `${study.patient.age} ${study.patient.ageUnit || 'Y'}` : "N/A";
  const pGender = study.patient?.gender || "U";
  const pUhid = study.patient?.patientId || study.patientId;
  const refDoctor = study.referringDoctor || "Self";
  const scanDate = study.performedAt ? format(new Date(study.performedAt), "dd-MMM-yyyy hh:mm a") : "N/A";

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:py-0 print:bg-white font-sans text-black relative">
      
      {/* 🚀 THE MAGIC FIX: Strict Print CSS overrides the Dashboard Layout */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Hide EVERYTHING globally */
            body * {
              visibility: hidden;
            }
            /* Show ONLY our specific A4 container and its contents */
            #printable-a4, #printable-a4 * {
              visibility: visible;
            }
            /* Force the container to the absolute top-left of the physical paper */
            #printable-a4 {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0 !important;
              box-shadow: none !important;
            }
            /* Tell the printer it is exactly an A4 sheet and remove default browser margins/URLs */
            @page {
              size: A4;
              margin: 0; 
            }
          }
        `
      }} />

      {/* Action Bar (Hides when printing) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      {/* A4 PAPER CONTAINER - Notice the ID we added here! */}
      <div id="printable-a4"className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl relative overflow-hidden">
        
        {/* HEADER: Dynamic Clinic / Hospital Details */}
        {/* HEADER: Dynamic Letterhead */}
        <header className="w-full px-[3mm] pt-[3mm] mb-4">
          {config?.letterheadHeader ? (
            // If they uploaded a letterhead, span it across the top!
            <img src={config.letterheadHeader} alt="Clinic Header" className="w-full h-auto object-contain" />
          ) : (
            // Fallback to the old text header if no image is uploaded
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h1 className="text-3xl font-black uppercase text-indigo-900 tracking-wider mb-1">
                {config?.systemName || "Diagnostic Centre"}
              </h1>
              <p className="text-sm font-semibold text-slate-700">{config?.systemAddress || ""}</p>
            </div>
          )}
        </header>


        <div className="px-[15mm]">
        {/* PATIENT DETAILS GRID */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border border-slate-400 p-4 rounded mb-8 text-sm">
          <div className="flex gap-2">
            <span className="font-bold w-24">Patient Name</span>
            <span className="font-semibold uppercase">: {pName}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Date</span>
            <span>: {scanDate}</span>
          </div>
          
          <div className="flex gap-2">
            <span className="font-bold w-24">Age / Sex</span>
            <span>: {pAge} / {pGender}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">UHID</span>
            <span className="font-mono">: {pUhid}</span>
          </div>
          
          <div className="flex gap-2">
            <span className="font-bold w-24">Referred By</span>
            <span className="font-semibold">: {refDoctor}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Modality</span>
            <span className="uppercase">: {study.modality?.type || "N/A"}</span>
          </div>
        </div>

        {/* REPORT TITLE */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-black uppercase underline underline-offset-4 tracking-wide">
            {study.scanName || `${study.modality?.type} Scan`}
          </h2>
        </div>

        {/* REPORT BODY */}
        <main className="space-y-6 text-sm leading-relaxed">
          <div>
            <h3 className="font-black underline mb-2 uppercase">Findings:</h3>
            <div className="whitespace-pre-wrap pl-2">
              {study.report.findings}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-black underline mb-2 uppercase">Impression:</h3>
            <div className="whitespace-pre-wrap font-bold pl-2 bg-slate-50 border border-slate-200 p-3 rounded print:border-none print:bg-transparent">
              {study.report.impression}
            </div>
          </div>
        </main>
        </div>


        {/* FOOTER / SIGNATURE BLOCK */}
        {/* FOOTER / SIGNATURE BLOCK */}
        <footer className="absolute bottom-[3mm] left-[3mm] right-[3mm]">

  <div className="flex justify-between items-end mb-3 px-[12mm]">
    <div className="text-xs text-slate-400">
      <p>
        Printed on: {format(new Date(), "dd-MMM-yyyy hh:mm a")}
      </p>
      <p className="mt-1">Page 1 of 1</p>
    </div>

    <div className="text-right">
      <div className="h-16 w-32 border-b border-dashed border-slate-400 mb-2 ml-auto" />

      <p className="font-black text-sm uppercase">
        Chief Radiologist
      </p>

      <p className="text-xs font-bold text-slate-600">
        Electronically Verified
      </p>
    </div>
  </div>

  {config?.letterheadFooter && (
    <img
      src={config.letterheadFooter}
      alt="Clinic Footer"
      className="w-full h-auto object-contain block"
    />
  )}

</footer>

      </div>
    </div>
  );
}