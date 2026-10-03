// Prashna (horary) reading.
//
// The question itself is classified by AJIT (intent). That intent decides WHICH house of the
// chart is the "house of the question" and WHICH divisional charts are consulted:
//
//   career        10th house (karma)    D1 + D10 (profession & status)
//   relationship  7th house (partner)   D1 + D9  (partnership & marriage)
//   decision      lagna + 5th/9th       D1 + D3 (courage/effort to act) + D9 (fortune behind the choice)
//   conflict      6th house (rivals)    D1 + D3 (courage, effort, allies)
//   health        lagna (body), 6th/8th D1 + D9 (inner vitality)
//   unclear       lagna and Moon        D1 + D9 (overall strength)
//
// Every factor that moves the score is recorded with a plain-language reason, so the answer
// can be explained to the user and handed to the AI as evidence.

import type { IntentType } from "./ajit.service.js";
import {
  RASHI_NAMES,
  SIGN_RULERS,
  type Dignity,
  type PlanetPosition,
  type PrashnaSky,
  type VedicChart,
} from "./vedic.service.js";

export type PrashnaFactor = { label: string; effect: number; detail: string };

export type PrashnaChartUse = { chart: string; purpose: string; note: string };

export type PrashnaReading = {
  castAt: string;
  latitude: number;
  longitude: number;
  lagna: string;
  lagnaLord: string;
  moonSign: string;
  moonNakshatra: string;
  moonWaxing: boolean;
  topic: string;
  primaryHouse: number;
  chartsUsed: PrashnaChartUse[];
  factors: PrashnaFactor[];
  score: number;
  signal: "favorable" | "challenging" | "neutral";
  stability: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  dominantPlanet: string;
  summary: string;
};

type DivisionalUse = { chart: "D3" | "D9" | "D10"; house: number; purpose: string };

type Profile = {
  topic: string;
  primaryHouse: number;
  supportHouses: number[];
  karakas: string[];
  divisional: DivisionalUse[];
  /** Houses in which the lord of the question-house is well placed for THIS topic. */
  goodLordHouses: number[];
};

const STANDARD_GOOD_HOUSES = [1, 4, 5, 7, 9, 10, 11];
// For conflict, the 6th lord does well in the "growth" houses: it wins by effort.
const CONFLICT_GOOD_HOUSES = [1, 3, 5, 6, 9, 10, 11];

const PROFILES: Record<IntentType, Profile> = {
  career: {
    topic: "Career & status",
    primaryHouse: 10,
    supportHouses: [6, 11],
    karakas: ["Saturn", "Sun"],
    divisional: [{ chart: "D10", house: 10, purpose: "Profession & achievement" }],
    goodLordHouses: STANDARD_GOOD_HOUSES,
  },
  relationship: {
    topic: "Relationship & partnership",
    primaryHouse: 7,
    supportHouses: [5, 11],
    karakas: ["Venus", "Jupiter"],
    divisional: [{ chart: "D9", house: 7, purpose: "Partnership & marriage" }],
    goodLordHouses: STANDARD_GOOD_HOUSES,
  },
  decision: {
    topic: "Decision & judgment",
    primaryHouse: 1,
    supportHouses: [5, 9],
    karakas: ["Mercury", "Jupiter"],
    divisional: [
      { chart: "D3", house: 3, purpose: "Courage & effort to act" },
      { chart: "D9", house: 9, purpose: "Fortune behind the choice" },
    ],
    goodLordHouses: STANDARD_GOOD_HOUSES,
  },
  conflict: {
    topic: "Conflict & opponents",
    primaryHouse: 6,
    supportHouses: [7, 3],
    karakas: ["Mars"],
    divisional: [{ chart: "D3", house: 3, purpose: "Courage, effort & allies" }],
    goodLordHouses: CONFLICT_GOOD_HOUSES,
  },
  health: {
    topic: "Health & vitality",
    primaryHouse: 1,
    supportHouses: [6, 8],
    karakas: ["Sun", "Moon"],
    divisional: [{ chart: "D9", house: 1, purpose: "Inner vitality & resilience" }],
    goodLordHouses: STANDARD_GOOD_HOUSES,
  },
  unclear: {
    topic: "General outlook",
    primaryHouse: 1,
    supportHouses: [10, 11],
    karakas: ["Moon"],
    divisional: [{ chart: "D9", house: 1, purpose: "Overall strength" }],
    goodLordHouses: STANDARD_GOOD_HOUSES,
  },
};

