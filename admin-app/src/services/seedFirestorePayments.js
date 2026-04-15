import { db } from "../firebase";
import { writeBatch, doc, Timestamp } from "firebase/firestore";

const PAYMENTS_COLLECTION = "tbl_payments";

function minutesAgo(minutes) {
  return Timestamp.fromDate(new Date(Date.now() - minutes * 60 * 1000));
}

const DEFAULT_PAYMENTS = [
  {
    id: 1,
    orderId: 1,
    amountPaid: 115,
    paymentMethod: "CASH",
    transactionTime: minutesAgo(40),
    referenceNumber: 100001,
  },
  {
    id: 2,
    orderId: 2,
    amountPaid: 240,
    paymentMethod: "GCASH",
    transactionTime: minutesAgo(25),
    referenceNumber: 100002,
  },
  {
    id: 3,
    orderId: 3,
    amountPaid: 355,
    paymentMethod: "CARD",
    transactionTime: minutesAgo(15),
    referenceNumber: 100003,
  },
  {
    id: 4,
    orderId: 4,
    amountPaid: 180,
    paymentMethod: "CASH",
    transactionTime: minutesAgo(5),
    referenceNumber: 100004,
  },
];

export async function seedFirestorePayments() {
  const batch = writeBatch(db);

  DEFAULT_PAYMENTS.forEach((payment) => {
    const ref = doc(db, PAYMENTS_COLLECTION, String(payment.id));

    batch.set(ref, {
      payment_id: payment.id,
      order_id: payment.orderId,
      amount_paid: payment.amountPaid,
      payment_method: payment.paymentMethod,
      transaction_time: payment.transactionTime,
      reference_number: payment.referenceNumber,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_payments seeded successfully.",
  };
}