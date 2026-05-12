import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { sbFrom, sbRpc, TABLE } from "@workspace/db";
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
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await sbRpc("neyroclip_register_user", {
    p_email: normalizedEmail,
    p_name: String(name).trim(),
    p_password_hash: passwordHash,
  });
  if (error) {
    if (error.message?.includes("EMAIL_TAKEN")) {
      res.status(400).json({ error: "Пользователь с такой почтой уже зарегистрирован" });
      return;
    }
    throw new Error(error.message);
  }
  const created = data as { id: string };
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
  const { data: u, error } = await sbFrom(TABLE.users)
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!u || !(u as any).password_hash) {
    res.status(401).json({ error: "Неверная почта или пароль" });
    return;
  }
  const ok = await bcrypt.compare(String(password), (u as any).password_hash);
  if (!ok) {
    res.status(401).json({ error: "Неверная почта или пароль" });
    return;
  }
  await createSession(res, (u as any).id);
  const user = await buildCurrentUser((u as any).id);
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

  const { data: existing } = await sbFrom(TABLE.users).select("*").eq("email", email).maybeSingle();
  let u = existing as any;

  if (!u) {
    const { data: created, error } = await sbFrom(TABLE.users).insert({
      email,
      name: provider === "vk" ? "Гость VK" : "Гость Яндекс",
      oauth_provider: provider,
      oauth_id: fakeId,
      plan_id: "free",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();
    if (error) throw new Error(error.message);
    u = created;
    await sbFrom(TABLE.tokenBalances).upsert(
      { user_id: u.id, balance: 200 },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
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
