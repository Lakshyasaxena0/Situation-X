import { pgTable, text, serial, integer, jsonb, timestamp, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  // Clerk user id of the owner. Nullable only so rows created before ownership
  // existed survive the migration; they are not visible to any user.
  userId: text("user_id"),
  situation: text("situation").notNull(),
  category: text("category").notNull().default("general"),
  modules: text("modules").array().notNull(),
  overallResult: text("overall_result").notNull(),
  overallConfidence: text("overall_confidence").notNull(),
  overallScore: real("overall_score").notNull().default(0),
  summary: text("summary").notNull(),
  fullAnalysis: jsonb("full_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("analyses_user_id_idx").on(table.userId)]);

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
