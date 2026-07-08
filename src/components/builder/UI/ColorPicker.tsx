import React from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-1">
      <HexColorPicker color={color} onChange={onChange} />
      <input
        type="text"
        className="w-full border rounded p-1 text-xs"
        value={color}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
