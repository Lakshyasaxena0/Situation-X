// Vedic chart builder for PRASHNA (horary) astrology.
//
// The user never has to give birth details. The chart is cast for the exact moment the
// question is asked (and the place, default New Delhi), which is how Prashna works:
// the sky at the time of the question answers the question.
//
// Four charts are cast from the same sky:
//   D1  Rashi      - the main chart: lagna, Moon, houses (the overall promise of the question)
//   D3  Drekkana   - courage, initiative, effort, siblings/peers
//   D9  Navamsa    - inner strength, partnerships, the final fruit of a planet
//   D10 Dasamsa    - career, profession, status, achievement
// prashna.service.ts decides which of them matter for which kind of question.
//
// Positions and the Lahiri ayanamsa come from ephemeris.service.ts (VSOP87 via `astronomia`).

import {
  BODY_NAMES,
  type BodyName,
  isRetrograde,
  julianDayFromDate,
  lahiriAyanamsa,
  normalizeDegrees,
  siderealLongitudes,
  tropicalAscendant,
} from "./ephemeris.service.js";

export const RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

/** Ruler of each sign, Aries..Pisces (classical Vedic rulers; the nodes rule no sign). */
export const SIGN_RULERS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

const NAVAMSA_RASHI_START: Record<string, number> = {
  Aries: 0, Taurus: 9, Gemini: 6, Cancer: 3, Leo: 0, Virgo: 9, Libra: 6, Scorpio: 3, Sagittarius: 0, Capricorn: 9, Aquarius: 6, Pisces: 3,
};

// Sign indices (0 = Aries)
const EXALTATION: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
const DEBILITATION: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 1 };
const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [], Ketu: [],
};

export type Dignity = "exalted" | "own" | "debilitated" | "neutral";

export function dignityOf(planet: string, signIndex: number): Dignity {
  if (EXALTATION[planet] === signIndex) return "exalted";
  if (DEBILITATION[planet] === signIndex) return "debilitated";
  if (OWN_SIGNS[planet]?.includes(signIndex)) return "own";
  return "neutral";
}

function getSign(longitude: number): string {
  return RASHI_NAMES[Math.floor(longitude / 30)];
}

function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

// D3 (Drekkana): each sign has 3 parts of 10 degrees: the 1st part is the sign itself,
// the 2nd is its 5th sign, the 3rd is its 9th sign.
export function getDrekkana(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const part = Math.min(2, Math.floor((longitude % 30) / 10));
  return RASHI_NAMES[(signIndex + part * 4) % 12];
}

// D9 (Navamsa): each sign has 9 navamsas of 3 deg 20 min. Movable signs start from
// themselves, fixed from their 9th, dual from their 5th.
export function getNavamsa(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const posInSign = longitude % 30;
  const navamsaIndex = Math.min(8, Math.floor(posInSign / (10 / 3)));
  const startNavamsa = NAVAMSA_RASHI_START[RASHI_NAMES[signIndex]] ?? 0;
  return RASHI_NAMES[(startNavamsa + navamsaIndex) % 12];
}

// D10 (Dasamsa): each sign has 10 divisions of 3 degrees. Odd signs start from
// themselves, even signs from their 9th.
export function getDasamsa(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const dasamsaIndex = Math.min(9, Math.floor((longitude % 30) / 3));
  const isOddSign = signIndex % 2 === 0; // Aries (index 0) is the 1st, an odd sign
  const startSign = isOddSign ? signIndex : (signIndex + 8) % 12;
  return RASHI_NAMES[(startSign + dasamsaIndex) % 12];
}

export type DashaLevel = { planet: string; startDate: string; endDate: string; years: number };
export type VedicDashaTree = {
  mahadasha: DashaLevel;
  antardasha?: DashaLevel;
  pratyantardasha?: DashaLevel;
  sookshmadasha?: DashaLevel;
};

export type PlanetPosition = {
  name: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degree: number;
  isRetrograde: boolean;
  navamsaSign: string;
  dasamsaSign: string;
  drekkanaSign: string;
  /** House (1-12, whole-sign) counted from THIS chart's own lagna. */
  house: number;
  /** Dignity of the planet in this chart's sign. */
  dignity: Dignity;
};

export type VedicChart = {
  ascendant: string;
  ascendantDegree: number;
  planets: PlanetPosition[];
  currentDasha?: VedicDashaTree;
  ayanamsa: number;
  chartType: string;
};

