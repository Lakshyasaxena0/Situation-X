// frontend/src/app/result/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "../../state/store";
import MoodIndicator from "../../components/MoodIndicator";
import PathSelector from "../../components/PathSelector";
import ResultCard from "../../components/ResultCard";
export default function ResultPage() {
  const router = useRouter();
  const { currentAnalysis } = useAppStore();
  // -----------------------------
  // GUARD: NO DATA
  // -----------------------------
  useEffect(() => {
    if (!currentAnalysis) {
      router.push("/");
    }
  }, [currentAnalysis, router]);
  if (!currentAnalysis) return null;
  const { intent, emotion, simulation, finalVerdict } = currentAnalysis;
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* MOOD */}
        <MoodIndicator
          emotion={emotion.emotion}
          intensity={emotion.intensity}
        />
        {/* PATHS */}
        <PathSelector
          paths={[
            simulation.bestPath,
            ...simulation.alternatives,
          ]}
        />
        {/* FINAL RESULT */}
        <ResultCard result={finalVerdict} />
        {/* ACTION BUTTONS */}
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-200 rounded-xl hover:bg-gray-300"
          >
            Analyze Another
          </button>
          <button
            onClick={() => router.push("/history")}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"
          >
            View History
          </button>
        </div>
      </div>
    </main>
  );
}
