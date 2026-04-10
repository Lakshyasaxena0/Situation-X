import { pgTable, text, serial, integer, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  situation: text("situation").notNull(),
  category: text("category").notNull().default("general"),
  modules: text("modules").array().notNull(),
  overallResult: text("overall_result").notNull(),
  overallConfidence: text("overall_confidence").notNull(),
  overallScore: real("overall_score").notNull().default(0),
  summary: text("summary").notNull(),
  fullAnalysis: jsonb("full_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
