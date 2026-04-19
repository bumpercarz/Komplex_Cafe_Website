import { useState, useRef, useEffect } from "react";
import "../css/PopUp.css";

const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23d1d5db'/%3E%3C/svg%3E";

const IS_DRINK   = (item) => item?.category?.toLowerCase() === "drink";
const IS_CHURROS = (item) => item?.m_name?.toLowerCase().includes("churros");
const IS_SWEETENED_DRINK = (item) => {
  if (!IS_DRINK(item)) return false;
  const base = item?.baseName?.toLowerCase() ?? item?.m_name?.toLowerCase() ?? "";
  return (
    base.includes("americano") ||
    base.includes("amerikano") ||
    base.includes("latte")
  );
};

/**
 * ItemPopup now receives a `card` object (from MenuPage's mergeTemperatureVariants).
 * A card has:
 *   card.hotItem   — the Firestore item for the hot variant (or null)
 *   card.icedItem  — the Firestore item for the iced variant (or null)
 *   card.m_name    — the display/base name (e.g. "Americano")
 *   card.category  — item category
 *   card.image_url — shared image (falls back to variant image)
 *
 */
export default function ItemPopup({ card, addons, dips, sweetness = [], onClose, onAddToCart }) {
  const hasHot  = !!card.hotItem  && (card.hotItem?.availability  ?? true);
  const hasIced = !!card.icedItem && (card.icedItem?.availability ?? true);
  const bothTemps = hasHot && hasIced;
  // Untagged drink (frappe, etc.) or non-drink — neither variant
  const isTagged = hasHot || hasIced;

  // Always start fresh — no pre-filling from cart
  const initTemp = () => {
    if (!isTagged) return null;
    if (hasHot && !hasIced) return "hot";
    if (hasIced && !hasHot) return "iced";
    return null; // user must choose
  };

  const [temperature, setTemperature] = useState(initTemp);
  const [qty, setQty]                 = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [selectedDip, setSelectedDip]       = useState(null);
  const [selectedSweetness, setSelectedSweetness] = useState(null);

  // The active Firestore item based on chosen temperature
  const activeItem = isTagged
    ? (temperature === "hot" ? card.hotItem : temperature === "iced" ? card.icedItem : null)
    : card; // untagged — card IS the item

  const isDrink         = IS_DRINK(card);
  const isChurros       = IS_CHURROS(card);
  const isSweetenedDrink = activeItem ? IS_SWEETENED_DRINK({ ...activeItem, baseName: card.m_name }) : false;

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

  const basePrice    = activeItem?.price ?? card.price ?? 0;
  const addonTotal   = isDrink
    ? addons.filter((a) => selectedAddons[a.docId]).reduce((s, a) => s + a.price, 0)
    : 0;
  const dipTotal     = isChurros && selectedDip
    ? (dips.find((d) => d.docId === selectedDip)?.price ?? 0)
    : 0;
  const sweetnessTotal = isSweetenedDrink && selectedSweetness
    ? (sweetness.find((s) => s.docId === selectedSweetness)?.price ?? 0)
    : 0;

  const lineTotal = (basePrice + addonTotal + dipTotal + sweetnessTotal) * qty;

  const tempValid      = !isTagged || temperature !== null;
  const dipsValid      = !isChurros || selectedDip !== null;
  const sweetnessValid = !isSweetenedDrink || sweetness.length === 0 || selectedSweetness !== null;

  const handleAdd = () => {
    if (!tempValid || !dipsValid || !sweetnessValid || !activeItem) return;
    onAddToCart({
      item:        activeItem,           // actual Firestore item (hot or iced)
      qty,
      temperature: isTagged ? temperature : null,
      addons:      isDrink ? addons.filter((a) => selectedAddons[a.docId]) : [],
      dips:        isChurros && selectedDip
        ? [dips.find((d) => d.docId === selectedDip)]
        : [],
      sweetness:   isSweetenedDrink && selectedSweetness
        ? [sweetness.find((s) => s.docId === selectedSweetness)]
        : [],
      lineTotal,
    });
    onClose();
  };

  // Display price: show active price if chosen, otherwise show range or base
  const displayPrice = activeItem
    ? peso(basePrice)
    : (hasHot && hasIced)
      ? `${peso(card.hotItem.price)} – ${peso(card.icedItem.price)}`
      : peso(card.price ?? 0);

  const imageUrl = card.image_url
    || card.hotItem?.image_url
    || card.icedItem?.image_url
    || PLACEHOLDER;

  return (
    <div className="popup-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="popup">

        <div className="popup-header">
          <h2 className="popup-name">{card.m_name}</h2>
          <span className="popup-price-tag"><strong>{displayPrice}</strong></span>
        </div>

        <div className="popup-img-wrap">
          <img src={imageUrl} alt={card.m_name} className="popup-img" />
        </div>

        {/* Quantity */}
        <div className="popup-section">
          <div className="popup-section-label">Quantity</div>
          <div className="popup-qty-row">
            <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="qty-display">{qty}</span>
            <button className="qty-btn" onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
        </div>

        {/* Temperature — tagged drinks only */}
        {isTagged && (
          <div className="popup-section">
            <div className="popup-section-label">
              Serve As
              {bothTemps && <span className="dip-required">*</span>}
            </div>
            <div className="popup-serve-row">
              {hasHot && (
                <button
                  className={`serve-btn${temperature === "hot" ? " serve-btn--active" : ""}${!bothTemps ? " serve-btn--only" : ""}`}
                  onClick={() => bothTemps && setTemperature("hot")}
                  style={!bothTemps ? { cursor: "default" } : {}}
                >
                  <span>☕ Hot</span>
                  <span className="serve-price">{peso(card.hotItem.price)}</span>
                </button>
              )}
              {hasIced && (
                <button
                  className={`serve-btn${temperature === "iced" ? " serve-btn--active" : ""}${!bothTemps ? " serve-btn--only" : ""}`}
                  onClick={() => bothTemps && setTemperature("iced")}
                  style={!bothTemps ? { cursor: "default" } : {}}
                >
                  <span>🧊 Iced</span>
                  <span className="serve-price">{peso(card.icedItem.price)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add-ons — drinks only */}
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

        {/* Dips — churros only */}
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
                    name="dip"
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

        {/* Sweetness — americanos & lattes only */}
        {isSweetenedDrink && sweetness.length > 0 && (
          <div className="popup-section">
            <div className="popup-section-label">
              Sweetness <span className="dip-required">*</span>
            </div>
            <div className="popup-dips">
              {sweetness.map((s) => (
                <label key={s.docId} className="dip-row">
                  <input
                    type="radio"
                    name="sweetness"
                    checked={selectedSweetness === s.docId}
                    onChange={() => setSelectedSweetness(s.docId)}
                    className="dip-radio"
                  />
                  <span className="addon-label">{s.m_name}</span>
                  <span className="addon-price">
                    {s.price === 0 ? "Free" : `+${peso(s.price)}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="popup-footer">
          <span className="popup-total-label">
            Total: <strong>{activeItem ? peso(lineTotal) : "—"}</strong>
          </span>
          <button
            className="btn-add-item"
            onClick={handleAdd}
            disabled={!tempValid || !dipsValid || !sweetnessValid || !activeItem}
          >
            Add Item
          </button>
        </div>

      </div>
    </div>
  );
}