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
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  // ── LOGGED-IN VIEW ────────────────────────────────────────────────────────
  if (token && user) {
    const handleSubmit = async (input: string) => {
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
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: "80px 16px 32px" }}>
        <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease, transform 0.6s ease", textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(1.4rem, 5vw, 2rem)", fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
            Welcome back, <span style={{ color: "#f97316" }}>{user.name || user.email}</span>
          </h1>
          <p style={{ color: "#6b7280", fontSize: "clamp(0.85rem, 3vw, 1rem)", margin: 0 }}>
            Describe your situation and let AI guide you
          </p>
        </div>
        <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s", width: "100%", maxWidth: 600 }}>
          <InputBox onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </main>
    );
  }

  // ── LANDING PAGE ──────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(150deg, #0f172a 0%, #1e293b 45%, #0f2027 75%, #1a1a2e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "50px 50px", pointerEvents: "none" }} />

      {/* Orange glow */}
      <div style={{ position: "absolute", top: "15%", left: "5%", width: "50vw", height: "50vw", maxWidth: 320, maxHeight: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />

      {/* LOGO */}
      <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "scale(1)" : "scale(0.8)", transition: "opacity 0.7s ease, transform 0.7s ease", marginBottom: "clamp(16px, 4vw, 28px)" }}>
        <Image
          src="/logo.png"
          alt="Situation X"
          width={180}
          height={180}
          style={{
            objectFit: "contain",
            mixBlendMode: "screen",
            filter: "drop-shadow(0 0 32px rgba(249,115,22,0.45)) brightness(1.2)",
            width: "clamp(120px, 30vw, 180px)",
            height: "clamp(120px, 30vw, 180px)",
          }}
        />
      </div>

      {/* APP NAME */}
      <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s", textAlign: "center", marginBottom: "clamp(8px, 2vw, 14px)" }}>
        <h1 style={{ fontSize: "clamp(2.2rem, 10vw, 4.5rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#f8fafc", margin: 0, lineHeight: 1.1 }}>
          Situation <span style={{ color: "#f97316" }}>X</span>
        </h1>
      </div>

      {/* TAGLINE */}
      <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s", textAlign: "center", marginBottom: "clamp(32px, 8vw, 52px)" }}>
        <p style={{ fontSize: "clamp(0.95rem, 3.5vw, 1.2rem)", color: "#94a3b8", margin: 0, fontWeight: 400, letterSpacing: "0.01em" }}>
          Clarity in every direction
        </p>
      </div>

      {/* BUTTONS — Sign Up + Login only */}
      <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.7s ease 0.45s, transform 0.7s ease 0.45s", display: "flex", gap: "clamp(10px, 3vw, 16px)", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>

        {/* SIGN UP */}
        <button
          onClick={() => router.push("/register")}
          style={{ padding: "clamp(12px, 3vw, 15px) clamp(28px, 8vw, 44px)", background: "#f97316", color: "#fff", fontSize: "clamp(0.9rem, 3vw, 1rem)", fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(249,115,22,0.4)", transition: "transform 0.2s, box-shadow 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(249,115,22,0.55)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(249,115,22,0.4)"; }}
        >
          Sign Up
        </button>

        {/* LOGIN */}
        <button
          onClick={() => router.push("/login")}
          style={{ padding: "clamp(12px, 3vw, 15px) clamp(28px, 8vw, 44px)", background: "rgba(255,255,255,0.07)", color: "#f8fafc", fontSize: "clamp(0.9rem, 3vw, 1rem)", fontWeight: 600, borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer", backdropFilter: "blur(8px)", transition: "transform 0.2s, background 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
        >
          Login
        </button>
      </div>
    </main>
  );
}
