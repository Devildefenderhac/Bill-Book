import React, { useState } from "react";
import { Store, Lock, User, LogIn, ShieldCheck, UserCheck, Eye, EyeOff } from "lucide-react";
import { loginWorker } from "../utils/api";
import { INITIAL_WORKERS } from "../data/initialData";
import { decryptEncryptedObject } from "../utils/storageCrypto";

async function sha256Hex(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function LoginScreen({ onLogin, workers = [] }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "");

    // 1. Authenticate against backend API if running locally with backend
    if (isLocalhost) {
      try {
        const res = await loginWorker(username, password);
        if (res && res.success && res.worker) {
          setIsLoading(false);
          const workerRole = res.worker.role || "Cashier";
          const isMasterAdminRole = workerRole === "master_admin" || res.worker.id === "master-admin-01";
          const isAdminRole =
            workerRole === "Admin" ||
            workerRole === "admin" ||
            workerRole === "Owner" ||
            workerRole === "owner";

          onLogin({
            role: isMasterAdminRole ? "master_admin" : isAdminRole ? "admin" : "cashier",
            name: res.worker.name,
            counter: res.worker.counter || (isMasterAdminRole ? "Master Dashboard" : isAdminRole ? "Admin 1" : "1"),
            username: res.worker.username || cleanUser,
            id: res.worker.id,
            canCancelBills: res.worker.canCancelBills,
            canAccessMarketing: res.worker.canAccessMarketing,
          });
          return;
        } else if (res && !res.success && res.message) {
          setIsLoading(false);
          setErrorMsg(res.message);
          return;
        }
      } catch (err) {
        console.warn("Backend API unavailable, using offline fallback", err);
      }
    }

    // 2. Client-side / Offline / GitHub Pages authentication
    try {
      const decInitial = (await decryptEncryptedObject(INITIAL_WORKERS || [])) || [];
      const decWorkers = (await decryptEncryptedObject(workers || [])) || [];

      // Combine worker list with default seeds so all accounts are verifiable offline
      const allCandidates = [...decWorkers, ...decInitial];
      const matchedWorker = allCandidates.find((w) => {
        if (!w) return false;
        const u = String(w.username || "").trim().toLowerCase();
        const p = String(w.phone || "").trim().toLowerCase();
        const id = String(w.id || "").trim().toLowerCase();
        return u === cleanUser || p === cleanUser || id === cleanUser;
      });

      if (matchedWorker) {
        const inputHash = await sha256Hex(cleanPass);

        const isPassValid =
          (matchedWorker.passwordHash && matchedWorker.passwordHash === inputHash) ||
          (matchedWorker.legacyHash && matchedWorker.legacyHash === inputHash) ||
          (matchedWorker.password && String(matchedWorker.password).trim() === cleanPass);

        if (isPassValid) {
          setIsLoading(false);
          const workerRole = matchedWorker.role || "Cashier";
          const isMasterAdminRole = workerRole === "master_admin" || matchedWorker.id === "master-admin-01";
          const isAdminRole =
            workerRole === "Admin" ||
            workerRole === "admin" ||
            workerRole === "Owner" ||
            workerRole === "owner";

          onLogin({
            role: isMasterAdminRole ? "master_admin" : isAdminRole ? "admin" : "cashier",
            name: matchedWorker.name,
            counter: matchedWorker.counter || (isMasterAdminRole ? "Master Dashboard" : isAdminRole ? "Admin 1" : "1"),
            username: matchedWorker.username || cleanUser,
            id: matchedWorker.id,
            canCancelBills: matchedWorker.canCancelBills,
            canAccessMarketing: matchedWorker.canAccessMarketing,
          });
          return;
        }
      }
    } catch (e) {
      console.error("Offline authentication error:", e);
    }

    setIsLoading(false);
    setErrorMsg("Invalid Account ID or Password. Please check and try again.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        padding: "20px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          background: "rgba(30, 41, 59, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "440px",
          padding: "36px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 16px",
              background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 20px rgba(99,102,241,0.3)",
            }}
          >
            <Store size={32} color="#fff" />
          </div>
          <h1
            style={{
              color: "#fff",
              fontSize: "24px",
              fontWeight: "800",
              letterSpacing: "-0.5px",
              margin: "0 0 6px 0",
            }}
          >
            Bill Book POS
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
            Sign in with your Account ID & Password
          </p>
        </div>



        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              color: "var(--accent-rose)",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              textAlign: "center",
              marginBottom: "18px",
              fontWeight: "600",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Account ID / Username
            </label>
            <div style={{ position: "relative" }}>
              <User size={18} color="var(--text-dim)" style={{ position: "absolute", left: "14px", top: "14px" }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Account ID (e.g. admin, cashier1)"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 42px",
                  borderRadius: "10px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-indigo)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: "var(--text-muted)",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Password / Security PIN
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="var(--text-dim)" style={{ position: "absolute", left: "14px", top: "14px" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 42px",
                  borderRadius: "10px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-indigo)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.transform = "translateY(-1px)")}
            onMouseOut={(e) => (e.target.style.transform = "none")}
          >
            <LogIn size={18} />
            <span>{isLoading ? "Authenticating..." : "Sign In to System"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
