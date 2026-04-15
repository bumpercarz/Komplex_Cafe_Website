import React, { useState } from "react";
import { seedFirestoreUsers } from "../services/seedFirestore";

export default function FirestoreSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestoreUsers();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Seed error:", error);
      setMessage(error.message || "Failed to seed Firestore.");
      alert(error.message || "Failed to seed Firestore.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Seed Page</h1>
      <p>This will seed the <strong>tbl_user</strong> collection.</p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Users"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}