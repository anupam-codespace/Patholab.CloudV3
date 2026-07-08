import React from "react";
import { SpacerElement as SpacerType } from "@/lib/types";

export default function SpacerElement(props: SpacerType) {
  return (
    <div
      style={{
        height: `${props.height || 20}px`,
        backgroundColor: props.bgColor || "transparent",
        width: "100%",
      }}
    />
  );
}
