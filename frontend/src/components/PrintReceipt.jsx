import React from "react";

// ─────────────────────────────────────────────────────────────
//  PrintReceipt.jsx  — Unified 20-Situation Receipt Engine
//  Supports: Thermal 58mm / 80mm and A4 paper formats
// ─────────────────────────────────────────────────────────────

export default function PrintReceipt({ billData, settings, transactions = [] }) {
  if (!billData) return null;

  const paperType = settings?.receiptPaper || "80mm";
  const isA4 = paperType === "A4";

  // ── Detect receipt situation ──────────────────────────────
  const isCancelled     = billData.status === "CANCELLED";
  const isSettlement    = billData.type === "SETTLEMENT";
  const isFullReturn    = billData.status === "RETURNED" ||
    billData.type === "RETURN" ||
    ((billData.items || []).length > 0 && (billData.items || []).every((i) => i.qty === 0));
  const isPartialReturn = !isFullReturn && (
    billData.status === "PARTIALLY_RETURNED" ||
    (billData.items || []).some((i) => (i.returnedQty || 0) > 0)
  );
  const isReturn        = isFullReturn || isPartialReturn || billData.type === "RETURN";
  const isExchange      = billData.type === "EXCHANGE" ||
    ((billData.items || []).some((i) => i.qty < 0) && (billData.items || []).some((i) => i.qty > 0));
  const isAdvanceOrder  = billData.type === "ADVANCE_ORDER" || billData.type === "BOOKING";
  const isDelivery      = billData.type === "DELIVERY" || billData.isDelivery;
  const isStoreCreditRefund = billData.type === "STORE_CREDIT_REFUND";
  const isUdharAdjustment   = billData.type === "UDHAR_ADJUSTMENT";
  const isBulkSale          = billData.isBulkSale || billData.type === "BULK";

  const isPendingUdhar  = !isSettlement && (
    billData.paymentMode === "PENDING" ||
    billData.paymentStatus === "PENDING" ||
    billData.paymentStatus === "PARTIALLY_PAID"
  );

  // ── Payment / financial fields ────────────────────────────
  const grandTotal     = parseFloat(billData.grandTotal) || 0;
  const subtotal       = parseFloat(billData.subtotal) || 0;
  const discount       = parseFloat(billData.discount) || 0;
  const advancePaid    = parseFloat(billData.advanceAmount) || 0;
  const pendingDue     = billData.pendingAmount !== undefined
    ? parseFloat(billData.pendingAmount)
    : (isPendingUdhar ? grandTotal : 0);

  // Cash sale fields
  const isCashMode     = billData.paymentMode === "CASH" || billData.paymentMode === "COD";
  const cashTendered   = billData.cashTendered !== undefined
    ? parseFloat(billData.cashTendered) || 0
    : (isCashMode ? grandTotal : 0);
  const changeReturned = parseFloat(billData.changeReturned) || 0;

  // Store credit / overpayment kept
  const storeCreditBalance = parseFloat(billData.storeCreditBalance) || 0;
  const storeCreditKept    = parseFloat(billData.storeCreditKept) || 0;

  // UPI / Digital payment
  const upiRef  = billData.upiRef || billData.upiRefNo || billData.referenceNo || "";
  const payMode = billData.paymentMode || "CASH";

  // Split payment
  const splitPayments = billData.splitPayments || []; // [{mode, amount, ref}]

  // GST fields
  const taxableAmount = parseFloat(billData.taxableAmount) || subtotal;
  const cgst          = parseFloat(billData.cgst) || 0;
  const sgst          = parseFloat(billData.sgst) || 0;
  const igst          = parseFloat(billData.igst) || 0;
  const hasGST        = cgst > 0 || sgst > 0 || igst > 0;

  // Delivery
  const deliveryCharge = parseFloat(billData.deliveryCharge) || 0;
  const deliveryAddress = billData.deliveryAddress || "";

  // Returns / refunds
  const calculatedRefund = (billData.items || []).reduce(
    (s, i) => s + ((i.returnedQty || 0) * (i.price || 0)), 0
  );
  const refundAmount = parseFloat(billData.refundAmount) ||
    calculatedRefund ||
    (isFullReturn ? Math.abs(subtotal) : 0);
  const refundMode   = billData.refundMode || "CASH";
  const upiRefundRef = billData.upiRefundRef || "";

  // NEW SITUATION A: UPI Return with Cash Refund
  // Original payment was UPI but refund is being given back in CASH
  const originalPaymentMode = billData.originalPaymentMode || "";
  const originalUpiRef      = billData.originalUpiRef || billData.originalRefNo || "";
  const isUpiReturnCashRefund = (isReturn || isExchange) &&
    (originalPaymentMode === "UPI" || originalPaymentMode === "CARD") &&
    (refundMode === "CASH" || refundMode === "COD");

  // NEW SITUATION B: Staff Accountability for Udhar Giving & Collection
  // Who gave the Udhar (created the credit sale)
  const udharGivenBy = billData.udharGivenBy || billData.workerName || "";
  // Who collected the payment / settlement amount
  const collectedBy  = billData.collectedBy || billData.settledBy || billData.workerName || "";

  // Settlement
  const settleAmount         = parseFloat(billData.settleAmount) || 0;
  const settleMode           = billData.settlePaymentMode || billData.paymentMode || "CASH";
  const settleUpiRef         = billData.settleUpiRef || billData.upiRef || "";
  const remainingAfterSettle = parseFloat(billData.remainingAfterSettle) || 0;

  // Previous Udhar calculation
  const prevUdhar = billData.previousUdhar !== undefined
    ? (parseFloat(billData.previousUdhar) || 0)
    : (transactions && Array.isArray(transactions)
        ? transactions
            .filter((t) => t.id !== billData.id && t.status !== "CANCELLED")
            .filter((t) => {
              const bPhone = String(billData.customerPhone || "").replace(/\D/g, "");
              const bName  = String(billData.customerName  || "").trim().toLowerCase();
              const tPhone = String(t.customerPhone || "").replace(/\D/g, "");
              const tName  = String(t.customerName  || "").trim().toLowerCase();
              return (bPhone && tPhone && tPhone === bPhone) ||
                     (bName && tName && tName === bName && bName !== "walk-in customer");
            })
            .reduce((sum, t) => sum + (t.pendingAmount !== undefined
              ? t.pendingAmount
              : (t.paymentStatus === "PENDING" ? (t.grandTotal || 0) : 0)), 0)
        : 0);

  const totalOutstandingUdhar = prevUdhar + (isPendingUdhar ? pendingDue : 0);

  // Advance / booking
  const advanceDeposit  = parseFloat(billData.advanceDeposit)  || advancePaid;
  const balanceOnDelivery = parseFloat(billData.balanceOnDelivery) ||
    (grandTotal - advanceDeposit);
  const deliveryDate    = billData.deliveryDate || billData.expectedDelivery || "";

  // Store credit voucher
  const voucherCode    = billData.voucherCode || "";
  const voucherValue   = parseFloat(billData.voucherValue) || refundAmount;
  const voucherExpiry  = billData.voucherExpiry || "";

  // Udhar return adjustment
  const revisedUdharBalance = parseFloat(billData.revisedUdharBalance) || 0;
  const cashRefundPaid      = parseFloat(billData.cashRefundPaid) || 0;

  // ── Receipt Title ─────────────────────────────────────────
  const receiptTitle = isCancelled
    ? "CANCELLED BILL — VOID"
    : isSettlement
    ? "UDHAR PAYMENT RECEIPT"
    : isStoreCreditRefund
    ? "STORE CREDIT REFUND VOUCHER"
    : isUdharAdjustment
    ? "UDHAR ADJUSTMENT RETURN"
    : isExchange
    ? "PRODUCT EXCHANGE RECEIPT"
    : isFullReturn
    ? "FULL RETURN RECEIPT"
    : isPartialReturn
    ? "PARTIAL RETURN RECEIPT"
    : isReturn
    ? "RETURN RECEIPT"
    : isAdvanceOrder
    ? "ADVANCE ORDER / BOOKING SLIP"
    : isDelivery
    ? "HOME DELIVERY ORDER"
    : hasGST
    ? "TAX INVOICE"
    : isBulkSale
    ? "BULK / WHOLESALE BILL"
    : isPendingUdhar
    ? "UDHAR / CREDIT BILL"
    : "PAYMENT RECEIPT";

  // ── Helper: format rupee (uses 'Rs.' for 100% thermal printer ASCII compatibility) ──
  const rs = (v) => `Rs.${(parseFloat(v) || 0).toFixed(2)}`;

  // ── THERMAL RECEIPT (58mm / 80mm) ─────────────────────────
  const ThermalReceipt = () => {
    const formattedDate = new Date(billData.timestamp || billData.settleTimestamp || Date.now())
      .toLocaleString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).replace(/\//g, "/");

    const lineStyle = { display: "flex", justifyContent: "space-between", margin: "2px 0" };
    const boldLine  = { ...lineStyle, fontWeight: "bold" };
    const divider   = <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />;
    const bigTotal  = { ...boldLine, fontSize: "13px", margin: "3px 0" };

    return (
      <div
        className="receipt-thermal"
        style={{
          width: paperType === "58mm" ? "56mm" : "78mm",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "11px",
          color: "#000",
          background: "#fff",
          lineHeight: "1.4",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: (settings?.storeName || "ROYAL FASHION MALL").length > 18 ? "12px" : "14px",
            fontWeight: "bold",
            textTransform: "uppercase",
            lineHeight: "1.2",
            marginBottom: "2px"
          }}>
            {settings?.storeName || "ROYAL FASHION MALL"}
          </div>
          {settings?.address && <div style={{ fontSize: "10px", lineHeight: "1.2" }}>{settings.address}</div>}
          {settings?.phone && <div style={{ fontSize: "10px", lineHeight: "1.2", marginTop: "1px" }}>Ph: {settings.phone}</div>}
          {hasGST && settings?.gstin && (
            <div style={{ fontSize: "10px", lineHeight: "1.2", marginTop: "1px" }}>GSTIN: {settings.gstin}</div>
          )}
        </div>

        {divider}

        {/* RECEIPT TYPE BANNER */}
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", margin: "3px 0" }}>
          *** {receiptTitle} ***
        </div>

        {divider}

        {/* BILL METADATA */}
        <div style={{ fontSize: "10px" }}>
          <div>Bill No: <strong>{billData.billNo}</strong></div>
          <div>Date: {formattedDate}</div>
          <div>Customer: <strong>{billData.customerName || "Walk-in Customer"}</strong>{billData.customerPhone ? ` (${billData.customerPhone})` : ""}</div>
          {isSettlement ? (
            <>
              <div>Udhar Collected By: <strong>{collectedBy || settings?.workerName || "Store Owner"}</strong></div>
            </>
          ) : isPendingUdhar ? (
            <div>Udhar Authorized By: <strong>{udharGivenBy || billData.workerName || settings?.workerName || "Store Owner"}</strong></div>
          ) : (
            <div>Billed By: <strong>{billData.workerName || billData.settledBy || settings?.workerName || "Store Owner"}</strong></div>
          )}
          {isSettlement && billData.originalBillNo && (
            <div>Original Bill: <strong>{billData.originalBillNo}</strong></div>
          )}
          {isAdvanceOrder && deliveryDate && (
            <div>Expected Delivery: <strong>{deliveryDate}</strong></div>
          )}
          {isDelivery && deliveryAddress && (
            <div style={{ fontSize: "10px" }}>Addr: {deliveryAddress}</div>
          )}
        </div>

        {divider}

        {/* ITEMS TABLE (not for settlement-only receipts) */}
        {!isSettlement && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ fontWeight: "bold", borderBottom: "1px dashed #000" }}>
                  <td style={{ textAlign: "left", width: "45%", paddingBottom: "3px" }}>ITEM</td>
                  <td style={{ textAlign: "center", width: "30%", paddingBottom: "3px" }}>QTY x RATE</td>
                  <td style={{ textAlign: "right", width: "25%", paddingBottom: "3px" }}>AMT</td>
                </tr>
              </thead>
              <tbody>
                {(billData.items || []).map((item, idx) => (
                  <tr key={idx} style={{ verticalAlign: "top" }}>
                    <td style={{ textAlign: "left", fontWeight: "600", padding: "2px 0", wordBreak: "break-word" }}>
                      {item.qty < 0 ? "↩ " : ""}{item.name}
                      {item.size && <span style={{ fontSize: "9px", display: "block" }}>[{item.size}]</span>}
                      {item.isGift && <span style={{ fontSize: "9px", display: "block", color: "#059669" }}>[FREE GIFT]</span>}
                      {(item.returnedQty || 0) > 0 && (
                        <span style={{ fontSize: "9px", display: "block", color: "#e11d48" }}>
                          (Ret: {item.returnedQty})
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", padding: "2px 0" }}>
                      {Math.abs(item.qty)} x Rs.{Math.abs(item.price)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold", padding: "2px 0" }}>
                      {item.qty < 0 ? "-" : ""}Rs.{Math.abs(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {divider}
          </>
        )}

        {/* TOTALS */}
        {!isSettlement && (
          <>
            <div style={lineStyle}><span>Subtotal:</span><span>{rs(subtotal)}</span></div>
            {discount > 0 && (
              <div style={lineStyle}><span>Discount:</span><span>-{rs(discount)}</span></div>
            )}
            {deliveryCharge > 0 && (
              <div style={lineStyle}><span>Delivery Fee:</span><span>+{rs(deliveryCharge)}</span></div>
            )}
            {hasGST && (
              <>
                <div style={lineStyle}><span>Taxable Amt:</span><span>{rs(taxableAmount)}</span></div>
                {cgst > 0 && <div style={lineStyle}><span>CGST @ 2.5%:</span><span>{rs(cgst)}</span></div>}
                {sgst > 0 && <div style={lineStyle}><span>SGST @ 2.5%:</span><span>{rs(sgst)}</span></div>}
                {igst > 0 && <div style={lineStyle}><span>IGST:</span><span>{rs(igst)}</span></div>}
              </>
            )}
            {isPartialReturn && (
              <div style={{ ...lineStyle, color: "#e11d48", fontWeight: "bold" }}>
                <span>Refund Amount:</span><span>-{rs(refundAmount)}</span>
              </div>
            )}
            {isFullReturn && (
              <div style={{ ...lineStyle, color: "#e11d48", fontWeight: "bold" }}>
                <span>Total Refund:</span><span>-{rs(refundAmount)}</span>
              </div>
            )}
            {divider}
            <div style={bigTotal}>
              <span>GRAND TOTAL:</span>
              <span>{rs(isFullReturn ? refundAmount : grandTotal)}</span>
            </div>
            {divider}
          </>
        )}

        {/* PAYMENT METHOD */}
        {!isSettlement && (
          <div style={{ fontSize: "11px", margin: "3px 0" }}>
            Payment: <strong>
              {splitPayments.length > 0 ? "SPLIT PAYMENT" : payMode}
              {isPendingUdhar && " (UDHAR/PENDING)"}
            </strong>
          </div>
        )}

        {/* SITUATION 1: Cash — Tendered & Change */}
        {isCashMode && !isPendingUdhar && !isSettlement && (cashTendered > 0 || changeReturned > 0) && (
          <>
            <div style={lineStyle}><span>Cash Tendered:</span><span>{rs(cashTendered)}</span></div>
            <div style={boldLine}><span>Change Returned:</span><span>{rs(changeReturned)}</span></div>
          </>
        )}

        {/* SITUATION 2 / 11 / 15 / 17: UPI Ref No */}
        {(payMode === "UPI" || payMode === "CARD" || payMode === "NEFT" || payMode === "BANK TRANSFER") && upiRef && (
          <div style={lineStyle}><span>Ref No:</span><span style={{ fontWeight: "bold" }}>{upiRef}</span></div>
        )}

        {/* RETURN REFUND DETAILS (For all return transactions) */}
        {isReturn && (
          <>
            {divider}
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px", color: "#e11d48" }}>
              *** REFUND PAYMENT DETAILS ***
            </div>
            {originalPaymentMode && originalPaymentMode !== refundMode && (
              <div style={lineStyle}>
                <span>Original Payment:</span>
                <span style={{ fontWeight: "bold" }}>{originalPaymentMode}{originalUpiRef ? ` (${originalUpiRef})` : ""}</span>
              </div>
            )}
            <div style={{ ...boldLine, color: refundMode === "UPI" ? "#2563eb" : "#059669" }}>
              <span>Refund Paid Via:</span>
              <span>{refundMode === "UPI" ? "UPI / ONLINE" : "CASH"}</span>
            </div>
            {refundMode === "UPI" && upiRefundRef && (
              <div style={lineStyle}>
                <span>UPI Refund Ref:</span>
                <span style={{ fontWeight: "bold" }}>{upiRefundRef}</span>
              </div>
            )}
            <div style={boldLine}>
              <span>Refund Amount:</span>
              <span>{rs(refundAmount)}</span>
            </div>
            {isUpiReturnCashRefund && (
              <div style={{ fontSize: "9px", textAlign: "center", color: "#555", marginTop: "2px" }}>
                Cash refund given at counter. UPI not reversed.
              </div>
            )}
          </>
        )}

        {/* SITUATION 7 / 16: Split Payment Breakdown */}
        {splitPayments.length > 0 && (
          <>
            {divider}
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px" }}>PAYMENT BREAKDOWN (SPLIT)</div>
            {splitPayments.map((sp, i) => (
              <div key={i} style={lineStyle}>
                <span>• {sp.mode}:</span>
                <span>{rs(sp.amount)}{sp.ref ? ` (${sp.ref})` : ""}</span>
              </div>
            ))}
          </>
        )}

        {/* SITUATION 3: Udhar / Credit Bill */}
        {isPendingUdhar && (
          <>
            {advancePaid > 0 && (
              <div style={lineStyle}><span>Advance Paid:</span><span>{rs(advancePaid)}</span></div>
            )}
            <div style={lineStyle}><span>Current Bill Udhar:</span><span>{rs(pendingDue)}</span></div>
          </>
        )}

        {/* SITUATION 3 / 10: Udhar Account Summary */}
        {(isPendingUdhar || prevUdhar > 0) && !isSettlement && (
          <>
            {divider}
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px" }}>
              UDHAR ACCOUNT SUMMARY
            </div>
            {prevUdhar > 0 && (
              <div style={lineStyle}><span>Previous Udhar:</span><span>{rs(prevUdhar)}</span></div>
            )}
            {isPendingUdhar && (
              <div style={lineStyle}><span>Current Bill Udhar:</span><span>{rs(pendingDue)}</span></div>
            )}
            <div style={boldLine}><span>TOTAL UDHAR DUE:</span><span>{rs(totalOutstandingUdhar)}</span></div>
            {billData.settledHistory?.length > 0 && (
              <>
                <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "3px" }}>Payment History:</div>
                {billData.settledHistory.map((e, i) => (
                  <div key={i} style={{ ...lineStyle, fontSize: "9px" }}>
                    <span>{new Date(e.timestamp).toLocaleDateString("en-GB")} {e.paymentMode}</span>
                    <span>{rs(e.amount)}</span>
                  </div>
                ))}
              </>
            )}
            <div style={{ textAlign: "center", fontSize: "9px", marginTop: "2px" }}>
              Kindly pay the due at your earliest!
            </div>
          </>
        )}

        {/* SITUATION 4 / 9: Settlement Receipt */}
        {isSettlement && (
          <>
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px" }}>
              UDHAR SETTLEMENT DETAILS
            </div>
            {divider}
            {billData.originalBillNo && (
              <div style={lineStyle}><span>Orig Bill No:</span><span>{billData.originalBillNo}</span></div>
            )}
            <div style={lineStyle}><span>Total Bill Amt:</span><span>{rs(billData.originalGrandTotal || grandTotal)}</span></div>
            {(billData.previouslyPaid || 0) > 0 && (
              <div style={lineStyle}><span>Previously Paid:</span><span>{rs(billData.previouslyPaid)}</span></div>
            )}
            {divider}
            <div style={bigTotal}><span>AMOUNT RECEIVED:</span><span>{rs(settleAmount)}</span></div>
            <div style={lineStyle}>
              <span>Payment Mode:</span>
              <span><strong>{settleMode}</strong>{settleUpiRef ? ` (${settleUpiRef})` : ""}</span>
            </div>
            {/* SITUATION B: Staff Accountability on settlement */}
            {udharGivenBy && (
              <div style={{ ...lineStyle, fontSize: "10px", color: "#666" }}>
                <span>Udhar Given By:</span>
                <span style={{ fontWeight: "bold" }}>{udharGivenBy}</span>
              </div>
            )}
            <div style={{ ...lineStyle, fontSize: "10px" }}>
              <span>Payment Collected By:</span>
              <span style={{ fontWeight: "bold", color: "#059669" }}>{collectedBy || "Admin"}</span>
            </div>
            {divider}
            {remainingAfterSettle > 0.01 ? (
              <div style={boldLine}><span>REMAINING DUE:</span><span>{rs(remainingAfterSettle)}</span></div>
            ) : (
              <div style={{ textAlign: "center", fontWeight: "bold", color: "#059669" }}>
                ✓ ACCOUNT FULLY CLEARED
              </div>
            )}
          </>
        )}

        {/* SITUATION 13: Store Credit / Overpayment Kept */}
        {storeCreditKept > 0 && (
          <>
            {divider}
            <div style={lineStyle}><span>Cash Tendered:</span><span>{rs(cashTendered)}</span></div>
            <div style={lineStyle}><span>Store Credit Kept:</span><span>{rs(storeCreditKept)}</span></div>
            <div style={lineStyle}><span>Change Returned:</span><span>{rs(changeReturned)}</span></div>
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px" }}>
              ★ STORE CREDIT: {rs(storeCreditBalance)}
            </div>
          </>
        )}

        {/* SITUATION 18: Advance Order / Booking */}
        {isAdvanceOrder && (
          <>
            {divider}
            <div style={lineStyle}><span>Estimated Total:</span><span>{rs(grandTotal)}</span></div>
            <div style={boldLine}><span>Advance Deposit:</span><span>{rs(advanceDeposit)}</span></div>
            <div style={lineStyle}><span>Balance at Delivery:</span><span>{rs(balanceOnDelivery)}</span></div>
          </>
        )}

        {/* SITUATION 19: Store Credit Voucher */}
        {isStoreCreditRefund && voucherCode && (
          <>
            {divider}
            <div style={{ fontWeight: "bold", textAlign: "center", fontSize: "10px" }}>
              STORE CREDIT VOUCHER
            </div>
            <div style={lineStyle}><span>Voucher Code:</span><span style={{ fontWeight: "bold" }}>{voucherCode}</span></div>
            <div style={lineStyle}><span>Voucher Value:</span><span>{rs(voucherValue)}</span></div>
            {voucherExpiry && <div style={lineStyle}><span>Valid Until:</span><span>{voucherExpiry}</span></div>}
          </>
        )}

        {/* SITUATION 14: Udhar Adjustment via Return */}
        {isUdharAdjustment && (
          <>
            {divider}
            <div style={lineStyle}><span>Return Value:</span><span>-{rs(refundAmount)}</span></div>
            <div style={lineStyle}><span>Applied to Udhar:</span><span>-{rs(refundAmount)}</span></div>
            <div style={lineStyle}><span>Cash Refund Paid:</span><span>{rs(cashRefundPaid)}</span></div>
            <div style={boldLine}><span>REVISED UDHAR DUE:</span><span>{rs(revisedUdharBalance)}</span></div>
          </>
        )}

        {/* SITUATION 6: Cancelled status note */}
        {isCancelled && (
          <>
            {divider}
            <div style={{ fontWeight: "bold", textAlign: "center", color: "#dc2626" }}>
              STATUS: CANCELLED / VOIDED
            </div>
            <div style={{ textAlign: "center", fontSize: "10px" }}>
              Inventory restored to stock.
            </div>
          </>
        )}

        {divider}

        {/* FOOTER */}
        <div style={{ textAlign: "center", fontSize: "10px", marginTop: "6px", fontWeight: "500" }}>
          *** THANK YOU! VISIT AGAIN ***
        </div>
      </div>
    );
  };

  // ── A4 RECEIPT ────────────────────────────────────────────
  const A4Receipt = () => (
    <div style={{
      padding: "30px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxWidth: "820px",
      margin: "0 auto",
      color: "#000",
      fontSize: "13px",
    }}>

      {/* ── A4 HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #000", paddingBottom: "16px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "24px", fontWeight: "900", letterSpacing: "0.5px" }}>
            {settings?.storeName || "ROYAL FASHION MALL"}
          </div>
          {settings?.address && (
            <div style={{ fontSize: "12px", color: "#555" }}>{settings.address}{settings?.city ? `, ${settings.city}` : ""}</div>
          )}
          {settings?.phone && (
            <div style={{ fontSize: "12px", color: "#555" }}>Phone: {settings.phone}</div>
          )}
          {settings?.gstin && hasGST && (
            <div style={{ fontSize: "12px", color: "#555" }}>GSTIN: {settings.gstin}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: "20px", fontWeight: "bold",
            color: isCancelled ? "#dc2626" : isReturn || isExchange ? "#e11d48" :
              isSettlement ? "#059669" : isPendingUdhar ? "#b45309" : hasGST ? "#1e40af" : "#333",
          }}>
            {receiptTitle}
          </div>
          <div style={{ fontWeight: "bold", marginTop: "4px" }}>Bill No: {billData.billNo}</div>
          <div style={{ fontSize: "12px", color: "#555" }}>
            Date: {new Date(billData.timestamp || billData.settleTimestamp || Date.now()).toLocaleString("en-GB")}
          </div>
        </div>
      </div>

      {/* ── CANCELLED WATERMARK ── */}
      {isCancelled && (
        <div style={{
          border: "3px dashed #dc2626", background: "#fef2f2", color: "#dc2626",
          fontWeight: "900", textAlign: "center", padding: "12px", fontSize: "16px",
          margin: "10px 0 16px 0", borderRadius: "8px",
        }}>
          ⚠️ CANCELLED BILL — VOID / INVALID RECEIPT ⚠️
        </div>
      )}

      {/* ── CUSTOMER & PAYMENT INFO ── */}
      <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 16px 0" }}>
        <div>
          <div><strong>Customer:</strong> {billData.customerName || "Walk-in Customer"}</div>
          {billData.customerPhone && <div><strong>Phone:</strong> {billData.customerPhone}</div>}
          {billData.customerGstin && hasGST && <div><strong>Cust. GSTIN:</strong> {billData.customerGstin}</div>}
          {/* SITUATION B: Staff Accountability — show who gave Udhar vs who collected money */}
          {isSettlement ? (
            <>
              {udharGivenBy && <div><strong>Udhar Given By:</strong> {udharGivenBy}</div>}
              <div style={{ color: "#059669", fontWeight: "bold" }}><strong>Payment Collected By:</strong> {collectedBy || settings?.workerName || "Store Owner"}</div>
            </>
          ) : isPendingUdhar ? (
            <div><strong>Udhar Authorized By:</strong> <span style={{ color: "#b45309", fontWeight: "bold" }}>{udharGivenBy || billData.workerName || settings?.workerName || "Store Owner"}</span></div>
          ) : (
            <div><strong>Billed By:</strong> {billData.workerName || billData.settledBy || settings?.workerName || "Store Owner"}</div>
          )}
          {isAdvanceOrder && deliveryDate && <div><strong>Expected Delivery:</strong> {deliveryDate}</div>}
          {isDelivery && deliveryAddress && <div><strong>Delivery Address:</strong> {deliveryAddress}</div>}
          {isSettlement && billData.originalBillNo && <div><strong>Original Bill No:</strong> {billData.originalBillNo}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div>
            <strong>Payment Method:</strong>{" "}
            {splitPayments.length > 0 ? "SPLIT PAYMENT" : payMode}
          </div>
          {isPendingUdhar && (
            <div style={{ color: "#b45309", fontWeight: "bold" }}>Status: PENDING / UDHAR</div>
          )}
          {(isReturn || isExchange) && (
            <div style={{ color: "#e11d48", fontWeight: "bold" }}>
              Status: {isExchange ? "EXCHANGE" : isFullReturn ? "FULL RETURN" : "PARTIAL RETURN"}
            </div>
          )}
          {isSettlement && (
            <div style={{ color: "#059669", fontWeight: "bold" }}>Status: SETTLEMENT</div>
          )}
          {/* UPI Ref */}
          {upiRef && (
            <div style={{ fontSize: "12px" }}>Ref No: <strong>{upiRef}</strong></div>
          )}
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      {!isSettlement && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
              <th style={{ padding: "8px", textAlign: "left" }}>#</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Item Description</th>
              <th style={{ padding: "8px", textAlign: "center" }}>Qty</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Price (₹)</th>
              <th style={{ padding: "8px", textAlign: "right" }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(billData.items || []).map((item, index) => (
              <tr key={index} style={{
                borderBottom: "1px solid #e2e8f0",
                background: item.qty < 0 ? "#fef2f2" : item.isGift ? "#f0fdf4" : "transparent",
              }}>
                <td style={{ padding: "8px" }}>{index + 1}</td>
                <td style={{ padding: "8px" }}>
                  <strong>{item.qty < 0 ? "↩ RETURNED: " : ""}{item.name}</strong>
                  {item.size && <span style={{ fontSize: "11px", color: "#666" }}> [{item.size}]</span>}
                  {item.isGift && <span style={{ fontSize: "11px", color: "#059669", fontWeight: "bold" }}> [FREE GIFT]</span>}
                  {(item.returnedQty || 0) > 0 && (
                    <div style={{ fontSize: "11px", color: "#e11d48", fontWeight: "bold" }}>
                      (Returned Qty: {item.returnedQty})
                    </div>
                  )}
                </td>
                <td style={{ padding: "8px", textAlign: "center", color: item.qty < 0 ? "#dc2626" : "#000" }}>
                  {item.qty < 0 ? "-" : ""}{Math.abs(item.qty)}
                </td>
                <td style={{ padding: "8px", textAlign: "right" }}>
                  {Math.abs(item.price).toFixed(2)}
                </td>
                <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: item.qty < 0 ? "#dc2626" : "#000" }}>
                  {item.qty < 0 ? "-" : ""}{Math.abs(item.total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── TOTALS BOX ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "340px" }}>
          {!isSettlement && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #e2e8f0" }}>
                <span>Items Subtotal:</span><span>{rs(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#e11d48" }}>
                  <span>Discount:</span><span>-{rs(discount)}</span>
                </div>
              )}
              {isBulkSale && billData.bulkDiscountLabel && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#e11d48", fontWeight: "bold" }}>
                  <span>{billData.bulkDiscountLabel}:</span><span>-{rs(discount)}</span>
                </div>
              )}
              {deliveryCharge > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#0369a1" }}>
                  <span>Home Delivery Fee:</span><span>+{rs(deliveryCharge)}</span>
                </div>
              )}

              {/* GST BREAKDOWN */}
              {hasGST && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span>Taxable Amount:</span><span>{rs(taxableAmount)}</span>
                  </div>
                  {cgst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#1e40af" }}>
                      <span>CGST @ 2.5%:</span><span>+{rs(cgst)}</span>
                    </div>
                  )}
                  {sgst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#1e40af" }}>
                      <span>SGST @ 2.5%:</span><span>+{rs(sgst)}</span>
                    </div>
                  )}
                  {igst > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#1e40af" }}>
                      <span>IGST:</span><span>+{rs(igst)}</span>
                    </div>
                  )}
                </>
              )}

              {isPartialReturn && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#e11d48", fontWeight: "bold" }}>
                  <span>Refund Amount:</span><span>-{rs(refundAmount)}</span>
                </div>
              )}
              {isFullReturn && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#e11d48", fontWeight: "bold" }}>
                  <span>Total Refund Amount:</span><span>-{rs(refundAmount)}</span>
                </div>
              )}
              {(isExchange && !isFullReturn && !isPartialReturn) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#7c3aed", fontWeight: "bold" }}>
                  <span>Exchange Net Difference:</span><span>{rs(grandTotal)}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #000", fontWeight: "bold", fontSize: "17px" }}>
                <span>GRAND TOTAL:</span>
                <span>{rs(isFullReturn ? refundAmount : grandTotal)}</span>
              </div>
            </>
          )}

          {/* SITUATION 1: CASH — Tendered & Change */}
          {isCashMode && !isPendingUdhar && !isSettlement && (cashTendered > 0 || changeReturned > 0) && (
            <div style={{ marginTop: "10px", padding: "10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Cash Tendered (Received):</span>
                <span style={{ fontWeight: "bold" }}>{rs(cashTendered)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: "bold", color: "#059669", fontSize: "14px" }}>
                <span>Change Returned (Return Money):</span>
                <span>{rs(changeReturned)}</span>
              </div>
            </div>
          )}

          {/* RETURN REFUND DETAILS (For all return transactions) */}
          {isReturn && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#fef2f2", border: "2px solid #e11d48", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#e11d48", marginBottom: "8px", fontSize: "13px" }}>
                ↩ REFUND PAYMENT DETAILS
              </div>
              {originalPaymentMode && originalPaymentMode !== refundMode && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
                  <span>Original Payment Mode:</span>
                  <span style={{ fontWeight: "bold" }}>{originalPaymentMode}{originalUpiRef ? ` (Ref: ${originalUpiRef})` : ""}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px dashed #e11d48", marginTop: "4px", fontWeight: "bold", color: refundMode === "UPI" ? "#2563eb" : "#059669", fontSize: "14px" }}>
                <span>Refund Paid Via:</span>
                <span>{refundMode === "UPI" ? "UPI / ONLINE" : "CASH"}</span>
              </div>
              {refundMode === "UPI" && upiRefundRef && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
                  <span>UPI Refund Ref No:</span>
                  <span style={{ fontWeight: "bold" }}>{upiRefundRef}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: "bold", fontSize: "15px", color: "#e11d48", borderTop: "1px solid #e11d48", marginTop: "4px" }}>
                <span>Refund Amount:</span>
                <span>{rs(refundAmount)}</span>
              </div>
              {isUpiReturnCashRefund && (
                <div style={{ fontSize: "11px", color: "#555", textAlign: "center", marginTop: "6px" }}>
                  Cash refund issued at counter. UPI transaction was NOT reversed online.
                </div>
              )}
            </div>
          )}

          {/* SITUATION 7 / 16: Split Payment Breakdown */}
          {splitPayments.length > 0 && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#1e40af", marginBottom: "8px" }}>
                PAYMENT BREAKDOWN (SPLIT)
              </div>
              {splitPayments.map((sp, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>• {sp.mode}:</span>
                  <span style={{ fontWeight: "bold" }}>{rs(sp.amount)}{sp.ref ? ` (${sp.ref})` : ""}</span>
                </div>
              ))}
              {splitPayments.some((s) => s.mode === "PENDING" || s.mode === "UDHAR") && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#dc2626", fontWeight: "bold", borderTop: "1px dashed #3b82f6", marginTop: "4px" }}>
                  <span>Udhar Balance Pending:</span>
                  <span>{rs(splitPayments.find((s) => s.mode === "PENDING" || s.mode === "UDHAR")?.amount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid #3b82f6", marginTop: "4px", fontWeight: "bold", color: "#059669" }}>
                <span>STATUS:</span><span>PAID IN FULL</span>
              </div>
            </div>
          )}

          {/* SITUATION 3 / 10: Udhar Account Summary */}
          {(isPendingUdhar || prevUdhar > 0) && !isSettlement && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#92400e", marginBottom: "8px" }}>
                UDHAR / CREDIT ACCOUNT SUMMARY
              </div>
              {advancePaid > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Advance Paid Upfront:</span>
                  <span style={{ fontWeight: "bold", color: "#059669" }}>{rs(advancePaid)}</span>
                </div>
              )}
              {prevUdhar > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Previous Udhar Balance:</span>
                  <span style={{ fontWeight: "bold", color: "#b45309" }}>{rs(prevUdhar)}</span>
                </div>
              )}
              {isPendingUdhar && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Current Bill Udhar:</span>
                  <span style={{ fontWeight: "bold", color: "#dc2626" }}>{rs(pendingDue)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #f59e0b", fontWeight: "bold", fontSize: "16px", color: "#dc2626", marginTop: "4px" }}>
                <span>TOTAL OUTSTANDING UDHAR:</span>
                <span>{rs(totalOutstandingUdhar)}</span>
              </div>
              {billData.settledHistory?.length > 0 && (
                <div style={{ marginTop: "8px", fontSize: "11px", borderTop: "1px dashed #f59e0b", paddingTop: "6px" }}>
                  <strong>Payment History:</strong>
                  {billData.settledHistory.map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                      <span>{new Date(e.timestamp).toLocaleDateString("en-GB")} via {e.paymentMode} by {e.settledBy}</span>
                      <span style={{ fontWeight: "bold" }}>{rs(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: "11px", color: "#92400e", marginTop: "8px", textAlign: "center" }}>
                Kindly pay the due amount at your earliest!
              </div>
            </div>
          )}

          {/* SITUATION 4 / 9: Settlement Details */}
          {isSettlement && (
            <div style={{ padding: "12px", background: "#f0fdf4", border: "2px solid #10b981", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", color: "#065f46", marginBottom: "8px" }}>
                UDHAR SETTLEMENT DETAILS
              </div>
              {billData.originalBillNo && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>Original Bill No:</span><span style={{ fontWeight: "bold" }}>{billData.originalBillNo}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span>Total Bill Amount:</span><span>{rs(billData.originalGrandTotal || grandTotal)}</span>
              </div>
              {(billData.previouslyPaid || 0) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>Previously Paid:</span><span>{rs(billData.previouslyPaid)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "2px solid #10b981", fontWeight: "bold", fontSize: "16px" }}>
                <span>AMOUNT RECEIVED NOW:</span>
                <span style={{ color: "#059669" }}>{rs(settleAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span>Payment Mode:</span>
                <span style={{ fontWeight: "bold" }}>{settleMode}{settleUpiRef ? ` (Ref: ${settleUpiRef})` : ""}</span>
              </div>
              {/* SITUATION B: Staff Accountability — who gave Udhar vs who collected money */}
              {udharGivenBy && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "#666" }}>
                  <span>Udhar Given By (Original Sale):</span>
                  <span style={{ fontWeight: "bold" }}>{udharGivenBy}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
                <span>Payment Collected By:</span>
                <span style={{ fontWeight: "bold", color: "#059669" }}>{collectedBy || "Admin"}</span>
              </div>
              {remainingAfterSettle > 0.01 ? (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px dashed #10b981", fontWeight: "bold", fontSize: "15px", color: "#dc2626", marginTop: "4px" }}>
                  <span>REMAINING UDHAR DUE:</span>
                  <span>{rs(remainingAfterSettle)}</span>
                </div>
              ) : (
                <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "15px", color: "#059669", padding: "8px 0", borderTop: "1px dashed #10b981", marginTop: "4px" }}>
                  ✓ ACCOUNT FULLY CLEARED — THANK YOU!
                </div>
              )}
            </div>
          )}

          {/* SITUATION 13: Store Credit / Overpayment */}
          {storeCreditKept > 0 && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#fdf4ff", border: "2px solid #a855f7", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#7c3aed", marginBottom: "6px" }}>STORE CREDIT BALANCE</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Cash Tendered:</span><span>{rs(cashTendered)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Customer Kept as Credit:</span><span>{rs(storeCreditKept)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Change Returned:</span><span>{rs(changeReturned)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #a855f7", fontWeight: "bold", color: "#7c3aed", fontSize: "15px" }}>
                <span>★ STORE CREDIT BALANCE:</span>
                <span>{rs(storeCreditBalance)}</span>
              </div>
            </div>
          )}

          {/* SITUATION 18: Advance Order Booking */}
          {isAdvanceOrder && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#1e40af", marginBottom: "6px" }}>ADVANCE ORDER DETAILS</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Estimated Total:</span><span>{rs(grandTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: "bold", color: "#059669" }}>
                <span>Advance Security Deposit Paid:</span><span>{rs(advanceDeposit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #3b82f6", fontWeight: "bold", fontSize: "15px", color: "#dc2626", marginTop: "4px" }}>
                <span>BALANCE PAYABLE AT DELIVERY:</span>
                <span>{rs(balanceOnDelivery)}</span>
              </div>
            </div>
          )}

          {/* SITUATION 19: Store Credit Voucher */}
          {isStoreCreditRefund && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#f0fdf4", border: "2px solid #22c55e", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#166534", marginBottom: "6px" }}>STORE CREDIT VOUCHER ISSUED</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: "bold", fontSize: "14px" }}>
                <span>Voucher Code:</span><span>{voucherCode}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Voucher Value:</span><span>{rs(voucherValue)}</span>
              </div>
              {voucherExpiry && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Valid Until:</span><span>{voucherExpiry}</span>
                </div>
              )}
            </div>
          )}

          {/* SITUATION 14: Udhar Adjustment via Return */}
          {isUdharAdjustment && (
            <div style={{ marginTop: "10px", padding: "12px", background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: "8px" }}>
              <div style={{ fontWeight: "bold", color: "#92400e", marginBottom: "6px" }}>UDHAR ADJUSTMENT</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Return Value Applied to Udhar:</span>
                <span style={{ color: "#059669", fontWeight: "bold" }}>-{rs(refundAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Cash Refund Paid:</span><span>{rs(cashRefundPaid)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #f59e0b", fontWeight: "bold", fontSize: "15px", color: "#dc2626", marginTop: "4px" }}>
                <span>REVISED UDHAR BALANCE DUE:</span>
                <span>{rs(revisedUdharBalance)}</span>
              </div>
            </div>
          )}

          {/* SITUATION 6: Cancelled status */}
          {isCancelled && (
            <div style={{ marginTop: "10px", padding: "10px", background: "#fef2f2", border: "1px dashed #dc2626", borderRadius: "6px", textAlign: "center", color: "#dc2626", fontWeight: "bold" }}>
              STATUS: CANCELLED / VOIDED — Inventory Restored
            </div>
          )}
        </div>
      </div>

      {/* ── A4 FOOTER ── */}
      <div style={{ marginTop: "40px", textAlign: "center", fontSize: "11px", color: "#555", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
        Thank you for shopping with {settings?.storeName || "us"}!
      </div>
    </div>
  );

  return (
    <div className="printable-receipt-area">
      {isA4 ? <A4Receipt /> : <ThermalReceipt />}
    </div>
  );
}
