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

  return (
    <div className="ao-cardBody">
      {/* LEFT */}
      <div className="ao-left">
        <div className="ao-sectionTitle">Order Information:</div>

        <div className="ao-items">
          {order.items.map((it, idx) => {
            // Bulletproof check: convert to lowercase and remove spaces
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
                  {/* Optional: Add-on category label. Remove if you prefer it completely clean. */}
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

        <div className="ao-divider" />

        <div className="ao-totalRow">
          <div className="ao-totalPrice">{formatMoney(total)}</div>
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
            onChange={(e) => onStatusChange(order.id, e.target.value)}
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
        </div>
      </div>

      {/* Lightbox Overlay */}
      {lightboxSrc && (
        <div
          className="ao-lightbox"
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out",
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