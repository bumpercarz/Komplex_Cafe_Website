import { useState, useEffect, useRef } from "react";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import ItemPopup from "../components/ItemPopUp";
import "../css/MenuPage.css";

const tableId = sessionStorage.getItem("table_id");
const peso = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const HIDDEN_CATEGORIES = ["Add-on", "Dip", "Sweetness"];
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23d1d5db'/%3E%3C/svg%3E";

/** Strip leading "Hot " / "Iced " and trailing " (Hot)" / " (Iced)" to get the
 *  canonical base name used for grouping paired variants. */
const getBaseName = (name) =>
  name
    .replace(/^\s*(hot|iced)\s+/i, "")
    .replace(/\s*\((hot|iced)\)\s*$/i, "")
    .trim();

const isHotVariant  = (n) => /^\s*hot\s+/i.test(n) || /\((hot)\)\s*$/i.test(n);
const isIcedVariant = (n) => /^\s*iced\s+/i.test(n) || /\((iced)\)\s*$/i.test(n);

/**
 * Merge drink items that share the same base name (e.g. "Hot Americano" +
 * "Iced Americano" → one card called "Americano" with hotItem + icedItem).
 * Untagged drinks (frappes, etc.) and non-drink items pass through unchanged.
 */
const mergeTemperatureVariants = (items) => {
  const drinks    = items.filter((i) => i.category?.toLowerCase() === "drink");
  const nonDrinks = items.filter((i) => i.category?.toLowerCase() !== "drink");

  const hotItems  = drinks.filter((i) => isHotVariant(i.m_name));
  const icedItems = drinks.filter((i) => isIcedVariant(i.m_name));
  const untagged  = drinks.filter((i) => !isHotVariant(i.m_name) && !isIcedVariant(i.m_name));

  const merged = [];
  const usedIced = new Set();

  // Pair each hot item with its iced counterpart (matched by base name)
  hotItems.forEach((hot) => {
    const base = getBaseName(hot.m_name);
    const iced = icedItems.find((i) => getBaseName(i.m_name) === base);
    merged.push({
      ...hot,
      m_name:   base,
      hotItem:  hot,
      icedItem: iced ?? null,
    });
    if (iced) usedIced.add(iced.docId);
  });

  // Iced-only items with no hot counterpart
  icedItems.filter((i) => !usedIced.has(i.docId)).forEach((iced) => {
    merged.push({ ...iced, m_name: getBaseName(iced.m_name), hotItem: null, icedItem: iced });
  });

  // Untagged drinks (frappes, etc.) — pass through with nulls so popup knows
  untagged.forEach((item) => {
    merged.push({ ...item, hotItem: null, icedItem: null });
  });

  // Keep order stable: sort by the lowest item_id among variants
  merged.sort((a, b) => {
    const idA = Math.min(a.hotItem?.item_id ?? Infinity, a.icedItem?.item_id ?? Infinity, a.item_id ?? Infinity);
    const idB = Math.min(b.hotItem?.item_id ?? Infinity, b.icedItem?.item_id ?? Infinity, b.item_id ?? Infinity);
    return idA - idB;
  });

  return [...merged, ...nonDrinks];
};

