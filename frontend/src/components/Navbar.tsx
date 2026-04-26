"use client";
import Link from "next/link";
import Image from "next/image";
import { useAppStore } from "../state/store";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(15,23,42,0.97)",
        backdropFilter: "blur(12px)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 60,
      }}
    >
      {/* LOGO + NAME */}
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
      >
        {/* Logo with mix-blend-mode to kill white bg */}
        <div style={{ width: 36, height: 36, display: "flex", alignItems: "center" }}>
          <Image
            src="/logo.png"
            alt="Situation X"
            width={36}
            height={36}
            style={{
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "drop-shadow(0 0 6px rgba(249,115,22,0.5))",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#f8fafc",
            letterSpacing: "-0.01em",
          }}
        >
          Situation <span style={{ color: "#f97316" }}>X</span>
        </span>
      </Link>

      {/* NAV LINKS */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {user ? (
          <>
            {[
              { href: "/", label: "Home" },
              { href: "/history", label: "History" },
              { href: "/feedback", label: "Feedback" },
              { href: "/settings", label: "Settings" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: "#94a3b8",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.88rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 16px",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "0.83rem",
                fontWeight: 600,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(239,68,68,0.22)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(239,68,68,0.12)")
              }
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                color: "#94a3b8",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "0.88rem",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              style={{
                padding: "7px 18px",
                background: "#f97316",
                color: "#fff",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: "0.83rem",
                transition: "background 0.2s",
                boxShadow: "0 2px 12px rgba(249,115,22,0.3)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#ea6c0a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#f97316")
              }
            >
              Create Account
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
