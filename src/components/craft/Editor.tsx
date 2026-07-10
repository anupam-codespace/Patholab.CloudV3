"use client";

import React, { useState, useEffect } from "react";
import { Editor, Frame, Canvas } from "@craftjs/core";
import { Layers } from "@craftjs/layers";
import {
  Header,
  PatientInfo,
  ResultsTable,
  Footer,
  TextBlock,
  ImageBlock,
  Spacer,
} from "./index";

const CraftEditor = ({ onReady }: { onReady?: (ref: any) => void }) => {
  const [editorRef, setEditorRef] = useState<any>(null);
  const [canvasWidth, setCanvasWidth] = useState("210mm");
  const [canvasHeight, setCanvasHeight] = useState("297mm");

  // Load saved template from localStorage
  const [savedData, setSavedData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("craft-report");
    if (stored) {
      try {
        setSavedData(JSON.parse(stored));
      } catch {}
    }
  }, []);

  return (
    <div className="h-full w-full flex">
      {/* Sidebar: Components & Layers */}
      <div className="w-64 bg-slate-100 border-r border-slate-200 p-4 overflow-y-auto">
        <div className="mb-6">
          <h3 className="font-bold text-sm text-slate-700 mb-2">Components</h3>
          <div className="space-y-2">
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: Header, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Header
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: PatientInfo, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Patient Info
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: ResultsTable, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Results Table
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: Footer, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Footer
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: TextBlock, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Text
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: ImageBlock, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Image
            </button>
            <button
              onClick={() => {
                if (editorRef) {
                  const { actions } = editorRef;
                  actions.addNode({ type: Spacer, props: {} });
                }
              }}
              className="w-full text-left px-3 py-2 bg-white rounded border hover:bg-slate-50 text-xs">
              Spacer
            </button>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-700 mb-2">Layers</h3>
          <Layers />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-200 p-8 overflow-auto">
        <Editor
          onRender={({ actions, query }) => {
            setEditorRef({ actions, query });
            if (onReady)
              onReady({
                actions,
                query,
                serialize: () => query.serialize(),
                deserialize: (data) => actions.deserialize(data),
              });
          }}
          onNodesChange={(query) => {
            // Auto-save on change
            const json = query.serialize();
            localStorage.setItem("craft-report", JSON.stringify(json));
          }}>
          <Frame>
            <Canvas
              style={{
                width: canvasWidth,
                minHeight: canvasHeight,
                backgroundColor: "white",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                padding: "15mm",
                margin: "0 auto",
              }}>
              {savedData ? (
                // If saved data exists, render it
                <div />
              ) : (
                // Default empty canvas
                <div />
              )}
            </Canvas>
          </Frame>
        </Editor>
      </div>
    </div>
  );
};

export default CraftEditor;
