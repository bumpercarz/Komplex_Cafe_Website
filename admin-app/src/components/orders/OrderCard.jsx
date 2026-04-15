import React from "react";
import OrderDetails from "./OrderDetails";
import { formatDate, formatTime } from "../../services/adminOrderData";

export default function OrderCard({
  order,
  isOpen,
  onToggle,
  status,
  activeTab,
  statusOptions,
  onStatusChange,
}) {
  return (
    <section className="ao-card">
      {/* Orange header strip */}
      <button type="button" className="ao-cardTop" onClick={onToggle}>
        <div className="ao-cardTopLeft">
          <div className="ao-orderId">ORDER ID: {order.id}</div>

          <div className="ao-row">
            <span className="ao-label">TABLE ID:</span>
            <span className="ao-value">{order.tableId}</span>
          </div>

          <div className="ao-row">
            <span className="ao-label">ORDER STATUS:</span>
            <span className="ao-value">{status}</span>
          </div>
        </div>

        <div className="ao-cardTopRight">
          <div className="ao-time">
            <span className="ao-clock">🕘</span>
            <span>{formatTime(order.createdAt)}</span>
            <span className="ao-date">{formatDate(order.createdAt)}</span>
          </div>
          <div className="ao-chevron"> <span>{isOpen ? "Click Box to view order details" : "Click Box to close order details"}</span></div>
          <div className="ao-chevron2"> <span>{isOpen ? "˄" : "˅"}</span></div>
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <OrderDetails
          order={order}
          status={status}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
        />
      )}
    </section>
  );
}