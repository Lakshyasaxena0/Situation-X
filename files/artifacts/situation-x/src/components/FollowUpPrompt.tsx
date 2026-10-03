import { useState } from "react";
import {
  useGetDueFollowUps,
  useCreateFeedback,
  useSnoozeFollowUp,
  useDismissFollowUp,
  getGetDueFollowUpsQueryKey,
  getGetFeedbackListQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Outcome = "matched" | "partly" | "different";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "matched", label: "Yes, it matched" },
  { value: "partly", label: "Partly" },
  { value: "different", label: "No, it was different" },
];

/**
 * Shown on every page once a prediction's time window has passed. The answers feed
 * the accuracy calibration on the server, so future readings get more honest.
 * Renders nothing when there is nothing due (or while loading / on error).
 */
export function FollowUpPrompt() {
  const { data } = useGetDueFollowUps({ query: { queryKey: getGetDueFollowUpsQueryKey(), staleTime: 60_000, retry: false } });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const [comment, setComment] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetDueFollowUpsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFeedbackListQueryKey() });
    setOutcome(null);
    setAccuracy(0);
    setComment("");
  };
  const onError = () =>
    toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });

  const submit = useCreateFeedback({
    mutation: {
      onSuccess: () => {
        toast({ title: "Thank you", description: "Your answer helps improve future predictions." });
        refresh();
      },
      onError,
    },
  });
  const snooze = useSnoozeFollowUp({ mutation: { onSuccess: refresh, onError } });
  const dismiss = useDismissFollowUp({ mutation: { onSuccess: refresh, onError } });

  const current = data?.items[0];
  if (!current) return null;

  const busy = submit.isPending || snooze.isPending || dismiss.isPending;

  return (
    <section
      aria-label="Prediction follow-up"
      className="mx-4 mt-4 md:mx-8 border border-primary/30 bg-primary/5 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <CalendarClock className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">How did this turn out?</p>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            You asked: &ldquo;{current.situation}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            Reading: <span className="text-foreground">{current.verdict}</span>. {current.summary}
          </p>

          <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Did things turn out as the reading suggested?">
            {OUTCOMES.map((o) => (
              <Button
                key={o.value}
                type="button"
                size="sm"
                variant={outcome === o.value ? "default" : "outline"}
                aria-pressed={outcome === o.value}
                onClick={() => setOutcome(o.value)}
                disabled={busy}
              >
                {o.label}
              </Button>
            ))}
          </div>

          {outcome && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-1" role="group" aria-label="How accurate was it?">
                <span className="text-xs text-muted-foreground mr-2">Accuracy</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setAccuracy(n)}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 ${n <= accuracy ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What actually happened? (optional)"
                className="text-sm min-h-[64px]"
              />
              <Button
                type="button"
                size="sm"
                disabled={busy || accuracy === 0}
                onClick={() =>
                  submit.mutate({
                    data: {
                      analysisId: current.id,
                      outcome,
                      accuracy,
                      rating: accuracy,
                      comment: comment.trim() || undefined,
                    },
                  })
                }
              >
                {submit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send
              </Button>
            </div>
          )}

          <div className="flex gap-4 mt-3 text-xs">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => snooze.mutate({ id: current.id })}
            >
              Too early to say, ask me later
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
              disabled={busy}
              onClick={() => dismiss.mutate({ id: current.id })}
            >
              Don&rsquo;t ask about this
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
