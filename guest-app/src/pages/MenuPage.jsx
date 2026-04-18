import { useState, useEffect, useRef } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"; // ← added orderBy
import { db } from "../firebase.js";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import ItemPopup from "../components/ItemPopUp";
import "../css/MenuPage.css";

const tableId = sessionStorage.getItem("table_id");
const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const HIDDEN_CATEGORIES = ["Add-on", "Dip"];

export default function MenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [popup, setPopup]     = useState(null);
  const [cart, setCart]       = useState(location.state?.cart ?? []);
  const [menu, setMenu]       = useState([]);
  const [addons, setAddons]   = useState([]);
  const [dips, setDips]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true); // ← keep with other state

  const sectionRefs = useRef({});
  const headerRef   = useRef();

  // ── 1. Check for active order first ──
  useEffect(() => {
    const checkActiveOrder = async () => {
      try {
        const guestId      = sessionStorage.getItem("guest_id");
        const activeOrderId = sessionStorage.getItem("active_order_id");

        if (!guestId || !activeOrderId) return;

        const orderSnap = await getDoc(doc(db, "tbl_orders", activeOrderId));

        if (orderSnap.exists()) {
          const { order_status, guest_id } = orderSnap.data();
          const inactive = ["COMPLETED", "CANCELLED"];

          if (String(guest_id) === guestId && !inactive.includes(order_status)) {
            const paymentSnap = await getDocs(
              query(collection(db, "tbl_payments"), where("order_id", "==", Number(activeOrderId)))
            );
            const paymentId = paymentSnap.empty
              ? null
              : paymentSnap.docs[0].data().payment_id;

            navigate("/confirmation", {
              state: { orderId: Number(activeOrderId), paymentId },
            });
            return;
          }
        }

        sessionStorage.removeItem("active_order_id");
      } catch (err) {
        console.error("Failed to check active order:", err);
      } finally {
        setCheckingOrder(false); // ← always runs
      }
    };

    checkActiveOrder();
  }, []);

  // ── 2. Fetch menu ──
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const q = query(collection(db, "tbl_menuItems"), orderBy("item_id", "asc"));
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));

        setAddons(all.filter((i) => i.category === "Add-on"));
        setDips(all.filter((i) => i.category === "Dip"));
        setMenu(all.filter((i) => !HIDDEN_CATEGORIES.includes(i.category)));
      } catch (err) {
        console.error("Failed to fetch menu:", err);
        setError("Could not load the menu. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // ── 3. Scroll to category ──
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && sectionRefs.current[cat]) {
      sectionRefs.current[cat].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [menu]);

  // ── All hooks done — now safe to return early ──
  if (checkingOrder || loading) return (
    <div className="wrapper"><div className="menu-page"><NavBar /><div className="menu-loading">Loading menu…</div></div></div>
  );
  if (error) return (
    <div className="wrapper"><div className="menu-page"><NavBar /><div className="menu-error">{error}</div></div></div>
  );

  const categories  = [...new Set(menu.map((i) => i.category))];
  const groupedItems = categories.map((cat) => ({
    category: cat,
    items: menu.filter((i) => i.category === cat),
  }));

  const cartTotal = cart.reduce((s, e) => s + e.lineTotal, 0);
  const cartCount = cart.reduce((s, e) => s + e.qty, 0);

  const handleAddToCart = (entry) => {
    setCart((prev) => {
      const index = prev.findIndex((e) => e.item.docId === entry.item.docId);
      if (index !== -1) return prev.map((e, i) => i === index ? entry : e);
      return [...prev, entry];
    });
    setPopup(null);
  };

  return (
    <div className="wrapper">
      <div className="menu-page">
        <NavBar />

        <section className="menu-header" ref={headerRef}>
          <div className="menu-hero">
            <h1 className="menu-hero-title">Menu</h1>
          </div>
          <div className="menu-chips-wrap">
            <div className="menu-chips">
              <button className="chip" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className="chip"
                  onClick={() => sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="menu-list">
          {groupedItems.map(({ category, items }) => (
            <div key={category} className="menu-section" ref={(el) => (sectionRefs.current[category] = el)}>
              <h2 className="menu-section-title">{category}</h2>
              {items.map((item) => {
                const existing = cart.find((e) => e.item.docId === item.docId);
                const totalQty = existing?.qty ?? 0;
                return (
                  <button
                    key={item.item_id}
                    className={`menu-item${!item.availability ? " menu-item--unavailable" : ""}`}
                    onClick={() => { if (!item.availability) return; setPopup({ item, existing: existing ?? null }); }}
                    disabled={!item.availability}
                  >
                    {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
                    <img src={item.image_url || PLACEHOLDER} alt={item.m_name} className="menu-item-img" />
                    <div className="menu-item-info">
                      <span className="menu-item-name">{item.m_name}</span>
                      {item.description && <span className="menu-item-desc">{item.description}</span>}
                      <span className="menu-item-price">{item.availability ? peso(item.price) : "Unavailable"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="menu-footer">
          <button
            className="btn-checkout"
            disabled={cart.length === 0}
            onClick={() => navigate("/checkout/cart", { state: { cart } })}
          >
            Checkout
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>

        {popup && (
          <ItemPopup
            item={popup.item}
            addons={addons}
            dips={dips}
            onClose={() => setPopup(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}