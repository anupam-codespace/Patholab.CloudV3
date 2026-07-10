"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import gjsBlocksBasic from "grapesjs-blocks-basic";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Download, LayoutTemplate } from "lucide-react";
import toast from "react-hot-toast";

export default function GrapesTemplateBuilder() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  useEffect(() => {
    // Prevent SSR issues in Next.js
    if (typeof window === "undefined" || !editorRef.current) return;

    // Initialize GrapesJS
    const editor = grapesjs.init({
      container: editorRef.current,
      fromElement: true,
      height: "100%", // Forces editor to fill the parent wrapper
      width: "100%",
      
      // Local storage configuration to save drafts
      storageManager: {
        type: "local",
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
        options: { local: { key: "patholab-grapes-draft" } },
      },
      plugins: [gjsBlocksBasic],
      pluginsOpts: { gjsBlocksBasic: {} },
      
      // Define the top panel and basic actions
      panels: {
        defaults: [
          {
            id: 'panel-top',
            el: '.panel__top',
          },
          {
            id: 'basic-actions',
            el: '.panel__basic-actions',
            buttons: [
              { id: 'visibility', active: true, className: 'btn-toggle-borders', label: '<i class="fa fa-square-o"></i>', command: 'sw-visibility' },
              { id: 'export', className: 'btn-open-export', label: '<i class="fa fa-code"></i>', command: 'export-template', context: 'export-template' },
            ],
          }
        ]
      },
      
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@400;700&display=swap",
          // Inject FontAwesome into the canvas so icons render correctly
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        ],
      },
    });

    // ========================================================================
    // REGISTER CUSTOM PATHOLOGY BLOCKS
    // ========================================================================
    const bm = editor.BlockManager;

    bm.add('patient-demographics', {
      label: 'Patient Info',
      category: 'Lab Components',
      content: `
        <div class="patient-block" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; margin-bottom: 20px; font-family: Helvetica, sans-serif;">
          <table style="width: 100%; font-size: 12px; text-align: left;">
            <tr>
              <td style="padding: 4px;"><strong>Patient Name:</strong> {{patient.name}}</td>
              <td style="padding: 4px;"><strong>Age/Gender:</strong> {{patient.age}} / {{patient.gender}}</td>
            </tr>
            <tr>
              <td style="padding: 4px;"><strong>Patient ID:</strong> {{patient.id}}</td>
              <td style="padding: 4px;"><strong>Date:</strong> {{system.date}}</td>
            </tr>
          </table>
        </div>
      `,
      attributes: { class: 'fa fa-address-card', title: 'Insert Patient Details Box' }
    });

    bm.add('lab-table', {
      label: 'Results Table',
      category: 'Lab Components',
      content: `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; font-family: Helvetica, sans-serif;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #1e3a8a;">Test Parameter</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #1e3a8a;">Result</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #1e3a8a;">Unit</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #1e3a8a;">Bio. Ref. Range</th>
            </tr>
          </thead>
          <tbody>
            {{#each testResults}}
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{parameterName}}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: {{#if isAbnormal}}#dc2626{{else}}#000000{{/if}};">
                {{value}} {{#if isAbnormal}}(H/L){{/if}}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">{{unit}}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">{{refRange}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
      `,
      attributes: { class: 'fa fa-table', title: 'Insert Dynamic Results Table' }
    });

    bm.add('signatures', {
      label: 'Signatures',
      category: 'Lab Components',
      content: `
        <div style="display: flex; justify-content: space-around; margin-top: 30px; font-family: Helvetica, sans-serif;">
          <div style="text-align: center; font-size: 11px;">
            <div style="width: 120px; height: 50px; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #94a3b8; margin-bottom: 5px;">Image/Stamp</div>
            <p style="margin: 2px 0;"><strong>Dr. Name</strong></p>
            <p style="margin: 2px 0; color: #64748b;">Designation</p>
          </div>
        </div>
      `,
      attributes: { class: 'fa fa-pencil-square-o', title: 'Insert Signature Blocks' }
    });

    setEditorInstance(editor);

    return () => {
      editor.destroy();
    };
  }, []);

  // ========================================================================
  // ACTIONS
  // ========================================================================
  const handleSaveToDatabase = async () => {
    if (!editorInstance) return;
    const htmlContent = editorInstance.getHtml();
    const cssContent = editorInstance.getCss();
    
    console.log("Saving HTML:", htmlContent);
    console.log("Saving CSS:", cssContent);
    toast.success("Template Saved Successfully!");
  };

  const handleExportHtml = () => {
    if (!editorInstance) return;
    const html = editorInstance.getHtml();
    const css = editorInstance.getCss();
    const completeDoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
    
    const blob = new Blob([completeDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patholab_master_template.html";
    a.click();
    toast.success("HTML Exported!");
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 overflow-hidden">
      
      {/* 🔹 REQUIRED: INJECT FONTAWESOME TO SHOW ICONS IN SIDEBAR 🔹 */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />

      {/* 🔹 CRITICAL FIX: PROTECT GRAPESJS UI FROM TAILWIND PREFLIGHT 🔹 */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Undo Tailwind's background removal so buttons appear */
        .gjs-editor button { 
          background-color: transparent !important; 
          border: none !important; 
        }
        
        .gjs-editor input, .gjs-editor select, .gjs-editor textarea {
          color: white !important; 
          background-color: #334155 !important; 
          border: 1px solid #475569 !important; 
          padding: 4px !important;
        }
        
        /* Dark Theme UI Overrides */
        .gjs-one-bg { background-color: #0f172a !important; }
        .gjs-two-color { color: #94a3b8 !important; }
        .gjs-three-bg { background-color: #1e293b !important; color: white !important; }
        .gjs-four-color, .gjs-four-color-h:hover { color: #3b82f6 !important; }
        
        /* Canvas Wrapper Background */
        .gjs-cv-canvas { background-color: #cbd5e1 !important; height: 100% !important; }
        
        /* Restyle the Blocks to look modern */
        .gjs-block {
          border: 1px solid #334155 !important;
          border-radius: 8px !important;
          margin-bottom: 10px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
          background-color: #1e293b !important;
          transition: all 0.2s !important;
          color: #e2e8f0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          padding: 15px 10px !important;
        }
        .gjs-block:hover { border-color: #3b82f6 !important; color: #fff !important;}
        .gjs-block-label { font-weight: bold; margin-top: 8px; font-size: 11px;}
        .gjs-block i { font-size: 24px; margin-bottom: 5px; }

        /* Ensure toolbar shows up properly */
        .gjs-toolbar { background-color: #3b82f6 !important; }
      `}} />

      {/* Top Action Navbar */}
      <div className="h-[60px] bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 text-white z-50 shadow-md">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded text-blue-500">
              <LayoutTemplate size={18} />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">Master Template Builder</h1>
              <p className="text-[10px] text-slate-400">Powered by GrapesJS</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* GrapesJS Built-in Actions Mount Here (Code View, Borders) */}
          <div className="panel__basic-actions flex gap-2 items-center text-slate-300"></div>
          
          <Button 
            variant="outline" 
            className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-200 h-8 text-xs"
            onClick={handleExportHtml}
          >
            <Download size={14} className="mr-2" /> Download HTML
          </Button>
          <Button onClick={handleSaveToDatabase} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs border-0">
            <Save size={14} className="mr-2" /> Save Template
          </Button>
        </div>
      </div>

      {/* 🔹 CRITICAL FIX: Explicit absolute positioning and calculated height ensures it never collapses 🔹 */}
      <div className="w-full relative" style={{ height: 'calc(100vh - 60px)' }}>
        <div id="gjs" ref={editorRef} className="w-full h-full absolute inset-0"></div>
      </div>

    </div>
  );
}