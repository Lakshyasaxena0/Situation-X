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
    setMounted(true);
  }, []);

  // If logged in — show the analysis input
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
        <div className={`text-center mb-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, <span className="text-orange-500">{user.name || user.email}</span>
          </h1>
          <p className="text-gray-500">Describe your situation and let AI guide you</p>
        </div>
        <div className={`w-full transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <InputBox onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
      </main>
    );
  }

  // Landing page for guests
  return (
    <main className="min-h-screen bg-gray-50">

      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* LOGO */}
        <div className={`mb-6 transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <Image
            src="/logo.png"
            alt="Situation X Logo"
            width={100}
            height={100}
            className="mx-auto rounded-2xl shadow-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* TITLE */}
        <div className={`transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Situation <span className="text-orange-500">X</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto mb-8">
            AI-powered decision engine that analyzes your real-life situations,
            detects intent & emotion, and guides you to the best path forward.
          </p>
        </div>

        {/* CTA BUTTONS */}
        <div className={`flex gap-4 flex-wrap justify-center mb-16 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <button
            onClick={() => router.push("/register")}
            className="px-8 py-3 bg-orange-500 text-white text-lg font-semibold rounded-xl hover:bg-orange-600 shadow-md transition"
          >
            Get Started Free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-white text-gray-800 text-lg font-semibold rounded-xl border border-gray-300 hover:bg-gray-100 shadow-sm transition"
          >
            Login
          </button>
        </div>

        {/* FEATURE CARDS */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {[
            {
              icon: "🧠",
              title: "Intent Analysis",
              desc: "AJIT engine detects what you truly need — decision, career, relationship, or health guidance.",
            },
            {
              icon: "💫",
              title: "Emotion Detection",
              desc: "MANU engine reads your emotional state to tailor advice that fits how you actually feel.",
            },
            {
              icon: "🪐",
              title: "Astro Insight",
              desc: "Real planetary positions and Vimshottari Dasha add a cosmic layer to your decision.",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
