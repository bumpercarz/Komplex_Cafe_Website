import { db } from "../firebase";
import { writeBatch, doc, Timestamp } from "firebase/firestore";

const ORDERS_COLLECTION = "tbl_orders";

// ✅ Updated seed data with order_type and special_instructions
const DEFAULT_ORDER_SEED = [
  {
    order_id: 1,
    table_id: 1,
    user_id: null,
    guest_id: 1,
    items: [{ name: "Amerikano 12oz", qty: 1, price: 115 }],
    order_status: "PROCESSING PAYMENT",
    o_timestamp: "2025-11-16T09:25:57",
    total_amount: 115,
    receipt_image: "",
    order_type: "DINE-IN",
    special_instructions: "No sugar",
  },
  {
    order_id: 2,
    table_id: 3,
    user_id: 2,
    guest_id: null,
    items: [
      { name: "Latte 16oz", qty: 2, price: 150 },
      { name: "Blueberry Muffin", qty: 1, price: 80 },
    ],
    order_status: "PREPARING",
    o_timestamp: "2025-11-16T09:30:00",
    total_amount: 380,
    receipt_image: "",
    order_type: "TAKEOUT",
    special_instructions: "",
  },
];

function toTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Timestamp.now();
  }
  return Timestamp.fromDate(parsed);
}

export async function seedFirestoreOrders() {
  const batch = writeBatch(db);

  DEFAULT_ORDER_SEED.forEach((order) => {
    const ref = doc(db, ORDERS_COLLECTION, String(order.order_id));

    batch.set(ref, {
      order_id: order.order_id,
      table_id: order.table_id,
      user_id: order.user_id,
      guest_id: order.guest_id,
      items: order.items,
      order_status: order.order_status,
      o_timestamp: toTimestamp(order.o_timestamp),
      total_amount: order.total_amount,
      receipt_image: order.receipt_image,
      order_type: order.order_type,
      special_instructions: order.special_instructions,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_orders seeded successfully with order_type and special_instructions.",
  };
}