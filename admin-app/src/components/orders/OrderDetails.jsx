import React, { useState } from "react";
import { formatMoney, calcOrderTotal } from "../../services/adminOrderData";

export default function OrderDetails({
  order,
  status,
  statusOptions,
  onStatusChange,
}) {
  const total = calcOrderTotal(order.items);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  
  // States for the Cancel Reason Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const handleSelectChange = (e) => {
    const val = e.target.value;
    // Intercept if they select CANCELLED
    if (val === "CANCELLED" && status !== "CANCELLED") {
      setShowCancelModal(true);
    } else {
      onStatusChange(order.id, val);
    }
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Please enter a reason for cancellation.");
      return;
    }
    // Pass the third parameter (reason) up through OrderCard to the Admin Page!
    onStatusChange(order.id, "CANCELLED", cancelReason.trim());
    setShowCancelModal(false);
    setCancelReason("");
  };

  return (
    <div className="ao-cardBody">
      {/* LEFT */}
      <div className="ao-left">
        <div className="ao-sectionTitle">Order Information:</div>

        <div className="ao-items">
          {order.items.map((it, idx) => {
            const itemCategory = String(it.category || "").trim().toLowerCase();
            const isSpecialCategory = ["add-on", "add_on", "dip", "sweetness"].includes(
              itemCategory
            );

            return (
              <div
                className={`ao-itemRow ${
                  isSpecialCategory ? "ao-specialItem" : ""
                }`}
                key={idx}
              >
                <div className="ao-itemQty">{it.qty}x</div>
                <div className="ao-itemName">
                  {it.name}
                  {isSpecialCategory && (
                    <span className="ao-categoryTag"> ({it.category})</span>
                  )}
                </div>
                <div className="ao-itemPrice">
                  {formatMoney(it.qty * it.price)}
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{ width: "100%", height: "1px", backgroundColor: "#d9d9d9", margin: "16px 0" }} />

        <div 
          className="ao-totalRow" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            fontSize: '16px'
          }}
        >
          <strong>Total Amount:</strong>
          <strong className="ao-totalPrice" style={{ fontSize: '18px', color: '#db7634' }}>
            {formatMoney(total)}
          </strong>
        </div>

        {/* Receipt Preview */}
        {order.receiptUrl && (
          <>
            <div className="ao-sectionTitle" style={{ marginTop: "24px" }}>
              Receipt:
            </div>
            <div className="ao-receipt">
              <img
                src={order.receiptUrl}
                alt="Receipt"
                className="ao-receipt-img"
                style={{ cursor: "pointer" }}
                onClick={() => setLightboxSrc(order.receiptUrl)}
              />
            </div>
          </>
        )}
      </div>

      <div className="ao-midDivider" />

      {/* RIGHT */}
      <div className="ao-right">
        <div className="ao-sectionTitle">Edit Order Status:</div>

        <div className="ao-selectWrap">
          <select
            className="ao-select"
            value={status}
            onChange={handleSelectChange}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="ao-meta">
          <div className="ao-metaRow">
            <b>Table:</b>{" "}
            {order.tableNumber || order.tableId || order.table_id || "N/A"}
          </div>
          <div className="ao-metaRow">
            <b>Order Type:</b> {order.orderType}
          </div>
          <div className="ao-metaRow">
            <b>Special Instructions:</b>
            <div className="ao-instructions">
              {order.instructions && order.instructions.trim()
                ? order.instructions
                : "N/A"}
            </div>
          </div>
          
          {/* THE CANCEL REASON DISPLAY (Appears only if cancelReason exists) */}
          {order.cancelReason && (
            <div className="ao-metaRow" style={{ marginTop: '16px', background: '#fdf0ee', padding: '12px', borderRadius: '8px', border: '1px solid #fad2cd' }}>
              <b style={{ color: "#df4735", display: 'block', marginBottom: '4px' }}>Cancellation Reason:</b>
              <div className="ao-instructions" style={{ color: "#df4735", fontWeight: '500' }}>
                {order.cancelReason}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CANCEL REASON MODAL */}
      {showCancelModal && (
        <div className="ao-cancel-modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="ao-cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "18px" }}>Reason for Cancellation</h4>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer requested cancel, out of stock, etc."
              rows={4}
            />
            <div className="ao-cancel-modal-actions">
              <button 
                className="ao-cancel-btn-back" 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
              >
                Back
              </button>
              <button 
                className="ao-cancel-btn-confirm" 
                onClick={handleConfirmCancel}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxSrc && (
        <div
          className="ao-lightbox"
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.8)", display: "flex",
            justifyContent: "center", alignItems: "center",
            zIndex: 9999, cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxSrc}
            alt="Receipt"
            style={{ maxHeight: "90%", maxWidth: "90%", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
}