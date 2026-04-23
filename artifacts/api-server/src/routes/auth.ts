import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, tokenBalancesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createSession, destroySession, type AuthedRequest } from "../lib/session";
import { buildCurrentUser } from "./users-helpers";

const router: IRouter = Router();

router.post("/auth/register", async (req: AuthedRequest, res) => {
  const { email, password, name, consent } = req.body ?? {};
  if (!email || !password || !name) {
    res.status(400).json({ error: "Заполните все обязательные поля" });
    return;
  }
  if (!consent) {
    res.status(400).json({ error: "Необходимо согласие на обработку персональных данных" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Пароль должен быть не короче 8 символов" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
  if (existing.length) {
    res.status(400).json({ error: "Пользователь с такой почтой уже зарегистрирован" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE ${usersTable} IN SHARE ROW EXCLUSIVE MODE`);
    const isFirstUser =
      (await tx.select({ id: usersTable.id }).from(usersTable).limit(1)).length === 0;
    const [row] = await tx
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        name: String(name).trim(),
        role: isFirstUser ? "admin" : "user",
        planId: "free",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return row;
  });
  if (!created) {
    res.status(500).json({ error: "Не удалось создать пользователя" });
    return;
  }
  await db.insert(tokenBalancesTable).values({ userId: created.id, balance: 200 }).onConflictDoNothing();
  await createSession(res, created.id);
  const user = await buildCurrentUser(created.id);
  res.json({ user });
});

router.post("/auth/login", async (req: AuthedRequest, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Введите почту и пароль" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
  if (!u || !u.passwordHash) {
    res.status(401).json({ error: "Неверная почта или пароль" });
    return;
  }
  const ok = await bcrypt.compare(String(password), u.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Неверная почта или пароль" });
    return;
  }
  await createSession(res, u.id);
  const user = await buildCurrentUser(u.id);
  res.json({ user });
});

router.post("/auth/logout", async (req: AuthedRequest, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

router.post("/auth/oauth/:provider", async (req: AuthedRequest, res) => {
  const provider = req.params.provider;
  if (provider !== "vk" && provider !== "yandex") {
    res.status(400).json({ error: "Неизвестный провайдер" });
    return;
  }
  const fakeId = `${provider}_demo`;
  const email = `${provider}-demo@neuroclip.ru`;
  let [u] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!u) {
    [u] = await db
      .insert(usersTable)
      .values({
        email,
        name: provider === "vk" ? "Гость VK" : "Гость Яндекс",
        oauthProvider: provider,
        oauthId: fakeId,
        planId: "free",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();
    if (u) {
      await db.insert(tokenBalancesTable).values({ userId: u.id, balance: 200 }).onConflictDoNothing();
    }
  }
  if (!u) {
    res.status(500).json({ error: "Не удалось войти" });
    return;
  }
  await createSession(res, u.id);
  const user = await buildCurrentUser(u.id);
  res.json({ user });
});

export default router;
