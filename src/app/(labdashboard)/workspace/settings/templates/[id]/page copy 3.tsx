"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Save, Badge } from "lucide-react";
import toast from "react-hot-toast";

import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";

import { useEditorStore } from "@/store/useEditorStore";
import Toolbar from "@/components/builder/Toolbar";
import Toolbox from "@/components/builder/Toolbox";
import Canvas from "@/components/builder/Canvas";
import Properties from "@/components/builder/Properties";
import { getTemplateById, saveTemplate } from "@/actions/report-settings";
import { createElement } from "@/lib/elementFactory";
import { getDropCoordinates } from "@/lib/coords";
import { ElementType } from "@/lib/types";

// ─── Default config ──────────────────────────────────
const getDefaultConfig = () => ({
  pages: [
    {
      id: "page-1",
      name: "Page 1",
      width: 794,
      height: 1123,
      background: "#ffffff",
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      border: { show: false, width: 1, color: "#000000", style: "solid" },
      watermark: { url: "", opacity: 10, size: "contain", position: "center" },
      pageNumber: {
        show: false,
        position: "bottom-right",
        format: "page-x-of-y",
      },
      elements: [],
    },
  ],
  groups: [],
});

const defaultState = {
  document: getDefaultConfig(),
  activePageId: "page-1",
  selection: { ids: [] },
  clipboard: null,
  viewport: { zoom: 1, panX: 0, panY: 0 },
  settings: {
    snap: true,
    grid: false,
    gridSize: 10,
    showRulers: true,
    showGuides: false,
    showMargins: true,
    autoSave: true,
    autoSaveInterval: 5,
    primaryColor: "#1e3a8a",
    accentColor: "#2563eb",
    fontFamily: "Inter",
  },
  history: { past: [], future: [] },
  dirty: false,
};

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id === "new" ? null : (params.id as string);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("New Template");

  // Granular store selector extraction (prevents unnecessary re-renders)
  const loadState = useEditorStore((s) => s.loadState);
  const addElement = useEditorStore((s) => s.addElement);

  // Memoize sensors to prevent recreation on every render cycle (Performance optimization)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // ─── Load template ──────────────────────────────────
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted components

    const loadTemplate = async () => {
      setLoading(true);
      try {
        if (templateId) {
          const template = await getTemplateById(templateId);

          if (!isMounted) return;

          if (template) {
            setTemplateName(template.name);
            const config = template.config || getDefaultConfig();

            // Deep safe merge to protect against malformed DB states
            const mergedState = {
              ...defaultState,
              document: {
                ...defaultState.document,
                ...config,
                pages: config.pages?.length
                  ? config.pages
                  : defaultState.document.pages,
                groups: config.groups || [],
              },
              activePageId: config.pages?.[0]?.id || "page-1",
              settings: {
                ...defaultState.settings,
                primaryColor:
                  template.primaryColor || defaultState.settings.primaryColor,
                accentColor:
                  template.accentColor || defaultState.settings.accentColor,
                fontFamily:
                  template.fontFamily || defaultState.settings.fontFamily,
              },
            };
            loadState(mergedState);
          } else {
            toast.error("Template not found");
            router.replace("/workspace/settings/templates"); // replace instead of push prevents loop
            return;
          }
        } else {
          if (isMounted) loadState(defaultState);
        }
      } catch (error) {
        if (isMounted) {
          toast.error("Failed to load template");
          console.error("[Template Load Error]:", error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTemplate();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, [templateId, loadState, router]);

  // ─── Save ───────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);

    try {
      // Using .getState() guarantees fresh data without adding to dependency array
      const { document, settings } = useEditorStore.getState();

      const config = {
        pages: document.pages,
        groups: document.groups || [],
      };

      const result = await saveTemplate(templateId, templateName, config, {
        pageSize: "A4",
        orientation: "PORTRAIT",
        primaryColor: settings?.primaryColor || "#1e3a8a",
        accentColor: settings?.accentColor || "#2563eb",
        fontFamily: settings?.fontFamily || "Inter",
      });

      toast.success("Template saved!");

      // Update URL silently if we just created a "new" template
      if (!templateId && result?.id) {
        router.replace(`/workspace/settings/templates/${result.id}`);
      }
    } catch (error) {
      toast.error("Failed to save template");
      console.error("[Template Save Error]:", error);
    } finally {
      setSaving(false);
    }
  }, [templateId, templateName, router]);

  // ─── Drag end ──────────────────────────────────────
 const handleDragEnd = useCallback(
   (event: DragEndEvent) => {
     const { active, over } = event;
     if (!active || !over) return;
     if (over.id !== "canvas") return;

     try {
       // Extract type and overrides from the DND event payload
       const { type, override } = active.data.current as any;

       const { x, y } = getDropCoordinates(event);
       const newElement = createElement(type as ElementType, x, y);

       // Apply the smart overrides if dragging from the toolbox
       if (override) {
         if (override.width) newElement.width = override.width;
         if (override.height) newElement.height = override.height;
         if (override.props)
           newElement.props = { ...newElement.props, ...override.props };
       }

       addElement(newElement);
       toast.success("Element placed");
     } catch (error) {
       toast.error("Failed to place element");
     }
   },
   [addElement],
 );

  // ─── Renderers ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-slate-500 text-sm font-medium animate-pulse">
            Initializing Builder...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* ─── Top Bar with Toolbar ───────────────────── */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-10 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 text-slate-500 hover:text-slate-900">
              <ArrowLeft size={18} />
            </Button>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-8 w-64 font-semibold text-sm border-transparent bg-transparent hover:bg-slate-50 focus-visible:ring-1 focus-visible:ring-blue-500 transition-all"
              placeholder="Template Name"
            />
            <Badge
              variant="outline"
              className="text-xs text-slate-400 font-mono hidden md:inline-flex">
              {templateId ? `ID: ${templateId.slice(0, 8)}` : "Unsaved Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 bg-blue-600 hover:bg-blue-700 transition-colors"
              onClick={handleSave}
              disabled={saving}>
              {saving ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
        {/* Toolbar Component */}
        <Toolbar />
      </div>

      {/* ─── DND Editor Area ────────────────────────── */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden relative">
          <Toolbox />
          <Canvas />
          <Properties />
        </div>
      </DndContext>
    </div>
  );
}
