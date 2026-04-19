import { useState, useRef, useEffect } from "react";
import "../css/PopUp.css";

const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23d1d5db'/%3E%3C/svg%3E";

const IS_DRINK   = (item) => item?.category?.toLowerCase() === "drink";
const IS_CHURROS = (item) => item?.m_name?.toLowerCase().includes("churros");
const IS_SWEETENED_DRINK = (item) => {
  const name = item?.m_name?.toLowerCase() ?? "";
  return IS_DRINK(item) && (
    name.includes("americano") ||
    name.includes("amerikano") ||
    name.includes("latte")
  );
};

export default function ItemPopup({ item, existing, addons, dips, sweetness = [], onClose, onAddToCart }) {
  const [qty, setQty] = useState(existing?.qty ?? 1);
  const [selectedAddons, setSelectedAddons] = useState(() => {
    const map = {};
    (existing?.addons ?? []).forEach((a) => { map[a.docId] = true; });
    return map;
  });
  const [selectedDip, setSelectedDip] = useState(
    () => existing?.dips?.[0]?.docId ?? null
  );
  const [selectedSweetness, setSelectedSweetness] = useState(
    () => existing?.sweetness?.[0]?.docId ?? null
  );

  useEffect(() => {
    if (existing) setQty(existing.qty);
  }, [existing?.qty]);

  const overlayRef = useRef();
  const isDrink         = IS_DRINK(item);
  const isChurros       = IS_CHURROS(item);
  const isSweetenedDrink = IS_SWEETENED_DRINK(item);

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

  const sweetnessTotal = isSweetenedDrink && selectedSweetness
    ? (sweetness.find((s) => s.docId === selectedSweetness)?.price ?? 0)
    : 0;

  const lineTotal = (item.price + addonTotal + dipTotal + sweetnessTotal) * qty;
  const dipsValid      = !isChurros || selectedDip !== null;
  const sweetnessValid = !isSweetenedDrink || sweetness.length === 0 || selectedSweetness !== null;

  const handleAdd = () => {
    if (!dipsValid || !sweetnessValid) return;
    onAddToCart({
        item,
        qty,
        addons: isDrink ? addons.filter((a) => selectedAddons[a.docId]) : [],
        dips:   isChurros && selectedDip
          ? [dips.find((d) => d.docId === selectedDip)]
          : [],
        sweetness: isSweetenedDrink && selectedSweetness
          ? [sweetness.find((s) => s.docId === selectedSweetness)]
          : [],
        lineTotal,
    });
    onClose();
    };

  return (
    <div className="popup-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="popup">

        <div className="popup-header">
          <h2 className="popup-name">{item.m_name}</h2>
          <span className="popup-price-tag"><strong>{peso(item.price)}</strong></span>
        </div>

        <div className="popup-img-wrap">
          <img src={item.image_url || PLACEHOLDER} alt={item.m_name} className="popup-img" />
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
            Total: <strong>{peso(lineTotal)}</strong>
          </span>
          <button
            className="btn-add-item"
            onClick={handleAdd}
            disabled={!dipsValid || !sweetnessValid}
          >
            Add Item
          </button>
        </div>

      </div>
    </div>
  );
}