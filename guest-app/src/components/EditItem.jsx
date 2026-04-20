import { useState, useRef, useEffect } from "react";
import "../css/PopUp.css";
import "../css/CheckoutEditItem.css";

const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23d1d5db'/%3E%3C/svg%3E";

const IS_DRINK   = (item) => item?.category?.toLowerCase() === "drink";
const IS_CHURROS = (item) => item?.m_name?.toLowerCase().includes("churros");

/** Strip "Hot " / "Iced " prefix for the popup display title */
const getBaseName = (name = "") =>
  name.replace(/^\s*(hot|iced)\s+/i, "").replace(/\s*\((hot|iced)\)\s*$/i, "").trim();

const isHotVariant  = (n = "") => /^\s*hot\s+/i.test(n) || /\((hot)\)\s*$/i.test(n);
const isIcedVariant = (n = "") => /^\s*iced\s+/i.test(n) || /\((iced)\)\s*$/i.test(n);

export default function EditItem({ entry, entryIndex, addons, dips, onClose, onSave }) {
  const { item } = entry;
  if (!item) return null;

  const isDrink   = IS_DRINK(item);
  const isChurros = IS_CHURROS(item);

  // Determine temperature from the stored item name
  const storedTemp = entry.temperature
    ?? (isHotVariant(item.m_name) ? "hot" : isIcedVariant(item.m_name) ? "iced" : null);
  const isTagged   = isHotVariant(item.m_name) || isIcedVariant(item.m_name);
  const displayName = getBaseName(item.m_name);

  const [qty, setQty] = useState(entry.qty ?? 1);
  // Temperature is fixed in edit mode — user chose it when adding; show it read-only
  const temperature = storedTemp;

  const [selectedAddons, setSelectedAddons] = useState(() => {
    const map = {};
    (entry.addons ?? []).forEach((a) => { map[a.docId] = true; });
    return map;
  });

  const [selectedDip, setSelectedDip] = useState(
    () => entry.dips?.[0]?.docId ?? null
  );

  const overlayRef = useRef();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const toggleAddon = (docId) =>
    setSelectedAddons((prev) => ({ ...prev, [docId]: !prev[docId] }));

  const addonTotal = isDrink
    ? addons.filter((a) => selectedAddons[a.docId]).reduce((s, a) => s + a.price, 0)
    : 0;

  const dipTotal = isChurros && selectedDip
    ? (dips.find((d) => d.docId === selectedDip)?.price ?? 0)
    : 0;

  const lineTotal = (item.price + addonTotal + dipTotal) * qty;
  const dipsValid = !isChurros || selectedDip !== null;

  const handleSave = () => {
    if (!dipsValid) return;
    onSave({
      ...entry,
      qty,
      temperature,
      addons: isDrink ? addons.filter((a) => selectedAddons[a.docId]) : [],
      dips:   isChurros && selectedDip
        ? [dips.find((d) => d.docId === selectedDip)]
        : [],
      lineTotal,
    }, entryIndex);
    onClose();
  };

  return (
    <div className="popup-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="popup edit-popup">
        <div className="edit-popup-badge">Editing Item</div>

        <div className="popup-header">
          <h2 className="popup-name">{displayName}</h2>
          <span className="popup-price-tag"><strong>{peso(item.price)}</strong></span>
        </div>

        <div className="popup-img-wrap">
          <img src={item.image_url || PLACEHOLDER} alt={displayName} className="popup-img" />
        </div>

        <div className="popup-section">
          <div className="popup-section-label">Quantity</div>
          <div className="popup-qty-row">
            <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <input
              className="qty-input"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) setQty(val);
                else if (e.target.value === "") setQty("");
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value, 10);
                setQty(!isNaN(val) && val >= 1 ? val : 1);
              }}
            />
            <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, (parseInt(q) || 1) + 1))}>+</button>
          </div>
        </div>

        {/* Temperature — read-only in edit mode */}
        {isTagged && temperature && (
          <div className="popup-section">
            <div className="popup-section-label">Serve As</div>
            <div className="popup-serve-row">
              <button className="serve-btn serve-btn--active serve-btn--only" style={{ cursor: "default" }}>
                {temperature === "hot" ? "☕ Hot" : "🧊 Iced"}
              </button>
            </div>
          </div>
        )}

        {isDrink && addons.length > 0 && (
          <div className="popup-section">
            <div className="popup-section-label">Add-ons</div>
            <div className="popup-addons">
              {addons.map((addon) => (
                <label key={addon.docId} className="addon-row">
                  <input
                    type="checkbox"
                    checked={!!selectedAddons[addon.docId]}
                    onChange={() => toggleAddon(addon.docId)}
                    className="addon-checkbox"
                  />
                  <span className="addon-label">{addon.m_name}</span>
                  <span className="addon-price">+{peso(addon.price)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isChurros && dips.length > 0 && (
          <div className="popup-section">
            <div className="popup-section-label">
              Dip <span className="dip-required">*</span>
            </div>
            <div className="popup-dips">
              {dips.map((dip) => (
                <label key={dip.docId} className="dip-row">
                  <input
                    type="radio"
                    name="edit-dip"
                    checked={selectedDip === dip.docId}
                    onChange={() => setSelectedDip(dip.docId)}
                    className="dip-radio"
                  />
                  <span className="addon-label">{dip.m_name}</span>
                  <span className="addon-price">
                    {dip.price === 0 ? "Free" : `+${peso(dip.price)}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="popup-footer">
          <span className="popup-total-label">
            Total: <strong>{peso(lineTotal)}</strong>
          </span>
          <button
            className="btn-add-item btn-save-item"
            onClick={handleSave}
            disabled={!dipsValid}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}