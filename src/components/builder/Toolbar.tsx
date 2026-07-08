"use client";

import React, { useState, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import {
  Undo2,
  Redo2,
  Copy,
  ClipboardPaste,
  Trash2,
  CopyPlus,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Grid,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Eye,
  Printer,
  Save,
  Upload,
  Download,
  File,
  Plus,
  ChevronDown,
  Lock,
  Unlock,
  Layers, // Group icon
  Ungroup, // Ungroup icon
} from "lucide-react";
import toast from "react-hot-toast";
import { exportState, importState } from "@/lib/export";

// ─── Subcomponents ──────────────────────────────────────────

// 1. Toolbar Button (with disabled state)
const ToolButton = ({
  icon: Icon,
  onClick,
  disabled,
  label,
}: {
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) => {
  if (!Icon) return null;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
      title={label}>
      <Icon size={18} />
    </button>
  );
};

// 2. Zoom control
const ZoomControl = () => {
  const { viewport, zoomIn, zoomOut, setZoom } = useEditorStore();
  const zoom = viewport.zoom;

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setZoom(val);
  };

  return (
    <div className="flex items-center gap-1">
      <ToolButton icon={ZoomOut} onClick={zoomOut} label="Zoom Out" />
      <select
        value={zoom}
        onChange={handleZoomChange}
        className="w-16 text-center text-sm border rounded px-1 py-0.5 bg-white">
        <option value={0.25}>25%</option>
        <option value={0.5}>50%</option>
        <option value={0.75}>75%</option>
        <option value={1}>100%</option>
        <option value={1.25}>125%</option>
        <option value={1.5}>150%</option>
        <option value={2}>200%</option>
      </select>
      <ToolButton icon={ZoomIn} onClick={zoomIn} label="Zoom In" />
    </div>
  );
};

