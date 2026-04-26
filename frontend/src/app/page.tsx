"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAppStore } from "../state/store";
import InputBox from "../components/InputBox";
import { analyzeInput } from "../services/analyze";

export default function HomePage() {
  const router = useRouter();
  const { token, user, setAnalysis, setLoading, setError, isLoading } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ── LOGGED-IN VIEW ──────────────────────────────────────────────────────────
  if (token && user) {
    const handleSubmit = async (input: string) => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const result = await analyzeInput(input, token);
        setAnalysis(result);
        router.push("/result");
      } catch (error: any) {
        setError(error.message || "Analysis failed");
      } finally {
        setLoading(false);
      }
    };

    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back,{" "}
            <span className="text-orange-500">{user.name || user.email}</span>
          </h1>
          <p className="text-gray-500">Describe your situation and let AI guide you</p>
        </div>
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
          className="w-full"
        >
          <InputBox onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </main>
    );
  }

  // ── LANDING PAGE ─────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f2027 70%, #1a1a2e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Glow accents */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "8%",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
        }}
      />

      {/* LOGO — mix-blend-mode:screen removes white background */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1) translateY(0)" : "scale(0.85) translateY(-10px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          marginBottom: 24,
        }}
      >
        <Image
          src="/logo.png"
          alt="Situation X"
          width={160}
          height={160}
          style={{
            objectFit: "contain",
            mixBlendMode: "screen",   // removes white background on dark bg
            filter: "drop-shadow(0 0 24px rgba(249,115,22,0.4))",
          }}
        />
      </div>

      {/* APP NAME */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#f8fafc",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          Situation{" "}
          <span style={{ color: "#f97316" }}>X</span>
        </h1>
      </div>

      {/* TAGLINE */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s",
          textAlign: "center",
          marginBottom: 48,
        }}
      >
        <p
          style={{
            fontSize: "1.2rem",
            color: "#94a3b8",
            margin: 0,
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          Clarity in every direction
        </p>
      </div>

      {/* BUTTONS — Sign In + Login */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease 0.45s, transform 0.8s ease 0.45s",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* SIGN IN — primary */}
        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "14px 40px",
            background: "#f97316",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
            transition: "transform 0.2s, box-shadow 0.2s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(249,115,22,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(249,115,22,0.35)";
          }}
        >
          Sign In
        </button>

        {/* CREATE ACCOUNT — secondary */}
        <button
          onClick={() => router.push("/register")}
          style={{
            padding: "14px 40px",
            background: "rgba(255,255,255,0.07)",
            color: "#f8fafc",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "transform 0.2s, background 0.2s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
          }}
        >
          Create Account
        </button>
      </div>
    </main>
  );
}
