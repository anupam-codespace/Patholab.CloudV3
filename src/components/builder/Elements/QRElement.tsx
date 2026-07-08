import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { QRElement as QRType } from "@/lib/types";

export default function QRElement(props: QRType) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, props.data, {
      margin: 2,
      width: props.width,
      color: {
        dark: props.fgColor || "#000000",
        light: props.bgColor || "#ffffff",
      },
    });
  }, [props.data, props.fgColor, props.bgColor, props.width]);

  return (
    <div className="flex flex-col items-center w-full h-full">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      {props.showPageNumber && (
        <span className="text-[8px] font-bold text-slate-500 mt-1">
          Page 1 of 1
        </span>
      )}
    </div>
  );
}
