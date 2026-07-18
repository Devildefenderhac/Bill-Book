import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  QrCode,
  Banknote,
  Receipt,
  Package,
  Plus,
  Search,
  Printer,
  Download,
  Upload,
  RotateCcw,
  Settings,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { exportBackupJSON, importBackupJSON } from "../utils/storage";

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
  const [subTab, setSubTab] = useState("overview"); // 'overview' | 'transactions' | 'inventory' | 'settings'
  const [searchTx, setSearchTx] = useState("");
  const [searchInv, setSearchInv] = useState("");
  
  // Modal for Add/Edit Product
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

  // Calculate Real-time Dashboard KPIs
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

  // Category sales breakdown
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

  // Filtered Transactions
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

  // Filtered Inventory
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

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importBackupJSON(event.target.result);
      if (success) {
        alert("Store Database Restored Successfully!");
        onReloadData();
      } else {
        alert("Failed to parse backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Sub-Header Navigation */}
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

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={exportBackupJSON}
            className="nav-tab-btn"
            title="Download JSON Database Backup"
          >
            <Download size={14} />
            <span>Backup Data</span>
          </button>
          <label className="nav-tab-btn" style={{ cursor: "pointer" }}>
            <Upload size={14} />
            <span>Restore</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Overview Analytics Tab */}
      {subTab === "overview" && (
        <>
          {/* KPI Metrics Cards */}
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

          {/* Visual Charts & Payment Breakdown Grid */}
          <div className="dash-sections-grid">
            {/* Payment Method Distribution */}
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

            {/* Category Performance */}
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

      {/* Transactions History Tab */}
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

      {/* Clothing Inventory Manager Tab */}
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

      {/* Store Settings Tab */}
      {subTab === "settings" && (
        <div className="table-panel" style={{ maxWidth: "650px" }}>
          <div className="panel-title">Store & Billing Machine Settings</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
            <div className="form-group">
              <label className="form-label">Shopping Mall / Store Name</label>
              <input
                type="text"
                className="form-control"
                value={settings.storeName}
                onChange={(e) => onUpdateSettings({ ...settings, storeName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mall Address & Location</label>
              <input
                type="text"
                className="form-control"
                value={settings.address}
                onChange={(e) => onUpdateSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.phone}
                  onChange={(e) => onUpdateSettings({ ...settings, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.gstin}
                  onChange={(e) => onUpdateSettings({ ...settings, gstin: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Store UPI VPA ID (for QR Payments)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. shopname@upi"
                  value={settings.upiId}
                  onChange={(e) => onUpdateSettings({ ...settings, upiId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thermal / Invoice Printer Paper</label>
                <select
                  className="form-control"
                  value={settings.receiptPaper}
                  onChange={(e) => onUpdateSettings({ ...settings, receiptPaper: e.target.value })}
                >
                  <option value="80mm">Thermal 80mm POS Roll</option>
                  <option value="58mm">Thermal 58mm POS Mini Roll</option>
                  <option value="A4">A4 Tax Invoice Sheet</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bill Number Prefix</label>
              <input
                type="text"
                className="form-control"
                value={settings.billPrefix}
                onChange={(e) => onUpdateSettings({ ...settings, billPrefix: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
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
