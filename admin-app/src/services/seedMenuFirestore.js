import { db } from "../firebase";
import { writeBatch, doc } from "firebase/firestore";

const MENU_COLLECTION = "tbl_menuItems";

function buildFoodSvg(label, bg1, bg2, accent) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bg1}" />
          <stop offset="100%" stop-color="${bg2}" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="28" fill="url(#g)"/>
      <circle cx="160" cy="160" r="108" fill="#f1efe9"/>
      <circle cx="160" cy="160" r="92" fill="${accent}" opacity="0.9"/>
      <circle cx="125" cy="138" r="16" fill="#ffffff" opacity="0.5"/>
      <circle cx="200" cy="190" r="12" fill="#ffffff" opacity="0.45"/>
      <text x="160" y="287" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_MENU_ITEMS = [
  {
    item_id: 1,
    category: "Drink",
    m_name: "Iced Latte",
    availability: true,
    description:
      "A chilled espresso-based drink made with espresso and cold milk poured over ice.",
    image_url: buildFoodSvg("Iced Latte", "#d9c9b4", "#9f7b58", "#c58e55"),
    price: 130,
  },
  {
    item_id: 2,
    category: "Drink",
    m_name: "Iced Americano",
    availability: true,
    description:
      "A refreshing drink made by diluting espresso with cold water and serving it over ice.",
    image_url: buildFoodSvg("Americano", "#53443b", "#1d1715", "#603b24"),
    price: 110,
  },
  {
    item_id: 3,
    category: "Food",
    m_name: "Carbonara",
    availability: true,
    description:
      "A creamy Italian pasta dish traditionally made with eggs, cheese, pancetta or guanciale, and black pepper.",
    image_url: buildFoodSvg("Carbonara", "#e6d6ba", "#a98d63", "#d2a14d"),
    price: 320,
  },
  {
    item_id: 4,
    category: "Food",
    m_name: "Pesto Pasta",
    availability: false,
    description:
      "A pasta dish tossed in a fresh, herbaceous sauce made from basil, garlic, olive oil, pine nuts, and Parmesan cheese.",
    image_url: buildFoodSvg("Pesto Pasta", "#ced8a8", "#6f8d4d", "#87a95f"),
    price: 300,
  },
];

export async function seedFirestoreMenuItems() {
  const batch = writeBatch(db);

  DEFAULT_MENU_ITEMS.forEach((item) => {
    const ref = doc(db, MENU_COLLECTION, String(item.item_id));

    batch.set(ref, {
      item_id: item.item_id,
      category: item.category,
      m_name: item.m_name,
      availability: item.availability,
      description: item.description,
      image_url: item.image_url,
      price: item.price,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_menuItems seeded successfully.",
  };
}