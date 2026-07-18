import React, { useState } from "react";
import { UserCircle, Shield, Store, Lock, KeyRound } from "lucide-react";
import { loginWorker } from "../utils/api";

export default function LoginScreen({ onLogin }) {
  const [activeTab, setActiveTab] = useState("cashier");
  
  // Cashier Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Owner Login State
  const [adminPin, setAdminPin] = useState("");
  
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCashierLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const res = await loginWorker(username, password);
    setIsLoading(false);

    if (res && res.success) {
      onLogin({
        role: "cashier",
        name: res.worker.name,
        counter: res.worker.counter,
        username: res.worker.username,
        id: res.worker.id,
      });
    } else {
      setErrorMsg(res?.message || "Invalid credentials. Please try again.");
    }
  };

  const handleOwnerLogin = (e) => {
    e.preventDefault();
    setErrorMsg("");
    // Hardcoded owner PIN for now
    if (adminPin === "admin123") {
      onLogin({
        role: "owner",
        name: "Store Owner",
        counter: "Owner Dashboard",
        username: "admin",
      });
    } else {
      setErrorMsg("Incorrect Admin PIN.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
      padding: "20px",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "420px",
        padding: "36px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}>
        
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px", height: "64px", margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
            borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 10px 20px rgba(99,102,241,0.3)"
          }}>
            <Store size={32} color="#fff" />
          </div>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", margin: "0 0 6px 0" }}>
            Bill Book POS
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            Sign in to access your billing counter
          </p>
        </div>

        {/* Custom Tabs */}
        <div style={{
          display: "flex", background: "rgba(15,23,42,0.6)", borderRadius: "12px",
          padding: "4px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.05)"
        }}>
          <button
            onClick={() => { setActiveTab("cashier"); setErrorMsg(""); }}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: activeTab === "cashier" ? "rgba(99,102,241,0.2)" : "transparent",
              color: activeTab === "cashier" ? "#fff" : "var(--text-muted)",
              fontWeight: activeTab === "cashier" ? "700" : "500",
              fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer", transition: "all 0.3s"
            }}
          >
            <UserCircle size={16} /> Cashier
          </button>
          <button
            onClick={() => { setActiveTab("owner"); setErrorMsg(""); }}
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: activeTab === "owner" ? "rgba(245,158,11,0.2)" : "transparent",
              color: activeTab === "owner" ? "#fff" : "var(--text-muted)",
              fontWeight: activeTab === "owner" ? "700" : "500",
              fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: "pointer", transition: "all 0.3s"
            }}
          >
            <Shield size={16} /> Owner
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)",
            color: "var(--accent-rose)", padding: "12px", borderRadius: "8px",
            fontSize: "13px", textAlign: "center", marginBottom: "20px", fontWeight: "600"
          }}>
            {errorMsg}
          </div>
        )}

        {/* Cashier Form */}
        {activeTab === "cashier" && (
          <form onSubmit={handleCashierLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <UserCircle size={18} color="var(--text-dim)" style={{ position: "absolute", left: "14px", top: "14px" }} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter cashier username"
                  style={{
                    width: "100%", padding: "12px 12px 12px 42px", borderRadius: "10px",
                    background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: "14px", outline: "none", transition: "border 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent-indigo)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color="var(--text-dim)" style={{ position: "absolute", left: "14px", top: "14px" }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%", padding: "12px 12px 12px 42px", borderRadius: "10px",
                    background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: "14px", outline: "none", transition: "border 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent-indigo)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: "10px", width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, var(--accent-indigo), #6366f1)",
                color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)", transition: "transform 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
              onMouseOver={(e) => e.target.style.transform = "translateY(-1px)"}
              onMouseOut={(e) => e.target.style.transform = "none"}
            >
              {isLoading ? "Signing in..." : "Sign In to Counter"}
            </button>
          </form>
        )}

        {/* Owner Form */}
        {activeTab === "owner" && (
          <form onSubmit={handleOwnerLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Master Admin PIN
              </label>
              <div style={{ position: "relative" }}>
                <KeyRound size={18} color="var(--text-dim)" style={{ position: "absolute", left: "14px", top: "14px" }} />
                <input
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter admin pin (default: admin123)"
                  style={{
                    width: "100%", padding: "12px 12px 12px 42px", borderRadius: "10px",
                    background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff", fontSize: "14px", outline: "none", transition: "border 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--accent-amber)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: "10px", width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                background: "linear-gradient(135deg, var(--accent-amber), #d97706)",
                color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(245,158,11,0.4)", transition: "transform 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
              onMouseOver={(e) => e.target.style.transform = "translateY(-1px)"}
              onMouseOut={(e) => e.target.style.transform = "none"}
            >
              Access Dashboard
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
