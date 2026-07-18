import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Banknote,
  CreditCard,
  CheckCircle2,
  X,
  Printer,
  Copy,
  Check,
} from "lucide-react";

export default function PaymentModal({
  isOpen,
  onClose,
  cartSummary,
  settings,
  onCompleteSale,
}) {
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [cashTendered, setCashTendered] = useState("");
  const [upiRefNo, setUpiRefNo] = useState("");
  const [cardRefNo, setCardRefNo] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const { grandTotal, billNo } = cartSummary;

  useEffect(() => {
    if (isOpen) {
      setCashTendered(Math.ceil(grandTotal).toString());
      setUpiRefNo(`UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}`);
      setCardRefNo(`CARD-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const upiId = settings?.upiId || "royalfashion@upi";
  const upiName = settings?.upiName || "Royal Fashion Mall";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent(
    upiName
  )}&am=${grandTotal.toFixed(2)}&tr=${billNo}&cu=INR`;

  const cashVal = parseFloat(cashTendered) || 0;
  const changeReturned = Math.max(0, cashVal - grandTotal);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirm = (shouldPrint = true) => {
    onCompleteSale({
      paymentMode,
      cashTendered: paymentMode === "CASH" ? cashVal : grandTotal,
      changeReturned: paymentMode === "CASH" ? changeReturned : 0,
      upiRefNo: paymentMode === "UPI" ? upiRefNo : "",
      cardRefNo: paymentMode === "CARD" ? cardRefNo : "",
      shouldPrint,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Complete Payment</h2>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Bill No: <strong style={{ color: "var(--accent-blue)" }}>{billNo}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Amount Payable
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              color: "var(--accent-emerald)",
              marginTop: "4px",
            }}
          >
            ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div className="payment-grid">
          <button
            className={`pm-btn ${paymentMode === "UPI" ? "active" : ""}`}
            onClick={() => setPaymentMode("UPI")}
          >
            <QrCode size={24} />
            <span>UPI Payment</span>
          </button>

          <button
            className={`pm-btn ${paymentMode === "CASH" ? "active" : ""}`}
            onClick={() => setPaymentMode("CASH")}
          >
            <Banknote size={24} />
            <span>Cash</span>
          </button>

          <button
            className={`pm-btn ${paymentMode === "CARD" ? "active" : ""}`}
            onClick={() => setPaymentMode("CARD")}
          >
            <CreditCard size={24} />
            <span>Card / POS</span>
          </button>
        </div>

        {paymentMode === "UPI" && (
          <div className="qr-card">
            <div style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b" }}>
              Scan QR Code to Pay
            </div>

            {/* QR image + price overlay wrapper */}
            <div style={{ position: "relative", display: "inline-block" }}>
              <div
                style={{
                  background: "#fff",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "2px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              >
                {/* Amount badge at the top of the QR card */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    borderRadius: "10px",
                    padding: "8px 20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: "600", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Amount to Pay
                  </span>
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: "900",
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* QR image */}
                {settings?.customQrImage ? (
                  <img
                    src={settings.customQrImage}
                    alt="Store Payment QR"
                    style={{ width: "200px", height: "200px", objectFit: "contain", borderRadius: "6px" }}
                  />
                ) : (
                  <QRCodeSVG value={upiUrl} size={180} level="H" />
                )}

                {/* Bill reference below QR */}
                <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center" }}>
                  Bill Ref: <strong style={{ color: "#334155" }}>{billNo}</strong>
                </div>
              </div>
            </div>

            <div className="qr-info">
              <div>Supported: <strong>GPay / PhonePe / Paytm / BHIM</strong></div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                UPI ID: {upiId}
              </div>
            </div>

            <button
              onClick={handleCopyUPI}
              style={{
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "#f1f5f9",
                borderRadius: "6px",
                color: "#475569",
              }}
            >
              {copiedUpi ? <Check size={12} color="green" /> : <Copy size={12} />}
              <span>{copiedUpi ? "UPI URL Copied" : "Copy Payment String"}</span>
            </button>
          </div>
        )}

        {paymentMode === "CASH" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label">Cash Tendered by Customer (₹)</label>
              <input
                type="number"
                className="form-control"
                style={{ fontSize: "18px", fontWeight: "bold" }}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {[
                Math.ceil(grandTotal),
                Math.ceil(grandTotal / 100) * 100,
                500,
                2000,
              ].map((amt, idx) => (
                <button
                  key={idx}
                  onClick={() => setCashTendered(amt.toString())}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Change to Return:
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  fontFamily: "var(--font-mono)",
                  color: changeReturned >= 0 ? "var(--accent-amber)" : "var(--accent-rose)",
                }}
              >
                ₹{changeReturned.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {paymentMode === "CARD" && (
          <div className="form-group">
            <label className="form-label">POS Terminal Ref / Approval Code</label>
            <input
              type="text"
              className="form-control"
              value={cardRefNo}
              onChange={(e) => setCardRefNo(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => handleConfirm(true)}
            className="checkout-btn"
            style={{ flex: 2 }}
          >
            <Printer size={18} />
            <span>Pay & Print Bill</span>
          </button>

          <button
            onClick={() => handleConfirm(false)}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              fontWeight: "600",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <CheckCircle2 size={16} />
            <span>Save Bill Only</span>
          </button>
        </div>
      </div>
    </div>
  );
}
