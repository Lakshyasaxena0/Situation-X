// `astronomia` ships plain ESM JavaScript without type declarations.
// Minimal declarations for the pieces used by services/ephemeris.service.ts.

declare module "astronomia/planetposition" {
  export type Coord = { lon: number; lat: number; range: number };
  export class Planet {
    constructor(data: unknown);
    /** Heliocentric ecliptic position (radians, AU) at mean equinox of date. */
    position(jde: number): Coord;
  }
}

declare module "astronomia/moonposition" {
  /** Geocentric ecliptic position (radians, km) at mean equinox of date. */
  export function position(jde: number): { lon: number; lat: number; range: number };
}

declare module "astronomia/base" {
  /** Light travel time in days for a distance in AU. */
  export function lightTime(dist: number): number;
}

declare module "astronomia/data/*" {
  const data: unknown;
  export default data;
}
