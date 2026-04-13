// backend/src/services/astro.service.ts
// ============================================================
// REAL VEDIC ASTROLOGY ENGINE
// Uses Swiss Ephemeris (swisseph npm) for actual planetary
// positions. No symbolic guesswork — real sidereal astronomy.
// Gets current date/time from system clock automatically.
// ============================================================

import swisseph from "swisseph";
import path from "path";
import { IntentType } from "./ajit.service";
import { EmotionType } from "./manu.service";

// ============================================================
// SWISS EPHEMERIS SETUP
// Uses built-in Moshier ephemeris — no external data files
// needed, works on Render/Netlify without extra config.
// ============================================================
try {
  swisseph.swe_set_ephe_path(
    path.join(__dirname, "../../node_modules/swisseph/ephe")
  );
} catch {
  // fallback to Moshier (built-in, no files needed)
}

// Set Lahiri ayanamsa (standard for Vedic/Indian astrology)
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

// ============================================================
// CONSTANTS
// ============================================================

const PLANET_IDS: Record<string, number> = {
  Sun:     swisseph.SE_SUN,
  Moon:    swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus:   swisseph.SE_VENUS,
  Mars:    swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn:  swisseph.SE_SATURN,
  Rahu:    swisseph.SE_MEAN_NODE, // Mean Node = Rahu
};

const PLANET_NAMES = Object.keys(PLANET_IDS);

const RASHI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Exaltation signs (0-indexed rashi)
const EXALTATION: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5,
  Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 2, Ketu: 8,
};

// Debilitation signs
const DEBILITATION: Record<string, number> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11,
  Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 8, Ketu: 2,
};

// Own signs (mooltrikona first)
const OWN_SIGNS: Record<string, number[]> = {
  Sun:     [4],
  Moon:    [3],
  Mars:    [0, 7],
  Mercury: [5, 2],
  Jupiter: [8, 11],
  Venus:   [6, 1],
  Saturn:  [9, 10],
};

// ============================================================
// VIMSHOTTARI DASHA SYSTEM
// ============================================================

const DASHA_SEQUENCE = [
  "Ketu", "Venus", "Sun", "Moon", "Mars",
  "Rahu", "Jupiter", "Saturn", "Mercury",
];

const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10,
  Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Nakshatra lords (0 = Ashwini → 26 = Revati)
const NAKSHATRA_LORDS: string[] = [
  "Ketu",    // 0  Ashwini
  "Venus",   // 1  Bharani
  "Sun",     // 2  Krittika
  "Moon",    // 3  Rohini
  "Mars",    // 4  Mrigashira
  "Rahu",    // 5  Ardra
  "Jupiter", // 6  Punarvasu
  "Saturn",  // 7  Pushya
  "Mercury", // 8  Ashlesha
  "Ketu",    // 9  Magha
  "Venus",   // 10 Purva Phalguni
  "Sun",     // 11 Uttara Phalguni
  "Moon",    // 12 Hasta
  "Mars",    // 13 Chitra
  "Rahu",    // 14 Swati
  "Jupiter", // 15 Vishakha
  "Saturn",  // 16 Anuradha
  "Mercury", // 17 Jyeshtha
  "Ketu",    // 18 Mula
  "Venus",   // 19 Purva Ashadha
  "Sun",     // 20 Uttara Ashadha
  "Moon",    // 21 Shravana
  "Mars",    // 22 Dhanishtha
  "Rahu",    // 23 Shatabhisha
  "Jupiter", // 24 Purva Bhadrapada
  "Saturn",  // 25 Uttara Bhadrapada
  "Mercury", // 26 Revati
];

const NAKSHATRA_NAMES: string[] = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
  "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
  "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
  "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

// ============================================================
// OUTPUT TYPES
// ============================================================

export type PlanetPosition = {
  name: string;
  longitude: number;         // sidereal longitude (0–360)
  rashi: string;             // zodiac sign name
  rashiIndex: number;        // 0–11
  degree: number;            // degree within sign (0–30)
  nakshatra: string;
  nakshatraLord: string;
  strength: "exalted" | "own" | "neutral" | "debilitated";
  isRetrograde: boolean;
};

