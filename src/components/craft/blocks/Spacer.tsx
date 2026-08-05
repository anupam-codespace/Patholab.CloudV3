import React from "react";
import { useNode } from "@craftjs/core";

export const Spacer = ({ height = 20, bgColor = "transparent" }) => {
  const { connectors } = useNode();
  return (
    <div
      ref={connectors.connect}
      style={{ height: `${height}px`, backgroundColor: bgColor }}
    />
  );
};

Spacer.craft = {
  props: {
    height: 20,
    bgColor: "transparent",
  },
  related: {
    settings: ({ height, bgColor, setProp }) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Height (px)</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={height}
            onChange={(e) =>
              setProp({ height: parseInt(e.target.value) || 20 })
            }
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
