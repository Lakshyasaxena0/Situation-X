// frontend/src/app/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import InputBox from "../components/InputBox";
import { analyzeInput } from "../services/analyze";
import { useAppStore } from "../state/store";
export default function HomePage() {
  const router = useRouter();
  const {
    token,
    setAnalysis,
    setLoading,
    setError,
    isLoading,
  } = useAppStore();
  // -----------------------------
  // REDIRECT IF NOT LOGGED IN
  // -----------------------------
  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);
  // -----------------------------
  // HANDLE SUBMIT
  // -----------------------------
  const handleSubmit = async (input: string) => {
    if (!token) {
      setError("You must be logged in");
      router.push("/login");
      return;
    }
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
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <InputBox onSubmit={handleSubmit} isLoading={isLoading} />
    </main>
  );
}
