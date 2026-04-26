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
    // Small timeout ensures CSS transitions fire after first paint
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

      {/* LOGO */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1) translateY(0)" : "scale(0.85) translateY(-10px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 24,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
            boxShadow: "0 0 40px rgba(249,115,22,0.2)",
            margin: "0 auto",
          }}
        >
          <Image
            src="/logo.png"
            alt="Situation X"
            width={80}
            height={80}
            style={{ objectFit: "contain", borderRadius: 16 }}
          />
        </div>
      </div>

      {/* APP NAME */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s",
          textAlign: "center",
          marginBottom: 12,
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
            fontSize: "1.15rem",
            color: "#94a3b8",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.7,
            fontWeight: 400,
          }}
        >
          Your intelligent decision companion.<br />
          Clarity when it matters most.
        </p>
      </div>

      {/* CTA BUTTONS */}
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
        <button
          onClick={() => router.push("/register")}
          style={{
            padding: "14px 36px",
            background: "#f97316",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
            transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
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
          Get Started Free
        </button>

        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "14px 36px",
            background: "rgba(255,255,255,0.07)",
            color: "#f8fafc",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "transform 0.2s, background 0.2s",
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
          Login
        </button>
      </div>

      {/* DIVIDER LINE */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 1s ease 0.6s",
          width: "100%",
          maxWidth: 400,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          margin: "56px auto 0",
        }}
      />

      {/* BOTTOM LABEL */}
      <div
        style={{
          opacity: mounted ? 0.4 : 0,
          transition: "opacity 1s ease 0.7s",
          marginTop: 24,
          fontSize: "0.8rem",
          color: "#64748b",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Powered by AI · Guided by the Stars
      </div>
    </main>
  );
}
