import React, { useMemo, useCallback } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { Element, Page } from "@/lib/types";
import ColorPicker from "./UI/ColorPicker";
import Slider from "./UI/Slider";
import { Settings as SettingsIcon } from "lucide-react";

// ─── Common Properties ──────────────────────────────
const CommonProperties = ({
  element,
  updateProp,
  isLocked,
  page,
  isMulti,
}: {
  element: Element;
  updateProp: (key: keyof Element, value: any) => void;
  isLocked: boolean;
  page: Page;
  isMulti?: boolean;
}) => {
  const store = useEditorStore();

  // ─── Alignment functions ──────────────────────────
  const alignLeft = () => updateProp("x", 0);
  const alignRight = () => updateProp("x", page.width - element.width);
  const alignCenter = () => updateProp("x", (page.width - element.width) / 2);
  const alignTop = () => updateProp("y", 0);
  const alignBottom = () => updateProp("y", page.height - element.height);
  const alignMiddle = () => updateProp("y", (page.height - element.height) / 2);
  const centerPage = () => {
    updateProp("x", (page.width - element.width) / 2);
    updateProp("y", (page.height - element.height) / 2);
  };

  // ─── Flip ──────────────────────────────────────────
  const flipH = () =>
    updateProp("scaleX", element.scaleX ? -element.scaleX : -1);
  const flipV = () =>
    updateProp("scaleY", element.scaleY ? -element.scaleY : -1);

  // ─── Layer controls ──────────────────────────────
  const bringForward = () => store.bringForward(element.id);
  const sendBackward = () => store.sendBackward(element.id);
  const bringToFront = () => store.bringToFront(element.id);
  const sendToBack = () => store.sendToBack(element.id);

  // ─── Duplicate ────────────────────────────────────
  const duplicate = () => store.duplicateElement(element.id);

  // ─── Lock aspect ratio toggle ────────────────────
  const toggleAspectRatio = () => {
    const newVal = !element.constraints?.keepRatio;
    updateProp("constraints", { ...element.constraints, keepRatio: newVal });
  };

  return (
    <div className="space-y-3">
      {/* ─── Position / Size ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium">X</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={Math.round(element.x)}
            onChange={(e) => updateProp("x", parseFloat(e.target.value))}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Y</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={Math.round(element.y)}
            onChange={(e) => updateProp("y", parseFloat(e.target.value))}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Width</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={Math.round(element.width)}
            onChange={(e) => updateProp("width", parseFloat(e.target.value))}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Height</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={Math.round(element.height)}
            onChange={(e) => updateProp("height", parseFloat(e.target.value))}
            disabled={isLocked}
          />
        </div>
      </div>

      {/* ─── Lock Aspect Ratio ────────────────────────── */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!element.constraints?.keepRatio}
          onChange={toggleAspectRatio}
          disabled={isLocked}
          id="keepRatio"
        />
        <label htmlFor="keepRatio" className="text-xs font-medium">
          Lock Aspect Ratio
        </label>
      </div>

      {/* ─── Rotation ─────────────────────────────────── */}
      <div>
        <label className="block text-xs font-medium">Rotation</label>
        <Slider
          min={-180}
          max={180}
          value={element.rotation || 0}
          onChange={(v) => updateProp("rotation", v)}
          disabled={isLocked}
        />
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => updateProp("rotation", (element.rotation || 0) + 90)}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            +90°
          </button>
          <button
            onClick={() => updateProp("rotation", (element.rotation || 0) - 90)}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            -90°
          </button>
          <button
            onClick={() => updateProp("rotation", 0)}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            Reset
          </button>
        </div>
      </div>

      {/* ─── Flip ────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={flipH}
          className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
          disabled={isLocked}>
          Flip H
        </button>
        <button
          onClick={flipV}
          className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
          disabled={isLocked}>
          Flip V
        </button>
      </div>

      {/* ─── Opacity ──────────────────────────────────── */}
      <div>
        <label className="block text-xs font-medium">Opacity</label>
        <Slider
          min={0}
          max={100}
          value={(element.opacity || 1) * 100}
          onChange={(v) => updateProp("opacity", v / 100)}
          disabled={isLocked}
        />
      </div>

      {/* ─── Visibility & Lock ────────────────────────── */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={element.visible !== false}
            onChange={(e) => updateProp("visible", e.target.checked)}
            disabled={isLocked}
          />
          Visible
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={element.locked || false}
            onChange={(e) => updateProp("locked", e.target.checked)}
          />
          Locked
        </label>
      </div>

      {/* ─── Z‑Index / Layer ──────────────────────────── */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium">Z‑Index</label>
        <input
          type="number"
          className="w-16 border rounded p-1 text-sm"
          value={element.zIndex || 1}
          onChange={(e) => updateProp("zIndex", parseInt(e.target.value) || 1)}
          disabled={isLocked}
        />
        <div className="flex gap-1 ml-auto">
          <button
            onClick={bringForward}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            ↑
          </button>
          <button
            onClick={sendBackward}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            ↓
          </button>
          <button
            onClick={bringToFront}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            ⇧
          </button>
          <button
            onClick={sendToBack}
            className="text-xs bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200"
            disabled={isLocked}>
            ⇩
          </button>
        </div>
      </div>

      {/* ─── Alignment buttons ────────────────────────── */}
      <div className="border-t pt-2">
        <label className="block text-xs font-medium mb-1">Align to Page</label>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={alignLeft}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⬅
          </button>
          <button
            onClick={alignCenter}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⬌
          </button>
          <button
            onClick={alignRight}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ➡
          </button>
          <button
            onClick={alignTop}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⬆
          </button>
          <button
            onClick={alignMiddle}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⬍
          </button>
          <button
            onClick={alignBottom}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⬇
          </button>
          <button
            onClick={centerPage}
            className="px-2 py-1 border rounded text-xs hover:bg-slate-100"
            disabled={isLocked}>
            ⏺
          </button>
        </div>
      </div>

      {/* ─── Border (common) ──────────────────────────── */}
      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Border</label>
          <input
            type="checkbox"
            checked={!!element.border}
            onChange={(e) =>
              updateProp(
                "border",
                e.target.checked
                  ? { width: 1, color: "#000000", style: "solid", radius: 0 }
                  : undefined,
              )
            }
            disabled={isLocked}
          />
        </div>
        {element.border && (
          <div className="space-y-1 mt-1">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px]">Width</label>
                <input
                  type="number"
                  className="w-full border rounded p-0.5 text-xs"
                  value={element.border.width}
                  onChange={(e) =>
                    updateProp("border", {
                      ...element.border,
                      width: parseFloat(e.target.value) || 1,
                    })
                  }
                  disabled={isLocked}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px]">Color</label>
                <ColorPicker
                  color={element.border.color}
                  onChange={(c) =>
                    updateProp("border", { ...element.border, color: c })
                  }
                  disabled={isLocked}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px]">Style</label>
                <select
                  className="w-full border rounded p-0.5 text-xs"
                  value={element.border.style}
                  onChange={(e) =>
                    updateProp("border", {
                      ...element.border,
                      style: e.target.value as any,
                    })
                  }
                  disabled={isLocked}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px]">Radius</label>
                <input
                  type="number"
                  className="w-full border rounded p-0.5 text-xs"
                  value={element.border.radius || 0}
                  onChange={(e) =>
                    updateProp("border", {
                      ...element.border,
                      radius: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={isLocked}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Shadow ────────────────────────────────────── */}
      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Shadow</label>
          <input
            type="checkbox"
            checked={!!element.shadow}
            onChange={(e) =>
              updateProp(
                "shadow",
                e.target.checked
                  ? {
                      x: 0,
                      y: 2,
                      blur: 4,
                      spread: 0,
                      color: "rgba(0,0,0,0.2)",
                      opacity: 1,
                    }
                  : undefined,
              )
            }
            disabled={isLocked}
          />
        </div>
        {element.shadow && (
          <div className="space-y-1 mt-1 grid grid-cols-2 gap-1">
            <div>
              <label className="block text-[10px]">X</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.shadow.x}
                onChange={(e) =>
                  updateProp("shadow", {
                    ...element.shadow,
                    x: parseFloat(e.target.value),
                  })
                }
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="block text-[10px]">Y</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.shadow.y}
                onChange={(e) =>
                  updateProp("shadow", {
                    ...element.shadow,
                    y: parseFloat(e.target.value),
                  })
                }
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="block text-[10px]">Blur</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.shadow.blur}
                onChange={(e) =>
                  updateProp("shadow", {
                    ...element.shadow,
                    blur: parseFloat(e.target.value),
                  })
                }
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="block text-[10px]">Spread</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.shadow.spread || 0}
                onChange={(e) =>
                  updateProp("shadow", {
                    ...element.shadow,
                    spread: parseFloat(e.target.value),
                  })
                }
                disabled={isLocked}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px]">Color</label>
              <ColorPicker
                color={element.shadow.color}
                onChange={(c) =>
                  updateProp("shadow", { ...element.shadow, color: c })
                }
                disabled={isLocked}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Background (common fill) ──────────────────── */}
      <div className="border-t pt-2">
        <label className="block text-xs font-medium">Background Fill</label>
        <ColorPicker
          color={element.bgColor || "transparent"}
          onChange={(c) => updateProp("bgColor", c)}
          disabled={isLocked}
        />
      </div>

      {/* ─── Padding (common) ──────────────────────────── */}
      <div className="border-t pt-2">
        <label className="block text-xs font-medium">Padding (px)</label>
        <div className="grid grid-cols-4 gap-1">
          {["top", "right", "bottom", "left"].map((side) => (
            <div key={side}>
              <label className="block text-[10px] capitalize">{side}</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.padding?.[side] || 0}
                onChange={(e) =>
                  updateProp("padding", {
                    ...(element.padding || {}),
                    [side]: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Margin ────────────────────────────────────── */}
      <div className="border-t pt-2">
        <label className="block text-xs font-medium">Margin (px)</label>
        <div className="grid grid-cols-4 gap-1">
          {["top", "right", "bottom", "left"].map((side) => (
            <div key={side}>
              <label className="block text-[10px] capitalize">{side}</label>
              <input
                type="number"
                className="w-full border rounded p-0.5 text-xs"
                value={element.margin?.[side] || 0}
                onChange={(e) =>
                  updateProp("margin", {
                    ...(element.margin || {}),
                    [side]: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Duplicate & Delete ────────────────────────── */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={duplicate}
          className="flex-1 text-xs bg-slate-100 py-1 rounded hover:bg-slate-200"
          disabled={isLocked}>
          Duplicate
        </button>
        <button
          onClick={() => store.deleteElements([element.id])}
          className="flex-1 text-xs text-red-500 bg-red-50 py-1 rounded hover:bg-red-100"
          disabled={isLocked}>
          Delete
        </button>
      </div>
    </div>
  );
};

// ─── Type‑specific Panels ──────────────────────────

const TextProperties = ({ element, updateProp, isLocked }: any) => {
  const t = element;

  // Merge tags
  const mergeTags = [
    { label: "Patient Name", tag: "{{patient.name}}" },
    { label: "Patient Age", tag: "{{patient.age}}" },
    { label: "Patient Gender", tag: "{{patient.gender}}" },
    { label: "Patient ID", tag: "{{patient.patientId}}" },
    { label: "Sample ID", tag: "{{sample.id}}" },
    { label: "Current Date", tag: "{{system.currentDate}}" },
  ];

  const insertTag = (tag: string) => {
    const current = t.content || "";
    updateProp("content", current + tag);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Content</label>
        <textarea
          className="w-full border rounded p-1 text-sm"
          rows={4}
          value={t.content || ""}
          onChange={(e) => updateProp("content", e.target.value)}
          disabled={isLocked}
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {mergeTags.map(({ label, tag }) => (
            <button
              key={tag}
              onClick={() => insertTag(tag)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
              disabled={isLocked}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium">Font Size</label>
        <Slider
          min={8}
          max={72}
          value={t.fontSize || 16}
          onChange={(v) => updateProp("fontSize", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Color</label>
        <ColorPicker
          color={t.color || "#000000"}
          onChange={(c) => updateProp("color", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Background</label>
        <ColorPicker
          color={t.bgColor || "transparent"}
          onChange={(c) => updateProp("bgColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Font Family</label>
        <select
          className="w-full border rounded p-1 text-sm"
          value={t.fontFamily || "Arial"}
          onChange={(e) => updateProp("fontFamily", e.target.value)}
          disabled={isLocked}>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium">Alignment</label>
        <select
          className="w-full border rounded p-1 text-sm"
          value={t.textAlign || "left"}
          onChange={(e) => updateProp("textAlign", e.target.value)}
          disabled={isLocked}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          className={`px-2 py-1 border rounded text-xs ${t.bold ? "bg-slate-200" : ""}`}
          onClick={() => updateProp("bold", !t.bold)}
          disabled={isLocked}>
          <b>B</b>
        </button>
        <button
          className={`px-2 py-1 border rounded text-xs ${t.italic ? "bg-slate-200" : ""}`}
          onClick={() => updateProp("italic", !t.italic)}
          disabled={isLocked}>
          <i>I</i>
        </button>
        <button
          className={`px-2 py-1 border rounded text-xs ${t.underline ? "bg-slate-200" : ""}`}
          onClick={() => updateProp("underline", !t.underline)}
          disabled={isLocked}>
          <u>U</u>
        </button>
      </div>
    </div>
  );
};

const ImageProperties = ({ element, updateProp, isLocked }: any) => {
  const img = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Image URL</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={img.src || ""}
          onChange={(e) => updateProp("src", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Object Fit</label>
        <select
          className="w-full border rounded p-1 text-sm"
          value={img.objectFit || "contain"}
          onChange={(e) => updateProp("objectFit", e.target.value)}
          disabled={isLocked}>
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium">Border Radius</label>
        <Slider
          min={0}
          max={50}
          value={img.borderRadius || 0}
          onChange={(v) => updateProp("borderRadius", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Border Color</label>
        <ColorPicker
          color={img.borderColor || "transparent"}
          onChange={(c) => updateProp("borderColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Border Width</label>
        <Slider
          min={0}
          max={10}
          value={img.borderWidth || 0}
          onChange={(v) => updateProp("borderWidth", v)}
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

// ─── Group Properties ──────────────────────────────
const GroupProperties = ({ element, updateProp, isLocked }: any) => {
  const { document, activePageId } = useEditorStore();
  const page = document.pages.find((p) => p.id === activePageId);
  const childCount = page?.elements.filter((el) => el.groupId === element.groupId).length || 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Group Name</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={element.name || "Group"}
          onChange={(e) => updateProp("name", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div className="text-xs text-slate-500">
        <span>Contains {childCount} element{childCount !== 1 ? 's' : ''}</span>
      </div>
      {childCount > 0 && (
        <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border">
          <span>Double‑click or ungroup to edit children individually.</span>
        </div>
      )}
    </div>
  );
};


const QRProperties = ({ element, updateProp, isLocked }: any) => {
  const qr = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Data</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={qr.data || ""}
          onChange={(e) => updateProp("data", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Foreground</label>
        <ColorPicker
          color={qr.fgColor || "#000000"}
          onChange={(c) => updateProp("fgColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Background</label>
        <ColorPicker
          color={qr.bgColor || "#ffffff"}
          onChange={(c) => updateProp("bgColor", c)}
          disabled={isLocked}
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={qr.showPageNumber || false}
          onChange={(e) => updateProp("showPageNumber", e.target.checked)}
          disabled={isLocked}
        />
        Show Page Number
      </label>
    </div>
  );
};

const BarcodeProperties = ({ element, updateProp, isLocked }: any) => {
  const bar = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Value</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={bar.value || ""}
          onChange={(e) => updateProp("value", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Height</label>
        <Slider
          min={20}
          max={80}
          value={bar.height || 40}
          onChange={(v) => updateProp("height", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Scale</label>
        <Slider
          min={0.5}
          max={3}
          step={0.1}
          value={bar.scale || 1}
          onChange={(v) => updateProp("scale", v)}
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

const TableProperties = ({ element, updateProp, isLocked }: any) => {
  const table = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Header Background</label>
        <ColorPicker
          color={table.headerBgColor || "#f1f5f9"}
          onChange={(c) => updateProp("headerBgColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Header Text</label>
        <ColorPicker
          color={table.headerTextColor || "#0f172a"}
          onChange={(c) => updateProp("headerTextColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Row Background</label>
        <ColorPicker
          color={table.rowBgColor || "#ffffff"}
          onChange={(c) => updateProp("rowBgColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Alternate Row</label>
        <ColorPicker
          color={table.rowAlternateColor || "#f8fafc"}
          onChange={(c) => updateProp("rowAlternateColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Border Color</label>
        <ColorPicker
          color={table.borderColor || "#cbd5e1"}
          onChange={(c) => updateProp("borderColor", c)}
          disabled={isLocked}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium">Rows</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={table.rows?.length || 0}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0;
              const newRows = [];
              for (let i = 0; i < count; i++) {
                newRows.push({
                  id: `row-${Date.now()}-${i}`,
                  cells: Array(table.columns?.length || 4).fill(""),
                });
              }
              updateProp("rows", newRows);
            }}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Columns</label>
          <input
            type="number"
            className="w-full border rounded p-1 text-sm"
            value={table.columns?.length || 0}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0;
              const newColumns = [];
              for (let i = 0; i < count; i++) {
                newColumns.push({
                  id: `col-${Date.now()}-${i}`,
                  title: `Column ${i + 1}`,
                  width: 25,
                });
              }
              updateProp("columns", newColumns);
            }}
            disabled={isLocked}
          />
        </div>
      </div>
    </div>
  );
};

const SignatureProperties = ({ element, updateProp, isLocked }: any) => {
  const sig = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Name</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={sig.name || ""}
          onChange={(e) => updateProp("name", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Designation</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={sig.designation || ""}
          onChange={(e) => updateProp("designation", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Qualifications</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={sig.qualifications || ""}
          onChange={(e) => updateProp("qualifications", e.target.value)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Line Color</label>
        <ColorPicker
          color={sig.lineColor || "#cbd5e1"}
          onChange={(c) => updateProp("lineColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Signature Image</label>
        <input
          type="text"
          className="w-full border rounded p-1 text-sm"
          value={sig.imageUrl || ""}
          onChange={(e) => updateProp("imageUrl", e.target.value)}
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

const SpacerProperties = ({ element, updateProp, isLocked }: any) => {
  const sp = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Height</label>
        <Slider
          min={2}
          max={200}
          value={sp.height || 20}
          onChange={(v) => updateProp("height", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Background</label>
        <ColorPicker
          color={sp.bgColor || "transparent"}
          onChange={(c) => updateProp("bgColor", c)}
          disabled={isLocked}
        />
      </div>
    </div>
  );
};

const ShapeProperties = ({ element, updateProp, isLocked }: any) => {
  const sh = element;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium">Shape Type</label>
        <select
          className="w-full border rounded p-1 text-sm"
          value={sh.shapeType || "rectangle"}
          onChange={(e) => updateProp("shapeType", e.target.value)}
          disabled={isLocked}>
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="line">Line</option>
          <option value="arrow">Arrow</option>
          <option value="divider">Divider</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium">Fill Color</label>
        <ColorPicker
          color={sh.fillColor || "#3b82f6"}
          onChange={(c) => updateProp("fillColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Stroke Color</label>
        <ColorPicker
          color={sh.strokeColor || "transparent"}
          onChange={(c) => updateProp("strokeColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Stroke Width</label>
        <Slider
          min={0}
          max={10}
          value={sh.strokeWidth || 0}
          onChange={(v) => updateProp("strokeWidth", v)}
          disabled={isLocked}
        />
      </div>
      {sh.shapeType === "rectangle" && (
        <div>
          <label className="block text-xs font-medium">Border Radius</label>
          <Slider
            min={0}
            max={50}
            value={sh.radius || 0}
            onChange={(v) => updateProp("radius", v)}
            disabled={isLocked}
          />
        </div>
      )}
    </div>
  );
};

const PatientDataProperties = ({ element, updateProp, isLocked }: any) => {
  const p = element;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium">Patient Name</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.patientName || ""}
            onChange={(e) => updateProp("patientName", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Age</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.age || ""}
            onChange={(e) => updateProp("age", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Gender</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.gender || ""}
            onChange={(e) => updateProp("gender", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Patient ID</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.patientId || ""}
            onChange={(e) => updateProp("patientId", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Sample ID</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.sampleId || ""}
            onChange={(e) => updateProp("sampleId", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Referred By</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.referredBy || ""}
            onChange={(e) => updateProp("referredBy", e.target.value)}
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Registration Date</label>
          <input
            type="text"
            className="w-full border rounded p-1 text-sm"
            value={p.registrationDate || ""}
            onChange={(e) => updateProp("registrationDate", e.target.value)}
            disabled={isLocked}
          />
        </div>
      </div>

      <hr />

      <div>
        <label className="block text-xs font-medium">Visibility</label>
        <div className="grid grid-cols-2 gap-1">
          {[
            ["showName", "Name"],
            ["showAge", "Age"],
            ["showGender", "Gender"],
            ["showPatientId", "Patient ID"],
            ["showSampleId", "Sample ID"],
            ["showReferredBy", "Referred By"],
            ["showRegistrationDate", "Reg. Date"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={p[key] ?? true}
                onChange={(e) => updateProp(key, e.target.checked)}
                disabled={isLocked}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <hr />

      <div>
        <label className="block text-xs font-medium">Label Color</label>
        <ColorPicker
          color={p.labelColor || "#64748b"}
          onChange={(c) => updateProp("labelColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Value Color</label>
        <ColorPicker
          color={p.valueColor || "#0f172a"}
          onChange={(c) => updateProp("valueColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Border Color</label>
        <ColorPicker
          color={p.borderColor || "#cbd5e1"}
          onChange={(c) => updateProp("borderColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Background Color</label>
        <ColorPicker
          color={p.bgColor || "#f8fafc"}
          onChange={(c) => updateProp("bgColor", c)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Font Size</label>
        <Slider
          min={8}
          max={18}
          value={p.fontSize || 12}
          onChange={(v) => updateProp("fontSize", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Padding</label>
        <Slider
          min={2}
          max={30}
          value={p.padding || 12}
          onChange={(v) => updateProp("padding", v)}
          disabled={isLocked}
        />
      </div>
      <div>
        <label className="block text-xs font-medium">Grid Columns</label>
        <select
          className="w-full border rounded p-1 text-sm"
          value={p.gridColumns || 2}
          onChange={(e) => updateProp("gridColumns", parseInt(e.target.value))}
          disabled={isLocked}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>
    </div>
  );
};

// ─── Map element types to panels ──────────────────
const propertyPanels: Record<string, React.FC<any>> = {
  text: TextProperties,
  image: ImageProperties,
  qr: QRProperties,
  barcode: BarcodeProperties,
  table: TableProperties,
  signature: SignatureProperties,
  spacer: SpacerProperties,
  shape: ShapeProperties,
  patientData: PatientDataProperties,
  group: GroupProperties, // <-- added
};

// ─── Main Properties Panel ──────────────────────────
export default function Properties() {
  const { document, activePageId, selection, updateElement, deleteElements } =
    useEditorStore();

  const activePage = useMemo(() => {
    return document.pages.find((p) => p.id === activePageId);
  }, [document.pages, activePageId]);

  const selectedElements = useMemo(() => {
    if (!activePage) return [];
    return activePage.elements.filter((el) => selection.ids.includes(el.id));
  }, [activePage, selection.ids]);

  const selectedCount = selectedElements.length;
  const singleElement = selectedCount === 1 ? selectedElements[0] : null;
  const isLocked = singleElement?.locked || false;

  const updateProp = useCallback(
    (key: keyof Element, value: any) => {
      if (!singleElement) return;
      updateElement(singleElement.id, { [key]: value });
    },
    [singleElement, updateElement],
  );

  const handleDelete = useCallback(() => {
    if (!singleElement) return;
    deleteElements([singleElement.id]);
  }, [singleElement, deleteElements]);

  // ─── Render ─────────────────────────────────────────

  if (selectedCount === 0) {
    const page = activePage;
    if (!page) return <div className="p-4">No page</div>;

    const border = page.border || {
      show: false,
      width: 1,
      color: "#000000",
      style: "solid",
      padding: 0,
    };
    const watermark = page.watermark || {
      url: "",
      opacity: 10,
      size: "contain",
      position: "center",
    };
    const pageNumber = page.pageNumber || {
      show: false,
      position: "bottom-right",
      format: "page-x-of-y",
    };

    const updatePage = (updates: Partial<Page>) => {
      useEditorStore.getState().updatePage(page.id, updates);
    };

    return (
      <div className="p-4 w-72 bg-white border-l border-slate-200 overflow-y-auto h-full">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <SettingsIcon size={16} /> Page Settings
        </h3>

        <div className="space-y-4">
          {/* ─── Page Size ─── */}
          <div>
            <label className="block text-xs font-medium mb-1">Page Size</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px]">Width</label>
                <input
                  type="number"
                  className="w-full border rounded p-1 text-sm"
                  value={page.width}
                  onChange={(e) =>
                    updatePage({ width: parseInt(e.target.value) || 794 })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px]">Height</label>
                <input
                  type="number"
                  className="w-full border rounded p-1 text-sm"
                  value={page.height}
                  onChange={(e) =>
                    updatePage({ height: parseInt(e.target.value) || 1123 })
                  }
                />
              </div>
            </div>
            <button
              onClick={() => {
                const isPortrait = page.orientation !== "landscape";
                useEditorStore.getState().toggleOrientation(page.id);
              }}
              className="mt-1 text-xs text-blue-600 hover:underline">
              {page.orientation === "landscape"
                ? "Switch to Portrait"
                : "Switch to Landscape"}
            </button>
          </div>

          {/* ─── Background Color ─── */}
          <div>
            <label className="block text-xs font-medium">
              Background Color
            </label>
            <ColorPicker
              color={page.background || "#ffffff"}
              onChange={(c) => updatePage({ background: c })}
            />
          </div>

          {/* ─── Background Image (Letterhead) ─── */}
          <div>
            <label className="block text-xs font-medium">
              Background Image (Letterhead)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  updatePage({ backgroundImage: reader.result as string });
                };
                reader.readAsDataURL(file);
              }}
              className="text-xs"
            />
            {page.backgroundImage && (
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={page.backgroundImage}
                  alt="Background"
                  className="h-10 w-10 object-cover border rounded"
                />
                <button
                  onClick={() => updatePage({ backgroundImage: undefined })}
                  className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* ─── Border ─── */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium">Page Border</label>
              <input
                type="checkbox"
                checked={border.show}
                onChange={(e) => {
                  const show = e.target.checked;
                  useEditorStore.getState().updatePageBorder(page.id, { show });
                }}
              />
            </div>
            {border.show && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px]">Padding (px)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-sm"
                    value={border.padding || 0}
                    onChange={(e) => {
                      const padding = parseInt(e.target.value) || 0;
                      useEditorStore
                        .getState()
                        .updatePageBorder(page.id, { padding });
                    }}
                  />
                  <p className="text-[9px] text-slate-400">
                    Creates a gap between page edge and border
                  </p>
                </div>
                <div>
                  <label className="block text-[10px]">Width (px)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-sm"
                    value={border.width}
                    onChange={(e) => {
                      const width = parseInt(e.target.value) || 1;
                      useEditorStore
                        .getState()
                        .updatePageBorder(page.id, { width });
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px]">Color</label>
                  <ColorPicker
                    color={border.color}
                    onChange={(c) =>
                      useEditorStore
                        .getState()
                        .updatePageBorder(page.id, { color: c })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px]">Style</label>
                  <select
                    className="w-full border rounded p-1 text-sm"
                    value={border.style}
                    onChange={(e) => {
                      const style = e.target.value as
                        | "solid"
                        | "dashed"
                        | "dotted";
                      useEditorStore
                        .getState()
                        .updatePageBorder(page.id, { style });
                    }}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px]">Radius (px)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-sm"
                    value={border.radius || 0}
                    onChange={(e) => {
                      const radius = parseInt(e.target.value) || 0;
                      useEditorStore
                        .getState()
                        .updatePageBorder(page.id, { radius });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── Margins ─── */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Margins (mm)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side}>
                  <label className="block text-[10px] capitalize">{side}</label>
                  <input
                    type="number"
                    className="w-full border rounded p-1 text-sm"
                    value={page.margin[side]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      useEditorStore
                        .getState()
                        .updatePageMargins(page.id, { [side]: val });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ─── Watermark ─── */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium">Watermark</label>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px]">Image URL</label>
                <input
                  type="text"
                  className="w-full border rounded p-1 text-sm"
                  value={watermark.url}
                  placeholder="https://example.com/watermark.png"
                  onChange={(e) => {
                    useEditorStore
                      .getState()
                      .updatePageWatermark(page.id, { url: e.target.value });
                  }}
                />
              </div>
              {watermark.url && (
                <>
                  <div>
                    <label className="block text-[10px]">Opacity (%)</label>
                    <Slider
                      min={0}
                      max={100}
                      value={watermark.opacity}
                      onChange={(v) => {
                        useEditorStore
                          .getState()
                          .updatePageWatermark(page.id, { opacity: v });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px]">Size</label>
                    <select
                      className="w-full border rounded p-1 text-sm"
                      value={watermark.size}
                      onChange={(e) => {
                        useEditorStore.getState().updatePageWatermark(page.id, {
                          size: e.target.value,
                        });
                      }}>
                      <option value="contain">Contain</option>
                      <option value="cover">Cover</option>
                      <option value="auto">Auto</option>
                      <option value="50%">50%</option>
                      <option value="70%">70%</option>
                      <option value="90%">90%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px]">Position</label>
                    <select
                      className="w-full border rounded p-1 text-sm"
                      value={watermark.position}
                      onChange={(e) => {
                        const position = e.target.value as
                          | "center"
                          | "top-left"
                          | "top-right"
                          | "bottom-left"
                          | "bottom-right";
                        useEditorStore
                          .getState()
                          .updatePageWatermark(page.id, { position });
                      }}>
                      <option value="center">Center</option>
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ─── Page Numbers ─── */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium">Page Numbers</label>
              <input
                type="checkbox"
                checked={pageNumber.show}
                onChange={(e) => {
                  const show = e.target.checked;
                  useEditorStore.getState().updatePageNumber(page.id, { show });
                }}
              />
            </div>
            {pageNumber.show && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px]">Position</label>
                  <select
                    className="w-full border rounded p-1 text-sm"
                    value={pageNumber.position}
                    onChange={(e) => {
                      const position = e.target.value as
                        | "top-left"
                        | "top-center"
                        | "top-right"
                        | "bottom-left"
                        | "bottom-center"
                        | "bottom-right";
                      useEditorStore
                        .getState()
                        .updatePageNumber(page.id, { position });
                    }}>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px]">Format</label>
                  <select
                    className="w-full border rounded p-1 text-sm"
                    value={pageNumber.format}
                    onChange={(e) => {
                      const format = e.target.value as
                        | "page-x-of-y"
                        | "x-of-y"
                        | "page-x"
                        | "x";
                      useEditorStore
                        .getState()
                        .updatePageNumber(page.id, { format });
                    }}>
                    <option value="page-x-of-y">Page X of Y</option>
                    <option value="x-of-y">X / Y</option>
                    <option value="page-x">Page X</option>
                    <option value="x">X</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedCount > 1) {
    const first = selectedElements[0];
    return (
      <div className="p-4 w-72 bg-white border-l border-slate-200 overflow-y-auto h-full">
        <h3 className="font-bold text-sm mb-2">
          Multi‑select ({selectedCount})
        </h3>
        <div className="space-y-3">
          <CommonProperties
            element={first}
            updateProp={() => {}}
            isLocked={true}
            page={activePage}
            isMulti
          />
          <div className="border-t pt-2">
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => {
                selectedElements.forEach((el) => deleteElements([el.id]));
              }}>
              Delete all
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Panel = propertyPanels[singleElement.type];
  if (!Panel) {
    return (
      <div className="p-4 text-sm text-slate-500 bg-white border-l border-slate-200 h-full">
        No properties for this element type.
      </div>
    );
  }

  return (
    <div className="p-4 w-72 bg-white border-l border-slate-200 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm">Properties</h3>
        <button
          className="text-xs text-red-500 hover:underline"
          onClick={handleDelete}
          disabled={isLocked}>
          Delete
        </button>
      </div>

      <div className="mb-3">
        <span className="text-xs font-medium text-slate-500">Type</span>
        <span className="ml-2 text-sm capitalize">{singleElement.type}</span>
      </div>

      <CommonProperties
        element={singleElement}
        updateProp={updateProp}
        isLocked={isLocked}
        page={activePage}
      />

      <hr className="my-4" />

      <Panel
        element={singleElement}
        updateProp={updateProp}
        isLocked={isLocked}
      />
    </div>
  );
}
