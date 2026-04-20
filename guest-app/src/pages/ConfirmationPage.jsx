import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { FaCoffee, FaCheckCircle, FaSpinner, FaBell, FaTimesCircle, FaClock } from "react-icons/fa";
import "../css/ConfirmationPage.css";
import NavBar from "../components/NavBar";
import FeedbackModal from "../components/FeedbackModal";

/* ── Guest-side notification sound (plays when order status changes) ── */
function playStatusChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Two-tone chime: low then high
    [[523.25, 0], [783.99, 0.18]].forEach(([freq, when]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + 0.5);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + 0.5);
    });
  } catch (_) {}
}

function sendGuestBrowserNotif(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch (_) {}
}

async function requestNotifPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

/* ── Status config ── */
const STATUS_CONFIG = {
  "PENDING": {
    icon:    <FaSpinner size={50} className="spin" />,
    header:  "Processing your payment…",
    sub:     "Please wait while we confirm your order. Please pay at the counter. Do not leave or close this page.",
  },
  "PROCESSING PAYMENT": {
    icon:    <FaSpinner size={50} className="spin" />,
    header:  "Processing your payment…",
    sub:     "Please wait while we confirm your payment. Do not leave or close this page.",
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

const groupItems = (items = []) => {
  const groups = [];
  items.forEach((item) => {
    if (!item.sub) {
      groups.push({ main: item, subs: [] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].subs.push(item);
    } else {
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
  const { orderId: stateOrderId, paymentId: statePaymentId } = location.state ?? {};

  // Fall back to sessionStorage on refresh
  const orderId   = stateOrderId   ?? (sessionStorage.getItem("confirmation_order_id")   ? Number(sessionStorage.getItem("confirmation_order_id"))   : null);
  const paymentId = statePaymentId ?? (sessionStorage.getItem("confirmation_payment_id") ? Number(sessionStorage.getItem("confirmation_payment_id")) : null);

  // Persist whenever we have fresh values from navigation state
  useEffect(() => {
    if (stateOrderId)   sessionStorage.setItem("confirmation_order_id",   String(stateOrderId));
    if (statePaymentId) sessionStorage.setItem("confirmation_payment_id", String(statePaymentId));
  }, [stateOrderId, statePaymentId]);

  const [orderStatus,     setOrderStatus]     = useState(null);
  const [referenceNumber, setReferenceNumber] = useState(null);
  const [orderItems,      setOrderItems]      = useState([]);
  const [totalAmount,     setTotalAmount]     = useState(null);
  const [showFeedback,    setShowFeedback]    = useState(false);
  const [statusToast,     setStatusToast]     = useState(null); // { message, colorClass }

  const prevStatusRef = useRef(null);  // track previous status to detect changes

  const isDone = orderStatus === "COMPLETED" || orderStatus === "CANCELLED";
  const isDoneRef = useRef(isDone);
  useEffect(() => { isDoneRef.current = isDone; }, [isDone]);

  /* ── Request browser notification permission on page load ── */
  useEffect(() => {
    requestNotifPermission();
  }, []);

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

      // ── Play chime + browser notification when status changes (not on first load) ──
      if (prevStatusRef.current !== null && status !== prevStatusRef.current) {
        playStatusChime();
        const cfg = STATUS_CONFIG[status];
        if (cfg) {
          sendGuestBrowserNotif(cfg.header, cfg.sub);

          // In-page toast
          const colorMap = {
            "PREPARING":       "toast-preparing",
            "AWAITING PICK-UP":"toast-ready",
            "COMPLETED":       "toast-done",
            "CANCELLED":       "toast-cancelled",
          };
          setStatusToast({ message: cfg.header, colorClass: colorMap[status] ?? "" });
          setTimeout(() => setStatusToast(null), 4000);
        }
      }
      prevStatusRef.current = status;

      setOrderStatus(status);
      setOrderItems(data.items ?? []);
      setTotalAmount(data.total_amount ?? null);

      if (status === "COMPLETED" || status === "CANCELLED") {
        sessionStorage.removeItem("active_order_id");
        sessionStorage.removeItem("confirmation_order_id");
        sessionStorage.removeItem("confirmation_payment_id");
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

      {/* ── In-page status-change toast ── */}
      <div className={`guest-status-toast ${statusToast?.colorClass ?? ""} ${statusToast ? "visible" : ""}`}>
        {statusToast?.message}
      </div>

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