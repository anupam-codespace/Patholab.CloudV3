import React from "react";
import { useNode } from "@craftjs/core";

interface PatientInfoProps {
  labelColor?: string;
  valueColor?: string;
  borderColor?: string;
  bgColor?: string;
}

export const PatientInfo = ({ 
  labelColor = "#64748b", 
  valueColor = "#0f172a", 
  borderColor = "#cbd5e1", 
  bgColor = "#f8fafc" 
}: PatientInfoProps) => {
  const { connectors } = useNode();

  return (
    <div 
      ref={connectors.connect} 
      className="border rounded-lg p-4 mb-4" 
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-xs font-semibold uppercase" style={{ color: labelColor }}>Patient Name</span>
          <div className="font-bold text-sm" style={{ color: valueColor }}>{"{{patient.name}}"}</div>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase" style={{ color: labelColor }}>Age / Gender</span>
          <div className="font-bold text-sm" style={{ color: valueColor }}>{"{{patient.age}} / {{patient.gender}}"}</div>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase" style={{ color: labelColor }}>Patient ID</span>
          <div className="font-bold text-sm" style={{ color: valueColor }}>{"{{patient.uhid}}"}</div>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase" style={{ color: labelColor }}>Sample ID</span>
          <div className="font-bold text-sm" style={{ color: valueColor }}>{"{{sample.id}}"}</div>
        </div>
      </div>
    </div>
  );
};

PatientInfo.craft = {
  props: {
    labelColor: "#64748b",
    valueColor: "#0f172a",
    borderColor: "#cbd5e1",
    bgColor: "#f8fafc",
  },
  related: {
    settings: ({ labelColor, valueColor, borderColor, bgColor, setProp }: any) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Label Color</label>
          <input 
            type="color" 
            className="w-full h-8" 
            value={labelColor} 
            onChange={(e) => setProp({ labelColor: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Value Color</label>
          <input 
            type="color" 
            className="w-full h-8" 
            value={valueColor} 
            onChange={(e) => setProp({ valueColor: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Border Color</label>
          <input 
            type="color" 
            className="w-full h-8" 
            value={borderColor} 
            onChange={(e) => setProp({ borderColor: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Background Color</label>
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