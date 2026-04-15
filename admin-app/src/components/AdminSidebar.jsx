import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../css/AdminSidebar.css";

const NAV_ITEMS = [
  { label: "DASHBOARD", to: "/admin" },
  { label: "MENU", to: "/admin/menu" },
  { label: "ORDERS", to: "/admin/orders" },
  { label: "USERS", to: "/admin/users" },
  { label: "PAYMENTS", to: "/admin/payments" },
  { label: "TABLES & QRs", to: "/admin/tables" },
  { label: "NOTIFICATIONS", to: "/admin/notifications" },
];

export default function AdminSidebar({ open, onClose }) {
  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className={`as-backdrop ${open ? "is-open" : ""}`}
        aria-label="Close menu"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside className={`as-panel ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav className="as-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `as-link ${isActive ? "is-active" : ""}`
              }
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}