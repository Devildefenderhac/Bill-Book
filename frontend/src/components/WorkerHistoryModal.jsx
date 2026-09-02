import React, { useState } from "react";
import { X, Receipt, Printer, Calendar, User, Search, FileText, Eye } from "lucide-react";
import PrintReceipt from "./PrintReceipt";
import ViewBillModal from "./ViewBillModal";
import CustomDateInput from "./CustomDateInput";

export default function WorkerHistoryModal({ isOpen, onClose, worker, transactions = [], settings, onReprintBill, onCancelBill, onUncancelBill }) {
  const [selectedTxForPrint, setSelectedTxForPrint] = useState(null);
  const [viewBillTransaction, setViewBillTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");

  if (!isOpen || !worker) return null;

  // Filter transactions for this specific worker/admin
  const workerNameClean = (worker.name || "").toLowerCase().trim();
  const workerUserClean = (worker.username || "").toLowerCase().trim();
  const workerCounterClean = (worker.counter || "").toLowerCase().trim();

  const workerTransactions = transactions.filter((t) => {
    const tWorker = (t.workerName || "").toLowerCase().trim();
    const tCounter = (t.counter || "").toLowerCase().trim();

    if (!tWorker) {
      return worker.role === "Admin" || worker.role === "Owner" || worker.role === "master_admin" || worker.id === "admin-master-1";
    }

    if (worker.role === "master_admin" || worker.role === "admin" || worker.role === "Admin" || worker.role === "Owner" || worker.role === "owner") {
      return tWorker === workerNameClean || tWorker === workerUserClean || tWorker.includes("admin") || tWorker.includes("owner");
    }

    return (
      tWorker === workerNameClean ||
      tWorker === workerUserClean ||
      (workerCounterClean && (tCounter === workerCounterClean || tCounter === `counter ${workerCounterClean}`))
    );
  });


  // Build settlement entries made by this worker (from other workers' bills)
  const settlementsCollected = [];
  transactions.forEach((tx) => {
    if (!tx.settledHistory) return;
    tx.settledHistory.forEach((entry) => {
      const entryName = (entry.settledBy || "").toLowerCase().trim();
      if (entryName === workerNameClean || entryName === workerUserClean) {
        settlementsCollected.push({
          ...entry,
          billNo: tx.billNo,
          customerName: tx.customerName,
          customerPhone: tx.customerPhone,
          originalBilledBy: tx.workerName,
          grandTotal: tx.grandTotal,
          pendingAmount: tx.pendingAmount,
        });
      }
    });
  });

  // Date Filtering Logic
  const filterTransactionsByDate = (txs) => {
    if (timeFilter === "all_time") return txs;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = new Date(0); // Epoch
    let endDate = new Date(); // Now

    if (timeFilter === "today") {
      startDate = today;
    } else if (timeFilter === "yesterday") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(today); // Until midnight today
    } else if (timeFilter === "tomorrow") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() + 1);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeFilter === "this_week") {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFilter === "this_month") {
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (timeFilter === "last_6_months") {
      startDate = new Date(today);
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (timeFilter === "this_year") {
      startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
    } else if (timeFilter === "custom") {
      if (appliedCustomStartDate) startDate = new Date(appliedCustomStartDate);
      if (appliedCustomEndDate) {
        endDate = new Date(appliedCustomEndDate);
        endDate.setHours(23, 59, 59, 999);
      }
    }

    return txs.filter((t) => {
      if (!t.timestamp) return false;
      const txDate = new Date(t.timestamp);
      return txDate >= startDate && txDate <= endDate;
    });
  };

  const filterSettlementsByDate = (entries) => {
    if (timeFilter === "all_time") return entries;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = new Date(0);
    let endDate = new Date();
    if (timeFilter === "today") { startDate = today; }
    else if (timeFilter === "yesterday") { startDate = new Date(today); startDate.setDate(startDate.getDate() - 1); endDate = new Date(today); }
    else if (timeFilter === "this_week") { startDate = new Date(today); startDate.setDate(startDate.getDate() - 7); }
    else if (timeFilter === "this_month") { startDate = new Date(today); startDate.setMonth(startDate.getMonth() - 1); }
    else if (timeFilter === "this_year") { startDate = new Date(today); startDate.setFullYear(startDate.getFullYear() - 1); }
    else if (timeFilter === "custom") {
      if (appliedCustomStartDate) startDate = new Date(appliedCustomStartDate);
      if (appliedCustomEndDate) { endDate = new Date(appliedCustomEndDate); endDate.setHours(23, 59, 59, 999); }
    }
    return entries.filter((e) => {
      if (!e.timestamp) return false;
      const d = new Date(e.timestamp);
      return d >= startDate && d <= endDate;
    });
  };

  const dateFilteredTransactions = filterTransactionsByDate(workerTransactions);
  const dateFilteredSettlements = filterSettlementsByDate(settlementsCollected);

  const filteredSales = dateFilteredTransactions.reduce((sum, t) => sum + (t.status === "CANCELLED" ? 0 : t.grandTotal || 0), 0);
  const totalSales = workerTransactions.reduce((sum, t) => sum + (t.status === "CANCELLED" ? 0 : t.grandTotal || 0), 0);
  const totalSettlementsCollected = dateFilteredSettlements.reduce((sum, e) => sum + (e.amount || 0), 0);

  let cashSales = 0, upiSales = 0, cardSales = 0, pendingSales = 0;
  dateFilteredTransactions.forEach((t) => {
    if (t.status === "CANCELLED") return;
    const gt = t.grandTotal || 0;
    const mode = (t.paymentMode || "").toUpperCase();

    if (mode === "PENDING" || t.paymentStatus === "PENDING" || t.paymentStatus === "PARTIALLY_PAID" || (t.pendingAmount !== undefined && t.pendingAmount > 0)) {
      const amtDue = t.pendingAmount !== undefined ? t.pendingAmount : gt;
      pendingSales += amtDue;
      const advance = t.advanceAmount || 0;
      if (advance > 0) cashSales += advance;
      if (Array.isArray(t.settledHistory)) {
        t.settledHistory.forEach((entry) => {
          const sm = (entry.paymentMode || "CASH").toUpperCase();
          const amt = entry.amount || 0;
          if (sm === "UPI") upiSales += amt;
          else if (sm === "CARD") cardSales += amt;
          else cashSales += amt;
        });
      }
    } else {
      if (mode === "UPI") upiSales += gt;
      else if (mode === "CARD") cardSales += gt;
      else cashSales += gt;
    }
  });

  // Filtered by search inside modal
  const filteredTx = dateFilteredTransactions.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (t.billNo && t.billNo.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.includes(q)) ||
      (t.paymentMode && t.paymentMode.toLowerCase().includes(q))
    );
  });

  const filteredSettlements = dateFilteredSettlements.filter((e) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.billNo && e.billNo.toLowerCase().includes(q)) ||
      (e.customerName && e.customerName.toLowerCase().includes(q)) ||
      (e.customerPhone && e.customerPhone.includes(q))
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid var(--border-color)",
          borderRadius: "20px",
          width: "95vw",
          maxWidth: "1100px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Receipt size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>
                Bill History - {worker.name}
              </h2>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {worker.role || "Cashier Staff"} • Counter {worker.counter || "1"} • Username: {worker.username}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Metrics Bar (Interactive Clickable Grid) */}
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(15, 23, 42, 0.3)",
            borderBottom: "1px solid var(--border-color)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
            gap: "8px",
            width: "100%",
          }}
        >
          <div
            onClick={() => setSearchTerm("")}
            title="Click to view all bills"
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "700", letterSpacing: "0.03em" }}>BILLS</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff", marginTop: "2px" }}>
              {dateFilteredTransactions.length} <span style={{ fontSize: "10px", fontWeight: "normal", color: "var(--text-dim)" }}>bills</span>
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>Click to show all</div>
          </div>

          <div
            onClick={() => setSearchTerm("")}
            title="Click to view total sales"
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "700", letterSpacing: "0.03em" }}>TOTAL SALES</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-emerald)", marginTop: "2px" }}>
              ₹{filteredSales.toFixed(2)}
            </div>
            <div style={{ fontSize: "9px", color: "var(--accent-emerald)", opacity: 0.8, marginTop: "2px" }}>Click to show all</div>
          </div>

          <div
            onClick={() => setSearchTerm("CASH")}
            title="Click to filter Cash bills"
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--accent-amber)", fontWeight: "700", letterSpacing: "0.03em" }}>CASH COLLECTED</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-amber)", marginTop: "2px" }}>
              ₹{cashSales.toFixed(2)}
            </div>
            <div style={{ fontSize: "9px", color: "var(--accent-amber)", opacity: 0.8, marginTop: "2px" }}>Click to filter →</div>
          </div>

          <div
            onClick={() => setSearchTerm("UPI")}
            title="Click to filter UPI bills"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--accent-blue)", fontWeight: "700", letterSpacing: "0.03em" }}>UPI COLLECTED</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-blue)", marginTop: "2px" }}>
              ₹{upiSales.toFixed(2)}
            </div>
            <div style={{ fontSize: "9px", color: "var(--accent-blue)", opacity: 0.8, marginTop: "2px" }}>Click to filter →</div>
          </div>

          <div
            onClick={() => setSearchTerm("PENDING")}
            title="Click to filter Pending Udhar bills"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--accent-rose)", fontWeight: "700", letterSpacing: "0.03em" }}>PENDING UDHAR</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-rose)", marginTop: "2px" }}>
              ₹{pendingSales.toFixed(2)}
            </div>
            <div style={{ fontSize: "9px", color: "var(--accent-rose)", opacity: 0.9, fontWeight: "bold", marginTop: "2px" }}>Click to filter →</div>
          </div>

          {cardSales > 0 && (
            <div
              onClick={() => setSearchTerm("CARD")}
              title="Click to filter Card bills"
              style={{
                background: "rgba(139, 92, 246, 0.1)",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                minWidth: 0,
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ fontSize: "10px", color: "var(--accent-purple)", fontWeight: "700", letterSpacing: "0.03em" }}>CARD COLLECTED</div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-purple)", marginTop: "2px" }}>
                ₹{cardSales.toFixed(2)}
              </div>
              <div style={{ fontSize: "9px", color: "var(--accent-purple)", opacity: 0.8, marginTop: "2px" }}>Click to filter →</div>
            </div>
          )}

          <div
            onClick={() => { setTimeFilter("all_time"); setSearchTerm(""); }}
            title="Click to view lifetime sales"
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              minWidth: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "700", letterSpacing: "0.03em" }}>LIFETIME SALES</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-indigo)", marginTop: "2px" }}>
              ₹{totalSales.toFixed(2)}
            </div>
            <div style={{ fontSize: "9px", color: "var(--accent-indigo)", opacity: 0.8, marginTop: "2px" }}>Click all time →</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ padding: "16px 24px 0 24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "10px" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Bill No, Customer Name, or Phone..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                background: "rgba(15,23,42,0.6)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
          
          <select
            value={timeFilter}
            onChange={(e) => {
              const val = e.target.value;
              setTimeFilter(val);
              if (val === "today" || (val === "custom" && !customStartDate)) {
                const todayStr = new Date().toLocaleDateString("en-CA");
                setCustomStartDate(todayStr);
                setAppliedCustomStartDate(todayStr);
                if (!customEndDate || val === "today") {
                  setCustomEndDate(todayStr);
                  setAppliedCustomEndDate(todayStr);
                }
              }
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "rgba(15,23,42,0.6)",
              border: "1px solid var(--border-color)",
              color: "#fff",
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this_week">Weekly (Last 7 Days)</option>
            <option value="this_month">Monthly (Last 30 Days)</option>
            <option value="last_6_months">6 Months</option>
            <option value="this_year">1 Year</option>
            <option value="all_time">Lifetime (All Time)</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {timeFilter === "custom" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <CustomDateInput
                min="2020-01-01"
                value={customStartDate}
                onChange={setCustomStartDate}
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <span style={{ color: "var(--text-dim)", fontSize: "12px" }}>to</span>
              <CustomDateInput
                min="2020-01-01"
                value={customEndDate}
                onChange={setCustomEndDate}
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <button
                onClick={() => {
                  setAppliedCustomStartDate(customStartDate);
                  setAppliedCustomEndDate(customEndDate);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Search size={14} /> Search
              </button>
            </div>
          )}
        </div>



        {/* Transactions Table List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {filteredTx.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "13px" }}>
              <FileText size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <div>No billing transactions found for <strong>{worker.name}</strong>.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date & Time</th>
                  <th>Customer Details</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((t) => (
                  <tr key={t.id || t.billNo}>
                    <td style={{ fontWeight: "800", color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>
                      {t.billNo}
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {t.timestamp ? new Date(t.timestamp).toLocaleString("en-GB") : "N/A"}
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#fff" }}>{t.customerName || "Walk-in Customer"}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{t.customerPhone || "N/A"}</div>
                    </td>
                    <td>
                      {t.status === "RETURNED" || t.type === "RETURN" ? (
                        <div>
                          <div style={{ fontWeight: "800", color: "var(--accent-rose)" }}>
                            -₹{(t.refundAmount || Math.abs(t.grandTotal)).toFixed(2)}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--accent-rose)", fontWeight: "600" }}>Total Refund</div>
                        </div>
                      ) : t.status === "PARTIALLY_RETURNED" ? (
                        <div>
                          <div style={{ fontWeight: "800", color: "var(--accent-emerald)" }}>
                            Net: ₹{(t.grandTotal || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--accent-amber)", fontWeight: "600" }}>
                            Refunded: ₹{(t.refundAmount || (t.items || []).reduce((s, i) => s + ((i.returnedQty || 0) * (i.price || 0)), 0)).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontWeight: "800", color: "var(--accent-emerald)" }}>
                          ₹{(t.grandTotal || 0).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.paymentMode === "PENDING" || t.paymentStatus === "PENDING" || (t.pendingAmount !== undefined && t.pendingAmount > 0) ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "var(--accent-rose)",
                            fontWeight: "bold",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                          }}
                        >
                          PENDING UDHAR (₹{(t.pendingAmount !== undefined ? t.pendingAmount : t.grandTotal).toFixed(2)})
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            background: "rgba(99,102,241,0.15)",
                            color: "var(--accent-indigo)",
                            fontWeight: "bold",
                          }}
                        >
                          {t.paymentMode || "CASH"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {t.status !== "CANCELLED" && (
                          <>
                            <button
                              onClick={() => setViewBillTransaction(t)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                color: "#38bdf8",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => {
                                if (onReprintBill) {
                                  onReprintBill(t);
                                } else {
                                  setSelectedTxForPrint(t);
                                  setTimeout(() => {
                                    window.print();
                                  }, 300);
                                }
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
                                border: "none",
                                color: "#fff",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Printer size={13} />
                              <span>Print Receipt</span>
                            </button>
                          </>
                        )}

                        {t.status === "CANCELLED" && onUncancelBill && (
                          <button
                            onClick={() => onUncancelBill(t.billNo, t.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              color: "var(--accent-emerald)",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            Uncancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Print Receipt Sub-Modal */}
      {selectedTxForPrint && (
        <PrintReceipt
          billData={selectedTxForPrint}
          settings={settings}
          transactions={transactions}
          onClose={() => setSelectedTxForPrint(null)}
        />
      )}

      {viewBillTransaction && (
        <ViewBillModal
          billData={viewBillTransaction}
          settings={settings}
          transactions={transactions}
          onClose={() => setViewBillTransaction(null)}
        />
      )}
    </div>
  );
}