/** Score at or above this is favorable, at or below its negative is challenging. */
export const SIGNAL_THRESHOLD = 8;

/**
 * The rules above award more points than they take away for an ordinary sky (more houses are
 * "supportive" than "difficult"). The median raw score over 6000 random moments of a year is
 * listed here per question type, and the reading is measured RELATIVE to it, so "favorable"
 * means better than a typical sky and "challenging" worse. With this centering about a third of
 * all moments fall in each of favorable / neutral / challenging.
 */
export const TYPICAL_SKY_SCORE: Record<IntentType, number> = {
  career: 10,
  relationship: 8,
  decision: 6,
  conflict: 11,
  health: 7,
  unclear: 6,
};
const CENTERING_LABEL = "Scale centering";

const DUSTHANA = new Set([6, 8, 12]);
const UPACHAYA = new Set([3, 6, 10, 11]);
const NATURAL_BENEFICS = new Set(["Jupiter", "Venus", "Mercury"]);
const NATURAL_MALEFICS = new Set(["Saturn", "Mars", "Sun", "Rahu", "Ketu"]);

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

function lordOfHouse(chart: VedicChart, house: number): string {
  const signIndex = (RASHI_NAMES.indexOf(chart.ascendant) + house - 1) % 12;
  return SIGN_RULERS[signIndex];
}

function planet(chart: VedicChart, name: string): PlanetPosition {
  const p = chart.planets.find((x) => x.name === name);
  if (!p) throw new Error(`planet ${name} missing from ${chart.chartType}`);
  return p;
}

function dignityScore(d: Dignity, weight: number): number {
  return d === "exalted" || d === "own" ? weight : d === "debilitated" ? -weight : 0;
}

type Collector = { factors: PrashnaFactor[]; add: (label: string, effect: number, detail: string) => void };

function collector(): Collector {
  const factors: PrashnaFactor[] = [];
  return {
    factors,
    add(label, effect, detail) {
      if (effect !== 0) factors.push({ label, effect: Math.round(effect * 10) / 10, detail });
    },
  };
}

/** Strength of one house in one chart: its lord's placement and dignity, and who sits in it. */
function scoreHouse(
  c: Collector,
  chart: VedicChart,
  house: number,
  goodHouses: number[],
  weight: number,
  label: string,
  moonWaxing: boolean,
): void {
  const lordName = lordOfHouse(chart, house);
  const lord = planet(chart, lordName);
  const where = `${chart.chartType} ${ORDINAL[house]} lord ${lordName}`;

  if (goodHouses.includes(lord.house)) c.add(label, 8 * weight, `${where} sits in the ${ORDINAL[lord.house]} house (supportive)`);
  else if (DUSTHANA.has(lord.house)) c.add(label, -10 * weight, `${where} sits in the ${ORDINAL[lord.house]} house (a difficult house)`);

  const dig = dignityScore(lord.dignity, 5 * weight);
  if (dig !== 0) c.add(label, dig, `${where} is ${lord.dignity} in ${lord.sign}`);

  for (const occ of chart.planets.filter((p) => p.house === house && p.name !== lordName)) {
    const benefic = NATURAL_BENEFICS.has(occ.name) || (occ.name === "Moon" && moonWaxing);
    if (benefic) c.add(label, 5 * weight, `${occ.name} (benefic) occupies the ${ORDINAL[house]} house in ${chart.chartType}`);
    else if (NATURAL_MALEFICS.has(occ.name) || occ.name === "Moon") {
      // Malefics in the growth houses (3, 6, 10, 11) are helpful: they give drive and win obstacles.
      if (UPACHAYA.has(house) && occ.name !== "Moon") c.add(label, 3 * weight, `${occ.name} occupies the ${ORDINAL[house]} house, a house where it gives drive`);
      else c.add(label, -5 * weight, `${occ.name} (malefic) occupies the ${ORDINAL[house]} house in ${chart.chartType}`);
    }
  }
}

