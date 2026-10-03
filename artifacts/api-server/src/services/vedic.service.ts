// Vedic Astrology Calculator — D1, D9, D10 charts + Vimshottari Dasha (4 levels)
// Planetary positions and the Lahiri ayanamsa come from ephemeris.service.ts
// (VSOP87 via `astronomia`); this module builds natal charts from them.

import {
  BODY_NAMES,
  estimateUtcOffsetHours,
  isRetrograde,
  julianDayFromDate,
  lahiriAyanamsa,
  normalizeDegrees,
  siderealLongitudes,
  tropicalAscendant,
} from "./ephemeris.service.js";

const RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAVAMSA_RASHI_START: Record<string, number> = {
  Aries: 0, Taurus: 9, Gemini: 6, Cancer: 3, Leo: 0, Virgo: 9, Libra: 6, Scorpio: 3, Sagittarius: 0, Capricorn: 9, Aquarius: 6, Pisces: 3,
};

// Vimshottari dasha sequence and durations (years)
const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const TOTAL_DASHA_YEARS = 120;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const NAKSHATRA_SPAN = 360 / 27; // 13.333...°

/** Thrown for malformed or out-of-range birth data (maps to HTTP 400). */
export class BirthDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirthDataError";
  }
}

function getSign(longitude: number): string {
  return RASHI_NAMES[Math.floor(longitude / 30)];
}

function getSignIndex(longitude: number): number {
  return Math.floor(longitude / 30);
}

function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

// D9 (Navamsa): Each sign has 9 navamsas of 3°20' each
function getNavamsa(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const posInSign = longitude % 30;
  const navamsaIndex = Math.floor(posInSign / (10 / 3)); // 3.333... degrees each
  const signName = RASHI_NAMES[signIndex];
  const startNavamsa = NAVAMSA_RASHI_START[signName] ?? 0;
  const navamsaRashi = (startNavamsa + navamsaIndex) % 12;
  return RASHI_NAMES[navamsaRashi];
}

