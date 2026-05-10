// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
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

// Auth
import { getCurrentUser } from "../services/authService";

const PESO = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

// Tooltips
const CustomSalesTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: 0, color: payload[0].color }}>Sales: {PESO(payload[0].value).replace("PHP", "₱")}</p>
      </div>
    );
  }
  return null;
};

const CustomOrdersTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ backgroundColor: '#fff', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: 0, color: payload[0].color }}>Orders: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Time & History Ranges
  const [onlineRange, setOnlineRange] = useState("Week");
  const [itemRange, setItemRange] = useState("Day"); 
  const [historyPeriod, setHistoryPeriod] = useState("Current"); // "Current", "Previous", "Custom"
  
  // Custom Date Range State
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  // Item Filters
  const [category, setCategory] = useState("All");
  const [subFilter, setSubFilter] = useState("All"); // All, Hot, Iced, Seasonal

  // Data States
  const [summary, setSummary] = useState({ todaysSales: 0, totalOrders: 0 });
  const [onlineData, setOnlineData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [categoryItems, setCategoryItems] = useState({});
  const [lineKeys, setLineKeys] = useState({});

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    async function fetchMenu() {
      const items = await getCategoryItems();
      const lines = await getLineKeys();
      setCategoryItems(items);
      setLineKeys(lines);
    }
    fetchMenu();
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Helper to prevent fetching if custom dates are incomplete
  const isCustomReady = historyPeriod !== "Custom" || (customDates.start && customDates.end);

  // Fetch Summary
  useEffect(() => {
    async function fetchSummary() {
      if (!isCustomReady) return;
      const s = await getDashboardSummary(historyPeriod, customDates);
      setSummary(s);
    }
    fetchSummary();
  }, [historyPeriod, customDates]);

  // Fetch Online Data
  useEffect(() => {
    async function fetchOnline() {
      if (!isCustomReady) return;
      const data = await getOnlineSalesData(onlineRange, historyPeriod, customDates);
      setOnlineData(data);
    }
    fetchOnline();
  }, [onlineRange, historyPeriod, customDates]);

  // Fetch Item Performance
  useEffect(() => {
    async function fetchPerformance() {
      if (!isCustomReady) return;
      const data = await getItemPerformanceData(itemRange, historyPeriod, customDates);
      setPerformanceData(data);
    }
    fetchPerformance();
  }, [itemRange, historyPeriod, customDates]);

  // 🚀 CRITICAL UI SPEED FIX: Optimized Filter Logic
  const activeVisibleLines = useMemo(() => {
    const rawVisible = (category === "All"
      ? Object.keys(lineKeys)
      : (categoryItems[category] || []).map(name => name.toLowerCase().replace(/\s+/g, "_"))
    ).filter(k => {
      if (subFilter === "All") return true;
      if (subFilter === "Hot") return k.includes("hot");
      if (subFilter === "Iced") return k.includes("iced") || k.includes("cold");
      if (subFilter === "Seasonal") return k.includes("seasonal");
      return true;
    });

    // Only send lines to Recharts if they actually have > 0 sales during this timeframe!
    return rawVisible.filter(key => {
      return performanceData.some(dataPoint => dataPoint[key] > 0);
    });
  }, [category, categoryItems, lineKeys, subFilter, performanceData]);

  const handlePrint = () => {
    window.print();
  };

  // Dynamic Card Title
  const getCardTitle = (base) => {
    if (historyPeriod === "Current") return `TODAY'S ${base}:`;
    if (historyPeriod === "Previous") return `PREVIOUS ${base}:`;
    if (historyPeriod === "Custom") return `CUSTOM RANGE ${base}:`;
  };

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="ad-main">
        <div className="ad-pageHeader">
          <h1 className="ad-pageTitle">Dashboard</h1>
          
          <div className="ad-headerControls">
            {/* History Selector */}
            <select 
              className="ad-historySelect"
              value={historyPeriod} 
              onChange={(e) => setHistoryPeriod(e.target.value)}
            >
              <option value="Current">Current Period</option>
              <option value="Previous">Previous Period (Quick)</option>
              <option value="Custom">Custom Date Range</option>
            </select>
            
            {/* Custom Date Pickers */}
            {historyPeriod === "Custom" && (
              <div className="ad-dateWrapper">
                <input 
                  type="date" 
                  className="ad-datePicker"
                  value={customDates.start}
                  onChange={(e) => setCustomDates(prev => ({...prev, start: e.target.value}))}
                />
                <span style={{color: '#666'}}>to</span>
                <input 
                  type="date" 
                  className="ad-datePicker"
                  value={customDates.end}
                  onChange={(e) => setCustomDates(prev => ({...prev, end: e.target.value}))}
                />
              </div>
            )}
            
            <button className="ad-printBtn" onClick={handlePrint}>
              🖨️ Print Report
            </button>
          </div>
        </div>

        <section className="ad-cards">
          <div className="ad-card">
            <div className="ad-cardLabel">{getCardTitle("SALES")}</div>
            <div className="ad-cardValue">
              {PESO(summary.todaysSales).replace("PHP", "₱")}
            </div>
          </div>

          <div className="ad-card">
            <div className="ad-cardLabel">{getCardTitle("ORDERS")}</div>
            <div className="ad-cardValue">{summary.totalOrders}</div>
          </div>
        </section>

        {/* Separated Sales and Orders Graphs */}
        <div className="ad-graphGrid">
          <section className="ad-panel">
            <div className="ad-panelHeader">
              <h2 className="ad-panelTitle">Sales Revenue</h2>
              {/* Hide tabs if Custom Range is driving the graph logic */}
              {historyPeriod !== "Custom" && (
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
              )}
            </div>

            <div className="ad-chartBox">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={onlineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={<CustomSalesTooltip />} />
                  <Bar dataKey="sales" fill="#2b8a3e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="ad-panel">
            <div className="ad-panelHeader">
              <h2 className="ad-panelTitle">Orders Volume</h2>
            </div>
            <div className="ad-chartBox">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={onlineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip content={<CustomOrdersTooltip />} />
                  <Line type="monotone" dataKey="orders" stroke="#f08a2b" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="ad-panel">
          <div className="ad-panelHeader">
            <h2 className="ad-panelTitle">Item Sales Performance</h2>
            {historyPeriod !== "Custom" && (
              <div className="ad-tabs">
                {["Day", "Week", "Month", "Year"].map(t => (
                  <button
                    key={t}
                    className={`ad-tab ${itemRange === t ? "is-active" : ""}`}
                    onClick={() => setItemRange(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
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

          {/* Sub-filters for Hot/Iced/Seasonal */}
          <div className="ad-subFilters">
            <span>Filter By: </span>
            {["All", "Hot", "Iced", "Seasonal"].map(sf => (
              <button
                key={sf}
                className={`ad-subPill ${subFilter === sf ? "is-active" : ""}`}
                onClick={() => setSubFilter(sf)}
              >
                {sf}
              </button>
            ))}
          </div>

          <div className="ad-chartBox">
            <div style={{ height: "400px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 20 }}>
                  <CartesianGrid stroke="#e6e6e6" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />

                  {/* Render using the optimized activeVisibleLines */}
                  {activeVisibleLines.map(k => (
                    <Bar
                      key={k}
                      dataKey={k}
                      name={lineKeys[k]?.label || k}
                      fill={lineKeys[k]?.color || "#000"}
                      radius={[4, 4, 0, 0]}
                    >
                      {/* CRITICAL UI SPEED FIX: Disable text labels if there are too many items */}
                      {activeVisibleLines.length <= 15 && (
                        <LabelList dataKey={k} position="top" style={{ fontSize: '12px', fill: '#555' }} />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="ad-legend-wrapper">
              <div className="ad-legend-list">
                {activeVisibleLines.map(k => (
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

            {activeVisibleLines.length === 0 && (
              <div className="ad-emptyHint">
                No items match the current filters.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}