import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminOrderPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";

import OrderTabs from "../components/orders/OrderTabs";
import OrderCard from "../components/orders/OrderCard";

import { useNotificationSound } from "../hooks/useNotificationSound";
import { subscribeToOrders } from "../services/adminOrderData";

// NEW: import current user auth
import { getCurrentUser } from "../services/authService";

import {
  ORDER_TABS,
  STATUS_OPTIONS,
  getOrdersByTab,
  updateOrderStatusRecord,
} from "../services/adminOrderData";

export default function AdminOrderPage() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ordersSource, setOrdersSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // NEW: current user state
  const [currentUser, setCurrentUser] = useState(null);

  // NEW: load current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // CHANGED: dynamic role instead of hardcoded ADMIN
  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeToOrders(
      (data) => {
        setOrdersSource(data);
        setLoading(false);
      },
      (error) => {
        console.error("Orders listener error:", error);
        setMessage(error?.message || "Failed to listen to orders.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  async function handleStatusChange(orderId, newStatus, receiptFile) {
    try {
      const result = await updateOrderStatusRecord(
        orderId,
        newStatus,
        receiptFile
      );

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setOrdersSource((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                ...(receiptFile && {
                  receiptImage: URL.createObjectURL(receiptFile),
                }),
              }
            : order
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

  useNotificationSound();

  return (
    <div className="ad-root">
      {/* CHANGED: dynamic roleLabel instead of "ADMIN" */}
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

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

              return (
                <OrderCard
                  key={o.id}
                  order={o}
                  activeTab={activeTab}
                  isOpen={open}
                  status={o.status}
                  onToggle={() => setExpandedId(open ? null : o.id)}
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