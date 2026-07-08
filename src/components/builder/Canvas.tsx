"use client";

import React, { useRef, useCallback, useEffect, useMemo } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { useDroppable } from "@dnd-kit/core";
import { useEditorStore } from "@/store/useEditorStore";
import { ElementType } from "@/lib/types";
import TextElement from "./Elements/TextElement";
import ImageElement from "./Elements/ImageElement";
import QRElement from "./Elements/QRElement";
import BarcodeElement from "./Elements/BarcodeElement";
import TableElement from "./Elements/TableElement";
import SignatureElement from "./Elements/SignatureElement";
import SpacerElement from "./Elements/SpacerElement";
import ShapeElement from "./Elements/ShapeElement";
import PatientDataElement from "./Elements/PatientDataElement";
import { GroupElement } from "./Elements/GroupElement";

// Map element types to components
const elementMap: Record<ElementType, React.FC<any>> = {
  text: TextElement,
  image: ImageElement,
  qr: QRElement,
  barcode: BarcodeElement,
  table: TableElement,
  signature: SignatureElement,
  spacer: SpacerElement,
  shape: ShapeElement,
  patientData: PatientDataElement,
  group: GroupElement,
};

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<any>(null);
  const selectoRef = useRef<any>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Local ref to batch updates during interaction (60fps)
  const pendingUpdates = useRef<Record<string, any>>({});

  const {
    document,
    activePageId,
    selection,
    updateElement,
    updateElements,
    selectElement,
    clearSelection,
    viewport,
  } = useEditorStore();

  const { setNodeRef } = useDroppable({ id: "canvas" });

  const activePage = useMemo(() => {
    return document.pages.find((p) => p.id === activePageId);
  }, [document.pages, activePageId]);

  const elements = activePage?.elements || [];

  const selectedTargets = useMemo(() => {
    return selection.ids
      .map((id) => elementRefs.current.get(id))
      .filter((el): el is HTMLElement => el !== undefined);
  }, [selection.ids, elements]);

  const hasLocked = useMemo(() => {
    return elements.some((el) => selection.ids.includes(el.id) && el.locked);
  }, [elements, selection.ids]);

  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
  }, [elements]);

  // ─── HIGH PERFORMANCE HANDLERS (DOM direct update) ───
  const handleDrag = useCallback(
    ({ target, left, top, deltaX, deltaY }: any) => {
      const id = target?.dataset?.elementId;
      if (!id) return;

      const el = elements.find((e) => e.id === id);
      if (!el) return;

      // If it's a group, update all children
      if (el.type === "group") {
        const groupId = el.groupId;
        const children = elements.filter(
          (c) => c.groupId === groupId && c.id !== id,
        );

        // Update group wrapper
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        pendingUpdates.current[id] = {
          x: Math.round(left),
          y: Math.round(top),
        };

        // Update each child
        children.forEach((child) => {
          const childEl = elementRefs.current.get(child.id);
          if (childEl) {
            const newX = child.x + (deltaX || 0);
            const newY = child.y + (deltaY || 0);
            childEl.style.left = `${newX}px`;
            childEl.style.top = `${newY}px`;
            pendingUpdates.current[child.id] = {
              ...pendingUpdates.current[child.id],
              x: Math.round(newX),
              y: Math.round(newY),
            };
          }
        });
      } else {
        // Normal element
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        pendingUpdates.current[id] = {
          x: Math.round(left),
          y: Math.round(top),
        };
      }
    },
    [elements],
  );

  const handleDragGroup = useCallback(
    ({ events }: any) => {
      events.forEach(({ target, left, top, deltaX, deltaY }: any) =>
        handleDrag({ target, left, top, deltaX, deltaY }),
      );
    },
    [handleDrag],
  );

  const handleResize = useCallback(
    ({ target, width, height, drag, deltaWidth, deltaHeight }: any) => {
      const id = target?.dataset?.elementId;
      if (!id) return;

      const el = elements.find((e) => e.id === id);
      if (!el) return;

      // Update the target
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      target.style.left = `${drag.left}px`;
      target.style.top = `${drag.top}px`;
      pendingUpdates.current[id] = {
        width: Math.round(width),
        height: Math.round(height),
        x: Math.round(drag.left),
        y: Math.round(drag.top),
      };

      // If it's a group, resize children proportionally
      if (el.type === "group") {
        const groupId = el.groupId;
        const children = elements.filter(
          (c) => c.groupId === groupId && c.id !== id,
        );

        // Calculate scale factors
        const oldWidth = el.width || 1;
        const oldHeight = el.height || 1;
        const scaleX = width / oldWidth;
        const scaleY = height / oldHeight;

        children.forEach((child) => {
          const childEl = elementRefs.current.get(child.id);
          if (childEl) {
            // New position relative to group origin
            const relativeX = child.x - el.x;
            const relativeY = child.y - el.y;
            const newX = drag.left + relativeX * scaleX;
            const newY = drag.top + relativeY * scaleY;
            const newWidth = child.width * scaleX;
            const newHeight = child.height * scaleY;

            childEl.style.left = `${newX}px`;
            childEl.style.top = `${newY}px`;
            childEl.style.width = `${newWidth}px`;
            childEl.style.height = `${newHeight}px`;
            pendingUpdates.current[child.id] = {
              x: Math.round(newX),
              y: Math.round(newY),
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            };
          }
        });
      }
    },
    [elements],
  );

  const handleResizeGroup = useCallback(
    ({ events }: any) => {
      events.forEach((ev: any) => handleResize(ev));
    },
    [handleResize],
  );

  const handleRotate = useCallback(({ target, rotation }: any) => {
    const id = target?.dataset?.elementId;
    if (!id) return;
    target.style.transform = `rotate(${rotation}deg)`;
    pendingUpdates.current[id] = { rotation: Math.round(rotation) };
  }, []);

  const handleRotateGroup = useCallback(
    ({ events }: any) => {
      events.forEach((ev: any) => handleRotate(ev));
    },
    [handleRotate],
  );

  // ─── STATE SYNC (Flush on interaction end) ───────────
  const flushPendingUpdates = useCallback(() => {
    const ids = Object.keys(pendingUpdates.current);
    if (ids.length === 0) return;

    if (ids.length === 1) {
      updateElement(ids[0], pendingUpdates.current[ids[0]]);
    } else {
      const updates = ids.map((id) => ({
        id,
        props: pendingUpdates.current[id],
      }));
      updateElements(updates);
    }
    pendingUpdates.current = {};
  }, [updateElement, updateElements]);

  // ─── Selecto ──────────────────────────────────────────
  const onSelectoSelect = useCallback(
    (e: any) => {
      const selected = e.selected
        .map((el: HTMLElement) => el.dataset?.elementId)
        .filter(Boolean);

      if (!e.inputEvent?.shiftKey && !e.inputEvent?.metaKey) {
        clearSelection();
      }

      selected.forEach((id: string) => {
        selectElement(id, true);
      });
    },
    [selectElement, clearSelection],
  );

  // Update Moveable rect after external changes
  useEffect(() => {
    if (moveableRef.current) {
      moveableRef.current.updateRect();
    }
  });

  if (!activePage) {
    return (
      <div className="flex-1 bg-slate-200 flex items-center justify-center">
        <p className="text-slate-500">No page selected</p>
      </div>
    );
  }

  // ─── Page settings ────────────────────────────────────
  const border = activePage.border || {
    show: false,
    width: 1,
    color: "#000000",
    style: "solid",
    padding: 0,
    radius: 0,
  };
  const watermark = activePage.watermark || {
    url: "",
    opacity: 10,
    size: "contain",
    position: "center",
  };
  const pageNumber = activePage.pageNumber || {
    show: false,
    position: "bottom-right",
    format: "page-x-of-y",
  };

  const getPageNumberText = () => {
    const total = document.pages.length;
    const current = document.pages.findIndex((p) => p.id === activePageId) + 1;
    switch (pageNumber.format) {
      case "page-x-of-y":
        return `Page ${current} of ${total}`;
      case "x-of-y":
        return `${current} / ${total}`;
      case "page-x":
        return `Page ${current}`;
      case "x":
        return `${current}`;
      default:
        return `Page ${current} of ${total}`;
    }
  };

  const getWatermarkPosition = () => {
    const pos = watermark.position || "center";
    const styles: React.CSSProperties = {};
    switch (pos) {
      case "top-left":
        styles.alignItems = "flex-start";
        styles.justifyContent = "flex-start";
        break;
      case "top-right":
        styles.alignItems = "flex-start";
        styles.justifyContent = "flex-end";
        break;
      case "bottom-left":
        styles.alignItems = "flex-end";
        styles.justifyContent = "flex-start";
        break;
      case "bottom-right":
        styles.alignItems = "flex-end";
        styles.justifyContent = "flex-end";
        break;
      default:
        styles.alignItems = "center";
        styles.justifyContent = "center";
        break;
    }
    return styles;
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .moveable-control { background: #3b82f6 !important; border-color: #3b82f6 !important; width: 10px !important; height: 10px !important; }
            .moveable-line, .moveable-direction, .moveable-rotation-line { background: #3b82f6 !important; }
            .moveable-origin { background: #3b82f6 !important; border-color: #3b82f6 !important; }
          `,
        }}
      />

      <div
        ref={(node) => {
          containerRef.current = node;
          setNodeRef(node);
        }}
        className="flex-1 bg-slate-200 overflow-auto flex justify-center p-8"
        style={{ height: "100%" }}
        onClick={(e) => {
          if (e.target === containerRef.current) clearSelection();
        }}>
        <div
          ref={paperRef}
          className="relative bg-white shadow-2xl"
          onClick={() => clearSelection()}
          style={{
            width: activePage.width,
            height: activePage.height,
            transform: `scale(${viewport.zoom})`,
            transformOrigin: "top center",
            backgroundColor: activePage.background || "#ffffff",
            backgroundImage: activePage.backgroundImage
              ? `url(${activePage.backgroundImage})`
              : undefined,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}>
          {/* Border */}
          {border.show && (
            <div
              className="absolute pointer-events-none z-[1000]"
              style={{
                top: border.padding || 0,
                left: border.padding || 0,
                right: border.padding || 0,
                bottom: border.padding || 0,
                border: `${border.width}px ${border.style} ${border.color}`,
                borderRadius: `${border.radius || 0}px`,
              }}
            />
          )}

          {/* Watermark */}
          {watermark.url && (
            <div
              className="absolute pointer-events-none flex inset-0 z-0"
              style={getWatermarkPosition()}>
              <img
                src={watermark.url}
                alt="Watermark"
                style={{
                  opacity: (watermark.opacity || 10) / 100,
                  maxWidth: watermark.size === "contain" ? "80%" : "100%",
                  maxHeight: watermark.size === "contain" ? "80%" : "100%",
                  objectFit: watermark.size === "contain" ? "contain" : "cover",
                  width: "auto",
                  height: "auto",
                }}
              />
            </div>
          )}

          {/* Page Number */}
          {pageNumber.show && (
            <div
              className="absolute pointer-events-none text-slate-500 text-xs z-50"
              style={{
                padding: "8px",
                ...(pageNumber.position === "top-left" && {
                  top: 0,
                  left: 0,
                }),
                ...(pageNumber.position === "top-center" && {
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                }),
                ...(pageNumber.position === "top-right" && {
                  top: 0,
                  right: 0,
                }),
                ...(pageNumber.position === "bottom-left" && {
                  bottom: 0,
                  left: 0,
                }),
                ...(pageNumber.position === "bottom-center" && {
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                }),
                ...(pageNumber.position === "bottom-right" && {
                  bottom: 0,
                  right: 0,
                }),
              }}>
              {getPageNumberText()}
            </div>
          )}

          {/* Elements */}
          {sortedElements.map((el) => {
            const Component = elementMap[el.type];
            if (!Component) return null;
            const isSelected = selection.ids.includes(el.id);
            const isLocked = el.locked || false;

            return (
              <div
                key={el.id}
                data-element-id={el.id}
                ref={(ref) => {
                  if (ref) elementRefs.current.set(el.id, ref);
                  else elementRefs.current.delete(el.id);
                }}
                className="absolute"
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  transform: `rotate(${el.rotation || 0}deg)`,
                  zIndex: el.zIndex || 1,
                  display: el.visible === false ? "none" : "block",
                  cursor: isLocked ? "default" : "move",
                  outline: isSelected ? "2px solid #3b82f6" : "none",
                  outlineOffset: "0px",
                  opacity: isLocked ? 0.7 : 1,
                  pointerEvents: isLocked ? "none" : "auto",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) return;
                  selectElement(el.id, e.shiftKey || e.metaKey);
                }}>
                <Component {...el} />
              </div>
            );
          })}

          {/* Moveable */}
          {selectedTargets.length > 0 && !hasLocked && (
            <Moveable
              ref={moveableRef}
              target={selectedTargets}
              container={paperRef.current}
              rootContainer={containerRef.current}
              draggable={true}
              resizable={true}
              rotatable={true}
              snappable={true}
              snapGap={true}
              snapThreshold={5}
              origin={false}
              zoom={viewport.zoom}
              keepRatio={false}
              bounds={{
                left: 0,
                top: 0,
                right: activePage.width,
                bottom: activePage.height,
              }}
              renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
              onDrag={handleDrag}
              onDragGroup={handleDragGroup}
              onResize={handleResize}
              onResizeGroup={handleResizeGroup}
              onRotate={handleRotate}
              onRotateGroup={handleRotateGroup}
              onDragEnd={flushPendingUpdates}
              onDragGroupEnd={flushPendingUpdates}
              onResizeEnd={flushPendingUpdates}
              onResizeGroupEnd={flushPendingUpdates}
              onRotateEnd={flushPendingUpdates}
              onRotateGroupEnd={flushPendingUpdates}
            />
          )}

          {/* Selecto */}
          <Selecto
            ref={selectoRef}
            container={paperRef.current}
            dragContainer={paperRef.current}
            selectableTargets={["[data-element-id]"]}
            hitRate={0}
            selectByClick={false}
            selectFromInside={false}
            toggleContinueSelect={["shift"]}
            onSelect={onSelectoSelect}
          />
        </div>
      </div>
    </>
  );
}
