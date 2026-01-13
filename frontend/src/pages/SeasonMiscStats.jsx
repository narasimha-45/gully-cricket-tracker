import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function SeasonMiscStats() {
  const { seasonId } = useParams();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API}/api/stats/season/${seasonId}/misc`
        );
        const json = await res.json();
        setPlayers(json.data || []);
      } catch (e) {
        console.error("Failed to load misc stats", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [seasonId]);

  if (loading) {
    return <p style={{ color: "#6b7280" }}>Loading misc stats…</p>;
  }

  return (
    <div>
      {/* HEADER */}
      <div style={tableHeader}>
        <span>Player</span>
        <span>Catches</span>
        <span>Run Outs</span>
        <span>MoMs</span>
      </div>

      {/* ROWS */}
      {players.map((p) => (
        <div key={p._id} style={row}>
          <span style={{ fontWeight: 600 }}>{p.name}</span>
          <span>{p.misc?.catches || 0}</span>
          <span>{p.misc?.runOuts || 0}</span>
          <span>{p.misc?.mom || 0}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const tableHeader = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(3,1fr)",
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 6,
};

const row = {
  display: "grid",
  gridTemplateColumns: "2fr repeat(3,1fr)",
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
};
