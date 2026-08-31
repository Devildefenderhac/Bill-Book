import React, { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Clock,
  Search,
  Phone,
  User,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Calendar,
  X,
  Send,
  MessageCircle,
  Banknote,
  QrCode,
  CreditCard,
  Copy,
  Check,
  Printer,
  Filter,
  Eye,
} from "lucide-react";
import { settlePendingTransaction } from "../utils/api";
import CustomDateInput from "./CustomDateInput";
import ViewBillModal from "./ViewBillModal";

export default function PendingPaymentsView({
  transactions = [],
  currentUser = null,
  settings = {},
  onReloadData = () => { },
  onPrintSettlementBill = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all_time");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [viewTab, setViewTab] = useState("pending"); // "pending" | "today_collected"

  const [selectedTxToSettle, setSelectedTxToSettle] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settlePaymentMode, setSettlePaymentMode] = useState("UPI");
  const [cashTendered, setCashTendered] = useState("");
  const [upiRefNo, setUpiRefNo] = useState("");
  const [cardRefNo, setCardRefNo] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewBillTransaction, setViewBillTransaction] = useState(null);

  const getCleanName = (nameStr) => {
    const ns = (nameStr || "").trim().toLowerCase();
    if (
      ns === "" ||
      ns === "customer" ||
      ns === "walk-in" ||
      ns === "walk-in customer" ||
      ns.includes("pending udhar") ||
      ns.includes("udhar customer")
    ) {
      return "Valued Customer";
    }
    return nameStr;
  };

  // All pending transactions in system (cancelled or zero-due excluded)
  const allPendingTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      if (t.status === "CANCELLED" || t.status === "RETURNED") return false;
      const isPending =
        t.paymentStatus === "PENDING" ||
        t.paymentStatus === "PARTIALLY_PAID" ||
        t.paymentMode === "PENDING" ||
        (t.pendingAmount !== undefined && t.pendingAmount > 0);
      if (!isPending) return false;
      const amtDue = t.pendingAmount !== undefined ? t.pendingAmount : t.grandTotal;
      return (amtDue || 0) > 0;
    });
  }, [transactions]);

  // Per account pending summary metrics
  const accountSummaries = useMemo(() => {
    const map = {};
    allPendingTransactions.forEach((t) => {
      const rawName = (t.workerName || "").trim();
      if (!rawName) return;
      const amtDue = t.pendingAmount !== undefined ? t.pendingAmount : t.grandTotal || 0;
      if (amtDue > 0) {
        if (!map[rawName]) {
          map[rawName] = { count: 0, pendingTotal: 0 };
        }
        map[rawName].count += 1;
        map[rawName].pendingTotal += amtDue;
      }
    });
    return map;
  }, [allPendingTransactions]);

  // Extract only accounts with active pending udhar > 0
  const accountList = useMemo(() => {
    return Object.keys(accountSummaries)
      .filter((accName) => {
        const s = accountSummaries[accName];
        return s && s.pendingTotal > 0 && s.count > 0;
      })
      .sort();
  }, [accountSummaries]);

  // Matcher for account filter
  const matchesAccount = (txWorkerName) => {
    if (accountFilter === "all") return true;
    const name = (txWorkerName || "").trim().toLowerCase();
    const filter = accountFilter.trim().toLowerCase();
    return name === filter;
  };

  // Helper: check if a timestamp or date string is today
  const isDateToday = (ts) => {
    if (!ts) return false;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Extract all settlement transactions & advance collections collected today
  const todaySettlementsList = useMemo(() => {
    const list = [];

    (transactions || []).forEach((t) => {
      if (!t || t.status === "CANCELLED") return;

      // 1. Check settledHistory array
      let historyArr = [];
      if (Array.isArray(t.settledHistory)) {
        historyArr = t.settledHistory;
      } else if (typeof t.settledHistory === "string") {
        try { historyArr = JSON.parse(t.settledHistory); } catch (e) {}
      }

      // 2. Check settlementDetails object if history empty
      if (historyArr.length === 0 && t.settlementDetails) {
        let sd = t.settlementDetails;
        if (typeof sd === "string") {
          try { sd = JSON.parse(sd); } catch (e) {}
        }
        if (sd) {
          if (Array.isArray(sd.history) && sd.history.length > 0) {
            historyArr = sd.history;
          } else if (sd.amountPaid) {
            historyArr = [{
              amount: Number(sd.amountPaid) || 0,
              paymentMode: sd.settlementPaymentMode || "CASH",
              settledBy: sd.settledBy || t.workerName || "Store Owner",
              timestamp: sd.timestamp || t.timestamp,
            }];
          }
        }
      }

      // Process all history entries
      historyArr.forEach((e, idx) => {
        if (!e) return;
        if (isDateToday(e.timestamp)) {
          const settledByPerson = e.settledBy || t.workerName || "Store Owner";
          if (accountFilter !== "all" && !matchesAccount(settledByPerson)) return;

          list.push({
            settlementKey: `${t.id || t.billNo}-set-${idx}`,
            billNo: t.billNo,
            customerName: t.customerName || "Walk-in Customer",
            customerPhone: t.customerPhone || "N/A",
            amountCollected: Number(e.amount) || 0,
            paymentMode: e.paymentMode || "CASH",
            settledBy: settledByPerson,
            timestamp: e.timestamp || new Date().toISOString(),
            originalGrandTotal: t.grandTotal,
            currentPendingAmount: t.pendingAmount !== undefined ? t.pendingAmount : 0,
            type: "SETTLEMENT",
            tx: t,
          });
        }
      });

      // 3. Also include initial Advance Paid collected today on pending/udhar bills
      if (t.advanceAmount && Number(t.advanceAmount) > 0 && isDateToday(t.timestamp)) {
        if (accountFilter === "all" || matchesAccount(t.workerName)) {
          list.push({
            settlementKey: `${t.id || t.billNo}-adv-0`,
            billNo: t.billNo,
            customerName: t.customerName || "Walk-in Customer",
            customerPhone: t.customerPhone || "N/A",
            amountCollected: Number(t.advanceAmount) || 0,
            paymentMode: t.paymentMode || "CASH",
            settledBy: t.workerName || "Store Owner",
            timestamp: t.timestamp,
            originalGrandTotal: t.grandTotal,
            currentPendingAmount: t.pendingAmount !== undefined ? t.pendingAmount : 0,
            type: "ADVANCE_COLLECTION",
            tx: t,
          });
        }
      }
    });

    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [transactions, accountFilter]);

  const todayTotalCollected = todaySettlementsList.reduce(
    (sum, item) => sum + (Number(item.amountCollected) || 0),
    0
  );

  // Date range filter matcher
  const isDateInRange = (timestamp) => {
    if (!timestamp || timeFilter === "all_time") return true;
    const txDate = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeFilter === "today") {
      const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      return txDay.getTime() === today.getTime();
    } else if (timeFilter === "yesterday") {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      return txDay.getTime() === yest.getTime();
    } else if (timeFilter === "this_week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txDate >= weekAgo;
    } else if (timeFilter === "this_month") {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return txDate >= monthAgo;
    } else if (timeFilter === "last_6_months") {
      const sixMonthAgo = new Date(today);
      sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);
      return txDate >= sixMonthAgo;
    } else if (timeFilter === "this_year") {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return txDate >= yearAgo;
    } else if (timeFilter === "custom") {
      if (appliedStartDate) {
        const start = new Date(appliedStartDate);
        if (txDate < start) return false;
      }
      if (appliedEndDate) {
        const end = new Date(appliedEndDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
      return true;
    }
    return true;
  };

  // Apply Date and Account filters
  const pendingTransactions = useMemo(() => {
    return allPendingTransactions.filter((t) => {
      if (!isDateInRange(t.timestamp)) return false;
      if (!matchesAccount(t.workerName)) return false;
      return true;
    });
  }, [allPendingTransactions, timeFilter, appliedStartDate, appliedEndDate, accountFilter]);

  // Search filter
  const filteredPending = useMemo(() => {
    return pendingTransactions.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        (t.billNo && t.billNo.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerPhone && t.customerPhone.includes(q)) ||
        (t.workerName && t.workerName.toLowerCase().includes(q))
      );
    });
  }, [pendingTransactions, searchTerm]);

  // Calculate metrics for current filtered selection
  const totalPendingAmount = pendingTransactions.reduce((sum, t) => {
    const amtDue = t.pendingAmount !== undefined ? t.pendingAmount : t.grandTotal;
    return sum + (amtDue || 0);
  }, 0);

  const uniqueCustomers = new Set(
    pendingTransactions.map((t) => t.customerPhone || t.customerName || t.billNo)
  ).size;

  const handleOpenSettleModal = (tx) => {
    const amtDue = tx.pendingAmount !== undefined ? tx.pendingAmount : tx.grandTotal;
    setSelectedTxToSettle(tx);
    setSettleAmount(amtDue.toString());
    setSettlePaymentMode("UPI");
    setCashTendered("");
    setUpiRefNo("");
    setCardRefNo("");
  };

  const handleConfirmSettle = async (shouldPrint = false) => {
    if (!selectedTxToSettle) return;
    const payAmt = parseFloat(settleAmount);
    const amtDue = selectedTxToSettle.pendingAmount !== undefined
      ? selectedTxToSettle.pendingAmount
      : selectedTxToSettle.grandTotal;

    if (!payAmt || payAmt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    if (payAmt > amtDue + 0.01) {
      alert(`Amount entered (₹${payAmt.toFixed(2)}) exceeds the due balance (₹${amtDue.toFixed(2)}). Please enter a correct amount.`);
      return;
    }

    const remainingAfter = Math.max(0, amtDue - payAmt);
    const isPartial = remainingAfter > 0.01;
    const totalPreviouslyPaid = (selectedTxToSettle.grandTotal || 0) - amtDue;

    if (isPartial) {
      const confirmed = window.confirm(
        `⚠️ Partial Payment Alert!\n\nReceiving: ₹${payAmt.toFixed(2)}\nRemaining Balance: ₹${remainingAfter.toFixed(2)}\n\nThe bill will stay in Pending Udhar until fully paid.\n\nConfirm partial payment?`
      );
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    const workerName = currentUser ? currentUser.name : "Staff";
    const res = await settlePendingTransaction(
      selectedTxToSettle.billNo,
      selectedTxToSettle.id,
      payAmt,
      settlePaymentMode,
      workerName
    );

    setIsSubmitting(false);
    // Build settlement receipt data
    const settlementReceiptData = {
      ...selectedTxToSettle,
      type: "SETTLEMENT",
      settleAmount: payAmt,
      settlePaymentMode,
      settleTimestamp: new Date().toISOString(),
      remainingAfterSettle: remainingAfter,
      originalGrandTotal: selectedTxToSettle.grandTotal,
      previouslyPaid: totalPreviouslyPaid,
      settledBy: workerName,
    };

    if (shouldPrint && onPrintSettlementBill) {
      onPrintSettlementBill(settlementReceiptData);
    }

    if (isPartial) {
      alert(`✅ Partial payment of ₹${payAmt.toFixed(2)} recorded!\n💰 Remaining due: ₹${remainingAfter.toFixed(2)}\n\nBill remains in Pending Udhar.`);
    } else {
      alert(`✅ Full payment of ₹${payAmt.toFixed(2)} received! Bill is now fully PAID. ✓`);
    }
    setSelectedTxToSettle(null);
    onReloadData();
  };

  return (
    <div className="pending-payments-root" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "100%", boxSizing: "border-box", padding: "2px 0" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.15))",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(12px, 2vw, 18px)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={22} color="var(--accent-amber)" />
            <h2 style={{ fontSize: "clamp(15px, 2.5vw, 19px)", fontWeight: "800", color: "#fff", margin: 0 }}>
              Pending Payments (Udhar / Khata Book)
            </h2>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Monitor and collect pending customer amounts across all staff & counters.
          </div>
        </div>

        {/* Quick KPI Summary Badges - 100% Full Width Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", width: "100%", boxSizing: "border-box" }}>
          {/* TOTAL PENDING DUE */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "10.5px", color: "var(--accent-rose)", fontWeight: "700", textTransform: "uppercase" }}>
              TOTAL PENDING DUE
            </div>
            <div
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                fontWeight: "900",
                color: "var(--accent-rose)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              ₹{totalPendingAmount.toFixed(2)}
            </div>
          </div>

          {/* TODAY'S UDHAR COLLECTED */}
          <div
            onClick={() => setViewTab("today_collected")}
            title="Click to view today's collected Udhar history per bill & person"
            style={{
              background: viewTab === "today_collected" ? "rgba(16, 185, 129, 0.25)" : "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: viewTab === "today_collected" ? "0 0 10px rgba(16, 185, 129, 0.4)" : "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "10.5px", color: "var(--accent-emerald)", fontWeight: "700", textTransform: "uppercase" }}>
              TODAY'S UDHAR COLLECTED
            </div>
            <div
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                fontWeight: "900",
                color: "var(--accent-emerald)",
                fontFamily: "var(--font-mono)",
                marginTop: "2px",
              }}
            >
              ₹{todayTotalCollected.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "10.5px", color: "var(--accent-amber)", fontWeight: "700", textTransform: "uppercase" }}>
              CREDIT CUSTOMERS
            </div>
            <div style={{ fontSize: "clamp(16px, 2vw, 20px)", fontWeight: "900", color: "#fff", marginTop: "2px" }}>
              {uniqueCustomers} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>people</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>
              PENDING BILLS
            </div>
            <div style={{ fontSize: "clamp(16px, 2vw, 20px)", fontWeight: "900", color: "#fff", marginTop: "2px" }}>
              {pendingTransactions.length} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Navigation Tabs (Pending Bills vs Today's Udhar Collected) */}
      <div className="scrollable-row" style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", overflowX: "auto", whiteSpace: "nowrap", width: "100%" }}>
        <button
          type="button"
          onClick={() => setViewTab("pending")}
          style={{
            padding: "7px 14px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: "700",
            cursor: "pointer",
            border: "none",
            background: viewTab === "pending" ? "var(--accent-amber)" : "rgba(30, 41, 59, 0.6)",
            color: viewTab === "pending" ? "#000" : "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <Clock size={15} />
          <span>Pending Udhar Bills ({pendingTransactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab("today_collected")}
          style={{
            padding: "7px 14px",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontWeight: "700",
            cursor: "pointer",
            border: "none",
            background: viewTab === "today_collected" ? "var(--accent-emerald)" : "rgba(30, 41, 59, 0.6)",
            color: viewTab === "today_collected" ? "#fff" : "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={15} />
          <span>Today's Collected Udhar ({todaySettlementsList.length} • ₹{todayTotalCollected.toFixed(2)})</span>
        </button>
      </div>

      {/* Account Filter Pills Bar */}
      <div className="scrollable-row" style={{ display: "flex", gap: "6px", alignItems: "center", overflowX: "auto", whiteSpace: "nowrap", width: "100%", paddingBottom: "4px" }}>
        <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: "700", marginRight: "2px", flexShrink: 0 }}>
          Filter By Account:
        </span>

        {/* All Accounts Pill */}
        <button
          type="button"
          onClick={() => setAccountFilter("all")}
          style={{
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "11.5px",
            fontWeight: "700",
            cursor: "pointer",
            border: accountFilter === "all" ? "1.5px solid var(--accent-amber)" : "1px solid var(--border-color)",
            background: accountFilter === "all" ? "rgba(245, 158, 11, 0.25)" : "rgba(30, 41, 59, 0.6)",
            color: accountFilter === "all" ? "var(--accent-amber)" : "var(--text-muted)",
            transition: "all 0.15s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          <span>All Accounts</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", opacity: 0.9 }}>
            (₹{allPendingTransactions.reduce((s, t) => s + (t.pendingAmount !== undefined ? t.pendingAmount : t.grandTotal || 0), 0).toFixed(2)})
          </span>
        </button>

        {/* Individual Staff & Admin Accounts Pills (Only with Active Udhar > 0) */}
        {accountList.map((accName) => {
          const summary = accountSummaries[accName] || { count: 0, pendingTotal: 0 };
          const isSelected = accountFilter.trim().toLowerCase() === accName.trim().toLowerCase();
          return (
            <button
              key={accName}
              type="button"
              onClick={() => setAccountFilter(accName)}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: "700",
                cursor: "pointer",
                border: isSelected ? "1.5px solid var(--accent-blue)" : "1px solid var(--border-color)",
                background: isSelected ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
                color: isSelected ? "var(--accent-blue)" : "var(--text-muted)",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0,
              }}
            >
              <span>{accName}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", opacity: 0.9 }}>
                ₹{summary.pendingTotal.toFixed(2)} ({summary.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar - 100% Full Width Responsive */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: "180px", width: "100%" }}>
          <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            className="form-control"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer, phone, bill no..."
            style={{ paddingLeft: "34px", fontSize: "12.5px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* Account Selector Dropdown */}
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          style={{
            flex: "1 1 140px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "#fff",
            fontSize: "12.5px",
            outline: "none",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <option value="all">👤 All Accounts (Staff & Admin)</option>
          {accountList.map((acc) => (
            <option key={acc} value={acc}>
              👤 {acc} (₹{(accountSummaries[acc]?.pendingTotal || 0).toFixed(2)})
            </option>
          ))}
        </select>

        {/* Time Period Filter Dropdown */}
        <select
          value={timeFilter}
          onChange={(e) => {
            const val = e.target.value;
            setTimeFilter(val);
            if (val === "today" || (val === "custom" && !customStartDate)) {
              const todayStr = new Date().toLocaleDateString("en-CA");
              setCustomStartDate(todayStr);
              setAppliedStartDate(todayStr);
              if (!customEndDate || val === "today") {
                setCustomEndDate(todayStr);
                setAppliedEndDate(todayStr);
              }
            }
          }}
          style={{
            flex: "1 1 140px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "#fff",
            fontSize: "12.5px",
            outline: "none",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <option value="all_time">📅 Lifetime (All Time Udhar)</option>
          <option value="today">📅 Today</option>
          <option value="yesterday">📅 Yesterday</option>
          <option value="this_week">📅 Weekly (Last 7 Days)</option>
          <option value="this_month">📅 Monthly (Last 30 Days)</option>
          <option value="last_6_months">📅 6 Months</option>
          <option value="this_year">📅 1 Year</option>
          <option value="custom">📅 Custom Date Range</option>
        </select>

        {/* Custom Date Range Selector */}
        {timeFilter === "custom" && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <CustomDateInput
              min="2020-01-01"
              value={customStartDate}
              onChange={setCustomStartDate}
              style={{
                padding: "6px 8px",
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
                padding: "6px 8px",
                borderRadius: "6px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                fontSize: "12px",
              }}
            />
            <button
              type="button"
              onClick={() => {
                setAppliedStartDate(customStartDate);
                setAppliedEndDate(customEndDate);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, var(--accent-amber), var(--accent-blue))",
                border: "none",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Search size={14} /> Apply
            </button>
          </div>
        )}
      </div>

      {/* View Switcher: Pending Bills vs Today's Udhar Collections */}
      {viewTab === "today_collected" ? (
        <div className="table-panel" style={{ flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontWeight: "800", fontSize: "16px", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={20} />
              Today's Udhar Collections & Settlement Log
            </div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", background: "rgba(16, 185, 129, 0.2)", padding: "4px 12px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
              Total Collected Today: <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>₹{todayTotalCollected.toFixed(2)}</span>
            </div>
          </div>

          {todaySettlementsList.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Clock size={48} color="var(--accent-amber)" />
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>
                No Udhar Payments Collected Today Yet!
              </div>
              <div style={{ fontSize: "13px" }}>
                When customers pay their pending Udhar dues today, payments will appear here with person details & bill numbers.
              </div>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Collection Time</th>
                  <th>Customer (Person)</th>
                  <th>Phone Number</th>
                  <th>Collected Amount Today</th>
                  <th>Payment Mode</th>
                  <th>Collected By</th>
                  <th>Remaining Due</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {todaySettlementsList.map((item) => {
                  const cleanPhone = (item.customerPhone || "").replace(/\D/g, "");
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const storeName = settings?.storeName || "ROYAL FASHION MALL";
                  const storeAddress = [settings?.address, settings?.city].filter(Boolean).join(", ") || "Main Market Road, City Center";
                  const cleanName = getCleanName(item.customerName);

                  const waMsgEng = `Hello ${cleanName}, thank you for paying ₹${item.amountCollected.toFixed(2)} towards Bill No: ${item.billNo} at ${storeName}.\n📍 Address: ${storeAddress}\nRemaining Due: ₹${(item.currentPendingAmount || 0).toFixed(2)}.`;
                  const waMsgHin = `नमस्ते ${cleanName}, ${storeName} पर बिल संख्या: ${item.billNo} के लिए ₹${item.amountCollected.toFixed(2)} भुगतान करने हेतु धन्यवाद।\n📍 पता: ${storeAddress}\nशेष बकाया राशि: ₹${(item.currentPendingAmount || 0).toFixed(2)}.`;

                  const waUrlEng = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMsgEng)}`;
                  const waUrlHin = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMsgHin)}`;

                  return (
                    <tr key={item.settlementKey}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "var(--accent-amber)" }}>
                        {item.billNo}
                      </td>
                      <td>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ fontWeight: "700", color: "#fff" }}>
                        {cleanName}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{item.customerPhone}</span>
                          {cleanPhone.length === 10 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MessageCircle size={12} color="#25D366" />
                              <a
                                href={waUrlEng}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "800",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(59, 130, 246, 0.15)",
                                  color: "var(--accent-blue)",
                                  border: "1px solid rgba(59, 130, 246, 0.4)",
                                  textDecoration: "none"
                                }}
                                title="Send English Receipt"
                              >
                                ENG
                              </a>
                              <a
                                href={waUrlHin}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "800",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  color: "var(--accent-amber)",
                                  border: "1px solid rgba(245, 158, 11, 0.4)",
                                  textDecoration: "none"
                                }}
                                title="Send Hindi Receipt"
                              >
                                HIN
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "15px", fontWeight: "900", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                          +₹{item.amountCollected.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: "700",
                            background:
                              item.paymentMode === "UPI"
                                ? "rgba(59, 130, 246, 0.15)"
                                : item.paymentMode === "CARD"
                                  ? "rgba(168, 85, 247, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                            color:
                              item.paymentMode === "UPI"
                                ? "var(--accent-blue)"
                                : item.paymentMode === "CARD"
                                  ? "#c084fc"
                                  : "var(--accent-amber)",
                          }}
                        >
                          {item.paymentMode === "UPI" ? "📱 UPI" : item.paymentMode === "CARD" ? "💳 CARD" : "💵 CASH"}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", fontWeight: "600", color: "#fff" }}>
                        {item.settledBy}
                      </td>
                      <td>
                        {item.currentPendingAmount <= 0.01 ? (
                          <span style={{ color: "var(--accent-emerald)", fontWeight: "700", fontSize: "11px" }}>
                            ✓ FULLY CLEARED
                          </span>
                        ) : (
                          <span style={{ color: "var(--accent-rose)", fontWeight: "700", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            Due: ₹{item.currentPendingAmount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setViewBillTransaction({
                                ...item.tx,
                                type: "SETTLEMENT",
                                settleAmount: item.amountCollected,
                                settlePaymentMode: item.paymentMode,
                                settleTimestamp: item.timestamp,
                                remainingAfterSettle: item.currentPendingAmount,
                                originalGrandTotal: item.originalGrandTotal,
                                settledBy: item.settledBy,
                              });
                            }}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              color: "#38bdf8",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (onPrintSettlementBill) {
                                onPrintSettlementBill({
                                  ...item.tx,
                                  type: "SETTLEMENT",
                                  settleAmount: item.amountCollected,
                                  settlePaymentMode: item.paymentMode,
                                  settleTimestamp: item.timestamp,
                                  remainingAfterSettle: item.currentPendingAmount,
                                  originalGrandTotal: item.originalGrandTotal,
                                  settledBy: item.settledBy,
                                });
                              }
                            }}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "rgba(99, 102, 241, 0.15)",
                              border: "1px solid rgba(99, 102, 241, 0.4)",
                              color: "var(--accent-indigo)",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Printer size={12} /> Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Pending Transactions Table */
        <div className="table-panel" style={{ flex: 1, overflow: "auto" }}>
          {filteredPending.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <CheckCircle2 size={48} color="var(--accent-emerald)" />
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>
                No Pending Payments Found!
              </div>
              <div style={{ fontSize: "13px" }}>
                {allPendingTransactions.length === 0
                  ? "All customer bills are fully paid."
                  : "No pending Udhar bills match your selected date or account filters."}
              </div>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Date & Time</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Billed By</th>
                  <th>Original Bill</th>
                  <th>Pending Amount Due</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((tx) => {
                  const amtDue = tx.pendingAmount !== undefined ? tx.pendingAmount : tx.grandTotal;
                  const cleanPhone = (tx.customerPhone || "").replace(/\D/g, "");
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const storeName = settings?.storeName || "ROYAL FASHION MALL";
                  const storeAddress = [settings?.address, settings?.city].filter(Boolean).join(", ") || "Main Market Road, City Center";
                  const cleanName = getCleanName(tx.customerName);

                  const waMsgEng = `Dear ${cleanName},\nGentle reminder from ${storeName}. Your pending due balance for Bill No: ${tx.billNo} is ₹${amtDue.toFixed(2)}.\n\nKindly settle your payment when convenient.\n📍 Address: ${storeAddress}\nThank you! 🙏`;
                  const waMsgHin = `प्रिय ${cleanName},\n${storeName} से विनम्र सूचना। आपके बिल संख्या: ${tx.billNo} की बकाया राशि ₹${amtDue.toFixed(2)} है।\n\nकृपया सुविधा अनुसार भुगतान करें।\n📍 पता: ${storeAddress}\nधन्यवाद! 🙏`;

                  const waUrlEng = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMsgEng)}`;
                  const waUrlHin = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMsgHin)}`;

                  return (
                    <tr key={tx.id || tx.billNo}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                        {tx.billNo}
                      </td>
                      <td>
                        {new Date(tx.timestamp).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td style={{ fontWeight: "600" }}>{cleanName}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                            {tx.customerPhone || "N/A"}
                          </span>
                          {cleanPhone.length === 10 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MessageCircle size={12} color="#25D366" />
                              <a
                                href={waUrlEng}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "800",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(59, 130, 246, 0.15)",
                                  color: "var(--accent-blue)",
                                  border: "1px solid rgba(59, 130, 246, 0.4)",
                                  textDecoration: "none"
                                }}
                                title="Send English Reminder"
                              >
                                ENG
                              </a>
                              <a
                                href={waUrlHin}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "9px",
                                  fontWeight: "800",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(245, 158, 11, 0.15)",
                                  color: "var(--accent-amber)",
                                  border: "1px solid rgba(245, 158, 11, 0.4)",
                                  textDecoration: "none"
                                }}
                                title="Send Hindi Reminder"
                              >
                                HIN
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{tx.workerName || "Store Owner"}</td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        ₹{(tx.grandTotal || 0).toFixed(2)}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: "800", color: "var(--accent-rose)", fontFamily: "var(--font-mono)", fontSize: "15px" }}>
                              ₹{amtDue.toFixed(2)}
                            </span>
                            {tx.paymentStatus === "PARTIALLY_PAID" && (
                              <span style={{
                                fontSize: "9px",
                                fontWeight: "800",
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "var(--accent-amber)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                padding: "1px 5px",
                                borderRadius: "4px",
                              }}>
                                PARTIAL
                              </span>
                            )}
                          </div>
                          {tx.paymentStatus === "PARTIALLY_PAID" && tx.grandTotal > 0 && (
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              <div style={{ background: "var(--border-color)", borderRadius: "4px", height: "4px", width: "100%", marginTop: "2px" }}>
                                <div style={{
                                  height: "4px",
                                  borderRadius: "4px",
                                  background: "linear-gradient(90deg, var(--accent-emerald), #059669)",
                                  width: `${Math.min(100, ((tx.grandTotal - amtDue) / tx.grandTotal) * 100).toFixed(0)}%`,
                                }} />
                              </div>
                              <span style={{ marginTop: "2px", display: "block" }}>
                                ₹{(tx.grandTotal - amtDue).toFixed(2)} paid / ₹{tx.grandTotal.toFixed(2)} total
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setViewBillTransaction(tx)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              color: "#38bdf8",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            onClick={() => handleOpenSettleModal(tx)}
                            style={{
                              background: "linear-gradient(135deg, var(--accent-emerald), #059669)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 14px",
                              fontWeight: "700",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Settle / Receive Payment</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment Settlement & Complete Bill Details Modal */}
      {selectedTxToSettle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", borderRadius: "18px" }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
              <div>
                <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
                  <Receipt size={22} color="var(--accent-emerald)" />
                  Bill Details & Udhar Settlement
                </h3>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Bill No: <strong style={{ color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>{selectedTxToSettle.billNo}</strong> • Date: {new Date(selectedTxToSettle.timestamp).toLocaleString("en-GB")}
                </div>
              </div>
              <button
                onClick={() => setSelectedTxToSettle(null)}
                style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "14px" }}>
              {/* Customer & Cashier Header Info */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>
                    Customer Details
                  </div>
                  <div style={{ fontSize: "14px", color: "#fff", fontWeight: "700", marginTop: "2px" }}>
                    {selectedTxToSettle.customerName || "Udhar Customer"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--accent-amber)", fontFamily: "var(--font-mono)", fontWeight: "bold", marginTop: "2px" }}>
                    📱 {selectedTxToSettle.customerPhone || "No Phone"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>
                    Billed By Staff / Cashier
                  </div>
                  <div style={{ fontSize: "13px", color: "#fff", fontWeight: "600", marginTop: "2px" }}>
                    👤 {selectedTxToSettle.workerName || "Store Owner"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--accent-rose)", fontWeight: "800", marginTop: "4px" }}>
                    Pending Balance Due: ₹{(selectedTxToSettle.pendingAmount !== undefined ? selectedTxToSettle.pendingAmount : selectedTxToSettle.grandTotal)?.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Billed Items Table */}
              <div style={{ background: "rgba(15, 23, 42, 0.4)", borderRadius: "12px", border: "1px solid var(--border-color)", padding: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "700", marginBottom: "8px", textTransform: "uppercase" }}>
                  Purchased Items ({selectedTxToSettle.items?.length || 0})
                </div>
                <table className="custom-table" style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 8px" }}>Item Description</th>
                      <th style={{ padding: "6px 8px", textAlign: "center" }}>Qty</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Price</th>
                      <th style={{ padding: "6px 8px", textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTxToSettle.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "6px 8px", fontWeight: "600", color: "#fff" }}>{item.name}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center" }}>{item.qty}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>₹{(item.price || 0).toFixed(2)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "700", color: "var(--accent-emerald)" }}>
                          ₹{((item.qty || 1) * (item.price || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bill Totals Summary */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.4)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                  <span>Original Bill Subtotal:</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>₹{(selectedTxToSettle.subtotal || selectedTxToSettle.grandTotal || 0).toFixed(2)}</span>
                </div>
                {selectedTxToSettle.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-rose)" }}>
                    <span>Discount Applied:</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>-₹{(selectedTxToSettle.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", color: "#fff", fontSize: "14px", borderTop: "1px dashed var(--border-color)", paddingTop: "6px" }}>
                  <span>Original Grand Total:</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>₹{(selectedTxToSettle.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "var(--accent-rose)", fontSize: "13px" }}>
                  <span>Remaining Balance Due NOW:</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    ₹{(selectedTxToSettle.pendingAmount !== undefined ? selectedTxToSettle.pendingAmount : selectedTxToSettle.grandTotal)?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Past Partial Payment History */}
              {selectedTxToSettle.settledHistory && selectedTxToSettle.settledHistory.length > 0 && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--accent-emerald)", fontWeight: "800", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={14} />
                    Past Partial Payments ({selectedTxToSettle.settledHistory.length})
                  </div>
                  {selectedTxToSettle.settledHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(15, 23, 42, 0.4)",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ color: "var(--text-muted)" }}>
                          {new Date(entry.timestamp).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        <span style={{ color: "#fff", fontWeight: "600" }}>
                          via {entry.paymentMode} &nbsp;•&nbsp; by {entry.settledBy}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "800", color: "var(--accent-emerald)", fontSize: "14px" }}>
                        +₹{(entry.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", color: "var(--text-muted)", borderTop: "1px dashed var(--border-color)", paddingTop: "6px" }}>
                    <span>Total Already Paid:</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                      ₹{selectedTxToSettle.settledHistory.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Settlement Form Panel */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}
              >
                <div style={{ fontWeight: "800", fontSize: "14px", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <DollarSign size={18} />
                  <span>Receive Payment & Clear Balance</span>
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0 }}>Amount Receiving Today (₹)</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setSettleAmount((selectedTxToSettle.pendingAmount !== undefined ? selectedTxToSettle.pendingAmount : selectedTxToSettle.grandTotal).toString())}
                        style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "var(--accent-emerald)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                      >
                        Full Due (₹{(selectedTxToSettle.pendingAmount !== undefined ? selectedTxToSettle.pendingAmount : selectedTxToSettle.grandTotal).toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleAmount(((selectedTxToSettle.pendingAmount !== undefined ? selectedTxToSettle.pendingAmount : selectedTxToSettle.grandTotal) / 2).toFixed(2))}
                        style={{ padding: "2px 8px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "var(--accent-amber)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                      >
                        50% Half
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: "18px", fontWeight: "bold", color: "var(--accent-emerald)" }}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                  />

                  {/* Live Remaining Balance Preview */}
                  {(() => {
                    const amtDue = selectedTxToSettle.pendingAmount !== undefined
                      ? selectedTxToSettle.pendingAmount
                      : selectedTxToSettle.grandTotal;
                    const paying = parseFloat(settleAmount) || 0;
                    const remaining = Math.max(0, amtDue - paying);
                    const isFullPay = paying >= amtDue - 0.01 && paying > 0;
                    const isPartial = paying > 0 && paying < amtDue - 0.01;
                    const isOver = paying > amtDue + 0.01;
                    return paying > 0 ? (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: isOver
                            ? "rgba(239, 68, 68, 0.12)"
                            : isFullPay
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(245, 158, 11, 0.12)",
                          border: `1px solid ${isOver
                              ? "rgba(239, 68, 68, 0.5)"
                              : isFullPay
                                ? "rgba(16, 185, 129, 0.4)"
                                : "rgba(245, 158, 11, 0.4)"
                            }`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "13px",
                          fontWeight: "700",
                        }}
                      >
                        <span style={{ color: isOver ? "var(--accent-rose)" : isFullPay ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                          {isOver ? "⚠️ Amount exceeds balance!" : isFullPay ? "✅ Full payment — bill cleared!" : `🕐 Partial — ₹${remaining.toFixed(2)} will remain pending`}
                        </span>
                        {isPartial && (
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-rose)", fontSize: "14px" }}>
                            Due after: ₹{remaining.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: "700" }}>Payment Collection Mode</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setSettlePaymentMode("CASH")}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: settlePaymentMode === "CASH" ? "rgba(245, 158, 11, 0.2)" : "rgba(15,23,42,0.6)",
                        border: `1px solid ${settlePaymentMode === "CASH" ? "var(--accent-amber)" : "var(--border-color)"}`,
                        color: settlePaymentMode === "CASH" ? "var(--accent-amber)" : "var(--text-muted)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontWeight: "700"
                      }}
                    >
                      <Banknote size={22} color={settlePaymentMode === "CASH" ? "var(--accent-amber)" : undefined} />
                      <span style={{ fontSize: "12px" }}>Cash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettlePaymentMode("UPI")}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: settlePaymentMode === "UPI" ? "rgba(59, 130, 246, 0.2)" : "rgba(15,23,42,0.6)",
                        border: `1px solid ${settlePaymentMode === "UPI" ? "var(--accent-blue)" : "var(--border-color)"}`,
                        color: settlePaymentMode === "UPI" ? "var(--accent-blue)" : "var(--text-muted)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontWeight: "700"
                      }}
                    >
                      <QrCode size={22} color={settlePaymentMode === "UPI" ? "var(--accent-blue)" : undefined} />
                      <span style={{ fontSize: "12px" }}>UPI / QR Scan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettlePaymentMode("CARD")}
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        background: settlePaymentMode === "CARD" ? "rgba(139, 92, 246, 0.2)" : "rgba(15,23,42,0.6)",
                        border: `1px solid ${settlePaymentMode === "CARD" ? "var(--accent-purple)" : "var(--border-color)"}`,
                        color: settlePaymentMode === "CARD" ? "var(--accent-purple)" : "var(--text-muted)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontWeight: "700"
                      }}
                    >
                      <CreditCard size={22} color={settlePaymentMode === "CARD" ? "var(--accent-purple)" : undefined} />
                      <span style={{ fontSize: "12px" }}>Card / POS</span>
                    </button>
                  </div>
                </div>

                {/* UPI QR & Payment String Box */}
                {settlePaymentMode === "UPI" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                    <div style={{ background: "#fff", padding: "12px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
                      {settings?.customQrImage ? (
                        <img src={settings.customQrImage} alt="Store Payment QR" style={{ width: "150px", height: "150px", objectFit: "contain" }} />
                      ) : (
                        <QRCodeSVG
                          value={`upi://pay?pa=${encodeURIComponent(settings?.upiId || "royalfashion@upi")}&pn=${encodeURIComponent(settings?.upiName || "Royal Fashion Mall")}&am=${(parseFloat(settleAmount) || 0).toFixed(2)}&tr=${selectedTxToSettle.billNo}&cu=INR`}
                          size={140}
                          level="H"
                        />
                      )}
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "6px", fontWeight: "700" }}>
                        GPay • PhonePe • Paytm • BHIM
                      </div>
                    </div>

                    <div style={{ width: "100%" }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>UPI Ref / Tx ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={upiRefNo}
                        onChange={(e) => setUpiRefNo(e.target.value)}
                        style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </div>
                )}

                {/* CASH Calculator & Change Returned Box */}
                {settlePaymentMode === "CASH" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Cash Tendered by Customer (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ fontSize: "16px", fontWeight: "bold", color: "var(--accent-amber)" }}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {[
                        Math.ceil(parseFloat(settleAmount) || 0),
                        Math.ceil((parseFloat(settleAmount) || 0) / 100) * 100,
                        500,
                        2000
                      ].map((amt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashTendered(amt.toString())}
                          style={{ flex: 1, padding: "4px", borderRadius: "6px", background: "var(--bg-primary)", border: "1px solid var(--border-color)", color: "#fff", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(16, 185, 129, 0.15)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                      <span style={{ fontSize: "12px", color: "var(--accent-emerald)", fontWeight: "700" }}>Change Return to Customer:</span>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                        ₹{Math.max(0, (parseFloat(cashTendered) || 0) - (parseFloat(settleAmount) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* CARD Reference Box */}
                {settlePaymentMode === "CARD" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(15, 23, 42, 0.5)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                    <label className="form-label" style={{ fontSize: "11px" }}>Card / POS Machine Approval Ref No.</label>
                    <input
                      type="text"
                      className="form-control"
                      value={cardRefNo}
                      onChange={(e) => setCardRefNo(e.target.value)}
                      style={{ fontSize: "12px", fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleConfirmSettle(false)}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      minWidth: "140px",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, var(--accent-emerald), #059669)",
                      color: "#fff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <CheckCircle2 size={17} />
                    <span>{isSubmitting ? "Processing..." : "Save Payment"}</span>
                  </button>

                  <button
                    onClick={() => handleConfirmSettle(true)}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      minWidth: "160px",
                      padding: "12px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                      color: "#fff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Printer size={17} />
                    <span>{isSubmitting ? "Processing..." : "Save & Print Receipt"}</span>
                  </button>

                  <button
                    onClick={() => setSelectedTxToSettle(null)}
                    style={{
                      padding: "12px 18px",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-muted)",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => setViewBillTransaction(selectedTxToSettle)}
                    style={{
                      padding: "12px 18px",
                      borderRadius: "10px",
                      background: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#38bdf8",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Eye size={15} />
                    View Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
