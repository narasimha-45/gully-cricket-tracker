import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },

    batting: {
      innings: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      ducks: { type: Number, default: 0 },
      outs: { type: Number, default: 0 },
    },

    bowling: {
      innings: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

/* 🔥 UNIQUE CONSTRAINT */
PlayerSchema.index({ name: 1, seasonId: 1 }, { unique: true });

PlayerSchema.index({ seasonId: 1 });
PlayerSchema.index({ seasonId: 1, "batting.runs": -1 });
PlayerSchema.index({ seasonId: 1, "bowling.wickets": -1 });


const Player =
  mongoose.models.Player || mongoose.model("Player", PlayerSchema);

export default Player;
