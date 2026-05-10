import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminPaymentsPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";

// Auth
import { getCurrentUser } from "../services/authService";

import {
  getAllPayments,
  formatMoney,
} from "../services/adminPaymentData";

function PaymentDetailsModal({ payment, onClose }) {
  if (!payment) return null;

  return (
    <div className="ap-modalBackdrop" onClick={onClose}>
      <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ap-modalSectionTitle">Order Details</div>

        <div className="ap-modalBody">
          <div className="ap-detailsHeader">
            <div>Items</div>
            <div>Price x Quantity</div>
            <div className="ap-right">Total</div>
          </div>

          <div className="ap-detailsRows">
            {payment.orderDetails.items.length > 0 ? (
              payment.orderDetails.items.map((item, index) => {
                // Determine if item is an extra based on category
                const isAddon = ["Add-on", "Dip", "Sweetness"].includes(item.category);
                
                return (
                  <React.Fragment key={`${item.name}-${index}`}>
                    <div className={`ap-itemName ${isAddon ? "ap-is-addon" : ""}`}>
                      {item.quantity} {item.name}
                    </div>
                    <div className={`ap-itemPriceQty ${isAddon ? "ap-is-addon" : ""}`}>
                      {formatMoney(item.price)} x {item.quantity}
                    </div>
                    <div className={`ap-itemTotal ap-right ${isAddon ? "ap-is-addon" : ""}`}>
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="ap-itemName" style={{ gridColumn: "1 / -1" }}>
                No items available
              </div>
            )}
          </div>

          <div className="ap-modalSectionTitle">Payment Details</div>
          <div className="ap-paymentRow">
            <span>Method</span>
            <strong>{payment.paymentDetails.method}</strong>
          </div>
          <div className="ap-paymentRow">
            <span>Reference Number</span>
            <strong>{payment.paymentDetails.referenceNumber}</strong>
          </div>
          <div className="ap-paymentRow">
            <span>Transaction Date & Time</span>
            <strong>{payment.paymentDetails.transactionDateTime}</strong>
          </div>
          <div className="ap-paymentRow">
            <span>Total Amount Paid</span>
            <strong>{formatMoney(payment.paymentDetails.total)}</strong>
          </div>
        </div>

        <div className="ap-modalActions">
          <button className="ap-exitBtn" onClick={onClose}>
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Custom Date Range State
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  useNotificationSound();

  useEffect(() => {
    getAllPayments().then((data) => setPayments(data));
  }, []);

  const filteredPayments = useMemo(() => {
    let result = payments;
    const isCustomDateActive = customDates.start || customDates.end;

    // Filter by Custom Date Range
    if (customDates.start) {
      const startDate = new Date(`${customDates.start}T00:00:00`);
      result = result.filter(p => p.transactionDate && p.transactionDate >= startDate);
    }
    if (customDates.end) {
      const endDate = new Date(`${customDates.end}T23:59:59`);
      result = result.filter(p => p.transactionDate && p.transactionDate <= endDate);
    }

    // Filter by Search Query
    const keyword = search.toLowerCase();
    if (keyword) {
      result = result.filter((p) =>
        Object.values(p).join(" ").toLowerCase().includes(keyword)
      );
    }

    // Limit to 100 records if no custom date range is applied
    if (!isCustomDateActive) {
      result = result.slice(0, 100);
    }

    return result;
  }, [payments, search, customDates]);

  const selectedPayment = useMemo(
    () => payments.find((p) => p.id === selectedPaymentId) || null,
    [payments, selectedPaymentId]
  );

  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="ap-main">
        <AdminPageToolbar
          title="Payments"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search payments..."
        />

        {/* Custom Calendar Date Filter */}
        <div className="ap-dateFilterWrapper">
          <label>Filter by Date: </label>
          <input
            type="date"
            className="ap-dateInput"
            value={customDates.start}
            onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
          />
          <span>to</span>
          <input
            type="date"
            className="ap-dateInput"
            value={customDates.end}
            onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
          />
          <button
            className="ap-clearDateBtn"
            onClick={() => setCustomDates({ start: "", end: "" })}
          >
            Clear Range
          </button>
          
          {/* Helper text showing if the limit is currently active */}
          {!customDates.start && !customDates.end && (
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "#666" }}>
              Showing latest 100 records. Select a date range to view older data.
            </span>
          )}
        </div>

        <div className="ap-tableOuter">
          <div className="ap-tableWrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="ap-idCell">
                      <div className="ap-wrapText ap-idWrap">{payment.paymentId}</div>
                    </td>
                    <td className="ap-idCell">
                      <div className="ap-wrapText ap-idWrap">{payment.orderId}</div>
                    </td>
                    <td>{payment.method}</td>
                    <td>{formatMoney(payment.amount)}</td>
                    <td>{payment.timestamp}</td>
                    <td className="ap-detailsCell">
                      <button
                        className="ap-viewBtn"
                        onClick={() => setSelectedPaymentId(payment.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="ap-empty">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <PaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}