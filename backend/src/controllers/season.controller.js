import { addSeason, getAllSeasons } from "../services/season.service.js";

export function createSeasonController(req, res) {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Season name is required" });
  }

  const season = addSeason(name);
  res.status(201).json(season);
}

export function getSeasonsController(req, res) {
  res.json(getAllSeasons());
}
