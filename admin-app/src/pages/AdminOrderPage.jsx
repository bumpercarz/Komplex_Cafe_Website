import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminOrderPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";

import OrderTabs from "../components/orders/OrderTabs";
import OrderCard from "../components/orders/OrderCard";

import { useNotificationSound } from "../hooks/useNotificationSound";
import { getCurrentUser } from "../services/authService";

import {
  ORDER_TABS,
  STATUS_OPTIONS,
  updateOrderStatusRecord,
  subscribeToOrders,
} from "../services/adminOrderData";

export default function AdminOrderPage() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ordersSource, setOrdersSource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  const { unreadOrderNotifs, dismissToast } = useNotificationSound("ADMIN");

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToOrders(
      (data) => {
        setOrdersSource(data);
        setLoading(false);
        setMessage("");
      },
      (error) => {
        console.error("Load orders error:", error);
        setMessage(error?.message || "Failed to load orders.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const orders = useMemo(() => {
    let filtered = ordersSource;

    if (activeTab === "Pending") {
      filtered = filtered.filter(
        (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
      );
    } else {
      filtered = filtered.filter(
        (o) => o.status === "COMPLETED" || o.status === "CANCELLED"
      );
    }

    const keyword = search.trim().toLowerCase();
    if (keyword) {
      filtered = filtered.filter((o) => {
        const idStr = String(o.id || "").toLowerCase();
        const statStr = String(o.status || "").toLowerCase();
        const typeStr = String(o.orderType || "").toLowerCase();
        const tblStr = String(o.tableNumber || "").toLowerCase();

        const itemStr = (o.items || [])
          .map((it) => it.name)
          .join(" ")
          .toLowerCase();

        return (
          idStr.includes(keyword) ||
          statStr.includes(keyword) ||
          typeStr.includes(keyword) ||
          tblStr.includes(keyword) ||
          itemStr.includes(keyword)
        );
      });
    }

    return filtered;
  }, [ordersSource, activeTab, search]);

  function handleToggleCard(id, currentlyOpen) {
    if (currentlyOpen) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      dismissToast(id);
    }
  }

  // NEW: Added the cancelReason parameter
  async function handleStatusChange(orderId, newStatus, cancelReason = null) {
    const currentOrder = ordersSource.find((o) => o.id === orderId);
    if (!currentOrder) return;

    // Pass the reason into the database function
    const result = await updateOrderStatusRecord(
      orderId,
      newStatus,
      currentUser?.name || roleLabel,
      currentOrder.status,
      cancelReason 
    );

    if (!result.ok) {
      alert(result.message);
    }
  }

  return (
    <div className="ad-root">
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