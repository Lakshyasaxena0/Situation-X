// backend/src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
// -----------------------------
// SCHEMAS
// -----------------------------
const analyzeSchema = z.object({
  input: z
    .string()
    .min(10, "Input must be at least 10 characters")
    .max(1000, "Input must not exceed 1000 characters")
    .transform((val) => val.trim()),
});
const feedbackSchema = z.object({
  analysisId: z.string().uuid("Invalid analysisId"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  comment: z
    .string()
    .max(500, "Comment must not exceed 500 characters")
    .optional(),
});
const authSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});
// -----------------------------
// GENERIC VALIDATOR
// -----------------------------
function validate(
  schema: z.ZodSchema,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    res.status(400).json({
      error: "Validation failed",
      details: errors,
    });
    return;
  }
  req.body = result.data;
  next();
}
// -----------------------------
// EXPORTED MIDDLEWARES
// -----------------------------
export function validateAnalyzeInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  validate(analyzeSchema, req, res, next);
}
export function validateFeedbackInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  validate(feedbackSchema, req, res, next);
}
export function validateAuthInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  validate(authSchema, req, res, next);
}
