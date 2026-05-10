import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export function formatMoney(n) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  })
    .format(n)
    .replace("PHP", "₱");
}

function pad4(value) {
  return String(value ?? "").padStart(4, "0");
}

function formatTimestamp(date) {
  if (!date) return "N/A";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

function getOrderItems(orderData) {
  if (Array.isArray(orderData?.items)) return orderData.items;
  if (Array.isArray(orderData?.orderDetails?.items)) return orderData.orderDetails.items;
  return [];
}

export async function getAllPayments() {
  // Fetch payments, orders, AND menu items to map item categories
  const [paymentsSnapshot, ordersSnapshot, menuSnapshot] = await Promise.all([
    getDocs(collection(db, "tbl_payments")),
    getDocs(collection(db, "tbl_orders")),
    getDocs(collection(db, "tbl_menuItems"))
  ]);

  const ordersMap = new Map();
  ordersSnapshot.docs.forEach((doc) => {
    ordersMap.set(doc.id, doc.data());
  });

  const menuMap = new Map();
  menuSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    menuMap.set(data.m_name, data.category);
  });

  const payments = paymentsSnapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    const paymentIdRaw = data?.payment_id ?? docSnap.id;
    const orderIdRaw = data?.order_id ?? "";
    const amount = Number(data?.amount_paid ?? 0);
    const method = data?.payment_method ?? "N/A";
    const referenceNumber = data?.reference_number ?? "N/A";

    const date = data?.transaction_time?.toDate?.() || null;
    const timestamp = formatTimestamp(date);

    const matchingOrder =
      ordersMap.get(String(orderIdRaw)) ||
      ordersMap.get(String(Number(orderIdRaw))) ||
      null;

    const items = getOrderItems(matchingOrder).map((item) => {
      const name = item?.name ?? "Unknown Item";
      return {
        name,
        price: Number(item?.price ?? 0),
        quantity: Number(item?.quantity ?? item?.qty ?? 1),
        category: menuMap.get(name) || "Uncategorized", // Attach category for UI formatting
      };
    });

    return {
      id: docSnap.id,
      paymentId: `P-${pad4(paymentIdRaw)}`,
      orderId: pad4(orderIdRaw),
      method,
      amount,
      timestamp,
      orderDetails: {
        items,
      },
      paymentDetails: {
        method,
        total: amount,
        transactionDateTime: timestamp,
        referenceNumber: String(referenceNumber),
      },
      transactionDate: date,
    };
  });

  return payments.sort((a, b) => {
    const aTime = a.transactionDate ? a.transactionDate.getTime() : 0;
    const bTime = b.transactionDate ? b.transactionDate.getTime() : 0;
    return bTime - aTime;
  });
}