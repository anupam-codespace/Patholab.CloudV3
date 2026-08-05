"use client";
import React from "react";
import { useNode } from "@craftjs/core";
import { Text } from "@craftjs/core"; // Craft's built-in text editor

export const HeaderComponent = ({ title }: { title: string }) => {
  const { connectors: { connect, drag } } = useNode();
  return (
    <div ref={(ref: any) => connect(drag(ref))} className="p-6 border-b-2 border-blue-900 mb-4">
      <h1 className="text-3xl font-bold uppercase text-blue-900">{title}</h1>
    </div>
  );
};

export const ResultsTable = ({ rows }: { rows: any[] }) => {
  const { connectors: { connect, drag } } = useNode();
  return (
    <div ref={(ref: any) => connect(drag(ref))} className="p-4 border rounded shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b"><th>Parameter</th><th>Result</th></tr>
        </thead>
        <tbody>
           {/* In builder, show placeholder. On print, map real data here */}
           <tr><td>Hemoglobin</td><td>14.5</td></tr>
        </tbody>
      </table>
    </div>
  );
};