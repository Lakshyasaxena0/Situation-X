import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnalyzeSituation,
  useEstimateAnalysisCost,
  getGetCreditsQueryKey,
  type AnalysisResult,
  type AnalyzeRequestDepth,
  type CostLine,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type RiskLevel = "low" | "medium" | "high";
type Signal = "favorable" | "challenging" | "neutral";
type Outcome = "positive" | "negative" | "mixed";

function riskColor(level?: RiskLevel) {
  if (level === "low") return "text-green-400 bg-green-400/10 border-green-400/30";
  if (level === "high") return "text-red-400 bg-red-400/10 border-red-400/30";
  return "text-orange-400 bg-orange-400/10 border-orange-400/30";
}

function signalColor(s?: Signal) {
  if (s === "favorable") return "text-green-400";
  if (s === "challenging") return "text-red-400";
  return "text-blue-400";
}

function outcomeColor(o?: Outcome) {
  if (o === "positive") return "text-green-400";
  if (o === "negative") return "text-red-400";
  return "text-orange-400";
}

function intensityColor(i?: string) {
  if (i === "high") return "text-red-400 bg-red-400/10";
  if (i === "medium") return "text-orange-400 bg-orange-400/10";
  return "text-blue-400 bg-blue-400/10";
}

function Badge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold border ${className}`}>
      {label.toUpperCase()}
    </span>
  );
}

function EngineCard({ code, title, children }: { code: string; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-card-border rounded-lg p-5"
    >
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{code}</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

// Validation problems (HTTP 400) carry an actionable message from the API;
// anything else gets the generic text.
function analysisErrorMessage(error: unknown): string {
  const e = error as { status?: number; data?: { message?: unknown } } | null;
  if (e?.status === 400 && typeof e.data?.message === "string" && !e.data.message.startsWith("[")) {
    return e.data.message;
  }
  return "Analysis failed. Please try again.";
}

const DEPTH_OPTIONS: { value: AnalyzeRequestDepth; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Chosen from how complex your question is" },
  { value: "standard", label: "Standard", hint: "Core question, key facts, best action" },
  { value: "deep", label: "Deep", hint: "Several options weighed, second-order effects" },
  { value: "expert", label: "Expert", hint: "Pre-mortem, bias check, honest uncertainty" },
];

function CostLines({ lines }: { lines: CostLine[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {lines.map((l) => (
        <li key={l.key} className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>
            <span className="text-foreground">{l.label}</span> - {l.note}
          </span>
          <span className="shrink-0 text-foreground">{l.credits}</span>
        </li>
      ))}
    </ul>
  );
}

function CreditsUsedCard({ result }: { result: AnalysisResult }) {
  const c = result.credits;
  if (!c?.billingActive) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">Credits used: {c.charged}</h3>
        {c.balance !== null && c.balance !== undefined && (
          <span className="text-xs text-muted-foreground">
            {c.balance} left ·{" "}
            <Link href="/pricing" className="text-primary underline underline-offset-2">
              add credits
            </Link>
          </span>
        )}
      </div>
      <CostLines lines={c.lines} />
    </div>
  );
}

function AnalysisDisplay({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4 mt-6">
      {/* AJIT — Intent */}
      <EngineCard code="AJIT" title="Intent Analysis">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg font-bold text-foreground capitalize">{result.intent.intent}</span>
          <Badge
            label={result.intent.confidence}
            className={intensityColor(result.intent.confidence)}
          />
          <span className="text-xs text-muted-foreground">score: {result.intent.score}</span>
        </div>
      </EngineCard>

      {/* MANU — Emotion */}
      <EngineCard code="MANU" title="Emotion Mapping">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-lg font-bold text-foreground capitalize">{result.emotion.emotion}</span>
          <Badge
            label={result.emotion.intensity}
            className={intensityColor(result.emotion.intensity)}
          />
          <span className="text-xs text-muted-foreground">score: {result.emotion.score}</span>
        </div>
      </EngineCard>

      {/* SIVI — Paths */}
      <EngineCard code="SIVI" title="Path Simulation">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1 font-mono">RECOMMENDED PATH</div>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-sm text-foreground font-medium mb-2">{result.simulation.bestPath.action}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge label={`risk: ${result.simulation.bestPath.risk}`} className={riskColor(result.simulation.bestPath.risk as RiskLevel)} />
                <Badge label={`stability: ${result.simulation.bestPath.stability}`} className="text-blue-400 bg-blue-400/10 border-blue-400/30" />
                <Badge label={result.simulation.bestPath.outcome} className={`border ${outcomeColor(result.simulation.bestPath.outcome as Outcome)} bg-transparent border-current/30`} />
              </div>
            </div>
          </div>
          {result.simulation.alternatives.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1 font-mono">ALTERNATIVES</div>
              <div className="space-y-2">
                {result.simulation.alternatives.map((alt, i) => (
                  <div key={i} className="bg-muted/30 rounded p-3">
                    <p className="text-sm text-muted-foreground mb-1">{alt.action}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge label={`risk: ${alt.risk}`} className={riskColor(alt.risk as RiskLevel)} />
                      <Badge label={alt.outcome} className="text-muted-foreground bg-muted border-border" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </EngineCard>

      {/* ASTRO */}
      <EngineCard code="ASTRO" title="Astrological Context">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-bold text-foreground">{result.astro.influence.dominantPlanet}</span>
            <span className={`text-sm font-semibold ${signalColor(result.astro.influence.signal as Signal)}`}>
              {result.astro.influence.signal}
            </span>
            <Badge label={`risk: ${result.astro.influence.risk}`} className={riskColor(result.astro.influence.risk as RiskLevel)} />
          </div>
          <p className="text-sm text-muted-foreground">{result.astro.interpretation}</p>

          {/* Prashna charts: cast for the moment of the question; no birth details */}
          {result.astro.vedicD1 && (
            <div className="mt-4 space-y-4">
              <div className="text-xs font-mono text-muted-foreground border-t border-border pt-3">
                PRASHNA CHARTS &middot; cast for the moment you asked
                {result.astro.prashna && ` · ${result.astro.prashna.topic}`}
              </div>
              {result.astro.prashna && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {result.astro.prashna.chartsUsed.map((u) => (
                    <li key={u.chart}>
                      <span className="font-mono font-bold text-primary">{u.chart}</span>{" "}
                      <span className="text-foreground">{u.purpose}</span> &mdash; {u.note}
                    </li>
                  ))}
                </ul>
              )}
              {[result.astro.vedicD1, result.astro.vedicD3, result.astro.vedicD9, result.astro.vedicD10].filter(Boolean).map((chart) => {
                if (!chart) return null;
                const used = result.astro.prashna?.chartsUsed.some((u) => u.chart === chart.chartType);
                return (
                  <div key={chart.chartType} className={`rounded p-3 ${used ? "bg-muted/30 border border-primary/30" : "bg-muted/10 opacity-70"}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary">{chart.chartType}</span>
                      <span className="text-xs text-muted-foreground">Lagna: <strong className="text-foreground">{chart.ascendant}</strong> {chart.ascendantDegree.toFixed(1)}&deg;</span>
                      {used && <span className="text-[10px] uppercase tracking-wide text-primary">used for this question</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      {chart.planets.slice(0, 9).map((p) => (
                        <div key={p.name} className="flex items-center gap-1">
                          <span className="text-muted-foreground w-14 truncate">{p.name}</span>
                          <span className="text-foreground">{p.sign}</span>
                          {p.house !== undefined && <span className="text-muted-foreground">H{p.house}</span>}
                          {p.isRetrograde && <span className="text-orange-400">R</span>}
                        </div>
                      ))}
                    </div>

                    {/* Moon-based dasha */}
                    {chart.chartType === "D1" && chart.currentDasha && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="text-xs font-mono text-muted-foreground mb-2">VIMSHOTTARI DASHA (from the Moon now)</div>
                        <div className="space-y-1 text-xs">
                          {[
                            { label: "Maha", level: chart.currentDasha.mahadasha },
                            { label: "Antar", level: chart.currentDasha.antardasha },
                            { label: "Pratyantar", level: chart.currentDasha.pratyantardasha },
                            { label: "Sookshma", level: chart.currentDasha.sookshmadasha },
                          ].filter(d => d.level).map((d, i) => (
                            <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${i * 12}px` }}>
                              <span className="text-muted-foreground w-20">{d.label}</span>
                              <span className="text-primary font-semibold">{d.level!.planet}</span>
                              <span className="text-muted-foreground">{d.level!.startDate} — {d.level!.endDate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </EngineCard>

      {/* Final Verdict */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`border rounded-lg p-5 ${
          result.finalVerdict.riskLevel === "low"
            ? "border-green-500/40 bg-green-500/5"
            : result.finalVerdict.riskLevel === "high"
            ? "border-red-500/40 bg-red-500/5"
            : "border-orange-500/40 bg-orange-500/5"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold text-foreground">VERDICT</span>
          <Badge label={`${result.finalVerdict.riskLevel} risk`} className={riskColor(result.finalVerdict.riskLevel as RiskLevel)} />
          <span className="text-xs text-muted-foreground">score: {result.overallScore}</span>
        </div>
        <p className="text-base font-semibold text-foreground mb-2">{result.finalVerdict.recommendedAction}</p>
        <p className="text-sm text-muted-foreground mb-3">{result.finalVerdict.reasoning}</p>
        <p className="text-sm text-foreground border-t border-border/50 pt-3">{result.summary}</p>
        {result.synthesis && (
          <div className="mt-3 space-y-3 text-sm">
            {/* How the two lenses were weighed */}
            {result.synthesis.logicScore !== undefined && result.synthesis.astroScore !== undefined && result.synthesis.weights && (
              <div className="rounded border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span><span className="font-mono font-bold text-foreground">AI JUDGMENT</span> {result.synthesis.logicScore} <span className="text-muted-foreground">({Math.round(result.synthesis.weights.logic * 100)}%)</span></span>
                  <span><span className="font-mono font-bold text-foreground">ASTROLOGY</span> {result.synthesis.astroScore} <span className="text-muted-foreground">({Math.round(result.synthesis.weights.astro * 100)}%)</span></span>
                  <span><span className="font-mono font-bold text-foreground">FINAL</span> {result.synthesis.score} &middot; {result.synthesis.verdict}</span>
                  {result.synthesis.astroAlignment && (
                    <span className={result.synthesis.astroAlignment === "supports" ? "text-green-400" : result.synthesis.astroAlignment === "contradicts" ? "text-red-400" : "text-orange-400"}>
                      astrology {result.synthesis.astroAlignment === "supports" ? "agrees with the AI" : result.synthesis.astroAlignment === "contradicts" ? "disagrees with the AI" : "partly agrees with the AI"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {result.synthesis.reasoning && (
              <p className="text-muted-foreground">
                <span className="font-mono text-xs font-bold text-foreground">REASONING </span>
                {result.synthesis.reasoning}
              </p>
            )}
            <p className="text-muted-foreground">
              <span className="font-mono text-xs font-bold text-foreground">ASTRO </span>
              {result.synthesis.astroInsight}
            </p>
            {result.synthesis.risks && result.synthesis.risks.length > 0 && (
              <div className="text-muted-foreground">
                <span className="font-mono text-xs font-bold text-foreground">RISKS</span>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {result.synthesis.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {result.synthesis.keyUnknowns && result.synthesis.keyUnknowns.length > 0 && (
              <div className="text-muted-foreground">
                <span className="font-mono text-xs font-bold text-foreground">WHAT WOULD CHANGE THIS</span>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {result.synthesis.keyUnknowns.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <p className="text-foreground">
              <span className="font-mono text-xs font-bold">NEXT STEP </span>
              {result.synthesis.advice}
            </p>
            {result.synthesis.nextSteps && result.synthesis.nextSteps.length > 0 && (
              <ol className="list-decimal pl-5 space-y-0.5 text-muted-foreground">
                {result.synthesis.nextSteps.map((r, i) => <li key={i}>{r}</li>)}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">
              Final answer: {result.synthesis.verdict} &middot; confidence {result.synthesis.confidence}
              {result.synthesis.source === "ai+astro" ? " · AI + astrology" : " · engine only (AI unavailable)"}
              {result.synthesis.calibration?.applied &&
                ` · past accuracy ${Math.round(result.synthesis.calibration.hitRate * 100)}% (${result.synthesis.calibration.samples} follow-ups)`}
              . We&rsquo;ll ask how it turned out in about {result.synthesis.timeframeDays} days.
            </p>
          </div>
        )}
      </motion.div>
      <CreditsUsedCard result={result} />
    </div>
  );
}

export default function Oracle() {
  const [situation, setSituation] = useState("");
  // Optional: where the question is asked. Only refines the Prashna lagna; defaults to New Delhi.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [depth, setDepth] = useState<AnalyzeRequestDepth>("auto");
  const queryClient = useQueryClient();

  const analyze = useAnalyzeSituation();
  const estimate = useEstimateAnalysisCost();
  const { mutate: runEstimate, reset: resetEstimate } = estimate;
  const lat = coords?.latitude;
  const lon = coords?.longitude;
  const text = situation.trim();

  // Quote the exact price (modules involved + reasoning level) while the user types, before anything is charged.
  useEffect(() => {
    if (text.length < 10) {
      resetEstimate();
      return;
    }
    const t = setTimeout(() => runEstimate({ data: { situation: text, depth, latitude: lat, longitude: lon } }), 600);
    return () => clearTimeout(t);
  }, [text, depth, lat, lon, runEstimate, resetEstimate]);
  const quote = estimate.data?.billingActive ? estimate.data : null;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationNote("Location is not available in this browser; using New Delhi.");
      return;
    }
    setLocationNote("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationNote("Using your current location.");
      },
      () => {
        setCoords(null);
        setLocationNote("Could not get your location; using New Delhi.");
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!situation.trim() || situation.length < 10) return;

    analyze.mutate(
      {
        data: {
          situation: situation.trim(),
          depth,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          void queryClient.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        },
        onError: () => void queryClient.invalidateQueries({ queryKey: getGetCreditsQueryKey() }),
      }
    );
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Describe your situation. The system will run AJIT, MANU, SIVI, and ASTRO analysis.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe your situation in detail. Be specific about what you are facing, what decision you need to make, or what conflict you are experiencing."
              className="min-h-[120px] text-sm bg-card border-card-border resize-none"
              maxLength={2000}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${situation.length < 10 && situation.length > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {situation.length < 10 && situation.length > 0 ? `${10 - situation.length} more characters needed` : ""}
              </span>
              <span className="text-xs text-muted-foreground">{situation.length}/2000</span>
            </div>
          </div>

          {/* Prashna needs no birth details: the chart is cast for the moment you ask. */}
          <div className="text-xs text-muted-foreground">
            <p>
              No birth details needed. A Prashna chart (D1, D3, D9, D10) is cast for the moment you ask, and the right charts are used for your question.
            </p>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={requestLocation}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {coords ? "Location set" : "Use my location for a more accurate chart (optional)"}
              </button>
              {locationNote && <span aria-live="polite">{locationNote}</span>}
            </div>
          </div>

          {/* How deeply the AI should think: costs more credits, shown before you run. */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">AI reasoning level</p>
            <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="AI reasoning level">
              {DEPTH_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={depth === o.value}
                  title={o.hint}
                  onClick={() => setDepth(o.value)}
                  className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                    depth === o.value ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {quote && (
            <details className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <summary className="cursor-pointer flex items-center justify-between gap-3 list-none">
                <span className="text-foreground">
                  This analysis will use <strong>{quote.total} credits</strong>
                  <span className="text-xs text-muted-foreground"> ({quote.depth} reasoning{quote.depthChosen === "auto" ? ", auto" : ""})</span>
                </span>
                <span className={`text-xs ${quote.enough ? "text-muted-foreground" : "text-red-400"}`}>{quote.balance} available</span>
              </summary>
              <CostLines lines={quote.lines} />
              {!quote.enough && (
                <p className="mt-3 text-xs text-red-400">
                  You need {quote.total - quote.balance} more credits.{" "}
                  <Link href="/pricing" className="underline underline-offset-2">
                    Get credits
                  </Link>
                </p>
              )}
            </details>
          )}

          <Button
            type="submit"
            disabled={analyze.isPending || situation.length < 10 || (quote !== null && !quote.enough)}
            className="w-full bg-primary text-primary-foreground hover:opacity-90"
          >
            {analyze.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running analysis...
              </span>
            ) : (
              "Run Analysis"
            )}
          </Button>

          {analyze.isError && (analyze.error as { status?: number } | null)?.status === 402 ? (
            <p className="text-sm text-center text-foreground">
              {(analyze.error as { data?: { message?: string } } | null)?.data?.message ?? "You do not have enough credits for this analysis."}{" "}
              <Link href="/pricing" className="text-primary underline underline-offset-2">
                Get credits
              </Link>
            </p>
          ) : (
            analyze.isError && (
              <p className="text-sm text-red-400 text-center">
                {analysisErrorMessage(analyze.error)}
              </p>
            )
          )}
        </form>

        <AnimatePresence>
          {result && <AnalysisDisplay result={result} />}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
