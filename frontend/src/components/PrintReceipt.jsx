import React from "react";

export default function PrintReceipt({ billData, settings }) {
  if (!billData) return null;

  const paperType = settings?.receiptPaper || "80mm";
  const isA4 = paperType === "A4";

  return (
    <div className="printable-receipt-area">
      {isA4 ? (
        <div
          style={{
            padding: "30px",
            fontFamily: "sans-serif",
            maxWidth: "800px",
            margin: "0 auto",
            color: "#000",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "2px solid #000",
              paddingBottom: "15px",
            }}
          >
            <div>
              <h1 style={{ fontSize: "24px", margin: 0, fontWeight: "bold" }}>
                {settings?.storeName}
              </h1>
              <p style={{ margin: "4px 0", fontSize: "12px" }}>
                {settings?.address}, {settings?.city}
              </p>
              <p style={{ margin: "2px 0", fontSize: "12px" }}>
                Phone: {settings?.phone} | GSTIN: {settings?.gstin}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h2 style={{ fontSize: "20px", color: "#333", margin: 0 }}>
                PAYMENT RECEIPT
              </h2>
              <p style={{ fontWeight: "bold", margin: "4px 0" }}>
                Bill No: {billData.billNo}
              </p>
              <p style={{ fontSize: "12px", margin: 0 }}>
                Date: {new Date(billData.timestamp).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "15px 0",
              fontSize: "12px",
            }}
          >
            <div>
              <strong>Customer Name:</strong> {billData.customerName || "Walk-in Customer"}
              <br />
              <strong>Phone:</strong> {billData.customerPhone || "N/A"}
            </div>
            <div>
              <strong>Payment Method:</strong> {billData.paymentMode}
              {billData.upiRefNo && <div>Ref: {billData.upiRefNo}</div>}
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "15px",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>#</th>
                <th style={{ padding: "8px", textAlign: "left" }}>Item Description</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Price (₹)</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {billData.items.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "8px" }}>{index + 1}</td>
                  <td style={{ padding: "8px" }}>
                    <strong>{item.name}</strong>
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {item.qty}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {item.price.toFixed(2)}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "20px",
            }}
          >
            <div style={{ width: "250px", fontSize: "13px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                }}
              >
                <span>Subtotal:</span>
                <span>₹{billData.subtotal?.toFixed(2)}</span>
              </div>
              {billData.discount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                    color: "#e11d48",
                  }}
                >
                  <span>Discount:</span>
                  <span>-₹{billData.discount?.toFixed(2)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "2px solid #000",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                <span>Total Paid:</span>
                <span>₹{billData.grandTotal?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "40px", textAlign: "center", fontSize: "11px" }}>
            <p>Thank you for shopping with {settings?.storeName}!</p>
          </div>
        </div>
      ) : (
        /* Thermal 80mm / 58mm Receipt Format */
        <div
          className="receipt-thermal"
          style={{ width: paperType === "58mm" ? "56mm" : "78mm" }}
        >
          <div className="header">
            <div className="shop-name">{settings?.storeName}</div>
            <div>{settings?.tagline}</div>
            <div>{settings?.address}</div>
            <div>Ph: {settings?.phone}</div>
          </div>

          <div style={{ fontSize: "11px", marginBottom: "6px" }}>
            <div>Bill No: <strong>{billData.billNo}</strong></div>
            <div>Date: {new Date(billData.timestamp).toLocaleString("en-IN")}</div>
            <div>Customer: {billData.customerName || "Walk-in"}</div>
          </div>

          <div className="divider"></div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "10px",
              marginBottom: "4px",
            }}
          >
            <span>ITEM</span>
            <span>QTY x RATE</span>
            <span>AMOUNT</span>
          </div>

          <div className="divider"></div>

          {billData.items.map((item, idx) => (
            <div key={idx} style={{ marginBottom: "4px" }}>
              <div className="item-row">
                <span style={{ fontWeight: "bold" }}>{item.name}</span>
                <span>{item.qty} x ₹{item.price}</span>
                <span style={{ fontWeight: "bold" }}>₹{item.total.toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div className="divider"></div>

          <div className="item-row">
            <span>Subtotal:</span>
            <span>₹{billData.subtotal?.toFixed(2)}</span>
          </div>

          {billData.discount > 0 && (
            <div className="item-row">
              <span>Discount:</span>
              <span>-₹{billData.discount?.toFixed(2)}</span>
            </div>
          )}

          <div className="divider"></div>

          <div className="total-row">
            <span>TOTAL PAYMENT:</span>
            <span>₹{billData.grandTotal?.toFixed(2)}</span>
          </div>

          <div className="divider"></div>

          <div style={{ fontSize: "11px" }}>
            <div>Payment: <strong>{billData.paymentMode}</strong></div>
            {billData.paymentMode === "CASH" && (
              <>
                <div>Paid: ₹{billData.cashTendered}</div>
                <div>Change: ₹{billData.changeReturned?.toFixed(2)}</div>
              </>
            )}
            {billData.upiRefNo && <div>UPI Ref: {billData.upiRefNo}</div>}
          </div>

          <div className="footer">
            <div>*** THANK YOU! VISIT AGAIN ***</div>
          </div>
        </div>
      )}
    </div>
  );
}
