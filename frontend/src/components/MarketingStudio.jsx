import React, { useState, useMemo } from "react";
import {
  Send,
  Users,
  Sparkles,
  Image,
  Video,
  CheckSquare,
  Square,
  MessageCircle,
  Copy,
  Check,
  Search,
  Filter,
  DollarSign,
  Gift,
  Tag,
  Share2,
  Lock,
  Eye,
  X,
  Smartphone,
  Info,
  ChevronRight,
} from "lucide-react";

export default function MarketingStudio({
  transactions = [],
  currentUser = null,
  settings = {},
}) {
  // Extract and deduplicate customer list from transactions
  const customerList = useMemo(() => {
    const map = new Map();

    (transactions || []).forEach((t) => {
      if (t.status === "CANCELLED") return;
      const phone = (t.customerPhone || "").replace(/\D/g, "");
      if (!phone || phone.length < 10) return;
      const cleanPhone = phone.length === 10 ? `91${phone}` : phone;

      const rawName = (t.customerName || "Customer").trim();
      const amt = Math.abs(t.grandTotal || 0);
      const isPending =
        t.paymentStatus === "PENDING" ||
        t.paymentStatus === "PARTIALLY_PAID" ||
        t.paymentMode === "PENDING" ||
        (t.pendingAmount !== undefined && t.pendingAmount > 0);
      const pendingAmt = t.pendingAmount !== undefined ? t.pendingAmount : isPending ? amt : 0;

      const isPlaceholderName = (nameStr) => {
        const ns = (nameStr || "").trim().toLowerCase();
        return (
          ns === "" ||
          ns === "customer" ||
          ns === "walk-in" ||
          ns === "walk-in customer" ||
          ns.includes("pending udhar") ||
          ns.includes("udhar customer")
        );
      };

      const finalName = !isPlaceholderName(rawName) ? rawName : "Valued Customer";

      if (!map.has(cleanPhone)) {
        map.set(cleanPhone, {
          id: cleanPhone,
          name: finalName,
          phone: cleanPhone,
          displayPhone: t.customerPhone,
          totalSpent: amt,
          totalBills: 1,
          lastPurchase: t.timestamp,
          pendingAmount: pendingAmt,
        });
      } else {
        const existing = map.get(cleanPhone);
        if (existing.name === "Valued Customer" && !isPlaceholderName(rawName)) {
          existing.name = rawName;
        }
        existing.totalSpent += amt;
        existing.totalBills += 1;
        if (new Date(t.timestamp) > new Date(existing.lastPurchase)) {
          existing.lastPurchase = t.timestamp;
        }
        existing.pendingAmount = Math.max(existing.pendingAmount, pendingAmt);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("ALL"); // ALL | VIP | RECENT | PENDING
  const [selectedPhones, setSelectedPhones] = useState(
    customerList.map((c) => c.phone)
  );

  const [messageLanguage, setMessageLanguage] = useState("HINGLISH"); // HINGLISH | HINDI | ENGLISH
  const [adTone, setAdTone] = useState("SALE"); // SALE | FESTIVAL | NEW_ARRIVAL | UDHAR | CUSTOM
  const [customMessage, setCustomMessage] = useState("");

  const [mediaUrl, setMediaUrl] = useState(
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80"
  );

  const [copiedText, setCopiedText] = useState(false);
  const [previewCustomerPhone, setPreviewCustomerPhone] = useState("");

  // Batching system states (Default: 5 per batch)
  const [batchSize, setBatchSize] = useState(5);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [sentPhones, setSentPhones] = useState(new Set());

  const previewCustomer = useMemo(() => {
    if (previewCustomerPhone) {
      const found = customerList.find((c) => c.phone === previewCustomerPhone);
      if (found) return found;
    }
    return customerList[0] || { name: "Rahul Sharma", phone: "919876543210", displayPhone: "9876543210", pendingAmount: 153.0 };
  }, [customerList, previewCustomerPhone]);

  // Selected customers list
  const selectedCustomers = useMemo(() => {
    return customerList.filter((c) => selectedPhones.includes(c.phone));
  }, [customerList, selectedPhones]);

  const totalSelectedCount = selectedCustomers.length;
  const totalBatches = Math.ceil(totalSelectedCount / batchSize) || 1;

  const currentBatchCustomers = useMemo(() => {
    const start = currentBatchIndex * batchSize;
    const end = Math.min(totalSelectedCount, start + batchSize);
    return selectedCustomers.slice(start, end);
  }, [selectedCustomers, currentBatchIndex, batchSize, totalSelectedCount]);

  const sentCount = selectedCustomers.filter((c) => sentPhones.has(c.phone)).length;
  const remainingCount = Math.max(0, totalSelectedCount - sentCount);

  const handleMarkSent = (phone) => {
    setSentPhones((prev) => {
      const next = new Set(prev);
      next.add(phone);
      return next;
    });
  };

  const handleSendCurrentBatch = () => {
    if (currentBatchCustomers.length === 0) return;
    const confirmed = window.confirm(
      `🚀 Open WhatsApp for Batch ${currentBatchIndex + 1} (${currentBatchCustomers.length} customers)?\n\nThis will launch ${currentBatchCustomers.length} WhatsApp message tabs.`
    );
    if (!confirmed) return;

    currentBatchCustomers.forEach((cust, i) => {
      setTimeout(() => {
        const url = getWhatsAppUrlForCustomer(cust);
        window.open(url, "_blank");
        handleMarkSent(cust.phone);
      }, i * 400);
    });
  };

  const handleResetBatch = () => {
    setSentPhones(new Set());
    setCurrentBatchIndex(0);
  };

  const handleLocalImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyImageToClipboard = async () => {
    if (!mediaUrl) {
      alert("Please select or enter an image link first.");
      return;
    }
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = mediaUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                "image/png": pngBlob
              })
            ]);
            alert("📋 Image copied to clipboard! Open WhatsApp and press Ctrl+V to paste the actual photo directly.");
          } catch (e) {
            console.error(e);
            alert("⚠️ Clipboard copy blocked by browser permissions. Right-click the photo in the Phone Simulator on the right, click 'Copy Image', and then paste it in WhatsApp.");
          }
        }, "image/png");
      };
      img.onerror = () => {
        alert("Failed to load image. Make sure the URL is a valid image link.");
      };
    } catch (err) {
      console.error(err);
      alert("Failed to copy image. Please copy it manually from the Phone Simulator on the right.");
    }
  };

  // Check access permission
  const isOwner =
    currentUser?.role === "master_admin" ||
    currentUser?.role === "owner" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "admin";
  const canAccess = isOwner || currentUser?.canAccessMarketing;

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customerList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.displayPhone.includes(q);

      if (!matchesSearch) return false;

      if (segmentFilter === "VIP") return c.totalSpent >= 500;
      if (segmentFilter === "RECENT") {
        const daysAgo = (new Date() - new Date(c.lastPurchase)) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      }
      if (segmentFilter === "PENDING") return c.pendingAmount > 0;

      return true;
    });
  }, [customerList, searchQuery, segmentFilter]);

  const handleToggleSelectAll = () => {
    if (selectedPhones.length === filteredCustomers.length) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(filteredCustomers.map((c) => c.phone));
    }
  };

  const handleToggleCustomer = (phone) => {
    if (selectedPhones.includes(phone)) {
      setSelectedPhones(selectedPhones.filter((p) => p !== phone));
    } else {
      setSelectedPhones([...selectedPhones, phone]);
    }
  };

  const storeName = settings?.storeName || "ROYAL FASHION MALL";
  const storePhone = settings?.phone || "";
  const storeAddress = settings?.address || "";

  const templates = {
    SALE: {
      HINGLISH: `🎉 MEGA SALE ALERT at ${storeName}! 🛍️\n\nDear {NAME},\nSpecial Sale Offers live now! Get up to 50% OFF on all fresh clothing collections.\n\n✨ Exclusive discounts waiting for you.\nVisit Us Today! 📍 ${storeAddress}\nPh: ${storePhone}`,
      HINDI: `🎉 ${storeName} में महा सेल ऑफर! 🛍️\n\nप्रिय {NAME},\nआपके लिए विशेष डिस्काउंट! सभी नए कपड़ों पर भारी छूट उपलब्ध है।\n\nआज ही पधारें! 📍 ${storeAddress}\nसंपर्क: ${storePhone}`,
      ENGLISH: `🎉 MEGA DISCOUNT SALE at ${storeName}! 🛍️\n\nDear {NAME},\nSpecial Sale Offers are live now! Get up to 50% OFF on fresh clothing collections.\n\nVisit Us Today! 📍 ${storeAddress}\nPh: ${storePhone}`,
    },
    FESTIVAL: {
      HINGLISH: `✨ FESTIVAL SPECIAL OFFER at ${storeName}! 🎁\n\nDear {NAME},\nIs festival season par paayein sabse behtareen kapdon ki range aur shandar discounts!\n\n🛍️ Buy More, Save More!\nVisit Us: 📍 ${storeAddress}\nPh: ${storePhone}`,
      HINDI: `✨ ${storeName} में त्यौहार विशेषांक ऑफर! 🎁\n\nप्रिय {NAME},\nइस त्यौहार के अवसर पर पाएं कपड़ों की नई वैरायटी और शानदार डिस्काउंट!\n\nआज ही आएं! 📍 ${storeAddress}\nफोन: ${storePhone}`,
      ENGLISH: `✨ FESTIVE SPECIAL OFFER at ${storeName}! 🎁\n\nDear {NAME},\nCelebrate this festival season with exclusive clothing collections & special discount vouchers!\n\nVisit Us: 📍 ${storeAddress}\nPh: ${storePhone}`,
    },
    NEW_ARRIVAL: {
      HINGLISH: `📦 FRESH NEW ARRIVALS at ${storeName}! ✨\n\nDear {NAME},\nNew stylish clothes and trendy items just arrived in stock!\n\nPehle aayein, pehle paayein!\nVisit Today: 📍 ${storeAddress}\nCall: ${storePhone}`,
      HINDI: `📦 ${storeName} में नया फैंसी स्टॉक आ गया है! ✨\n\nप्रिय {NAME},\nट्रेंडिंग और स्टाइलिश कपड़ों का नया स्टॉक काउंटर पर उपलब्ध है!\n\nजल्दी आएं! 📍 ${storeAddress}\nफोन: ${storePhone}`,
      ENGLISH: `📦 FRESH NEW STOCK ARRIVALS at ${storeName}! ✨\n\nDear {NAME},\nNew stylish clothes & fashion collections just landed!\n\nVisit Today: 📍 ${storeAddress}\nPh: ${storePhone}`,
    },
    UDHAR: {
      HINGLISH: `Dear {NAME},\nGentle reminder from ${storeName}. Aapka total pending Udhar balance ₹{PENDING} hai. Kripya samay par bhugtan karein. Dhanyawad! 🙏\nPh: ${storePhone}`,
      HINDI: `प्रिय {NAME},\n${storeName} से विनम्र सूचना। आपका बकाया उधारी राशि ₹{PENDING} है। कृपया समय पर भुगतान करें। धन्यवाद! 🙏\nफोन: ${storePhone}`,
      ENGLISH: `Dear {NAME},\nGentle payment reminder from ${storeName}. Your pending due amount is ₹{PENDING}. Kindly settle your payment when convenient. Thank you! 🙏\nPh: ${storePhone}`,
    },
  };

  const currentAdMessage = useMemo(() => {
    if (adTone === "CUSTOM") return customMessage;
    const catObj = templates[adTone] || templates.SALE;
    return catObj[messageLanguage] || catObj.HINGLISH;
  }, [adTone, messageLanguage, customMessage]);

  const handleAIGenerateMessage = () => {
    const aiPrompts = [
      `🎉 BOOM SALE at ${storeName}! 🛍️\nDear {NAME}, Special 1-Day Flash Sale is Live! Get FLAT 40% OFF on all suits, shirts & dresses!\nVisit Counter Now: 📍 ${storeAddress}`,
      `✨ WEEKEND SPECIAL DISCOUNT at ${storeName}! 👗\nDear {NAME}, Buy 2 Get 1 FREE on latest fashion arrivals this weekend!\nVisit Us Today: 📍 ${storeAddress}`,
      `🛍️ VIP CUSTOMER OFFER at ${storeName}! 🌟\nDear {NAME}, as our VIP Customer, get extra 20% OFF on your next purchase!\nShow this message at billing counter.`,
    ];
    const picked = aiPrompts[Math.floor(Math.random() * aiPrompts.length)];
    setAdTone("CUSTOM");
    setCustomMessage(picked);
  };

  const getWhatsAppUrlForCustomer = (cust) => {
    let msgText = currentAdMessage
      .replace(/\{NAME\}/g, cust.name || "Customer")
      .replace(/\{PENDING\}/g, cust.pendingAmount.toFixed(2));

    if (mediaUrl && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
      msgText += `\n\n📷 Promo Banner: ${mediaUrl}`;
    }

    return `https://api.whatsapp.com/send?phone=${cust.phone}&text=${encodeURIComponent(
      msgText
    )}`;
  };

  if (!canAccess) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text-muted)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          height: "100%",
          justifyContent: "center",
        }}
      >
        <Lock size={64} color="var(--accent-rose)" />
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>
          Access Restricted: WhatsApp Marketing Studio
        </h2>
        <div style={{ fontSize: "14px", maxWidth: "500px" }}>
          You do not have permission to access the WhatsApp Ad & Broadcast Studio. Please ask the Store Owner to enable <strong>"Allow staff to access WhatsApp Ad & Marketing Campaign Studio"</strong> in your account settings.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", height: "100%", padding: "4px" }}>

      {/* Header Banner - Sleek Dark Metallic Glassmorphism */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "linear-gradient(135deg, var(--accent-emerald), #059669)", padding: "10px", borderRadius: "14px", color: "#fff" }}>
              <Send size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#fff", margin: 0, tracking: "-0.5px" }}>
                WhatsApp Ad Campaign Hub
              </h2>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Reach your customers directly on WhatsApp with AI-generated promo banners, custom sales ads, and batch broadcasting.
              </div>
            </div>
          </div>
        </div>

        {/* Directory Metrics Header Indicators */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ background: "rgba(15, 23, 42, 0.55)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "14px", padding: "10px 18px", textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: "var(--accent-emerald)", fontWeight: "800", letterSpacing: "1px" }}>CONTACT DIRECTORY</span>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#fff", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
              {customerList.length} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>leads</span>
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.55)", border: "1px solid rgba(59, 130, 246, 0.35)", borderRadius: "14px", padding: "10px 18px", textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: "var(--accent-blue)", fontWeight: "800", letterSpacing: "1px" }}>CAMPAIGN TARGETS</span>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "var(--accent-blue)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
              {selectedPhones.length} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>selected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid - 3 Columns Layout (Directory, Campaign Builder, Smartphone Live Preview) */}
      <div className="marketing-studio-grid">

        {/* Column 1: Customer Selection & Directory (Left column) */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflow: "hidden",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: "900", fontSize: "15px", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
              <Users size={20} color="var(--accent-emerald)" />
              <span>Customer Contacts</span>
            </div>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                color: "var(--accent-blue)",
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "800",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {selectedPhones.length === filteredCustomers.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          {/* Search Input & Segment Filter Pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "11px" }} />
              <input
                type="text"
                className="form-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, name..."
                style={{ paddingLeft: "36px", fontSize: "13px", height: "38px", borderRadius: "10px" }}
              />
            </div>

            {/* Segment Filters */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { key: "ALL", label: `All (${customerList.length})` },
                { key: "VIP", label: `💎 VIP (> ₹500)` },
                { key: "RECENT", label: `📅 Recent (30 Days)` },
                { key: "PENDING", label: `⏳ Udhar Dues` },
              ].map((seg) => (
                <button
                  key={seg.key}
                  type="button"
                  onClick={() => setSegmentFilter(seg.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "800",
                    cursor: "pointer",
                    border: segmentFilter === seg.key ? "1.5px solid var(--accent-emerald)" : "1px solid var(--border-color)",
                    background: segmentFilter === seg.key ? "rgba(16, 185, 129, 0.25)" : "rgba(30, 41, 59, 0.4)",
                    color: segmentFilter === seg.key ? "var(--accent-emerald)" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {seg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table List */}
          <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No customer contacts match current filter criteria.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filteredCustomers.map((cust) => {
                  const isChecked = selectedPhones.includes(cust.phone);
                  return (
                    <div
                      key={cust.phone}
                      onClick={() => handleToggleCustomer(cust.phone)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 14px",
                        borderBottom: "1px solid var(--border-color)",
                        background: isChecked ? "rgba(16, 185, 129, 0.06)" : "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ color: isChecked ? "var(--accent-emerald)" : "var(--text-dim)", transition: "transform 0.15s ease" }}>
                          {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "13.5px", color: isChecked ? "var(--accent-emerald)" : "#fff" }}>
                            {cust.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                            {cust.displayPhone} • {cust.totalBills} purchases
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: "900", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                          ₹{cust.totalSpent.toFixed(0)}
                        </div>
                        {cust.pendingAmount > 0 && (
                          <span style={{ fontSize: "9px", background: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", padding: "1px 5px", borderRadius: "4px", fontWeight: "bold", display: "inline-block", marginTop: "2px" }}>
                            Due: ₹{cust.pendingAmount.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Campaign Studio & Ad Builder (Middle column) */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: "900", fontSize: "15px", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
              <Sparkles size={20} color="var(--accent-amber)" />
              <span>Broadcast Content & Batch settings</span>
            </div>

            {/* AI Assistant Generator Button */}
            <button
              type="button"
              onClick={handleAIGenerateMessage}
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), #d97706)",
                border: "none",
                color: "#fff",
                padding: "6px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                transition: "transform 0.15s ease",
              }}
            >
              <Sparkles size={14} />
              <span>🤖 AI Ad Generator</span>
            </button>
          </div>

          {/* Ad Campaign Category & Language Selectors */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "800", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>
                CAMPAIGN TYPE / GOAL
              </label>
              <select
                value={adTone}
                onChange={(e) => setAdTone(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="SALE">🚀 Megastore Sale Offer</option>
                <option value="FESTIVAL">🏮 Festive Season Special</option>
                <option value="NEW_ARRIVAL">📦 Fresh Arrivals Launch</option>
                <option value="UDHAR">💰 Pending Balance Reminder</option>
                <option value="CUSTOM">✍️ Custom Ad Text</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "800", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>
                PREFER LANGUAGE
              </label>
              <select
                value={messageLanguage}
                onChange={(e) => setMessageLanguage(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="HINGLISH">🇮🇳 Hinglish (Hindi/English mix)</option>
                <option value="HINDI">🇮🇳 Hindi (हिंदी)</option>
                <option value="ENGLISH">🇬🇧 English</option>
              </select>
            </div>
          </div>

          {/* Ad Message Editor Area */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "800", letterSpacing: "0.5px" }}>
                PROMO TEXT (VARIABLES: &#123;NAME&#125;, &#123;PENDING&#125;)
              </label>
            </div>
            <textarea
              className="form-control"
              rows={5}
              value={currentAdMessage}
              onChange={(e) => {
                setAdTone("CUSTOM");
                setCustomMessage(e.target.value);
              }}
              style={{ fontSize: "13px", lineHeight: "1.6", fontFamily: "sans-serif", borderRadius: "12px" }}
            />
          </div>

          {/* Attach Promo Image Banner link */}
          <div style={{ background: "rgba(15, 23, 42, 0.4)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#fff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Image size={16} color="var(--accent-blue)" />
              <span>Promo Image Poster / Banner Link</span>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                className="form-control"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://... (e.g. promo_poster.jpg)"
                style={{ flex: 1, fontSize: "12.5px", height: "36px", borderRadius: "8px" }}
              />
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => setMediaUrl("")}
                  style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.4)", color: "var(--accent-rose)", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Local Image File Upload Input */}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "700" }}>Or select from computer:</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLocalImageUpload}
                style={{ fontSize: "11px", color: "var(--text-main)", cursor: "pointer" }}
              />
            </div>

            {/* Poster Presets Quick Pills */}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setMediaUrl("https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80")}
                style={{ fontSize: "10.5px", padding: "4px 10px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.35)", color: "var(--accent-blue)", cursor: "pointer" }}
              >
                👗 Mega Sale Poster
              </button>
              <button
                type="button"
                onClick={() => setMediaUrl("https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80")}
                style={{ fontSize: "10.5px", padding: "4px 10px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "var(--accent-amber)", cursor: "pointer" }}
              >
                🏮 Festive Discount Banner
              </button>

              {/* Dedicated Copy Binary Image Button */}
              {mediaUrl && (
                <button
                  type="button"
                  onClick={handleCopyImageToClipboard}
                  style={{
                    fontSize: "11px",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, var(--accent-emerald), #059669)",
                    border: "none",
                    color: "#fff",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    marginLeft: "auto",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <Copy size={11} /> Copy Ad Image
                </button>
              )}
            </div>

            {/* Quick Photo Paste Info Guide */}
            <div style={{ marginTop: "12px", background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", borderRadius: "8px", padding: "8px 12px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <Info size={14} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                <strong style={{ color: "#fff" }}>How to send actual photos on WhatsApp:</strong>
                <div style={{ marginTop: "4px" }}>
                  1. <strong>Link Preview:</strong> Once you send the message, WhatsApp automatically displays a photo card preview of the link.
                </div>
                <div style={{ marginTop: "2px" }}>
                  2. <strong>Direct Paste (Recommended):</strong> Right-click the photo in the Phone Simulator on the right, select <strong>"Copy Image"</strong>, and then press <strong>Ctrl+V (Paste)</strong> directly in the customer's WhatsApp chat to attach the actual photo instantly!
                </div>
              </div>
            </div>
          </div>

          {/* Broadcast Panel with 5-Per-Batch Split Queue */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "900", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>Batch Sending Status</span>
                  <span style={{ fontSize: "11px", background: "rgba(59, 130, 246, 0.2)", color: "var(--accent-blue)", padding: "3px 8px", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
                    Batch {currentBatchIndex + 1} of {totalBatches}
                  </span>
                </div>
              </div>

              {/* Batch Size Selector & Copy Text */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span>Batch Size:</span>
                  <select
                    value={batchSize}
                    onChange={(e) => {
                      setBatchSize(Number(e.target.value));
                      setCurrentBatchIndex(0);
                    }}
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "3px 6px",
                      fontSize: "11px",
                      outline: "none",
                    }}
                  >
                    <option value={5}>5 per batch (Recommended)</option>
                    <option value={10}>10 per batch</option>
                    <option value={15}>15 per batch</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentAdMessage);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid var(--border-color)", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {copiedText ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                  <span>{copiedText ? "Copied!" : "Copy Text"}</span>
                </button>
              </div>
            </div>

            {/* Metric Status Counters (Sent vs Remaining) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "10px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--accent-emerald)", fontWeight: "800", letterSpacing: "0.5px" }}>✅ SENT</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {sentCount} / {totalSelectedCount}
                </div>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "10px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--accent-amber)", fontWeight: "800", letterSpacing: "0.5px" }}>⏳ REMAINING</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {remainingCount}
                </div>
              </div>

              <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", borderRadius: "10px", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "var(--accent-blue)", fontWeight: "800", letterSpacing: "0.5px" }}>🚀 BATCH TARGETS</div>
                <div style={{ fontSize: "16px", fontWeight: "900", color: "#fff", fontFamily: "var(--font-mono)", marginTop: "2px" }}>
                  {currentBatchCustomers.length}
                </div>
              </div>
            </div>

            {/* Batch Navigation & Send Action Buttons */}
            {totalSelectedCount > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSendCurrentBatch}
                  disabled={currentBatchCustomers.length === 0}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "900",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 6px 16px rgba(37, 211, 102, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <MessageCircle size={16} />
                  <span>Launch Batch {currentBatchIndex + 1} ({currentBatchCustomers.length} Tabs)</span>
                </button>

                {/* Pop-up Blocker Warning Notice */}
                <div style={{ width: "100%", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px", padding: "8px 12px", fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "flex-start", marginTop: "4px" }}>
                  <span style={{ color: "var(--accent-amber)", fontWeight: "900", whiteSpace: "nowrap" }}>⚠️ POP-UP BLOCKER NOTICE:</span>
                  <span>If your browser only opens 1 tab, click the **glowing Pop-up Blocked icon** in your browser's address bar and select **"Always allow pop-ups from this site"** to launch all tabs simultaneously!</span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    disabled={currentBatchIndex === 0}
                    onClick={() => setCurrentBatchIndex((prev) => Math.max(0, prev - 1))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid var(--border-color)",
                      color: currentBatchIndex === 0 ? "var(--text-dim)" : "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: currentBatchIndex === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    ◀ Prev
                  </button>

                  <button
                    type="button"
                    disabled={currentBatchIndex >= totalBatches - 1}
                    onClick={() => setCurrentBatchIndex((prev) => Math.min(totalBatches - 1, prev + 1))}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid var(--border-color)",
                      color: currentBatchIndex >= totalBatches - 1 ? "var(--text-dim)" : "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: currentBatchIndex >= totalBatches - 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Next ▶
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBatch}
                    title="Reset progress"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(244, 63, 94, 0.15)",
                      border: "1px solid rgba(244, 63, 94, 0.4)",
                      color: "var(--accent-rose)",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Reset 🔄
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Live WhatsApp Smartphone Mockup (Right column) */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          {/* Smartphone Frame Outer Mockup */}
          <div
            style={{
              width: "100%",
              maxWidth: "285px",
              height: "490px",
              borderRadius: "36px",
              border: "8px solid #2d3748",
              background: "#0b141a",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Phone Notch */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "50%",
                transform: "translateX(-50%)",
                width: "100px",
                height: "18px",
                background: "#2d3748",
                borderRadius: "0 0 10px 10px",
                zIndex: "5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: "40px", height: "4px", background: "#1a202c", borderRadius: "2px" }}></div>
            </div>

            {/* WhatsApp Contact Header Banner */}
            <div
              style={{
                background: "#075e54",
                padding: "20px 12px 10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#fff",
                borderBottom: "1px solid #054c44",
                boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                zIndex: "3",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "#128c7e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "12px",
                  color: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                {(previewCustomer.name || "C")[0]}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: "700", fontSize: "12.5px", color: "#fff", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                  <span>{previewCustomer.name || "Customer"}</span>
                  <span style={{ fontSize: "10px", color: "#34b7f1" }}>✓</span>
                </div>
                <div style={{ fontSize: "9.5px", color: "#a5d6a7", whiteSpace: "nowrap" }}>
                  Online (WhatsApp Chat Preview)
                </div>
              </div>
            </div>

            {/* Select Customer to preview mockup data */}
            <div style={{ padding: "6px 12px", background: "#128C7E", zIndex: "2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "10px", color: "#fff", fontWeight: "700" }}>Preview for:</span>
              <select
                value={previewCustomer.phone}
                onChange={(e) => setPreviewCustomerPhone(e.target.value)}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "1px 5px",
                  maxWidth: "140px",
                  outline: "none",
                }}
              >
                {customerList.map((c) => (
                  <option key={c.phone} value={c.phone} style={{ color: "#000" }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom WhatsApp Chat Background Wallpaper */}
            <div
              style={{
                flex: 1,
                padding: "12px",
                background: "url('https://user-images.githubusercontent.com/15075759/28719144-86ed0f74-7122-11e7-8bb2-aa96445e442c.png')",
                backgroundColor: "#efeae2",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {/* WhatsApp Date Divider */}
              <div style={{ alignSelf: "center", background: "rgba(225, 230, 235, 0.8)", padding: "3px 10px", borderRadius: "6px", fontSize: "9px", color: "#54656f", fontWeight: "bold", boxShadow: "0 1px 1px rgba(0,0,0,0.05)" }}>
                TODAY
              </div>

              {/* Mock Chat Bubble */}
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "92%",
                  background: "#d9fdd3",
                  borderRadius: "10px 0px 10px 10px",
                  padding: "8px 10px",
                  color: "#111b21",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  position: "relative",
                }}
              >
                {/* Media Image Banner inside message bubble */}
                {mediaUrl && (
                  <div style={{ marginBottom: "6px", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                    <img
                      src={mediaUrl}
                      alt="Promo Banner"
                      style={{ width: "100%", maxHeight: "110px", objectFit: "cover" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                )}

                {/* Personalized text body */}
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {currentAdMessage
                    .replace(/\{NAME\}/g, previewCustomer.name || "Customer")
                    .replace(/\{PENDING\}/g, previewCustomer.pendingAmount.toFixed(2))}
                </div>

                {/* Clock & Ticks info */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "2px", fontSize: "8.5px", color: "#667781", marginTop: "3px" }}>
                  <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span style={{ color: "#53bdeb", fontWeight: "bold" }}>✓✓</span>
                </div>
              </div>
            </div>

            {/* Mock Bottom Input Bar */}
            <div style={{ background: "#f0f2f5", padding: "8px 12px", display: "flex", gap: "6px", alignItems: "center", borderTop: "1px solid #e1e3e6" }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: "18px", padding: "6px 12px", fontSize: "10.5px", color: "#667781", border: "1px solid #e1e3e6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Type message...
              </div>
              <a
                href={getWhatsAppUrlForCustomer(previewCustomer)}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleMarkSent(previewCustomer.phone)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#00a884",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  textDecoration: "none",
                }}
              >
                <Send size={12} />
              </a>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "10.5px", marginTop: "12px", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", width: "100%", maxWidth: "285px" }}>
            <Info size={12} color="var(--accent-blue)" />
            <span>Interactive smartphone displays exact real-time message layout.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
