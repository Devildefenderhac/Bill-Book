import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  LayoutDashboard,
  Receipt,
  Clock,
  User,
  LogOut,
  Send,
  Menu,
  X,
  ShieldCheck,
  Printer,
} from "lucide-react";

export default function Header({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  onLogout,
  onOpenSettings,
  onOpenHistory = () => {},
  onOpenBackup = () => {},
  printerConnected = false,
  printerName = "",
  onTogglePrinter = () => {},
  onTestPrinter = () => {},
}) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setDateStr(now.toLocaleDateString("en-GB"));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isMasterAdmin = currentUser?.role === "master_admin";
  const isOwner =
    isMasterAdmin ||
    currentUser?.role === "owner" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "admin";
  const canAccessMarketing = isOwner || currentUser?.canAccessMarketing;

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-top-row">
        <div className="brand-logo">
          <button
            className="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="brand-icon">
            <ShoppingBag size={22} />
          </div>
          <div className="brand-text-container">
            <h1 className="brand-title">{settings?.storeName || "ROYAL FASHION MALL"}</h1>
            <div className="brand-sub">Clothing Shopping Mall POS</div>
          </div>
        </div>

        {/* Desktop & Mobile Drawer Navigation Tabs */}
        <nav className={`nav-tabs ${mobileMenuOpen ? "mobile-drawer-open" : ""}`}>
          {!isMasterAdmin && (
            <button
              className={`nav-tab-btn ${activeTab === "billing" ? "active" : ""}`}
              onClick={() => handleTabClick("billing")}
            >
              <Receipt size={16} />
              <span>Billing Counter</span>
            </button>
          )}

          {canAccessMarketing && (
            <button
              className={`nav-tab-btn ${activeTab === "marketing" ? "active" : ""}`}
              onClick={() => handleTabClick("marketing")}
              style={{
                borderColor: activeTab === "marketing" ? "var(--accent-emerald)" : "transparent",
                color: activeTab === "marketing" ? "#fff" : "var(--accent-emerald)",
              }}
            >
              <Send size={16} color="var(--accent-emerald)" />
              <span>WhatsApp Ad Studio</span>
            </button>
          )}

          {isOwner && (
            <button
              className={`nav-tab-btn ${activeTab === "owner" ? "active" : ""}`}
              onClick={() => handleTabClick("owner")}
            >
              <LayoutDashboard size={16} />
              <span>Owner Dashboard</span>
            </button>
          )}



          <button
            className={`nav-tab-btn printer-btn ${printerConnected ? "connected" : ""}`}
            onClick={() => { onTogglePrinter(); setMobileMenuOpen(false); }}
            style={{
              borderColor: printerConnected ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.3)",
              background: printerConnected ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.08)",
              color: printerConnected ? "#34d399" : "#f87171",
              fontWeight: "700"
            }}
            title={printerConnected ? "Thermal Printer is Connected & Ready" : "Click to Connect USB Thermal Printer"}
          >
            <Printer size={16} color={printerConnected ? "#34d399" : "#f87171"} />
            <span>{printerConnected ? "Printer Ready 🟢" : "Connect Printer 🖨️"}</span>
          </button>

          {isOwner && (
            <button
              className="nav-tab-btn mobile-only-tab"
              onClick={() => { onOpenBackup(); setMobileMenuOpen(false); }}
              style={{ color: "var(--accent-blue)" }}
            >
              <ShieldCheck size={16} />
              <span>Backup System</span>
            </button>
          )}

          <button
            className="nav-tab-btn mobile-only-tab logout-btn"
            onClick={() => { onLogout(); setMobileMenuOpen(false); }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </nav>

        <div className="header-right">
          <div className="live-clock">
            <Clock size={14} />
            <span>{dateStr} | {timeStr}</span>
          </div>

          <div className="status-badge">
            <span className="status-dot"></span>
            <User size={12} />
            <span className="status-user-text">
              {isMasterAdmin
                ? `👑 ${currentUser?.name || "Master Admin"}`
                : `${currentUser?.name || "Online"} (${currentUser?.role === "admin" || currentUser?.role === "owner" ? "Admin" : "Cashier"})`}
            </span>
          </div>
        </div>
      </div>



      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  );
}
