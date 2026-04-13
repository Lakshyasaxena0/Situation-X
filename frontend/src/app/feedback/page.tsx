frontend/src/app/feedback/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "../../state/store";
import { getHistory, submitFeedback } from "../../services/analyze";

import { formatDate } from "../../utils/formatters";

export default function FeedbackPage() {
  const router = useRouter();

  const { token, setError } = useAppStore();

  const [analyses, setAnalyses] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // FETCH ANALYSES
  // -----------------------------
  const fetchAnalyses = async () => {
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      setLoading(true);

      const res = await getHistory(token, 1, 50);
      setAnalyses(res.data);
    } catch (error: any) {
      setError(error.message || "Failed to load analyses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  // -----------------------------
  // HANDLE SUBMIT FEEDBACK
  // -----------------------------
  const handleSubmit = async (analysisId: string) => {
    const rating = ratings[analysisId];

    if (!rating) {
      alert("Please select a rating");
      return;
    }

    try {
      await submitFeedback(
        analysisId,
        rating,
        comments[analysisId] || "",
        token!
      );

      alert("Feedback submitted successfully");
    } catch (error: any) {
      setError(error.message || "Feedback failed");
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          Your Feedback
        </h1>

        {loading && <p>Loading...</p>}

        {analyses.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl shadow space-y-3"
          >
            <div className="text-sm text-gray-500">
              {formatDate(item.created_at)}
            </div>

            <div className="font-medium">
              {item.recommended_action}
            </div>

            {/* RATING */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() =>
                    setRatings((prev) => ({
                      ...prev,
                      [item.id]: num,
                    }))
                  }
                  className={`px-2 py-1 rounded ${
                    ratings[item.id] === num
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* COMMENT */}
            <textarea
              placeholder="Optional comment..."
              value={comments[item.id] || ""}
              onChange={(e) =>
                setComments((prev) => ({
                  ...prev,
                  [item.id]: e.target.value,
                }))
              }
              className="w-full p-2 border rounded-lg"
            />

            {/* SUBMIT */}
            <button
              onClick={() => handleSubmit(item.id)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Submit Feedback
            </button>
          </div>
        ))}

        {analyses.length === 0 && !loading && (
          <p className="text-gray-500">
            No analyses available for feedback
          </p>
        )}
      </div>
    </main>
  );
}
