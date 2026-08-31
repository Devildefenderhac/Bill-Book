import React, { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle,
  UserCheck,
  Phone,
  Calculator,
  Zap,
  RefreshCw,
  History,
  Clock,
  LayoutDashboard,
  Eye,
  Sparkles,
  Coins,
  Tag,
  Percent,
} from "lucide-react";
import ReturnModal from "./ReturnModal";
import PendingPaymentsView from "./PendingPaymentsView";
import ViewBillModal from "./ViewBillModal";

export default function BillingView({
  products = [],
  cart = [],
  setCart = () => { },
  currentBillNo = "BILL-22072026-0001",
  onInitiatePayment = () => { },
  transactions = [],
  currentUser = null,
  settings = {},
  onCancelBill = () => { },
  onUncancelBill = () => { },
  onReturnBill = () => { },
  onReprintBill = () => { },
  onOpenHistory = () => { },
  onNavigateTab,
}) {
  const [activeTab, setActiveTab] = useState("new_bill");
  const [mobileBillingTab, setMobileBillingTab] = useState("entry");
  const [showTips, setShowTips] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [returnModalTransaction, setReturnModalTransaction] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [viewBillTransaction, setViewBillTransaction] = useState(null);

  const [itemPriceInput, setItemPriceInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [discountInput, setDiscountInput] = useState("");
  const [customTotalInput, setCustomTotalInput] = useState("");

  const [heldCarts, setHeldCarts] = useState([]);

  const handleHoldCart = () => {
    if (cart.length === 0) {
      alert("Cannot hold an empty cart!");
      return;
    }
    const newHeld = {
      id: `held-${Date.now()}`,
      cart,
      discountInput,
      customTotalInput,
      customerName,
      customerPhone,
      timestamp: new Date(),
    };
    setHeldCarts((prev) => [newHeld, ...prev]);
    handleClearCart();
    setCustomerName("");
    setCustomerPhone("");
  };

  const handleResumeCart = (held) => {
    if (cart.length > 0) {
      const confirm = window.confirm("⚠️ You have items in your active cart. Do you want to overwrite it with the held cart?");
      if (!confirm) return;
    }
    setCart(held.cart);
    setDiscountInput(held.discountInput);
    setCustomTotalInput(held.customTotalInput);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setHeldCarts((prev) => prev.filter((c) => c.id !== held.id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Smart formatter: hides .00 in UI but keeps decimals if needed
  const fmt = (num) => {
    const n = parseFloat(num) || 0;
    return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
  };

  // Shared: scale item prices to match a target total
  const scaleItemsToTotal = (targetTotal, currentCart) => {
    const curSubtotal = currentCart.reduce((sum, item) => sum + item.total, 0);
    if (!targetTotal || targetTotal <= 0 || curSubtotal <= 0 || currentCart.length === 0) return currentCart;
    const scaleFactor = targetTotal / curSubtotal;
    return currentCart.map((item) => {
      const adjustedPrice = Math.round(item.price * scaleFactor * 100) / 100;
      return { ...item, price: adjustedPrice, total: item.qty * adjustedPrice };
    });
  };

  // Add Item by Price
  const handleAddItem = (priceVal = null, customName = null) => {
    const price = parseFloat(priceVal !== null ? priceVal : itemPriceInput);
    if (!price || isNaN(price) || price <= 0) return;

    const itemNum = cart.length + 1;
    const name = customName || itemNameInput.trim() || `Item ${itemNum}`;

    setCart((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        name: name,
        price: price,
        qty: 1,
        total: price,
      },
    ]);

    setItemPriceInput("");
    setItemNameInput("");
  };

  // Direct edit of item price in cart list
  const handleUpdateItemPrice = (index, newPriceVal) => {
    const newPrice = parseFloat(newPriceVal) || 0;
    setCart((prev) => {
      const copy = [...prev];
      copy[index].price = newPrice;
      copy[index].total = copy[index].qty * newPrice;
      return copy;
    });
  };

  const handleUpdateQty = (index, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[index].qty + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index].qty = newQty;
      copy[index].total = newQty * copy[index].price;
      return copy;
    });
  };

  const handleRemoveItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountInput("");
    setCustomTotalInput("");
  };

  // Keep custom total in sync when subtotal or discount changes
  useEffect(() => {
    const rawDisc = parseFloat(discountInput) || 0;
    if (rawDisc > subtotal && subtotal > 0) {
      setDiscountInput(fmt(subtotal));
      setCustomTotalInput("0");
    } else {
      const disc = Math.min(Math.max(0, rawDisc), subtotal);
      const calcTotal = Math.max(0, subtotal - disc);
      setCustomTotalInput(calcTotal > 0 ? fmt(calcTotal) : (subtotal > 0 && disc >= subtotal ? "0" : ""));
    }
  }, [subtotal, discountInput]);

  // Handle Flat Discount - capped at subtotal
  const handleDiscountChange = (val) => {
    if (val === "" || val === undefined) {
      setDiscountInput("");
      setCustomTotalInput(subtotal > 0 ? fmt(subtotal) : "");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setDiscountInput("0");
      setCustomTotalInput(subtotal > 0 ? fmt(subtotal) : "0");
      return;
    }
    const cappedDisc = Math.min(num, subtotal);
    setDiscountInput(val.endsWith('.') ? val : (num > subtotal ? fmt(cappedDisc) : val));
    const newTotal = Math.max(0, subtotal - cappedDisc);
    setCustomTotalInput(newTotal > 0 ? fmt(newTotal) : "0");
  };

  // Handle Total Payment edit - just update discount display
  const handleCustomTotalChange = (val) => {
    setCustomTotalInput(val);
    const targetTotal = parseFloat(val);
    if (isNaN(targetTotal) || targetTotal < 0) {
      if (subtotal > 0) setDiscountInput(fmt(subtotal));
      return;
    }
    if (subtotal > 0) {
      if (targetTotal >= subtotal) {
        setDiscountInput("0");
      } else {
        const calcDiscount = Math.max(0, subtotal - targetTotal);
        setDiscountInput(calcDiscount > 0 ? fmt(calcDiscount) : "0");
      }
    }
  };

  // Manual button: Scale item prices to match target Total Payment
  const handleScaleItemPricesToTotal = () => {
    const targetTotal = parseFloat(customTotalInput);
    if (!targetTotal || targetTotal <= 0 || subtotal <= 0 || cart.length === 0) return;
    setCart((prev) => scaleItemsToTotal(targetTotal, prev));
    setDiscountInput("0");
  };

  const rawDiscountVal = parseFloat(discountInput) || 0;
  const discountVal = Math.min(Math.max(0, rawDiscountVal), subtotal);
  const grandTotal = Math.max(0, subtotal - discountVal);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onInitiatePayment({
      cart,
      subtotal,
      discount: discountVal,
      grandTotal,
      customerName,
      customerPhone,
      billNo: currentBillNo,
    });
  };

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local

  const myHistory = (transactions || []).filter((t) => {
    if (!t || !t.timestamp) return false;
    const txDate = new Date(t.timestamp).toLocaleDateString("en-CA");
    return txDate === todayStr;
  });

  const todayReceivedAmount = myHistory.reduce(
    (sum, t) => sum + (t.status === "CANCELLED" ? 0 : t.grandTotal || 0),
    0
  );

  const todayCashAmount = myHistory.reduce(
    (sum, t) => sum + (t.status === "CANCELLED" || (t.paymentMode && t.paymentMode.toUpperCase() !== "CASH") ? 0 : t.grandTotal || 0),
    0
  );

  const todayUpiAmount = myHistory.reduce(
    (sum, t) => sum + (t.status === "CANCELLED" || (t.paymentMode && t.paymentMode.toUpperCase() !== "UPI") ? 0 : t.grandTotal || 0),
    0
  );

  const todayCardAmount = myHistory.reduce(
    (sum, t) => sum + (t.status === "CANCELLED" || (t.paymentMode && t.paymentMode.toUpperCase() !== "CARD") ? 0 : t.grandTotal || 0),
    0
  );

  const todayPendingAmount = myHistory.reduce(
    (sum, t) =>
      sum +
      (t.status === "CANCELLED" ||
        (t.paymentStatus !== "PENDING" &&
          t.paymentStatus !== "PARTIALLY_PAID" &&
          t.paymentMode !== "PENDING" &&
          (t.pendingAmount === undefined || t.pendingAmount <= 0))
        ? 0
        : t.pendingAmount !== undefined
          ? t.pendingAmount
          : t.grandTotal || 0),
    0
  );

  const filteredHistory = myHistory.filter((t) => {
    if (historyFilter === "ALL") return true;
    if (historyFilter === "CASH") return t.status !== "CANCELLED" && t.paymentMode && t.paymentMode.toUpperCase() === "CASH";
    if (historyFilter === "UPI") return t.status !== "CANCELLED" && t.paymentMode && t.paymentMode.toUpperCase() === "UPI";
    if (historyFilter === "CARD") return t.status !== "CANCELLED" && t.paymentMode && t.paymentMode.toUpperCase() === "CARD";
    if (historyFilter === "PENDING") {
      return (
        t.status !== "CANCELLED" &&
        (t.paymentMode === "PENDING" ||
          t.paymentStatus === "PENDING" ||
          t.paymentStatus === "PARTIALLY_PAID" ||
          (t.pendingAmount !== undefined && t.pendingAmount > 0))
      );
    }
    return true;
  });

  return (
    <div className="billing-view-root" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "100%", height: "100%", boxSizing: "border-box" }}>
      {/* Top Bar with Active User Badge, Today's Sales Breakdown & Tabs */}
      <div className="billing-top-control-bar" style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        {/* Full-Width Symmetrical Top Nav Buttons */}
        <div className="billing-nav-buttons-bar" style={{ display: "flex", gap: "8px", width: "100%", boxSizing: "border-box" }}>
          <button
            className={`billing-nav-btn ${activeTab === "new_bill" ? "active-blue" : ""}`}
            onClick={() => setActiveTab("new_bill")}
            style={{
              flex: "1 1 0",
              justifyContent: "center",
              textAlign: "center",
              background: activeTab === "new_bill" ? "var(--accent-blue)" : "var(--bg-card)",
              color: activeTab === "new_bill" ? "#fff" : "var(--text-muted)",
              border: activeTab === "new_bill" ? "none" : "1px solid var(--border-color)",
              padding: "8px 12px",
              fontSize: "clamp(12px, 2.5vw, 13.5px)",
              fontWeight: "700",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <ShoppingCart size={15} />
            <span>New Bill</span>
          </button>

          <button
            className={`billing-nav-btn ${activeTab === "history" ? "active-indigo" : ""}`}
            onClick={() => {
              setActiveTab("history");
              setHistoryFilter("ALL");
            }}
            style={{
              flex: "1 1 0",
              justifyContent: "center",
              textAlign: "center",
              background: activeTab === "history" ? "var(--accent-indigo)" : "var(--bg-card)",
              color: activeTab === "history" ? "#fff" : "var(--text-muted)",
              border: activeTab === "history" ? "none" : "1px solid var(--border-color)",
              padding: "8px 12px",
              fontSize: "clamp(12px, 2.5vw, 13.5px)",
              fontWeight: "700",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <History size={15} />
            <span>History ({myHistory.length})</span>
          </button>

          <button
            className="billing-nav-btn pending-btn"
            onClick={() => {
              if (typeof onNavigateTab === "function") {
                onNavigateTab("pending");
              } else {
                setShowPendingModal(true);
              }
            }}
            style={{
              flex: "1 1 0",
              justifyContent: "center",
              textAlign: "center",
              background: "rgba(245, 158, 11, 0.15)",
              color: "var(--accent-amber)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              padding: "8px 12px",
              fontSize: "clamp(12px, 2.5vw, 13.5px)",
              fontWeight: "700",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <Clock size={15} color="var(--accent-amber)" />
            <span>Udhar Bills</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", whiteSpace: "nowrap", maxWidth: "100%", paddingBottom: "2px" }}>
          {/* Working ALL / Today Total Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setHistoryFilter("ALL");
            }}
            title="Click to view all bills (Show All)"
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              background: activeTab === "history" && historyFilter === "ALL" ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)",
              border: activeTab === "history" && historyFilter === "ALL" ? "1.5px solid var(--accent-emerald)" : "1px solid rgba(16, 185, 129, 0.4)",
              color: "var(--accent-emerald)",
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "history" && historyFilter === "ALL" ? "0 0 8px rgba(16, 185, 129, 0.4)" : "none",
            }}
          >
            <span>Today Total:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "800" }}>
              ₹{todayReceivedAmount.toFixed(2)}
            </span>
          </button>

          {/* Cash Filter Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setHistoryFilter("CASH");
            }}
            title="Click to filter Cash bills"
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              background: activeTab === "history" && historyFilter === "CASH" ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.15)",
              border: activeTab === "history" && historyFilter === "CASH" ? "1.5px solid var(--accent-amber)" : "1px solid rgba(245, 158, 11, 0.4)",
              color: "var(--accent-amber)",
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "history" && historyFilter === "CASH" ? "0 0 8px rgba(245, 158, 11, 0.4)" : "none",
            }}
          >
            <span>Cash:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "800" }}>
              ₹{todayCashAmount.toFixed(2)}
            </span>
          </button>

          {/* UPI Filter Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setHistoryFilter("UPI");
            }}
            title="Click to filter UPI bills"
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              background: activeTab === "history" && historyFilter === "UPI" ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.15)",
              border: activeTab === "history" && historyFilter === "UPI" ? "1.5px solid var(--accent-blue)" : "1px solid rgba(59, 130, 246, 0.4)",
              color: "var(--accent-blue)",
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "history" && historyFilter === "UPI" ? "0 0 8px rgba(59, 130, 246, 0.4)" : "none",
            }}
          >
            <span>UPI:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "800" }}>
              ₹{todayUpiAmount.toFixed(2)}
            </span>
          </button>

          {/* Pending Amount Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setHistoryFilter("PENDING");
            }}
            title="Click to filter Pending Udhar bills"
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              background: activeTab === "history" && historyFilter === "PENDING" ? "rgba(244, 63, 94, 0.3)" : "rgba(244, 63, 94, 0.15)",
              border: activeTab === "history" && historyFilter === "PENDING" ? "1.5px solid var(--accent-rose)" : "1px solid rgba(244, 63, 94, 0.4)",
              color: "var(--accent-rose)",
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "history" && historyFilter === "PENDING" ? "0 0 8px rgba(244, 63, 94, 0.4)" : "none",
            }}
          >
            <span>Pending:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "800" }}>
              ₹{todayPendingAmount.toFixed(2)}
            </span>
          </button>

          {/* Card Received Badge */}
          {todayCardAmount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                setHistoryFilter("CARD");
              }}
              title="Click to filter Card bills"
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                background: activeTab === "history" && historyFilter === "CARD" ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.15)",
                border: activeTab === "history" && historyFilter === "CARD" ? "1.5px solid var(--accent-purple)" : "1px solid rgba(139, 92, 246, 0.4)",
                color: "var(--accent-purple)",
                fontSize: "12px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: activeTab === "history" && historyFilter === "CARD" ? "0 0 8px rgba(139, 92, 246, 0.4)" : "none",
              }}
            >
              <span>Card:</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "800" }}>
                ₹{todayCardAmount.toFixed(2)}
              </span>
            </button>
          )}

          <div
            onClick={onOpenHistory}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              background: currentUser?.role === "owner" ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.15)",
              border: `1px solid ${currentUser?.role === "owner" ? "rgba(245, 158, 11, 0.4)" : "rgba(99, 102, 241, 0.4)"}`,
              color: currentUser?.role === "owner" ? "var(--accent-amber)" : "var(--accent-indigo)",
              fontSize: "12px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}>
            <UserCheck size={14} />
            <span>Account: {currentUser?.name || "Store Owner"}</span>
          </div>
        </div>
      </div>

      <ReturnModal
        isOpen={!!returnModalTransaction}
        onClose={() => setReturnModalTransaction(null)}
        transaction={returnModalTransaction}
        onReturnBill={onReturnBill}
      />

      {activeTab === "history" ? (
        <div className="table-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div className="panel-title" style={{ margin: 0 }}>My Bill History</div>

            {/* History Filter Pills */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setHistoryFilter("ALL")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: historyFilter === "ALL" ? "1px solid var(--accent-emerald)" : "1px solid var(--border-color)",
                  background: historyFilter === "ALL" ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.5)",
                  color: historyFilter === "ALL" ? "var(--accent-emerald)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                All ({myHistory.length})
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("CASH")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: historyFilter === "CASH" ? "1px solid var(--accent-amber)" : "1px solid var(--border-color)",
                  background: historyFilter === "CASH" ? "rgba(245, 158, 11, 0.2)" : "rgba(30, 41, 59, 0.5)",
                  color: historyFilter === "CASH" ? "var(--accent-amber)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                Cash ({myHistory.filter(t => t.status !== "CANCELLED" && t.paymentMode && t.paymentMode.toUpperCase() === "CASH").length})
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("UPI")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: historyFilter === "UPI" ? "1px solid var(--accent-blue)" : "1px solid var(--border-color)",
                  background: historyFilter === "UPI" ? "rgba(59, 130, 246, 0.2)" : "rgba(30, 41, 59, 0.5)",
                  color: historyFilter === "UPI" ? "var(--accent-blue)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                UPI ({myHistory.filter(t => t.status !== "CANCELLED" && t.paymentMode && t.paymentMode.toUpperCase() === "UPI").length})
              </button>

              <button
                type="button"
                onClick={() => setHistoryFilter("PENDING")}
                style={{
                  padding: "4px 12px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: historyFilter === "PENDING" ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                  background: historyFilter === "PENDING" ? "rgba(244, 63, 94, 0.2)" : "rgba(30, 41, 59, 0.5)",
                  color: historyFilter === "PENDING" ? "var(--accent-rose)" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                Pending Udhar ({myHistory.filter(t => t.status !== "CANCELLED" && (t.paymentMode === "PENDING" || t.paymentStatus === "PENDING" || t.paymentStatus === "PARTIALLY_PAID" || (t.pendingAmount !== undefined && t.pendingAmount > 0))).length})
              </button>
            </div>
          </div>
          <div className="table-responsive" style={{ marginTop: "16px" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment Mode / Proof</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((tx, idx) => (
                  <tr key={tx.id || tx.billNo + tx.timestamp + idx}>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                      {tx.billNo}
                    </td>
                    <td>
                      {new Date(tx.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "#fff", fontWeight: "700" }}>{tx.customerName || "Walk-in Customer"}</span>
                        {tx.customerPhone && (
                          <span style={{ fontSize: "10.5px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {tx.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: "700", color: tx.type === 'RETURN' ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {tx.type === 'RETURN' ? '-' : ''}₹{Math.abs(tx.grandTotal).toFixed(2)}
                    </td>
                    <td>
                      {(() => {
                        const mode = (tx.paymentMode || "CASH").toUpperCase();
                        const isUdhar = tx.paymentMode === "PENDING" || tx.paymentStatus === "PENDING" || tx.paymentStatus === "PARTIALLY_PAID" || (tx.pendingAmount !== undefined && tx.pendingAmount > 0);

                        let label = mode;
                        let badgeBg = "rgba(148, 163, 184, 0.15)";
                        let badgeColor = "#94a3b8";
                        let proofText = null;

                        if (isUdhar) {
                          label = tx.paymentStatus === "PARTIALLY_PAID" ? "⏳ PARTIAL UDHAR" : "⏳ PENDING UDHAR";
                          badgeBg = "rgba(244, 63, 94, 0.15)";
                          badgeColor = "var(--accent-rose)";
                          const due = tx.pendingAmount !== undefined ? tx.pendingAmount : tx.grandTotal;
                          proofText = `Due: ₹${(due || 0).toFixed(2)}`;
                        } else if (mode === "CASH") {
                          label = "💵 CASH";
                          badgeBg = "rgba(245, 158, 11, 0.15)";
                          badgeColor = "var(--accent-amber)";
                          if (tx.cashTendered) {
                            proofText = `Paid: ₹${tx.cashTendered}`;
                          }
                        } else if (mode === "UPI") {
                          label = "📱 UPI";
                          badgeBg = "rgba(59, 130, 246, 0.15)";
                          badgeColor = "var(--accent-blue)";
                          if (tx.upiRefNo) {
                            proofText = `Ref: ${tx.upiRefNo}`;
                          }
                        } else if (mode === "CARD") {
                          label = "💳 CARD";
                          badgeBg = "rgba(168, 85, 247, 0.15)";
                          badgeColor = "#c084fc";
                          if (tx.cardRefNo) {
                            proofText = `Ref: ${tx.cardRefNo}`;
                          }
                        }

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                width: "fit-content",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "700",
                                background: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {label}
                            </span>
                            {proofText && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
                                {proofText}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background:
                            tx.status === "RETURNED" || tx.type === "RETURN"
                              ? "rgba(244, 63, 94, 0.15)"
                              : tx.status === "PARTIALLY_RETURNED"
                                ? "rgba(245, 158, 11, 0.15)"
                                : tx.status === "COMPLETED"
                                  ? "rgba(16,185,129,0.15)"
                                  : "rgba(244, 63, 94, 0.15)",
                          color:
                            tx.status === "RETURNED" || tx.type === "RETURN"
                              ? "var(--accent-rose)"
                              : tx.status === "PARTIALLY_RETURNED"
                                ? "var(--accent-amber)"
                                : tx.status === "COMPLETED"
                                  ? "var(--accent-emerald)"
                                  : "var(--accent-rose)",
                          border:
                            tx.status === "RETURNED" || tx.type === "RETURN"
                              ? "1px solid rgba(244, 63, 94, 0.4)"
                              : tx.status === "PARTIALLY_RETURNED"
                                ? "1px solid rgba(245, 158, 11, 0.4)"
                                : tx.status === "COMPLETED"
                                  ? "1px solid rgba(16, 185, 129, 0.4)"
                                  : "1px solid rgba(244, 63, 94, 0.4)",
                        }}
                      >
                        {tx.status === "RETURNED" || tx.type === "RETURN"
                          ? "RETURNED"
                          : tx.status === "PARTIALLY_RETURNED"
                            ? "PARTIALLY RET"
                            : tx.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {tx.status === "CANCELLED" ? (
                          <>
                            {(currentUser?.role === "owner" || currentUser?.canCancelBills) && (
                              <button
                                onClick={() => onUncancelBill(tx.billNo, tx.id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  border: "1px solid rgba(16, 185, 129, 0.4)",
                                  color: "var(--accent-emerald)",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                Uncancel
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {(currentUser?.role === "owner" || currentUser?.canCancelBills) && (
                              <button
                                onClick={() => onCancelBill(tx.billNo, tx.id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  background: "rgba(244, 63, 94, 0.1)",
                                  border: "1px solid rgba(244, 63, 94, 0.3)",
                                  color: "var(--accent-rose)",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            )}
                            {tx.status !== "RETURNED" && tx.type !== "RETURN" && (
                              <button
                                onClick={() => setReturnModalTransaction(tx)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  background: "rgba(234, 179, 8, 0.1)",
                                  border: "1px solid rgba(234, 179, 8, 0.3)",
                                  color: "var(--accent-amber)",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Return
                              </button>
                            )}
                            <button
                              onClick={() => setViewBillTransaction(tx)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "4px",
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                color: "#38bdf8",
                                fontSize: "11px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <Eye size={11} />
                              View
                            </button>
                            <button
                              onClick={() => onReprintBill(tx)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "4px",
                                background: "rgba(99, 102, 241, 0.1)",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                color: "var(--accent-indigo)",
                                fontSize: "11px",
                              }}
                            >
                              Reprint
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                      {myHistory.length === 0
                        ? "No bills generated yet."
                        : `No ${historyFilter.toLowerCase()} bills found today.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {/* Mobile View Switcher (< 768px) */}
          <div className="mobile-pos-switcher">
            <button
              type="button"
              className={`mobile-pos-switcher-btn ${mobileBillingTab === "entry" ? "active" : ""}`}
              onClick={() => setMobileBillingTab("entry")}
            >
              <Zap size={15} />
              <span>1. Enter Price</span>
            </button>
            <button
              type="button"
              className={`mobile-pos-switcher-btn ${mobileBillingTab === "cart" ? "active" : ""}`}
              onClick={() => setMobileBillingTab("cart")}
            >
              <ShoppingCart size={15} />
              <span>
                2. Bill Cart ({cart.length}) {cart.length > 0 ? `• ₹${grandTotal.toFixed(0)}` : ""}
              </span>
            </button>
          </div>

          <div className="pos-grid">

            {/* Left Panel: Fast Item Price Entry */}
            <div className={`catalog-panel ${mobileBillingTab === "cart" ? "mobile-hidden-tab" : ""}`} style={{ gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={20} color="var(--accent-amber)" />
                  <span>Quick Item Price Entry</span>
                </h2>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Fast Counter Mode
                </span>
              </div>

              {/* Manual Item Price Input Card */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "2px solid var(--accent-indigo)",
                  borderRadius: "var(--radius-lg)",
                  padding: "clamp(12px, 3vw, 20px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="billing-input-grid">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "12px", fontWeight: "700" }}>Item Name (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Item 1, Jeans, Shirt"
                      style={{ padding: "10px 12px", fontSize: "14px" }}
                      value={itemNameInput}
                      onChange={(e) => setItemNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddItem();
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="form-label" style={{ fontSize: "12px", fontWeight: "800", color: "var(--accent-emerald-light)" }}>
                        Manual Item Price (₹)
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: "600" }}>
                        Press Enter ↵ to Add
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                      <div style={{ position: "relative", flex: "1 1 auto" }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "20px", fontWeight: "900", color: "var(--accent-emerald-light)" }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          style={{
                            fontSize: "clamp(20px, 4vw, 24px)",
                            fontWeight: "900",
                            color: "var(--accent-emerald-light)",
                            padding: "8px 12px 8px 32px",
                            width: "100%",
                            background: "var(--bg-primary)",
                            border: "1.5px solid var(--accent-emerald)",
                            boxShadow: "0 0 12px rgba(16, 185, 129, 0.15)",
                          }}
                          value={itemPriceInput}
                          onChange={(e) => setItemPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddItem();
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={() => handleAddItem()}
                        className="checkout-btn"
                        style={{ width: "auto", padding: "0 clamp(14px, 3vw, 22px)", fontSize: "14.5px", flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        <Plus size={18} />
                        <span>Add Item</span>
                      </button>
                    </div>

                    {/* 1-Tap Quick Amount Presets */}
                    <div className="denom-chips-row" style={{ marginTop: "8px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Quick ₹:
                      </span>
                      {[50, 100, 200, 500, 1000, 2000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          className="denom-chip"
                          onClick={() => {
                            setItemPriceInput(String(val));
                            if (!itemNameInput) setItemNameInput(`Item (₹${val})`);
                          }}
                          title={`Set price to ₹${val}`}
                        >
                          +₹{val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Mobile Cart Summary Bar */}
              {cart.length > 0 && (
                <div className="mobile-quick-cart-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="mobile-cart-badge">{cart.length}</div>
                    <div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Bill Total</div>
                      <div style={{ fontSize: "17px", fontWeight: "800", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)", lineHeight: "1.1" }}>
                        ₹{grandTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mobile-view-cart-btn"
                    onClick={() => setMobileBillingTab("cart")}
                  >
                    <ShoppingCart size={15} />
                    <span>View Bill & Pay ➔</span>
                  </button>
                </div>
              )}

              {/* Instructions (Collapsible on Mobile) */}
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: "1.5",
                }}
              >
                <div
                  onClick={() => setShowTips(!showTips)}
                  style={{
                    color: "var(--accent-blue)",
                    fontWeight: "700",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <span>💡 Smart Pricing & Discount Tips</span>
                  <span style={{ fontSize: "10px", color: "var(--accent-blue)" }}>{showTips ? "Hide ▲" : "Show ▼"}</span>
                </div>
                {showTips && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(59, 130, 246, 0.2)" }}>
                    • <strong>Editable Item Prices</strong>: Click & edit item prices directly in the cart list.<br />
                    • <strong>Editable Total Payment</strong>: Type target Total Payment (e.g. <code>1800</code> instead of <code>2000</code>) — discount auto-calculates!<br />
                    • <strong>Scale Item Prices</strong>: Click <strong>Adjust Prices</strong> to automatically update item prices to match the target total.
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Live Bill Summary & Customer Info */}
            <div className={`cart-panel ${mobileBillingTab === "entry" ? "mobile-hidden-tab" : ""}`}>
              <div className="cart-header">
                <div className="cart-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="mobile-back-to-input-btn"
                    onClick={() => setMobileBillingTab("entry")}
                    title="Back to enter more prices"
                  >
                    <Plus size={14} />
                    <span>Add More</span>
                  </button>
                  <ShoppingCart size={18} color="var(--accent-blue)" />
                  <span>Bill Receipt Items</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={handleHoldCart}
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: "rgba(245, 158, 11, 0.15)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "var(--accent-amber)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Put this active bill on hold to serve another customer"
                    >
                      Hold (Pause)
                    </button>
                  )}
                  <div className="bill-no-badge">{currentBillNo}</div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="customer-info-inputs-grid">
                <div style={{ position: "relative" }}>
                  <UserCheck
                    size={14}
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px 6px 28px",
                      fontSize: "11px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                    }}
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <Phone
                    size={14}
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px 6px 28px",
                      fontSize: "11px",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      color: "var(--text-main)",
                    }}
                  />
                </div>
              </div>

              {/* Held Carts Notification / Resume Panel */}
              {heldCarts.length > 0 && (
                <div style={{ background: "rgba(245, 158, 11, 0.08)", borderBottom: "1px solid rgba(245, 158, 11, 0.2)", padding: "10px 16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "900", color: "var(--accent-amber)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span>📥 HELD BILLS IN QUEUE ({heldCarts.length})</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {heldCarts.map((held) => (
                      <div key={held.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.6)", border: "1px solid var(--border-color)", padding: "6px 10px", borderRadius: "6px" }}>
                        <div style={{ fontSize: "11px" }}>
                          <div style={{ color: "#fff", fontWeight: "700" }}>
                            {held.customerName || "Walk-in"} ({held.cart.length} items)
                          </div>
                          <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "2px" }}>
                            Paused at {new Date(held.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleResumeCart(held)}
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            background: "var(--accent-blue)",
                            color: "#fff",
                            border: "none",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          Resume ⚡
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bill Items List */}
              <div className="cart-items-container">
                {cart.length === 0 ? (
                  <div className="empty-cart">
                    <Calculator size={40} color="var(--border-bright)" />
                    <div>No Items Billed</div>
                    <div style={{ fontSize: "12px" }}>
                      Type an item price on the left to add Item 1, Item 2, Item 3
                    </div>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-top">
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setCart((prev) => {
                                const copy = [...prev];
                                copy[index].name = newName;
                                return copy;
                              });
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              fontWeight: "700",
                              color: "var(--text-main)",
                              fontSize: "14px",
                              width: "100%",
                            }}
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveItem(index)}
                          style={{ background: "transparent", color: "var(--accent-rose)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="cart-item-bottom">
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => handleUpdateQty(index, -1)}>
                            <Minus size={12} />
                          </button>
                          <span className="qty-val">{item.qty}</span>
                          <button className="qty-btn" onClick={() => handleUpdateQty(index, 1)}>
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Editable Item Price */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Price: ₹</span>
                          <input
                            type="number"
                            style={{
                              width: "80px",
                              padding: "4px 6px",
                              fontSize: "13px",
                              fontWeight: "700",
                              background: "var(--bg-primary)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "4px",
                              color: "var(--accent-emerald)",
                              fontFamily: "var(--font-mono)",
                              textAlign: "right",
                            }}
                            value={item.price}
                            onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill Totals Summary */}
              {/* Bill Totals Summary */}
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal ({cart.length} items)</span>
                  <span style={{ fontWeight: "700", fontFamily: "var(--font-mono)" }}>₹{fmt(subtotal)}</span>
                </div>

                {/* Smart Spend-and-Save Slab Suggestion Banner */}
                {subtotal > 0 && (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginTop: "-4px",
                    marginBottom: "4px",
                    fontSize: "11.5px",
                  }}>
                    {subtotal < 1999 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "5px" }}>
                          <Sparkles size={13} color="#818cf8" />
                          <span>Add <strong>₹{fmt(1999 - subtotal)}</strong> more for <strong>₹200 OFF</strong></span>
                        </span>
                        <span style={{ color: "var(--accent-indigo)", fontSize: "10px", fontWeight: "700" }}>SLAB 1 (₹1,999)</span>
                      </div>
                    ) : subtotal < 3999 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
                          <Sparkles size={13} color="#34d399" />
                          <span>🎉 Slab 1 Reached! (Add ₹{fmt(3999 - subtotal)} for ₹500 OFF)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(discountVal === 200 ? "0" : "200")}
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: discountVal === 200 ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                            border: "1px solid #10b981",
                            color: discountVal === 200 ? "#ffffff" : "#34d399",
                            cursor: "pointer",
                            fontWeight: "700"
                          }}
                        >
                          {discountVal === 200 ? "✓ ₹200 Applied" : "Apply ₹200"}
                        </button>
                      </div>
                    ) : subtotal < 6999 ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
                          <Sparkles size={13} color="#34d399" />
                          <span>🔥 Mega Slab! (Add ₹{fmt(6999 - subtotal)} for ₹1,000 OFF)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(discountVal === 500 ? "0" : "500")}
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: discountVal === 500 ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                            border: "1px solid #10b981",
                            color: discountVal === 500 ? "#ffffff" : "#34d399",
                            cursor: "pointer",
                            fontWeight: "700"
                          }}
                        >
                          {discountVal === 500 ? "✓ ₹500 Applied" : "Apply ₹500"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "5px", fontWeight: "600" }}>
                          <Sparkles size={13} color="#34d399" />
                          <span>👑 VIP Festival Slab Active!</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(discountVal === 1000 ? "0" : "1000")}
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: discountVal === 1000 ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                            border: "1px solid #10b981",
                            color: discountVal === 1000 ? "#ffffff" : "#34d399",
                            cursor: "pointer",
                            fontWeight: "700"
                          }}
                        >
                          {discountVal === 1000 ? "✓ ₹1,000 Applied" : "Apply ₹1,000"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Way 1: Flat Discount Input + Ratio & Rupee Pills */}
                <div className="summary-row" style={{ alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Tag size={13} color="var(--accent-rose)" />
                    <span>Discount (₹)</span>
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    style={{
                      width: "100px",
                      padding: "4px 8px",
                      fontSize: "13px",
                      fontWeight: "700",
                      background: "var(--bg-primary)",
                      border: "1px solid var(--accent-rose)",
                      borderRadius: "4px",
                      color: "var(--accent-rose)",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                    value={discountInput}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                  />
                </div>

                {/* Quick Percentage & Rupee Pills */}
                {subtotal > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end", marginTop: "-4px", marginBottom: "6px" }}>
                    {[5, 10, 15, 20, 25].map((pct) => {
                      const targetDisc = Math.round(subtotal * (pct / 100));
                      const isActive = discountVal > 0 && (Math.abs(discountVal - targetDisc) <= 1 || Math.round((discountVal / subtotal) * 100) === pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleDiscountChange(isActive ? "0" : String(targetDisc))}
                          style={{
                            fontSize: "10.5px",
                            padding: "3px 9px",
                            borderRadius: "9999px",
                            background: isActive ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "#f1f5f9",
                            border: `1px solid ${isActive ? "#4f46e5" : "#e2e8f0"}`,
                            color: isActive ? "#ffffff" : "#1e293b",
                            cursor: "pointer",
                            fontWeight: "700",
                            transition: "all 0.15s ease",
                            boxShadow: isActive ? "0 2px 8px rgba(79, 70, 229, 0.4)" : "none",
                          }}
                          title={`${pct}% OFF (₹${fmt(targetDisc)})`}
                        >
                          {pct}%
                        </button>
                      );
                    })}

                    {[50, 70, 100].map((amt) => {
                      const cappedAmt = Math.min(amt, subtotal);
                      const isActive = discountVal === cappedAmt && discountVal > 0;
                      const isDisabled = subtotal < amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleDiscountChange(isActive ? "0" : String(cappedAmt))}
                          disabled={isDisabled}
                          style={{
                            fontSize: "10.5px",
                            padding: "3px 9px",
                            borderRadius: "9999px",
                            background: isActive
                              ? "linear-gradient(135deg, #4f46e5, #6366f1)"
                              : (isDisabled ? "rgba(100, 116, 139, 0.15)" : "#f1f5f9"),
                            border: `1px solid ${isActive ? "#4f46e5" : (isDisabled ? "rgba(100, 116, 139, 0.3)" : "#e2e8f0")}`,
                            color: isActive
                              ? "#ffffff"
                              : (isDisabled ? "var(--text-muted)" : "#1e293b"),
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            fontWeight: "700",
                            opacity: isDisabled ? 0.5 : 1,
                            transition: "all 0.15s ease",
                            boxShadow: isActive ? "0 2px 8px rgba(79, 70, 229, 0.4)" : "none",
                          }}
                          title={`₹${amt} Flat OFF`}
                        >
                          ₹{amt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Way 3: Cash Round-Off Handover (Rounding Down Loose Change) */}
                {subtotal > 0 && (subtotal % 10 !== 0 || subtotal % 50 !== 0) && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px dashed rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    marginBottom: "8px",
                    fontSize: "11px"
                  }}>
                    <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Coins size={12} color="#f59e0b" />
                      <span>Cash Round-Off:</span>
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {subtotal % 10 !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(String(subtotal % 10))}
                          style={{
                            fontSize: "10px",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: discountVal === (subtotal % 10) ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            color: "#fbbf24",
                            cursor: "pointer",
                            fontWeight: "700"
                          }}
                          title={`Discount loose ₹${subtotal % 10} to make total ₹${fmt(subtotal - (subtotal % 10))}`}
                        >
                          -₹{subtotal % 10} (₹{fmt(subtotal - (subtotal % 10))})
                        </button>
                      )}
                      {subtotal % 50 !== 0 && subtotal % 50 !== subtotal % 10 && (
                        <button
                          type="button"
                          onClick={() => handleDiscountChange(String(subtotal % 50))}
                          style={{
                            fontSize: "10px",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: discountVal === (subtotal % 50) ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            color: "#fbbf24",
                            cursor: "pointer",
                            fontWeight: "700"
                          }}
                          title={`Discount loose ₹${subtotal % 50} to make total ₹${fmt(subtotal - (subtotal % 50))}`}
                        >
                          -₹{subtotal % 50} (₹{fmt(subtotal - (subtotal % 50))})
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Way 2: Interactive Smart Bargaining (Target Total Payment) */}
                <div className="summary-row grand-total" style={{ alignItems: "center" }}>
                  <div>
                    <span style={{ display: "block" }}>Total Payment (₹)</span>
                    {discountVal > 0 && (
                      <small style={{ fontSize: "10.5px", color: "var(--accent-emerald)", fontWeight: "600" }}>
                        ✓ You Save: ₹{fmt(discountVal)} ({((discountVal / subtotal) * 100).toFixed(1)}%)
                      </small>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input
                      type="number"
                      placeholder="0"
                      style={{
                        width: "140px",
                        padding: "6px 10px",
                        fontSize: "18px",
                        fontWeight: "800",
                        background: "var(--bg-primary)",
                        border: "2px solid var(--accent-emerald)",
                        borderRadius: "6px",
                        color: "var(--accent-emerald)",
                        fontFamily: "var(--font-mono)",
                        textAlign: "right",
                      }}
                      value={customTotalInput}
                      onChange={(e) => handleCustomTotalChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Adjust Item Prices Button */}
                {cart.length > 0 && parseFloat(customTotalInput) > 0 && discountVal > 0 && (
                  <button
                    type="button"
                    onClick={handleScaleItemPricesToTotal}
                    style={{
                      fontSize: "11.5px",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      background: "rgba(99, 102, 241, 0.12)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "var(--accent-indigo)",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      width: "100%",
                      marginTop: "-4px",
                      marginBottom: "4px"
                    }}
                    title="Recalculate line-item rates so printed bill shows exact bargained total without separate discount row"
                  >
                    <RefreshCw size={13} />
                    <span>Adjust Item Rates to Match ₹{fmt(customTotalInput)}</span>
                  </button>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleClearCart}
                    style={{
                      padding: "12px",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(244, 63, 94, 0.1)",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                      color: "var(--accent-rose)",
                      fontWeight: "600",
                      fontSize: "12px",
                    }}
                  >
                    Clear
                  </button>

                  <button
                    className="checkout-btn"
                    disabled={cart.length === 0}
                    onClick={handleCheckout}
                    style={{ flex: 1 }}
                  >
                    <CheckCircle size={18} />
                    <span>Collect Payment (₹{fmt(grandTotal)})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.85)",
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
              borderRadius: "20px",
              width: "95vw",
              maxWidth: "1100px",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <button
              onClick={() => setShowPendingModal(false)}
              style={{
                position: "absolute",
                right: "20px",
                top: "20px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              ✕ Close
            </button>
            <PendingPaymentsView
              transactions={transactions}
              currentUser={currentUser}
              settings={settings}
            />
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
