import { db, storage } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const ORDER_TABS = [
  { key: "Pending", label: "Pending Orders" },
  { key: "Finished", label: "Finished Orders" },
];

export const STATUS_OPTIONS = [
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

  // Get table number - prioritize table_id, fallback to receive_at
  let tableNumber = "";
  
  if (data.table_id !== undefined && data.table_id !== null) {
    // table_id is a number (int64) like 8
    tableNumber = String(data.table_id);
  } else if (data.receive_at && data.receive_at !== "table") {
    // If receive_at has actual table number, use it
    tableNumber = String(data.receive_at);
  } else {
    // Default fallback
    tableNumber = "N/A";
  }

  return {
    id: Number(data.order_id ?? docSnap.id),
    orderId: Number(data.order_id ?? docSnap.id),
    tableNumber: tableNumber.padStart(3, "0"), // Pad with zeros to 3 digits
    status: String(data.order_status || "PREPARING"),
    items,
    totalAmount: Number(data.total_amount ?? calcOrderTotal(items)),

    createdAt:
      typeof data.o_timestamp?.toDate === "function"
        ? data.o_timestamp.toDate()
        : new Date(),

    customerName: data.user_id
      ? `User #${data.user_id}`
      : `Guest #${data.guest_id ?? "N/A"}`,

    orderType: data.order_type || "N/A",
    instructions: data.special_instructions || "",
    receiptUrl: data.receipt_image || "",
  };
}

/* =========================
   Get Orders
========================= */
export async function getAllOrdersLive() {
  const q = query(collection(db, "tbl_orders"), orderBy("order_id", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapFirestoreOrder);
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
  receiptFile
) {
  try {
    let receiptUrl = "";

    if (receiptFile instanceof File) {
      receiptUrl = await uploadReceiptImage(receiptFile, orderId);
    }

    await updateDoc(doc(db, "tbl_orders", String(orderId)), {
      order_status: newStatus,
      ...(receiptUrl && { receipt_image: receiptUrl }),
    });

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: error.message };
  }
}

export function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function formatTime(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${min}:${ss}`;
}