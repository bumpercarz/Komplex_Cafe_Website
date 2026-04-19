import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase.js";
import "../css/PaymentTypePage.css";
import NavBar from "../components/NavBar";
import UploadReceiptPopup from "../components/UploadReceiptPopup";

import cashCounter from "../assets/cashcounter.png";
import onlinePayment from "../assets/onlinepayment.png";

import { notifyNewOrder } from "../services/notificationService";

/* ─── Session-based guest ID ─────────────────────────────────────
   Returns the existing guest_id for this session, or null if this
   is a new guest — the counter will assign the real ID.
──────────────────────────────────────────────────────────────── */
const getSessionGuestId = () => {
  const existing = sessionStorage.getItem("guest_id");
  return existing ? Number(existing) : null;
};

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );

const generateReferenceNumber = (paymentId) => 100000 + paymentId;

export default function PaymentType() {
  const navigate = useNavigate();
  const location = useLocation();

  const { cart = [], orderType, receiveAt, instructions = "" } =
    location.state ?? {};

  const [submitting, setSubmitting]             = useState(false);
  const [error, setError]                       = useState(null);
  const [showReceiptPopup, setShowReceiptPopup] = useState(false);

  const totalAmount = cart.reduce((s, e) => s + e.lineTotal, 0);
  
  // Safely clean the table_id to prevent "null" and "NaN" crashes
  let rawTableId = sessionStorage.getItem("table_id");
  if (!rawTableId || rawTableId === "null" || rawTableId === "undefined" || rawTableId === "NaN") {
    rawTableId = null;
  }

  // FIXED: Detect Takeout immediately to override any lingering "Ghost" Table IDs
  const isTakeout = orderType && String(orderType).toLowerCase().replace(/[_ ]/g, "").includes("takeout");
  const finalTableId = isTakeout ? null : (rawTableId ? Number(rawTableId) : null);

  /* ── Core Firestore write (shared by both payment types) ── */
  const submitOrder = async (paymentType, receiptUrl = "") => {
    const existingGuestId = getSessionGuestId();
    const isNewGuest      = existingGuestId === null;

    const orderCounterRef   = doc(db, "counters", "order_id");
    const paymentCounterRef = doc(db, "counters", "payment_id");
    const guestCounterRef   = doc(db, "counters", "guest_id");

    let newOrderId, newPaymentId, guestId;

    await runTransaction(db, async (transaction) => {
      const [orderSnap, paymentSnap, guestCounterSnap] = await Promise.all([
        transaction.get(orderCounterRef),
        transaction.get(paymentCounterRef),
        isNewGuest ? transaction.get(guestCounterRef) : Promise.resolve(null),
      ]);

      newOrderId   = (orderSnap.data()?.current_value   ?? 0) + 1;
      newPaymentId = (paymentSnap.data()?.current_value ?? 0) + 1;
      guestId      = isNewGuest
        ? (guestCounterSnap.data()?.current_value ?? 0) + 1
        : existingGuestId;

      transaction.set(orderCounterRef,   { current_value: newOrderId   }, { merge: true });
      transaction.set(paymentCounterRef, { current_value: newPaymentId }, { merge: true });
      if (isNewGuest) {
        transaction.set(guestCounterRef, { current_value: guestId }, { merge: true });
      }

      const orderRef = doc(db, "tbl_orders", String(newOrderId));
      transaction.set(orderRef, clean({
        order_id:      newOrderId,
        guest_id:      guestId,
        user_id:       null,
        items: cart.flatMap((e) => [
          {
            name:  e.item?.m_name ?? "Unknown",
            price: e.item?.price  ?? 0,
            qty:   e.qty          ?? 1,
          },
          ...(e.addons ?? []).map((a) => ({
            name:  a.m_name ?? "Unknown",
            price: a.price  ?? 0,
            qty:   e.qty    ?? 1,
          })),
          ...(e.dips ?? []).map((d) => ({
            name:  d.m_name ?? "Unknown",
            price: d.price  ?? 0,
            qty:   e.qty    ?? 1,
          })),
        ]),
        total_amount:  totalAmount,
        order_status:  paymentType === 1 ? "PROCESSING PAYMENT" : "PENDING",
        order_type:    orderType ?? null,
        receive_at:    receiveAt ?? null,
        special_instructions:  instructions || null,
        table_id:      finalTableId, // Use the cleaned ID so Takeouts don't get saved with Table 1!
        receipt_image: receiptUrl,
        o_timestamp:   serverTimestamp(),
      }));

      const guestRef = doc(db, "tbl_guests", String(guestId));
      if (isNewGuest) {
        transaction.set(guestRef, {
          guest_id:     guestId,
          order_ids:    [newOrderId],
          date_ordered: serverTimestamp(),
        });
      } else {
        transaction.update(guestRef, {
          order_ids: arrayUnion(newOrderId),
        });
      }

      const paymentRef = doc(db, "tbl_payments", String(newPaymentId));
      transaction.set(paymentRef, {
        payment_id:       newPaymentId,
        order_id:         newOrderId,
        amount_paid:      totalAmount,
        payment_method:   paymentType === 1 ? "ONLINE" : "CASH",
        reference_number: generateReferenceNumber(newPaymentId),
        transaction_time: serverTimestamp(),
      });
    });

    if (isNewGuest) {
      sessionStorage.setItem("guest_id", String(guestId));
    }
    sessionStorage.setItem("active_order_id", String(newOrderId));

    // FIXED: Prioritize Takeout explicitly for the notification label!
    let label = "Counter Order";
    if (isTakeout) {
      label = "Takeout Order";
    } else if (finalTableId) {
      label = `Table ${finalTableId}`;
    }

    await notifyNewOrder({ orderId: newOrderId, tableLabel: label });

    return { newOrderId, newPaymentId };
  };

  const handleCashPayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { newOrderId, newPaymentId } = await submitOrder(0);
      navigate("/confirmation", {
        state: { orderId: newOrderId, paymentId: newPaymentId },
      });
    } catch (err) {
      console.error("Failed to submit order:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const handleReceiptSubmit = async (receiptUrl) => {
    setSubmitting(true);
    setError(null);
    try {
      const { newOrderId, newPaymentId } = await submitOrder(1, receiptUrl);
      setShowReceiptPopup(false);
      navigate("/confirmation", {
        state: { orderId: newOrderId, paymentId: newPaymentId },
      });
    } catch (err) {
      console.error("Failed to submit order:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      throw err;
    }
  };

  return (
    <div className="wrapper">
      <NavBar />

      <div className="paymenttype-page">
        <section className="paymenttype-header">
          <div className="paymenttype-hero">
            <h1 className="paymenttype-hero-title">Payment Type</h1>
          </div>
        </section>

        {error && <p className="paymenttype-error">{error}</p>}

        <section className="paymenttype-choice">
          <div className="paymenttype-buttonlayout">
            <button
              id="cash"
              value={0}
              disabled={submitting}
              onClick={handleCashPayment}
            >
              <img src={cashCounter} alt="Cash at the Counter" />
              <p className="btn-text">
                {submitting ? "Placing order…" : "Cash at the Counter"}
              </p>
            </button>

            <button
              id="online"
              value={1}
              disabled={submitting}
              onClick={() => setShowReceiptPopup(true)}
            >
              <img src={onlinePayment} alt="Online Payment" />
              <p className="btn-text">Online Payment</p>
            </button>
          </div>
        </section>
      </div>

      {showReceiptPopup && (
        <UploadReceiptPopup
          onClose={() => setShowReceiptPopup(false)}
          onSubmit={handleReceiptSubmit}
        />
      )}
    </div>
  );
}