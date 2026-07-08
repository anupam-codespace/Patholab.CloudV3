import React from "react";
import { SignatureElement as SignatureType } from "@/lib/types";

export default function SignatureElement(props: SignatureType) {
  return (
    <div className="flex flex-col items-center w-full h-full justify-center text-center">
      <div className="h-12 w-full flex items-end justify-center mb-1">
        {props.imageUrl ? (
          <img
            src={props.imageUrl}
            className="h-full object-contain"
            alt="Signature"
          />
        ) : (
          <div className="w-[80%] h-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
            Signature
          </div>
        )}
      </div>
      <div
        className="w-full border-t pt-1"
        style={{ borderColor: props.lineColor || "#cbd5e1" }}>
        <p className="font-bold text-sm m-0">{props.name || "Dr. John Doe"}</p>
        {props.qualifications && (
          <p className="text-[10px] m-0 text-slate-600">
            {props.qualifications}
          </p>
        )}
        <p className="text-[11px] mt-0.5 font-semibold uppercase text-slate-700">
          {props.designation}
        </p>
      </div>
    </div>
  );
}
