import React from "react";
import { useNode } from "@craftjs/core";

export const Footer = ({
  text = "*** End of Report ***\nThis is an electronically generated report.",
}) => {
  const { connectors } = useNode();
  return (
    <div
      ref={connectors.connect}
      className="border-t border-border pt-4 mt-8 text-center text-muted-foreground text-xs whitespace-pre-wrap">
      {text}
    </div>
  );
};

Footer.craft = {
  props: {
    text: "*** End of Report ***\nThis is an electronically generated report.",
  },
  related: {
    settings: ({ text, setProp }) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Disclaimer Text</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={3}
            value={text}
            onChange={(e) => setProp({ text: e.target.value })}
          />
        </div>
      </div>
    ),
  },
};
