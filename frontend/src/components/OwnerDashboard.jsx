import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  QrCode,
  Save,
  Banknote,
  Receipt,
  Package,
  Plus,
  Printer,
  Download,
  Upload,
  Settings,
  BarChart2,
  CalendarDays,
  CalendarRange,
  Clock,
  Infinity,
  ShoppingBag,
} from "lucide-react";

export default function OwnerDashboard({
  transactions,
  products,
  settings,
  onUpdateSettings,
  onAddProduct,
  onUpdateProduct,
  onReprintBill,
  onCancelBill,
  onReloadData,
}) {
  const [subTab, setSubTab] = useState("overview");
  const [monitorPeriod, setMonitorPeriod] = useState("today");
  const [searchTx, setSearchTx] = useState("");
  const [searchInv, setSearchInv] = useState("");

  // Draft state for Settings form — only saved when user clicks Save
  const [draftSettings, setDraftSettings] = useState(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Sync draft when parent settings load from backend
  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    await onUpdateSettings(draftSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    code: "",
    name: "",
    category: "Men",
    sizes: "S, M, L, XL",
    price: "",
    mrp: "",
    stock: "",
    barcode: "",
  });

  const kpis = useMemo(() => {
    const activeTx = transactions.filter((t) => t.status !== "CANCELLED");

    const totalSales = activeTx.reduce((sum, t) => sum + t.grandTotal, 0);
    const upiSales = activeTx
      .filter((t) => t.paymentMode === "UPI")
      .reduce((sum, t) => sum + t.grandTotal, 0);
    const cashSales = activeTx
      .filter((t) => t.paymentMode === "CASH")
      .reduce((sum, t) => sum + t.grandTotal, 0);
    const cardSales = activeTx
      .filter((t) => t.paymentMode === "CARD")
      .reduce((sum, t) => sum + t.grandTotal, 0);

    const totalBills = activeTx.length;
    const totalItemsSold = activeTx.reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0),
      0
    );

    return { totalSales, upiSales, cashSales, cardSales, totalBills, totalItemsSold };
  }, [transactions]);

  // ── Sales Monitor: filter transactions by selected period ──────────────────
  const monitorData = useMemo(() => {
    const now = new Date();
    const startOf = (unit) => {
      const d = new Date(now);
      if (unit === "day")   { d.setHours(0,0,0,0); }
      if (unit === "week")  { d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); }
      if (unit === "month") { d.setHours(0,0,0,0); d.setDate(1); }
      if (unit === "year")  { d.setHours(0,0,0,0); d.setMonth(0,1); }
      return d;
    };

    const periodStart = {
      today:   startOf("day"),
      week:    startOf("week"),
      month:   startOf("month"),
      year:    startOf("year"),
      alltime: null,
    }[monitorPeriod];

    const activeTx = transactions.filter((t) => {
      if (t.status === "CANCELLED") return false;
      if (!periodStart) return true;
      return new Date(t.timestamp) >= periodStart;
    });

    const revenue   = activeTx.reduce((s, t) => s + t.grandTotal, 0);
    const bills     = activeTx.length;
    const items     = activeTx.reduce((s, t) => s + t.items.reduce((a, i) => a + i.qty, 0), 0);
    const avgBill   = bills > 0 ? revenue / bills : 0;
    const upi       = activeTx.filter((t) => t.paymentMode === "UPI").reduce((s, t) => s + t.grandTotal, 0);
    const cash      = activeTx.filter((t) => t.paymentMode === "CASH").reduce((s, t) => s + t.grandTotal, 0);
    const card      = activeTx.filter((t) => t.paymentMode === "CARD").reduce((s, t) => s + t.grandTotal, 0);

    // Top selling items
    const itemMap = {};
    activeTx.forEach((t) => {
      t.items.forEach((i) => {
        if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
        itemMap[i.name].qty     += i.qty;
        itemMap[i.name].revenue += i.total;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { revenue, bills, items, avgBill, upi, cash, card, topItems };
  }, [transactions, monitorPeriod]);

  const periodLabels = {
    today:   { label: "Today",      icon: Clock },
    week:    { label: "This Week",  icon: CalendarDays },
    month:   { label: "This Month", icon: CalendarRange },
    year:    { label: "This Year",  icon: BarChart2 },
    alltime: { label: "All Time",   icon: Infinity },
  };

  const categorySales = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.status !== "CANCELLED")
      .forEach((t) => {
        t.items.forEach((item) => {
          map[item.category] = (map[item.category] || 0) + item.total;
        });
      });
    return map;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchTx.toLowerCase().trim();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.billNo.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerPhone && t.customerPhone.includes(q)) ||
        t.paymentMode.toLowerCase().includes(q)
    );
  }, [transactions, searchTx]);

  const filteredInventory = useMemo(() => {
    const q = searchInv.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, searchInv]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      code: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      category: "Men",
      sizes: "S, M, L, XL",
      price: "",
      mrp: "",
      stock: "20",
      barcode: `890${Math.floor(100000000 + Math.random() * 900000000)}`,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const sizesArray = productForm.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newProd = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: productForm.code,
      name: productForm.name,
      category: productForm.category,
      sizes: sizesArray.length > 0 ? sizesArray : ["Free Size"],
      price: parseFloat(productForm.price) || 0,
      mrp: parseFloat(productForm.mrp) || 0,
      stock: parseInt(productForm.stock) || 0,
      barcode: productForm.barcode,
    };

    if (editingProduct) {
      onUpdateProduct(newProd);
    } else {
      onAddProduct(newProd);
    }
    setIsProductModalOpen(false);
  };

  return (
    <div className="dashboard-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            { id: "overview", label: "Analytics & Sales Monitor", icon: TrendingUp },
            { id: "transactions", label: "All Bills & Receipts", icon: Receipt },
            { id: "inventory", label: "Clothing Stock Manager", icon: Package },
            { id: "settings", label: "Store & UPI Settings", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab-btn ${subTab === tab.id ? "active" : ""}`}
                onClick={() => setSubTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {subTab === "overview" && (
        <>
          {/* ── SALES MONITOR ─────────────────────────────────────────── */}
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            marginBottom: "16px",
          }}>
            {/* Period Selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart2 size={18} color="var(--accent-emerald)" />
                <span style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-main)" }}>Sales Monitor</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-primary)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>Owner View</span>
              </div>
              <div style={{ display: "flex", gap: "6px", background: "var(--bg-primary)", padding: "4px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                {Object.entries(periodLabels).map(([key, { label, icon: Icon }]) => (
                  <button
                    key={key}
                    onClick={() => setMonitorPeriod(key)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.2s",
                      background: monitorPeriod === key
                        ? "linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))"
                        : "transparent",
                      color: monitorPeriod === key ? "#fff" : "var(--text-muted)",
                      boxShadow: monitorPeriod === key ? "0 2px 8px rgba(16,185,129,0.35)" : "none",
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "18px" }}>
              {[
                {
                  label: "Total Revenue",
                  value: `₹${monitorData.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-emerald)",
                  bg: "rgba(16,185,129,0.1)",
                  icon: "₹",
                },
                {
                  label: "Bills / Invoices",
                  value: `${monitorData.bills} bills`,
                  color: "var(--accent-purple)",
                  bg: "rgba(139,92,246,0.1)",
                  icon: <Receipt size={18} />,
                },
                {
                  label: "Items Sold",
                  value: `${monitorData.items} pcs`,
                  color: "var(--accent-blue)",
                  bg: "rgba(59,130,246,0.1)",
                  icon: <ShoppingBag size={18} />,
                },
                {
                  label: "Avg. Bill Value",
                  value: `₹${monitorData.avgBill.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-amber)",
                  bg: "rgba(245,158,11,0.1)",
                  icon: <TrendingUp size={18} />,
                },
                {
                  label: "UPI Collected",
                  value: `₹${monitorData.upi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-blue)",
                  bg: "rgba(59,130,246,0.1)",
                  icon: <QrCode size={18} />,
                },
                {
                  label: "Cash Collected",
                  value: `₹${monitorData.cash.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  color: "var(--accent-amber)",
                  bg: "rgba(245,158,11,0.1)",
                  icon: <Banknote size={18} />,
                },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: kpi.bg,
                  border: `1px solid ${kpi.color}30`,
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  transition: "transform 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{kpi.label}</span>
                    <span style={{ color: kpi.color, fontWeight: "700", fontSize: "16px", lineHeight: 1 }}>{kpi.icon}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: "800", fontSize: "17px", color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* Payment Bar + Top Items */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

              {/* Payment breakdown */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "14px" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "var(--text-main)" }}>Payment Split</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "UPI", val: monitorData.upi, color: "var(--accent-blue)", icon: <QrCode size={13} /> },
                    { label: "Cash", val: monitorData.cash, color: "var(--accent-amber)", icon: <Banknote size={13} /> },
                    { label: "Card", val: monitorData.card, color: "var(--accent-purple)", icon: <TrendingUp size={13} /> },
                  ].map((item, idx) => {
                    const pct = monitorData.revenue > 0 ? (item.val / monitorData.revenue) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: item.color, fontWeight: "600" }}>{item.icon}{item.label}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--text-main)" }}>₹{item.val.toLocaleString("en-IN", { minimumFractionDigits: 2 })} <span style={{ color: "var(--text-dim)", fontWeight: "400" }}>({pct.toFixed(1)}%)</span></span>
                        </div>
                        <div style={{ height: "8px", background: "var(--bg-primary)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top selling items */}
              <div style={{ background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", padding: "14px" }}>
                <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "12px", color: "var(--text-main)" }}>Top Selling Items</div>
                {monitorData.topItems.length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>No sales in this period.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {monitorData.topItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-primary)", borderRadius: "7px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: i === 0 ? "var(--accent-amber)" : "var(--border-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "800", color: i === 0 ? "#fff" : "var(--text-muted)" }}>#{i+1}</span>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-main)", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--accent-emerald)" }}>₹{item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{item.qty} pcs sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── ALL-TIME SUMMARY KPIs ──────────────────────────────────── */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)" }}
              >
                ₹
              </div>
              <div>
                <div className="kpi-title">Total Sales Revenue</div>
                <div className="kpi-value">₹{kpis.totalSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--accent-blue)" }}
              >
                <QrCode size={24} />
              </div>
              <div>
                <div className="kpi-title">UPI Sales Total</div>
                <div className="kpi-value">₹{kpis.upiSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)" }}
              >
                <Banknote size={24} />
              </div>
              <div>
                <div className="kpi-title">Cash Sales Total</div>
                <div className="kpi-value">₹{kpis.cashSales.toFixed(2)}</div>
              </div>
            </div>

            <div className="kpi-card">
              <div
                className="kpi-icon"
                style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--accent-purple)" }}
              >
                <Receipt size={24} />
              </div>
              <div>
                <div className="kpi-title">Total Bills Generated</div>
                <div className="kpi-value">{kpis.totalBills} Bills</div>
              </div>
            </div>
          </div>

          <div className="dash-sections-grid">
            <div className="table-panel">
              <div className="panel-title">
                <span>Payment Method Breakdown</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal" }}>
                  UPI vs Cash vs Card
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                {[
                  {
                    name: "UPI Payment (GPay/PhonePe/Paytm)",
                    val: kpis.upiSales,
                    color: "var(--accent-blue)",
                    icon: QrCode,
                  },
                  {
                    name: "Cash Payments",
                    val: kpis.cashSales,
                    color: "var(--accent-amber)",
                    icon: Banknote,
                  },
                  {
                    name: "Card / POS Terminal",
                    val: kpis.cardSales,
                    color: "var(--accent-purple)",
                    icon: TrendingUp,
                  },
                ].map((item, idx) => {
                  const pct = kpis.totalSales > 0 ? (item.val / kpis.totalSales) * 100 : 0;
                  const Icon = item.icon;
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Icon size={14} color={item.color} />
                          {item.name}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                          ₹{item.val.toFixed(2)} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: "10px",
                          width: "100%",
                          background: "var(--bg-primary)",
                          borderRadius: "5px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: item.color,
                            borderRadius: "5px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="table-panel">
              <div className="panel-title">Category Sales</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {Object.entries(categorySales).length === 0 ? (
                  <div style={{ color: "var(--text-dim)", fontSize: "13px" }}>
                    No sales recorded yet.
                  </div>
                ) : (
                  Object.entries(categorySales).map(([cat, total], idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        background: "var(--bg-primary)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <span style={{ fontWeight: "600", fontSize: "13px" }}>{cat}</span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent-emerald)",
                          fontWeight: "bold",
                        }}
                      >
                        ₹{total.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === "transactions" && (
        <div className="table-panel">
          <div className="panel-title">
            <span>Transaction History & Bill Inspector</span>
            <div style={{ width: "260px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search Bill No, Customer or UPI Ref..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
              />
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment Mode</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.billNo}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                    {tx.billNo}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {new Date(tx.timestamp).toLocaleString("en-IN")}
                  </td>
                  <td>
                    {tx.customerName || "Walk-in"}
                    {tx.customerPhone && (
                      <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                        {tx.customerPhone}
                      </div>
                    )}
                  </td>
                  <td>{tx.items.length} clothing items</td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        background:
                          tx.paymentMode === "UPI"
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color:
                          tx.paymentMode === "UPI"
                            ? "var(--accent-blue)"
                            : "var(--accent-amber)",
                      }}
                    >
                      {tx.paymentMode}
                    </span>
                    {tx.upiRefNo && (
                      <div style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        {tx.upiRefNo}
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "var(--accent-emerald)" }}>
                    ₹{tx.grandTotal.toFixed(2)}
                  </td>
                  <td>
                    {tx.status === "CANCELLED" ? (
                      <span style={{ color: "var(--accent-rose)", fontSize: "12px", fontWeight: "bold" }}>
                        Cancelled
                      </span>
                    ) : (
                      <span style={{ color: "var(--accent-emerald)", fontSize: "12px", fontWeight: "bold" }}>
                        Completed
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => onReprintBill(tx)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "11px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Printer size={12} />
                        Reprint
                      </button>
                      {tx.status !== "CANCELLED" && (
                        <button
                          onClick={() => onCancelBill(tx.billNo)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "rgba(244, 63, 94, 0.1)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            color: "var(--accent-rose)",
                            fontSize: "11px",
                          }}
                        >
                          Cancel
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

      {subTab === "inventory" && (
        <div className="table-panel">
          <div className="panel-title">
            <span>Clothing Stock Catalog ({products.length} items)</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search apparel name/SKU..."
                value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)}
                style={{ width: "200px" }}
              />
              <button
                onClick={handleOpenAddProduct}
                className="checkout-btn"
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                <Plus size={16} />
                <span>Add New Apparel</span>
              </button>
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU Code</th>
                <th>Apparel Name</th>
                <th>Category</th>
                <th>Available Sizes</th>
                <th>MRP / Tag Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Barcode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((prod) => (
                <tr key={prod.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold" }}>
                    {prod.code}
                  </td>
                  <td style={{ fontWeight: "600" }}>{prod.name}</td>
                  <td>{prod.category}</td>
                  <td>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {prod.sizes.map((s) => (
                        <span key={s} className="size-btn">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textDecoration: "line-through", color: "var(--text-dim)" }}>
                    ₹{prod.mrp}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "bold", color: "var(--accent-emerald)" }}>
                    ₹{prod.price}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background: prod.stock <= 10 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: prod.stock <= 10 ? "var(--accent-amber)" : "var(--accent-emerald)",
                      }}
                    >
                      {prod.stock} units
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    {prod.barcode || "N/A"}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setEditingProduct(prod);
                        setProductForm({
                          code: prod.code,
                          name: prod.name,
                          category: prod.category,
                          sizes: prod.sizes.join(", "),
                          price: prod.price,
                          mrp: prod.mrp,
                          stock: prod.stock,
                          barcode: prod.barcode || "",
                        });
                        setIsProductModalOpen(true);
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-main)",
                        fontSize: "11px",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "settings" && (
        <div className="table-panel" style={{ maxWidth: "650px" }}>
          <div className="panel-title">Store & Billing Machine Settings</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
            <div className="form-group">
              <label className="form-label">Shopping Mall / Store Name</label>
              <input
                type="text"
                className="form-control"
                value={draftSettings.storeName || ""}
                onChange={(e) => setDraftSettings({ ...draftSettings, storeName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mall Address & Location</label>
              <input
                type="text"
                className="form-control"
                value={draftSettings.address || ""}
                onChange={(e) => setDraftSettings({ ...draftSettings, address: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={draftSettings.phone || ""}
                  onChange={(e) => setDraftSettings({ ...draftSettings, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={draftSettings.gstin || ""}
                  onChange={(e) => setDraftSettings({ ...draftSettings, gstin: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Store UPI VPA ID (for Auto QR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. shopname@upi"
                  value={draftSettings.upiId || ""}
                  onChange={(e) => setDraftSettings({ ...draftSettings, upiId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thermal / Invoice Printer Paper</label>
                <select
                  className="form-control"
                  value={draftSettings.receiptPaper || "80mm"}
                  onChange={(e) => setDraftSettings({ ...draftSettings, receiptPaper: e.target.value })}
                >
                  <option value="80mm">Thermal 80mm POS Roll</option>
                  <option value="58mm">Thermal 58mm POS Mini Roll</option>
                  <option value="A4">A4 Tax Invoice Sheet</option>
                </select>
              </div>
            </div>

            {/* Custom Payment QR Code Scanner Upload */}
            <div className="form-group" style={{ background: "var(--bg-primary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              <label className="form-label" style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent-indigo)" }}>
                📷 Upload Custom Payment QR Scanner Image (GPay / PhonePe / Paytm)
              </label>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                Upload your store's official printed QR Scanner image to show on the cashier payment counter screen.
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                {draftSettings.customQrImage ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                    <img
                      src={draftSettings.customQrImage}
                      alt="Store Custom Payment QR"
                      style={{ width: "120px", height: "120px", objectFit: "contain", borderRadius: "8px", border: "2px solid var(--accent-indigo)", background: "#fff", padding: "4px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setDraftSettings({ ...draftSettings, customQrImage: "" })}
                      style={{ fontSize: "11px", color: "var(--accent-rose)", background: "transparent" }}
                    >
                      Remove Custom QR
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "8px",
                      border: "2px dashed var(--border-bright)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-dim)",
                      fontSize: "11px",
                      textAlign: "center",
                      padding: "8px"
                    }}
                  >
                    No Custom QR Uploaded
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="qr-upload-input"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setDraftSettings({ ...draftSettings, customQrImage: evt.target.result });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="qr-upload-input"
                    className="nav-tab-btn"
                    style={{ background: "var(--accent-indigo)", color: "#fff", cursor: "pointer", display: "inline-flex" }}
                  >
                    <Upload size={14} />
                    <span>Choose QR Image</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Settings Button */}
            <button
              onClick={handleSaveSettings}
              className="checkout-btn"
              style={{
                marginTop: "8px",
                background: settingsSaved
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, var(--accent-indigo), #6366f1)",
                transition: "background 0.4s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "15px",
                fontWeight: "700",
                padding: "14px 24px",
              }}
            >
              {settingsSaved ? (
                <>
                  <span>✓</span>
                  <span>Settings Saved!</span>
                </>
              ) : (
                <>
                  <Save size={17} />
                  <span>Save Store &amp; UPI Details</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? "Edit Clothing Item" : "Add New Apparel"}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                style={{ background: "transparent", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">SKU Code</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Ethnic">Ethnic</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Apparel / Item Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Available Sizes (Comma Separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. S, M, L, XL or 30, 32, 34"
                  value={productForm.sizes}
                  onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.mrp}
                    onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Qty</label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Barcode String</label>
                <input
                  type="text"
                  className="form-control"
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                />
              </div>

              <button type="submit" className="checkout-btn" style={{ marginTop: "10px" }}>
                {editingProduct ? "Update Stock Item" : "Add to Inventory"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
