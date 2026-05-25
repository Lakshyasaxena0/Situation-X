"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAppStore } from "../state/store";
import Sidebar from "./Sidebar";

export default function Navbar() {
  const { user } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(15,23,42,0.97)",
          backdropFilter: "blur(12px)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 56,
        }}
      >
        {/* HAMBURGER */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#94a3b8",
            width: 36,
            height: 36,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            cursor: "pointer",
            padding: 0,
          }}
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 16, height: 1.5, background: "#94a3b8", borderRadius: 2 }} />
          <span style={{ display: "block", width: 16, height: 1.5, background: "#94a3b8", borderRadius: 2 }} />
          <span style={{ display: "block", width: 16, height: 1.5, background: "#94a3b8", borderRadius: 2 }} />
        </button>

        {/* LOGO + NAME (centered) */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Image
            src="/logo.png"
            alt="Situation X"
            width={30}
            height={30}
            style={{
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "drop-shadow(0 0 6px rgba(249,115,22,0.5)) brightness(1.3)",
            }}
          />
          <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1rem" }}>
            Situation <span style={{ color: "#f97316" }}>X</span>
          </span>
        </Link>

        {/* RIGHT — login or avatar */}
        {user ? (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
            onClick={() => setSidebarOpen(true)}
          >
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              color: "#f97316",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            Sign In
          </Link>
        )}
      </nav>
    </>
  );
}
