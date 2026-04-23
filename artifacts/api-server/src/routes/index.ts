import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import plansRouter from "./plans";
import billingRouter from "./billing";
import projectsRouter from "./projects";
import scenesRouter from "./scenes";
import pipelineRouter from "./pipeline";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import presetsRouter from "./presets";
import extractRouter from "./extract";
import scriptChatRouter from "./script-chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(plansRouter);
router.use(billingRouter);
router.use(projectsRouter);
router.use(scenesRouter);
router.use(pipelineRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(presetsRouter);
router.use(extractRouter);
router.use(scriptChatRouter);

export default router;
