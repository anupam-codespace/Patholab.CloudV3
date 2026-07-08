// store/useEditorStore.ts
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  EditorState,
  EditorDocument,
  Element,
  ElementType,
  Page,
  Selection,
  Viewport,
  EditorSettings,
  HistoryState,
  ClipboardItem,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const createInitialPage = (): Page => ({
  id: uuidv4(),
  name: "Page 1",
  width: 794,
  height: 1123,
  background: "#ffffff",
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  elements: [],
});

const createInitialDocument = (): EditorDocument => ({
  pages: [createInitialPage()],
});

const defaultSettings: EditorSettings = {
  snap: true,
  grid: false,
  gridSize: 10,
  showRulers: true,
  showGuides: false,
  showMargins: true,
  autoSave: true,
  autoSaveInterval: 5,
};

// ─── Initial State ────────────────────────────────────
const initialState: EditorState = {
  document: createInitialDocument(),
  activePageId: createInitialPage().id, // will be overwritten
  selection: { ids: [] },
  clipboard: null,
  viewport: { zoom: 1, panX: 0, panY: 0 },
  settings: defaultSettings,
  history: { past: [], future: [] },
  dirty: false,
};

// Fix: set activePageId to the actual first page id
const firstPageId = createInitialDocument().pages[0].id;
initialState.activePageId = firstPageId;

// ─── Store Actions Interface ──────────────────────────
export interface EditorActions {
  // History
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Elements
  addElement: (element: Omit<Element, "id">) => void;
  updateElement: (id: string, props: Partial<Element>) => void;
  updateElements: (updates: { id: string; props: Partial<Element> }[]) => void;
  deleteElements: (ids: string[]) => void;
  deleteSelected: () => void;

  // Selection
  selectElement: (id: string, multi: boolean) => void;
  setSelected: (ids: string[]) => void;
  clearSelection: () => void;

  // Zoom & Viewport
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitPage: () => void;
  setPan: (x: number, y: number) => void;

  // Copy / Paste / Duplicate
  copySelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;

  // Layer ordering
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Lock / Unlock
  lockSelected: () => void;
  unlockSelected: () => void;

  // Alignment (placeholders)
  alignLeft: () => void;
  alignRight: () => void;
  alignCenter: () => void;
  alignTop: () => void;
  alignBottom: () => void;
  distributeHorizontal: () => void;
  distributeVertical: () => void;

  // Pages
  addPage: () => void;
  removePage: (id: string) => void;
  duplicatePage: (id: string) => void;
  setActivePage: (id: string) => void;

  // Dirty
  setDirty: (dirty: boolean) => void;

  // Group (placeholders)
  groupSelected: () => void;
  ungroupSelected: () => void;
}

