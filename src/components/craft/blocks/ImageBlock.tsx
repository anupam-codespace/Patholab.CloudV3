import React from "react";
import { useNode } from "@craftjs/core";

export const ImageBlock = ({
  src = "https://via.placeholder.com/150",
  alt = "Image",
  width = "100%",
}) => {
  const { connectors } = useNode();
  return (
    <img
      ref={connectors.connect}
      src={src}
      alt={alt}
      style={{ maxWidth: "100%", width }}
    />
  );
};

ImageBlock.craft = {
  props: {
    src: "https://via.placeholder.com/150",
    alt: "Image",
    width: "100%",
  },
  related: {
    settings: ({ src, alt, width, setProp }) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Image URL</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={src}
            onChange={(e) => setProp({ src: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Alt Text</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={alt}
            onChange={(e) => setProp({ alt: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Width</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={width}
            onChange={(e) => setProp({ width: e.target.value })}
          />
        </div>
      </div>
    ),
  },
};
