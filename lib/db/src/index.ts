import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Connection settings. Hosted databases such as Supabase only accept SSL connections, and their
 * certificate is not signed by a public authority, so the certificate chain is not verified (the
 * connection is still encrypted). When SSL is used, `sslmode` is removed from the URL: the pg
 * driver would otherwise let it override this choice with a strict check that Supabase fails.
 *
 *   DATABASE_SSL=on | off   force SSL on or off
 *   otherwise SSL is used when the URL says sslmode=require/prefer/verify-* or the host is Supabase,
 *   and not used for sslmode=disable or a plain local/Replit database.
 */
export function poolConfigFor(rawUrl: string, ssl: string | undefined = process.env.DATABASE_SSL): pg.PoolConfig {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { connectionString: rawUrl }; // unusual URL: leave it entirely to the driver
  }
  const mode = url.searchParams.get("sslmode")?.toLowerCase() ?? null;
  const forced = ssl?.trim().toLowerCase();
  const useSsl =
    forced === "on" ? true
    : forced === "off" ? false
    : mode ? mode !== "disable"
    : /(^|\.)supabase\.(co|com)$/i.test(url.hostname);
  if (!useSsl) return { connectionString: rawUrl };
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
}

export const pool = new Pool(poolConfigFor(process.env.DATABASE_URL));
export const db = drizzle(pool, { schema });

export * from "./schema";
