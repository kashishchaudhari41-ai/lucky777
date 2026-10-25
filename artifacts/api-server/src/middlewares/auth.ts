import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}
const JWT_SECRET = process.env.JWT_SECRET || "lucky777_jwt_secret_2024";

export interface AuthPayload {
  userId: string;
  phone: string;
}

export interface AdminAuthPayload {
  adminId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      admin?: AdminAuthPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  if (!payload.userId) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  try {
    // Blocked / suspended users lose access immediately, not when their token expires
    const u = await pool.query("SELECT status FROM users WHERE id = $1", [payload.userId]);
    if (u.rows.length === 0 || u.rows[0].status !== "active") {
      res.status(403).json({ error: "Account blocked" });
      return;
    }
  } catch {
    res.status(500).json({ error: "Auth check failed" });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminAuthPayload;
    if (!payload.adminId) {
      res.status(401).json({ error: "Admin access required" });
      return;
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function signUserToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signAdminToken(payload: AdminAuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}
