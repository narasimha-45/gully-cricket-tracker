import express from "express";
import {
  getSeasonBattingStats,
  getSeasonBowlingStats,
} from "../controllers/stats.controller.js";

const router = express.Router();

router.get("/season/:seasonId/batting", getSeasonBattingStats);
router.get("/season/:seasonId/bowling", getSeasonBowlingStats);
router.get("/season/:seasonId/misc", getSeasonBowlingStats);

export default router;
