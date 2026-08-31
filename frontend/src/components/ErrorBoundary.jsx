import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            padding: "20px",
            color: "#fff",
            fontFamily: "var(--font-sans, sans-serif)",
          }}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              borderRadius: "20px",
              maxWidth: "480px",
              width: "100%",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(244, 63, 94, 0.15)",
                color: "var(--accent-rose, #f43f5e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "0 0 8px 0" }}>
              Application Recovery Protocol
            </h2>
            <p style={{ color: "var(--text-muted, #94a3b8)", fontSize: "13px", margin: "0 0 20px 0" }}>
              An unexpected display issue occurred. Your data is completely safe.
            </p>

            <div
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "12px",
                color: "var(--accent-rose, #f43f5e)",
                fontFamily: "monospace",
                marginBottom: "24px",
                textAlign: "left",
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.toString() || "Unknown Component Error"}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent-indigo, #6366f1), var(--accent-purple, #a855f7))",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <RefreshCw size={16} />
                <span>Reload App</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Home size={16} />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
