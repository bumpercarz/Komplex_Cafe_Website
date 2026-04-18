import { db } from "../firebase";
import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

const TABLE_COLLECTION = "tbl_table";

export const TABLE_STATUS_OPTIONS = ["Active", "Inactive"];

export function normalizeTableNumber(value) {
  return String(value).trim().replace(/^table_/i, "").trim();
}

export function normalizeTableId(value) {
  const cleaned = normalizeTableNumber(value).replace(/\s+/g, "_");
  return `table_${cleaned || "new"}`;
}

function getCustomerBaseUrl() {
  // Hardcoded to the requested URL
  return "https://komplex-guest.web.app";
}

export function buildTableQrUrl(tableNumber) {
  const normalized = normalizeTableNumber(tableNumber);
  const baseUrl = getCustomerBaseUrl();
  return `${baseUrl}/?table_id=${encodeURIComponent(normalized)}`;
}

function toStoredTableId(tableNumber) {
  const asNumber = Number(tableNumber);
  return Number.isNaN(asNumber) ? tableNumber : asNumber;
}

export async function getAllTables() {
  const snapshot = await getDocs(collection(db, TABLE_COLLECTION));

  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();

      const rawTableNumber = data?.table_id ?? docSnap.id;
      const tableNumber = normalizeTableNumber(rawTableNumber);

      return {
        id: docSnap.id, // Firestore doc id
        tableNumber,
        tableId: normalizeTableId(tableNumber),
        status: data?.table_status ?? "Active",
        qrCodeUrl: data?.qr_code_url ?? buildTableQrUrl(tableNumber),
        isCustomQr: false,
        qrImage: null,
      };
    })
    .sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber));
}

export async function createTableRecord(existingTables, formValues) {
  const tableNumber = normalizeTableNumber(formValues.tableNumber);

  await setDoc(doc(db, TABLE_COLLECTION, String(tableNumber)), {
    table_id: toStoredTableId(tableNumber),
    qr_code_url: buildTableQrUrl(tableNumber),
    table_status: formValues.status,
  });
}

export async function updateTableRecord(table, formValues) {
  const oldDocId = String(table.id);
  const tableNumber = normalizeTableNumber(formValues.tableNumber);
  const newDocId = String(tableNumber);

  const payload = {
    table_id: toStoredTableId(tableNumber),
    qr_code_url: buildTableQrUrl(tableNumber),
    table_status: formValues.status,
  };

  if (newDocId !== oldDocId) {
    await deleteDoc(doc(db, TABLE_COLLECTION, oldDocId));
  }

  await setDoc(doc(db, TABLE_COLLECTION, newDocId), payload);
}

export async function deleteTableRecord(tableId) {
  await deleteDoc(doc(db, TABLE_COLLECTION, String(tableId)));
}