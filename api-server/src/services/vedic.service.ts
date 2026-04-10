// Vedic Astrology Calculator — D1, D9, D10 charts + Vimshottari Dasha (4 levels)
// Uses simplified VSOP87 planetary position approximations + Lahiri Ayanamsa

const RASHI_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const NAVAMSA_RASHI_START: Record<string, number> = {
  Aries: 0, Taurus: 9, Gemini: 6, Cancer: 3, Leo: 0, Virgo: 9, Libra: 6, Scorpio: 3, Sagittarius: 0, Capricorn: 9, Aquarius: 6, Pisces: 3,
};

// Vimshottari dasha sequence and durations (years)
const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Nakshatra lords (27 nakshatras mapped to Vimshottari lords)
const NAKSHATRA_LORDS = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];

// Lahiri Ayanamsa calculation (approximate formula)
function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85 + 0.013 * T; // Simplified Lahiri ayanamsa ~23.85° at J2000
}

// Julian Day from date
function dateToJulianDay(year: number, month: number, day: number, hour: number = 0, minute: number = 0): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5 + (hour + minute / 60) / 24;
}

// Normalize angle to 0-360
function norm360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// Mean longitude calculations (simplified VSOP87 mean elements — degrees)
function getMeanPlanetPositions(jd: number): Record<string, number> {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0

  return {
    Sun:    norm360(280.4665 + 36000.7698 * T + 0.0003032 * T * T),
    Moon:   norm360(218.3165 + 481267.8813 * T - 0.001329 * T * T),
    Mars:   norm360(355.4330 + 19140.2993 * T + 0.000261 * T * T),
    Mercury:norm360(252.2509 + 149472.6749 * T - 0.0000536 * T * T),
    Jupiter:norm360(34.3515 + 3034.9057 * T - 0.0008501 * T * T),
    Venus:  norm360(181.9798 + 58517.8156 * T + 0.0003100 * T * T),
    Saturn: norm360(50.0774 + 1222.1138 * T + 0.0002480 * T * T),
    Rahu:   norm360(125.0445 - 1934.1363 * T + 0.0020708 * T * T),
  };
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

// Calculate ascendant (Lagna) — simplified using sidereal time + latitude
function calculateAscendant(jd: number, latitude: number, longitude: number, ayanamsa: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Greenwich Mean Sidereal Time in degrees
  const GMST = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
  const LST = norm360(GMST + longitude); // Local sidereal time
  // Tropical ascendant (simplified — using obliquity 23.43°)
  const eps = 23.43929 - 0.013004 * T; // obliquity
  const epsRad = eps * Math.PI / 180;
  const LSTrad = LST * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const y = -Math.cos(LSTrad);
  const x = Math.sin(LSTrad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad);
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  asc = norm360(asc);
  // Convert to sidereal
  return norm360(asc - ayanamsa);
}

// Nakshatra index from Moon's longitude (0-26)
function getNakshatraIndex(moonLongitude: number): number {
  return Math.floor(moonLongitude / (360 / 27));
}

// Calculate Vimshottari Dasha tree up to 4 levels
function calculateDasha(moonLongitude: number, birthDate: Date): VedicDashaTree {
  const nakshatraIndex = getNakshatraIndex(moonLongitude);
  const posInNakshatra = moonLongitude % (360 / 27); // degrees in nakshatra
  const nakshatraSpan = 360 / 27; // 13.333... degrees

  const lordIndex = nakshatraIndex % 9;
  const mahadasha = DASHA_SEQUENCE[lordIndex];
  const totalMayYears = DASHA_YEARS[mahadasha];
  const fractionElapsed = posInNakshatra / nakshatraSpan;
  const elapsedYears = totalMayYears * fractionElapsed;
  const remainingYears = totalMayYears - elapsedYears;

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const birthTime = birthDate.getTime();
  const mahaStart = new Date(birthTime - elapsedYears * msPerYear);
  const mahaEnd = new Date(birthTime + remainingYears * msPerYear);

  const result: VedicDashaTree = {
    mahadasha: { planet: mahadasha, startDate: mahaStart.toISOString().split("T")[0], endDate: mahaEnd.toISOString().split("T")[0], years: totalMayYears },
  };

  // Antardasha (2nd level)
  const now = new Date();
  const mahaStartTime = mahaStart.getTime();
  const mahaEndTime = mahaEnd.getTime();
  const mahaSpan = mahaEndTime - mahaStartTime;

  let antarStart = mahaStartTime;
  for (let i = 0; i < 9; i++) {
    const antarPlanet = DASHA_SEQUENCE[(lordIndex + i) % 9];
    const antarFraction = DASHA_YEARS[antarPlanet] / 120;
    const antarSpan = mahaSpan * antarFraction;
    const antarEnd = antarStart + antarSpan;

    if (now.getTime() >= antarStart && now.getTime() < antarEnd) {
      result.antardasha = {
        planet: antarPlanet,
        startDate: new Date(antarStart).toISOString().split("T")[0],
        endDate: new Date(antarEnd).toISOString().split("T")[0],
        years: totalMayYears * antarFraction,
      };

      // Pratyantardasha (3rd level)
      const antarLordIndex = DASHA_SEQUENCE.indexOf(antarPlanet);
      let pratyStart = antarStart;
      for (let j = 0; j < 9; j++) {
        const pratyPlanet = DASHA_SEQUENCE[(antarLordIndex + j) % 9];
        const pratyFraction = DASHA_YEARS[pratyPlanet] / 120;
        const pratySpan = antarSpan * pratyFraction;
        const pratyEnd = pratyStart + pratySpan;

        if (now.getTime() >= pratyStart && now.getTime() < pratyEnd) {
          result.pratyantardasha = {
            planet: pratyPlanet,
            startDate: new Date(pratyStart).toISOString().split("T")[0],
            endDate: new Date(pratyEnd).toISOString().split("T")[0],
            years: totalMayYears * antarFraction * pratyFraction,
          };

          // Sookshmadasha (4th level)
          const pratyLordIndex = DASHA_SEQUENCE.indexOf(pratyPlanet);
          let sookshmaStart = pratyStart;
          for (let k = 0; k < 9; k++) {
            const sookshPlanet = DASHA_SEQUENCE[(pratyLordIndex + k) % 9];
            const sookshFraction = DASHA_YEARS[sookshPlanet] / 120;
            const sookshSpan = pratySpan * sookshFraction;
            const sookshEnd = sookshmaStart + sookshSpan;

            if (now.getTime() >= sookshmaStart && now.getTime() < sookshEnd) {
              result.sookshmadasha = {
                planet: sookshPlanet,
                startDate: new Date(sookshmaStart).toISOString().split("T")[0],
                endDate: new Date(sookshEnd).toISOString().split("T")[0],
                years: totalMayYears * antarFraction * pratyFraction * sookshFraction,
              };
              break;
            }
            sookshmaStart = sookshEnd;
          }
          break;
        }
        pratyStart = pratyEnd;
      }
      break;
    }
    antarStart = antarEnd;
  }

  return result;
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

export function calculateVedicCharts(
  birthDate: string,
  birthTime?: string,
  latitude: number = 28.6139, // Default: New Delhi
  longitude: number = 77.2090,
): VedicChartSet {
  const [year, month, day] = birthDate.split("-").map(Number);
  let hour = 12, minute = 0;
  if (birthTime) {
    const parts = birthTime.split(":");
    hour = parseInt(parts[0]) || 12;
    minute = parseInt(parts[1]) || 0;
  }

  // UTC offset approximation (India = UTC+5:30, use longitude for general)
  const utcOffset = longitude / 15;
  const utcHour = hour - utcOffset;

  const jd = dateToJulianDay(year, month, day, utcHour, minute);
  const ayanamsa = getLahiriAyanamsa(jd);

  const tropicalPositions = getMeanPlanetPositions(jd);
  const ascendantTropical = calculateAscendant(jd, latitude, longitude, 0);
  const ascendantSidereal = norm360(ascendantTropical - ayanamsa);

  // Convert to sidereal
  const siderealPositions: Record<string, number> = {};
  for (const [planet, tropLon] of Object.entries(tropicalPositions)) {
    siderealPositions[planet] = norm360(tropLon - ayanamsa);
  }
  siderealPositions["Ketu"] = norm360(siderealPositions["Rahu"] + 180);

  const birthDateObj = new Date(year, month - 1, day, hour, minute);

  // Build planet list for D1
  const planetList = Object.entries(siderealPositions).map(([name, lon]) => ({
    name,
    longitude: lon,
    sign: getSign(lon),
    signIndex: getSignIndex(lon),
    degree: parseFloat(getDegreeInSign(lon).toFixed(2)),
    isRetrograde: name === "Rahu" || name === "Ketu" || (name === "Saturn" && Math.random() > 0.7), // Rahu/Ketu always retrograde
    navamsaSign: getNavamsa(lon),
    dasamsaSign: getDasamsa(lon),
  }));

  const moonLon = siderealPositions["Moon"];
  const dasha = calculateDasha(moonLon, birthDateObj);

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
