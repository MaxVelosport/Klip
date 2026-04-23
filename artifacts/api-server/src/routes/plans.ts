import { Router, type IRouter } from "express";
import { db, plansTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(plansTable).orderBy(asc(plansTable.priceMonthRub));
  res.json(plans);
});

export default router;
