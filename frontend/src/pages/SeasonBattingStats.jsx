import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonBattingStats() {
  const { seasonId } = useParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`/api/stats/season/${seasonId}/batting`);
        const json = await res.json();
        setPlayers(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [seasonId]);

  if (loading) {
    return (
      <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>
        Loading batting stats…
      </p>
    );
  }

  return (
    <div style={page}>
      {/* HEADER */}
      <div style={{ ...rowBase, ...headerRow }}>
        <span style={playerHeader}>Player</span>
        <span style={center}>I</span>
        <span style={center}>R</span>
        <span style={center}>B</span>
        <span style={center}>4s</span>
        <span style={center}>6s</span>
        <span style={center}>D</span>
      </div>

      {/* ROWS */}
      {players.map((p) => (
        <div key={p._id} style={{ ...rowBase, ...dataRow }}>
          <span style={playerCell}>{p.name}</span>
          <span style={center}>{p.innings}</span>
          <span style={runs}>{p.runs}</span>
          <span style={center}>{p.balls}</span>
          <span style={center}>{p.fours}</span>
          <span style={center}>{p.sixes}</span>
          <span style={center}>{p.ducks}</span>
        </div>
      ))}

      {players.length === 0 && (
        <p style={emptyText}>No batting data available</p>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  padding: 12,
};

/* SHARED GRID (CRITICAL) */
const rowBase = {
  display: "grid",
  gridTemplateColumns: "2.6fr repeat(6, 1fr)",
  alignItems: "center",
  padding: "10px 12px",
};

/* HEADER */
const headerRow = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: 8,
};

/* DATA ROW */
const dataRow = {
  background: "#ffffff",
  borderRadius: 14,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  fontSize: 14,
};

/* CELLS */
const playerHeader = {
  textAlign: "left",
};

const playerCell = {
  fontWeight: 700,
  color: "#111827",
  textAlign: "left",
};

const center = {
  textAlign: "center",
  fontWeight: 600,
  color: "#374151",
};

const runs = {
  textAlign: "center",
  fontWeight: 800,
  color: "#4f46e5",
};

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  marginTop: 40,
};
