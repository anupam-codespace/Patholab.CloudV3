import React from "react";
import { ImageElement as ImageType } from "@/lib/types";

export default function ImageElement(props: ImageType) {
  return (
    <img
      src={props.src}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: props.objectFit || "contain",
        opacity: props.opacity || 1,
        borderRadius: props.borderRadius || 0,
        border: props.borderWidth
          ? `${props.borderWidth}px solid ${props.borderColor || "transparent"}`
          : "none",
      }}
    />
  );
}
