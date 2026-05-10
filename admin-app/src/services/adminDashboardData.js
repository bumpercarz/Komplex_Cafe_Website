// src/services/adminDashboardData.js
import { db } from "../firebase";
import { collection, getDocs, Timestamp, query, where } from "firebase/firestore";

// ----- Categories excluded from Item Sales Performance -----
const EXCLUDED_PERFORMANCE_CATEGORIES = ["Add-on", "Dip", "Sweetness"];

// ----- Caches -----
let MENU_ITEMS_CACHE = null;
const ORDERS_QUERY_CACHE = new Map(); // NEW: Prevents duplicate fetching

export async function fetchMenuItems() {
  if (MENU_ITEMS_CACHE) return MENU_ITEMS_CACHE;
  const snapshot = await getDocs(collection(db, "tbl_menuItems"));
  MENU_ITEMS_CACHE = snapshot.docs.map(doc => doc.data());
  return MENU_ITEMS_CACHE;
}

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

function getCustomLabelsAndMatchers(startDateStr, endDateStr) {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T23:59:59`);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const labels = [];
  const matchers = []; 

  if (diffDays <= 60) {
     for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
         const cur = new Date(d);
         labels.push(cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
         matchers.push((ts) => ts.getDate() === cur.getDate() && ts.getMonth() === cur.getMonth() && ts.getFullYear() === cur.getFullYear());
     }
  } else {
     const cur = new Date(start);
     cur.setDate(1); 
     while (cur <= end || (cur.getMonth() === end.getMonth() && cur.getFullYear() === end.getFullYear())) {
         const m = new Date(cur);
         labels.push(m.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
         matchers.push((ts) => ts.getMonth() === m.getMonth() && ts.getFullYear() === m.getFullYear());
         cur.setMonth(cur.getMonth() + 1);
     }
  }
  return { labels, matchers };
}

export async function getDashboardSummary(period = "Current", customDates = null) {
  let start, end;

  if (period === "Custom" && customDates?.start && customDates?.end) {
    start = new Date(`${customDates.start}T00:00:00`);
    end = new Date(`${customDates.end}T23:59:59`);
  } else {
    const targetDate = new Date();
    if (period === "Previous") targetDate.setDate(targetDate.getDate() - 1); 
    start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);
  }

  // Use Cache check for summary as well!
  const cacheKey = `summary_${start.getTime()}_${end.getTime()}`;
  if (!ORDERS_QUERY_CACHE.has(cacheKey)) {
    const q = query(
      collection(db, "tbl_orders"),
      where("o_timestamp", ">=", Timestamp.fromDate(start)),
      where("o_timestamp", "<=", Timestamp.fromDate(end))
    );
    ORDERS_QUERY_CACHE.set(cacheKey, await getDocs(q));
  }
  
  const snapshot = ORDERS_QUERY_CACHE.get(cacheKey);

  let todaysSales = 0;
  snapshot.docs.forEach(doc => {
    const order = doc.data();
    if (order.order_status === "COMPLETED") {
      todaysSales += order.total_amount || 0;
    }
  });

  return { todaysSales, totalOrders: snapshot.size };
}

function getReferenceDate(period, range) {
  const d = new Date();
  if (period === "Previous") {
    if (range === "Hour" || range === "Day") d.setDate(d.getDate() - 1); 
    else if (range === "Week") d.setDate(d.getDate() - 7); 
    else if (range === "Month") d.setMonth(d.getMonth() - 1); 
    else if (range === "Year") d.setFullYear(d.getFullYear() - 1); 
  }
  return d;
}

async function fetchFilteredOrders(range, period, customDates) {
  let start, end;

  if (period === "Custom" && customDates?.start && customDates?.end) {
    start = new Date(`${customDates.start}T00:00:00`);
    end = new Date(`${customDates.end}T23:59:59`);
  } else {
    const now = getReferenceDate(period, range);
    start = new Date(now);
    end = new Date(now);

    if (range === "Hour") {
      start.setHours(start.getHours() - 12, 0, 0, 0); 
      end.setHours(23, 59, 59, 999);
    } else if (range === "Day") {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === "Week") {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === "Month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (range === "Year") {
      start = new Date(start.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(end.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
  }

  // CACHE CHECK: If we already fetched this exact time frame, return the saved data immediately!
  const cacheKey = `${start.getTime()}_${end.getTime()}`;
  if (ORDERS_QUERY_CACHE.has(cacheKey)) {
    return ORDERS_QUERY_CACHE.get(cacheKey);
  }

  const q = query(
    collection(db, "tbl_orders"),
    where("o_timestamp", ">=", Timestamp.fromDate(start)),
    where("o_timestamp", "<=", Timestamp.fromDate(end))
  );

  const snapshot = await getDocs(q);
  ORDERS_QUERY_CACHE.set(cacheKey, snapshot);
  return snapshot;
}

export async function getOnlineSalesData(range, period = "Current", customDates = null) {
  const ordersSnap = await fetchFilteredOrders(range, period, customDates);
  const dataPoints = [];

  if (period === "Custom" && customDates?.start && customDates?.end) {
    const { labels, matchers } = getCustomLabelsAndMatchers(customDates.start, customDates.end);
    labels.forEach((label, i) => {
        let orders = 0, sales = 0;
        ordersSnap.docs.forEach(doc => {
           const order = doc.data();
           const ts = order.o_timestamp.toDate();
           if (matchers[i](ts)) {
              orders++;
              if (order.order_status === "COMPLETED") sales += order.total_amount || 0;
           }
        });
        dataPoints.push({ label, orders, sales });
    });
    return dataPoints;
  }

  const now = getReferenceDate(period, range);

  if (range === "Hour") {
    for (let i = 11; i >= 0; i--) {
      const pastDate = new Date(now);
      pastDate.setHours(now.getHours() - i);
      const targetHour = pastDate.getHours();
      const label = `${String(targetHour).padStart(2, "0")}:00`;
      
      let orders = 0, sales = 0;
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (ts.getHours() === targetHour && ts.getDate() === pastDate.getDate()) {
          orders++;
          if (order.order_status === "COMPLETED") sales += order.total_amount || 0;
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
      let orders = 0, sales = 0;
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (ts.getDate() === day.getDate() && ts.getMonth() === day.getMonth() && ts.getFullYear() === day.getFullYear()) {
          orders++;
          if (order.order_status === "COMPLETED") sales += order.total_amount || 0;
        }
      });
      dataPoints.push({ label, orders, sales });
    }
  } else if (range === "Month") {
    for (let w = 1; w <= 4; w++) {
      let orders = 0, sales = 0;
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (Math.ceil(ts.getDate()/7) === w && ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear()) {
          orders++;
          if (order.order_status === "COMPLETED") sales += order.total_amount || 0;
        }
      });
      dataPoints.push({ label: `W${w}`, orders, sales });
    }
  } else {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const year = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      let orders = 0, sales = 0;
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        const ts = order.o_timestamp.toDate();
        if (ts.getMonth() === m && ts.getFullYear() === year) {
          orders++;
          if (order.order_status === "COMPLETED") sales += order.total_amount || 0;
        }
      });
      dataPoints.push({ label: months[m], orders, sales });
    }
  }
  return dataPoints;
}

export async function getItemPerformanceData(range, period = "Current", customDates = null) {
  const ordersSnap = await fetchFilteredOrders(range, period, customDates);
  const menuItems = await fetchMenuItems();
  const filtered = menuItems.filter(item => !EXCLUDED_PERFORMANCE_CATEGORIES.includes(item.category));
  const lineKeys = filtered.map(i => i.m_name.toLowerCase().replace(/\s+/g, "_"));

  if (period === "Custom" && customDates?.start && customDates?.end) {
    const { labels, matchers } = getCustomLabelsAndMatchers(customDates.start, customDates.end);
    return labels.map((label, i) => {
        const lineData = { label };
        lineKeys.forEach(k => lineData[k] = 0);
        
        ordersSnap.docs.forEach(doc => {
           const order = doc.data();
           const ts = order.o_timestamp.toDate();
           if (matchers[i](ts) && order.items && order.order_status === "COMPLETED") {
               order.items.forEach(item => {
                   const menuItem = filtered.find(m => m.m_name === item.name);
                   if (menuItem) {
                       const key = menuItem.m_name.toLowerCase().replace(/\s+/g, "_");
                       if (lineData[key] !== undefined) lineData[key] += item.qty || 0;
                   }
               });
           }
        });
        return lineData;
    });
  }

  const now = getReferenceDate(period, range);
  let labels = [];
  if (range === "Day") labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, "0")}:00`);
  else if (range === "Week") labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  else if (range === "Month") labels = ["W1","W2","W3","W4"];
  else labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return labels.map(label => {
    const lineData = { label };
    lineKeys.forEach(k => lineData[k] = 0);

    ordersSnap.docs.forEach(doc => {
      const order = doc.data();
      const ts = order.o_timestamp.toDate();
      let matches = false;

      if (range === "Day" && ts.toDateString() === now.toDateString()) {
         if (label === `${String(ts.getHours()).padStart(2, '0')}:00`) matches = true;
      }
      if (range === "Week" && ts >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) && ts <= now) {
         if (label === ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][ts.getDay()]) matches = true;
      }
      if (range === "Month" && ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear()) {
         if (label === `W${Math.ceil(ts.getDate()/7)}`) matches = true;
      }
      if (range === "Year" && ts.getFullYear() === now.getFullYear()) {
         if (label === ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][ts.getMonth()]) matches = true;
      }

      if (matches && order.items && order.order_status === "COMPLETED") {
        order.items.forEach(item => {
          const menuItem = filtered.find(m => m.m_name === item.name);
          if (!menuItem) return;
          const key = menuItem.m_name.toLowerCase().replace(/\s+/g, "_");
          if (lineData[key] !== undefined) lineData[key] += item.qty || 0;
        });
      }
    });
    return lineData;
  });
}