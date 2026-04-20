import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/AdminTopbar.css";

import komplexLogo from "../assets/komplexLogoPlain.png";

export default function StaffTopbar({ roleLabel = "STAFF" }) {
  const navigate = useNavigate();

  return (
    <header className="ad-topbar no-menu">
      <div className="ad-spacer" />

      <div className="ad-rightGroup">
        <div className="ad-brand">
          <div className="ad-brandTitle">Komplex Cafe</div>
          <div className="ad-brandSub">{roleLabel}</div>
        </div>

        <button
          type="button"
          className="ad-avatarBtn"
          aria-label="Profile"
          onClick={() => navigate("/staff/profile")}
        >
          <img src={komplexLogo} alt="Profile" className="ad-avatar" />
        </button>
      </div>
    </header>
  );
}