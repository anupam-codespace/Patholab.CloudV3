import React from "react";
import Barcode from "react-barcode";
import { BarcodeElement as BarcodeType } from "@/lib/types";

export default function BarcodeElement(props: BarcodeType) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Barcode
        value={props.value}
        height={props.height || 40}
        width={1.5}
        fontSize={10}
        displayValue={true}
        margin={0}
        background="transparent"
        lineColor="#000000"
        scale={props.scale || 1}
      />
    </div>
  );
}
