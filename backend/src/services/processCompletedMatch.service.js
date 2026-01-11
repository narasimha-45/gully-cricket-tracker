import Match from "../models/match.model.js";
import Player from "../models/player.model.js";
import Team from "../models/team.model.js";

export const processCompletedMatch = async (match) => {
  const session = await Match.startSession();
  session.startTransaction();

  try {
    const { seasonId } = match;

    /* ------------------ 1. UPSERT PLAYERS (SEASON-SCOPED) ------------------ */
    const allPlayerNames = new Set();

    Object.values(match.teams).forEach((team) => {
      team.players.forEach((p) => {
        allPlayerNames.add(p.trim().toLowerCase());
      });
    });

    const playersMap = {};

    for (const name of allPlayerNames) {
      const player = await Player.findOneAndUpdate(
        { name, seasonId },
        {
          $setOnInsert: {
            name,
            seasonId,
          },
        },
        { upsert: true, new: true, session }
      );

      playersMap[name] = player;
    }

    /* ------------------ 2. UPSERT TEAMS ------------------ */
    for (const key of ["teamA", "teamB"]) {
      const teamData = match.teams[key];

      const playerIds = teamData.players.map((name) => playersMap[name]._id);

      await Team.findOneAndUpdate(
        { name: teamData.name, seasonId },
        {
          name: teamData.name,
          seasonId,
          players: playerIds,
        },
        { upsert: true, session }
      );
    }

    /* ------------------ 3. PROCESS INNINGS ------------------ */
    for (const inning of match.innings) {
      /* -------- Batting -------- */
      for (const [name, stats] of Object.entries(inning.battingStats || {})) {
        const player = playersMap[name];

        const isOut = !!stats.dismissal;
        const isDuck = isOut && stats.runs === 0;

        await Player.updateOne(
          { _id: player._id },
          {
            $inc: {
              "batting.innings": stats.balls > 0 ? 1 : 0,
              "batting.runs": stats.runs,
              "batting.balls": stats.balls,
              "batting.fours": stats.fours,
              "batting.sixes": stats.sixes,
              "batting.outs": isOut ? 1 : 0,
              "batting.ducks": isDuck ? 1 : 0,
            },
          },
          { session }
        );
      }

      /* -------- Bowling -------- */
      for (const [name, stats] of Object.entries(inning.bowlingStats || {})) {
        const player = playersMap[name];

        await Player.updateOne(
          { _id: player._id },
          {
            $inc: {
              "bowling.innings": stats.balls > 0 ? 1 : 0,
              "bowling.balls": stats.balls,
              "bowling.runs": stats.runs,
              "bowling.wickets": stats.wickets,
              "bowling.maidens": stats.maidens,
            },
          },
          { session }
        );
      }
    }

    /* ------------------ 4. SAVE MATCH ------------------ */
    const savedMatch = await Match.create(
      [
        {
          ...match,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return savedMatch[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
