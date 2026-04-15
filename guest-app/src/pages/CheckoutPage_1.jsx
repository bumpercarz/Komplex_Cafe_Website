import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.js";
import "../css/CheckoutPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import NavBar from "../components/NavBar";
import EditItem from "../components/EditItem";

const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

export default function CheckoutPage_1() {
  const location = useLocation();
  const navigate = useNavigate();

  const [cart, setCart] = useState(() =>
  (location.state?.cart ?? []).map((e) => ({
    ...e,
    qty: e.qty ?? 1,
    // If item is missing, the entry itself is the flat item (old shape)
    item: e.item ?? {
      m_name:     e.m_name,
      price:      e.price,
      category:   e.category,
      image_url:  e.image_url,
      docId:      e.docId,
    },
    addons: e.addons ?? [],
    dips:   e.dips   ?? [],
    lineTotal: e.lineTotal ?? ((e.item.e.price ?? e.price ?? 0) * (e.qty ?? 1)),
  }))
);
  const [editTarget, setEditTarget] = useState(null);
  const [addons, setAddons] = useState([]);
  const [dips, setDips]     = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "tbl_menuItems"), orderBy("item_id", "asc"));
      const snap = await getDocs(q);
      const all = snap.docs.map((doc) => ({ ...doc.data(), docId: doc.id }));
      setAddons(all.filter((i) => i.category === "Add-on"));
      setDips(all.filter((i) => i.category === "Dip"));
    };
    fetch();
  }, []);

  const cartTotal = cart.reduce((s, e) => s + e.lineTotal, 0);

  const handleRemove = (index) =>
    setCart((prev) => prev.filter((_, i) => i !== index));

  const handleSaveEdit = (updatedEntry, index) =>
    setCart((prev) => prev.map((e, i) => (i === index ? updatedEntry : e)));

  return (
    <div className="wrapper">
      <div className="checkout-page">
        <NavBar />

        <div className="checkout-hero">
          <h1 className="checkout-hero-title">Checkout</h1>
        </div>

        <div className="checkout-list">
          {cart.length === 0 && (
            <p className="checkout-empty">Your cart is empty.</p>
          )}
          {cart.map((entry, index) => (
            <div key={index} className="checkout-item">
              <div className="checkout-item-top">
                <span className="checkout-item-name">{entry.item.m_name}</span>
                <span className="checkout-item-price">{peso(entry.lineTotal)}</span>
              </div>
              <p className="checkout-item-sub">
                {peso(entry.item.price)} each × {entry.qty}
                {entry.addons?.length > 0 && (
                  <> · {entry.addons.map((a) => a.m_name).join(", ")}</>
                )}
                {entry.dips?.length > 0 && (
                  <> · {entry.dips.map((d) => d.m_name).join(", ")}</>
                )}
              </p>
              <div className="checkout-item-controls">
                <button className="btn-remove-item" onClick={() => handleRemove(index)}>
                  <FaTrash /> Remove
                </button>
                <button className="btn-edit-item" onClick={() => setEditTarget({ entry, index })}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="checkout-footer">
          <div className="checkout-footer-total">
            Total: <strong>{peso(cartTotal)}</strong>
          </div>
          <div className="checkout-footer-buttons">
            <button className="btn-back" onClick={() => navigate("/menu", { state: { cart } })}>
              Back
            </button>
            <button
              className="btn-continue"
              disabled={cart.length === 0}
              onClick={() => navigate("/checkout/extra", { state: { cart } })}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {editTarget && (
        <EditItem
          entry={editTarget.entry}
          entryIndex={editTarget.index}
          addons={addons}
          dips={dips}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}