function strengthLabel(score: number): "low" | "medium" | "high" {
  return score >= 8 ? "high" : score <= -8 ? "low" : "medium";
}

/** Builds the reading from the cast charts. Pure and deterministic. */
export function readPrashna(intent: IntentType, sky: PrashnaSky): PrashnaReading {
  const profile = PROFILES[intent] ?? PROFILES.unclear;
  const { d1, d3, d9, d10 } = sky.charts;
  const divisionalCharts: Record<string, VedicChart> = { D3: d3, D9: d9, D10: d10 };
  const c = collector();

  const lagnaLordName = lordOfHouse(d1, 1);
  const lagnaLord = planet(d1, lagnaLordName);
  const moon = planet(d1, "Moon");

  // 1. Lagna lord: the querent. Skipped when the lagna itself is the question-house (avoids counting it twice).
  const startFactors = c.factors.length;
  if (profile.primaryHouse !== 1) {
    scoreHouse(c, d1, 1, STANDARD_GOOD_HOUSES, 0.8, "Querent (lagna)", sky.moonWaxing);
  }
  const querentScore = c.factors.slice(startFactors).reduce((s, f) => s + f.effect, 0);

  // 2. Moon: the mind of the querent and the pulse of the question.
  const moonStart = c.factors.length;
  c.add("Moon", sky.moonWaxing ? 4 : -4, sky.moonWaxing ? "Moon is waxing (growing, supportive)" : "Moon is waning (shrinking, less supportive)");
  if (DUSTHANA.has(moon.house)) c.add("Moon", -8, `Moon sits in the ${ORDINAL[moon.house]} house (a difficult house)`);
  else if ([1, 4, 5, 7, 9, 10].includes(moon.house)) c.add("Moon", 5, `Moon sits in the ${ORDINAL[moon.house]} house (supportive)`);
  c.add("Moon", dignityScore(moon.dignity, 4), `Moon is ${moon.dignity} in ${moon.sign}`);
  const afflicting = d1.planets.filter((p) => p.name !== "Moon" && p.sign === moon.sign && NATURAL_MALEFICS.has(p.name));
  if (afflicting.length > 0) c.add("Moon", -4, `Moon is joined by ${afflicting.map((p) => p.name).join(", ")}`);
  const moonScore = c.factors.slice(moonStart).reduce((s, f) => s + f.effect, 0);

  // 3. The house of the question (D1).
  scoreHouse(c, d1, profile.primaryHouse, profile.goodLordHouses, 1, profile.topic, sky.moonWaxing);

  // 4. Supporting houses, lighter.
  for (const h of profile.supportHouses) {
    scoreHouse(c, d1, h, STANDARD_GOOD_HOUSES, 0.4, `${ORDINAL[h]} house`, sky.moonWaxing);
  }

  // 5. Karakas: the natural significators of this kind of question.
  for (const k of profile.karakas) {
    const p = planet(d1, k);
    const label = `${k} (significator)`;
    c.add(label, dignityScore(p.dignity, 6), `${k} is ${p.dignity} in ${p.sign}`);
    if (p.isRetrograde && k !== "Rahu" && k !== "Ketu") c.add(label, -3, `${k} is retrograde (delays, second thoughts)`);
    if (sky.combust.includes(k)) c.add(label, -4, `${k} is combust (too close to the Sun)`);
    if (DUSTHANA.has(p.house) && !(intent === "conflict" && p.house === 6)) c.add(label, -3, `${k} sits in the ${ORDINAL[p.house]} house`);
  }

  // 6. Divisional charts consulted for this kind of question.
  const chartsUsed: PrashnaChartUse[] = [
    {
      chart: "D1",
      purpose: "The question itself",
      note: `Lagna ${d1.ascendant}, Moon in ${moon.sign}; ${ORDINAL[profile.primaryHouse]} house (${d1.planets.filter((p) => p.house === profile.primaryHouse).map((p) => p.name).join(", ") || "empty"}) ruled by ${lordOfHouse(d1, profile.primaryHouse)}`,
    },
  ];
  for (const use of profile.divisional) {
    const chart = divisionalCharts[use.chart];
    const before = c.factors.length;
    scoreHouse(c, chart, use.house, STANDARD_GOOD_HOUSES, 0.6, `${use.chart} ${use.purpose}`, sky.moonWaxing);
    // How the key planets fare in this chart (the "fruit" of the D1 promise).
    for (const k of profile.karakas.slice(0, 1)) {
      const p = planet(chart, k);
      c.add(`${use.chart} ${use.purpose}`, dignityScore(p.dignity, 4), `${k} is ${p.dignity} in ${use.chart} (${p.sign})`);
    }
    if (use.chart === "D9") {
      const lordName = lordOfHouse(d1, profile.primaryHouse);
      const inD1 = planet(d1, lordName);
      const inD9 = planet(d9, lordName);
      if (inD1.signIndex === inD9.signIndex) c.add(`D9 ${use.purpose}`, 4, `${lordName} is vargottama (same sign in D1 and D9), which greatly strengthens it`);
    }
    const delta = c.factors.slice(before).reduce((s, f) => s + f.effect, 0);
    chartsUsed.push({
      chart: use.chart,
      purpose: use.purpose,
      note: `${use.chart} lagna ${chart.ascendant}; ${ORDINAL[use.house]} house ruled by ${lordOfHouse(chart, use.house)} - ${delta > 0 ? "supports" : delta < 0 ? "weakens" : "is neutral for"} the answer`,
    });
  }

  const typical = TYPICAL_SKY_SCORE[intent] ?? TYPICAL_SKY_SCORE.unclear;
  c.add(CENTERING_LABEL, -typical, `Scores are measured against a typical sky for ${profile.topic.toLowerCase()} questions (${typical > 0 ? "+" : ""}${typical})`);
  const raw = c.factors.reduce((s, f) => s + f.effect, 0);
  const score = Math.round(Math.max(-100, Math.min(100, raw)));
  const signal: PrashnaReading["signal"] = score >= SIGNAL_THRESHOLD ? "favorable" : score <= -SIGNAL_THRESHOLD ? "challenging" : "neutral";
  const stability = strengthLabel(querentScore + moonScore);
  const risk: PrashnaReading["risk"] = score >= 16 ? "low" : score <= -SIGNAL_THRESHOLD ? "high" : "medium";
  const dominantPlanet = lordOfHouse(d1, profile.primaryHouse);

  const top = c.factors.filter((f) => f.label !== CENTERING_LABEL).sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, 3).map((f) => f.detail);
  const moonNakshatra = NAKSHATRAS[Math.floor(moon.longitude / (360 / 27)) % 27];
  const summary =
    `Prashna chart cast for the moment of your question: lagna ${d1.ascendant} (lord ${lagnaLordName} in the ${ORDINAL[lagnaLord.house]} house), ` +
    `Moon in ${moon.sign} (${moonNakshatra}, ${sky.moonWaxing ? "waxing" : "waning"}). ` +
    `For a ${profile.topic.toLowerCase()} question the ${ORDINAL[profile.primaryHouse]} house and ${profile.divisional.map((d) => d.chart).join("/") || "D1"} were consulted: ` +
    `${top.join("; ")}. Overall the chart is ${signal}.`;

  return {
    castAt: sky.castAt.toISOString(),
    latitude: sky.latitude,
    longitude: sky.longitude,
    lagna: d1.ascendant,
    lagnaLord: lagnaLordName,
    moonSign: moon.sign,
    moonNakshatra,
    moonWaxing: sky.moonWaxing,
    topic: profile.topic,
    primaryHouse: profile.primaryHouse,
    chartsUsed,
    factors: c.factors,
    score,
    signal,
    stability,
    risk,
    dominantPlanet,
    summary,
  };
}

export const PRASHNA_PROFILES = PROFILES;
