import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeLabel(date) {
  if (!date) return "Just now";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// Map icon/color hint by notification type so the UI can render badges
const TYPE_META = {
  order_new:    { icon: "🛎️",  label: "New Order" },
  order_status: { icon: "🔄",  label: "Order Update" },
  order_delete: { icon: "🗑️",  label: "Order Deleted" },
  menu_add:     { icon: "➕",  label: "Menu Added" },
  menu_update:  { icon: "✏️",  label: "Menu Updated" },
  menu_delete:  { icon: "🗑️",  label: "Menu Deleted" },
  user_add:     { icon: "👤",  label: "User Added" },
  user_update:  { icon: "✏️",  label: "User Updated" },
  user_delete:  { icon: "🗑️",  label: "User Deleted" },
  table_add:    { icon: "🪑",  label: "Table Added" },
  table_update: { icon: "✏️",  label: "Table Updated" },
  table_delete: { icon: "🗑️",  label: "Table Deleted" },
  qr_update:    { icon: "📲",  label: "QR Updated" },
};

function normalizeNotification(docSnap) {
  const data = docSnap.data();
  const date = data?.n_timestamp?.toDate?.() ?? null;
  const type = data?.type ?? "order_new";
  const meta = TYPE_META[type] ?? { icon: "🔔", label: "Notification" };

  return {
    id:          docSnap.id,
    notif_id:    data?.notif_id   ?? docSnap.id,
    order_id:    data?.order_id   ?? null,
    type,
    typeIcon:    meta.icon,
    typeLabel:   meta.label,
    actor:       data?.actor      ?? "System",
    title:       data?.title      ?? `Notification`,
    description: data?.message    ?? "No message available.",
    details:     Array.isArray(data?.details) ? data.details : [],
    isRead:      Boolean(data?.read),
    timeLabel:   formatTimeLabel(date),
    n_timestamp: date,
  };
}

// ─── Real-time listener ───────────────────────────────────────────────────────

/**
 * Subscribe to live notification updates.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Usage in React:
 *   useEffect(() => {
 *     const unsub = subscribeToNotifications((notifs) => setNotifications(notifs));
 *     return () => unsub();
 *   }, []);
 *
 * @param {(notifications: object[]) => void} onUpdate
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeToNotifications(onUpdate, onError) {
  const q = query(
    collection(db, "tbl_notifs"),
    orderBy("n_timestamp", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map(normalizeNotification);
      onUpdate(notifications);
    },
    (err) => {
      console.error("[adminNotificationData] Snapshot error:", err);
      onError?.(err);
    }
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function markNotificationAsRead(notificationId) {
  await updateDoc(doc(db, "tbl_notifs", String(notificationId)), {
    read: true,
  });
}

export async function deleteNotificationById(notificationId) {
  await deleteDoc(doc(db, "tbl_notifs", String(notificationId)));
}
