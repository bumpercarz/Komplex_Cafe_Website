// src/services/adminDashboardData.js
import { db } from "../firebase";
import { collection, getDocs, Timestamp, query, where } from "firebase/firestore";

// ----- Categories excluded from Item Sales Performance -----
const EXCLUDED_PERFORMANCE_CATEGORIES = ["Add-on", "Dip", "Sweetness"];

// ----- Cache menu items -----
let MENU_ITEMS_CACHE = null;

export async function fetchMenuItems() {
  if (MENU_ITEMS_CACHE) return MENU_ITEMS_CACHE;

  const snapshot = await getDocs(collection(db, "tbl_menuItems"));
  MENU_ITEMS_CACHE = snapshot.docs.map(doc => doc.data());
  return MENU_ITEMS_CACHE;
}

// ----- Category mapping -----
export async function getCategoryItems() {
  const menuItems = await fetchMenuItems();
  const filtered = menuItems.filter(
    item => !EXCLUDED_PERFORMANCE_CATEGORIES.includes(item.category)
  );
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item.m_name);
  });
  categories.All = filtered.map(i => i.m_name);
  return categories;
}

// ----- Line keys for charts -----
export async function getLineKeys() {
  const menuItems = await fetchMenuItems();
  const filtered = menuItems.filter(
    item => !EXCLUDED_PERFORMANCE_CATEGORIES.includes(item.category)
  );
  const ROYGBIV = ["#FF6B6B", "#FFA66B", "#caac16", "#0e7526", "#6BCBFF", "#A66BFF", "#FF6BFF"];
  const keys = {};

  filtered.forEach((item, index) => {
    const key = item.m_name.toLowerCase().replace(/\s+/g, "_");
    keys[key] = {
      label: item.m_name,
      color: ROYGBIV[index % ROYGBIV.length],
    };
  });

  return keys;
}

// ----- Dashboard summary -----
export async function getDashboardSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const ordersRef = collection(db, "tbl_orders");
  const q = query(
    ordersRef,
    where("o_timestamp", ">=", Timestamp.fromDate(todayStart)),
    where("o_timestamp", "<=", Timestamp.fromDate(todayEnd))
  );
  const snapshot = await getDocs(q);

  const paymentsSnap = await getDocs(collection(db, "tbl_payments"));
  const payments = paymentsSnap.docs.map(d => d.data());

  let todaysSales = 0;
  snapshot.forEach(doc => {
    const order = doc.data();
    const payment = payments.find(p => p.order_id === order.order_id);
    if (payment) todaysSales += payment.amount_paid || 0;
  });

  return { todaysSales, totalOrders: snapshot.size };
}

// ----- Online sales data -----
export async function getOnlineSalesData(range) {
  const ordersSnap = await getDocs(collection(db, "tbl_orders"));
  const paymentsSnap = await getDocs(collection(db, "tbl_payments"));
  const payments = paymentsSnap.docs.map(d => d.data());
  
  const now = new Date();
  const dataPoints = [];

  if (range === "Hour") {
    for (let i = 11; i >= 0; i--) {
      const hour = now.getHours() - i;
      const label = `${String(hour).padStart(2, "0")}:00`;
      let orders = 0;
      let sales = 0;
      
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (ts.getHours() === hour && ts.toDateString() === now.toDateString()) {
          orders++;
          const payment = payments.find(p => p.order_id === order.order_id);
          if (payment) sales += payment.amount_paid || 0;
        }
      });
      dataPoints.push({ label, orders, sales });
    }
  } else if (range === "Week") {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const label = days[day.getDay()];
      let orders = 0;
      let sales = 0;
      
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        // With this exact date match:
        if (
          ts.getDate() === day.getDate() && 
          ts.getMonth() === day.getMonth() && 
          ts.getFullYear() === day.getFullYear()
        ) {
          orders++;
          const payment = payments.find(p => p.order_id === order.order_id);
          if (payment) sales += payment.amount_paid || 0;
        }
      });
      dataPoints.push({ label, orders, sales });
    }
  } else if (range === "Month") {
    for (let w = 1; w <= 4; w++) {
      let orders = 0;
      let sales = 0;
      
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (Math.ceil(ts.getDate()/7) === w && ts.getMonth() === now.getMonth()) {
          orders++;
          const payment = payments.find(p => p.order_id === order.order_id);
          if (payment) sales += payment.amount_paid || 0;
        }
      });
      dataPoints.push({ label: `W${w}`, orders, sales });
    }
  } else {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const year = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      let orders = 0;
      let sales = 0;
      
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (ts.getMonth() === m && ts.getFullYear() === year) {
          orders++;
          const payment = payments.find(p => p.order_id === order.order_id);
          if (payment) sales += payment.amount_paid || 0;
        }
      });
      dataPoints.push({ label: months[m], orders, sales });
    }
  }

  return dataPoints;
}

// ----- Item performance data -----
export async function getItemPerformanceData(range) {
  const ordersSnap = await getDocs(collection(db, "tbl_orders"));
  const menuItems = await fetchMenuItems();
  const filtered = menuItems.filter(
    item => !EXCLUDED_PERFORMANCE_CATEGORIES.includes(item.category)
  );

  const labels =
    range === "Week" ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] :
    range === "Month" ? ["W1","W2","W3","W4"] :
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const lineKeys = filtered.map(i => i.m_name.toLowerCase().replace(/\s+/g, "_"));

  const dataPoints = labels.map(label => {
    const lineData = { label };
    lineKeys.forEach(k => lineData[k] = 0);

    ordersSnap.docs.forEach(doc => {
      const order = doc.data();
      const ts = order.o_timestamp.toDate();
      let matches = false;

      if (range === "Week" && label === ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][ts.getDay()]) matches = true;
      if (range === "Month" && label === `W${Math.ceil(ts.getDate()/7)}`) matches = true;
      if (range === "Year" && label === ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][ts.getMonth()]) matches = true;

      if (matches && order.items) {
        order.items.forEach(item => {
          const menuItem = filtered.find(m => m.m_name === item.name);
          if (!menuItem) return;
          const key = menuItem.m_name.toLowerCase().replace(/\s+/g, "_");
          lineData[key] += item.qty || 0;
        });
      }
    });

    return lineData;
  });

  return dataPoints;
}