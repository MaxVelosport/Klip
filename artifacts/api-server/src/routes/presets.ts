import { Router, type IRouter } from "express";
import { VOICES, ANIMATIONS, TRANSITIONS, VISUAL_STYLES, MUSIC, TOKEN_PACKS } from "../lib/presets";

const router: IRouter = Router();

router.get("/presets", (_req, res) => {
  res.json({
    voices: VOICES,
    animations: ANIMATIONS,
    transitions: TRANSITIONS,
    visualStyles: VISUAL_STYLES,
    music: MUSIC,
    tokenPacks: TOKEN_PACKS,
  });
});

export default router;
