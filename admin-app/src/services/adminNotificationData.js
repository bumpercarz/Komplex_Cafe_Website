import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

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

function normalizeNotification(docSnap) {
  const data = docSnap.data();
  const date = data?.n_timestamp?.toDate?.() || null;

  return {
    id: docSnap.id,
    notif_id: data?.notif_id ?? docSnap.id,
    order_id: data?.order_id ?? null,

    // Fallbacks so your current page still works
    title: data?.title ?? `Order Notification #${data?.order_id ?? docSnap.id}`,
    description: data?.message ?? "No message available.",
    details: Array.isArray(data?.details) ? data.details : [],
    isRead: Boolean(data?.read),
    timeLabel: formatTimeLabel(date),
    n_timestamp: date,
  };
}

export async function getAllNotifications() {
  const q = query(
    collection(db, "tbl_notifs"),
    orderBy("n_timestamp", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeNotification);
}

export async function markNotificationAsRead(notificationId) {
  await updateDoc(doc(db, "tbl_notifs", String(notificationId)), {
    read: true,
  });
}

export async function deleteNotificationById(notificationId) {
  await deleteDoc(doc(db, "tbl_notifs", String(notificationId)));
}