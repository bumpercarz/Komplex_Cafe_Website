import { db } from "../firebase";
import { writeBatch, doc, Timestamp } from "firebase/firestore";

const NOTIFS_COLLECTION = "tbl_notifs";

function minutesAgo(minutes) {
  return Timestamp.fromDate(new Date(Date.now() - minutes * 60 * 1000));
}

const DEFAULT_NOTIFICATIONS = [
  {
    id: 1,
    orderId: 1,
    title: "New order from Table 1",
    message: "Table 1 placed a new order that needs attention.",
    read: false,
    details: [
      { label: "Order ID", value: "1" },
      { label: "Table", value: "Table 1" },
      { label: "Status", value: "PENDING" },
      { label: "Total", value: "₱115.00" },
    ],
    timestamp: minutesAgo(3),
  },
  {
    id: 2,
    orderId: 2,
    title: "Payment is being processed",
    message: "Order #2 is currently waiting for payment confirmation.",
    read: false,
    details: [
      { label: "Order ID", value: "2" },
      { label: "Table", value: "Table 2" },
      { label: "Status", value: "PROCESSING PAYMENT" },
      { label: "Total", value: "₱240.00" },
    ],
    timestamp: minutesAgo(10),
  },
  {
    id: 3,
    orderId: 1,
    title: "Order completed",
    message: "Order #1 from Table 1 has been completed successfully.",
    read: true,
    details: [
      { label: "Order ID", value: "1" },
      { label: "Table", value: "Table 1" },
      { label: "Status", value: "COMPLETED" },
      { label: "Completed By", value: "Staff" },
    ],
    timestamp: minutesAgo(25),
  },
  {
    id: 4,
    orderId: 3,
    title: "Order cancelled",
    message: "Order #3 was cancelled and needs review.",
    read: false,
    details: [
      { label: "Order ID", value: "3" },
      { label: "Table", value: "Table 3" },
      { label: "Status", value: "CANCELLED" },
      { label: "Reason", value: "Customer request" },
    ],
    timestamp: minutesAgo(40),
  },
];

export async function seedFirestoreNotifications() {
  const batch = writeBatch(db);

  DEFAULT_NOTIFICATIONS.forEach((notif) => {
    const ref = doc(db, NOTIFS_COLLECTION, String(notif.id));

    batch.set(ref, {
      notif_id: notif.id,
      order_id: notif.orderId,
      title: notif.title,
      message: notif.message,
      details: notif.details,
      read: notif.read,
      n_timestamp: notif.timestamp,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_notifs seeded successfully.",
  };
}