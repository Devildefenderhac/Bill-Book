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
} from "lucide-react";

export default function BillingView({
  cart,
  setCart,
  currentBillNo,
  onInitiatePayment,
}) {
  const [itemPriceInput, setItemPriceInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const [discountInput, setDiscountInput] = useState("");
  const [customTotalInput, setCustomTotalInput] = useState("");

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
    const disc = parseFloat(discountInput) || 0;
    const calcTotal = Math.max(0, subtotal - disc);
    setCustomTotalInput(calcTotal > 0 ? fmt(calcTotal) : "");
  }, [subtotal, discountInput]);

  // Handle Flat Discount - just update total display
  const handleDiscountChange = (val) => {
    setDiscountInput(val);
    const disc = parseFloat(val) || 0;
    const newTotal = Math.max(0, subtotal - disc);
    setCustomTotalInput(newTotal > 0 ? fmt(newTotal) : "0");
  };

  // Handle Total Payment edit - just update discount display
  const handleCustomTotalChange = (val) => {
    setCustomTotalInput(val);
    const targetTotal = parseFloat(val) || 0;
    if (subtotal > 0) {
      const calcDiscount = Math.max(0, subtotal - targetTotal);
      setDiscountInput(calcDiscount > 0 ? fmt(calcDiscount) : "0");
    }
  };

  // Manual button: Scale item prices to match target Total Payment
  const handleScaleItemPricesToTotal = () => {
    const targetTotal = parseFloat(customTotalInput);
    if (!targetTotal || targetTotal <= 0 || subtotal <= 0 || cart.length === 0) return;
    setCart((prev) => scaleItemsToTotal(targetTotal, prev));
    setDiscountInput("0");
  };

  const discountVal = parseFloat(discountInput) || 0;
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

  return (
    <div className="pos-grid" style={{ gridTemplateColumns: "1fr 440px" }}>
      {/* Left Panel: Fast Item Price Entry */}
      <div className="catalog-panel" style={{ gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={22} color="var(--accent-amber)" />
            <span>Quick Item Price Billing Counter</span>
          </h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            No product inventory needed
          </span>
        </div>

        {/* Manual Item Price Input Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "2px solid var(--accent-indigo)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "13px", fontWeight: "700" }}>Item Name (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Item 1, Jeans, Shirt"
                style={{ padding: "12px 14px", fontSize: "14px" }}
                value={itemNameInput}
                onChange={(e) => setItemNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent-emerald)" }}>Manual Enter Item Price (₹)</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Type Price (e.g. 750)"
                  style={{ fontSize: "22px", fontWeight: "bold", color: "var(--accent-emerald)", padding: "10px 14px" }}
                  value={itemPriceInput}
                  onChange={(e) => setItemPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem();
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handleAddItem()}
                  className="checkout-btn"
                  style={{ width: "auto", padding: "0 28px", fontSize: "16px" }}
                >
                  <Plus size={22} />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            fontSize: "13px",
            color: "var(--text-muted)",
            lineHeight: "1.6",
          }}
        >
          <div style={{ color: "var(--accent-blue)", fontWeight: "700", marginBottom: "6px", fontSize: "14px" }}>
            💡 Smart Price & Total Payment Features:
          </div>
          • <strong>Editable Item Prices</strong>: Click & edit item prices directly in the cart list.
          <br />
          • <strong>Editable Total Payment</strong>: Type target Total Payment (e.g. <code>1800</code> instead of <code>2000</code>) — discount auto-calculates!
          <br />
          • <strong>Scale Item Prices</strong>: Click <strong>Adjust Prices</strong> to automatically update item prices to match the target total.
        </div>
      </div>

      {/* Right Panel: Live Bill Summary & Customer Info */}
      <div className="cart-panel">
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingCart size={18} color="var(--accent-blue)" />
            <span>Bill Receipt Items</span>
          </div>
          <div className="bill-no-badge">{currentBillNo}</div>
        </div>

        {/* Customer Details */}
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(15, 23, 42, 0.4)",
            borderBottom: "1px solid var(--border-color)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
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
        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal ({cart.length} items)</span>
            <span>₹{fmt(subtotal)}</span>
          </div>

          {/* Editable Flat Discount */}
          <div className="summary-row">
            <span>Flat Discount (₹)</span>
            <input
              type="number"
              placeholder="0"
              style={{
                width: "100px",
                padding: "4px 8px",
                fontSize: "13px",
                fontWeight: "600",
                background: "var(--bg-primary)",
                border: "1px solid var(--accent-rose)",
                borderRadius: "4px",
                color: "var(--accent-rose)",
                textAlign: "right",
              }}
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
            />
          </div>

          {/* Editable Total Payment */}
          <div className="summary-row grand-total" style={{ alignItems: "center" }}>
            <span>Total Payment (₹)</span>
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
          {cart.length > 0 && parseFloat(customTotalInput) > 0 && (
            <button
              onClick={handleScaleItemPricesToTotal}
              style={{
                fontSize: "12px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "var(--accent-indigo)",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <RefreshCw size={13} />
              <span>Adjust Item Prices to Match ₹{fmt(customTotalInput)}</span>
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
  );
}
