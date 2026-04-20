import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { FaCoffee, FaCheckCircle, FaSpinner, FaBell, FaTimesCircle, FaClock } from "react-icons/fa";
import "../css/ConfirmationPage.css";
import NavBar from "../components/NavBar";
import FeedbackModal from "../components/FeedbackModal";

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

/* ── Addon/dip/sweetness keywords to detect indented items ── */
const INDENT_CATEGORIES = ["add-on", "addon", "dip", "sweetness", "syrup", "extra"];

/* ── Helpers to bucket raw items array from Firestore ── */
const isIndentItem = (name = "") =>
  INDENT_CATEGORIES.some((k) => name.toLowerCase().includes(k));

/**
 * Groups the flat items array saved in Firestore into:
 * [ { main: {name,price,qty}, subs: [{name,price,qty}] } ]
 *
 * Strategy: every item whose name does NOT look like an add-on/dip/sweetness
 * starts a new group; subsequent items that do look like one are attached as subs.
 */
const groupItems = (items = []) => {
  const groups = [];
  items.forEach((item) => {
    if (!isIndentItem(item.name) ) {
      groups.push({ main: item, subs: [] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].subs.push(item);
    } else {
      // Edge case: sub with no parent
      groups.push({ main: item, subs: [] });
    }
  });
  return groups;
};

const fmt = (n) => `₱${Number(n ?? 0).toFixed(2)}`;

/* ── Feedback Modal ── */
export default function ConfirmationPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { orderId, paymentId } = location.state ?? {};

  const [orderStatus,     setOrderStatus]     = useState(null);
  const [referenceNumber, setReferenceNumber] = useState(null);
  const [orderItems,      setOrderItems]      = useState([]);
  const [totalAmount,     setTotalAmount]     = useState(null);
  const [showFeedback,    setShowFeedback]    = useState(false);

  const isDone = orderStatus === "COMPLETED" || orderStatus === "CANCELLED";
  const isDoneRef = useRef(isDone);
  useEffect(() => { isDoneRef.current = isDone; }, [isDone]);

  /* ── Block browser back button until order is done ── */
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      if (isDoneRef.current) {
        navigate("/menu", { replace: true });
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  /* ── Real-time listener on tbl_orders ── */
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, "tbl_orders", String(orderId));
    const unsub = onSnapshot(orderRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const status = data.order_status ?? null;
      setOrderStatus(status);
      setOrderItems(data.items ?? []);
      setTotalAmount(data.total_amount ?? null);

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
  const groups = groupItems(orderItems);

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

            {/* ── Order Summary ── */}
            {groups.length > 0 && (
              <div className="order-summary">
                <h3 className="order-summary-title">Order Summary</h3>
                <div className="order-summary-list">
                  {groups.map((group, i) => (
                    <div key={i} className="order-summary-group">
                      {/* Main item */}
                      <div className="order-summary-row order-summary-main">
                        <span className="order-summary-qty">×{group.main.qty ?? 1}</span>
                        <span className="order-summary-name">{group.main.name}</span>
                        <span className="order-summary-price">{fmt(group.main.price * (group.main.qty ?? 1))}</span>
                      </div>
                      {/* Indented subs */}
                      {group.subs.map((sub, j) => (
                        <div key={j} className="order-summary-row order-summary-sub">
                          <span className="order-summary-qty">×{sub.qty ?? 1}</span>
                          <span className="order-summary-name">{sub.name}</span>
                          <span className="order-summary-price">{fmt(sub.price * (sub.qty ?? 1))}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="order-summary-total">
                  <span>Total</span>
                  <span>{fmt(totalAmount)}</span>
                </div>
              </div>
            )}

            {isDone && (
              <div className="fb-trigger-wrap">
                <p className="fb-trigger-label">How was your experience?</p>
                <button
                  className="fb-trigger-btn"
                  onClick={() => setShowFeedback(true)}
                >
                  Send Feedback
                </button>
                <button
                  className="fb-trigger-btn fb-back-btn"
                  onClick={() => navigate("/menu", { replace: true })}
                >
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}