import crypto from "crypto";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const COOKIE = "neuroclip.sid";
const TTL_DAYS = 30;

export type AuthedRequest = Request & {
  userId?: string;
  userRole?: string;
};

export async function createSession(
  res: Response,
  userId: string,
): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  res.cookie(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    expires: expiresAt,
    path: "/",
  });
  return id;
}

export async function destroySession(req: Request, res: Response) {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (sid) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sid));
  }
  res.clearCookie(COOKIE, { path: "/" });
}

export async function loadUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (!sid) return next();
  try {
    const rows = await db
      .select({ userId: sessionsTable.userId, expiresAt: sessionsTable.expiresAt, role: usersTable.role })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
      .where(eq(sessionsTable.id, sid))
      .limit(1);
    const row = rows[0];
    if (row && row.expiresAt > new Date()) {
      req.userId = row.userId;
      req.userRole = row.role;
    }
  } catch {
    /* ignore */
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Доступ только для администраторов" });
    return;
  }
  next();
}
