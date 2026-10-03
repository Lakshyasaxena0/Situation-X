import { pgTable, text, serial, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  // Clerk user id of the owner (see analyses.userId).
  userId: text("user_id"),
  analysisId: integer("analysis_id").notNull(),
  situationSnippet: text("situation_snippet"),
  rating: integer("rating").notNull(),
  accuracy: integer("accuracy"),
  comment: text("comment"),
  helpful: boolean("helpful"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("feedback_user_id_idx").on(table.userId)]);

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({ id: true, createdAt: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