export type DivisionalChart = {
  [planet: string]: string;  // planet → rashi in that divisional
};

export type DashaLevel = {
  lord: string;
  startDate: string;
  endDate: string;
  durationYears: number;
};

export type DashaResult = {
  mahadasha: DashaLevel;
  antardasha: DashaLevel;
  pratyantardasha: DashaLevel;
  sookshma: DashaLevel;
};

export type AstroInfluence = {
  dominantPlanet: string;
  stability: "low" | "medium" | "high";
  risk: "low" | "medium" | "high";
  signal: "favorable" | "challenging" | "neutral";
};

export type AstroResult = {
  influence: AstroInfluence;
  interpretation: string;
  // Extended data from Swiss Ephemeris
  currentPlanets: PlanetPosition[];
  moonNakshatra: string;
  currentDasha: DashaResult;
  d1Chart: DivisionalChart;
  d9Chart: DivisionalChart;
  d10Chart: DivisionalChart;
  calculatedAt: string;
};

// ============================================================
// JULIAN DAY NUMBER
// ============================================================

function getJulianDay(date: Date): number {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDate();
  const hour  = date.getUTCHours()
              + date.getUTCMinutes() / 60
              + date.getUTCSeconds() / 3600;

  return swisseph.swe_julday(
    year, month, day, hour,
    swisseph.SE_GREG_CAL
  );
}

// ============================================================
// PLANETARY POSITIONS (SIDEREAL / VEDIC)
// ============================================================

function calcOnePlanet(
  tjd: number,
  planetId: number,
  name: string
): PlanetPosition {
  const flags =
    swisseph.SEFLG_MOSEPH |
    swisseph.SEFLG_SIDEREAL |
    swisseph.SEFLG_SPEED;

  const result = swisseph.swe_calc_ut(tjd, planetId, flags);

  if (result.error) {
    throw new Error(`Swiss Ephemeris error for ${name}: ${result.error}`);
  }

  const longitude = ((result.longitude % 360) + 360) % 360;
  const rashiIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  const nakshatraIndex = Math.floor(longitude / (360 / 27));
  const isRetrograde = result.longitudeSpeed < 0;

  return {
    name,
    longitude,
    rashi: RASHI_NAMES[rashiIndex],
    rashiIndex,
    degree: parseFloat(degree.toFixed(2)),
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex] || "Unknown",
    nakshatraLord: NAKSHATRA_LORDS[nakshatraIndex] || "Unknown",
    strength: getPlanetStrength(name, rashiIndex),
    isRetrograde,
  };
}

function calculateAllPlanets(tjd: number): PlanetPosition[] {
  const planets: PlanetPosition[] = [];

  // Calculate standard planets (Sun to Rahu)
  for (const [name, id] of Object.entries(PLANET_IDS)) {
    const pos = calcOnePlanet(tjd, id, name);
    planets.push(pos);
  }

  // Calculate Ketu (always 180° from Rahu)
  const rahu = planets.find((p) => p.name === "Rahu")!;
  const ketuLong = ((rahu.longitude + 180) % 360);
  const ketuRashiIndex = Math.floor(ketuLong / 30);
  const ketuNakIndex = Math.floor(ketuLong / (360 / 27));

  planets.push({
    name: "Ketu",
    longitude: parseFloat(ketuLong.toFixed(4)),
    rashi: RASHI_NAMES[ketuRashiIndex],
    rashiIndex: ketuRashiIndex,
    degree: parseFloat((ketuLong % 30).toFixed(2)),
    nakshatra: NAKSHATRA_NAMES[ketuNakIndex] || "Unknown",
    nakshatraLord: NAKSHATRA_LORDS[ketuNakIndex] || "Unknown",
    strength: getPlanetStrength("Ketu", ketuRashiIndex),
    isRetrograde: true, // Ketu always retrograde
  });

  return planets;
}

// ============================================================
// PLANET STRENGTH
// ============================================================

function getPlanetStrength(
  planet: string,
  rashiIndex: number
): "exalted" | "own" | "neutral" | "debilitated" {
  if (EXALTATION[planet] === rashiIndex) return "exalted";
  if (DEBILITATION[planet] === rashiIndex) return "debilitated";
  if (OWN_SIGNS[planet]?.includes(rashiIndex)) return "own";
  return "neutral";
}

