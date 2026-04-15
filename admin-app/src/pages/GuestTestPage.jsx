import React, { useEffect, useState } from "react";
import { createGuest, getGuests } from "../services/guestService";

function formatDate(value) {
  if (!value) return "N/A";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

export default function GuestTestPage() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadGuests() {
    try {
      const data = await getGuests();
      setGuests(data);
    } catch (error) {
      console.error("Load guests error:", error);
      setMessage(error?.message || "Failed to load guests.");
    }
  }

  useEffect(() => {
    loadGuests();
  }, []);

  async function handleCreateGuest() {
    setLoading(true);
    setMessage("");

    try {
      const cleaned = orderIdInput.trim();
      const guestId = await createGuest({
        order_id: cleaned === "" ? null : Number(cleaned),
      });

      setMessage(`Guest ${guestId} created successfully.`);
      setOrderIdInput("");
      await loadGuests();
    } catch (error) {
      console.error("Create guest error:", error);
      setMessage(error?.message || "Failed to create guest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Guest Test Page</h1>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Order ID (optional)
        </label>
        <input
          type="number"
          value={orderIdInput}
          onChange={(e) => setOrderIdInput(e.target.value)}
          placeholder="Enter numeric order id"
          style={{ padding: "8px", width: "240px", marginRight: "12px" }}
        />

        <button onClick={handleCreateGuest} disabled={loading}>
          {loading ? "Creating..." : "Create Guest"}
        </button>
      </div>

      {message ? <p>{message}</p> : null}

      <h2>Guests</h2>

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="10"
          style={{ borderCollapse: "collapse", minWidth: "500px" }}
        >
          <thead>
            <tr>
              <th>Doc ID</th>
              <th>Guest ID</th>
              <th>Order ID</th>
              <th>Date Ordered</th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan="4">No guests yet.</td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id}>
                  <td>{guest.id}</td>
                  <td>{guest.guest_id ?? "N/A"}</td>
                  <td>{guest.order_id ?? "N/A"}</td>
                  <td>{formatDate(guest.date_ordered)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}