// lib/elementFactory.ts
import { v4 as uuidv4 } from "uuid";
import { Element, ElementType } from "@/lib/types";
import { ELEMENT_DEFAULTS } from "./constants";

/**
 * Create a new element with default properties.
 * @param type - The element type.
 * @param x - Initial X position (canvas coordinates).
 * @param y - Initial Y position (canvas coordinates).
 * @returns A fully initialized Element.
 */
export function createElement(type: ElementType, x: number, y: number): Element {
  const defaults = ELEMENT_DEFAULTS[type];
  if (!defaults) {
    throw new Error(`Unknown element type: ${type}`);
  }

  const base = {
    id: uuidv4(),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    x,
    y,
    width: defaults.width,
    height: defaults.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 1,
  };

  // Merge base with type‑specific props
  return { ...base, ...defaults.props } as Element;
}

/**
 * Batch create elements (e.g., for paste, duplicate, import).
 */
export function createElements(
  items: { type: ElementType; x: number; y: number }[]
): Element[] {
  return items.map(({ type, x, y }) => createElement(type, x, y));
}