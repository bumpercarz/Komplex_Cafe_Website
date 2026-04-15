import React, { useState } from "react";
import { seedFirestorePayments } from "../services/seedFirestorePayments";

export default function FirestorePaymentSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestorePayments();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Seed payments error:", error);
      setMessage(error.message || "Failed to seed payments.");
      alert(error.message || "Failed to seed payments.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Payment Seed Page</h1>
      <p>
        This will seed the <strong>tbl_payments</strong> collection.
      </p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Payments"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}