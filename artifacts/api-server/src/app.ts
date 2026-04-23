import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadUser } from "./lib/session";
import { seedStaticData } from "./lib/seed";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const ALLOWED_ORIGINS = (() => {
  const list = new Set<string>();
  const dev = process.env["REPLIT_DEV_DOMAIN"];
  if (dev) list.add(`https://${dev}`);
  const extra = process.env["ALLOWED_ORIGINS"];
  if (extra) extra.split(",").map((s) => s.trim()).filter(Boolean).forEach((o) => list.add(o));
  return list;
})();
app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(null, false);
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(loadUser);

app.use("/api", router);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

seedStaticData().catch((err) => logger.error({ err }, "Seed failed"));

export default app;
