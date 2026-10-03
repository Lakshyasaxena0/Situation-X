import { useState } from "react";
import {
  useAnalyzeSituation,
  type AnalysisResult,
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
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-mono text-xs font-bold text-foreground">ASTRO </span>
              {result.synthesis.astroInsight}
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono text-xs font-bold text-foreground">NEXT STEP </span>
              {result.synthesis.advice}
            </p>
            <p className="text-xs text-muted-foreground">
              Final answer: {result.synthesis.verdict} &middot; confidence {result.synthesis.confidence}
              {result.synthesis.source === "ai+astro" ? " · AI + astrology" : " · engine only"}
              {result.synthesis.calibration?.applied &&
                ` · past accuracy ${Math.round(result.synthesis.calibration.hitRate * 100)}% (${result.synthesis.calibration.samples} follow-ups)`}
              . We&rsquo;ll ask how it turned out in about {result.synthesis.timeframeDays} days.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Oracle() {
  const [situation, setSituation] = useState("");
  // Optional: where the question is asked. Only refines the Prashna lagna; defaults to New Delhi.
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = useAnalyzeSituation();

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
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        },
      },
      { onSuccess: (data) => setResult(data) }
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

          <Button
            type="submit"
            disabled={analyze.isPending || situation.length < 10}
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

          {analyze.isError && (
            <p className="text-sm text-red-400 text-center">
              {analysisErrorMessage(analyze.error)}
            </p>
          )}
        </form>

        <AnimatePresence>
          {result && <AnalysisDisplay result={result} />}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
