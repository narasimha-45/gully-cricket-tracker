import Match from "../models/match.model.js";

import Player from "../models/player.model.js";

export const getSeasonBattingStats = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const players = await Player.find({
      seasonId,
      "batting.innings": { $gt: 0 },
    })
      .sort({ "batting.runs": -1 })
      .lean();

    res.json({
      success: true,
      data: players.map((p) => ({
        name: p.name,
        ...p.batting,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};



export const getSeasonBowlingStats = async (req, res) => {
  try {
    const { seasonId } = req.params;

    const players = await Player.find({
      seasonId,
      "bowling.innings": { $gt: 0 },
    })
      .sort({ "bowling.wickets": -1 })
      .lean();

    res.json({
      success: true,
      data: players.map((p) => ({
        name: p.name,
        ...p.bowling,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
