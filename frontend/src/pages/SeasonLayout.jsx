import { NavLink, Outlet, useNavigate } from "react-router-dom";
import styles from "./SeasonLayout.module.css";

export default function SeasonLayout() {
  const navigate = useNavigate();

  // later fetch from backend
  const seasonName = "Sankranthi 2025";

  return (
    <div>
      {/* Sub header */}
      <div className={styles.subHeader}>
        <button
          className={styles.back}
          onClick={() => navigate("/")}
          aria-label="Back"
        >
          ←
        </button>

        <div className={styles.seasonName}>{seasonName}</div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <NavLink
          to="matches"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Matches
        </NavLink>

        <NavLink
          to="stats"
          className={({ isActive }) =>
            isActive ? styles.activeTab : styles.tab
          }
        >
          Stats
        </NavLink>
      </div>

      {/* Page content */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
