import React, { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  UserCheck,
  Phone,
  Barcode,
  CheckCircle,
  Sparkles,
} from "lucide-react";

export default function BillingView({
  products,
  cart,
  setCart,
  currentBillNo,
  onInitiatePayment,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedSizes, setSelectedSizes] = useState({}); // prodId -> selected size string

  // Filter products by category, name, barcode, or code
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCat =
        selectedCategory === "All" || prod.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.code.toLowerCase().includes(query) ||
        (prod.barcode && prod.barcode.includes(query));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const categories = ["All", "Men", "Women", "Kids", "Ethnic", "Accessories"];

  // Add product to cart with selected size
  const handleAddToCart = (product, sizeChoice = null) => {
    const chosenSize = sizeChoice || selectedSizes[product.id] || product.sizes[0] || "Free Size";

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.size === chosenSize
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        const currentQty = updated[existingIndex].qty;
        if (currentQty < product.stock) {
          updated[existingIndex].qty += 1;
          updated[existingIndex].total =
            updated[existingIndex].qty *
            updated[existingIndex].price *
            (1 - (updated[existingIndex].discountPercent || 0) / 100);
        }
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: product.id,
            code: product.code,
            name: product.name,
            category: product.category,
            price: product.price,
            mrp: product.mrp,
            size: chosenSize,
            qty: 1,
            discountPercent: 0,
            total: product.price,
          },
        ];
      }
    });
  };

  const handleUpdateQty = (cartIndex, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[cartIndex].qty + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== cartIndex);
      }
      updated[cartIndex].qty = newQty;
      updated[cartIndex].total =
        newQty *
        updated[cartIndex].price *
        (1 - (updated[cartIndex].discountPercent || 0) / 100);
      return updated;
    });
  };

  const handleUpdateDiscount = (cartIndex, discPct) => {
    const pct = Math.min(100, Math.max(0, parseFloat(discPct) || 0));
    setCart((prev) => {
      const updated = [...prev];
      updated[cartIndex].discountPercent = pct;
      updated[cartIndex].total =
        updated[cartIndex].qty * updated[cartIndex].price * (1 - pct / 100);
      return updated;
    });
  };

  const handleRemoveItem = (cartIndex) => {
    setCart((prev) => prev.filter((_, idx) => idx !== cartIndex));
  };

  // Cart summary calculations
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalDiscount = subtotal - grandTotal;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    onInitiatePayment({
      cart,
      subtotal,
      discount: totalDiscount,
      grandTotal,
      customerName,
      customerPhone,
      billNo: currentBillNo,
    });
  };

  return (
    <div className="pos-grid">
      {/* Left Column: Product Catalog & Fast Billing Grid */}
      <div className="catalog-panel">
        {/* Search & Barcode Bar */}
        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search clothing name, SKU (e.g. TSH-M-101) or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="product-grid">
          {filteredProducts.map((prod) => (
            <div key={prod.id} className="product-card">
              <div>
                <div className="product-cat-tag">{prod.category}</div>
                <div className="product-name" style={{ marginTop: "6px" }}>
                  {prod.name}
                </div>
                <div className="product-code">{prod.code}</div>
              </div>

              <div>
                {/* Size options */}
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Select Size:
                </div>
                <div className="product-size-list">
                  {prod.sizes.map((sz) => (
                    <button
                      key={sz}
                      className={`size-btn ${
                        (selectedSizes[prod.id] || prod.sizes[0]) === sz ? "active" : ""
                      }`}
                      onClick={() =>
                        setSelectedSizes((prev) => ({ ...prev, [prod.id]: sz }))
                      }
                      style={{
                        background:
                          (selectedSizes[prod.id] || prod.sizes[0]) === sz
                            ? "var(--accent-indigo)"
                            : undefined,
                        color:
                          (selectedSizes[prod.id] || prod.sizes[0]) === sz
                            ? "#fff"
                            : undefined,
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <div className="product-footer">
                  <div>
                    <span className="product-price">₹{prod.price}</span>
                    <span className="product-mrp">₹{prod.mrp}</span>
                  </div>

                  <button
                    className="size-btn"
                    onClick={() => handleAddToCart(prod)}
                    style={{
                      background: "var(--accent-emerald)",
                      color: "#fff",
                      padding: "4px 10px",
                      fontSize: "11px",
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Billing Cart & Customer Section */}
      <div className="cart-panel">
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingCart size={18} color="var(--accent-blue)" />
            <span>Customer Cart</span>
          </div>
          <div className="bill-no-badge">{currentBillNo}</div>
        </div>

        {/* Customer Info Inputs (Optional) */}
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

        {/* Cart Items List */}
        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart size={40} color="var(--border-bright)" />
              <div>Cart is empty</div>
              <div style={{ fontSize: "12px" }}>
                Scan a barcode or click clothing items to start billing
              </div>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={`${item.id}-${item.size}`} className="cart-item">
                <div className="cart-item-top">
                  <div>
                    <div className="cart-item-title">{item.name}</div>
                    <div className="cart-item-details">
                      <span>SKU: {item.code}</span>
                      <span>•</span>
                      <span>
                        Size:{" "}
                        <select
                          className="cart-size-select"
                          value={item.size}
                          onChange={(e) => {
                            const newSize = e.target.value;
                            setCart((prev) => {
                              const copy = [...prev];
                              copy[index].size = newSize;
                              return copy;
                            });
                          }}
                        >
                          {["S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "Free Size"].map(
                            (s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            )
                          )}
                        </select>
                      </span>
                    </div>
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
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(index, -1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="qty-val">{item.qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleUpdateQty(index, 1)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Disc:
                      <input
                        type="number"
                        min="0"
                        max="100"
                        style={{
                          width: "40px",
                          padding: "2px 4px",
                          marginLeft: "4px",
                          fontSize: "11px",
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "4px",
                          color: "var(--text-main)",
                        }}
                        value={item.discountPercent || 0}
                        onChange={(e) => handleUpdateDiscount(index, e.target.value)}
                      />
                      %
                    </div>
                    <div className="cart-item-price">₹{item.total.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="cart-summary">
          <div className="summary-row">
            <span>Items Count</span>
            <span>{cart.reduce((s, i) => s + i.qty, 0)} items</span>
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="summary-row" style={{ color: "var(--accent-rose)" }}>
              <span>Total Savings / Discount</span>
              <span>-₹{totalDiscount.toFixed(2)}</span>
            </div>
          )}

          <div className="summary-row grand-total">
            <span>Payable Amount</span>
            <span className="amount">₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            className="checkout-btn"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            <CheckCircle size={20} />
            <span>Proceed to Payment (₹{grandTotal.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
