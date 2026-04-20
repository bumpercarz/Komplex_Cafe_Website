import { db, storage } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  getDocs,
  getDoc, // NEW: Added getDoc to fetch the current order before updating
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { notifyOrderStatusUpdate } from "../../../guest-app/src/services/notificationService";

export const ORDER_TABS = [
  { key: "Pending", label: "Pending Orders" },
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

/* =========================
   Menu Item Dictionary
========================= */
// NEW: We will store the categories here so we don't have to fetch them constantly
export let menuCategoryMap = {};

export async function loadMenuCategories() {
  try {
    const snap = await getDocs(collection(db, "tbl_menuItems"));
    snap.forEach((d) => {
      const data = d.data();
      if (data.m_name && data.category) {
        menuCategoryMap[data.m_name] = data.category;
      }
    });
  } catch (error) {
    console.error("Failed to load menu categories:", error);
  }
}

function mapFirestoreOrder(docSnap) {
  const data = docSnap.data() || {};
  
  // NEW: Map over the raw items and attach the category from our dictionary if it's missing
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const itemsWithCategories = rawItems.map((it) => ({
    ...it,
    category: it.category || menuCategoryMap[it.name] || "Uncategorized",
  }));

  let tableNumber = "";
  if (data.table_id !== undefined && data.table_id !== null) {
    tableNumber = String(data.table_id);
  } else if (data.receive_at && data.receive_at !== "table") {
    tableNumber = String(data.receive_at);
  } else {
    tableNumber = "N/A";
  }

  return {
    id: Number(data.order_id ?? docSnap.id),
    orderId: Number(data.order_id ?? docSnap.id),
    tableNumber: tableNumber === "N/A" ? "N/A" : tableNumber.padStart(3, "0"),
    tableLabel: tableNumber === "N/A" ? "Unknown Table" : `Table ${tableNumber.padStart(3, "0")}`,
    status: String(data.order_status || "PENDING"),
    items: itemsWithCategories, // Use the updated items array
    totalAmount: Number(data.total_amount ?? calcOrderTotal(itemsWithCategories)),

    createdAt:
      typeof data.o_timestamp?.toDate === "function"
        ? data.o_timestamp.toDate()
        : new Date(),

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

    orderType: data.order_type || "N/A",
    instructions: data.special_instructions || "",
    receiptUrl: data.receipt_image || "",
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
  options = {}
) {
  try {
    const actor = options.actor || "Admin";
    let receiptUrl = "";

    if (receiptFile instanceof File) {
      receiptUrl = await uploadReceiptImage(receiptFile, orderId);
    }

    // --- NEW: Fetch the current order so we KNOW the exact previous status and table! ---
    const orderRef = doc(db, "tbl_orders", String(orderId));
    const orderSnap = await getDoc(orderRef);
    
    let oldStatus = "UNKNOWN";
    let tableLabel = "Unknown Table";

    if (orderSnap.exists()) {
      const data = orderSnap.data();
      oldStatus = data.order_status || "PENDING";
      
      let tableNumber = "N/A";
      if (data.table_id !== undefined && data.table_id !== null) {
        tableNumber = String(data.table_id);
      } else if (data.receive_at && data.receive_at !== "table") {
        tableNumber = String(data.receive_at);
      }
      
      tableLabel = tableNumber === "N/A" 
        ? "Unknown Table" 
        : `Table ${tableNumber.padStart(3, "0")}`;
    }
    // ------------------------------------------------------------------------------------

    const updatePayload = {
      order_status: newStatus,
      ...(receiptUrl && { receipt_image: receiptUrl }),
    };

    if (newStatus === "PREPARING") {
      updatePayload.preparing_at = serverTimestamp();
    } else if (newStatus === "COMPLETED") {
      updatePayload.completed_at = serverTimestamp();
    }

    await updateDoc(orderRef, updatePayload);

    // Pass the real values into the notification service
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