import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

const GUESTS_COLLECTION  = "tbl_guests";
const COUNTERS_COLLECTION = "counters";
const GUEST_COUNTER_DOC  = "guest_id"; // matches counters/guest_id

export async function createGuest({ order_id = null } = {}) {
  const guestId = await runTransaction(db, async (transaction) => {
    const counterRef  = doc(db, COUNTERS_COLLECTION, GUEST_COUNTER_DOC);
    const counterSnap = await transaction.get(counterRef);

    const nextGuestId = (counterSnap.data()?.current_value ?? 0) + 1;
    transaction.update(counterRef, { current_value: nextGuestId });

    const guestRef = doc(db, GUESTS_COLLECTION, String(nextGuestId));
    transaction.set(guestRef, {
      guest_id:     nextGuestId,
      order_ids:    order_id != null ? [Number(order_id)] : [], // ← array
      date_ordered: serverTimestamp(),
    });

    return nextGuestId;
  });

  return guestId;
}

/* Append a new order_id to an existing guest's order_ids array */
export async function addOrderToGuest(guestId, orderId) {
  const guestRef = doc(db, GUESTS_COLLECTION, String(guestId));
  // arrayUnion ensures no duplicates and is atomic
  await import("firebase/firestore").then(({ updateDoc }) =>
    updateDoc(guestRef, { order_ids: arrayUnion(Number(orderId)) })
  );
}

export async function getGuests() {
  const q = query(
    collection(db, GUESTS_COLLECTION),
    orderBy("guest_id", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}