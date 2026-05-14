import { Router, type IRouter } from "express";
import { sbFrom, TABLE, type Plan } from "@workspace/db";

const router: IRouter = Router();

router.get("/plans", async (_req, res) => {
  const { data, error } = await sbFrom(TABLE.plans)
    .select("*")
    .order("price_month_rub", { ascending: true });
  if (error) throw new Error(error.message);
  res.json((data ?? []) as Plan[]);
});

export default router;
