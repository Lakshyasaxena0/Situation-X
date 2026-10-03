// backend/src/services/astro.service.ts
//
// Astronomical calculations (see ephemeris.service.ts):
// - Full VSOP87D planetary theory + Meeus lunar series via `astronomia`
//   (geocentric, light-time corrected) — arc-second level accuracy
// - Lahiri ayanamsa (standard for Vedic/Indian astrology)
// - Vimshottari Dasha system (4 levels: Maha → Antar → Pratyantar → Sookshma)
// - D1 (Rasi), D9 (Navamsha), D10 (Dashamsha) divisional charts
// - System clock for date/time (no user input required)
// - Optional lat/lon (defaults to New Delhi if not provided)

import type { IntentType } from "./ajit.service.js";
import type { EmotionType } from "./manu.service.js";
import {
  BODY_NAMES,
  julianDayFromDate,
  siderealLongitudes,
} from "./ephemeris.service.js";

// -----------------------------------------------------------------------
// EXTENDED TYPE DEFINITIONS
// -----------------------------------------------------------------------

export type PlanetPosition = {
  name: string;
  longitude: number;       // 0–360 sidereal (Lahiri)
  sign: string;            // e.g. "Aries"
  signIndex: number;       // 0–11
  degree: number;          // degrees within sign (0–30)
  nakshatra: string;       // e.g. "Rohini"
  nakshatraLord: string;   // ruling planet of nakshatra
};

export type DivisionalChart = {
  name: string;
  planets: Record<string, { sign: string; signIndex: number }>;
};

export type DashaLevel = {
  planet: string;
  startDate: string;       // YYYY-MM-DD
  endDate: string;
  durationYears: number;
};

export type VimshottariDasha = {
  mahadasha: DashaLevel;
  antardasha: DashaLevel;
  pratyantardasha: DashaLevel;
  sookshmadasha: DashaLevel;
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
  currentPlanets: Record<string, PlanetPosition>;
  dasha: VimshottariDasha;
  d1: DivisionalChart;
  d9: DivisionalChart;
  d10: DivisionalChart;
  calculatedAt: string;
  location: { latitude: number; longitude: number };
};

// -----------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
  "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
  "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra",
  "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
  "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

// Nakshatra lords in the Vimshottari sequence (repeats every 9)
const NAKSHATRA_LORDS = [
  "Ketu", "Venus", "Sun", "Moon", "Mars",
  "Rahu", "Jupiter", "Saturn", "Mercury",
];

// Dasha duration in years for each planet (total = 120 years)
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const TOTAL_DASHA_YEARS = 120;

// Fixed Vimshottari sequence order
const PLANET_ORDER = [
  "Ketu", "Venus", "Sun", "Moon", "Mars",
  "Rahu", "Jupiter", "Saturn", "Mercury",
];

const NAKSHATRA_SPAN = 360 / 27; // 13.3333°

// -----------------------------------------------------------------------
// STEP 1: COMPUTE ALL SIDEREAL POSITIONS (Lahiri)
// -----------------------------------------------------------------------

function computePlanetPositions(
  jd: number
): Record<string, PlanetPosition> {
  const sidereal = siderealLongitudes(jd);
  const positions: Record<string, PlanetPosition> = {};

  for (const name of BODY_NAMES) {
    const lon = sidereal[name];
    const signIndex = Math.floor(lon / 30);
    const degree = lon - signIndex * 30;
    const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN);
    const lordIndex = nakshatraIndex % 9;

    positions[name] = {
      name,
      // Rounding can produce exactly 360 (e.g. 359.99996); keep it in [0, 360).
      longitude: parseFloat(lon.toFixed(4)) % 360,
      sign: SIGNS[signIndex],
      signIndex,
      degree: parseFloat(degree.toFixed(4)),
      nakshatra: NAKSHATRAS[nakshatraIndex],
      nakshatraLord: NAKSHATRA_LORDS[lordIndex],
    };
  }

  return positions;
}

// -----------------------------------------------------------------------
// STEP 5: DIVISIONAL CHARTS
// -----------------------------------------------------------------------

// D1 — Rasi chart (same as natal positions)
function getD1(
  positions: Record<string, PlanetPosition>
): DivisionalChart {
  const planets: Record<string, { sign: string; signIndex: number }> = {};
  for (const [name, pos] of Object.entries(positions)) {
    planets[name] = { sign: pos.sign, signIndex: pos.signIndex };
  }
  return { name: "D1 (Rasi)", planets };
}

