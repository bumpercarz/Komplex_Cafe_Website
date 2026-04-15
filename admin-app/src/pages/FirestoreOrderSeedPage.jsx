import React, { useState } from "react";
import { seedFirestoreOrders } from "../services/seedOrdersFirestore";

export default function FirestoreOrderSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSeed() {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestoreOrders();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Order seed error:", error);
      const errorMessage = error?.message || "Failed to seed orders.";
      setMessage(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Orders Seed Page</h1>
      <p>
        This will seed the <strong>tbl_orders</strong> collection with{" "}
        <strong>order_type</strong>, <strong>special_instructions</strong>, and{" "}
        <strong>table_id</strong>.
      </p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Orders"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}