// 3. File Menu (dropdown)
const FileMenu = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const state = importState(json);
        useEditorStore.getState().loadState(state);
        toast.success("Template imported!");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setOpen(false);
  };

  const handleExport = () => {
    const state = useEditorStore.getState();
    const json = exportState(state);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-200 text-sm">
        <File size={16} />
        File
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-50 min-w-[160px] py-1">
          <button
            onClick={handleImport}
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2">
            <Upload size={14} /> Import JSON
          </button>
          <button
            onClick={handleExport}
            className="w-full text-left px-4 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2">
            <Download size={14} /> Export JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Toolbar ────────────────────────────────────────────

export default function Toolbar() {
  const {
    undo,
    redo,
    copySelected,
    pasteClipboard,
    deleteSelected,
    duplicateSelected,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    lockSelected,
    unlockSelected,
    groupSelected,
    ungroupSelected,
    selection,
    history,
    document,
    activePageId,
    addPage,
    duplicatePage,
    removePage,
    setActivePage,
    setDirty,
  } = useEditorStore();

  // ── Derived state ──
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const canCopy = selection.ids.length > 0;
  const canDelete = selection.ids.length > 0;
  const canPaste = !!useEditorStore.getState().clipboard;
  const canBringForward = selection.ids.length === 1;
  const canSendBackward = selection.ids.length === 1;
  const pages = document.pages;
  const pageIndex = pages.findIndex((p) => p.id === activePageId);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pages.length - 1;

  // Group / Ungroup
  const canGroup = selection.ids.length >= 2;
  // For ungroup: exactly one selected and it's a group element
  let canUngroup = false;
  if (selection.ids.length === 1) {
    const page = document.pages.find((p) => p.id === activePageId);
    if (page) {
      const el = page.elements.find((e) => e.id === selection.ids[0]);
      if (el && el.type === "group") canUngroup = true;
    }
  }

  let anyLocked = false;
  if (selection.ids.length > 0) {
    const page = document.pages.find((p) => p.id === activePageId);
    if (page) {
      anyLocked = selection.ids.some((id) => {
        const el = page.elements.find((e) => e.id === id);
        return el?.locked === true;
      });
    }
  }

  const handleSave = () => {
    setDirty(false);
    toast.success("Saved!");
  };

  const handlePreview = () => {
    toast.info("Preview mode (coming soon)");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLockToggle = () => {
    if (selection.ids.length === 0) return;
    if (anyLocked) {
      unlockSelected();
    } else {
      lockSelected();
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-slate-200 h-11 overflow-x-auto">
      <FileMenu />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton
        icon={Undo2}
        onClick={undo}
        disabled={!canUndo}
        label="Undo (Ctrl+Z)"
      />
      <ToolButton
        icon={Redo2}
        onClick={redo}
        disabled={!canRedo}
        label="Redo (Ctrl+Y)"
      />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton
        icon={Copy}
        onClick={copySelected}
        disabled={!canCopy}
        label="Copy (Ctrl+C)"
      />
      <ToolButton
        icon={ClipboardPaste}
        onClick={pasteClipboard}
        disabled={!canPaste}
        label="Paste (Ctrl+V)"
      />
      <ToolButton
        icon={CopyPlus}
        onClick={duplicateSelected}
        disabled={!canCopy}
        label="Duplicate (Ctrl+D)"
      />
      <ToolButton
        icon={Trash2}
        onClick={deleteSelected}
        disabled={!canDelete}
        label="Delete (Delete)"
      />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton
        icon={ArrowUp}
        onClick={() => selection.ids[0] && bringForward(selection.ids[0])}
        disabled={!canBringForward}
        label="Bring Forward"
      />
      <ToolButton
        icon={ArrowDown}
        onClick={() => selection.ids[0] && sendBackward(selection.ids[0])}
        disabled={!canSendBackward}
        label="Send Backward"
      />
      <ToolButton
        icon={ArrowUpToLine}
        onClick={() => selection.ids[0] && bringToFront(selection.ids[0])}
        disabled={!canBringForward}
        label="Bring to Front"
      />
      <ToolButton
        icon={ArrowDownToLine}
        onClick={() => selection.ids[0] && sendToBack(selection.ids[0])}
        disabled={!canSendBackward}
        label="Send to Back"
      />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton
        icon={anyLocked ? Unlock : Lock}
        onClick={handleLockToggle}
        disabled={!canDelete}
        label={anyLocked ? "Unlock Selected" : "Lock Selected"}
      />

      {/* ─── Group / Ungroup ──────────────────────────── */}
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <ToolButton
        icon={Layers}
        onClick={groupSelected}
        disabled={!canGroup}
        label="Group (Ctrl+G)"
      />
      <ToolButton
        icon={Ungroup}
        onClick={ungroupSelected}
        disabled={!canUngroup}
        label="Ungroup (Ctrl+Shift+G)"
      />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton
        icon={Grid}
        onClick={() => console.log("Toggle Grid")}
        label="Toggle Grid"
      />
      <ToolButton
        icon={LayoutGrid}
        onClick={() => console.log("Toggle Snap")}
        label="Toggle Snap"
      />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ZoomControl />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <ToolButton icon={Eye} onClick={handlePreview} label="Preview" />
      <ToolButton icon={Printer} onClick={handlePrint} label="Print" />

      <div className="w-px h-6 bg-slate-300 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const idx = pages.findIndex((p) => p.id === activePageId);
            if (idx > 0) setActivePage(pages[idx - 1].id);
          }}
          disabled={!canPrev}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"
          title="Previous Page">
          <ChevronDown className="rotate-90" size={16} />
        </button>
        <span className="text-xs font-medium whitespace-nowrap">
          {pageIndex + 1} / {pages.length}
        </span>
        <button
          onClick={() => {
            const idx = pages.findIndex((p) => p.id === activePageId);
            if (idx < pages.length - 1) setActivePage(pages[idx + 1].id);
          }}
          disabled={!canNext}
          className="p-1 rounded hover:bg-slate-200 disabled:opacity-40"
          title="Next Page">
          <ChevronDown className="-rotate-90" size={16} />
        </button>
        <ToolButton icon={Plus} onClick={addPage} label="Add Page" />
        <ToolButton
          icon={CopyPlus}
          onClick={() => duplicatePage(activePageId)}
          label="Duplicate Page"
        />
        <ToolButton
          icon={Trash2}
          onClick={() => {
            if (pages.length > 1) {
              removePage(activePageId);
            } else {
              toast.error("Cannot delete the last page");
            }
          }}
          label="Delete Page"
          disabled={pages.length <= 1}
        />
      </div>

      <div className="flex-1" />

      <ToolButton icon={Save} onClick={handleSave} label="Save (Ctrl+S)" />
    </div>
  );
}
