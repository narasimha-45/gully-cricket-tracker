import {
  addMatch,
  getMatchesBySeason
} from "../services/match.service.js";

export function createMatchController(req, res) {
  const { seasonId, teamA, teamB, matchType } = req.body;

  if (!seasonId || !teamA || !teamB || !matchType) {
    return res.status(400).json({
      error: "seasonId, teamA, teamB, matchType are required"
    });
  }

  if (!["LIMITED", "TEST"].includes(matchType)) {
    return res.status(400).json({
      error: "matchType must be LIMITED or TEST"
    });
  }

  const match = addMatch({ seasonId, teamA, teamB, matchType });
  res.status(201).json(match);
}

export function getMatchesBySeasonController(req, res) {
  const { seasonId } = req.params;
  const matches = getMatchesBySeason(seasonId);
  res.json(matches);
}
