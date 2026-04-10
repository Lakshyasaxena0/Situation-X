import { useState } from "react";
import {
  useGetAnalysisHistory,
  useDeleteAnalysis,
  getGetAnalysisHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RiskLevel = "low" | "medium" | "high";

function riskColor(level?: RiskLevel) {
  if (level === "low") return "text-green-400 bg-green-400/10";
  if (level === "high") return "text-red-400 bg-red-400/10";
  return "text-orange-400 bg-orange-400/10";
}

function intentColor(intent?: string) {
  const map: Record<string, string> = {
    relationship: "text-pink-400 bg-pink-400/10",
    career: "text-blue-400 bg-blue-400/10",
    conflict: "text-red-400 bg-red-400/10",
    decision: "text-orange-400 bg-orange-400/10",
    health: "text-green-400 bg-green-400/10",
    unclear: "text-slate-400 bg-slate-400/10",
  };
  return map[intent ?? ""] ?? "text-muted-foreground bg-muted";
}

export default function History() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const limit = 15;

  const { data, isLoading } = useGetAnalysisHistory(
    { limit, offset: page * limit },
    { query: { queryKey: getGetAnalysisHistoryQueryKey({ limit, offset: page * limit }) } }
  );

  const deleteM = useDeleteAnalysis({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAnalysisHistoryQueryKey() });
      },
    },
  });

  function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("Delete this analysis?")) {
      deleteM.mutate({ id });
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} {total === 1 ? "analysis" : "analyses"} recorded
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No analyses yet.</p>
            <p className="text-sm mt-1">Run your first analysis from the Oracle page.</p>
          </div>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item) => {
              const intentObj = typeof item.intent === "object" && item.intent !== null
                ? (item.intent as { intent?: string })
                : { intent: String(item.intent ?? "") };
              const emotionObj = typeof item.emotion === "object" && item.emotion !== null
                ? (item.emotion as { emotion?: string })
                : { emotion: String(item.emotion ?? "") };
              const intentStr = intentObj.intent ?? String(item.intent ?? "");
              const emotionStr = emotionObj.emotion ?? String(item.emotion ?? "");
              const riskLevel = (item.riskLevel as RiskLevel) ?? "medium";
              const isExpanded = expandedId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-card-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate font-medium">{item.situation}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-mono capitalize ${intentColor(intentStr)}`}>
                          {intentStr || "unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">{emotionStr}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${riskColor(riskLevel)}`}>
                          {riskLevel} risk
                        </span>
                        <span className="text-xs text-muted-foreground">score: {item.overallScore?.toFixed(0) ?? "—"}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mt-3">{item.summary}</p>
                      {item.fullAnalysis != null && (
                        (() => {
                          const fa = item.fullAnalysis as unknown as Record<string, unknown>;
                          const verdict = fa?.["finalVerdict"] as Record<string, unknown> | undefined;
                          if (!verdict) return null;
                          return (
                            <div className="mt-3 p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                              <strong className="text-foreground">Recommended: </strong>
                              {verdict["recommendedAction"] as string}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}>
              Next
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
