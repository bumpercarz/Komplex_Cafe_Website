import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  addDoc,
  serverTimestamp,
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

// ─── Write Notifications ──────────────────────────────────────────────────────

export async function writeNotification({ title, message, details = [], type, actor = "System" }) {
  try {
    await addDoc(collection(db, "tbl_notifs"), {
      title,
      message,
      details,
      type,
      read: false,
      n_timestamp: serverTimestamp(),
      actor,
    });
  } catch (err) {
    console.error("[adminNotificationData] Failed to write notification:", err);
  }
}

export async function notifyMenuAdd({ itemName, category = "", price = "", actor = "Admin" }) {
  await writeNotification({
    type: "menu_add",
    title: `Menu item added: ${itemName}`,
    message: `${actor} added a new menu item "${itemName}".`,
    details: [
      { label: "Item", value: itemName },
      { label: "Category", value: category },
      { label: "Price", value: String(price) },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

export async function notifyMenuUpdate({ itemName, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: "menu_update",
    title: `Menu item updated: ${itemName}`,
    message: `${actor} updated "${itemName}".${changes ? " " + changes : ""}`,
    details: [
      { label: "Item", value: itemName },
      { label: "Changes", value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

export async function notifyMenuDelete({ itemName, actor = "Admin" }) {
  await writeNotification({
    type: "menu_delete",
    title: `Menu item deleted: ${itemName}`,
    message: `${actor} removed "${itemName}" from the menu.`,
    details: [
      { label: "Item", value: itemName },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}

export async function notifyUserAdd({ userName, role = "", actor = "Admin" }) {
  await writeNotification({
    type: "user_add",
    title: `New user added: ${userName}`,
    message: `${actor} created a new ${role || "user"} account for "${userName}".`,
    details: [
      { label: "User", value: userName },
      { label: "Role", value: role },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

export async function notifyUserUpdate({ userName, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: "user_update",
    title: `User updated: ${userName}`,
    message: `${actor} updated details for "${userName}".${changes ? " " + changes : ""}`,
    details: [
      { label: "User", value: userName },
      { label: "Changes", value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

export async function notifyUserDelete({ userName, actor = "Admin" }) {
  await writeNotification({
    type: "user_delete",
    title: `User deleted: ${userName}`,
    message: `${actor} deleted the account for "${userName}".`,
    details: [
      { label: "User", value: userName },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}

// --- NEW TABLE NOTIFICATION FUNCTIONS ---

export async function notifyTableAdd({ tableLabel, status = "", actor = "Admin" }) {
  await writeNotification({
    type: "table_add",
    title: `Table added: ${tableLabel}`,
    message: `${actor} added a new table "${tableLabel}".`,
    details: [
      { label: "Table", value: tableLabel },
      { label: "Status", value: status },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

export async function notifyTableUpdate({ tableLabel, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: "table_update",
    title: `Table updated: ${tableLabel}`,
    message: `${actor} updated table "${tableLabel}".${changes ? " " + changes : ""}`,
    details: [
      { label: "Table", value: tableLabel },
      { label: "Changes", value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

export async function notifyTableDelete({ tableLabel, actor = "Admin" }) {
  await writeNotification({
    type: "table_delete",
    title: `Table deleted: ${tableLabel}`,
    message: `${actor} removed table "${tableLabel}".`,
    details: [
      { label: "Table", value: tableLabel },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}