import { db } from "../firebase";
import { writeBatch, doc } from "firebase/firestore";

const TABLE_COLLECTION = "tbl_table";

const DEFAULT_TABLES = [
  {
    id: 1,
    qrCodeUrl: "http://localhost:5173/customer?table_id=1",
    status: "Active",
  },
  {
    id: 2,
    qrCodeUrl: "http://localhost:5173/customer?table_id=2",
    status: "Active",
  },
  {
    id: 3,
    qrCodeUrl: "http://localhost:5173/customer?table_id=3",
    status: "Inactive",
  },
  {
    id: 4,
    qrCodeUrl: "http://localhost:5173/customer?table_id=4",
    status: "AVAILABLE",
  },
  {
    id: 5,
    qrCodeUrl: "http://localhost:5173/customer?table_id=5",
    status: "Active",
  },
  {
    id: 6,
    qrCodeUrl: "http://localhost:5173/customer?table_id=6",
    status: "Inactive",
  },
];

export async function seedFirestoreTables() {
  const batch = writeBatch(db);

  DEFAULT_TABLES.forEach((table) => {
    const ref = doc(db, TABLE_COLLECTION, String(table.id));

    batch.set(ref, {
      table_id: table.id,
      qr_code_url: table.qrCodeUrl,
      table_status: table.status,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_table seeded successfully.",
  };
}