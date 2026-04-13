"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "../../state/store";
import { getHistory, deleteAnalysis } from "../../services/analyze";
import { AnalysisRecord } from "../../../../shared/types/result.types";

import {
  formatDate,
  formatIntent,
  formatEmotion,
  formatRiskLevel,
} from "../../utils/formatters";

export default function HistoryPage() {
  const router = useRouter();
  const { token, setError } = useAppStore();

  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const limit = 10;

  // -----------------------------
  // AUTH GUARD
  // -----------------------------
  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  // -----------------------------
  // FETCH HISTORY
  // -----------------------------
  const fetchHistory = async (pageNum: number) => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await getHistory(token, pageNum, limit);
      setAnalyses(res.data);
      setTotal(res.total);
    } catch (error: any) {
      setError(error.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  // -----------------------------
  // DELETE HANDLER
  // -----------------------------
  const handleDelete = async (id: string) => {
    if (!token) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this analysis?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteAnalysis(id, token);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      setTotal((prev) => prev - 1);
    } catch (error: any) {
      setError(error.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Analysis History</h1>

        {loading && (
          <p className="text-gray-500 text-sm">Loading...</p>
        )}

        {!loading && analyses.length === 0 && (
          <div className="bg-white p-6 rounded-xl shadow text-center text-gray-500">
            No analyses yet.{" "}
            <span
              onClick={() => router.push("/")}
              className="text-orange-500 cursor-pointer hover:underline"
            >
              Analyze your first situation
            </span>
          </div>
        )}

        {analyses.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl shadow space-y-2"
          >
            {/* TOP ROW */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">
                  {formatDate(item.created_at)}
                </p>
                <p className="font-medium text-gray-800 line-clamp-2">
                  {item.recommended_action}
                </p>
              </div>

              {/* DELETE BUTTON */}
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="ml-4 text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === item.id ? "Deleting..." : "Delete"}
              </button>
            </div>

            {/* BADGES */}
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {formatIntent(item.intent)}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                {formatEmotion(item.emotion)}
              </span>
              <span
                className={`px-2 py-1 rounded-full ${
                  item.risk_level === "high"
                    ? "bg-red-100 text-red-700"
                    : item.risk_level === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                Risk: {formatRiskLevel(item.risk_level)}
              </span>
            </div>

            {/* REASONING PREVIEW */}
            <p className="text-sm text-gray-500 line-clamp-2">
              {item.reasoning}
            </p>
          </div>
        ))}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
