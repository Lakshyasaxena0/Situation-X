import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type AuthRequest = Request & {
  user?: { id: string };
};

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET missing" });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Token missing" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}
