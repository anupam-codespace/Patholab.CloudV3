import React from "react";
import { PatientDataElement as PatientDataType } from "@/lib/types";

export default function PatientDataElement(props: PatientDataType) {
  const {
    patientName,
    age,
    gender,
    patientId,
    sampleId,
    referredBy,
    registrationDate,
    showName,
    showAge,
    showGender,
    showPatientId,
    showSampleId,
    showReferredBy,
    showRegistrationDate,
    labelColor = "#64748b",
    valueColor = "#0f172a",
    borderColor = "#cbd5e1",
    bgColor = "#f8fafc",
    padding = 12,
    fontSize = 12,
    labelFontWeight = "normal",
    valueFontWeight = "bold",
    gridColumns = 2,
  } = props;

  const fieldData = [
    { key: "name", label: "Patient Name", value: patientName, show: showName },
    {
      key: "age",
      label: "Age / Gender",
      value: `${age} / ${gender}`,
      show: showAge || showGender,
    },
    {
      key: "patientId",
      label: "Patient ID (UHID)",
      value: patientId,
      show: showPatientId,
    },
    {
      key: "sampleId",
      label: "Sample ID (SID)",
      value: sampleId,
      show: showSampleId,
    },
    {
      key: "referredBy",
      label: "Referred By",
      value: referredBy,
      show: showReferredBy,
    },
    {
      key: "registrationDate",
      label: "Registration Date",
      value: registrationDate,
      show: showRegistrationDate,
    },
  ];

  const visibleFields = fieldData.filter((f) => f.show);

  if (visibleFields.length === 0) {
    return (
      <div
        style={{
          padding: 8,
          backgroundColor: bgColor,
          border: `1px dashed ${borderColor}`,
          borderRadius: 4,
          color: "#94a3b8",
          fontSize: 12,
          textAlign: "center",
        }}>
        No fields visible
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: padding,
        backgroundColor: bgColor,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflow: "auto",
      }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: `8px 16px`,
          fontSize: fontSize,
        }}>
        {visibleFields.map((field) => (
          <div key={field.key}>
            <div
              style={{
                color: labelColor,
                fontWeight: labelFontWeight,
                fontSize: fontSize * 0.85,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                opacity: 0.8,
              }}>
              {field.label}
            </div>
            <div
              style={{
                color: valueColor,
                fontWeight: valueFontWeight,
                fontSize: fontSize * 1.1,
                marginTop: 2,
              }}>
              {field.value || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
