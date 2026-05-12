import crypto from "crypto";
import { sbFrom, TABLE } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

const COOKIE = "neuroclip.sid";
const TTL_DAYS = 30;

export type AuthedRequest = Request & {
  userId?: string;
  userRole?: string;
};

export async function createSession(res: Response, userId: string): Promise<string> {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await sbFrom(TABLE.sessions).insert({
    id,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(error.message);
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
    await sbFrom(TABLE.sessions).delete().eq("id", sid);
  }
  res.clearCookie(COOKIE, { path: "/" });
}

export async function loadUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const sid = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE];
  if (!sid) return next();
  try {
    const { data: session } = await sbFrom(TABLE.sessions).select("*").eq("id", sid).maybeSingle();
    if (!session || new Date(session.expires_at) <= new Date()) return next();
    const { data: user } = await sbFrom(TABLE.users)
      .select("id, role")
      .eq("id", session.user_id)
      .maybeSingle();
    if (user) {
      req.userId = session.user_id;
      req.userRole = (user as any).role;
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
