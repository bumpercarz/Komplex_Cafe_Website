import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { FaCoffee, FaCheckCircle, FaSpinner, FaBell, FaTimesCircle, FaClock } from "react-icons/fa";
import "../css/ConfirmationPage.css";
import NavBar from "../components/NavBar";

/* ── Status config ── */
const STATUS_CONFIG = {
  "PENDING": {
    icon:    <FaClock size={50} />,
    header:  "Your order has been placed!",
    sub:     "We're waiting to confirm your order. Please pay at the counter. Do not leave or close this page.",
  },
  "PROCESSING PAYMENT": {
    icon:    <FaSpinner size={50} className="spin" />,
    header:  "Processing your payment…",
    sub:     "Please wait while we verify your payment. Do not leave or close this page.",
  },
  "PREPARING": {
    icon:    <FaCoffee size={50} />,
    header:  "Your order is being prepared!",
    sub:     "Our team is working on your order. Do not leave or close this page.",
  },
  "AWAITING PICK-UP": {
    icon:    <FaBell size={50} />,
    header:  "Your order is ready!",
    sub:     "Please proceed to the counter to pick up your order. You are free to close this page.",
  },
  "COMPLETED": {
    icon:    <FaCheckCircle size={50} />,
    header:  "Order completed!",
    sub:     "Thank you for your order. You are free to close this page. Enjoy!",
  },
  "CANCELLED": {
    icon:    <FaTimesCircle size={50} />,
    header:  "Order cancelled.",
    sub:     "Your order has been canceled. Please contact staff for assistance.",
  },
};

const FALLBACK = {
  icon:   <FaCoffee size={50} />,
  header: "Your order has been placed!",
  sub:    "Please save this reference number to claim your order.",
};



export default function ConfirmationPage() {
  const location  = useLocation();
  const { orderId, paymentId } = location.state ?? {};

  const [orderStatus,     setOrderStatus]     = useState(null);
  const [referenceNumber, setReferenceNumber] = useState(null);

  /* ── Real-time listener on tbl_orders ── */
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, "tbl_orders", String(orderId));
    const unsub = onSnapshot(orderRef, (snap) => {
      if (!snap.exists()) return;
      const status = snap.data().order_status ?? null;
      setOrderStatus(status);
r
      // Clear active order from session when done
      if (status === "COMPLETED" || status === "CANCELLED") {
        sessionStorage.removeItem("active_order_id");
      }
    });

    return () => unsub();
  }, [orderId]);

  /* ── One-time read for reference number from tbl_payments ── */
  useEffect(() => {
    if (!paymentId) return;

    const paymentRef = doc(db, "tbl_payments", String(paymentId));
    const unsub = onSnapshot(paymentRef, (snap) => {
      if (!snap.exists()) return;
      setReferenceNumber(snap.data().reference_number ?? null);
    });

    return () => unsub();
  }, [paymentId]);

  const { icon, header, sub } = STATUS_CONFIG[orderStatus] ?? FALLBACK;

  return (
    <div className="confirmation-wrapper">
      <NavBar />

      <div className="confirmation-page">
        <section className="confirmation-white">
          <div className="confirmation-border">
            <span className="coffee-icon">{icon}</span>

            <h2 className="confirmation-header">{header}</h2>

            {referenceNumber && (
              <p className="reference-number">REF NO. {referenceNumber}</p>
            )}

            <p className="confirmation-subtitle">{sub}</p>
          </div>
        </section>
      </div>
    </div>
  );
}