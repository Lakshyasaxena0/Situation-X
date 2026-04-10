import { SaturnXLogo } from "@/components/SaturnXLogo";

const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SaturnXLogo size={32} />
          <span className="font-semibold text-foreground tracking-tight">Situation X</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`${base}/sign-in`}
            className="px-5 py-2 rounded text-sm font-medium transition-colors border border-border hover:bg-muted text-foreground"
          >
            Sign In
          </a>
          <a
            href={`${base}/sign-up`}
            className="px-5 py-2 rounded text-sm font-semibold transition-colors bg-primary text-primary-foreground hover:opacity-90"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-8">
          <SaturnXLogo size={96} />
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4">
          Situation X
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mb-2">
          Multi-dimensional situation analysis.
        </p>
        <p className="text-sm text-muted-foreground max-w-md mb-10">
          Combines intent detection, emotion mapping, path simulation, and Vedic astrology into a single structured analysis of any situation you face.
        </p>

        <div className="flex items-center gap-3">
          <a
            href={`${base}/sign-up`}
            className="px-8 py-3 rounded font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Started
          </a>
          <a
            href={`${base}/sign-in`}
            className="px-8 py-3 rounded font-semibold border border-border text-foreground hover:bg-muted transition-colors"
          >
            Sign In
          </a>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Situation X — Analytical intelligence for complex decisions.
      </footer>
    </div>
  );
}
