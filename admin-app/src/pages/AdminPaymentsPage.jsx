import React, { useEffect, useMemo, useState } from "react";
import "../css/AdminPaymentsPage.css";

import AdminTopbar from "../components/AdminTopbar";
import AdminSidebar from "../components/AdminSidebar";
import AdminPageToolbar from "../components/AdminPageToolbar";
import { useNotificationSound } from "../hooks/useNotificationSound";

// NEW: import current user auth
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
              payment.orderDetails.items.map((item, index) => (
                <React.Fragment key={`${item.name}-${index}`}>
                  <div className="ap-itemName">
                    {item.quantity} {item.name}
                  </div>
                  <div className="ap-itemPriceQty">
                    {formatMoney(item.price)} × {item.quantity}
                  </div>
                  <div className="ap-itemTotal ap-right">
                    {formatMoney(item.price * item.quantity)}
                  </div>
                </React.Fragment>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", padding: "12px 0" }}>
                No order item details found.
              </div>
            )}
          </div>

          <div className="ap-totalDivider" />

          <div className="ap-totalRow">
            <span>Total</span>
            <strong>{formatMoney(payment.amount)}</strong>
          </div>
        </div>

        <div className="ap-modalSectionTitle">Payment Details</div>

        <div className="ap-paymentBody">
          <div className="ap-paymentRow">
            <span>Method</span>
            <strong>{payment.paymentDetails.method}</strong>
          </div>

          <div className="ap-paymentRow">
            <span>Total</span>
            <strong>{formatMoney(payment.paymentDetails.total)}</strong>
          </div>

          <div className="ap-paymentRow">
            <span>Transaction Date &amp; Time</span>
            <strong>{payment.paymentDetails.transactionDateTime}</strong>
          </div>

          <div className="ap-paymentRow">
            <span>Reference Number</span>
            <strong>{payment.paymentDetails.referenceNumber}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const role = currentUser?.role || "STAFF";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  async function reloadPayments() {
    setLoading(true);
    setMessage("");

    try {
      const data = await getAllPayments();
      setPayments(data);
    } catch (error) {
      console.error("Load payments error:", error);
      setMessage(error?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return payments;

    return payments.filter((payment) => {
      return (
        payment.paymentId.toLowerCase().includes(keyword) ||
        payment.orderId.toLowerCase().includes(keyword) ||
        payment.method.toLowerCase().includes(keyword) ||
        payment.timestamp.toLowerCase().includes(keyword) ||
        String(payment.amount).includes(keyword)
      );
    });
  }, [payments, search]);

  const selectedPayment = useMemo(() => {
    return payments.find((payment) => payment.id === selectedPaymentId) || null;
  }, [payments, selectedPaymentId]);
  
  useNotificationSound();
  
  return (
    <div className="ad-root">
      <AdminTopbar roleLabel={roleLabel} onMenuClick={() => setMenuOpen(true)} />
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="ap-main">
        <AdminPageToolbar
          title="Payments"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search"
        />

        {message ? <div className="ap-empty">{message}</div> : null}
        {loading ? <div className="ap-empty">Loading payments...</div> : null}

        {!loading && (
          /* ADDED OUTER WRAPPER FOR CLEAN SCROLLBARS AND BORDERS */
          <div className="ap-tableOuter">
            <div className="ap-tableWrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th className="ap-idCell">Payment ID</th>
                    <th className="ap-idCell">Order ID</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      {/* Wrap text in specific divs to respect max-width and force wrap on long IDs */}
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
        )}
      </main>

      <PaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPaymentId(null)}
      />
    </div>
  );
}