import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminNotificationsPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";

import {
  getAllNotifications,
  markNotificationAsRead,
  deleteNotificationById,
} from "../services/adminNotificationData";

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
            <div className={`an-modalAvatar ${notification.isRead ? "is-read" : ""}`} />
            <div>
              <h2 className="an-modalHeadline">{notification.title}</h2>
              <p className="an-modalTime">{notification.timeLabel}</p>
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

export default function AdminNotificationsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function reloadNotifications() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getAllNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Load notifications error:", error);
      setMessage(error?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadNotifications();
  }, []);

  const selectedNotification = useMemo(() => {
    return (
      notifications.find(
        (notification) => notification.id === selectedNotificationId
      ) || null
    );
  }, [notifications, selectedNotificationId]);

  async function handleView(notification) {
    await markNotificationAsRead(notification.id);
    setSelectedNotificationId(notification.id);
    await reloadNotifications();
  }

  async function handleDelete(notificationId) {
    await deleteNotificationById(notificationId);

    if (selectedNotificationId === notificationId) {
      setSelectedNotificationId(null);
    }

    await reloadNotifications();
  }

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel="ADMIN" onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="an-main">
        <AdminPageToolbar
          title="Notification List"
          showSearch={false}
        />

        {message ? <div className="an-empty">{message}</div> : null}
        {loading ? <div className="an-empty">Loading notifications...</div> : null}

        {!loading && (
          <div className="an-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`an-card ${notification.isRead ? "is-read" : ""}`}
              >
                <div className="an-cardLeft">
                  <div className={`an-avatar ${notification.isRead ? "is-read" : ""}`} />

                  <div className="an-content">
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