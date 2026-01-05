import { createSeason } from "../models/season.model.js";

const seasons = [];

export function addSeason(name) {
  const season = createSeason(name);
  seasons.push(season);
  return season;
}

export function getAllSeasons() {
  return seasons;
}
