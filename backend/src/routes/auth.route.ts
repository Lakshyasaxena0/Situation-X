// backend/src/routes/auth.route.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validateAuthInput } from "../middleware/validation";
import { getUserByEmail, createUser } from "../models/user.model";
import { env } from "../config/env";
import { logger } from "../utils/logger";
const router = Router();
// -----------------------------
// REGISTER
// -----------------------------
// POST /api/auth/register
router.post("/register", validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    // Check existing user
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Create user
    const user = await createUser(email, passwordHash, name);
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    logger.info("User registered", { userId: user.id });
    res.status(201).json({
      token,
      user,
    });
  } catch (error: any) {
    logger.error("Register failed", { error: error.message });
    res.status(500).json({
      error: "Registration failed",
    });
  }
});
// -----------------------------
// LOGIN
// -----------------------------
// POST /api/auth/login
router.post("/login", validateAuthInput, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Fetch user
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    logger.info("User login success", { userId: user.id });
    // Remove password_hash before sending
    const { password_hash, ...safeUser } = user;
    res.status(200).json({
      token,
      user: safeUser,
    });
  } catch (error: any) {
    logger.error("Login failed", { error: error.message });
    res.status(500).json({
      error: "Login failed",
    });
  }
});
export default router;
