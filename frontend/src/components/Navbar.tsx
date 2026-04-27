"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppStore } from "../state/store";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAppStore();
  const router = useRouter();

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleNav = (href: string) => {
    onClose();
    router.push(href);
  };

  const handleLogout = () => {
    logout();
    onClose();
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/history", label: "History", icon: "📋" },
    { href: "/profile", label: "Profile", icon: "👤" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 100,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.25s ease",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* SIDEBAR PANEL */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          background: "linear-gradient(180deg, #0f172a 0%, #1a1a2e 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          zIndex: 101,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "4px 0 40px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* SIDEBAR HEADER — Logo */}
        <div
          style={{
            padding: "24px 20px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image
              src="/logo.png"
              alt="Situation X"
              width={44}
              height={44}
              style={{
                objectFit: "contain",
                mixBlendMode: "screen",
                filter: "drop-shadow(0 0 8px rgba(249,115,22,0.5)) brightness(1.3)",
              }}
            />
            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1.05rem" }}>
              Situation <span style={{ color: "#f97316" }}>X</span>
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#94a3b8",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* USER INFO (if logged in) */}
        {user && (
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1rem",
                flexShrink: 0,
              }}
            >
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p style={{ color: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>
                {user.name || "User"}
              </p>
              <p style={{ color: "#64748b", fontSize: "0.75rem", margin: 0 }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* NAV ITEMS */}
        <div style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          <p style={{ color: "#475569", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 10px 4px", margin: 0 }}>
            Navigation
          </p>

          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 12px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.9rem",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s, color 0.15s",
                marginBottom: 2,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(249,115,22,0.1)";
                (e.currentTarget as HTMLButtonElement).style.color = "#f97316";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "11px 12px",
                borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.08)",
                color: "#f87171",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.16)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)")}
            >
              <span>🚪</span> Logout
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => handleNav("/register")}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "none",
                  background: "#f97316",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign Up
              </button>
              <button
                onClick={() => handleNav("/login")}
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "#94a3b8",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
