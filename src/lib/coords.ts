// lib/coords.ts
import { DragEndEvent } from "@dnd-kit/core";
import { useEditorStore } from "@/store/useEditorStore";

/**
 * Get the drop position on the canvas from a drag event.
 * Converts screen coordinates to canvas/page coordinates, accounting for zoom, pan, and scroll.
 */
export function getDropCoordinates(event: DragEndEvent): { x: number; y: number } {
  const { activatorEvent } = event;
  if (!activatorEvent) {
    // Fallback to center
    const store = useEditorStore.getState();
    const page = store.document.pages.find((p) => p.id === store.activePageId);
    const cx = page ? page.width / 2 : 400;
    const cy = page ? page.height / 2 : 300;
    return { x: cx - 50, y: cy - 30 };
  }

  // Get mouse position from the event
  const clientX = (activatorEvent as MouseEvent).clientX;
  const clientY = (activatorEvent as MouseEvent).clientY;

  // Get canvas container
  const canvasContainer = document.querySelector('[data-canvas-container]');
  if (!canvasContainer) {
    // Fallback
    const store = useEditorStore.getState();
    const page = store.document.pages.find((p) => p.id === store.activePageId);
    const cx = page ? page.width / 2 : 400;
    const cy = page ? page.height / 2 : 300;
    return { x: cx - 50, y: cy - 30 };
  }

  const rect = canvasContainer.getBoundingClientRect();
  const scaleX = rect.width / canvasContainer.clientWidth;
  const scaleY = rect.height / canvasContainer.clientHeight;

  // Compute relative position within the container
  const relX = (clientX - rect.left) / scaleX;
  const relY = (clientY - rect.top) / scaleY;

  // Account for page scroll (if any)
  const scrollLeft = canvasContainer.scrollLeft || 0;
  const scrollTop = canvasContainer.scrollTop || 0;

  // Get zoom level
  const store = useEditorStore.getState();
  const zoom = store.viewport.zoom || 1;

  // Convert to page coordinates (account for zoom and padding)
  // The canvas element is centered; we need to find its offset.
  const canvasEl = canvasContainer.querySelector('[data-paper]') as HTMLElement;
  let pageX = relX + scrollLeft;
  let pageY = relY + scrollTop;

  if (canvasEl) {
    const canvasRect = canvasEl.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    // Compute the offset of the paper inside the container
    const paperOffsetX = (containerRect.width - canvasRect.width) / 2;
    const paperOffsetY = (containerRect.height - canvasRect.height) / 2;
    pageX = (relX - paperOffsetX) / zoom;
    pageY = (relY - paperOffsetY) / zoom;
  }

  // Clamp to page bounds
  const page = store.document.pages.find((p) => p.id === store.activePageId);
  if (page) {
    pageX = Math.max(0, Math.min(pageX, page.width - 20));
    pageY = Math.max(0, Math.min(pageY, page.height - 20));
  }

  return { x: Math.round(pageX), y: Math.round(pageY) };
}