// ============================================================
// DIVISIONAL CHARTS
// ============================================================

// D1 — Rashi chart (the birth/transit chart itself)
function calcD1(planets: PlanetPosition[]): DivisionalChart {
  const chart: DivisionalChart = {};
  for (const p of planets) {
    chart[p.name] = p.rashi;
  }
  return chart;
}

// D9 — Navamsha (each sign divided into 9 parts of 3°20')
function getNavamshaSign(longitude: number): string {
  const normalized = ((longitude % 360) + 360) % 360;
  const rashiIndex = Math.floor(normalized / 30);
  const degInSign  = normalized % 30;
  const navamshaNum = Math.floor(degInSign / (30 / 9)); // 0–8

  // Fire signs (Aries, Leo, Sagittarius) start from Aries
  // Earth signs start from Capricorn
  // Air signs start from Libra
  // Water signs start from Cancer
  const startMap: Record<number, number> = {
    0: 0,  // Aries → starts Aries
    1: 9,  // Taurus → starts Capricorn
    2: 6,  // Gemini → starts Libra
    3: 3,  // Cancer → starts Cancer
    4: 0,  // Leo → starts Aries
    5: 9,  // Virgo → starts Capricorn
    6: 6,  // Libra → starts Libra
    7: 3,  // Scorpio → starts Cancer
    8: 0,  // Sagittarius → starts Aries
    9: 9,  // Capricorn → starts Capricorn
    10: 6, // Aquarius → starts Libra
    11: 3, // Pisces → starts Cancer
  };

  const startRashi = startMap[rashiIndex] ?? 0;
  const navamshaRashi = (startRashi + navamshaNum) % 12;
  return RASHI_NAMES[navamshaRashi];
}

function calcD9(planets: PlanetPosition[]): DivisionalChart {
  const chart: DivisionalChart = {};
  for (const p of planets) {
    chart[p.name] = getNavamshaSign(p.longitude);
  }
  return chart;
}

// D10 — Dashamsha (each sign divided into 10 parts of 3°)
function getDashamashaSign(longitude: number): string {
  const normalized = ((longitude % 360) + 360) % 360;
  const rashiIndex = Math.floor(normalized / 30);
  const degInSign  = normalized % 30;
  const partNum    = Math.floor(degInSign / 3); // 0–9

  // Odd signs (Aries, Gemini...) start from own sign
  // Even signs (Taurus, Cancer...) start from 9th from own sign
  let startRashi: number;
  if (rashiIndex % 2 === 0) {
    // Odd rashi (0-indexed even) — start from same sign
    startRashi = rashiIndex;
  } else {
    // Even rashi — start from 9th sign
    startRashi = (rashiIndex + 8) % 12;
  }

  const dashamashaRashi = (startRashi + partNum) % 12;
  return RASHI_NAMES[dashamashaRashi];
}

function calcD10(planets: PlanetPosition[]): DivisionalChart {
  const chart: DivisionalChart = {};
  for (const p of planets) {
    chart[p.name] = getDashamashaSign(p.longitude);
  }
  return chart;
}

// ============================================================
// VIMSHOTTARI DASHA — 4 LEVELS
// ============================================================

const TOTAL_DASHA_YEARS = 120;

