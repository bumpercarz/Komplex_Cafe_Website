import "../css/OrderConfirmModal.css";

const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

export default function OrderConfirmModal({ cart, orderType, receiveAt, instructions, onClose, onConfirm }) {
  const cartTotal = cart.reduce((s, e) => s + e.lineTotal, 0);

  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div className="ocm-sheet" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="ocm-header">
          <h2 className="ocm-title">Order Summary</h2>
          <p className="ocm-subtitle">Please review your order before continuing.</p>
        </div>

        {/* ── Scrollable item list ── */}
        <div className="ocm-list">
          {cart.map((entry, index) => {
            const baseTotal = entry.item.price * entry.qty;
            const hasExtras = (entry.addons?.length > 0) || (entry.dips?.length > 0);

            return (
              <div key={entry.cartKey ?? index} className="ocm-item">
                {/* Main item row */}
                <div className="ocm-item-top">
                  <span className="ocm-item-name">
                    {entry.item.m_name
                      .replace(/^\s*(hot|iced)\s+/i, "")
                      .replace(/\s*\((hot|iced)\)\s*$/i, "")
                      .trim()}
                  </span>
                  <span className="ocm-item-price">{peso(baseTotal)}</span>
                </div>

                {/* Sub-line */}
                <p className="ocm-item-sub">
                  {peso(entry.item.price)} each × {entry.qty}
                  {entry.temperature && (
                    <> · {entry.temperature === "hot" ? "☕ Hot" : "🧊 Iced"}</>
                  )}
                  {entry.sweetness?.length > 0 && (
                    <> · {entry.sweetness.map((s) => s.m_name).join(", ")}</>
                  )}
                </p>

                {/* Add-ons */}
                {entry.addons?.length > 0 && (
                  <div className="ocm-extras">
                    {entry.addons.map((a, i) => (
                      <div key={i} className="ocm-extra-row">
                        <span className="ocm-extra-name">+ {a.m_name}</span>
                        <span className="ocm-extra-price">{peso((a.price ?? 0) * entry.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dips */}
                {entry.dips?.length > 0 && (
                  <div className="ocm-extras">
                    {entry.dips.map((d, i) => (
                      <div key={i} className="ocm-extra-row">
                        <span className="ocm-extra-name">+ {d.m_name}</span>
                        <span className="ocm-extra-price">{peso((d.price ?? 0) * entry.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Item total (only when extras exist) */}
                {hasExtras && (
                  <div className="ocm-line-total">
                    <span>Item total</span>
                    <span>{peso(entry.lineTotal)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Order details strip ── */}
        <div className="ocm-details">
          <div className="ocm-detail-row">
            <span className="ocm-detail-label">Order type</span>
            <span className="ocm-detail-value">
              {orderType === "dine_in" ? "Dine In" : "Take Out"}
            </span>
          </div>
          <div className="ocm-detail-row">
            <span className="ocm-detail-label">Receive at</span>
            <span className="ocm-detail-value">
              {receiveAt === "table" ? "Table" : "Counter"}
            </span>
          </div>
          {instructions?.trim() && (
            <div className="ocm-detail-row ocm-detail-instructions">
              <span className="ocm-detail-label">Instructions</span>
              <span className="ocm-detail-value ocm-instructions-text">{instructions}</span>
            </div>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="ocm-footer">
          <div className="ocm-total">
            Total: <strong>{peso(cartTotal)}</strong>
          </div>
          <div className="ocm-footer-btns">
            <button className="ocm-btn-back" onClick={onClose}>
              Go Back
            </button>
            <button className="ocm-btn-confirm" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}