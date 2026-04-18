import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminNotificationsPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";

// NEW: import current user auth
import { getCurrentUser } from "../services/authService";

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
            <div className={`an-modalAvatar ${notification.isRead ? "is-read" : ""}`}>
              <span className="an-modalAvatarIcon">{notification.typeIcon}</span>
            </div>
            <div>
              <span className="an-typeBadge">{notification.typeLabel}</span>
              <h2 className="an-modalHeadline">{notification.title}</h2>
              <p className="an-modalTime">
                {notification.timeLabel}
                {notification.actor && notification.actor !== "System"
                  ? ` · by ${notification.actor}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="an-modalSection">
            <h3>Message</h3>
            <p>{notification.description}</p>
          </div>

          {notification.details?.length > 0 && (
            <div className="an-modalSection">
              <h3>Details</h3>
              <div className="an-detailList">
                {notification.details.map((detail, index) => (
                  <div className="an-detailRow" key={`${detail.label}-${index}`}>
                    <span>{detail.label}</span>
                    <strong>{detail.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="an-modalActions">
            <button type="button" className="an-closeBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW: current user state
  const [currentUser, setCurrentUser] = useState(null);

  // NEW: load current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // CHANGED: dynamic role instead of hardcoded ADMIN
  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Real-time subscription — replaces the old getDocs + reloadNotifications pattern
  useEffect(() => {
    const unsub = subscribeToNotifications(
      (data) => {
        setNotifications(data);
        setLoading(false);
        setError("");
      },
      (err) => {
        setError(err?.message || "Failed to load notifications.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const selectedNotification = useMemo(
    () => notifications.find((n) => n.id === selectedNotificationId) ?? null,
    [notifications, selectedNotificationId]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  async function handleView(notification) {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
      // No need to reload — onSnapshot updates state automatically
    }
    setSelectedNotificationId(notification.id);
  }

  async function handleDelete(notificationId) {
    if (selectedNotificationId === notificationId) {
      setSelectedNotificationId(null);
    }
    await deleteNotificationById(notificationId);
    // onSnapshot will update the list automatically
  }
  
  useNotificationSound();
  
  return (
    <div className="ad-root">
      {/* CHANGED: dynamic roleLabel */}
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="an-main">
        <AdminPageToolbar
          title={
            unreadCount > 0
              ? `Notification List (${unreadCount} unread)`
              : "Notification List"
          }
          showSearch={false}
        />

        {error   ? <div className="an-empty an-error">{error}</div> : null}
        {loading ? <div className="an-empty">Loading notifications…</div> : null}

        {!loading && (
          <div className="an-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`an-card ${notification.isRead ? "is-read" : ""}`}
              >
                <div className="an-cardLeft">
                  {/* Type icon replaces the plain avatar dot */}
                  <div className={`an-avatar ${notification.isRead ? "is-read" : ""}`}>
                    <span className="an-avatarIcon">{notification.typeIcon}</span>
                  </div>

                  <div className="an-content">
                    <div className="an-cardMeta">
                      <span className="an-typeBadge an-typeBadge--sm">
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
                    🗑
                  </button>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="an-empty">No notifications yet.</div>
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