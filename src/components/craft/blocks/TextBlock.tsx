import React from "react";
import { useNode } from "@craftjs/core";

export const TextBlock = ({
  content = "Enter your text here...",
  fontSize = 14,
  color = "#1e293b",
  bgColor = "transparent",
}) => {
  const { connectors } = useNode();
  return (
    <div
      ref={connectors.connect}
      style={{
        fontSize: `${fontSize}px`,
        color,
        backgroundColor: bgColor,
        padding: "8px",
      }}>
      {content}
    </div>
  );
};

TextBlock.craft = {
  props: {
    content: "Enter your text here...",
    fontSize: 14,
    color: "#1e293b",
    bgColor: "transparent",
  },
  related: {
    settings: ({ content, fontSize, color, bgColor, setProp }) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Content</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={3}
            value={content}
            onChange={(e) => setProp({ content: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Font Size</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={fontSize}
            onChange={(e) =>
              setProp({ fontSize: parseInt(e.target.value) || 14 })
            }
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Text Color</label>
          <input
            type="color"
            className="w-full h-8"
            value={color}
            onChange={(e) => setProp({ color: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">BG Color</label>
          <input
            type="color"
            className="w-full h-8"
            value={bgColor}
            onChange={(e) => setProp({ bgColor: e.target.value })}
          />
        </div>
      </div>
    ),
  },
};
