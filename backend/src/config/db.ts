// backend/src/config/db.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
// -----------------------------
// SUPABASE CLIENT INIT
// -----------------------------
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);
// -----------------------------
// TEST CONNECTION
// -----------------------------
export async function testConnection(): Promise<void> {
  try {
    const { error } = await supabase
      .from("users")
      .select("id")
      .limit(1);
    if (error) {
      throw error;
    }
    console.log("✅ Supabase connected successfully");
  } catch (err) {
    console.error("❌ Supabase connection failed:", err);
    process.exit(1);
  }
}
