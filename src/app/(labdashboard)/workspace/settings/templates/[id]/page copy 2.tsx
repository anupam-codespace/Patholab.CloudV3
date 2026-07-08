"use client";

import { useEffect, useState } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import Toolbar from "@/components/builder/Toolbar";
import Toolbox from "@/components/builder/Toolbox";
import Canvas from "@/components/builder/Canvas";
import Properties from "@/components/builder/Properties";
import { useEditorStore } from "@/store/useEditorStore";
import { importState, exportState } from "@/lib/export";
import { createElement } from "@/lib/elementFactory";
import { getDropCoordinates } from "@/lib/coords";
import toast from "react-hot-toast";

const STORAGE_KEY = "patholab-builder";

export default function BuilderPage() {
  const loadState = useEditorStore((s) => s.loadState);
  const addElement = useEditorStore((s) => s.addElement);
  const [isDirty, setIsDirty] = useState(false);

  // ─── Sensors for DndContext ──────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // ─── Load saved template ──────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = importState(stored);
        loadState(state);
        toast.success("Template restored");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to restore template");
    }
  }, [loadState]);

  // ─── Auto-save (debounced) ────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const unsubscribe = useEditorStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, exportState(state));
          setIsDirty(false);
        } catch (err) {
          console.error(err);
        }
      }, 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && !e.ctrlKey) {
        if (store.selection.ids.length > 0) {
          e.preventDefault();
          store.deleteSelected();
        }
        return;
      }
      // Undo (Ctrl+Z)
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        store.undo();
        return;
      }
      // Redo (Ctrl+Y or Ctrl+Shift+Z)
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "Z")) {
        e.preventDefault();
        store.redo();
        return;
      }
      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === "c") {
        if (store.selection.ids.length > 0) {
          e.preventDefault();
          store.copySelected();
        }
        return;
      }
      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        store.pasteClipboard();
        return;
      }
      // Select All (Ctrl+A)
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        const page = store.document.pages.find((p) => p.id === store.activePageId);
        if (page) {
          store.setSelected(page.elements.map((el) => el.id));
        }
        return;
      }
      // Zoom shortcuts
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        store.zoomIn();
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        store.zoomOut();
      }
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        store.resetZoom();
      }
      // Save (Ctrl+S)
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        store.setDirty(false);
        toast.success("Saved!");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ─── Before‑unload warning ────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ─── Drag End Handler (from Toolbox to Canvas) ────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over) return;

    // Only accept drops on the canvas
    if (over.id !== "canvas") return;

    const type = active.id as ElementType;
    const { x, y } = getDropCoordinates(event);

    const newElement = createElement(type, x, y);
    addElement(newElement);
    toast.success(`Added ${type}`);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col bg-slate-100 overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Toolbox />
          <Canvas />
          <Properties />
        </div>
      </div>
    </DndContext>
  );
}