export default function MenuPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [popup, setPopup]         = useState(null);
  const [cart, setCart]           = useState(location.state?.cart ?? []);
  const [menu, setMenu]           = useState([]);
  const [addons, setAddons]       = useState([]);
  const [dips, setDips]           = useState([]);
  const [sweetness, setSweetness] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [checkingOrder, setCheckingOrder] = useState(true);

  const sectionRefs = useRef({});
  const headerRef   = useRef();

  // ── 1. Check for active order first ──
  useEffect(() => {
    const checkActiveOrder = async () => {
      try {
        const guestId       = sessionStorage.getItem("guest_id");
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
        setCheckingOrder(false);
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
        setSweetness(all.filter((i) => i.category === "Sweetness"));
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

  const categories   = [...new Set(menu.map((i) => i.category))];
  const mergedMenu   = mergeTemperatureVariants(menu);
  const groupedItems = categories.map((cat) => ({
    category: cat,
    items: mergedMenu.filter((i) => i.category === cat),
  }));

  const cartTotal = cart.reduce((s, e) => s + e.lineTotal, 0);
  const cartCount = cart.reduce((s, e) => s + e.qty, 0);

  /**
   * A stable fingerprint for a cart entry.
   * Two entries for the same item with different addons/dips/sweetness
   * get different keys and are kept as separate rows.
   */
  const makeCartKey = (entry) => {
    const addonIds   = (entry.addons    ?? []).map((a) => a.docId).sort().join(",");
    const dipIds     = (entry.dips      ?? []).map((d) => d.docId).sort().join(",");
    const sweetIds   = (entry.sweetness ?? []).map((s) => s.docId).sort().join(",");
    return `${entry.item.docId}|${entry.temperature ?? ""}|${addonIds}|${dipIds}|${sweetIds}`;
  };

  const handleAddToCart = (entry) => {
    const key = makeCartKey(entry);
    setCart((prev) => {
      const index = prev.findIndex((e) => makeCartKey(e) === key);
      if (index !== -1) {
        // Same item + same options → merge qty, recalculate total
        return prev.map((e, i) => {
          if (i !== index) return e;
          const newQty = e.qty + entry.qty;
          const unitPrice = entry.lineTotal / entry.qty;
          return { ...e, qty: newQty, lineTotal: unitPrice * newQty, cartKey: key };
        });
      }
      // Brand-new combination → append as its own row
      return [...prev, { ...entry, cartKey: key }];
    });
    setPopup(null);
  };

  /**
   * For a merged card, sum quantities of ALL matching entries (any temperature,
   * any addon combo) for the badge.
   */
  const getCardCartInfo = (card) => {
    const docIds = new Set([
      card.hotItem?.docId,
      card.icedItem?.docId,
      card.docId,
    ].filter(Boolean));

    const matches = cart.filter((e) => docIds.has(e.item.docId));
    const qty     = matches.reduce((s, e) => s + e.qty, 0);
    return { qty };
  };

  /** Display price string for a card */
  const getCardPriceLabel = (card, available) => {
    if (!available) return "Unavailable";
    if (card.hotItem && card.icedItem)
      return `☕ ${peso(card.hotItem.price)} · 🧊 ${peso(card.icedItem.price)}`;
    if (card.hotItem)  return `☕ ${peso(card.hotItem.price)}`;
    if (card.icedItem) return `🧊 ${peso(card.icedItem.price)}`;
    return peso(card.price ?? 0);
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
              {items.map((card) => {
                const { qty: totalQty } = getCardCartInfo(card);
                const available = card.availability ?? true;
                const mergedAvailable = card.hotItem || card.icedItem
                  ? (card.hotItem?.availability ?? false) || (card.icedItem?.availability ?? false)
                  : available;
                const priceLabel = getCardPriceLabel(card, mergedAvailable);

                return (
                  <button
                    key={`${card.hotItem?.docId ?? ""}-${card.icedItem?.docId ?? card.docId}`}
                    className={`menu-item${!mergedAvailable ? " menu-item--unavailable" : ""}`}
                    onClick={() => {
                      if (!mergedAvailable) return;
                      setPopup({ card });
                    }}
                    disabled={!mergedAvailable}
                  >
                    {totalQty > 0 && <span className="cart-badge">{totalQty}</span>}
                    <img
                      src={card.image_url || card.hotItem?.image_url || card.icedItem?.image_url || PLACEHOLDER}
                      alt={card.m_name}
                      className="menu-item-img"
                    />
                    <div className="menu-item-info">
                      <span className="menu-item-name">{card.m_name}</span>
                      {card.description && <span className="menu-item-desc">{card.description}</span>}
                      <span className="menu-item-price">{priceLabel}</span>
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
            card={popup.card}
            addons={addons}
            dips={dips}
            sweetness={sweetness}
            onClose={() => setPopup(null)}
            onAddToCart={handleAddToCart}
          />
        )}
      </div>
    </div>
  );
}