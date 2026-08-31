import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  LayoutDashboard,
  Receipt,
  Clock,
  User,
  Settings,
  ShieldCheck,
} from "lucide-react";

export default function Header({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
}) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-header">
      {/* Brand logo */}
      <div className="brand-logo">
        <div className="brand-icon">
          <ShoppingBag size={22} />
        </div>
        <div>
          <h1 className="brand-title">{settings?.storeName || "BILL BOOK MALL"}</h1>
          <div className="brand-sub">Clothing Shopping Mall POS</div>
        </div>
      </div>

      {/* Nav Tabs (Role Switcher) */}
      <div className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === "billing" ? "active" : ""}`}
          onClick={() => setActiveTab("billing")}
        >
          <Receipt size={16} />
          <span>Billing Counter</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "owner" ? "active" : ""}`}
          onClick={() => setActiveTab("owner")}
        >
          <LayoutDashboard size={16} />
          <span>Owner Dashboard</span>
        </button>
      </div>

      {/* Header Right Items */}
      <div className="header-right">
        <div className="live-clock">
          <Clock size={14} />
          <span>{dateStr} | {timeStr}</span>
        </div>

        <div className="status-badge">
          <span className="status-dot"></span>
          <User size={12} />
          <span>{settings?.workerName || "Worker Online"}</span>
        </div>

        <button
          className="nav-tab-btn"
          onClick={onOpenSettings}
          title="Store Settings"
          style={{ padding: "8px" }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