// ─── The Store ────────────────────────────────────────
export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  ...initialState,

  // ─── History ──────────────────────────────────────
  saveSnapshot: () => {
    const { history, document } = get();
    set((state) => ({
      history: {
        past: [...state.history.past, clone(document)],
        future: [],
      },
      dirty: true,
    }));
  },

  undo: () => {
    const { history, document } = get();
    if (history.past.length === 0) return;
    const past = [...history.past];
    const previous = past.pop()!;
    set({
      document: previous,
      history: {
        past,
        future: [clone(document), ...history.future],
      },
      dirty: true,
    });
  },

  redo: () => {
    const { history, document } = get();
    if (history.future.length === 0) return;
    const future = [...history.future];
    const next = future.shift()!;
    set({
      document: next,
      history: {
        past: [...history.past, clone(document)],
        future,
      },
      dirty: true,
    });
  },

  // ─── Elements ──────────────────────────────────────
  addElement: (element) => {
    get().saveSnapshot();
    const newEl = { id: uuidv4(), ...element } as Element;
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const updatedElements = [...page.elements, newEl];
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: updatedElements } : p
          ),
        },
        selection: { ids: [newEl.id] },
      };
    });
  },

  updateElement: (id, props) => {
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const el = page.elements.find((e) => e.id === id);
      if (!el) return state;
      const newEl = { ...el, ...props };
      // Check if anything changed
      let changed = false;
      for (const key in props) {
        if (el[key as keyof Element] !== props[key as keyof Element]) {
          changed = true;
          break;
        }
      }
      if (!changed) return state;
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId
              ? { ...p, elements: p.elements.map((e) => (e.id === id ? newEl : e)) }
              : p
          ),
        },
        dirty: true,
      };
    });
  },

  updateElements: (updates) => {
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      let changed = false;
      const updatedElements = page.elements.map((el) => {
        const update = updates.find((u) => u.id === el.id);
        if (update) {
          const newEl = { ...el, ...update.props };
          if (JSON.stringify(el) !== JSON.stringify(newEl)) changed = true;
          return newEl;
        }
        return el;
      });
      if (!changed) return state;
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: updatedElements } : p
          ),
        },
        dirty: true,
      };
    });
  },

  deleteElements: (ids) => {
    if (ids.length === 0) return;
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const idSet = new Set(ids);
      const remaining = page.elements.filter((el) => !idSet.has(el.id));
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: remaining } : p
          ),
        },
        selection: { ids: state.selection.ids.filter((id) => !idSet.has(id)) },
      };
    });
  },

  deleteSelected: () => {
    const { selection } = get();
    get().deleteElements(selection.ids);
  },

  // ─── Selection ─────────────────────────────────────
  selectElement: (id, multi) => {
    set((state) => ({
      selection: {
        ids: multi
          ? state.selection.ids.includes(id)
            ? state.selection.ids.filter((sid) => sid !== id)
            : [...state.selection.ids, id]
          : [id],
      },
    }));
  },

  setSelected: (ids) => set({ selection: { ids } }),

  clearSelection: () => set({ selection: { ids: [] } }),

  // ─── Zoom & Viewport ──────────────────────────────
  setZoom: (zoom) =>
    set((state) => ({ viewport: { ...state.viewport, zoom } })),

  zoomIn: () =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.min(state.viewport.zoom + 0.1, 2) },
    })),

  zoomOut: () =>
    set((state) => ({
      viewport: { ...state.viewport, zoom: Math.max(state.viewport.zoom - 0.1, 0.5) },
    })),

  resetZoom: () =>
    set((state) => ({ viewport: { ...state.viewport, zoom: 1 } })),

  fitPage: () =>
    set((state) => ({ viewport: { ...state.viewport, zoom: 1 } })), // placeholder

  setPan: (x, y) =>
    set((state) => ({ viewport: { ...state.viewport, panX: x, panY: y } })),

  // ─── Copy / Paste / Duplicate ─────────────────────
  copySelected: () => {
    const state = get();
    const page = state.document.pages.find((p) => p.id === state.activePageId);
    if (!page) return;
    const selected = page.elements.filter((el) => state.selection.ids.includes(el.id));
    set({
      clipboard: {
        elements: clone(selected),
        copiedAt: Date.now(),
      },
    });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.elements.length === 0) return;
    get().saveSnapshot();
    const newElements = clipboard.elements.map((el) => ({
      ...el,
      id: uuidv4(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const updatedElements = [...page.elements, ...newElements];
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: updatedElements } : p
          ),
        },
        selection: { ids: newElements.map((el) => el.id) },
      };
    });
  },

  duplicateSelected: () => {
    const { selection } = get();
    if (selection.ids.length === 0) return;
    const page = get().document.pages.find((p) => p.id === get().activePageId);
    if (!page) return;
    const selected = page.elements.filter((el) => selection.ids.includes(el.id));
    get().saveSnapshot();
    const newElements = selected.map((el) => ({
      ...el,
      id: uuidv4(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const updatedElements = [...page.elements, ...newElements];
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: updatedElements } : p
          ),
        },
        selection: { ids: newElements.map((el) => el.id) },
      };
    });
  },

  // ─── Layer Ordering ────────────────────────────────
  bringForward: (id) => {
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const idx = page.elements.findIndex((el) => el.id === id);
      if (idx === -1 || idx === page.elements.length - 1) return state;
      const elements = [...page.elements];
      [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  sendBackward: (id) => {
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const idx = page.elements.findIndex((el) => el.id === id);
      if (idx <= 0) return state;
      const elements = [...page.elements];
      [elements[idx], elements[idx - 1]] = [elements[idx - 1], elements[idx]];
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  bringToFront: (id) => {
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const elements = page.elements.filter((el) => el.id !== id);
      const el = page.elements.find((e) => e.id === id);
      if (!el) return state;
      elements.push(el);
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  sendToBack: (id) => {
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const elements = page.elements.filter((el) => el.id !== id);
      const el = page.elements.find((e) => e.id === id);
      if (!el) return state;
      elements.unshift(el);
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  // ─── Lock / Unlock ──────────────────────────────────
  lockSelected: () => {
    const { selection } = get();
    if (selection.ids.length === 0) return;
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const idSet = new Set(selection.ids);
      const elements = page.elements.map((el) =>
        idSet.has(el.id) ? { ...el, locked: true } : el
      );
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  unlockSelected: () => {
    const { selection } = get();
    if (selection.ids.length === 0) return;
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === state.activePageId);
      if (!page) return state;
      const idSet = new Set(selection.ids);
      const elements = page.elements.map((el) =>
        idSet.has(el.id) ? { ...el, locked: false } : el
      );
      return {
        document: {
          ...state.document,
          pages: state.document.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements } : p
          ),
        },
      };
    });
  },

  // ─── Alignment (placeholders) ──────────────────────
  alignLeft: () => {},
  alignRight: () => {},
  alignCenter: () => {},
  alignTop: () => {},
  alignBottom: () => {},
  distributeHorizontal: () => {},
  distributeVertical: () => {},

  // ─── Pages ─────────────────────────────────────────
  addPage: () => {
    get().saveSnapshot();
    const newPage = createInitialPage();
    newPage.id = uuidv4();
    set((state) => ({
      document: {
        ...state.document,
        pages: [...state.document.pages, newPage],
      },
      activePageId: newPage.id,
    }));
  },

  removePage: (id) => {
    if (get().document.pages.length <= 1) return;
    get().saveSnapshot();
    set((state) => {
      const pages = state.document.pages.filter((p) => p.id !== id);
      let newActiveId = state.activePageId;
      if (!pages.some((p) => p.id === state.activePageId)) {
        newActiveId = pages[0]?.id || state.activePageId;
      }
      return {
        document: { ...state.document, pages },
        activePageId: newActiveId,
      };
    });
  },

  duplicatePage: (id) => {
    get().saveSnapshot();
    set((state) => {
      const page = state.document.pages.find((p) => p.id === id);
      if (!page) return state;
      const newPage = clone(page);
      newPage.id = uuidv4();
      newPage.name = `${page.name} (copy)`;
      const pages = [...state.document.pages];
      const idx = pages.findIndex((p) => p.id === id);
      pages.splice(idx + 1, 0, newPage);
      return {
        document: { ...state.document, pages },
        activePageId: newPage.id,
      };
    });
  },

  setActivePage: (id) => set({ activePageId: id }),

  // ─── Dirty ──────────────────────────────────────────
  setDirty: (dirty) => set({ dirty }),

  // ─── Group (placeholders) ──────────────────────────
  groupSelected: () => {},
  ungroupSelected: () => {},

  loadState: (state) => {
  set(state);
  },
  
// ─── Group Operations ──────────────────────────────────

groupSelected: () => {
  const { selection, document, activePageId } = get();
  if (selection.ids.length < 2) {
    toast.error("Select at least 2 elements to group");
    return;
  }

  get().saveSnapshot();
  const groupId = uuidv4();
  const page = document.pages.find((p) => p.id === activePageId);
  if (!page) return;

  const groupElements = page.elements.filter((el) => selection.ids.includes(el.id));
  // Calculate group bounds
  const minX = Math.min(...groupElements.map((el) => el.x));
  const minY = Math.min(...groupElements.map((el) => el.y));
  const maxX = Math.max(...groupElements.map((el) => el.x + el.width));
  const maxY = Math.max(...groupElements.map((el) => el.y + el.height));

  // Create a group wrapper element
  const groupWrapper: Element = {
    id: uuidv4(),
    type: "group",
    name: "Group",
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: Math.max(...groupElements.map((el) => el.zIndex || 0)) + 1,
    groupId: groupId,
    parentId: undefined,
    constraints: {},
  } as any;

  // Update child elements with groupId and parentId
  const updatedElements = page.elements.map((el) => {
    if (selection.ids.includes(el.id)) {
      return { ...el, groupId: groupId, parentId: groupWrapper.id };
    }
    return el;
  });

  // Add group wrapper and update elements
  set((state) => {
    const page = state.document.pages.find((p) => p.id === state.activePageId);
    if (!page) return state;
    const elements = [...updatedElements, groupWrapper];
    const groups = [...state.document.groups, { id: groupId, name: "Group", elements: selection.ids, locked: false, visible: true }];
    return {
      document: {
        ...state.document,
        pages: state.document.pages.map((p) =>
          p.id === state.activePageId ? { ...p, elements } : p
        ),
        groups,
      },
      selection: { ids: [groupWrapper.id] },
    };
  });
},

ungroupSelected: () => {
  const { selection, document, activePageId } = get();
  if (selection.ids.length !== 1) {
    toast.error("Select a single group to ungroup");
    return;
  }

  const groupId = selection.ids[0];
  const page = document.pages.find((p) => p.id === activePageId);
  if (!page) return;

  const groupEl = page.elements.find((el) => el.id === groupId);
  if (!groupEl || groupEl.type !== "group") {
    toast.error("Selected element is not a group");
    return;
  }

  get().saveSnapshot();
  const groupData = document.groups.find((g) => g.id === groupEl.groupId);
  if (!groupData) return;

  // Remove groupId and parentId from children
  const updatedElements = page.elements.map((el) => {
    if (el.groupId === groupData.id) {
      const { groupId, parentId, ...rest } = el;
      return rest;
    }
    return el;
  }).filter((el) => el.id !== groupId);

  set((state) => {
    const page = state.document.pages.find((p) => p.id === state.activePageId);
    if (!page) return state;
    return {
      document: {
        ...state.document,
        pages: state.document.pages.map((p) =>
          p.id === state.activePageId ? { ...p, elements: updatedElements } : p
        ),
        groups: state.document.groups.filter((g) => g.id !== groupData.id),
      },
      selection: { ids: groupData.elements },
    };
  });
},

// Add pre-built header group
addHeaderGroup: (x: number, y: number) => {
  get().saveSnapshot();
  const groupId = uuidv4();
  const elements: Element[] = [
    // Logo placeholder
    {
      id: uuidv4(),
      type: "image",
      name: "Logo",
      x: x,
      y: y,
      width: 60,
      height: 60,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      src: "",
      objectFit: "contain",
      flipX: false,
      flipY: false,
      brightness: 100,
      contrast: 100,
      saturation: 100,
    } as any,
    // Lab Name
    {
      id: uuidv4(),
      type: "text",
      name: "Lab Name",
      x: x + 70,
      y: y + 5,
      width: 300,
      height: 30,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      content: "GLOBIZ PATHOLAB",
      fontSize: 24,
      fontFamily: "Arial",
      color: "#1e3a8a",
      bgColor: "transparent",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      bold: true,
      italic: false,
      underline: false,
      textTransform: "uppercase",
      verticalAlign: "top",
      padding: 0,
    } as any,
    // Tagline
    {
      id: uuidv4(),
      type: "text",
      name: "Tagline",
      x: x + 70,
      y: y + 35,
      width: 300,
      height: 20,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      content: "Advanced Diagnostics Center",
      fontSize: 12,
      fontFamily: "Arial",
      color: "#64748b",
      bgColor: "transparent",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      bold: false,
      italic: false,
      underline: false,
      textTransform: "none",
      verticalAlign: "top",
      padding: 0,
    } as any,
    // Separator line
    {
      id: uuidv4(),
      type: "shape",
      name: "Separator",
      x: x,
      y: y + 70,
      width: 400,
      height: 3,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      shapeType: "rectangle",
      fillColor: "#1e3a8a",
      strokeColor: "transparent",
      strokeWidth: 0,
      radius: 0,
    } as any,
  ];

  const groupWrapper: Element = {
    id: uuidv4(),
    type: "group",
    name: "Header Group",
    x: x,
    y: y,
    width: 400,
    height: 75,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 10,
    groupId: groupId,
    parentId: undefined,
    constraints: {},
  } as any;

  set((state) => {
    const page = state.document.pages.find((p) => p.id === state.activePageId);
    if (!page) return state;
    return {
      document: {
        ...state.document,
        pages: state.document.pages.map((p) =>
          p.id === state.activePageId
            ? { ...p, elements: [...page.elements, groupWrapper, ...elements] }
            : p
        ),
        groups: [...state.document.groups, { id: groupId, name: "Header Group", elements: elements.map((el) => el.id), locked: false, visible: true }],
      },
      selection: { ids: [groupWrapper.id] },
    };
  });
},

// Add pre-built footer group
addFooterGroup: (x: number, y: number) => {
  get().saveSnapshot();
  const groupId = uuidv4();
  const elements: Element[] = [
    // Separator line
    {
      id: uuidv4(),
      type: "shape",
      name: "Separator",
      x: x,
      y: y,
      width: 400,
      height: 2,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      shapeType: "rectangle",
      fillColor: "#cbd5e1",
      strokeColor: "transparent",
      strokeWidth: 0,
      radius: 0,
    } as any,
    // Disclaimer text
    {
      id: uuidv4(),
      type: "text",
      name: "Disclaimer",
      x: x,
      y: y + 10,
      width: 400,
      height: 40,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      content: "*** End of Report ***\nThis is an electronically generated report.",
      fontSize: 10,
      fontFamily: "Arial",
      color: "#64748b",
      bgColor: "transparent",
      textAlign: "center",
      lineHeight: 1.4,
      letterSpacing: 0,
      bold: false,
      italic: false,
      underline: false,
      textTransform: "none",
      verticalAlign: "top",
      padding: 0,
    } as any,
    // Page number placeholder
    {
      id: uuidv4(),
      type: "text",
      name: "Page Number",
      x: x + 350,
      y: y + 55,
      width: 50,
      height: 15,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 1,
      groupId: groupId,
      parentId: undefined,
      content: "Page 1 of 1",
      fontSize: 9,
      fontFamily: "Arial",
      color: "#94a3b8",
      bgColor: "transparent",
      textAlign: "right",
      lineHeight: 1.2,
      letterSpacing: 0,
      bold: false,
      italic: false,
      underline: false,
      textTransform: "none",
      verticalAlign: "top",
      padding: 0,
    } as any,
  ];

  const groupWrapper: Element = {
    id: uuidv4(),
    type: "group",
    name: "Footer Group",
    x: x,
    y: y,
    width: 400,
    height: 75,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 10,
    groupId: groupId,
    parentId: undefined,
    constraints: {},
  } as any;

  set((state) => {
    const page = state.document.pages.find((p) => p.id === state.activePageId);
    if (!page) return state;
    return {
      document: {
        ...state.document,
        pages: state.document.pages.map((p) =>
          p.id === state.activePageId
            ? { ...p, elements: [...page.elements, groupWrapper, ...elements] }
            : p
        ),
        groups: [...state.document.groups, { id: groupId, name: "Footer Group", elements: elements.map((el) => el.id), locked: false, visible: true }],
      },
      selection: { ids: [groupWrapper.id] },
    };
  });
},



// Inside useEditorStore, add these actions:

// ─── Page Operations ──────────────────────────────────

// Update entire page
updatePage: (pageId: string, updates: Partial<Page>) => {
  get().saveSnapshot();
  set((state) => {
    const pageIndex = state.document.pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) return state;
    const pages = [...state.document.pages];
    pages[pageIndex] = { ...pages[pageIndex], ...updates };
    return {
      document: { ...state.document, pages },
      dirty: true,
    };
  });
},

