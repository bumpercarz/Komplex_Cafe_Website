import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../admin-app/src/firebase";

// ─── Notification type constants ─────────────────────────────────────────────
export const NOTIF_TYPES = {
  ORDER_NEW:     "order_new",
  ORDER_STATUS:  "order_status",
  ORDER_DELETE:  "order_delete",
  MENU_ADD:      "menu_add",
  MENU_UPDATE:   "menu_update",
  MENU_DELETE:   "menu_delete",
  USER_ADD:      "user_add",
  USER_UPDATE:   "user_update",
  USER_DELETE:   "user_delete",
  TABLE_ADD:     "table_add",
  TABLE_UPDATE:  "table_update",
  TABLE_DELETE:  "table_delete",
  QR_UPDATE:     "qr_update",
};

// ─── Internal writer ──────────────────────────────────────────────────────────
async function writeNotification({
  title,
  message,
  details = [],
  type,
  actor = "System",
  order_id = null,
}) {
  try {
    await addDoc(collection(db, "tbl_notifs"), {
      title,
      message,
      details,
      type,
      read: false,
      n_timestamp: serverTimestamp(),
      actor,
      order_id,
    });
  } catch (err) {
    console.error("[notificationService] Failed to write notification:", err);
  }
}

// ─── ORDER notifications ──────────────────────────────────────────────────────

/**
 * Call when a customer places a NEW order.
 * Usage (in your order service):
 *   await notifyNewOrder({ orderId: order.id, tableLabel: "Table 3" });
 */
export async function notifyNewOrder({ orderId, tableLabel, actor = "Customer" }) {
  await writeNotification({
    type: NOTIF_TYPES.ORDER_NEW,
    title: `New order from ${tableLabel}`,
    message: `${tableLabel} placed a new order that needs attention.`,
    details: [
      { label: "Order ID", value: String(orderId) },
      { label: "Table",    value: tableLabel },
      { label: "Status",   value: "PENDING" },
    ],
    actor,
    order_id: Number(orderId),
  });
}

/**
 * Call when an order status changes (PENDING → PREPARING → SERVED, etc.).
 * Usage:
 *   await notifyOrderStatusUpdate({ orderId, tableLabel, oldStatus: "PENDING", newStatus: "PREPARING", actor: adminName });
 */
export async function notifyOrderStatusUpdate({
  orderId,
  tableLabel,
  oldStatus,
  newStatus,
  actor = "Admin",
}) {
  await writeNotification({
    type: NOTIF_TYPES.ORDER_STATUS,
    title: `Order #${orderId} status updated`,
    message: `Order from ${tableLabel} changed from ${oldStatus} to ${newStatus}.`,
    details: [
      { label: "Order ID",   value: String(orderId) },
      { label: "Table",      value: tableLabel },
      { label: "Old Status", value: oldStatus },
      { label: "New Status", value: newStatus },
      { label: "Updated by", value: actor },
    ],
    actor,
    order_id: Number(orderId),
  });
}

/**
 * Call when an order is deleted.
 */
export async function notifyOrderDelete({ orderId, tableLabel, actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.ORDER_DELETE,
    title: `Order #${orderId} deleted`,
    message: `Order from ${tableLabel} was deleted by ${actor}.`,
    details: [
      { label: "Order ID",   value: String(orderId) },
      { label: "Table",      value: tableLabel },
      { label: "Deleted by", value: actor },
    ],
    actor,
    order_id: Number(orderId),
  });
}

// ─── MENU / PRODUCT notifications ────────────────────────────────────────────

/**
 * Call when a new menu item is added.
 * Usage:
 *   await notifyMenuAdd({ itemName: "Adobo Rice", category: "Meals", price: "₱120", actor: adminName });
 */
export async function notifyMenuAdd({ itemName, category = "", price = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.MENU_ADD,
    title: `Menu item added: ${itemName}`,
    message: `${actor} added a new menu item "${itemName}".`,
    details: [
      { label: "Item",     value: itemName },
      { label: "Category", value: category },
      { label: "Price",    value: String(price) },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a menu item is updated.
 * Pass a human-readable changes string, e.g. "Price changed from ₱100 to ₱120"
 */
export async function notifyMenuUpdate({ itemName, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.MENU_UPDATE,
    title: `Menu item updated: ${itemName}`,
    message: `${actor} updated "${itemName}".${changes ? " " + changes : ""}`,
    details: [
      { label: "Item",       value: itemName },
      { label: "Changes",    value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a menu item is deleted.
 */
export async function notifyMenuDelete({ itemName, actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.MENU_DELETE,
    title: `Menu item deleted: ${itemName}`,
    message: `${actor} removed "${itemName}" from the menu.`,
    details: [
      { label: "Item",       value: itemName },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}

// ─── USER notifications ───────────────────────────────────────────────────────

/**
 * Call when a new user/admin account is created.
 */
export async function notifyUserAdd({ userName, role = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.USER_ADD,
    title: `New user added: ${userName}`,
    message: `${actor} created a new ${role || "user"} account for "${userName}".`,
    details: [
      { label: "User",     value: userName },
      { label: "Role",     value: role },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a user's details are updated.
 */
export async function notifyUserUpdate({ userName, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.USER_UPDATE,
    title: `User updated: ${userName}`,
    message: `${actor} updated details for "${userName}".${changes ? " " + changes : ""}`,
    details: [
      { label: "User",       value: userName },
      { label: "Changes",    value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a user is deleted.
 */
export async function notifyUserDelete({ userName, actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.USER_DELETE,
    title: `User deleted: ${userName}`,
    message: `${actor} deleted the account for "${userName}".`,
    details: [
      { label: "User",       value: userName },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}

// ─── TABLE & QR notifications ─────────────────────────────────────────────────

/**
 * Call when a new table is added.
 */
export async function notifyTableAdd({ tableLabel, capacity = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.TABLE_ADD,
    title: `Table added: ${tableLabel}`,
    message: `${actor} added a new table "${tableLabel}".`,
    details: [
      { label: "Table",    value: tableLabel },
      { label: "Capacity", value: String(capacity) },
      { label: "Added by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a table is updated (name, capacity, status, etc.).
 */
export async function notifyTableUpdate({ tableLabel, changes = "", actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.TABLE_UPDATE,
    title: `Table updated: ${tableLabel}`,
    message: `${actor} updated table "${tableLabel}".${changes ? " " + changes : ""}`,
    details: [
      { label: "Table",      value: tableLabel },
      { label: "Changes",    value: changes || "Details updated" },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a table is deleted.
 */
export async function notifyTableDelete({ tableLabel, actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.TABLE_DELETE,
    title: `Table deleted: ${tableLabel}`,
    message: `${actor} removed table "${tableLabel}".`,
    details: [
      { label: "Table",      value: tableLabel },
      { label: "Deleted by", value: actor },
    ],
    actor,
  });
}

/**
 * Call when a QR code is regenerated or updated.
 */
export async function notifyQrUpdate({ tableLabel, actor = "Admin" }) {
  await writeNotification({
    type: NOTIF_TYPES.QR_UPDATE,
    title: `QR code updated: ${tableLabel}`,
    message: `${actor} regenerated the QR code for "${tableLabel}".`,
    details: [
      { label: "Table",      value: tableLabel },
      { label: "Updated by", value: actor },
    ],
    actor,
  });
}
