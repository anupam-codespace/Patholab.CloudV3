import React from "react";
import { TableElement as TableType } from "@/lib/types";

export default function TableElement(props: TableType) {
  const {
    rows,
    cols,
    header,
    data,
    headerBgColor,
    headerTextColor,
    rowBgColor,
    rowAlternateColor,
    borderColor,
  } = props;

  // Fill missing data with placeholders
  const rowData =
    data && data.length > 0
      ? data
      : Array.from({ length: rows || 3 }, (_, i) =>
          Array.from(
            { length: cols || 4 },
            (_, j) => `Row ${i + 1} Col ${j + 1}`,
          ),
        );

  return (
    <table className="w-full h-full border-collapse text-sm">
      <thead>
        <tr
          style={{
            backgroundColor: headerBgColor || "#f1f5f9",
            color: headerTextColor || "#0f172a",
          }}>
          {Array.from({ length: cols || 4 }, (_, i) => (
            <th
              key={i}
              className="border p-1 text-left"
              style={{ borderColor: borderColor || "#cbd5e1" }}>
              {header && header[i] ? header[i] : `Header ${i + 1}`}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowData.map((row, i) => (
          <tr
            key={i}
            style={{
              backgroundColor:
                i % 2 === 0
                  ? rowBgColor || "#ffffff"
                  : rowAlternateColor || "#f8fafc",
            }}>
            {row.map((cell, j) => (
              <td
                key={j}
                className="border p-1"
                style={{ borderColor: borderColor || "#cbd5e1" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