// Add fractional years to a Date
function addYears(date: Date, years: number): Date {
  const ms = years * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function calculateVimshottariDasha(
  moonLongitude: number,
  referenceDate: Date
): DashaResult {
  const NAKSHATRA_SPAN = 360 / 27; // ~13.333°

  // Moon's nakshatra
  const nakshatraIndex = Math.floor(moonLongitude / NAKSHATRA_SPAN);
  const lordName = NAKSHATRA_LORDS[nakshatraIndex];

  // Fraction of nakshatra traversed
  const degInNakshatra = moonLongitude % NAKSHATRA_SPAN;
  const fractionDone   = degInNakshatra / NAKSHATRA_SPAN;

  // Remaining years in current mahadasha
  const mahaYears    = DASHA_YEARS[lordName];
  const remainingYears = mahaYears * (1 - fractionDone);

  // Find index of current lord in dasha sequence
  const lordIndex = DASHA_SEQUENCE.indexOf(lordName);

  // Build dasha timeline from reference date
  const mahaStart = addYears(referenceDate, -(fractionDone * mahaYears));
  const mahaEnd   = addYears(mahaStart, mahaYears);

  // ── Antardasha (sub-dasha within current Mahadasha) ──
  // Sub-dashas follow the same sequence starting from mahadasha lord
  let antarStart = mahaStart;
  let currentAntarLordIdx = lordIndex;
  let antarLord = lordName;
  let antarYears = 0;

  for (let i = 0; i < 9; i++) {
    const aIdx = (lordIndex + i) % 9;
    const aLord = DASHA_SEQUENCE[aIdx];
    const aYears = (DASHA_YEARS[aLord] / TOTAL_DASHA_YEARS) * mahaYears;
    const aEnd = addYears(antarStart, aYears);

    if (aEnd > referenceDate || i === 8) {
      antarLord = aLord;
      antarYears = aYears;
      currentAntarLordIdx = aIdx;
      break;
    }
    antarStart = aEnd;
  }

  const antarEnd = addYears(antarStart, antarYears);

  // ── Pratyantardasha (sub-sub dasha) ──
  let pratyStart = antarStart;
  let pratyLord = antarLord;
  let pratyYears = 0;

  for (let i = 0; i < 9; i++) {
    const pIdx = (currentAntarLordIdx + i) % 9;
    const pLord = DASHA_SEQUENCE[pIdx];
    const pYears = (DASHA_YEARS[pLord] / TOTAL_DASHA_YEARS) * antarYears;
    const pEnd = addYears(pratyStart, pYears);

    if (pEnd > referenceDate || i === 8) {
      pratyLord = pLord;
      pratyYears = pYears;
      break;
    }
    pratyStart = pEnd;
  }

  const pratyEnd = addYears(pratyStart, pratyYears);

  // ── Sookshma (sub-sub-sub dasha) ──
  let sookshmaStart = pratyStart;
  let sookshmaPratyIdx = DASHA_SEQUENCE.indexOf(pratyLord);
  let sookshmaLord = pratyLord;
  let sookshmaYears = 0;

  for (let i = 0; i < 9; i++) {
    const sIdx = (sookshmaPratyIdx + i) % 9;
    const sLord = DASHA_SEQUENCE[sIdx];
    const sYears = (DASHA_YEARS[sLord] / TOTAL_DASHA_YEARS) * pratyYears;
    const sEnd = addYears(sookshmaStart, sYears);

    if (sEnd > referenceDate || i === 8) {
      sookshmaLord = sLord;
      sookshmaYears = sYears;
      break;
    }
    sookshmaStart = sEnd;
  }

  const sookshmaEnd = addYears(sookshmaStart, sookshmaYears);

  return {
    mahadasha: {
      lord: lordName,
      startDate: formatDateShort(mahaStart),
      endDate: formatDateShort(mahaEnd),
      durationYears: parseFloat(mahaYears.toFixed(2)),
    },
    antardasha: {
      lord: antarLord,
      startDate: formatDateShort(antarStart),
      endDate: formatDateShort(antarEnd),
      durationYears: parseFloat(antarYears.toFixed(2)),
    },
    pratyantardasha: {
      lord: pratyLord,
      startDate: formatDateShort(pratyStart),
      endDate: formatDateShort(pratyEnd),
      durationYears: parseFloat(pratyYears.toFixed(2)),
    },
    sookshma: {
      lord: sookshmaLord,
      startDate: formatDateShort(sookshmaStart),
      endDate: formatDateShort(sookshmaEnd),
      durationYears: parseFloat(sookshmaYears.toFixed(2)),
    },
  };
}

// ============================================================
// INTENT → RULING PLANET MAPPING
// ============================================================

function getRulingPlanet(intent: IntentType): string {
  switch (intent) {
    case "relationship": return "Venus";
    case "conflict":     return "Mars";
    case "decision":     return "Mercury";
    case "career":       return "Saturn";
    case "health":       return "Sun";
    default:             return "Moon";
  }
}

// ============================================================
// INFLUENCE SCORING FROM REAL POSITIONS
// ============================================================

function scorePlanetStrength(
  planet: PlanetPosition,
  dasha: DashaResult
): number {
  let score = 50; // neutral baseline

  // Strength from sign placement
  switch (planet.strength) {
    case "exalted":     score += 30; break;
    case "own":         score += 15; break;
    case "neutral":     score += 0;  break;
    case "debilitated": score -= 25; break;
  }

  // Retrograde planets are more introspective — slight reduction
  if (planet.isRetrograde) score -= 5;

  // Dasha bonus: if current mahadasha/antardasha lord is this planet
  if (dasha.mahadasha.lord === planet.name)   score += 20;
  if (dasha.antardasha.lord === planet.name)  score += 10;
  if (dasha.pratyantardasha.lord === planet.name) score += 5;

  return Math.max(0, Math.min(100, score));
}

function scoreToStability(score: number): "low" | "medium" | "high" {
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function scoreToRisk(score: number): "low" | "medium" | "high" {
  if (score >= 65) return "low";
  if (score >= 40) return "medium";
  return "high";
}

function scoreToSignal(
  score: number,
  emotion: EmotionType
): "favorable" | "challenging" | "neutral" {
  const emotionPenalty: Record<EmotionType, number> = {
    calm: 5, confused: -5, sad: -10,
    stressed: -15, anxious: -15, angry: -20,
  };

  const adjusted = score + (emotionPenalty[emotion] ?? 0);
  if (adjusted >= 65) return "favorable";
  if (adjusted <= 35) return "challenging";
  return "neutral";
}

function buildInterpretation(
  planet: PlanetPosition,
  dasha: DashaResult,
  signal: "favorable" | "challenging" | "neutral"
): string {
  const dashaInfo = `Current period is ${dasha.mahadasha.lord} mahadasha / ${dasha.antardasha.lord} antardasha.`;
  const posInfo   = `${planet.name} is in ${planet.rashi} (${planet.nakshatra}) — ${planet.strength}.`;
  const retro     = planet.isRetrograde ? ` ${planet.name} is retrograde, suggesting delays and revisitation.` : "";

  if (signal === "favorable") {
    return `${posInfo}${retro} ${dashaInfo} The planetary configuration supports decisive and stable action at this time.`;
  }
  if (signal === "challenging") {
    return `${posInfo}${retro} ${dashaInfo} Planetary tension is present — avoid impulsive decisions and allow time for clarity before acting.`;
  }
  return `${posInfo}${retro} ${dashaInfo} The cosmic influence is balanced. Careful, grounded action will yield the best outcome.`;
}

// ============================================================
// MAIN EXPORTED FUNCTION
// ============================================================

export function analyzeAstro(
  intent: IntentType,
  emotion: EmotionType
): AstroResult {
  const now = new Date(); // system clock — no user input needed
  const tjd = getJulianDay(now);

  // Calculate all planet positions using Swiss Ephemeris
  const planets = calculateAllPlanets(tjd);

  // Moon's data for Nakshatra and Dasha
  const moon = planets.find((p) => p.name === "Moon")!;
  const dasha = calculateVimshottariDasha(moon.longitude, now);

  // Divisional charts
  const d1 = calcD1(planets);
  const d9 = calcD9(planets);
  const d10 = calcD10(planets);

  // Intent-specific ruling planet
  const rulingPlanetName = getRulingPlanet(intent);
  const rulingPlanet = planets.find((p) => p.name === rulingPlanetName) ?? planets[0];

  // Score and derive signal
  const score    = scorePlanetStrength(rulingPlanet, dasha);
  const stability = scoreToStability(score);
  const risk      = scoreToRisk(score);
  const signal    = scoreToSignal(score, emotion);

  return {
    influence: {
      dominantPlanet: rulingPlanet.name,
      stability,
      risk,
      signal,
    },
    interpretation: buildInterpretation(rulingPlanet, dasha, signal),
    currentPlanets: planets,
    moonNakshatra: moon.nakshatra,
    currentDasha: dasha,
    d1Chart: d1,
    d9Chart: d9,
    d10Chart: d10,
    calculatedAt: now.toISOString(),
  };
}
