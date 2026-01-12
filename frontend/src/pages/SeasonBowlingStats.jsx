import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonBowlingStats() {
  const { seasonId } = useParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(`${API}/api/stats/season/${seasonId}/bowling`);
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
        Loading bowling stats…
      </p>
    );
  }

  return (
    <div style={page}>
      {/* HEADER */}
      <div style={{ ...rowBase, ...headerRow }}>
        <span style={playerHeader}>Player</span>
        <span style={center}>I</span>
        <span style={center}>W</span>
        <span style={center}>R</span>
        <span style={center}>B</span>
      </div>

      {/* ROWS */}
      {players.map((p) => (
        <div key={p._id} style={{ ...rowBase, ...dataRow }}>
          <span style={playerCell}>{p.name}</span>
          <span style={center}>{p.innings}</span>
          <span style={wickets}>{p.wickets}</span>
          <span style={center}>{p.runs}</span>
          <span style={center}>{p.balls}</span>
        </div>
      ))}

      {players.length === 0 && (
        <p style={emptyText}>No bowling data available</p>
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
  gridTemplateColumns: "2.6fr repeat(4, 1fr)",
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

const wickets = {
  textAlign: "center",
  fontWeight: 800,
  color: "#dc2626", // red for wickets
};

const emptyText = {
  textAlign: "center",
  color: "#6b7280",
  marginTop: 40,
};
