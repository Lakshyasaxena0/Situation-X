import { useState } from "react";
import {
  useAnalyzeSituation,
  type AnalysisResult,
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

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

          {/* Vedic Charts */}
          {result.astro.vedicD1 && (
            <div className="mt-4 space-y-4">
              <div className="text-xs font-mono text-muted-foreground border-t border-border pt-3">VEDIC CHARTS</div>
              {[result.astro.vedicD1, result.astro.vedicD9, result.astro.vedicD10].filter(Boolean).map((chart) => chart && (
                <div key={chart.chartType} className="bg-muted/30 rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-primary">{chart.chartType}</span>
                    <span className="text-xs text-muted-foreground">Ascendant: <strong className="text-foreground">{chart.ascendant}</strong> {chart.ascendantDegree.toFixed(1)}&deg;</span>
                    <span className="text-xs text-muted-foreground">Ayanamsa: {chart.ayanamsa.toFixed(2)}&deg;</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {chart.planets.slice(0, 9).map((p) => (
                      <div key={p.name} className="flex items-center gap-1">
                        <span className="text-muted-foreground w-14 truncate">{p.name}</span>
                        <span className="text-foreground">{p.sign}</span>
                        {p.isRetrograde && <span className="text-orange-400">R</span>}
                      </div>
                    ))}
                  </div>

                  {/* Dasha tree */}
                  {chart.chartType === "D1" && chart.currentDasha && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="text-xs font-mono text-muted-foreground mb-2">VIMSHOTTARI DASHA</div>
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
              ))}
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
      </motion.div>
    </div>
  );
}

export default function Oracle() {
  const [situation, setSituation] = useState("");
  const [showBirth, setShowBirth] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = useAnalyzeSituation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!situation.trim() || situation.length < 10) return;

    analyze.mutate(
      {
        data: {
          situation: situation.trim(),
          birthDate: birthDate || undefined,
          birthTime: birthTime || undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
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

          {/* Optional birth data */}
          <div>
            <button
              type="button"
              onClick={() => setShowBirth(!showBirth)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showBirth ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Birth data for Vedic charts (optional)
            </button>

            {showBirth && (
              <div className="mt-3 grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Birth Date</Label>
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="text-sm bg-card border-card-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Birth Time</Label>
                  <Input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="text-sm bg-card border-card-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Latitude</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 28.61"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="text-sm bg-card border-card-border"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Longitude</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 77.20"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="text-sm bg-card border-card-border"
                    step="0.01"
                  />
                </div>
              </div>
            )}
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
            <p className="text-sm text-red-400 text-center">Analysis failed. Please try again.</p>
          )}
        </form>

        <AnimatePresence>
          {result && <AnalysisDisplay result={result} />}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
