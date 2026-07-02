import React from "react";
import { useNode } from "@craftjs/core";

export const ResultsTable = ({
  department = "BIOCHEMISTRY",
  headerBg = "#f1f5f9",
  headerText = "#0f172a",
  rowBg = "#ffffff",
  rowAlt = "#f8fafc",
  borderColor = "#cbd5e1",
}) => {
  const { connectors } = useNode();
  return (
    <div ref={connectors.connect} className="mb-6">
      <div
        className="text-center text-xs font-bold uppercase tracking-wider py-1 border-y"
        style={{ backgroundColor: headerBg, color: headerText, borderColor }}>
        {department}
      </div>
      <table
        className="w-full border-collapse"
        style={{ border: `1px solid ${borderColor}` }}>
        <thead>
          <tr style={{ backgroundColor: headerBg, color: headerText }}>
            <th className="border-b-2 p-2 text-left" style={{ borderColor }}>
              Test Parameter
            </th>
            <th className="border-b-2 p-2 text-left" style={{ borderColor }}>
              Result
            </th>
            <th className="border-b-2 p-2 text-left" style={{ borderColor }}>
              Unit
            </th>
            <th className="border-b-2 p-2 text-left" style={{ borderColor }}>
              Bio. Ref. Range
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            style={{
              backgroundColor: rowBg,
              borderBottom: `1px solid ${borderColor}`,
            }}>
            <td className="p-2">Serum Creatinine</td>
            <td className="p-2 font-bold text-red-600">1.8</td>
            <td className="p-2 text-slate-600">mg/dL</td>
            <td className="p-2 text-slate-600">0.7 - 1.3</td>
          </tr>
          <tr
            style={{
              backgroundColor: rowAlt,
              borderBottom: `1px solid ${borderColor}`,
            }}>
            <td className="p-2">Urea</td>
            <td className="p-2 font-bold">25.0</td>
            <td className="p-2 text-slate-600">mg/dL</td>
            <td className="p-2 text-slate-600">10.0 - 50.0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

ResultsTable.craft = {
  props: {
    department: "BIOCHEMISTRY",
    headerBg: "#f1f5f9",
    headerText: "#0f172a",
    rowBg: "#ffffff",
    rowAlt: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  related: {
    settings: ({
      department,
      headerBg,
      headerText,
      rowBg,
      rowAlt,
      borderColor,
      setProp,
    }) => (
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold">Department</label>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={department}
            onChange={(e) => setProp({ department: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Header BG</label>
          <input
            type="color"
            className="w-full h-8"
            value={headerBg}
            onChange={(e) => setProp({ headerBg: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Header Text</label>
          <input
            type="color"
            className="w-full h-8"
            value={headerText}
            onChange={(e) => setProp({ headerText: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Row BG</label>
          <input
            type="color"
            className="w-full h-8"
            value={rowBg}
            onChange={(e) => setProp({ rowBg: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">Alternate Row</label>
          <input
            type="color"
            className="w-full h-8"
            value={rowAlt}
            onChange={(e) => setProp({ rowAlt: e.target.value })}
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
      </div>
    ),
  },
};
