import express from "express";
import {
  createMatchController,
  getMatchesBySeasonController
} from "../controllers/match.controller.js";

const router = express.Router();

router.post("/", createMatchController);
router.get("/season/:seasonId", getMatchesBySeasonController);

export default router;
