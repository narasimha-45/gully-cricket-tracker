import express from "express";
import {
  createSeasonController,
  getSeasonsController
} from "../controllers/season.controller.js";

const router = express.Router();

router.post("/", createSeasonController);
router.get("/", getSeasonsController);

export default router;
