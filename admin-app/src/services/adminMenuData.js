import { db, storage } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot, // NEW: Import for real-time listener
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const MENU_CATEGORY_OPTIONS = ["Drink", "Food", "Add-on", "Dip", "Sweetness"];
export const MENU_AVAILABLE_OPTIONS = ["Yes", "No"];

// Display sort order
const CATEGORY_SORT_ORDER = ["Food", "Drink", "Dip", "Add-on", "Sweetness"];

const MENU_COLLECTION = "tbl_menuItems";
const MENU_CACHE_KEY = "komplex_menu_cache";

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readMenuCache() {
  const storageRef = getLocalStorage();
  if (!storageRef) return [];
  try {
    const raw = storageRef.getItem(MENU_CACHE_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMenuCache(items) {
  const storageRef = getLocalStorage();
  if (!storageRef) return;
  storageRef.setItem(MENU_CACHE_KEY, JSON.stringify(items));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  })
    .format(n)
    .replace("PHP", "₱");
}

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

function buildFallbackImage(name, category) {
  if (category === "Add-on") {
    return buildFoodSvg(name || "Menu Item", "#e8d5b7", "#c4a47c", "#b8925c");
  }
  if (category === "Dip") {
    return buildFoodSvg(name || "Menu Item", "#d4e0d4", "#a8bca8", "#7a9a7a");
  }
  if (category === "Sweetness") {
    return buildFoodSvg(name || "Menu Item", "#fde8f0", "#f4a8c4", "#e07898");
  }
  return buildFoodSvg(
    name || "Menu Item",
    "#d9d9d9",
    "#9f9f9f",
    category === "Food" ? "#96a85e" : "#c58e55"
  );
}

function getPrefix(category) {
  const cat = String(category || "").toLowerCase();
  if (cat === "food") return "food";
  if (cat === "add-on") return "addon";
  if (cat === "dip") return "dip";
  if (cat === "sweetness") return "sweet";
  return "drink";
}

function getCodeName(category, itemId) {
  return `${getPrefix(category)}_${String(itemId).padStart(4, "0")}`;
}

// Composite Firestore doc ID: e.g. "food_0001", "drink_0001"
function getDocId(category, itemId) {
  return `${getPrefix(category)}_${String(itemId).padStart(4, "0")}`;
}

function sortMenuItems(items) {
  return [...items].sort((a, b) => {
    const ai = CATEGORY_SORT_ORDER.indexOf(a.category);
    const bi = CATEGORY_SORT_ORDER.indexOf(b.category);
    const catDiff = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    if (catDiff !== 0) return catDiff;
    return a.id - b.id;
  });
}

function mapFirestoreMenuItem(docSnap) {
  const data = docSnap.data() || {};
  const itemId = Number(data.item_id ?? 0);
  const category = String(data.category || "Drink");
  const name = String(data.m_name || "").trim();

  return {
    id: itemId,
    docId: docSnap.id,  // composite key e.g. "food_0001"
    codeName: getCodeName(category, itemId),
    name,
    description: String(data.description || "").trim(),
    category,
    available: data.availability ? "Yes" : "No",
    price: Number(data.price ?? 0),
    image: String(data.image_url || "") || buildFallbackImage(name, category),
  };
}

async function uploadMenuImage(file, docId) {
  const extension =
    String(file?.name || "").split(".").pop().toLowerCase() || "png";
  const safeExtension = ["png", "jpg", "jpeg", "webp"].includes(extension)
    ? extension
    : "png";
  const fileRef = ref(storage, `menu-items/${docId}/${Date.now()}.${safeExtension}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export function getAllMenuItems() {
  return readMenuCache();
}

export async function getAllMenuItemsLive() {
  const snapshot = await getDocs(collection(db, MENU_COLLECTION));
  const items = sortMenuItems(snapshot.docs.map(mapFirestoreMenuItem));
  writeMenuCache(items);
  return items;
}

// NEW: Real-time subscription for menu items
export function subscribeToMenuItems(onData, onError) {
  const q = collection(db, MENU_COLLECTION);
  return onSnapshot(
    q,
    (snapshot) => {
      const items = sortMenuItems(snapshot.docs.map(mapFirestoreMenuItem));
      writeMenuCache(items);
      if (onData) onData(items);
    },
    (err) => {
      console.error("Menu items subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function createMenuItemRecord(formValues) {
  const existingItems = await getAllMenuItemsLive();

  const name = String(formValues?.name || "").trim();
  const description = String(formValues?.description || "").trim();
  const category = String(formValues?.category || "Drink");
  const available = String(formValues?.available || "Yes");
  const price = Number(formValues?.price);

  if (!name || !description || Number.isNaN(price) || price < 0) {
    return { ok: false, message: "Please complete all required fields." };
  }

  const duplicate = existingItems.some(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, message: "That menu item already exists." };
  }

  // Next ID is per-category
  const sameCategory = existingItems.filter((i) => i.category === category);
  const nextId =
    sameCategory.length > 0
      ? Math.max(...sameCategory.map((i) => Number(i.id) || 0)) + 1
      : 1;

  const docId = getDocId(category, nextId);

  let imageUrl = buildFallbackImage(name, category);
  if (formValues?.imageFile instanceof File) {
    imageUrl = await uploadMenuImage(formValues.imageFile, docId);
  } else if (formValues?.image) {
    imageUrl = formValues.image;
  }

  await setDoc(doc(db, MENU_COLLECTION, docId), {
    item_id: nextId,
    category,
    m_name: name,
    availability: available === "Yes",
    description,
    image_url: imageUrl,
    price,
  });

  const newItem = {
    id: nextId,
    docId,
    codeName: getCodeName(category, nextId),
    name,
    description,
    category,
    available,
    price,
    image: imageUrl,
  };

  writeMenuCache(sortMenuItems([...existingItems, newItem]));

  return { ok: true, message: "Menu item added successfully.", item: newItem };
}

export async function updateMenuItemRecord(item, formValues) {
  const existingItems = await getAllMenuItemsLive();

  // Use stored docId, fallback to recomputing it
  const docId = item.docId || getDocId(item.category, item.id);

  if (!docId) {
    return { ok: false, message: "Menu item not found." };
  }

  const name = String(formValues?.name || "").trim();
  const description = String(formValues?.description || "").trim();
  const category = String(formValues?.category || item.category || "Drink");
  const available = String(formValues?.available || item.available || "Yes");
  const price = Number(formValues?.price);

  if (!name || !description || Number.isNaN(price) || price < 0) {
    return { ok: false, message: "Please complete all required fields." };
  }

  const duplicate = existingItems.some(
    (menuItem) =>
      menuItem.docId !== docId &&
      menuItem.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, message: "That menu item already exists." };
  }

  // If category changed, we need a new docId
  const newDocId = getDocId(category, item.id);
  const categoryChanged = newDocId !== docId;

  let imageUrl = item.image || buildFallbackImage(name, category);
  if (formValues?.imageFile instanceof File) {
    imageUrl = await uploadMenuImage(formValues.imageFile, newDocId);
  } else if (formValues?.image) {
    imageUrl = formValues.image;
  }

  if (categoryChanged) {
    // Delete old doc, create new one under new docId
    await deleteDoc(doc(db, MENU_COLLECTION, docId));
    await setDoc(doc(db, MENU_COLLECTION, newDocId), {
      item_id: item.id,
      category,
      m_name: name,
      availability: available === "Yes",
      description,
      image_url: imageUrl,
      price,
    });
  } else {
    await updateDoc(doc(db, MENU_COLLECTION, docId), {
      category,
      m_name: name,
      availability: available === "Yes",
      description,
      image_url: imageUrl,
      price,
    });
  }

  const updatedItem = {
    ...item,
    docId: newDocId,
    codeName: getCodeName(category, item.id),
    name,
    description,
    category,
    available,
    price,
    image: imageUrl,
  };

  writeMenuCache(
    sortMenuItems(
      existingItems.map((menuItem) =>
        menuItem.docId === docId ? updatedItem : menuItem
      )
    )
  );

  return { ok: true, message: "Menu item updated successfully.", item: updatedItem };
}

export async function deleteMenuItemRecord(itemDocId) {
  // Accept either a docId string ("food_0001") or fall back to old numeric behavior
  const target = String(itemDocId);

  await deleteDoc(doc(db, MENU_COLLECTION, target));

  const nextItems = readMenuCache().filter((item) => item.docId !== target);
  writeMenuCache(nextItems);

  return { ok: true, message: "Menu item deleted successfully." };
}