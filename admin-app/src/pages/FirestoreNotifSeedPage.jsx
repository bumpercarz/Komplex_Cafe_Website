import React, { useState } from "react";
import { seedFirestoreNotifications } from "../services/seedFirestoreNotifications";

export default function FirestoreNotifSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestoreNotifications();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Seed notifications error:", error);
      setMessage(error.message || "Failed to seed notifications.");
      alert(error.message || "Failed to seed notifications.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Notification Seed Page</h1>
      <p>
        This will seed the <strong>tbl_notifs</strong> collection.
      </p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Notifications"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}