// D9 — Navamsha chart
// Each sign is divided into 9 parts of 3°20' (3.333°)
// Start sign depends on element: Fire→Aries, Earth→Capricorn, Air→Libra, Water→Cancer
function getNavamshaSign(lon: number): { sign: string; signIndex: number } {
  const signIndex = Math.floor(lon / 30);
  const degInSign = lon - signIndex * 30;
  const navamshaNum = Math.floor(degInSign / (30 / 9)); // 0–8

  // Element-based start sign
  const startMap = [0, 9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3];
  const navamshaSignIndex = (startMap[signIndex] + navamshaNum) % 12;
  return { sign: SIGNS[navamshaSignIndex], signIndex: navamshaSignIndex };
}

function getD9(
  positions: Record<string, PlanetPosition>
): DivisionalChart {
  const planets: Record<string, { sign: string; signIndex: number }> = {};
  for (const [name, pos] of Object.entries(positions)) {
    planets[name] = getNavamshaSign(pos.longitude);
  }
  return { name: "D9 (Navamsha)", planets };
}

// D10 — Dashamsha chart
// Each sign is divided into 10 parts of 3°
// Odd signs: count from same sign; Even signs: count from 9th sign
function getDashamamshaSign(lon: number): { sign: string; signIndex: number } {
  const signIndex = Math.floor(lon / 30);
  const degInSign = lon - signIndex * 30;
  const dashamamshaNum = Math.floor(degInSign / 3); // 0–9
  const isOdd = signIndex % 2 === 0; // 0-indexed Aries = odd
  const startSign = isOdd ? signIndex : (signIndex + 8) % 12;
  const dashamamshaSignIndex = (startSign + dashamamshaNum) % 12;
  return { sign: SIGNS[dashamamshaSignIndex], signIndex: dashamamshaSignIndex };
}

function getD10(
  positions: Record<string, PlanetPosition>
): DivisionalChart {
  const planets: Record<string, { sign: string; signIndex: number }> = {};
  for (const [name, pos] of Object.entries(positions)) {
    planets[name] = getDashamamshaSign(pos.longitude);
  }
  return { name: "D10 (Dashamsha)", planets };
}

// -----------------------------------------------------------------------
// STEP 6: VIMSHOTTARI DASHA — 4 LEVELS
// Based on Moon's current nakshatra and position within it
// -----------------------------------------------------------------------

