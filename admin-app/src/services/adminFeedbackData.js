import { db } from "../firebase"; // Adjust this path to your exact firebase config location
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

const FEEDBACK_COLLECTION = "tbl_feedback";

export function subscribeToFeedbackItems(onData, onError) {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy("f_timestamp", "desc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const feedbacks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (onData) onData(feedbacks);
    },
    (err) => {
      console.error("Feedback subscription error:", err);
      if (onError) onError(err);
    }
  );
}