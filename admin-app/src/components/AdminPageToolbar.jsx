import React from "react";
import "../css/AdminPageToolbar.css";

export default function AdminPageToolbar({
  title,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
  addLabel,
  onAdd,
  children,
  showSearch = true,
}) {
  return (
    <div className="apt-row">
      <h1 className="apt-title">{title}</h1>

      <div className="apt-actions">
        {showSearch && (
          <div className="apt-search">
            <span className="apt-searchIcon">⌕</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        )}

        {children}

        {addLabel && (
          <button type="button" className="apt-addBtn" onClick={onAdd}>
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}