export type VedicChartSet = { d1: VedicChart; d3: VedicChart; d9: VedicChart; d10: VedicChart };

export type PrashnaSky = {
  charts: VedicChartSet;
  castAt: Date;
  latitude: number;
  longitude: number;
  /** True when the Moon is between new and full (waxing). */
  moonWaxing: boolean;
  /** Planets too close to the Sun to give their results freely. */
  combust: string[];
};

export class ChartInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartInputError";
  }
}

/** Orb in degrees within which a planet is considered combust (asta). */
const COMBUST_ORB: Record<string, number> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };

const DEFAULT_LATITUDE = 28.6139;   // New Delhi
const DEFAULT_LONGITUDE = 77.209;

function angularSeparation(a: number, b: number): number {
  const d = Math.abs(normalizeDegrees(a) - normalizeDegrees(b)) % 360;
  return d > 180 ? 360 - d : d;
}

type DivisionFn = (lon: number) => string;

/** Builds one chart. `signOf` maps a sidereal longitude to the sign it falls in for this chart. */
function buildChart(
  chartType: string,
  signOf: DivisionFn,
  rashiLongitudes: Record<string, number>,
  ascendantSidereal: number,
  retro: Record<string, boolean>,
  ayanamsa: number,
): VedicChart {
  const ascSign = signOf(ascendantSidereal);
  const ascIndex = RASHI_NAMES.indexOf(ascSign);
  const planets: PlanetPosition[] = BODY_NAMES.map((name) => {
    const lon = rashiLongitudes[name];
    const sign = signOf(lon);
    const signIndex = RASHI_NAMES.indexOf(sign);
    return {
      name,
      // D1: the real sidereal longitude. Divisional charts: the exact degree inside a divisional
      // sign has no meaning, so keep the planet's degree-in-sign within its divisional sign.
      longitude: chartType === "D1"
        ? parseFloat(lon.toFixed(4)) % 360
        : signIndex * 30 + Math.min(29.99, getDegreeInSign(lon)),
      sign,
      signIndex,
      degree: parseFloat(getDegreeInSign(lon).toFixed(2)),
      isRetrograde: retro[name],
      navamsaSign: getNavamsa(lon),
      dasamsaSign: getDasamsa(lon),
      drekkanaSign: getDrekkana(lon),
      house: ((signIndex - ascIndex + 12) % 12) + 1,
      dignity: dignityOf(name, signIndex),
    };
  });
  return {
    ascendant: ascSign,
    ascendantDegree: parseFloat(getDegreeInSign(ascendantSidereal).toFixed(2)),
    planets,
    ayanamsa: parseFloat(ayanamsa.toFixed(4)),
    chartType,
  };
}

/**
 * Casts the Prashna charts for the moment `at` (default: now) at a place
 * (default: New Delhi). No birth data is involved.
 */
export function castPrashnaCharts(
  at: Date = new Date(),
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE,
): PrashnaSky {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new ChartInputError("latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new ChartInputError("longitude must be between -180 and 180.");
  }

  const jd = julianDayFromDate(at);
  const ayanamsa = lahiriAyanamsa(jd);
  const sidereal = siderealLongitudes(jd);
  const ascendantSidereal = normalizeDegrees(tropicalAscendant(jd, latitude, longitude) - ayanamsa);

  const retro: Record<string, boolean> = {};
  for (const name of BODY_NAMES) retro[name] = isRetrograde(name, jd);

  const d1 = buildChart("D1", getSign, sidereal, ascendantSidereal, retro, ayanamsa);
  const d3 = buildChart("D3", getDrekkana, sidereal, ascendantSidereal, retro, ayanamsa);
  const d9 = buildChart("D9", getNavamsa, sidereal, ascendantSidereal, retro, ayanamsa);
  const d10 = buildChart("D10", getDasamsa, sidereal, ascendantSidereal, retro, ayanamsa);

  const elongation = normalizeDegrees(sidereal.Moon - sidereal.Sun);
  const combust = Object.entries(COMBUST_ORB)
    .filter(([name, orb]) => name !== "Moon" && angularSeparation(sidereal[name as BodyName], sidereal.Sun) <= orb)
    .map(([name]) => name);

  return {
    charts: { d1, d3, d9, d10 },
    castAt: at,
    latitude,
    longitude,
    moonWaxing: elongation < 180,
    combust,
  };
}
