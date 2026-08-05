"use client";
import { useEffect, useRef, useState } from "react";

interface ShortcutHandler {
  key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean;
  description?: string; handler: () => void;
}

const registry = new Map<string, ShortcutHandler & { id: number }>();
let handlerIdCounter = 0;
let showHelpOverlay = false;
const helpOverlayListeners = new Set<(show: boolean) => void>();

export function setShowHelpOverlay(show: boolean) {
  showHelpOverlay = show;
  helpOverlayListeners.forEach((fn) => fn(show));
}

function getShortcutKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  if (e.metaKey) parts.push("meta");
  parts.push(e.key.toLowerCase());
  return parts.join("+");
}

function isTextInput(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

let globalListenerInstalled = false;
function installGlobalListener() {
  if (globalListenerInstalled || typeof window === "undefined") return;
  globalListenerInstalled = true;
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "/") { e.preventDefault(); setShowHelpOverlay(!showHelpOverlay); return; }
    if (e.key === "Escape" && showHelpOverlay) { setShowHelpOverlay(false); return; }
    if (isTextInput(e) && e.key !== "Escape") return;
    const key = getShortcutKey(e);
    let latestHandler: (ShortcutHandler & { id: number }) | null = null;
    for (const [, h] of registry) {
      const hKey = [h.ctrl ? "ctrl" : "", h.shift ? "shift" : "", h.alt ? "alt" : "", h.meta ? "meta" : "", h.key.toLowerCase()].filter(Boolean).join("+");
      if (hKey === key) { if (!latestHandler || h.id > latestHandler.id) latestHandler = h; }
    }
    if (latestHandler) { e.preventDefault(); e.stopPropagation(); latestHandler.handler(); }
  });
}
installGlobalListener();

export function useKeyboardShortcut(
  key: string, handler: () => void,
  options?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean; description?: string }
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const id = ++handlerIdCounter;
    const entry: ShortcutHandler & { id: number } = {
      key, ctrl: options?.ctrl, shift: options?.shift, alt: options?.alt, meta: options?.meta,
      description: options?.description, handler: () => handlerRef.current(), id,
    };
    const storageKey = [options?.ctrl ? "ctrl" : "", options?.shift ? "shift" : "", options?.alt ? "alt" : "", options?.meta ? "meta" : "", key.toLowerCase()].filter(Boolean).join("+");
    registry.set(`${storageKey}:${id}`, entry);
    return () => { registry.delete(`${storageKey}:${id}`); };
  }, [key, options?.ctrl, options?.shift, options?.alt, options?.meta]);
}

export function useHelpOverlay() {
  const [show, setShow] = useState(showHelpOverlay);
  useEffect(() => {
    const listener = (s: boolean) => setShow(s);
    helpOverlayListeners.add(listener);
    return () => { helpOverlayListeners.delete(listener); };
  }, []);
  return [show, setShowHelpOverlay] as const;
}

export function getAllShortcuts(): Array<{ key: string; description: string }> {
  const shortcuts: Array<{ key: string; description: string }> = [];
  const seen = new Set<string>();
  for (const [, h] of registry) {
    const key = [h.ctrl ? "Ctrl+" : "", h.shift ? "Shift+" : "", h.alt ? "Alt+" : "", h.key.toUpperCase()].join("");
    if (!seen.has(key) && h.description) { seen.add(key); shortcuts.push({ key, description: h.description }); }
  }
  if (!seen.has("Ctrl+/")) shortcuts.push({ key: "Ctrl+/", description: "Show/hide keyboard shortcuts" });
  if (!seen.has("ESC")) shortcuts.push({ key: "ESC", description: "Close dialog / Go back" });
  return shortcuts;
}
