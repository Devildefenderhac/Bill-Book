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
  RefreshCw,
  Cloud,
  CloudOff,
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
  syncState = { status: "synced", lastSynced: null, queueCount: 0 },
  onManualSync = () => {},
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

        {/* Universal Slide-Out Navigation Drawer (All Screen Ratios) */}
        <nav className={`nav-tabs ${mobileMenuOpen ? "mobile-drawer-open" : ""}`}>
          <div className="drawer-header">
            <div className="drawer-brand">
              <div className="brand-icon">
                <ShoppingBag size={18} />
              </div>
              <div>
                <div className="drawer-title">
                  {settings?.storeName || "ROYAL FASHION MALL"}
                </div>
                <div className="drawer-subtitle">
                  Menu & Navigation
                </div>
              </div>
            </div>
            <button
              className="drawer-close-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Profile & Live Cloud Sync Status inside Drawer */}
          <div className="mobile-drawer-user-section" style={{ padding: "8px 12px 14px", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="status-badge" style={{ width: "100%", justifyContent: "center", padding: "8px 12px", fontSize: "12.5px" }}>
              <span className="status-dot"></span>
              <User size={14} />
              <span style={{ fontWeight: "800" }}>
                {isMasterAdmin ? `👑 ${currentUser?.name || "Master Admin"}` : (currentUser?.name || "Active Operator")}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", marginLeft: "4px" }}>
                ({currentUser?.role || "operator"})
              </span>
            </div>

            <button
              className={`sync-status-btn ${syncState.status}`}
              onClick={onManualSync}
              style={{ width: "100%", justifyContent: "center", padding: "8px 12px", fontSize: "12px" }}
            >
              {syncState.status === "synced" ? (
                <>
                  <span className="sync-pulse-dot online"></span>
                  <Cloud size={14} />
                  <span>Live Cloud Synced</span>
                  <RefreshCw size={12} className="sync-refresh-icon" />
                </>
              ) : syncState.status === "syncing" ? (
                <>
                  <span className="sync-pulse-dot syncing"></span>
                  <RefreshCw size={14} className="spinning" />
                  <span>Syncing database...</span>
                </>
              ) : (
                <>
                  <span className="sync-pulse-dot offline"></span>
                  <CloudOff size={14} />
                  <span>Offline {syncState.queueCount > 0 ? `(${syncState.queueCount} Q)` : ""} • Tap to Sync</span>
                  <RefreshCw size={12} className="sync-refresh-icon" />
                </>
              )}
            </button>
          </div>

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
              className="nav-tab-btn"
              onClick={() => { onOpenBackup(); setMobileMenuOpen(false); }}
              style={{ color: "var(--accent-blue)" }}
            >
              <ShieldCheck size={16} />
              <span>Backup System</span>
            </button>
          )}

          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <button
              className="nav-tab-btn logout-btn"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
            >
              <LogOut size={16} />
              <span>Logout Account</span>
            </button>
          </div>
        </nav>

        <div className="header-right">
          {/* Real-time Cloud Sync status & manual refresh */}
          <button
            className={`sync-status-btn ${syncState.status}`}
            onClick={onManualSync}
            title={
              syncState.status === "synced"
                ? `Cloud Live: Synced${syncState.lastSynced ? ` at ${syncState.lastSynced.toLocaleTimeString()}` : ""} • Click to sync now`
                : syncState.status === "syncing"
                ? "Syncing data with cloud database..."
                : `Offline Mode (${syncState.queueCount} unsynced bill${syncState.queueCount === 1 ? "" : "s"}) • Click to retry connection`
            }
          >
            {syncState.status === "synced" ? (
              <>
                <span className="sync-pulse-dot online"></span>
                <Cloud size={13} />
                <span className="sync-text">Live Cloud</span>
                <RefreshCw size={11} className="sync-refresh-icon" />
              </>
            ) : syncState.status === "syncing" ? (
              <>
                <span className="sync-pulse-dot syncing"></span>
                <RefreshCw size={13} className="spinning" />
                <span className="sync-text">Syncing...</span>
              </>
            ) : (
              <>
                <span className="sync-pulse-dot offline"></span>
                <CloudOff size={13} />
                <span className="sync-text">
                  Offline {syncState.queueCount > 0 ? `(${syncState.queueCount} Q)` : ""}
                </span>
                <RefreshCw size={11} className="sync-refresh-icon" />
              </>
            )}
          </button>

          <div className="live-clock">
            <Clock size={14} />
            <span>{dateStr} | {timeStr}</span>
          </div>

          <div className="status-badge" title={isMasterAdmin ? `👑 ${currentUser?.name || "Master Admin"}` : `${currentUser?.name || "Online"}`}>
            <span className="status-dot"></span>
            <User size={12} />
            <span className="status-user-text">
              {isMasterAdmin
                ? `👑 ${currentUser?.name?.split(" ")[0] || "Master"}`
                : `${currentUser?.name?.split(" ")[0] || "Online"}`}
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
