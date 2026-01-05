import { createMatch } from "../models/match.model.js";

const matches = [];

export function addMatch(data) {
  const match = createMatch(data);
  matches.push(match);
  return match;
}

export function getMatchesBySeason(seasonId) {
  return matches.filter(match => match.seasonId === seasonId);
}
