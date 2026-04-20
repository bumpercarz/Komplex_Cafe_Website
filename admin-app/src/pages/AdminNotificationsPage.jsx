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
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
              <span className="an-modalAvatarIcon" style={{ position: "absolute", top: -5, left: -5 }}>
                {notification.typeIcon}
              </span>
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
  const [menuOpen, setMenuOpen]                     = useState(false);
  const [notifications, setNotifications]           = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading]                       = useState(true);
  const [error, setError]                           = useState("");
  const [currentUser, setCurrentUser]               = useState(null);

  // ── Load current user ──────────────────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role      = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // ── Audio unlock on first tap ──────────────────────────────────────────────
  //
  // Mobile browsers (Android, iOS) require a user gesture before AudioContext
  // can play sound. We listen for the first tap anywhere on this page and
  // create/resume the AudioContext at that moment so the hook can play sounds
  // when a notification arrives later.
  //
  useEffect(() => {
    function unlockAudio() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        ctx.resume().then(() => ctx.close());
      } catch (_) {}
    }

    // once:true means the listener removes itself after the first call
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("touchstart",  unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart",  unlockAudio);
    };
  }, []);

  // ── Real-time notification subscription ───────────────────────────────────
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
    }
    setSelectedNotificationId(notification.id);
  }

  async function handleDelete(notificationId) {
    if (selectedNotificationId === notificationId) {
      setSelectedNotificationId(null);
    }
    await deleteNotificationById(notificationId);
  }

  return (
    <div className="ad-root">
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
                  <div className={`an-avatar ${notification.isRead ? "is-read" : ""}`} style={{ overflow: "hidden", position: "relative" }}>
                    <img 
                      src={notification.picture} 
                      alt="Notification Avatar" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                    <span className="an-avatarIcon" style={{ position: "absolute", top: -5, left: -5 }}>
                      {notification.typeIcon}
                    </span>
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
                    <FaTrash />
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