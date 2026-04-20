import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminOrderPage.css";

import StaffTopbar from "../components/StaffTopbar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import OrderTabs from "../components/orders/OrderTabs";
import OrderCard from "../components/orders/OrderCard";

import {
  ORDER_TABS,
  STATUS_OPTIONS,
  subscribeToOrders,
  getOrdersByTab,
  updateOrderStatusRecord,
} from "../services/adminOrderData";

import { useNotificationSound } from "../hooks/useNotificationSound";

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [ordersSource, setOrdersSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const { unreadOrderNotifs, dismissToast } = useNotificationSound("STAFF");

  useEffect(() => {
    setLoading(true);
    const unsubscribeOrders = subscribeToOrders(
      (data) => {
        setOrdersSource(data);
        setLoading(false);
      },
      (error) => {
        console.error("Staff listener error:", error);
        setMessage(error?.message || "Failed to listen to orders.");
        setLoading(false);
      }
    );

    return () => unsubscribeOrders();
  }, []);

  const orders = useMemo(() => {
    const byTab = getOrdersByTab(ordersSource, activeTab);
    const q = search.trim().toLowerCase();
    if (!q) return byTab;

    return byTab.filter((o) => {
      return (
        String(o.id ?? "").toLowerCase().includes(q) ||
        String(o.customerName ?? "").toLowerCase().includes(q) ||
        String(o.tableNumber ?? "").toLowerCase().includes(q) ||
        String(o.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [ordersSource, activeTab, search]);

  async function handleStatusChange(orderId, newStatus) {
    try {
      const result = await updateOrderStatusRecord(orderId, newStatus);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setOrdersSource((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      setExpandedId((prev) => (prev === orderId ? null : prev));

      if (newStatus === "COMPLETED" || newStatus === "CANCELLED") {
        setActiveTab("Finished");
      }
    } catch (error) {
      console.error("Update status error:", error);
      setMessage(error?.message || "Failed to update order status.");
    }
  }

  async function handleToggleCard(orderId, isOpen) {
    if (!isOpen) {
      setExpandedId(orderId);
      const relatedNotifs = unreadOrderNotifs.filter(
        (n) => String(n.order_id) === String(orderId)
      );
      for (const notif of relatedNotifs) {
        await dismissToast(notif.id);
      }
    } else {
      setExpandedId(null);
    }
  }

  return (
    <div className="ad-root">
      <StaffTopbar roleLabel="STAFF" />
      <main className="ao-main">
        <AdminPageToolbar
          title="Orders"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search orders"
        />

        <OrderTabs
          tabs={ORDER_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {message ? <div className="ao-empty">{message}</div> : null}
        {loading ? <div className="ao-empty">Loading orders...</div> : null}

        {!loading && (
          <div className="ao-list">
            {orders.map((o) => {
              const open = expandedId === o.id;
              const isNewOrder = unreadOrderNotifs.some(
                (n) => String(n.order_id) === String(o.id)
              );

              return (
                <OrderCard
                  key={o.id}
                  order={o}
                  activeTab={activeTab}
                  isOpen={open}
                  status={o.status}
                  isNew={isNewOrder}
                  onToggle={() => handleToggleCard(o.id, open)}
                  statusOptions={STATUS_OPTIONS}
                  onStatusChange={handleStatusChange}
                />
              );
            })}

            {orders.length === 0 && (
              <div className="ao-empty">
                No {activeTab.toLowerCase()} orders yet.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}