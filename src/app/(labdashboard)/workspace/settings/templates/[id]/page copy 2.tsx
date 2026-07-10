"use client";

import React, { useState, useEffect } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { config } from "@/components/puck/puck.config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Upload,
  ArrowLeft,
  LayoutTemplate,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// ============================================================================
// DEFAULT A4 TEMPLATE DATA
// ============================================================================
const initialData = {
  content: [
    {
      type: "LabHeader",
      props: {
        id: "header-1",
        isAbsolute: false,
        labName: "GLOBIZ PATHOLAB",
        tagline: "Advanced Diagnostics Center",
        logoSize: 60,
        logoPosition: "left",
        themeColor: "#1e3a8a",
        textColor: "#1e293b",
        showSeparator: true,
        headerHeight: 100,
      },
    },
    {
      type: "PatientDemographics",
      props: {
        id: "demo-1",
        isAbsolute: false,
        showBarcode: true,
        barcodeValue: "{{sample.barcode}}",
        barcodePosition: "top-right",
        gridColumns: 2,
        labelColor: "#64748b",
        valueColor: "#0f172a",
        borderColor: "#cbd5e1",
        bgColor: "#f8fafc",
        padding: 12,
      },
    },
    {
      type: "DynamicResultsTable",
      props: {
        id: "table-1",
        isAbsolute: false,
        departmentName: "BIOCHEMISTRY",
        headerBgColor: "#f1f5f9",
        headerTextColor: "#0f172a",
        rowBgColor: "#ffffff",
        rowAlternateColor: "#f8fafc",
        borderColor: "#cbd5e1",
        showUnits: true,
        showRefRange: true,
        showFlags: true,
      },
    },
    {
      type: "LabFooter",
      props: {
        id: "footer-1",
        isAbsolute: false,
        isFixedBottom: true,
        disclaimerText:
          "*** End of Report ***\nThis is an electronically generated report and does not require a physical signature.",
        footerBgColor: "transparent",
        footerTextColor: "#64748b",
      },
    },
  ],
  root: {
    props: {
      pageWidth: "210mm",
      pageHeight: "297mm",
      marginTop: 15,
      marginBottom: 15,
      marginLeft: 15,
      marginRight: 15,
      backgroundColor: "#ffffff",
      borderShow: false,
      borderWidth: 1,
      borderColor: "#000000",
      borderStyle: "solid",
      borderRadius: 0,
      watermarkOpacity: 10,
      watermarkSize: "50%",
      globalFontFamily: "Arial, sans-serif",
      globalFontSize: 12,
      globalTextColor: "#334155",
      showPageNumbers: true,
      pageNumberPosition: "bottom-right",
    },
  },
};

export default function ReportBuilderPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("puck-lims-draft");
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        setData(initialData);
      }
    } else {
      setData(initialData);
    }
  }, []);

  // Save handler
  const handleSave = (newData?: any) => {
    const dataToSave = newData || data;
    localStorage.setItem("puck-lims-draft", JSON.stringify(dataToSave));
    toast.success("Template Saved Successfully!");
    // TODO: Send to backend via API
    console.log("Saved data:", dataToSave);
  };

  const handleExport = (currentData: any) => {
    const blob = new Blob([JSON.stringify(currentData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patholab_template.json";
    a.click();
    toast.success("JSON Exported!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        setData(importedData);
        toast.success("Template Imported!");
      } catch (err) {
        toast.error("Invalid JSON file. Cannot import.");
      }
    };
    reader.readAsText(file);
  };

  if (!data)
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">
        Loading Master Builder...
      </div>
    );

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-hidden">
      {/* FontAwesome for icons */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
      />

      {/* ============================================================ */}
      {/* CUSTOM STYLES – A4 CANVAS, LAYOUT, SCROLLING                */}
      {/* ============================================================ */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* 1. Force the Puck canvas to be A4-sized and centered */
            [data-puck-canvas] {
              width: 210mm !important;
              min-height: 297mm !important;
              margin: 30px auto !important;
              background: white !important;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
              border-radius: 4px !important;
              padding: 15mm !important;
              box-sizing: border-box !important;
              overflow: visible !important;
              /* Ensure pointer events work */
              pointer-events: auto !important;
            }

            /* 2. Make the drop zone scrollable and centered */
            .puck-drop-zone {
              flex: 1 !important;
              overflow-y: auto !important;
              background: #e2e8f0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
              padding: 20px !important;
              min-height: 100% !important;
              pointer-events: auto !important;
            }

            /* 3. Hide Puck's default header completely */
            .puck-header {
              display: none !important;
            }

            /* 4. Ensure the editor container fills the remaining height */
            .puck-editor {
              height: 100% !important;
              overflow: hidden !important;
            }

            .puck-iframe-container {
              height: 100% !important;
              display: flex !important;
              flex-direction: column !important;
            }

            /* 5. Make drag handles visible and interactive */
            .puck-drag-handle {
              display: block !important;
              cursor: grab !important;
              pointer-events: auto !important;
            }

            /* 6. Ensure all interactive elements work inside canvas */
            [data-puck-canvas] * {
              pointer-events: auto !important;
            }

            /* 7. Scrollbar styling */
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: #1e293b;
            }
            ::-webkit-scrollbar-thumb {
              background: #475569;
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: #64748b;
            }
          `,
        }}
      />

      {/* ============================================================ */}
      {/* CUSTOM TOP NAVBAR WITH SAVE BUTTON                          */}
      {/* ============================================================ */}
      <div className="h-[60px] bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 text-white z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-slate-300 hover:text-white hover:bg-slate-800">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded text-blue-500">
              <LayoutTemplate size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">
                Master Template Builder
              </h1>
              <p className="text-[10px] text-slate-400">
                Puck.js Universal Layout Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label
            htmlFor="import-json"
            className="cursor-pointer flex items-center px-3 py-1.5 border border-slate-700 hover:bg-slate-800 rounded text-xs transition-colors">
            <Upload size={14} className="mr-2" /> Import JSON
            <input
              id="import-json"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </Label>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-transparent border-slate-700 hover:bg-slate-800 text-slate-200"
            onClick={() => handleExport(data)}>
            <Download size={14} className="mr-2" /> Export JSON
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-blue-700 text-white"
            onClick={() => handleSave()}>
            <Save size={14} className="mr-2" /> Save Template
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PUCK EDITOR – with header overridden to hide it             */}
      {/* ============================================================ */}
      <div className="flex-1 relative overflow-hidden">
        <Puck
          config={config}
          data={data}
          onPublish={handleSave}
          overrides={{
            header: () => null, // Hide Puck's default header
          }}
        />
      </div>
    </div>
  );
}
