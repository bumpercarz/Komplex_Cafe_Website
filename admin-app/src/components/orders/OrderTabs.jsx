import React from "react";

export default function OrderTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="ao-tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`ao-tab ${activeTab === t.key ? "is-active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}