import React, { useRef } from "react";
import { Calendar } from "lucide-react";

export default function CustomDateInput({ value, onChange, min, style }) {
  const dateRef = useRef(null);

  // Parse as local date to prevent timezone shift from YYYY-MM-DD
  let displayValue = "";
  if (value) {
    const parts = value.split("-");
    if (parts.length === 3) {
      displayValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        ...style,
        cursor: "pointer",
      }}
      onClick={() => {
        if (dateRef.current && dateRef.current.showPicker) {
          try {
            dateRef.current.showPicker();
          } catch (e) {
            dateRef.current.focus();
          }
        }
      }}
    >
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder="DD/MM/YYYY"
        style={{
          width: "90px",
          background: "transparent",
          border: "none",
          color: "inherit",
          fontSize: "inherit",
          outline: "none",
          cursor: "pointer",
        }}
      />
      <Calendar size={14} style={{ color: "var(--text-dim)", marginLeft: "4px" }} />

      <input
        type="date"
        ref={dateRef}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
