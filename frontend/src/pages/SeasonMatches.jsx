import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function SeasonMatches() {
  const { seasonId } = useParams();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(`/api/matches/season/${seasonId}`);
        const json = await res.json();
        setMatches(json.data || []);
      } catch (err) {
        console.error("Failed to fetch matches", err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [seasonId]);

  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading matches...</p>;
  }

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      {matches.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No matches yet in this season</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {matches.map((match) => {
            const firstInnings = match.innings?.[0];
            const secondInnings = match.innings?.[1];

            return (
              <div
                key={match._id}
                onClick={() =>
                  navigate(`/season/${seasonId}/match/${match._id}`)
                }
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {/* Date & Time */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  <span>
                    {formatDate(match.completedAt || match.createdAt)}
                  </span>
                  <span>
                    {formatTime(match.completedAt || match.createdAt)}
                  </span>
                </div>

                {/* Teams */}
                <div style={{ fontWeight: 600 }}>
                  {match.teams?.teamA?.name} vs {match.teams?.teamB?.name}
                </div>

                {/* Scores */}
                {firstInnings && secondInnings && (
                  <div style={{ fontSize: 14, marginTop: 4 }}>
                    {firstInnings.battingTeam} {firstInnings.totalRuns}/
                    {firstInnings.wickets}
                    {"  |  "}
                    {secondInnings.battingTeam} {secondInnings.totalRuns}/
                    {secondInnings.wickets}
                  </div>
                )}

                {/* Overs */}
                {match.matchType === "OVERS" && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {match.totalOvers} overs
                  </div>
                )}

                {/* Result */}
                {match.result && (
                  <div
                    style={{
                      fontSize: 13,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {match.result.winner} won by {match.result.margin}{" "}
                    {match.result.type === "RUNS" ? "runs" : "wickets"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
