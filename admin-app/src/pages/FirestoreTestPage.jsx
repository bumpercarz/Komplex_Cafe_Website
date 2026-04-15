import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

const GUESTS_COLLECTION = "tbl_guests";
const COUNTERS_COLLECTION = "counters";
const GUEST_COUNTER_DOC = "guest_counter";

export async function createGuest({ order_id = null } = {}) {
  const guestId = await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, COUNTERS_COLLECTION, GUEST_COUNTER_DOC);
    const counterSnap = await transaction.get(counterRef);

    let nextGuestId = 1;

    if (!counterSnap.exists()) {
      transaction.set(counterRef, { last_guest_id: 1 });
    } else {
      const currentLastId = Number(counterSnap.data()?.last_guest_id || 0);
      nextGuestId = currentLastId + 1;
      transaction.update(counterRef, { last_guest_id: nextGuestId });
    }

    const guestRef = doc(db, GUESTS_COLLECTION, String(nextGuestId));

    transaction.set(guestRef, {
      guest_id: nextGuestId,
      order_id: order_id == null ? null : Number(order_id),
      date_ordered: serverTimestamp(),
    });

    return nextGuestId;
  });

  return guestId;
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