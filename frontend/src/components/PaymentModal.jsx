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
  Clock,
  Phone,
  AlertTriangle,
  User,
  Eye,
} from "lucide-react";
import ViewBillModal from "./ViewBillModal";

export default function PaymentModal({
  isOpen,
  onClose,
  cartSummary,
  settings,
  transactions = [],
  currentUser = null,
  onCompleteSale,
}) {
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [cashTendered, setCashTendered] = useState("");
  const [upiRefNo, setUpiRefNo] = useState("");
  const [cardRefNo, setCardRefNo] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const { grandTotal, billNo } = cartSummary;

  useEffect(() => {
    if (isOpen) {
      setCashTendered(Math.ceil(grandTotal).toString());
      setUpiRefNo(`UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}`);
      setCardRefNo(`CARD-${Math.floor(1000 + Math.random() * 9000)}`);
      setCustomerName(cartSummary?.customerName || "");
      setCustomerPhone(cartSummary?.customerPhone || "");
      setAdvanceAmount("");
    }
  }, [isOpen, grandTotal, cartSummary]);

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

  const cleanPhone = String(customerPhone).replace(/\D/g, "");
  const isPhoneValid = cleanPhone.length === 10;
  const isPendingMode = paymentMode === "PENDING";
  const isFormValid = !isPendingMode || isPhoneValid;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirm = (shouldPrint = true) => {
    if (isPendingMode && !isPhoneValid) {
      alert("⚠️ Phone Number is COMPULSORY for Pending / Udhar Payment! Please enter at least 10 digits.");
      return;
    }

    const advance = parseFloat(advanceAmount) || 0;
    const actualPending = isPendingMode
      ? Math.max(0, grandTotal - advance)
      : 0;

    const cleanP = (cleanPhone || customerPhone || "").replace(/\D/g, "");
    const cleanN = customerName.trim().toLowerCase();

    const previousUdhar = (transactions || [])
      .filter((t) => t.status !== "CANCELLED")
      .filter((t) => {
        const tPhone = String(t.customerPhone || "").replace(/\D/g, "");
        const tName = String(t.customerName || "").trim().toLowerCase();
        const matchPhone = cleanP && tPhone && tPhone === cleanP;
        const matchName = cleanN && tName && tName === cleanN && cleanN !== "walk-in customer";
        return matchPhone || matchName;
      })
      .reduce((sum, t) => sum + (t.pendingAmount !== undefined ? t.pendingAmount : (t.paymentStatus === "PENDING" ? (t.grandTotal || 0) : 0)), 0);

    onCompleteSale({
      paymentMode,
      paymentStatus: isPendingMode
        ? (actualPending <= 0 ? "PAID" : "PENDING")
        : "PAID",
      pendingAmount: actualPending,
      advanceAmount: isPendingMode ? advance : 0,
      previousUdhar,
      customerName: customerName.trim() || "Walk-in Customer",
      customerPhone: cleanPhone || customerPhone,
      cashTendered: paymentMode === "CASH" ? cashVal : grandTotal,
      changeReturned: paymentMode === "CASH" ? changeReturned : 0,
      upiRefNo: paymentMode === "UPI" ? upiRefNo : "",
      cardRefNo: paymentMode === "CARD" ? cardRefNo : "",
      shouldPrint,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "540px" }}>
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
            background: isPendingMode ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)",
            border: `1px solid ${isPendingMode ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.3)"}`,
            borderRadius: "var(--radius-md)",
            padding: "14px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {isPendingMode ? "Pending Balance Amount (Udhar)" : "Total Amount Payable"}
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              color: isPendingMode ? "var(--accent-amber)" : "var(--accent-emerald)",
              marginTop: "2px",
            }}
          >
            ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div className="payment-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <button
            className={`pm-btn ${paymentMode === "UPI" ? "active" : ""}`}
            onClick={() => setPaymentMode("UPI")}
          >
            <QrCode size={20} />
            <span style={{ fontSize: "12px" }}>UPI</span>
          </button>

          <button
            className={`pm-btn ${paymentMode === "CASH" ? "active" : ""}`}
            onClick={() => setPaymentMode("CASH")}
          >
            <Banknote size={20} />
            <span style={{ fontSize: "12px" }}>Cash</span>
          </button>

          <button
            className={`pm-btn ${paymentMode === "CARD" ? "active" : ""}`}
            onClick={() => setPaymentMode("CARD")}
          >
            <CreditCard size={20} />
            <span style={{ fontSize: "12px" }}>Card</span>
          </button>

          <button
            className={`pm-btn ${paymentMode === "PENDING" ? "active" : ""}`}
            onClick={() => setPaymentMode("PENDING")}
            style={{
              borderColor: paymentMode === "PENDING" ? "var(--accent-amber)" : "",
              background: paymentMode === "PENDING" ? "rgba(245, 158, 11, 0.2)" : ""
            }}
          >
            <Clock size={20} color={paymentMode === "PENDING" ? "var(--accent-amber)" : undefined} />
            <span style={{ fontSize: "11px", fontWeight: "700", color: paymentMode === "PENDING" ? "var(--accent-amber)" : undefined }}>
              Pending / Udhar
            </span>
          </button>
        </div>

        {paymentMode === "PENDING" && (
          <div
            style={{
              background: "rgba(30, 41, 59, 0.7)",
              borderRadius: "12px",
              padding: "14px",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-amber)", fontWeight: "700", fontSize: "13px" }}>
              <AlertTriangle size={18} />
              <span>Mandatory Customer Details for Credit/Udhar</span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Phone size={14} color="var(--accent-amber)" />
                <span>Customer 10-Digit Mobile Number (COMPULSORY) *</span>
              </label>
              <input
                type="tel"
                className="form-control"
                placeholder="Enter 10-digit Mobile Number (e.g. 9876543210)"
                value={customerPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 10) {
                    setCustomerPhone(val);
                    if (val.length === 10) {
                      const prevTx = (transactions || []).find((t) => {
                        const tPhone = (t.customerPhone || "").replace(/\D/g, "");
                        return (
                          tPhone === val &&
                          t.customerName &&
                          t.customerName !== "Walk-in Customer" &&
                          t.customerName !== "Customer" &&
                          !t.customerName.toLowerCase().includes("pending udhar")
                        );
                      });
                      if (prevTx) {
                        setCustomerName(prevTx.customerName);
                      }
                    }
                  }
                }}
                style={{
                  borderColor: isPhoneValid ? "var(--accent-emerald)" : "var(--accent-rose)",
                  fontSize: "15px",
                  fontWeight: "bold",
                  fontFamily: "var(--font-mono)",
                }}
              />
              {!isPhoneValid && (
                <div style={{ fontSize: "11px", color: "var(--accent-rose)", marginTop: "4px" }}>
                  🛑 Phone number is compulsory! Must be exactly 10 digits.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} />
                <span>Customer Name</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Customer Full Name (e.g. Ramesh Kumar)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Advance / Partial Payment Section */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px dashed rgba(245, 158, 11, 0.5)",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--accent-amber)", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
                <Banknote size={16} color="var(--accent-amber)" />
                <span>Partial / Advance Payment Received Upfront (Optional)</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "11px", color: "var(--text-muted)" }}>Amount Paid Now (₹) — leave blank if nothing paid</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={`0.00 (max ₹${grandTotal.toFixed(2)})`}
                    value={advanceAmount}
                    min="0"
                    max={grandTotal}
                    onChange={(e) => {
                      const val = Math.min(parseFloat(e.target.value) || 0, grandTotal);
                      setAdvanceAmount(e.target.value === "" ? "" : val.toString());
                    }}
                    style={{ fontSize: "16px", fontWeight: "bold", color: "var(--accent-amber)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setAdvanceAmount("")}
                    style={{ padding: "6px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Quick amounts */}
              <div style={{ display: "flex", gap: "6px" }}>
                {[100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdvanceAmount(Math.min(amt, grandTotal).toString())}
                    style={{ flex: 1, padding: "5px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "var(--accent-amber)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                  >
                    +₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdvanceAmount((grandTotal / 2).toFixed(2))}
                  style={{ flex: 1, padding: "5px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "var(--accent-amber)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                >
                  50%
                </button>
              </div>

              {/* Live balance preview */}
              {(() => {
                const advance = parseFloat(advanceAmount) || 0;
                const remaining = Math.max(0, grandTotal - advance);
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>Paying Now</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "900", fontSize: "16px", color: "var(--accent-emerald)" }}>₹{advance.toFixed(2)}</span>
                    </div>
                    <div
                      style={{
                        background: remaining > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                        border: `1px solid ${remaining > 0 ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                        borderRadius: "8px",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>{remaining > 0 ? "Remaining Udhar" : "Fully Paid"}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "900", fontSize: "16px", color: remaining > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>₹{remaining.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {paymentMode === "UPI" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "12px", width: "100%", padding: "4px 0" }}>
            <div style={{ fontWeight: "800", fontSize: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <QrCode size={17} color="var(--accent-emerald-light)" />
              <span>Scan QR Code to Pay</span>
            </div>

            {/* Centered Professional QR Stand Card */}
            <div
              style={{
                background: "#ffffff",
                padding: "14px",
                borderRadius: "16px",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
                maxWidth: "270px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-emerald-dark) 100%)",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ fontSize: "10.5px", color: "rgba(255, 255, 255, 0.9)", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  AMOUNT TO PAY
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#ffffff",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              <div style={{ background: "#ffffff", padding: "4px", borderRadius: "8px", display: "flex", justifyContent: "center" }}>
                {settings?.customQrImage ? (
                  <img
                    src={settings.customQrImage}
                    alt="Store Payment QR"
                    style={{ width: "185px", height: "185px", objectFit: "contain", borderRadius: "6px", display: "block" }}
                  />
                ) : (
                  <QRCodeSVG value={upiUrl} size={185} level="H" />
                )}
              </div>

              <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center", fontWeight: "600" }}>
                Bill Ref: <strong style={{ color: "#0f172a" }}>{billNo}</strong>
              </div>
            </div>

            {/* UPI Info & Supported Apps */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
              <div style={{ fontSize: "12.5px", color: "var(--text-main)", fontWeight: "700" }}>
                Supported: <strong style={{ color: "var(--accent-blue-light)" }}>GPay / PhonePe / Paytm / BHIM</strong>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                UPI ID: <strong style={{ color: "var(--text-main)" }}>{upiId}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyUPI}
              style={{
                fontSize: "11.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: copiedUpi ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                border: `1px solid ${copiedUpi ? "var(--accent-emerald)" : "var(--border-color)"}`,
                borderRadius: "var(--radius-pill)",
                color: copiedUpi ? "var(--accent-emerald-light)" : "var(--text-secondary)",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {copiedUpi ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copiedUpi ? "UPI Link Copied! ✓" : "Copy Payment String"}</span>
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
                    padding: "6px",
                    borderRadius: "6px",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.4)",
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

        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap", width: "100%" }}>
          <button
            onClick={() => handleConfirm(true)}
            disabled={!isFormValid}
            className="checkout-btn"
            style={{
              flex: "1 1 180px",
              opacity: isFormValid ? 1 : 0.4,
              cursor: isFormValid ? "pointer" : "not-allowed",
              background: isPendingMode ? "linear-gradient(135deg, var(--accent-amber), #d97706)" : undefined,
              minHeight: "48px",
              fontSize: "14px",
              fontWeight: "800",
            }}
          >
            <Printer size={18} />
            <span>{isPendingMode ? "Save & Print Udhar Bill" : "Pay & Print Bill"}</span>
          </button>

          <button
            onClick={() => handleConfirm(false)}
            disabled={!isFormValid}
            style={{
              flex: "1 1 120px",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              fontWeight: "700",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              minHeight: "48px",
              opacity: isFormValid ? 1 : 0.4,
              cursor: isFormValid ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
            }}
          >
            <CheckCircle2 size={16} color="var(--accent-emerald-light)" />
            <span>Save Only</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            style={{
              flex: "1 1 100px",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              color: "var(--accent-blue-light)",
              fontWeight: "700",
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              minHeight: "48px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Eye size={16} />
            <span>View Bill</span>
          </button>
        </div>

        {showPreviewModal && (
          <ViewBillModal
            billData={{
              billNo: cartSummary?.billNo || "DRAFT-BILL",
              timestamp: new Date().toISOString(),
              customerName: customerName.trim() || "Walk-in Customer",
              customerPhone: cleanPhone || customerPhone,
              items: (cartSummary?.cart || []).map((item) => ({
                name: item.name,
                qty: item.qty,
                price: item.price,
                total: item.price * item.qty,
              })),
              subtotal: cartSummary?.subtotal || 0,
              discount: cartSummary?.discount || 0,
              grandTotal: cartSummary?.grandTotal || 0,
              paymentMode: paymentMode,
              paymentStatus: isPendingMode ? "PENDING" : "PAID",
              pendingAmount: isPendingMode ? Math.max(0, (cartSummary?.grandTotal || 0) - (parseFloat(advanceAmount) || 0)) : 0,
              advanceAmount: isPendingMode ? (parseFloat(advanceAmount) || 0) : 0,
              cashTendered: paymentMode === "CASH" ? cashVal : grandTotal,
              changeReturned: paymentMode === "CASH" ? changeReturned : 0,
              previousUdhar: (transactions || [])
                .filter((t) => t.status !== "CANCELLED")
                .filter((t) => {
                  const cleanP = (cleanPhone || customerPhone || "").replace(/\D/g, "");
                  const cleanN = customerName.trim().toLowerCase();
                  const tPhone = String(t.customerPhone || "").replace(/\D/g, "");
                  const tName = String(t.customerName || "").trim().toLowerCase();
                  const matchPhone = cleanP && tPhone && tPhone === cleanP;
                  const matchName = cleanN && tName && tName === cleanN && cleanN !== "walk-in customer";
                  return matchPhone || matchName;
                })
                .reduce((sum, t) => sum + (t.pendingAmount !== undefined ? t.pendingAmount : (t.paymentStatus === "PENDING" ? (t.grandTotal || 0) : 0)), 0),
              workerName: currentUser?.name || settings?.workerName || "Store Owner",
              status: "COMPLETED",
            }}
            settings={settings}
            transactions={transactions}
            onClose={() => setShowPreviewModal(false)}
          />
        )}
      </div>
    </div>
  );
}
