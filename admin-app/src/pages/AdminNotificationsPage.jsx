import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminNotificationsPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";

import { getCurrentUser } from "../services/authService";
import { FaTrash } from "react-icons/fa";

import {
  subscribeToNotifications,
  markNotificationAsRead,
  deleteNotificationById,
} from "../services/adminNotificationData";

// ─── Modal ────────────────────────────────────────────────────────────────────
function NotificationModal({ notification, onClose }) {
  if (!notification) return null;

  return (
    <div className="an-modalBackdrop" onClick={onClose}>
      <div className="an-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="an-modalClose"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="an-modalTitle">Notification Details</div>

        <div className="an-modalBody">
          <div className="an-modalTop">
            <div className={`an-modalAvatar ${notification.isRead ? "is-read" : ""}`} style={{ overflow: "hidden", position: "relative" }}>
              <img 
                src={notification.picture} 
                alt="Notification Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div className="an-modalMeta">
              <div className="an-modalTime">{notification.timeLabel}</div>
              <div className="an-modalType">{notification.typeLabel}</div>
              {notification.actor && notification.actor !== "System" && (
                <div className="an-modalActor">Actor: {notification.actor}</div>
              )}
            </div>
          </div>

          <h3 className="an-modalHeadline">{notification.title}</h3>
          <p className="an-modalMessage">{notification.message}</p>

          {notification.details && notification.details.length > 0 && (
            <div className="an-modalExtra">
              {notification.details.map((row, i) => (
                <div className="an-modalRow" key={i}>
                  <span>{row.label}:</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="an-modalFooter">
          <button className="an-modalBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  
  // Custom Date Range State
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Load real-time notifications
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      (data) => {
        setNotifications(data);
        setLoading(false);
      },
      (error) => {
        console.error("Notifs error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Filter & Limit Logic
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    const isCustomDateActive = customDates.start || customDates.end;

    // NEW: Firebase dates can be tricky. This helper safely extracts the exact Date object
    // whether your field is called 'n_timestamp' or 'timestamp', and whether it's a raw Firestore Timestamp or a JS Date.
    const getSafeDate = (n) => {
      if (n.n_timestamp?.toDate) return n.n_timestamp.toDate();
      if (n.timestamp?.toDate) return n.timestamp.toDate();
      if (n.n_timestamp instanceof Date) return n.n_timestamp;
      if (n.timestamp instanceof Date) return n.timestamp;
      return null;
    };

    // Filter by Custom Date Range
    if (customDates.start) {
      const startDate = new Date(`${customDates.start}T00:00:00`);
      result = result.filter(n => {
        const d = getSafeDate(n);
        return d && d >= startDate;
      });
    }
    
    if (customDates.end) {
      const endDate = new Date(`${customDates.end}T23:59:59`);
      result = result.filter(n => {
        const d = getSafeDate(n);
        return d && d <= endDate;
      });
    }

    // Filter by Search Query
    const keyword = search.toLowerCase();
    if (keyword) {
      result = result.filter((n) =>
        Object.values(n).join(" ").toLowerCase().includes(keyword)
      );
    }

    // Limit to 100 records if no custom date range is applied
    if (!isCustomDateActive) {
      result = result.slice(0, 100);
    }

    return result;
  }, [notifications, search, customDates]);

  const selectedNotification = useMemo(
    () => notifications.find((n) => n.id === selectedNotificationId) || null,
    [notifications, selectedNotificationId]
  );

  async function handleView(notif) {
    setSelectedNotificationId(notif.id);
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;
    await deleteNotificationById(id);
  }

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="an-main">
        <AdminPageToolbar
          title="Notifications"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search notifications..."
        />

        {/* Custom Calendar Date Filter */}
        <div className="an-dateFilterWrapper">
          <label>Filter by Date: </label>
          <input
            type="date"
            className="an-dateInput"
            value={customDates.start}
            onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
          />
          <span>to</span>
          <input
            type="date"
            className="an-dateInput"
            value={customDates.end}
            onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
          />
          <button
            className="an-clearDateBtn"
            onClick={() => setCustomDates({ start: "", end: "" })}
          >
            Clear Range
          </button>
          
          {/* Helper text showing if the limit is currently active */}
          {!customDates.start && !customDates.end && (
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "#666" }}>
              Showing latest 100 records. Select a date range to view older data.
            </span>
          )}
        </div>

        {loading ? (
          <div className="an-empty">Loading notifications...</div>
        ) : (
          <div className="an-list">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`an-card ${notification.isRead ? "is-read" : ""}`}
              >
                <div className="an-cardLeft">
                  <div className="an-avatar">
                    <img 
                      src={notification.picture} 
                      alt="Avatar" 
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>

                  <div className="an-info">
                    <div className="an-meta">
                      <span className="an-typeBadge">
                        {notification.typeLabel}
                      </span>
                      {notification.actor && notification.actor !== "System" && (
                        <span className="an-actor">by {notification.actor}</span>
                      )}
                    </div>
                    <h2 className="an-headline">{notification.title}</h2>
                    <p className="an-time">{notification.timeLabel}</p>
                  </div>
                </div>

                <div className="an-actions">
                  <button
                    type="button"
                    className="an-viewBtn"
                    onClick={() => handleView(notification)}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    className="an-deleteBtn"
                    onClick={() => handleDelete(notification.id)}
                    aria-label={`Delete ${notification.title}`}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="an-empty">No notifications found.</div>
            )}
          </div>
        )}
      </main>

      <NotificationModal
        notification={selectedNotification}
        onClose={() => setSelectedNotificationId(null)}
      />
    </div>
  );
}