import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMatch, saveMatch } from "../storage/matchDB";
import BottomSheetSelector from "../components/BottomSheetSelector";
import EditMatchSheet from "../components/EditMatchSheet";
import Scorecard from "../components/Scorecard";

export default function LiveMatch() {
  const { matchId } = useParams();

  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_BASE_URL;
  const [match, setMatch] = useState(null);
  const [sheet, setSheet] = useState(null); // striker | nonStriker | bowler
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("live");
  const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
  const [extraMode, setExtraMode] = useState("NORMAL");
  const [ackSubmitting, setAckSubmitting] = useState(false);
  const [wicketUI, setWicketUI] = useState({
    open: false,
    type: null, // BOWLED | CAUGHT | RUN_OUT | STUMPED | ...
    outWho: "STRIKER", // STRIKER | NON_STRIKER
    helper: null, // fielder / keeper
  });

  const [inningsEnd, setInningsEnd] = useState(false);
  const [matchEnd, setMatchEnd] = useState(false);

  const calcCRR = (runs, balls) =>
    balls === 0 ? "0.00" : (runs / (balls / 6)).toFixed(2);

  useEffect(() => {
    const load = async () => {
      const m = await getMatch(matchId);
      if (m) setMatch(m);
    };
    load();
  }, [matchId]);

  /* ---------------- LOADING ---------------- */

  if (!match) return <p>Loading match…</p>;
  if (!match.live)
    return <p style={{ color: "#dc2626" }}>Complete toss to start match</p>;

  const { teams, live } = match;
  const innings = match.innings[live.inningsIndex];

  /* ---------------- HELPERS ---------------- */

  const recreateMatch = async () => {
    const newMatchId = `match_${Date.now()}`;

    const newMatch = {
      id: newMatchId,
      seasonId: match.seasonId,

      matchType: match.matchType,
      totalOvers: match.totalOvers,
      rules: match.rules,

      teams: {
        teamA: {
          name: match.teams.teamA.name,
          players: [...match.teams.teamA.players],
        },
        teamB: {
          name: match.teams.teamB.name,
          players: [...match.teams.teamB.players],
        },
      },

      toss: null,
      innings: [],
      live: null,

      status: "setup",

      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveMatch(newMatch);

    navigate(`/season/${match.seasonId}/match/${newMatchId}/toss`);
  };

  const formatOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

  const updateLive = (updates) => {
    const updated = {
      ...match,
      live: { ...match.live, ...updates },
      updatedAt: Date.now(),
    };
    saveMatch(updated);
    setMatch(updated);
  };

  const isInningsComplete = (innings, battingPlayers, totalOvers) => {
    if (innings.balls >= totalOvers * 6) return true;
    if (innings.wickets >= battingPlayers.length - 1) return true;
    return false;
  };

  const isTargetAchieved = (innings, target) => {
    return innings.totalRuns >= target;
  };

  const evaluateMatchState = (updated) => {
    const { live, innings, teams, totalOvers } = updated;
    const currentInnings = updated.innings[live.inningsIndex];

    const battingPlayers =
      currentInnings.battingTeam === teams.teamA.name
        ? teams.teamA.players
        : teams.teamB.players;

    /* ---------- SECOND INNINGS: TARGET CHASE ---------- */
    if (live.inningsIndex === 1) {
      const target = updated.innings[0].totalRuns + 1;

      if (isTargetAchieved(currentInnings, target)) {
        endMatch(updated, "CHASE");
        return;
      }
    }

    /* ---------- INNINGS COMPLETE ---------- */
    if (isInningsComplete(currentInnings, battingPlayers, totalOvers)) {
      if (live.inningsIndex === 0) {
        endFirstInnings(updated);
      } else {
        endMatch(updated, "DEFEND");
      }
    }
  };

  const endFirstInnings = (updated) => {
    updated.innings[0].completed = true;
    updated.live.pendingNextInnings = true;

    saveMatch(updated);
    setMatch(updated);
  };

  const endMatch = (updated, type) => {
    updated.status = "COMPLETED";

    const i1 = updated.innings[0];
    const i2 = updated.innings[1];

    if (type === "CHASE") {
      const battingPlayers =
        i2.battingTeam === updated.teams.teamA.name
          ? updated.teams.teamA.players
          : updated.teams.teamB.players;

      updated.result = {
        winner: i2.battingTeam,
        type: "WICKETS",
        margin: battingPlayers.length - 1 - i2.wickets,
      };
    } else {
      updated.result = {
        winner: i1.battingTeam,
        type: "RUNS",
        margin: i1.totalRuns - i2.totalRuns,
      };
    }

    updated.ui = {
      ...(updated.ui || {}),
      matchResultSeen: false,
    };

    saveMatch(updated);
    setMatch(updated);
  };

  const selectable = (enabled) => ({
    color: enabled ? "#4f46e5" : "#111827",
    fontWeight: 600,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.5,
  });

  /* ---------------- PLAYERS ---------------- */

  const battingPlayers =
    innings.battingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const bowlingPlayers =
    innings.bowlingTeam === teams.teamA.name
      ? teams.teamA.players
      : teams.teamB.players;

  const eligibleBatsmen = battingPlayers.filter(
    (p) =>
      !live.outBatsmen.includes(p) &&
      p !== live.striker &&
      p !== live.nonStriker
  );

  const disabledBowlers = [live.lastOverBowler];

  /* ---------------- HELPERS ---------------- */

  const pushSelectionHistory = () => {
    if (match.status === "COMPLETED") return;
    const innings = match.innings[match.live.inningsIndex];

    if (match.live.striker) {
      innings.battingStats[match.live.striker] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissal: null,
      };
    }

    if (match.live.nonStriker) {
      innings.battingStats[match.live.nonStriker] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissal: null,
      };
    }

    match.live.history.push({
      type: "SELECTION",
      prevState: {
        striker: match.live.striker,
        nonStriker: match.live.nonStriker,
        bowler: match.live.bowler,
        lastOverBowler: match.live.lastOverBowler,
        balls: innings.balls,
        totalRuns: innings.totalRuns,
        wickets: innings.wickets,
        battingStats: deepCopy(innings.battingStats),
        bowlingStats: deepCopy(innings.bowlingStats),
        outBatsmen: [...match.live.outBatsmen],
        thisOver: deepCopy(innings.thisOver || []),
        extraMode,
      },
    });
  };

  const handleOverEnd = (updated, live, innings) => {
    if (innings.balls > 0 && innings.balls % 6 === 0) {
      // ---- MAIDEN CHECK ----
      let isMaiden = true;

      for (let ball of innings.thisOver) {
        if (
          (ball.type === "RUN" && ball.runs > 0) ||
          ball.type === "WIDE" ||
          ball.type === "NO_BALL"
        ) {
          isMaiden = false;
          break;
        }
      }

      innings.bowlingStats[live.bowler] ||= {
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
      };

      if (isMaiden) {
        innings.bowlingStats[live.bowler].maidens += 1;
      }

      // mark over end
      live.lastOverBowler = live.bowler;
      live.bowler = null;

      // rotate strike
      [live.striker, live.nonStriker] = [live.nonStriker, live.striker];

      // reset over
      innings.thisOver = [];
    }
  };

  /* ---------------- Update Runs ---------------- */

  const renderBatStats = (innings, name) => {
    const s = innings.battingStats[name] || {};
    return (
      <>
        <span>{s.runs || 0}</span>
        <span>{s.balls || 0}</span>
        <span>{s.fours || 0}</span>
        <span>{s.sixes || 0}</span>
      </>
    );
  };

  const renderBowlStats = (innings, name) => {
    const s = innings.bowlingStats[name] || {};
    return (
      <>
        <span>{`${Math.floor((s.balls || 0) / 6)}.${(s.balls || 0) % 6}`}</span>
        <span>{s.maidens || 0}</span>
        <span>{s.runs || 0}</span>
        <span>{s.wickets || 0}</span>
      </>
    );
  };

  const WICKET_TYPES = [
    "BOWLED",
    "CAUGHT",
    "LBW",
    "STUMPED",
    "RUN_OUT",
    "HIT_WICKET",
    "SPECIAL",
  ];

  const applyWicket = ({ wicketType, outBatsman, helper = null }) => {
    if (match.status === "COMPLETED") return;
    const updated = deepCopy(match);
    const live = updated.live;
    const innings = updated.innings[live.inningsIndex];

    const isExtra = extraMode === "NO_BALL" || extraMode === "WIDE";

    /* ---------- UNDO ---------- */
    live.history.push({
      type: "WICKET",
      prevState: {
        striker: live.striker,
        nonStriker: live.nonStriker,
        bowler: live.bowler,
        balls: innings.balls,
        totalRuns: innings.totalRuns,
        wickets: innings.wickets,
        battingStats: deepCopy(innings.battingStats),
        bowlingStats: deepCopy(innings.bowlingStats),
        outBatsmen: [...live.outBatsmen],
        thisOver: deepCopy(innings.thisOver || []),
        extraMode,
      },
    });

    innings.thisOver ||= [];

    /* ---------- BALL COUNT ---------- */
    const countsBall = extraMode === "NORMAL";

    /* ---------- WICKET ---------- */
    innings.wickets++;
    live.outBatsmen.push(outBatsman);

    innings.thisOver.push({
      type: "WICKET",
      wicketType,
      outBatsman,
      helper,
      extra: extraMode,
    });

    innings.battingStats[outBatsman] ||= {
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      dismissal: null,
    };

    innings.battingStats[outBatsman].dismissal = {
      type: wicketType,
      bowler: live.bowler,
      fielder: helper || null,
    };

    /* ---------- BOWLER CREDIT ---------- */
    const bowlerGetsWicket =
      ["BOWLED", "CAUGHT", "LBW", "STUMPED", "HIT_WICKET"].includes(
        wicketType
      ) && extraMode !== "NO_BALL";

    if (bowlerGetsWicket) {
      innings.bowlingStats[live.bowler] ||= {
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
      };
      innings.bowlingStats[live.bowler].wickets++;
    }

    innings.bowlingStats[live.bowler] ||= {
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };

    // if (countsBall) {
    //   innings.balls++;
    //   innings.bowlingStats[live.bowler].balls++;
    //   evaluateMatchState(updated);
    // }

    innings.dismissals ||= {};

    innings.dismissals[outBatsman] = {
      type: wicketType,
      bowler: live.bowler,
      fielder: helper || null,
    };

    /* ---------- NEXT BATSMAN ---------- */
    if (countsBall && innings.balls % 6 !== 0) {
      if (outBatsman === live.striker) {
        live.striker = null; // ✅ OUT striker replaced
      } else if (outBatsman === live.nonStriker) {
        live.nonStriker = null; // ✅ OUT non-striker replaced
      }
    }

    /* ---------- RESET EXTRA ---------- */
    setExtraMode("NORMAL");

    if (countsBall) {
      innings.balls++;
      innings.bowlingStats[live.bowler].balls++;

      handleOverEnd(updated, live, innings);
      evaluateMatchState(updated);
    }

    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  const undoFromMatchPopup = () => {
    const updated = deepCopy(match);

    /* -------------------------------------------------
     1️⃣ Re-open the match
  --------------------------------------------------*/
    updated.status = "LIVE";
    updated.result = null;

    updated.ui = {
      ...(updated.ui || {}),
      matchResultSeen: false,
    };

    /* -------------------------------------------------
     2️⃣ Ensure innings transition flags are cleared
  --------------------------------------------------*/
    updated.live.pendingNextInnings = false;

    /* -------------------------------------------------
     3️⃣ Undo last history entry
  --------------------------------------------------*/
    const last = updated.live.history.pop();
    if (!last) {
      updated.updatedAt = Date.now();
      saveMatch(updated);
      setMatch(updated);
      return;
    }

    const innings = updated.innings[updated.live.inningsIndex];
    const p = last.prevState;

    /* -------------------------------------------------
     4️⃣ Restore LIVE state
  --------------------------------------------------*/
    updated.live.striker = p.striker ?? null;
    updated.live.nonStriker = p.nonStriker ?? null;
    updated.live.bowler = p.bowler ?? null;
    updated.live.lastOverBowler = p.lastOverBowler ?? null;
    updated.live.outBatsmen = [...(p.outBatsmen || [])];

    /* -------------------------------------------------
     5️⃣ Restore innings state
  --------------------------------------------------*/
    innings.balls = p.balls;
    innings.totalRuns = p.totalRuns;
    innings.wickets = p.wickets;
    innings.battingStats = deepCopy(p.battingStats || {});
    innings.bowlingStats = deepCopy(p.bowlingStats || {});
    innings.thisOver = deepCopy(p.thisOver || []);

    /* -------------------------------------------------
     6️⃣ Restore extra mode
  --------------------------------------------------*/
    setExtraMode(p.extraMode || "NORMAL");

    /* -------------------------------------------------
     7️⃣ Commit
  --------------------------------------------------*/
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  const acknowledgeMatchResult = async () => {
    if (ackSubmitting) return;

    const payload = {
      seasonId: match.seasonId,

      teams: match.teams, // teamA, teamB, players
      toss: match.toss, // winner + decision
      rules: match.rules, // wide/no-ball rules
      totalOvers: match.totalOvers,

      matchType: match.matchType,

      innings: match.innings.map((inn) => ({
        battingTeam: inn.battingTeam,
        bowlingTeam: inn.bowlingTeam,

        totalRuns: inn.totalRuns,
        wickets: inn.wickets,
        balls: inn.balls,

        battingStats: inn.battingStats,
        bowlingStats: inn.bowlingStats,

        extras: inn.extras || { wides: 0, noBalls: 0 },
        dismissals: inn.dismissals || {},
        completed: true,
      })),

      result: {
        winner: match.result.winner,
        type: match.result.type, // RUNS | WICKETS
        margin: match.result.margin,
      },
    };

    // console.log("payload", payload);

    await fetch(`${API}/api/matches/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const updated = deepCopy(match);
    updated.ui.matchResultSeen = true;

    saveMatch(updated); // local
    setMatch(updated);
    setAckSubmitting(true);
  };

  const undoFromInningsPopup = () => {
    const updated = deepCopy(match);

    // 1️⃣ Cancel innings completion
    updated.live.pendingNextInnings = false;

    // 2️⃣ Undo last history entry
    const last = updated.live.history.pop();
    if (!last) {
      saveMatch(updated);
      setMatch(updated);
      return;
    }

    const innings = updated.innings[updated.live.inningsIndex];
    const p = last.prevState;

    // 3️⃣ Restore live state
    updated.live.striker = p.striker;
    updated.live.nonStriker = p.nonStriker;
    updated.live.bowler = p.bowler;
    updated.live.lastOverBowler = p.lastOverBowler ?? null;
    updated.live.outBatsmen = [...(p.outBatsmen || [])];

    // 4️⃣ Restore innings state
    innings.balls = p.balls;
    innings.totalRuns = p.totalRuns;
    innings.wickets = p.wickets;
    innings.battingStats = deepCopy(p.battingStats);
    innings.bowlingStats = deepCopy(p.bowlingStats);
    innings.thisOver = deepCopy(p.thisOver || []);

    // 5️⃣ Restore extra mode
    setExtraMode(p.extraMode || "NORMAL");

    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  const recordBall = ({ type, runs = 0 }) => {
    if (match.status === "COMPLETED") return;
    const updated = deepCopy(match);
    const live = updated.live;
    const innings = updated.innings[live.inningsIndex];

    if (!live.striker || !live.nonStriker || !live.bowler) return;

    // --- history (undo-safe) ---
    live.history.push({
      type,
      prevState: {
        striker: live.striker,
        nonStriker: live.nonStriker,
        bowler: live.bowler,
        balls: innings.balls,
        totalRuns: innings.totalRuns,
        lastOverBowler: live.lastOverBowler,
        outBatsmen: [...live.outBatsmen],
        wickets: innings.wickets,
        battingStats: deepCopy(innings.battingStats),
        bowlingStats: deepCopy(innings.bowlingStats),
        thisOver: [...innings.thisOver],
        extraMode,
      },
    });

    // ensure thisOver
    innings.thisOver ||= [];

    // ---------------- THIS OVER ----------------
    innings.thisOver.push({ type, runs });

    // ---------------- RUNS ----------------
    if (runs > 0) {
      innings.totalRuns += runs;

      // batsman runs only if NORMAL or NO_BALL
      if (type !== "WIDE") {
        innings.battingStats[live.striker] ||= {
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        };
        const bat = innings.battingStats[live.striker];
        bat.runs += runs;
        if (runs === 4) bat.fours += 1;
        if (runs === 6) bat.sixes += 1;
      }

      // bowler runs
      innings.bowlingStats[live.bowler] ||= {
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
      };
      innings.bowlingStats[live.bowler].runs += runs;
    }

    // ---------------- BALL COUNT ----------------
    // const consumesBall = type === "RUN";

    // if (consumesBall) {
    //   innings.balls += 1;
    //   // ---------------- OVER END ----------------
    //   handleOverEnd(updated, live, innings);
    // }

    // Batsman balls: only for RUN and NO_BALL if extraBall
    if (
      type === "RUN" ||
      (type === "NO_BALL" && match.rules?.noBall?.extraBall)
    ) {
      innings.battingStats[live.striker] ||= {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
      };
      innings.battingStats[live.striker].balls += 1;
    }

    // Bowler balls: for RUN, NO_BALL, WIDE
    // if (type === "RUN") {
    //   innings.bowlingStats[live.bowler] ||= {
    //     balls: 0,
    //     runs: 0,
    //     wickets: 0,
    //     maidens: 0,
    //   };
    //   innings.bowlingStats[live.bowler].balls += 1;
    // }

    // ---------------- BALL COUNT (SINGLE SOURCE OF TRUTH) ----------------
    const countsBall = type === "RUN";

    if (type === "WIDE") {
      innings.extras ||= { wides: 0, noBalls: 0 };
      innings.extras.wides += 1;
    }

    if (type === "NO_BALL") {
      innings.extras ||= { wides: 0, noBalls: 0 };
      innings.extras.noBalls += 1;
    }
    if (countsBall) {
      innings.balls++;

      innings.bowlingStats[live.bowler] ||= {
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
      };
      innings.bowlingStats[live.bowler].balls++;

      evaluateMatchState(updated);

      handleOverEnd(updated, live, innings);

      // evaluateMatchState(updated);
    }

    // ---------------- STRIKE ROTATION ----------------
    if (
      (runs % 2 === 1 && type === "RUN") ||
      (type === "WIDE" && runs % 2 == 0 && match.rules?.wide?.extraRun) ||
      (type === "NO_BALL" && runs % 2 == 0 && match.rules?.noBall?.extraRun) ||
      (type === "WIDE" && runs % 2 == 1 && !match.rules?.wide?.extraRun) ||
      (type === "NO_BALL" && runs % 2 == 1 && !match.rules?.noBall?.extraRun)
    ) {
      [live.striker, live.nonStriker] = [live.nonStriker, live.striker];
    }

    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  const invalidOnExtra = ["BOWLED", "LBW", "HIT_WICKET"];

  const isInvalidWicket =
    (extraMode === "NO_BALL" || extraMode === "WIDE") &&
    invalidOnExtra.includes(wicketUI.type);

  const applyRun = (runs) => {
    if (match.status === "COMPLETED") return;
    if (extraMode === "NORMAL") {
      recordBall({ type: "RUN", runs });
      return;
    }

    if (extraMode === "WIDE") {
      const extraRun = match.rules?.wide?.extraRun ? 1 : 0;
      recordBall({ type: "WIDE", runs: runs + extraRun });
      setExtraMode("NORMAL");
      return;
    }

    if (extraMode === "NO_BALL") {
      const extraRun = match.rules?.noBall?.extraRun ? 1 : 0;
      recordBall({ type: "NO_BALL", runs: runs + extraRun });
      setExtraMode("NORMAL");
      return;
    }
  };

  const setExtraModeWithHistory = (mode) => {
    setExtraMode((prev) => (prev === mode ? "NORMAL" : mode));
  };

  const startSecondInnings = () => {
    const updated = deepCopy(match);

    updated.live.inningsIndex = 1;
    updated.live.pendingNextInnings = false;

    updated.innings[1] = {
      battingTeam: match.innings[0].bowlingTeam,
      bowlingTeam: match.innings[0].battingTeam,
      totalRuns: 0,
      balls: 0,
      wickets: 0,
      battingStats: {},
      bowlingStats: {},
      thisOver: [],
      extras: {
        wides: 0,
        noBalls: 0,
      },
    };

    updated.live = {
      ...updated.live,
      striker: null,
      nonStriker: null,
      bowler: null,
      lastOverBowler: null,
      outBatsmen: [],
      history: [],
    };

    saveMatch(updated);
    setMatch(updated);
  };

  const undoLast = () => {
    if (match.status === "COMPLETED") return;
    // console.log("match", match.status);
    if (match.live.pendingNextInnings) return;
    if (!match?.live?.history?.length) return;

    const updated = deepCopy(match);
    const last = updated.live.history.pop();
    if (!last) return;

    const innings = updated.innings[updated.live.inningsIndex];
    const p = last.prevState;

    // -------- RESTORE LIVE STATE --------
    updated.live.striker = p.striker;
    updated.live.nonStriker = p.nonStriker;
    updated.live.bowler = p.bowler;
    updated.live.lastOverBowler =
      p.lastOverBowler ?? updated.live.lastOverBowler;
    updated.live.outBatsmen = [...(p.outBatsmen || [])];

    // -------- RESTORE INNINGS STATE --------
    innings.balls = p.balls;
    innings.totalRuns = p.totalRuns;
    innings.wickets = p.wickets;
    innings.battingStats = deepCopy(p.battingStats);
    innings.bowlingStats = deepCopy(p.bowlingStats);
    innings.thisOver = deepCopy(p.thisOver || []);

    // -------- RESTORE EXTRA MODE --------
    setExtraMode(p.extraMode || "NORMAL");

    // -------- COMMIT --------
    updated.updatedAt = Date.now();
    saveMatch(updated);
    setMatch(updated);
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: 12 }}>
      {/* EDIT MATCH */}
      <EditMatchSheet
        open={editOpen}
        match={match}
        onClose={() => setEditOpen(false)}
        onSave={setMatch}
      />

      {/* HEADER */}
      <div style={headerCard}>
        <div style={headerTop}>
          <span>
            {teams.teamA.name} vs {teams.teamB.name}
          </span>
          <button
            style={editBtn}
            onClick={() => {
              if (match.status === "COMPLETED") {
                recreateMatch();
              } else {
                setEditOpen(true);
              }
            }}
          >
            {match.status === "COMPLETED" ? "↻" : "✎"}
          </button>
        </div>

        <div style={scoreRow}>
          <span style={scoreMain}>
            {innings.battingTeam} {innings.totalRuns}-{innings.wickets}
            <span style={overs}>
              {" "}
              ({formatOvers(innings.balls)}) / {match.totalOvers}
            </span>
          </span>

          <span style={crr}>
            CRR {calcCRR(innings.totalRuns, innings.balls)}
          </span>
        </div>

        <div style={infoRow}>
          {match.status === "COMPLETED" ? (
            <strong>
              {match.result.winner} won by {match.result.margin}{" "}
              {match.result.type === "WICKETS" ? "wickets" : "runs"}
            </strong>
          ) : live.inningsIndex === 0 ? (
            `${match.toss.winner} opted to ${match.toss.decision}`
          ) : (
            `Need ${match.innings[0].totalRuns + 1 - innings.totalRuns} runs`
          )}
        </div>
      </div>
      {/* TABS */}
      <div style={tabs}>
        <button
          style={tab === "live" ? activeTab : tabBtn}
          onClick={() => setTab("live")}
        >
          Live
        </button>

        <button
          style={tab === "scorecard" ? activeTab : tabBtn}
          onClick={() => setTab("scorecard")}
        >
          Scorecard
        </button>
      </div>

      {tab === "scorecard" && <Scorecard match={match} />}

      {tab === "live" && match.status === "COMPLETED" && (
        <CompletedMatchSummary match={match} setTab={setTab} />
      )}

      {match.live.pendingNextInnings && (
        <div style={popup}>
          <div style={popupCard}>
            <h2>Innings Complete</h2>

            <p style={{ marginTop: 8 }}>
              {match.innings[0].battingTeam} scored {match.innings[0].totalRuns}{" "}
              runs
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button style={secondaryBtn} onClick={undoFromInningsPopup}>
                Undo Last Ball
              </button>

              <button style={primaryBtn} onClick={startSecondInnings}>
                Start Second Innings
              </button>
            </div>
          </div>
        </div>
      )}

      {match.status === "COMPLETED" && !match.ui?.matchResultSeen && (
        <div style={popup}>
          <div style={popupCard}>
            <h2>{match.result.winner} Won</h2>

            <p style={{ marginTop: 8 }}>
              by {match.result.margin}{" "}
              {match.result.type === "WICKETS" ? "wickets" : "runs"}
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button style={secondaryBtn} onClick={undoFromMatchPopup}>
                Undo Last Ball
              </button>

              <button style={primaryBtn} onClick={acknowledgeMatchResult}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "live" && match.status === "LIVE" && (
        <>
          <div style={card}>
            <div style={tableHeader}>
              <span>Batter</span>
              <span>R</span>
              <span>B</span>
              <span>4s</span>
              <span>6s</span>
            </div>

            {[live.striker, live.nonStriker].map((name, idx) => (
              <div key={idx} style={row}>
                <span
                  style={selectable(!name)}
                  onClick={() =>
                    !name && setSheet(idx === 0 ? "striker" : "nonStriker")
                  }
                >
                  {name ? `${name}${idx === 0 ? " *" : ""}` : "Select"}
                </span>
                {renderBatStats(innings, name)}
              </div>
            ))}
          </div>

          {/* BOWLER */}
          <div style={card}>
            <div style={tableHeader}>
              <span>Bowler</span>
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
            </div>

            <div style={row}>
              <span
                style={selectable(!live.bowler)}
                onClick={() => !live.bowler && setSheet("bowler")}
              >
                {live.bowler ? `${live.bowler} *` : "Select bowler"}
              </span>
              {renderBowlStats(innings, live.bowler)}
            </div>
          </div>

          {/* {innings.thisOver?.length > 0 && ( */}
          {innings.thisOver.length >= 0 && (
            <div style={overBox}>
              <span>This over:</span>

              <div style={overBalls}>
                {innings.thisOver.map((b, i) => {
                  // calculate batting runs (excluding automatic extra)
                  let batRuns = 0;

                  if (b.type === "WIDE") {
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.wide?.extraRun ? 1 : 0)
                    );
                  }

                  if (b.type === "NO_BALL") {
                    batRuns = Math.max(
                      0,
                      b.runs - (match.rules?.noBall?.extraRun ? 1 : 0)
                    );
                  }

                  return (
                    <span key={i} style={ballChip}>
                      {b.type === "RUN" && b.runs}

                      {b.type === "WIDE" &&
                        (batRuns > 0 ? `${batRuns}Wd` : "Wd")}

                      {b.type === "NO_BALL" &&
                        (batRuns > 0 ? `${batRuns}Nb` : "Nb")}

                      {b.type === "WICKET" && "W"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* )} */}

          <div style={keypad}>
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <button key={r} style={keyBtn} onClick={() => applyRun(r)}>
                {r}
              </button>
            ))}

            <button
              style={extraMode === "WIDE" ? keyWideActive : keyWide}
              onClick={() => setExtraModeWithHistory("WIDE")}
            >
              Wd
            </button>

            <button
              style={extraMode === "NO_BALL" ? keyWideActive : keyWide}
              onClick={() => setExtraModeWithHistory("NO_BALL")}
            >
              Nb
            </button>

            <button
              style={
                !live.striker || !live.nonStriker || !live.bowler
                  ? keyWicketDisabled
                  : keyWicket
              }
              disabled={!live.striker || !live.nonStriker || !live.bowler}
              onClick={() => setWicketUI({ ...wicketUI, open: true })}
            >
              W
            </button>

            <button
              style={live.history.length === 0 ? keyUndoDisabled : keyUndo}
              onClick={undoLast}
              disabled={live.history.length === 0}
            >
              ↺
            </button>
          </div>
        </>
      )}

      {/* BATTERS */}

      {/* SELECTORS */}
      <BottomSheetSelector
        open={sheet === "striker"}
        title="Select Striker"
        items={eligibleBatsmen}
        onSelect={(p) => {
          pushSelectionHistory();
          updateLive({ striker: p });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <BottomSheetSelector
        open={sheet === "nonStriker"}
        title="Select Non-Striker"
        items={eligibleBatsmen}
        onSelect={(p) => {
          pushSelectionHistory();
          updateLive({ nonStriker: p });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <BottomSheetSelector
        open={sheet === "bowler"}
        title="Select Bowler"
        items={bowlingPlayers}
        disabledItems={disabledBowlers}
        onSelect={(p) => {
          pushSelectionHistory();
          updateLive({ bowler: p });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />

      <BottomSheetSelector
        open={wicketUI.open}
        title="Wicket"
        onClose={() => setWicketUI({ open: false })}
      >
        {/* WICKET TYPE */}
        <h4>Wicket Type</h4>
        <div style={grid2}>
          {WICKET_TYPES.map((t) => (
            <button
              key={t}
              style={wicketUI.type === t ? activeBtn : btn}
              onClick={() => setWicketUI({ ...wicketUI, type: t })}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* RUN OUT: WHO IS OUT */}
        {wicketUI.type === "RUN_OUT" && (
          <>
            <h4>Who is out?</h4>
            <div style={grid2}>
              {["STRIKER", "NON_STRIKER"].map((p) => (
                <button
                  key={p}
                  style={wicketUI.outWho === p ? activeBtn : btn}
                  onClick={() => setWicketUI({ ...wicketUI, outWho: p })}
                >
                  {p.replace("_", " ")}
                </button>
              ))}
            </div>
          </>
        )}

        {/* FIELDER / CATCHER */}
        {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) && (
          <>
            <h4>Fielder</h4>
            {bowlingPlayers.map((p) => (
              <div
                key={p}
                style={wicketUI.helper === p ? selectedListItem : listItem}
                onClick={() => setWicketUI({ ...wicketUI, helper: p })}
              >
                {p}
              </div>
            ))}
          </>
        )}

        {/* ERROR */}
        {isInvalidWicket && (
          <p style={{ color: "red" }}>
            This wicket is not allowed on {extraMode}
          </p>
        )}

        {/* ERROR */}
        {isInvalidWicket && (
          <p style={{ color: "red" }}>
            This wicket is not allowed on {extraMode}
          </p>
        )}

        {["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) &&
          !wicketUI.helper && (
            <p style={{ color: "red" }}>Please select a fielder</p>
          )}

        {/* CONFIRM */}
        <button
          style={confirmBtn}
          disabled={
            !wicketUI.type ||
            isInvalidWicket ||
            (["CAUGHT", "RUN_OUT", "STUMPED"].includes(wicketUI.type) &&
              !wicketUI.helper)
          }
          onClick={() => {
            const outBatsman =
              wicketUI.type === "RUN_OUT"
                ? wicketUI.outWho === "NON_STRIKER"
                  ? live.nonStriker
                  : live.striker
                : live.striker;
            // console.log("Wicket", wicketUI);

            applyWicket({
              wicketType: wicketUI.type,
              outBatsman,
              helper: wicketUI.helper,
            });

            setWicketUI({ open: false });
          }}
        >
          Confirm Wicket
        </button>
      </BottomSheetSelector>
    </div>
  );
}

function CompletedMatchSummary({ match, setTab }) {
  const formatOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
  return (
    <>
      {match.innings.map((inn, i) => (
        <div key={i} style={card}>
          <strong>{inn.battingTeam}</strong>
          <div>
            {inn.totalRuns}/{inn.wickets} ({formatOvers(inn.balls)})
          </div>
        </div>
      ))}

      <button style={primaryBtn} onClick={() => setTab("scorecard")}>
        View Full Scorecard
      </button>
    </>
  );
}

/* ---------------- STYLES ---------------- */

const primaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontWeight: 600,
  cursor: "pointer",
};

const keyWide = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#fde68a", // soft yellow (extra)
  color: "#92400e",
  fontSize: 16,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const overBox = {
  padding: 12,
  borderRadius: 10,
  background: "#f3f4f6",
  marginBottom: 12,
};

const overBalls = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 6,
};

const ballChip = {
  minWidth: 28,
  height: 28,
  borderRadius: "50%",
  background: "#4f46e5",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

const popup = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const popupCard = {
  background: "#ffffff",
  padding: "24px 28px",
  borderRadius: 16,
  width: 320,
  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const popupActions = {
  display: "flex",
  gap: 12,
};

const popupUndoBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  cursor: "pointer",
};

const popupPrimaryBtn = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
};

const keyBtn = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#eef2ff",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const keyWicket = {
  ...keyBtn,
  background: "#fecaca", // red
  color: "#7f1d1d",
  fontSize: 20,
};

const keyWicketDisabled = {
  ...keyWicket,
  opacity: 0.5,
  cursor: "not-allowed",
};

const keyWideActive = {
  ...keyWide,
  outline: "2px solid #f59e0b",
};

const keypad = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
  marginTop: 16,
};

const keyWideDisabled = {
  ...keyWide,
  opacity: 0.5,
  cursor: "not-allowed",
};

const keyUndo = {
  padding: "14px 0",
  borderRadius: 12,
  background: "#e5e7eb", // neutral gray
  color: "#374151",
  fontSize: 18,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  touchAction: "manipulation",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12,
};

const btn = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const activeBtn = {
  ...btn,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
};

const listItem = {
  padding: "10px",
  borderBottom: "1px solid #e5e7eb",
  cursor: "pointer",
};

const selectedListItem = {
  ...listItem,
  background: "#4f46e5",
  color: "#fff",
};

const confirmBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  marginTop: 12,
};

const keyUndoActive = {
  ...keyUndo,
  background: "#d1d5db",
};

const keyUndoDisabled = {
  ...keyUndo,
  opacity: 0.5,
  cursor: "not-allowed",
};

const scoreBtn = {
  padding: "16px 0",
  borderRadius: 12,
  background: "#eef2ff",
  border: "none",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const scoreBtnDisabled = {
  ...scoreBtn,
  opacity: 0.4,
  cursor: "not-allowed",
};

const scoreRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

const crr = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1e40af",
};

const infoRow = {
  fontSize: 12,
  textAlign: "center",
  color: "#6b7280",
  marginTop: 4,
};

const tabs = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

const tabBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const activeTab = {
  ...tabBtn,
  background: "#4f46e5",
  color: "#fff",
};

const headerCard = {
  background: "#eef2ff",
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
};

const headerTop = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 600,
};

const editBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#4f46e5",
};

const scoreMain = {
  fontSize: 20,
  fontWeight: 700,
  marginTop: 6,
};

const overs = {
  fontSize: 14,
  color: "#6b7280",
};

const card = {
  background: "#f9fafb",
  padding: 12,
  borderRadius: 12,
  marginBottom: 16,
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  fontSize: 13,
  color: "#6b7280",
};

const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(4,1fr)",
  padding: "6px 0",
};
