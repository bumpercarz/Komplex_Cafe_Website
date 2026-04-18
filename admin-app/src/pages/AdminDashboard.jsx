// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../css/AdminDashboard.css";

import {
  getDashboardSummary,
  getOnlineSalesData,
  getItemPerformanceData,
  getCategoryItems,
  getLineKeys
} from "../services/adminDashboardData";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import { useNotificationSound } from "../hooks/useNotificationSound";

// NEW: import current user auth
import { getCurrentUser } from "../services/authService";

const PESO = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const CustomOnlineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: 0 }}>Orders: {data.orders}</p>
        <p style={{ margin: 0 }}>Sales: {PESO(data.sales).replace("PHP", "₱")}</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  // NEW: current user state
  const [currentUser, setCurrentUser] = useState(null);

  const [onlineRange, setOnlineRange] = useState("Week");
  const [itemRange, setItemRange] = useState("Week");
  const [category, setCategory] = useState("All");

  const [summary, setSummary] = useState({ todaysSales: 0, totalOrders: 0 });
  const [onlineData, setOnlineData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [categoryItems, setCategoryItems] = useState({});
  const [lineKeys, setLineKeys] = useState({});

  // NEW: load current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // CHANGED: dynamic role instead of hardcoded ADMIN
  const role = currentUser?.role || "STAFF";
  const roleLabel =
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  useEffect(() => {
    async function fetchMenu() {
      const items = await getCategoryItems();
      const lines = await getLineKeys();
      setCategoryItems(items);
      setLineKeys(lines);
    }
    fetchMenu();
  }, []);

  useEffect(() => {
    async function fetchSummary() {
      const s = await getDashboardSummary();
      setSummary(s);
    }
    fetchSummary();
  }, []);

  useEffect(() => {
    async function fetchOnline() {
      const data = await getOnlineSalesData(onlineRange);
      setOnlineData(data);
    }
    fetchOnline();
  }, [onlineRange]);

  useEffect(() => {
    async function fetchPerformance() {
      const data = await getItemPerformanceData(itemRange);
      setPerformanceData(data);
    }
    fetchPerformance();
  }, [itemRange]);

  const visibleLines = category === "All"
    ? Object.keys(lineKeys)
    : (categoryItems[category] || []).map(name => name.toLowerCase().replace(/\s+/g, "_"));

  return (
    <div className="ad-root">

      {/* CHANGED: dynamic roleLabel instead of "ADMIN" */}
      <AdminTopbar
        roleLabel={roleLabel}
        onMenuClick={() => setMenuOpen(true)}
      />

      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="ad-main">
        <h1 className="ad-pageTitle">Dashboard</h1>

        <section className="ad-cards">
          <div className="ad-card">
            <div className="ad-cardLabel">TODAY&apos;S SALES:</div>
            <div className="ad-cardValue">
              {PESO(summary.todaysSales).replace("PHP", "₱")}
            </div>
          </div>

          <div className="ad-card">
            <div className="ad-cardLabel">TOTAL ORDERS:</div>
            <div className="ad-cardValue">{summary.totalOrders}</div>
          </div>
        </section>

        <section className="ad-panel">
          <div className="ad-panelHeader">
            <h2 className="ad-panelTitle">Online Sales Graph</h2>
            <div className="ad-tabs">
              {["Hour", "Week", "Month", "Year"].map(t => (
                <button
                  key={t}
                  className={`ad-tab ${onlineRange === t ? "is-active" : ""}`}
                  onClick={() => setOnlineRange(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="ad-chartBox">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={onlineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip content={<CustomOnlineTooltip />} />
                <Bar dataKey="orders" fill="#f08a2b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ad-panel">
          <div className="ad-panelHeader">
            <h2 className="ad-panelTitle">Item Sales Performance</h2>
            <div className="ad-tabs">
              {["Week", "Month", "Year"].map(t => (
                <button
                  key={t}
                  className={`ad-tab ${itemRange === t ? "is-active" : ""}`}
                  onClick={() => setItemRange(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="ad-pills">
            {Object.keys(categoryItems).map(c => (
              <button
                key={c}
                className={`ad-pill ${category === c ? "is-active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="ad-chartBox">
            <div style={{ height: "340px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid stroke="#e6e6e6" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />

                  {visibleLines.map(k => (
                    <Line
                      key={k}
                      type="linear"
                      dataKey={k}
                      name={lineKeys[k]?.label || k}
                      stroke={lineKeys[k]?.color || "#000"}
                      strokeWidth={3}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="ad-legend-wrapper">
              <div className="ad-legend-list">
                {visibleLines.map(k => (
                  <div key={k} className="ad-legend-item">
                    <span
                      className="ad-legend-color"
                      style={{ backgroundColor: lineKeys[k]?.color || "#000" }}
                    />
                    <span className="ad-legend-text">
                      {lineKeys[k]?.label || k}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {visibleLines.length === 0 && (
              <div className="ad-emptyHint">
                No items configured for <b>{category}</b> yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}