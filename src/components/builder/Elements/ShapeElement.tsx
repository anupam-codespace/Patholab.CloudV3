import React from "react";
import { ShapeElement as ShapeType } from "@/lib/types";

export default function ShapeElement(props: ShapeType) {
  const {
    shapeType,
    fillColor = "#3b82f6",
    strokeColor = "transparent",
    strokeWidth = 0,
    radius = 0,
    width,
    height,
  } = props;

  // ─── Rectangle ──────────────────────────────────────
  if (shapeType === "rectangle") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: fillColor,
          border: `${strokeWidth}px solid ${strokeColor}`,
          borderRadius: `${radius || 0}px`,
        }}
      />
    );
  }

  // ─── Circle ──────────────────────────────────────────
  if (shapeType === "circle") {
    const size = Math.min(width, height);
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: fillColor,
          border: `${strokeWidth}px solid ${strokeColor}`,
          borderRadius: "50%",
          margin: "auto",
        }}
      />
    );
  }

  // ─── Line / Divider ──────────────────────────────────
  if (shapeType === "line" || shapeType === "divider") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: `${strokeWidth || 2}px`,
            backgroundColor: fillColor,
            border: "none",
          }}
        />
      </div>
    );
  }

  // ─── Arrow ───────────────────────────────────────────
  if (shapeType === "arrow") {
    // Arrow using SVG
    const arrowLength = Math.min(width, height * 0.8);
    const headSize = Math.min(20, arrowLength * 0.3);
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id={`arrowhead-${props.id}`}
              markerWidth={headSize}
              markerHeight={headSize}
              refX={headSize * 0.8}
              refY={headSize / 2}
              orient="auto"
            >
              <polygon
                points={`0 0, ${headSize} ${headSize / 2}, 0 ${headSize}`}
                fill={fillColor}
              />
            </marker>
          </defs>
          <line
            x1={0}
            y1={height / 2}
            x2={width - headSize * 0.5}
            y2={height / 2}
            stroke={fillColor}
            strokeWidth={strokeWidth || 2}
            markerEnd={`url(#arrowhead-${props.id})`}
          />
        </svg>
      </div>
    );
  }

  // ─── Fallback ──────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: fillColor,
        border: `${strokeWidth}px solid ${strokeColor}`,
        borderRadius: radius || 0,
      }}
    />
  );
}