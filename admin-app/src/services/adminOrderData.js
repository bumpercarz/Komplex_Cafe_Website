import { db, storage } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp, // NEW: Added serverTimestamp to write exact times to DB
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ✅ Only import what this file actually uses
import { notifyOrderStatusUpdate } from "../../../guest-app/src/services/notificationService";

export const ORDER_TABS = [
  { key: "Pending",  label: "Pending Orders"  },
  { key: "Finished", label: "Finished Orders" },
];

export const STATUS_OPTIONS = [
  "PENDING",
  "PREPARING",
  "PROCESSING PAYMENT",
  "COMPLETED",
  "CANCELLED",
];

export function formatMoney(n) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  })
    .format(n)
    .replace("PHP", "₱");
}

export function isFinishedStatus(status) {
  return status === "COMPLETED" || status === "CANCELLED";
}

export function calcOrderTotal(items) {
  return items.reduce(
    (sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0),
    0
  );
}

/* =========================
   Upload Receipt Image
========================= */
async function uploadReceiptImage(file, orderId) {
  const extension =
    String(file?.name || "").split(".").pop().toLowerCase() || "png";

  const safeExtension = ["png", "jpg", "jpeg", "webp"].includes(extension)
    ? extension
    : "png";

  const fileRef = ref(
    storage,
    `order-receipts/${orderId}/${Date.now()}.${safeExtension}`
  );

  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

function mapFirestoreOrder(docSnap) {
  const data = docSnap.data() || {};
  const items = Array.isArray(data.items) ? data.items : [];

  let tableNumber = "";
  if (data.table_id !== undefined && data.table_id !== null) {
    tableNumber = String(data.table_id);
  } else if (data.receive_at && data.receive_at !== "table") {
    tableNumber = String(data.receive_at);
  } else {
    tableNumber = "N/A";
  }

  return {
    id:          Number(data.order_id ?? docSnap.id),
    orderId:     Number(data.order_id ?? docSnap.id),
    tableNumber: tableNumber === "N/A" ? "N/A" : tableNumber.padStart(3, "0"),
    tableLabel:  tableNumber === "N/A" ? "Unknown Table" : `Table ${tableNumber}`, // ✅ added for notifications
    status:      String(data.order_status || "PENDING"),
    items,
    totalAmount: Number(data.total_amount ?? calcOrderTotal(items)),

    createdAt:
      typeof data.o_timestamp?.toDate === "function"
        ? data.o_timestamp.toDate()
        : new Date(),

    // NEW: Pull the new timestamps if they exist in the DB
    preparingAt:
      typeof data.preparing_at?.toDate === "function"
        ? data.preparing_at.toDate()
        : null,
    
    completedAt:
      typeof data.completed_at?.toDate === "function"
        ? data.completed_at.toDate()
        : null,

    customerName: data.user_id
      ? `User #${data.user_id}`
      : `Guest #${data.guest_id ?? "N/A"}`,

    orderType:    data.order_type || "N/A",
    instructions: data.special_instructions || "",
    receiptUrl:   data.receipt_image || "",
  };
}

/* =========================
   Get Orders
========================= */
export function subscribeToOrders(callback, onError) {
  const q = query(collection(db, "tbl_orders"), orderBy("order_id", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map(mapFirestoreOrder);
      callback(orders);
    },
    (error) => {
      console.error("Firestore listener error:", error);
      if (onError) onError(error);
    }
  );
}

export function getOrdersByTab(orders, activeTab) {
  if (activeTab === "Finished") {
    return orders.filter((o) => isFinishedStatus(o.status));
  }
  return orders.filter((o) => !isFinishedStatus(o.status));
}

/* =========================
   Update Status + Receipt
========================= */
export async function updateOrderStatusRecord(
  orderId,
  newStatus,
  receiptFile,
  { oldStatus = "UNKNOWN", tableLabel = "Unknown Table", actor = "Admin" } = {}
) {
  try {
    let receiptUrl = "";

    if (receiptFile instanceof File) {
      receiptUrl = await uploadReceiptImage(receiptFile, orderId);
    }

    // NEW: Construct the payload and add timestamps automatically
    const updatePayload = {
      order_status: newStatus,
      ...(receiptUrl && { receipt_image: receiptUrl }),
    };

    if (newStatus === "PREPARING") {
      updatePayload.preparing_at = serverTimestamp();
    } else if (newStatus === "COMPLETED") {
      updatePayload.completed_at = serverTimestamp();
    }

    // Write to Firebase
    await updateDoc(doc(db, "tbl_orders", String(orderId)), updatePayload);

    // ✅ Fire notification after successful Firestore update
    await notifyOrderStatusUpdate({
      orderId,
      tableLabel,
      oldStatus,
      newStatus,
      actor,
    });

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
}

export function formatDate(d) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function formatTime(d) {
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${min}:${ss}`;
}