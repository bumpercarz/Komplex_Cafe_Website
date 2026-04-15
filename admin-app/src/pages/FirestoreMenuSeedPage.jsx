import React, { useState } from "react";
import { seedFirestoreMenuItems } from "../services/seedMenuFirestore";

export default function FirestoreMenuSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSeed() {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestoreMenuItems();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Menu seed error:", error);
      const errorMessage = error?.message || "Failed to seed menu items.";
      setMessage(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Menu Seed Page</h1>
      <p>This will seed the <strong>tbl_menuItems</strong> collection.</p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Menu Items"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}