// Convenience: update page background
updatePageBackground: (pageId: string, background: string) => {
  get().updatePage(pageId, { background });
},

// Convenience: update page margins
updatePageMargins: (pageId: string, margin: Partial<Page['margin']>) => {
  const page = get().document.pages.find((p) => p.id === pageId);
  if (!page) return;
  get().updatePage(pageId, { margin: { ...page.margin, ...margin } });
},

// Convenience: update page border
updatePageBorder: (pageId: string, border: Partial<NonNullable<Page['border']>>) => {
  const page = get().document.pages.find((p) => p.id === pageId);
  if (!page) return;
  const currentBorder = page.border || { show: false, width: 1, color: '#000000', style: 'solid' };
  get().updatePage(pageId, { border: { ...currentBorder, ...border } });
},

// Convenience: update watermark
updatePageWatermark: (pageId: string, watermark: Partial<NonNullable<Page['watermark']>>) => {
  const page = get().document.pages.find((p) => p.id === pageId);
  if (!page) return;
  const current = page.watermark || { url: '', opacity: 10, size: 'contain', position: 'center' };
  get().updatePage(pageId, { watermark: { ...current, ...watermark } });
},

// Convenience: update page numbers
updatePageNumber: (pageId: string, pageNumber: Partial<NonNullable<Page['pageNumber']>>) => {
  const page = get().document.pages.find((p) => p.id === pageId);
  if (!page) return;
  const current = page.pageNumber || { show: false, position: 'bottom-right', format: 'page-x-of-y' };
  get().updatePage(pageId, { pageNumber: { ...current, ...pageNumber } });
},

// Convenience: toggle orientation
toggleOrientation: (pageId: string) => {
  const page = get().document.pages.find((p) => p.id === pageId);
  if (!page) return;
  const isPortrait = page.orientation !== 'landscape';
  const newWidth = isPortrait ? 1123 : 794;
  const newHeight = isPortrait ? 794 : 1123;
  get().updatePage(pageId, {
    orientation: isPortrait ? 'landscape' : 'portrait',
    width: newWidth,
    height: newHeight,
  });
},



}));


