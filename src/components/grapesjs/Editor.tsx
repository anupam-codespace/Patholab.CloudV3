"use client";

import { useEffect, useRef } from "react";
import grapesjs from "grapesjs";

interface EditorProps {
  onEditorReady?: (editor: any) => void;
}

export default function Editor({ onEditorReady }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  // Load CSS from CDN (avoid import errors)
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/grapesjs/0.23.2/css/grapes.min.css";
    document.head.appendChild(link);

    const faLink = document.createElement("link");
    faLink.rel = "stylesheet";
    faLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
    document.head.appendChild(faLink);

    return () => {
      link.remove();
      faLink.remove();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const containerId = "gjs-editor-container";
    containerRef.current.id = containerId;

    const editor = grapesjs.init({
      container: `#${containerId}`,
      height: "100%",
      width: "100%",
      storageManager: false,
      fromElement: false,

      // ---------- BLOCK MANAGER ----------
      blockManager: {
        blocks: [
          {
            id: "header",
            label: "Header",
            category: "Structure",
            content: `
              <div style="
                display: flex;
                align-items: center;
                border-bottom: 3px solid #1e3a8a;
                padding-bottom: 10px;
                margin-bottom: 20px;
                font-family: Arial, sans-serif;
              ">
                <div style="
                  width: 80px;
                  height: 80px;
                  background: #e2e8f0;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-right: 20px;
                  font-size: 12px;
                  color: #94a3b8;
                ">LOGO</div>
                <div>
                  <h1 style="font-size: 28px; font-weight: bold; color: #1e3a8a; margin: 0; letter-spacing: 2px;">GLOBIZ PATHOLAB</h1>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0;">Advanced Diagnostics Center</p>
                </div>
              </div>
            `,
          },
          {
            id: "patient-info",
            label: "Patient Info",
            category: "Data Blocks",
            content: `
              <div style="
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 15px;
                background: #f8fafc;
                margin-bottom: 20px;
                font-family: Arial, sans-serif;
              ">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px;">
                  <div>
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Patient Name</span>
                    <div style="font-weight: bold; font-size: 15px; color: #0f172a;">{{patient.name}}</div>
                  </div>
                  <div>
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Age / Gender</span>
                    <div style="font-weight: bold; font-size: 15px; color: #0f172a;">{{patient.age}} / {{patient.gender}}</div>
                  </div>
                  <div>
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Patient ID (UHID)</span>
                    <div style="font-weight: bold; font-size: 15px; color: #0f172a;">{{patient.uhid}}</div>
                  </div>
                  <div>
                    <span style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Sample ID (SID)</span>
                    <div style="font-weight: bold; font-size: 15px; color: #0f172a;">{{sample.id}}</div>
                  </div>
                </div>
              </div>
            `,
          },
          {
            id: "results-table",
            label: "Results Table",
            category: "Data Blocks",
            content: `
              <div style="margin-bottom: 25px; font-family: Arial, sans-serif;">
                <div style="background: #f1f5f9; padding: 6px 15px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; text-align: center; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; margin-bottom: 15px; color: #0f172a;">BIOCHEMISTRY</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                      <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Test Parameter</th>
                      <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Result</th>
                      <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Unit</th>
                      <th style="padding: 8px 10px; text-align: left; font-weight: 600;">Bio. Ref. Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px 10px;">Serum Creatinine</td>
                      <td style="padding: 8px 10px; font-weight: bold; color: #dc2626;">1.8</td>
                      <td style="padding: 8px 10px; color: #64748b;">mg/dL</td>
                      <td style="padding: 8px 10px; color: #64748b;">0.7 - 1.3</td>
                    </tr>
                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px 10px;">Urea</td>
                      <td style="padding: 8px 10px; font-weight: bold;">25.0</td>
                      <td style="padding: 8px 10px; color: #64748b;">mg/dL</td>
                      <td style="padding: 8px 10px; color: #64748b;">10.0 - 50.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `,
          },
          {
            id: "footer",
            label: "Footer",
            category: "Structure",
            content: `
              <div style="
                border-top: 1px solid #cbd5e1;
                padding-top: 15px;
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #64748b;
                font-family: Arial, sans-serif;
              ">
                <p style="margin: 0; white-space: pre-wrap;">*** End of Report ***\nThis is an electronically generated report.</p>
              </div>
            `,
          },
          {
            id: "text-block",
            label: "Text",
            category: "Typography",
            content: `<div style="padding: 10px; font-family: Arial, sans-serif; font-size: 14px;">Enter your text here...</div>`,
          },
          {
            id: "image-block",
            label: "Image",
            category: "Media",
            content: `<img src="https://via.placeholder.com/150" style="max-width: 100%;" />`,
          },
          {
            id: "spacer",
            label: "Spacer",
            category: "Layout",
            content: `<div style="height: 20px;"></div>`,
          },
        ],
      },

      // ---------- PANELS CONFIG: make "Views" active by default ----------
      panels: {
        defaults: [
          {
            id: "views",
            active: true, // This opens the panel containing "Blocks", "Layers", "Style Manager"
          },
        ],
      },

      // A4 canvas styles
      style: `
        body {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          background: white;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          font-family: Arial, sans-serif;
          color: #334155;
        }
        @media print {
          body { box-shadow: none; margin: 0; }
        }
      `,
    });

    editorRef.current = editor;
    if (onEditorReady) onEditorReady(editor);

    // Cleanup
    return () => {
      editor.destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
