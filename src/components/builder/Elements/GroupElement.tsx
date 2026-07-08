import React from "react";

export const GroupElement = ({ name = "Group" }: { name?: string }) => {
  return (
    <div
      className="w-full h-full relative"
      style={{
        background: "rgba(59, 130, 246, 0.04)",
        border: "1.5px dashed rgba(59, 130, 246, 0.3)",
        borderRadius: "6px",
        padding: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40px",
        minWidth: "40px",
      }}>
      <span
        className="absolute -top-3 left-2 text-[9px] font-medium text-blue-500 bg-white px-1.5 rounded-sm shadow-sm"
        style={{ lineHeight: "1.2" }}>
        {name}
      </span>
      {/* Children are rendered as siblings by Canvas, so this acts as a container */}
    </div>
  );
};
