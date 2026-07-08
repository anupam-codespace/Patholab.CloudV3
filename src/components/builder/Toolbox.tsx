"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Search } from "lucide-react";
import { TOOLBOX_ITEMS, ToolboxItem } from "@/lib/constants";
import { useEditorStore } from "@/store/useEditorStore";
import { createElement } from "@/lib/elementFactory";
import toast from "react-hot-toast";

// ─── Draggable Item ────────────────────────────────────
const DraggableItem = ({ item }: { item: ToolboxItem }) => {
  const addElement = useEditorStore((s) => s.addElement);
  const activePageId = useEditorStore((s) => s.activePageId);
  const document = useEditorStore((s) => s.document);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id, // Use unique ID to differentiate
      data: {
        type: item.type,
        override: item.defaultOverride, // Pass override data to drag end!
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 1,
    cursor: "grab",
  };

  // ✅ CLICK TO ADD FUNCTIONALITY
  const handleAddClick = () => {
    const activePage = document.pages.find((p) => p.id === activePageId);
    if (!activePage) return;

    // Calculate center of the page
    const centerX = activePage.width / 2;
    const centerY = activePage.height / 2;

    // Determine initial size to offset exact center
    const w = item.defaultOverride?.width || 200;
    const h = item.defaultOverride?.height || 60;

    // Create base element
    const newElement = createElement(
      item.type,
      centerX - w / 2,
      centerY - h / 2,
    );

    // Apply Smart Overrides from constants
    if (item.defaultOverride) {
      if (item.defaultOverride.width)
        newElement.width = item.defaultOverride.width;
      if (item.defaultOverride.height)
        newElement.height = item.defaultOverride.height;
      if (item.defaultOverride.props) {
        newElement.props = {
          ...newElement.props,
          ...item.defaultOverride.props,
        };
      }
    }

    addElement(newElement);
    toast.success(`Added ${item.label}`);
  };

  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={handleAddClick} // Double click to add (avoids conflict with dragging)
      onClick={handleAddClick} // Single click works too if dragging is handled via listeners
      className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded shadow-sm hover:border-blue-400 hover:shadow transition-all cursor-grab active:cursor-grabbing">
      <div className="bg-slate-100 p-1.5 rounded">
        <Icon size={16} className="text-slate-600" />
      </div>
      <span className="text-[13px] font-medium text-slate-700">
        {item.label}
      </span>
    </div>
  );
};

// ─── Category Section ──────────────────────────────────
const CategorySection = ({
  title,
  items,
}: {
  title: string;
  items: ToolboxItem[];
}) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <DraggableItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

// ─── Main Toolbox ──────────────────────────────────────
export default function Toolbox() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return TOOLBOX_ITEMS;
    const query = searchQuery.toLowerCase().trim();
    return TOOLBOX_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ToolboxItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  return (
    <div className="w-72 bg-slate-50 border-r border-slate-200 h-full flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200 bg-white shrink-0">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Components</h2>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Click or Drag to add
        </p>
      </div>

      {/* Scrollable Categories */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {Object.entries(groupedItems).map(([category, items]) => (
          <CategorySection key={category} title={category} items={items} />
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-10">
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
