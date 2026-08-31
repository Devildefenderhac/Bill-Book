import React, { useState, useMemo } from "react";
import { X, CheckCircle, AlertCircle, Banknote, Smartphone, CreditCard, Tag } from "lucide-react";

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
  const [returnQty, setReturnQty] = useState(
    transaction.items.reduce((acc, item) => {
      acc[item.id] = 0;
      return acc;
    }, {})
  );

  // Refund mode: how the staff gives back the money
  const [refundMode, setRefundMode] = useState("CASH");
  const [upiRefundRef, setUpiRefundRef] = useState("");

  const handleQtyChange = (id, maxQty, delta) => {
    setReturnQty((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next >= 0 && next <= maxQty) return { ...prev, [id]: next };
      return prev;
    });
  };

  // Calculate total refund amount
  const refundTotal = useMemo(() => {
    let sub = 0;
    transaction.items.forEach((item) => {
      const qty = returnQty[item.id] || 0;
      if (qty > 0) sub += (item.price || 0) * qty;
    });
    // Apply proportional discount
    let disc = 0;
    if (transaction.discount > 0 && transaction.subtotal > 0) {
      disc = sub * (transaction.discount / transaction.subtotal);
    }
    return Math.max(0, sub - disc);
  }, [returnQty, transaction]);

  const originalPaymentMode = transaction.paymentMode || "CASH";
  const isUpiOriginal = originalPaymentMode === "UPI" || originalPaymentMode === "CARD";
  const isCashRefund = refundMode === "CASH";
  // Flag if refund mode differs from how customer originally paid
  const refundDiffersFromOriginal = isUpiOriginal && isCashRefund;

  const handleReturn = () => {
    const itemsToReturn = transaction.items
      .filter((item) => returnQty[item.id] > 0)
      .map((item) => ({ ...item, returnQty: returnQty[item.id] }));

    if (itemsToReturn.length === 0) {
      alert("Please select at least one item to return.");
      return;
    }

    onReturnBill(transaction.billNo, itemsToReturn, refundMode, upiRefundRef, originalPaymentMode);
    onClose();
  };

  const selectedMode = REFUND_MODES.find((m) => m.id === refundMode);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: "540px", padding: "0", overflow: "hidden" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-secondary)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
              Return Items — {transaction.billNo}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Original payment: <strong>{originalPaymentMode}</strong>
              {transaction.upiRefNo && ` (Ref: ${transaction.upiRefNo})`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* ── STEP 1: Select items to return ── */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "10px", color: "var(--text-primary)" }}>
              Step 1 — Select Items to Return
            </div>
            <table className="custom-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                  <th style={{ textAlign: "center" }}>Billed</th>
                  <th style={{ textAlign: "center" }}>Return Qty</th>
                  <th style={{ textAlign: "right" }}>Refund</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item) => {
                  const rq = returnQty[item.id] || 0;
                  const itemRefund = rq * (item.price || 0);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: "600" }}>{item.name}</td>
                      <td>₹{item.price}</td>
                      <td style={{ textAlign: "center" }}>{item.qty}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => handleQtyChange(item.id, item.qty, -1)}
                            style={{
                              width: "26px", height: "26px", borderRadius: "6px",
                              background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                              cursor: "pointer", fontWeight: "bold", fontSize: "16px",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={item.qty}
                            value={rq}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setReturnQty((prev) => ({
                                ...prev,
                                [item.id]: isNaN(val) ? 0 : Math.min(Math.max(0, val), item.qty),
                              }));
                            }}
                            style={{
                              width: "48px", textAlign: "center",
                              background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                              borderRadius: "6px", color: rq > 0 ? "#f87171" : "var(--text-primary)",
                              padding: "4px", fontSize: "13px", fontWeight: "bold",
                            }}
                          />
                          <button
                            onClick={() => handleQtyChange(item.id, item.qty, 1)}
                            style={{
                              width: "26px", height: "26px", borderRadius: "6px",
                              background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                              cursor: "pointer", fontWeight: "bold", fontSize: "16px",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{
                        textAlign: "right", fontWeight: "700",
                        color: itemRefund > 0 ? "#f87171" : "var(--text-muted)",
                      }}>
                        {itemRefund > 0 ? `-₹${itemRefund.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Refund total preview */}
            {refundTotal > 0 && (
              <div style={{
                display: "flex", justifyContent: "flex-end", alignItems: "center",
                gap: "8px", marginTop: "10px",
                padding: "10px 14px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: "8px",
              }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Total Refund Amount:</span>
                <span style={{ fontSize: "17px", fontWeight: "900", color: "#f87171" }}>
                  ₹{refundTotal.toFixed(2)}
                </span>
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
