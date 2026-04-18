import React, { useState, useEffect } from "react";
import OrderDetails from "./OrderDetails";
import { formatDate, formatTime } from "../../services/adminOrderData";

// --- NEW LIVE STOPWATCH COMPONENT ---
function OrderStopwatch({ status, preparingAt, completedAt }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    // If it hasn't started preparing yet, do nothing
    if (!preparingAt) return;

    const interval = setInterval(() => {
      // If completed, lock the end time. Otherwise, keep ticking with the current time.
      const endTime = completedAt ? completedAt : new Date();
      const startTime = preparingAt;
      
      const diffMs = Math.max(0, endTime - startTime);
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      setElapsed(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    }, 1000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(interval);
  }, [preparingAt, completedAt, status]);

  if (!preparingAt) return null;

  return (
    <div className="ao-time" style={{ color: status === "COMPLETED" ? "#2e7d32" : "#df4735", fontWeight: "bold" }}>
      <span className="ao-clock">⏱️</span>
      <span className="ao-timeLabel">{status === "COMPLETED" ? "Prep Time:" : "Live Timer:"}</span>
      <span>{elapsed}</span>
    </div>
  );
}
// -------------------------------------

export default function OrderCard({
  order,
  isOpen,
  onToggle,
  status,
  activeTab,
  statusOptions,
  onStatusChange,
}) {
  return (
    <section className="ao-card">
      {/* Orange header strip */}
      <button type="button" className="ao-cardTop" onClick={onToggle}>
        <div className="ao-cardTopLeft">
          <div className="ao-orderId">ORDER ID: {order.id}</div>

          <div className="ao-row">
            <span className="ao-label">TABLE ID:</span>
            {/* Added fallback for null tables and multiple property names */}
            <span className="ao-value">
              {order.tableId || order.tableNumber || order.table_id || "N/A"}
            </span>
          </div>

          <div className="ao-row">
            <span className="ao-label">ORDER STATUS:</span>
            <span className="ao-value">{status}</span>
          </div>
        </div>

        <div className="ao-cardTopRight">
          {/* Grouped Time Section */}
          <div className="ao-timeGroup">
            
            {/* Live Stopwatch component added here */}
            <OrderStopwatch 
              status={status} 
              preparingAt={order.preparingAt} 
              completedAt={order.completedAt} 
            />

            {/* Created At */}
            <div className="ao-time">
              <span className="ao-clock">🕘</span>
              <span className="ao-timeLabel">Created:</span>
              <span>{formatTime(order.createdAt)}</span>
              <span className="ao-date">{formatDate(order.createdAt)}</span>
            </div>

            {/* Preparing At (Only shows if it exists in Firebase) */}
            {order.preparingAt && (
              <div className="ao-time">
                <span className="ao-clock">🍳</span>
                <span className="ao-timeLabel">Started:</span>
                <span>{formatTime(order.preparingAt)}</span>
                <span className="ao-date">{formatDate(order.preparingAt)}</span>
              </div>
            )}

            {/* Completed At (Only shows if it exists in Firebase) */}
            {order.completedAt && (
              <div className="ao-time">
                <span className="ao-clock">✅</span>
                <span className="ao-timeLabel">Finished:</span>
                <span>{formatTime(order.completedAt)}</span>
                <span className="ao-date">{formatDate(order.completedAt)}</span>
              </div>
            )}
          </div>

          <div className="ao-chevron"> 
            <span>{isOpen ? "Click Box to view order details" : "Click Box to close order details"}</span>
          </div>
          <div className="ao-chevron2"> 
            <span>{isOpen ? "˄" : "˅"}</span>
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <OrderDetails
          order={order}
          status={status}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
        />
      )}
    </section>
  );
}