function msToDateString(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

function computeVimshottariDasha(
  moonLon: number,
  now: Date
): VimshottariDasha {
  const nakshatraIndex = Math.floor(moonLon / NAKSHATRA_SPAN);
  const lordIndex = nakshatraIndex % 9;
  const mahaPlanet = NAKSHATRA_LORDS[lordIndex];
  const mahaIndex = PLANET_ORDER.indexOf(mahaPlanet);

  // Fraction of current nakshatra elapsed
  const degInNakshatra = moonLon - nakshatraIndex * NAKSHATRA_SPAN;
  const fractionElapsed = degInNakshatra / NAKSHATRA_SPAN;

  const mahaYears = DASHA_YEARS[mahaPlanet];
  const mahaMs = mahaYears * 365.25 * 24 * 3600 * 1000;
  const elapsedMs = fractionElapsed * mahaMs;

  const mahaStartMs = now.getTime() - elapsedMs;
  const mahaEndMs = mahaStartMs + mahaMs;

  // ---- Antardasha ----
  let antarStartMs = mahaStartMs;
  let antarPlanet = mahaPlanet;
  let antarEndMs = mahaStartMs;
  let antarYears = mahaYears;

  for (let i = 0; i < 9; i++) {
    const planet = PLANET_ORDER[(mahaIndex + i) % 9];
    const years = (DASHA_YEARS[planet] * mahaYears) / TOTAL_DASHA_YEARS;
    const ms = years * 365.25 * 24 * 3600 * 1000;
    antarEndMs = antarStartMs + ms;
    if (now.getTime() >= antarStartMs && now.getTime() < antarEndMs) {
      antarPlanet = planet;
      antarYears = years;
      break;
    }
    antarStartMs = antarEndMs;
  }
  const antarIndex = PLANET_ORDER.indexOf(antarPlanet);

  // ---- Pratyantardasha ----
  let pratStartMs = antarStartMs;
  let pratPlanet = antarPlanet;
  let pratEndMs = antarStartMs;
  let pratYears = antarYears;

  for (let i = 0; i < 9; i++) {
    const planet = PLANET_ORDER[(antarIndex + i) % 9];
    const years = (DASHA_YEARS[planet] * antarYears) / TOTAL_DASHA_YEARS;
    const ms = years * 365.25 * 24 * 3600 * 1000;
    pratEndMs = pratStartMs + ms;
    if (now.getTime() >= pratStartMs && now.getTime() < pratEndMs) {
      pratPlanet = planet;
      pratYears = years;
      break;
    }
    pratStartMs = pratEndMs;
  }
  const pratIndex = PLANET_ORDER.indexOf(pratPlanet);

  // ---- Sookshma dasha ----
  let sookStartMs = pratStartMs;
  let sookPlanet = pratPlanet;
  let sookEndMs = pratStartMs;
  let sookYears = pratYears;

  for (let i = 0; i < 9; i++) {
    const planet = PLANET_ORDER[(pratIndex + i) % 9];
    const years = (DASHA_YEARS[planet] * pratYears) / TOTAL_DASHA_YEARS;
    const ms = years * 365.25 * 24 * 3600 * 1000;
    sookEndMs = sookStartMs + ms;
    if (now.getTime() >= sookStartMs && now.getTime() < sookEndMs) {
      sookPlanet = planet;
      sookYears = years;
      break;
    }
    sookStartMs = sookEndMs;
  }

  return {
    mahadasha: {
      planet: mahaPlanet,
      startDate: msToDateString(mahaStartMs),
      endDate: msToDateString(mahaEndMs),
      durationYears: mahaYears,
    },
    antardasha: {
      planet: antarPlanet,
      startDate: msToDateString(antarStartMs),
      endDate: msToDateString(antarEndMs),
      durationYears: parseFloat(antarYears.toFixed(3)),
    },
    pratyantardasha: {
      planet: pratPlanet,
      startDate: msToDateString(pratStartMs),
      endDate: msToDateString(pratEndMs),
      durationYears: parseFloat(pratYears.toFixed(5)),
    },
    sookshmadasha: {
      planet: sookPlanet,
      startDate: msToDateString(sookStartMs),
      endDate: msToDateString(sookEndMs),
      durationYears: parseFloat(sookYears.toFixed(7)),
    },
  };
}

// -----------------------------------------------------------------------
// STEP 7: ASTROLOGICAL INFLUENCE EVALUATION
// -----------------------------------------------------------------------

// Intent → ruling planet
function mapIntentToPlanet(intent: IntentType): string {
  switch (intent) {
    case "relationship": return "Venus";
    case "conflict":     return "Mars";
    case "decision":     return "Mercury";
    case "career":       return "Saturn";
    case "health":       return "Sun";
    default:             return "Moon";
  }
}

// Classical exaltation/debilitation signs (0-indexed)
const EXALTATION: Record<string, number> = {
  Sun: 0, Moon: 1, Mercury: 5, Venus: 11,
  Mars: 9, Jupiter: 3, Saturn: 6, Rahu: 1, Ketu: 7,
};

const DEBILITATION: Record<string, number> = {
  Sun: 6, Moon: 7, Mercury: 11, Venus: 5,
  Mars: 3, Jupiter: 9, Saturn: 0, Rahu: 7, Ketu: 1,
};

const BENEFICS = new Set(["Venus", "Jupiter", "Mercury", "Moon"]);
const MALEFICS = new Set(["Saturn", "Mars", "Rahu", "Ketu", "Sun"]);

function getPlanetStrength(
  planet: string,
  positions: Record<string, PlanetPosition>
): "exalted" | "debilitated" | "neutral" {
  const signIndex = positions[planet]?.signIndex ?? -1;
  if (EXALTATION[planet] === signIndex) return "exalted";
  if (DEBILITATION[planet] === signIndex) return "debilitated";
  return "neutral";
}

function deriveInfluence(
  intentPlanet: string,
  positions: Record<string, PlanetPosition>,
  dasha: VimshottariDasha
): AstroInfluence {
  const strength = getPlanetStrength(intentPlanet, positions);
  const mahaDashaIsBenefic = BENEFICS.has(dasha.mahadasha.planet);
  const antarDashaIsBenefic = BENEFICS.has(dasha.antardasha.planet);

  let stability: "low" | "medium" | "high";
  let risk: "low" | "medium" | "high";
  let signal: "favorable" | "challenging" | "neutral";

  if (strength === "exalted" && mahaDashaIsBenefic && antarDashaIsBenefic) {
    stability = "high";
    risk = "low";
    signal = "favorable";
  } else if (strength === "debilitated" || (!mahaDashaIsBenefic && !antarDashaIsBenefic)) {
    stability = "low";
    risk = "high";
    signal = "challenging";
  } else if (strength === "exalted" || mahaDashaIsBenefic) {
    stability = "medium";
    risk = "low";
    signal = "favorable";
  } else if (MALEFICS.has(dasha.mahadasha.planet)) {
    // Reached only with a non-exalted, non-debilitated planet, a malefic
    // mahadasha and a benefic antardasha.
    stability = "low";
    risk = "medium";
    signal = "challenging";
  } else {
    stability = "medium";
    risk = "medium";
    signal = "neutral";
  }

  return {
    dominantPlanet: intentPlanet,
    stability,
    risk,
    signal,
  };
}

// -----------------------------------------------------------------------
// STEP 8: INTERPRETATION GENERATION
// -----------------------------------------------------------------------

function generateInterpretation(
  influence: AstroInfluence,
  dasha: VimshottariDasha,
  positions: Record<string, PlanetPosition>
): string {
  const { dominantPlanet, signal, stability, risk } = influence;
  const moon = positions["Moon"];
  const planet = positions[dominantPlanet];
  const dashaStr = `${dasha.mahadasha.planet} Mahadasha / ${dasha.antardasha.planet} Antardasha / ${dasha.pratyantardasha.planet} Pratyantardasha`;

  const moonInfo = moon
    ? `Moon is transiting ${moon.nakshatra} in ${moon.sign}`
    : "Moon position unavailable";

  const planetInfo = planet
    ? `${dominantPlanet} is in ${planet.sign} (${
        planet.signIndex === EXALTATION[dominantPlanet]
          ? "exalted"
          : planet.signIndex === DEBILITATION[dominantPlanet]
          ? "debilitated"
          : "neutral"
      })`
    : `${dominantPlanet} influence active`;

  if (signal === "favorable") {
    return (
      `${planetInfo}. Current dasha: ${dashaStr}. ${moonInfo}. ` +
      `All indicators align favorably — planetary support is strong. ` +
      `Stability: ${stability}, Risk: ${risk}. This is a constructive window for decisive action.`
    );
  }

  if (signal === "challenging") {
    return (
      `${planetInfo}. Current dasha: ${dashaStr}. ${moonInfo}. ` +
      `Planetary friction is elevated at this time. ` +
      `Stability: ${stability}, Risk: ${risk}. Avoid impulsive decisions. Allow time for clarity before acting.`
    );
  }

  return (
    `${planetInfo}. Current dasha: ${dashaStr}. ${moonInfo}. ` +
    `Planetary energies are mixed but manageable. ` +
    `Stability: ${stability}, Risk: ${risk}. Measured, deliberate action will yield the best outcomes.`
  );
}

// -----------------------------------------------------------------------
// MAIN EXPORTED FUNCTION
// -----------------------------------------------------------------------

export function analyzeAstro(
  intent: IntentType,
  _emotion: EmotionType,
  options?: { latitude?: number; longitude?: number }
): AstroResult {
  const now = new Date(); // System clock — no user input needed

  const latitude = options?.latitude ?? 28.6139;   // Default: New Delhi
  const longitude = options?.longitude ?? 77.2090;

  // Convert to Julian Day (UT)
  const jd = julianDayFromDate(now);

  // Compute all 9 planetary positions (sidereal, Lahiri ayanamsa)
  const positions = computePlanetPositions(jd);

  // Build divisional charts
  const d1 = getD1(positions);
  const d9 = getD9(positions);
  const d10 = getD10(positions);

  // Vimshottari Dasha — 4 levels based on current Moon nakshatra
  const dasha = computeVimshottariDasha(positions["Moon"].longitude, now);

  // Map intent to its ruling planet
  const intentPlanet = mapIntentToPlanet(intent);

  // Evaluate planetary influence
  const influence = deriveInfluence(intentPlanet, positions, dasha);

  // Build human-readable interpretation
  const interpretation = generateInterpretation(influence, dasha, positions);

  return {
    influence,
    interpretation,
    currentPlanets: positions,
    dasha,
    d1,
    d9,
    d10,
    calculatedAt: now.toISOString(),
    location: { latitude, longitude },
  };
}
