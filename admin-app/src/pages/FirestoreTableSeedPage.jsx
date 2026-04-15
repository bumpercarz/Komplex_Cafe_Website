import React, { useState } from "react";
import { seedFirestoreTables } from "../services/seedFirestoreTables";

export default function FirestoreTableSeedPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await seedFirestoreTables();
      setMessage(result.message);
      alert(result.message);
    } catch (error) {
      console.error("Seed tables error:", error);
      setMessage(error.message || "Failed to seed tables.");
      alert(error.message || "Failed to seed tables.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Firestore Table Seed Page</h1>
      <p>
        This will seed the <strong>tbl_table</strong> collection.
      </p>

      <button onClick={handleSeed} disabled={loading}>
        {loading ? "Seeding..." : "Seed Tables"}
      </button>

      {message ? <p style={{ marginTop: "16px" }}>{message}</p> : null}
    </div>
  );
}