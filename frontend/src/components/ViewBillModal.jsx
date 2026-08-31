import React, { useEffect, useRef, useState } from "react";
import { X, Printer, CheckCircle, AlertCircle, Loader } from "lucide-react";
import PrintReceipt from "./PrintReceipt";
import { getThermalPrinterStatus, printToThermalPrinter } from "../utils/api";

/**
 * ViewBillModal — Full-screen modal overlay to preview a bill receipt.
 */
export default function ViewBillModal({ billData, settings, transactions = [], onClose }) {
  if (!billData) return null;

  const receiptRef = useRef(null);

  // Printer state
  const [printerStatus, setPrinterStatus]   = useState(null); // null=loading, {connected,printerName}
  const [printing, setPrinting]             = useState(false);
  const [printResult, setPrintResult]       = useState(null); // { success, message }

  // Check thermal printer status on modal open
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getThermalPrinterStatus();
        if (!cancelled) setPrinterStatus(data || { connected: false, printerName: "" });
      } catch {
        if (!cancelled) setPrinterStatus({ connected: false, printerName: "" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Clear print result after 4 seconds
  useEffect(() => {
    if (printResult) {
      const t = setTimeout(() => setPrintResult(null), 4000);
      return () => clearTimeout(t);
    }
  }, [printResult]);

  /**
   * handlePrint:
   *  1. If thermal printer is connected → call backend /api/thermal-printer/print
   *  2. Else → open browser print dialog (prints only the receipt area)
   */
  const handlePrint = async () => {
    setPrinting(true);
    setPrintResult(null);

    // ── A: Thermal printer is connected → ESC/POS direct print ──
    if (printerStatus?.connected) {
      try {
        const data = await printToThermalPrinter(billData, settings);
        if (data?.success) {
          setPrintResult({ success: true, message: `✓ Printed on ${printerStatus.printerName || "Thermal Printer"}` });
          setPrinting(false);
          return;
        } else {
          let rawErr = data?.error || "Printer offline or port error";
          if (rawErr.includes(":")) {
            const parts = rawErr.split(":");
            rawErr = parts[parts.length - 1].trim();
          }
          setPrintResult({ success: false, message: `Thermal Printer Notice: ${rawErr}` });
        }
      } catch (err) {
        setPrintResult({ success: false, message: `Could not reach thermal printer: ${err.message}` });
      } finally {
        setPrinting(false);
      }

      // Automatic fallback to system print window if thermal printer is offline/unplugged
      setTimeout(() => {
        window.print();
      }, 400);
      return;
    }

    // ── B: Browser print dialog (only receipt area) ──
    setPrinting(false);
    setTimeout(() => {
      window.print();
      setPrintResult({ success: true, message: "Opened print dialog." });
    }, 100);
  };

  const isThermal = printerStatus?.connected;
  const isLoading = printerStatus === null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        gap: "0",
      }}
    >
      {/* Receipt card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          maxWidth: "440px",
          width: "100%",
          maxHeight: "78vh",
          overflow: "auto",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "sticky",
            top: "10px",
            float: "right",
            marginRight: "10px",
            zIndex: 10,
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.08)",
            color: "#333",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.15)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
        >
          <X size={16} />
        </button>

        {/* Receipt area */}
        <div
          ref={receiptRef}
          className="view-bill-receipt-container"
          style={{ padding: "0" }}
        >
          <PrintReceipt
            billData={billData}
            settings={settings}
            transactions={transactions}
          />
        </div>
      </div>

      {/* ── PRINT FOOTER BAR ─────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "440px",
          width: "100%",
          background: "#1e1e2e",
          borderRadius: "0 0 16px 16px",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Printer Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
          {isLoading ? (
            <>
              <Loader size={14} style={{ color: "#94a3b8", animation: "spin 1s linear infinite" }} />
              <span style={{ color: "#94a3b8" }}>Checking printer connection…</span>
            </>
          ) : isThermal ? (
            <>
              <CheckCircle size={14} style={{ color: "#22c55e", flexShrink: 0 }} />
              <span style={{ color: "#22c55e", fontWeight: "600" }}>
                Thermal Printer Connected: {printerStatus.printerName || "Billing Machine"}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ color: "#f59e0b" }}>
                No thermal printer connected — will use browser print
              </span>
            </>
          )}
        </div>

        {/* Print Result Feedback */}
        {printResult && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background: printResult.success ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: printResult.success ? "#22c55e" : "#f87171",
              border: `1px solid ${printResult.success ? "#22c55e44" : "#f8717144"}`,
            }}
          >
            {printResult.message}
          </div>
        )}

        {/* Print Button */}
        <button
          id="view-bill-print-btn"
          onClick={handlePrint}
          disabled={printing || isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            fontWeight: "700",
            fontSize: "14px",
            cursor: printing || isLoading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            background: printing || isLoading
              ? "rgba(100,116,139,0.4)"
              : isThermal
              ? "linear-gradient(135deg, #059669, #10b981)"
              : "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "#fff",
            boxShadow: printing || isLoading
              ? "none"
              : isThermal
              ? "0 4px 16px rgba(16,185,129,0.4)"
              : "0 4px 16px rgba(59,130,246,0.4)",
            opacity: printing || isLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!printing && !isLoading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = isThermal
                ? "0 6px 20px rgba(16,185,129,0.5)"
                : "0 6px 20px rgba(59,130,246,0.5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = isThermal
              ? "0 4px 16px rgba(16,185,129,0.4)"
              : "0 4px 16px rgba(59,130,246,0.4)";
          }}
        >
          {printing ? (
            <>
              <Loader size={16} style={{ animation: "spin 0.8s linear infinite" }} />
              Sending to Printer…
            </>
          ) : (
            <>
              <Printer size={16} />
              {isThermal ? "Print on Thermal Printer" : "Print (Browser)"}
            </>
          )}
        </button>

        {!isThermal && !isLoading && (
          <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center" }}>
            To print directly on billing machine, connect the thermal printer from{" "}
            <strong style={{ color: "#94a3b8" }}>Settings → Printer Setup</strong>
          </div>
        )}
      </div>

      {/* CSS overrides for receipt visibility inside modal + spinner animation */}
      <style>{`
        .view-bill-receipt-container .printable-receipt-area {
          display: block !important;
          position: relative !important;
          width: 100% !important;
          background: #fff !important;
          color: #000 !important;
          padding: 10px !important;
        }
        .view-bill-receipt-container .printable-receipt-area * {
          visibility: visible !important;
          color: #000 !important;
        }
        .view-bill-receipt-container .receipt-thermal {
          margin: 0 auto !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
