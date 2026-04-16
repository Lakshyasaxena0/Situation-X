import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val)),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_KEY: z.string().min(20, "SUPABASE_SERVICE_KEY is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ALLOWED_ORIGINS: z
    .string()
    .min(1, "ALLOWED_ORIGINS cannot be empty")
    .transform((val) => val.split(",").map((origin) => origin.trim())),
  GROQ_API_KEY: z.string().min(10, "GROQ_API_KEY is required"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.errors.map(
    (err) => `${err.path.join(".")}: ${err.message}`
  );
  throw new Error(
    `❌ Environment validation failed:\n${formattedErrors.join("\n")}`
  );
}

export const env = {
  PORT: parsedEnv.data.PORT as number,
  JWT_SECRET: parsedEnv.data.JWT_SECRET as string,
  SUPABASE_URL: parsedEnv.data.SUPABASE_URL as string,
  SUPABASE_SERVICE_KEY: parsedEnv.data.SUPABASE_SERVICE_KEY as string,
  NODE_ENV: parsedEnv.data.NODE_ENV as "development" | "production" | "test",
  ALLOWED_ORIGINS: parsedEnv.data.ALLOWED_ORIGINS as string[],
  GROQ_API_KEY: parsedEnv.data.GROQ_API_KEY as string,
};
