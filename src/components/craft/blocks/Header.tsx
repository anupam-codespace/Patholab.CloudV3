import React from "react";
import { useNode } from "@craftjs/core";

interface HeaderProps {
  labName?: string;
  tagline?: string;
  themeColor?: string;
}

export const Header = ({
  labName = "GLOBIZ PATHOLAB",
  tagline = "Advanced Diagnostics Center",
  themeColor = "#1e3a8a",
}: HeaderProps) => {
  const { connectors } = useNode();
  return (
    <div
      ref={connectors.connect}
      className="flex items-center border-b-3 pb-3 mb-4"
      style={{ borderBottomColor: themeColor }}>
      <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center mr-4 text-muted-foreground/70 text-xs">
        LOGO
      </div>
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ color: themeColor }}>
          {labName}
        </h1>
        <p className="text-sm text-muted-foreground">{tagline}</p>
      </div>
    </div>
  );
};

Header.craft = {
  props: {
    labName: "GLOBIZ PATHOLAB",
    tagline: "Advanced Diagnostics Center",
    themeColor: "#1e3a8a",
  },
  related: {
    settings: ({ labName, tagline, themeColor, setProp }: any) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Lab Name</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={labName}
            onChange={(e) => setProp({ labName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Tagline</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={tagline}
            onChange={(e) => setProp({ tagline: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Theme Color</label>
          <input
            type="color"
            className="w-full h-8"
            value={themeColor}
            onChange={(e) => setProp({ themeColor: e.target.value })}
          />
        </div>
      </div>
    ),
  },
};