// D10 (Dasamsa): Each sign has 10 divisions of 3° each
function getDasamsa(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const posInSign = longitude % 30;
  const dasamsaIndex = Math.floor(posInSign / 3); // 3 degrees each
  // Odd signs: start from same sign. Even signs: start from 9th sign.
  const isOddSign = signIndex % 2 === 0; // 0-indexed, Aries=0 is odd (1st)
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

type Period = { planet: string; startMs: number; endMs: number; years: number };

function toLevel(p: Period): DashaLevel {
  return {
    planet: p.planet,
    startDate: new Date(p.startMs).toISOString().split("T")[0],
    endDate: new Date(p.endMs).toISOString().split("T")[0],
    years: p.years,
  };
}

/**
 * Finds the sub-period (antar / pratyantar / sookshma) of `parent` that
 * contains `atMs`. Sub-periods run in Vimshottari order starting with the
 * parent's own lord, each lasting parentYears * (lordYears / 120).
 */
function findSubPeriod(parent: Period, atMs: number): Period {
  const parentIndex = DASHA_SEQUENCE.indexOf(parent.planet);
  let start = parent.startMs;
  let last: Period = parent;
  for (let i = 0; i < 9; i++) {
    const planet = DASHA_SEQUENCE[(parentIndex + i) % 9];
    const years = (parent.years * DASHA_YEARS[planet]) / TOTAL_DASHA_YEARS;
    const end = start + years * MS_PER_YEAR;
    last = { planet, startMs: start, endMs: end, years };
    if (atMs < end) return last;
    start = end;
  }
  return last; // floating-point edge: atMs is at the very end of the parent
}

/**
 * Vimshottari dasha running at `nowMs` for a person born at `birthMs` with the
 * natal Moon at `moonLongitude` (sidereal). The birth mahadasha is only the
 * first period of a 120-year cycle; later mahadashas are walked forward until
 * the one containing `nowMs` is found.
 */
function calculateDasha(moonLongitude: number, birthMs: number, nowMs: number): VedicDashaTree {
  const nakshatraIndex = Math.floor(moonLongitude / NAKSHATRA_SPAN);
  const lordIndex = nakshatraIndex % 9;
  const fractionElapsed = (moonLongitude - nakshatraIndex * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;

  const birthLord = DASHA_SEQUENCE[lordIndex];
  let start = birthMs - fractionElapsed * DASHA_YEARS[birthLord] * MS_PER_YEAR;
  let index = lordIndex;
  let maha: Period = { planet: birthLord, startMs: start, endMs: start + DASHA_YEARS[birthLord] * MS_PER_YEAR, years: DASHA_YEARS[birthLord] };

  const at = Math.max(nowMs, birthMs);
  // 120-year cycle; the guard also covers absurdly old dates.
  for (let guard = 0; guard < 40 && at >= maha.endMs; guard++) {
    start = maha.endMs;
    index += 1;
    const planet = DASHA_SEQUENCE[index % 9];
    maha = { planet, startMs: start, endMs: start + DASHA_YEARS[planet] * MS_PER_YEAR, years: DASHA_YEARS[planet] };
  }

  const antar = findSubPeriod(maha, at);
  const praty = findSubPeriod(antar, at);
  const sookshma = findSubPeriod(praty, at);

  return {
    mahadasha: toLevel(maha),
    antardasha: toLevel(antar),
    pratyantardasha: toLevel(praty),
    sookshmadasha: toLevel(sookshma),
  };
}

export type PlanetPosition = {
  name: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degree: number;
  isRetrograde: boolean;
  navamsaSign: string;
  dasamsaSign: string;
};

export type VedicChart = {
  ascendant: string;
  ascendantDegree: number;
  planets: PlanetPosition[];
  currentDasha?: VedicDashaTree;
  ayanamsa: number;
  chartType: string;
};

export type VedicChartSet = { d1: VedicChart; d9: VedicChart; d10: VedicChart };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** Validates and parses birth date (YYYY-MM-DD) and optional time (HH:MM). */
export function parseBirthInput(birthDate: string, birthTime?: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const dm = DATE_RE.exec(birthDate);
  if (!dm) throw new BirthDataError("birthDate must be in YYYY-MM-DD format.");
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new BirthDataError("birthDate is not a valid calendar date.");
  }
  if (year < 1800) throw new BirthDataError("birthDate must be 1800 or later.");
  if (probe.getTime() > Date.now() + 24 * 60 * 60 * 1000) throw new BirthDataError("birthDate cannot be in the future.");

  // No time given: use local noon (the least-wrong guess; the ascendant is then only indicative).
  let hour = 12;
  let minute = 0;
  if (birthTime) {
    const tm = TIME_RE.exec(birthTime);
    if (!tm) throw new BirthDataError("birthTime must be in HH:MM (24-hour) format.");
    hour = Number(tm[1]);
    minute = Number(tm[2]);
  }
  return { year, month, day, hour, minute };
}

export function calculateVedicCharts(
  birthDate: string,
  birthTime?: string,
  latitude: number = 28.6139, // Default: New Delhi
  longitude: number = 77.2090,
): VedicChartSet {
  const { year, month, day, hour, minute } = parseBirthInput(birthDate, birthTime);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new BirthDataError("latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new BirthDataError("longitude must be between -180 and 180.");
  }

  // Birth time is civil local time; convert to UTC with a best-effort zone offset.
  const utcOffsetHours = estimateUtcOffsetHours(latitude, longitude);
  const birthMs = Date.UTC(year, month - 1, day, hour, minute) - utcOffsetHours * 3600 * 1000;
  const jd = julianDayFromDate(new Date(birthMs));
  const ayanamsa = lahiriAyanamsa(jd);

  const siderealPositions = siderealLongitudes(jd);
  const ascendantSidereal = normalizeDegrees(tropicalAscendant(jd, latitude, longitude) - ayanamsa);

  // Build planet list for D1
  const planetList: PlanetPosition[] = BODY_NAMES.map((name) => {
    const lon = siderealPositions[name];
    return {
      name,
      longitude: lon,
      sign: getSign(lon),
      signIndex: getSignIndex(lon),
      degree: parseFloat(getDegreeInSign(lon).toFixed(2)),
      isRetrograde: isRetrograde(name, jd),
      navamsaSign: getNavamsa(lon),
      dasamsaSign: getDasamsa(lon),
    };
  });

  const moonLon = siderealPositions.Moon;
  const dasha = calculateDasha(moonLon, birthMs, Date.now());

  const d1: VedicChart = {
    ascendant: getSign(ascendantSidereal),
    ascendantDegree: parseFloat(getDegreeInSign(ascendantSidereal).toFixed(2)),
    planets: planetList,
    currentDasha: dasha,
    ayanamsa: parseFloat(ayanamsa.toFixed(4)),
    chartType: "D1",
  };

  // D9 — Navamsa chart: re-map each planet's longitude to its navamsa position
  const d9Planets = planetList.map((p) => {
    const navamsaSignIndex = RASHI_NAMES.indexOf(p.navamsaSign);
    const navamsaLon = navamsaSignIndex * 30 + p.degree;
    return {
      ...p,
      longitude: navamsaLon,
      sign: p.navamsaSign,
      signIndex: navamsaSignIndex,
      navamsaSign: getNavamsa(navamsaLon),
      dasamsaSign: getDasamsa(navamsaLon),
    };
  });
  const d9AscNavamsaIndex = RASHI_NAMES.indexOf(getNavamsa(ascendantSidereal));
  const d9: VedicChart = {
    ascendant: getNavamsa(ascendantSidereal),
    ascendantDegree: parseFloat((d9AscNavamsaIndex * 30 + getDegreeInSign(ascendantSidereal)).toFixed(2)),
    planets: d9Planets,
    ayanamsa: parseFloat(ayanamsa.toFixed(4)),
    chartType: "D9",
  };

  // D10 — Dasamsa chart
  const d10Planets = planetList.map((p) => {
    const dasamsaSignIndex = RASHI_NAMES.indexOf(p.dasamsaSign);
    const dasamsaLon = dasamsaSignIndex * 30 + p.degree;
    return {
      ...p,
      longitude: dasamsaLon,
      sign: p.dasamsaSign,
      signIndex: dasamsaSignIndex,
      navamsaSign: getNavamsa(dasamsaLon),
      dasamsaSign: getDasamsa(dasamsaLon),
    };
  });
  const d10AscDasamsaIndex = RASHI_NAMES.indexOf(getDasamsa(ascendantSidereal));
  const d10: VedicChart = {
    ascendant: getDasamsa(ascendantSidereal),
    ascendantDegree: parseFloat((d10AscDasamsaIndex * 30 + getDegreeInSign(ascendantSidereal)).toFixed(2)),
    planets: d10Planets,
    ayanamsa: parseFloat(ayanamsa.toFixed(4)),
    chartType: "D10",
  };

  return { d1, d9, d10 };
}
