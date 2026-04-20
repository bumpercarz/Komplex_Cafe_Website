import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc, runTransaction, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase.js";
import "../css/QRPage.css";
import NavBar from "../components/NavBar";
import UploadReceiptPopup from "../components/UploadReceiptPopup";
import { notifyNewOrder } from "../services/notificationService";

import komplexQR from "../assets/komplexQR.jpg";

const getSessionGuestId = () => {
  const existing = sessionStorage.getItem("guest_id");
  return existing ? Number(existing) : null;
};

const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const generateReferenceNumber = (paymentId) => 100000 + paymentId;

export default function QRPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const { cart = [], orderType, receiveAt, instructions = "" } = location.state ?? {};

    const [showUpload, setShowUpload] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]           = useState(null);
    const qrRef                       = useRef(null);

    const totalAmount = cart.reduce((s, e) => s + e.lineTotal, 0);
    const tableId = sessionStorage.getItem("table_id");

    const handleDownloadQR = () => {
        const img = qrRef.current;
        if (!img) return;

        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const link = document.createElement("a");
        link.download = "komplex-cafe-qr.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    const submitOrder = async (receiptUrl = "") => {
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
                order_id:     newOrderId,
                guest_id:     guestId,
                user_id:      null,
                items: cart.flatMap((e) => [
                    {
                      name: e.item?.m_name ?? "Unknown",
                      price: e.item?.price ?? 0,
                      qty: e.qty ?? 1,
                      ...(e.temperature ? { temperature: e.temperature } : {}),
                    },
                    ...(e.addons ?? []).map((a) => ({ name: a.m_name ?? "Unknown", price: a.price ?? 0, qty: e.qty ?? 1 })),
                    ...(e.dips   ?? []).map((d) => ({ name: d.m_name ?? "Unknown", price: d.price ?? 0, qty: e.qty ?? 1 })),
                    ...(e.sweetness ?? []).map((s) => ({ name: s.m_name ?? "Unknown", price: s.price ?? 0, qty: e.qty ?? 1 })),
                ]),
                total_amount:         totalAmount,
                order_status:         "PROCESSING PAYMENT",
                order_type:           orderType ?? null,
                receive_at:           receiveAt ?? null,
                special_instructions: instructions || null,
                table_id:             tableId ? Number(tableId) : null,
                receipt_image:        receiptUrl,
                o_timestamp:          serverTimestamp(),
            }));

            const guestRef = doc(db, "tbl_guests", String(guestId));
            if (isNewGuest) {
                transaction.set(guestRef, {
                    guest_id:     guestId,
                    order_ids:    [newOrderId],
                    date_ordered: serverTimestamp(),
                });
            } else {
                transaction.update(guestRef, { order_ids: arrayUnion(newOrderId) });
            }

            const paymentRef = doc(db, "tbl_payments", String(newPaymentId));
            transaction.set(paymentRef, {
                payment_id:       newPaymentId,
                order_id:         newOrderId,
                amount_paid:      totalAmount,
                payment_method:   "ONLINE",
                reference_number: generateReferenceNumber(newPaymentId),
                transaction_time: serverTimestamp(),
            });
        });

        if (isNewGuest) sessionStorage.setItem("guest_id", String(guestId));
        sessionStorage.setItem("active_order_id", String(newOrderId));

        const tableLabel = orderType === "take_out"
            ? "Take Out"
            : tableId ? `Table ${tableId}` : "Unknown Table";
        await notifyNewOrder({ orderId: newOrderId, tableLabel });

        return { newOrderId, newPaymentId };
    };

    const handleSubmitReceipt = async (receiptUrl) => {
        setSubmitting(true);
        setError(null);
        try {
            const { newOrderId, newPaymentId } = await submitOrder(receiptUrl);
            setShowUpload(false);
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
        <div className="qr-wrapper">
            <NavBar />

            <div className="qr-page">
                <section className="qr-white">
                    <h2 className="qr-header">Instapay</h2>
                    <img ref={qrRef} src={komplexQR} alt="QR Code" crossOrigin="anonymous" />

                    <p className="qr-subtitle">We accept Gcash and PayMaya!</p>

                    {error && <p className="qr-error">{error}</p>}

                    <div className="qr-btns">
                        <button className="qr-download" onClick={handleDownloadQR}>Download QR</button>
                        <button
                            className="qr-upload"
                            disabled={submitting}
                            onClick={() => setShowUpload(true)}
                        >
                            {submitting ? "Submitting…" : "Upload Receipt Image"}
                        </button>
                    </div>
                </section>
            </div>

            {showUpload && (
                <UploadReceiptPopup
                    onClose={() => setShowUpload(false)}
                    onSubmit={handleSubmitReceipt}
                />
            )}
        </div>
    );
}