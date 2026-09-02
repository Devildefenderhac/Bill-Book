import React, { useState, useEffect, useMemo } from "react";
import { X, CheckCircle, AlertCircle, Banknote, Smartphone } from "lucide-react";

const REFUND_MODES = [
  {
    id: "CASH",
    label: "Cash",
    desc: "Give refund in cash at counter",
    icon: Banknote,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.35)",
  },
  {
    id: "UPI",
    label: "UPI / Online",
    desc: "Transfer refund back via UPI",
    icon: Smartphone,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.35)",
  },
];

export default function ReturnModal({ isOpen, onClose, transaction, onReturnBill }) {
  if (!isOpen || !transaction) return null;

  // Return qty state for each item
  const [returnQty, setReturnQty] = useState({});
  const [refundMode, setRefundMode] = useState("CASH");
  const [upiRefundRef, setUpiRefundRef] = useState("");

  // Re-initialize return state whenever a transaction is opened
  useEffect(() => {
    if (transaction?.items) {
      const initial = {};
      (transaction.items || []).forEach((item, idx) => {
        initial[`item_${idx}`] = 0;
      });
      setReturnQty(initial);
      setRefundMode(transaction.paymentMode === "UPI" || transaction.paymentMode === "CARD" ? "UPI" : "CASH");
      setUpiRefundRef("");
    }
  }, [transaction]);

  const handleQtyChange = (key, maxQty, delta) => {
    setReturnQty((prev) => {
      const current = prev[key] || 0;
      const next = current + delta;
      if (next >= 0 && next <= maxQty) {
        return { ...prev, [key]: next };
      }
      return prev;
    });
  };

  // Calculate total refund amount with itemized proportional discount distribution
  const { refundGross, refundDiscountDeduction, refundTotal } = useMemo(() => {
    let gross = 0;
    let totalDiscountDeduction = 0;
    const subtotal = Number(transaction.subtotal || 0);
    const totalDiscount = Number(transaction.discount || 0);

    (transaction.items || []).forEach((item, idx) => {
      const key = `item_${idx}`;
      const rq = returnQty[key] || 0;
      if (rq <= 0) return;

      const billedQty = Number(item.qty || item.quantity || 1);
      const originalPrice = Number(item.price || 0);
      const lineSubtotal = originalPrice * billedQty;

      // Item proportional discount share
      const itemDiscShare =
        item.discountShare !== undefined && item.discountShare !== null
          ? Number(item.discountShare)
          : subtotal > 0 && totalDiscount > 0
          ? (lineSubtotal / subtotal) * totalDiscount
          : 0;

      const unitDiscount = billedQty > 0 ? itemDiscShare / billedQty : 0;
      const netUnitPrice =
        item.netPrice !== undefined && item.netPrice !== null
          ? Number(item.netPrice)
          : Math.max(0, originalPrice - unitDiscount);

      gross += originalPrice * rq;
      totalDiscountDeduction += unitDiscount * rq;
    });

    const netRefund = Math.max(0, gross - totalDiscountDeduction);
    return {
      refundGross: gross,
      refundDiscountDeduction: totalDiscountDeduction,
      refundTotal: netRefund,
    };
  }, [returnQty, transaction]);

  const originalPaymentMode = transaction.paymentMode || "CASH";
  const isUpiOriginal = originalPaymentMode === "UPI" || originalPaymentMode === "CARD";
  const isCashRefund = refundMode === "CASH";
  // Flag if refund mode differs from how customer originally paid
  const refundDiffersFromOriginal = isUpiOriginal && isCashRefund;

  const handleReturn = () => {
    const subtotal = Number(transaction.subtotal || 0);
    const totalDiscount = Number(transaction.discount || 0);

    const itemsToReturn = (transaction.items || [])
      .map((item, idx) => {
        const key = `item_${idx}`;
        const rq = returnQty[key] || 0;
        const billedQty = Number(item.qty || item.quantity || 1);
        const originalPrice = Number(item.price || 0);
        const lineSubtotal = originalPrice * billedQty;

        const itemDiscShare =
          item.discountShare !== undefined && item.discountShare !== null
            ? Number(item.discountShare)
            : subtotal > 0 && totalDiscount > 0
            ? (lineSubtotal / subtotal) * totalDiscount
            : 0;

        const unitDiscount = billedQty > 0 ? itemDiscShare / billedQty : 0;
        const netUnitPrice =
          item.netPrice !== undefined && item.netPrice !== null
            ? Number(item.netPrice)
            : Math.max(0, originalPrice - unitDiscount);

        return {
          ...item,
          itemIndex: idx,
          id: item.id !== undefined && item.id !== null ? item.id : key,
          returnQty: rq,
          returnedQty: rq,
          unitDiscount,
          netUnitPrice,
          itemRefundAmount: rq * netUnitPrice,
        };
      })
      .filter((item) => item.returnQty > 0);

    if (itemsToReturn.length === 0) {
      alert("Please select at least one item to return (Return Qty > 0).");
      return;
    }


    onReturnBill(transaction.billNo, itemsToReturn, refundMode, upiRefundRef, originalPaymentMode, refundTotal);
    onClose();
  };

  const selectedMode = REFUND_MODES.find((m) => m.id === refundMode);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: "680px",
          width: "100%",
          padding: "0",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Header - Sticky */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "800", margin: 0, color: "var(--text-main)" }}>
              Return Items — {transaction.billNo}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Original payment: <strong style={{ color: "var(--accent-blue-light)" }}>{originalPaymentMode}</strong>
              {transaction.discount > 0 && (
                <span style={{ color: "var(--accent-amber)", marginLeft: "8px", fontWeight: "700" }}>
                  (Bill Discount: ₹{Number(transaction.discount).toFixed(2)} distributed to items)
                </span>
              )}
              {transaction.upiRefNo && ` • Ref: ${transaction.upiRefNo}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div
          style={{
            padding: "16px 20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            flex: 1,
          }}
        >
          {/* ── STEP 1: Select items to return ── */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: "800", marginBottom: "8px", color: "var(--text-main)" }}>
              Step 1 — Select Items to Return (Equal Distributed Discount Rate)
            </div>
            <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table className="custom-table" style={{ width: "100%", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  {transaction.discount > 0 && <th>Discount</th>}
                  <th>Net Rate</th>
                  <th style={{ textAlign: "center" }}>Billed</th>
                  <th style={{ textAlign: "center" }}>Return Qty</th>
                  <th style={{ textAlign: "right" }}>Refund</th>
                </tr>
              </thead>
              <tbody>
                {(transaction.items || []).map((item, idx) => {
                  const key = `item_${idx}`;
                  const billedQty = Number(item.qty || item.quantity || 1);
                  const alreadyReturned = Number(item.returnedQty || 0) ||
                    Number((transaction.returnDetails?.returnedItems || []).find((r) =>
                      (r.itemIndex !== undefined && Number(r.itemIndex) === idx) ||
                      (r.id && item.id && String(r.id) === String(item.id))
                    )?.returnedQty || (transaction.returnDetails?.returnedItems || []).find((r) =>
                      (r.itemIndex !== undefined && Number(r.itemIndex) === idx) ||
                      (r.id && item.id && String(r.id) === String(item.id))
                    )?.returnQty || 0);
                  const maxAvailableToReturn = Math.max(0, billedQty - alreadyReturned);
                  const rq = returnQty[key] || 0;

                  const originalPrice = Number(item.price || 0);
                  const lineSubtotal = originalPrice * billedQty;
                  const subtotal = Number(transaction.subtotal || 0);
                  const totalDiscount = Number(transaction.discount || 0);

                  const itemDiscShare =
                    item.discountShare !== undefined && item.discountShare !== null
                      ? Number(item.discountShare)
                      : subtotal > 0 && totalDiscount > 0
                      ? (lineSubtotal / subtotal) * totalDiscount
                      : 0;

                  const unitDiscount = billedQty > 0 ? itemDiscShare / billedQty : 0;
                  const netUnitPrice =
                    item.netPrice !== undefined && item.netPrice !== null
                      ? Number(item.netPrice)
                      : Math.max(0, originalPrice - unitDiscount);

                  const itemNetRefund = rq * netUnitPrice;

                  return (
                    <tr key={key} style={{ opacity: maxAvailableToReturn === 0 ? 0.65 : 1 }}>
                      <td style={{ fontWeight: "600" }}>{item.name}</td>
                      <td>₹{originalPrice.toFixed(2)}</td>
                      {transaction.discount > 0 && (
                        <td style={{ color: "var(--accent-amber)", fontSize: "11px" }}>
                          -₹{unitDiscount.toFixed(2)}/pc
                        </td>
                      )}
                      <td style={{ fontWeight: "700", color: "var(--accent-emerald)" }}>
                        ₹{netUnitPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div>{billedQty}</div>
                        {alreadyReturned > 0 && (
                          <span style={{ fontSize: "10px", color: "var(--accent-amber)", fontWeight: "600", display: "block" }}>
                            ({alreadyReturned} ret)
                          </span>
                        )}
                      </td>
                      <td>
                        {maxAvailableToReturn === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "10px",
                              fontWeight: "700",
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "var(--accent-amber)",
                              border: "1px solid rgba(245, 158, 11, 0.35)",
                              whiteSpace: "nowrap",
                            }}>
                              ✓ Already Returned
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(key, maxAvailableToReturn, -1)}
                              disabled={rq <= 0}
                              style={{
                                width: "28px", height: "28px", borderRadius: "6px",
                                background: rq > 0 ? "rgba(244, 63, 94, 0.2)" : "var(--bg-primary)",
                                border: "1px solid var(--border-color)",
                                cursor: rq > 0 ? "pointer" : "default",
                                color: rq > 0 ? "var(--accent-rose)" : "var(--text-dim)",
                                fontWeight: "bold", fontSize: "16px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={maxAvailableToReturn}
                              value={rq}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const parsed = isNaN(val) ? 0 : Math.min(Math.max(0, val), maxAvailableToReturn);
                                setReturnQty((prev) => ({
                                 ...prev,
                                 [key]: parsed,
                                }));
                              }}
                              style={{
                                width: "48px", textAlign: "center",
                                background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                                borderRadius: "6px", color: rq > 0 ? "var(--accent-rose)" : "var(--text-main)",
                                padding: "4px", fontSize: "13px", fontWeight: "bold",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(key, maxAvailableToReturn, 1)}
                              disabled={rq >= maxAvailableToReturn}
                              style={{
                                width: "28px", height: "28px", borderRadius: "6px",
                                background: rq < maxAvailableToReturn ? "rgba(16, 185, 129, 0.2)" : "var(--bg-primary)",
                                border: "1px solid var(--border-color)",
                                cursor: rq < maxAvailableToReturn ? "pointer" : "default",
                                color: rq < maxAvailableToReturn ? "var(--accent-emerald)" : "var(--text-dim)",
                                fontWeight: "bold", fontSize: "16px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{
                        textAlign: "right", fontWeight: "700",
                        color: itemNetRefund > 0 ? "var(--accent-rose)" : "var(--text-muted)",
                      }}>
                        {itemNetRefund > 0 ? `-₹${itemNetRefund.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Refund total breakdown preview */}
            {refundTotal > 0 && (
              <div style={{
                display: "flex", flexDirection: "column", gap: "4px",
                marginTop: "10px", padding: "10px 14px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "8px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span>Gross Value of Returned Items:</span>
                  <span>₹{refundGross.toFixed(2)}</span>
                </div>
                {refundDiscountDeduction > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--accent-amber)" }}>
                    <span>Proportional Discount Deducted:</span>
                    <span>-₹{refundDiscountDeduction.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(248,113,113,0.3)", paddingTop: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-main)" }}>Total Net Refund Payable:</span>
                  <span style={{ fontSize: "17px", fontWeight: "900", color: "#f87171" }}>
                    ₹{refundTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* ── STEP 2: Select how to give refund ── */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "var(--text-primary)" }}>
              Step 2 — How will staff give refund money to customer?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {REFUND_MODES.map((mode) => {
                const Icon = mode.icon;
                const selected = refundMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setRefundMode(mode.id)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "10px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: selected ? `2px solid ${mode.color}` : "2px solid var(--border-color)",
                      background: selected ? mode.bg : "var(--bg-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.18s",
                    }}
                  >
                    <Icon
                      size={18}
                      style={{
                        color: selected ? mode.color : "var(--text-muted)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <div>
                      <div style={{
                        fontSize: "13px", fontWeight: "700",
                        color: selected ? mode.color : "var(--text-primary)",
                      }}>
                        {mode.label}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                        {mode.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* UPI refund reference input */}
            {refundMode === "UPI" && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  UPI Refund Reference No. (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/REF/123456"
                  value={upiRefundRef}
                  onChange={(e) => setUpiRefundRef(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: "8px",
                    background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                    color: "var(--text-primary)", fontSize: "13px",
                  }}
                />
              </div>
            )}

            {/* Warning banner when refund mode differs from original payment */}
            {refundTotal > 0 && refundDiffersFromOriginal && (
              <div style={{
                marginTop: "10px", padding: "10px 14px",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.30)",
                borderRadius: "8px",
                display: "flex", gap: "8px", alignItems: "flex-start",
              }}>
                <AlertCircle size={15} style={{ color: "#a855f7", flexShrink: 0, marginTop: "1px" }} />
                <div style={{ fontSize: "12px", color: "#c4b5fd" }}>
                  <strong>Note:</strong> Customer originally paid via <strong>{originalPaymentMode}</strong>,
                  but refund will be given in <strong>CASH</strong>.
                  The bill will clearly show this difference. UPI transaction is NOT reversed online.
                </div>
              </div>
            )}
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "4px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: "8px",
                background: "transparent", border: "1px solid var(--border-color)",
                color: "var(--text-muted)", cursor: "pointer", fontSize: "13px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReturn}
              disabled={refundTotal === 0}
              style={{
                padding: "9px 20px", borderRadius: "8px",
                background: refundTotal > 0
                  ? `linear-gradient(135deg, ${selectedMode?.color || "#22c55e"}, ${selectedMode?.color || "#22c55e"}cc)`
                  : "rgba(100,116,139,0.3)",
                color: refundTotal > 0 ? "#fff" : "var(--text-muted)",
                border: "none",
                cursor: refundTotal > 0 ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: "7px",
                fontWeight: "700", fontSize: "13px",
                boxShadow: refundTotal > 0 ? `0 4px 14px ${selectedMode?.color || "#22c55e"}44` : "none",
                transition: "all 0.2s",
              }}
            >
              <CheckCircle size={15} />
              Process Return · Refund via {selectedMode?.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
