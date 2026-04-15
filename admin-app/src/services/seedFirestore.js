import { db } from "../firebase";
import { writeBatch, doc, Timestamp } from "firebase/firestore";

const USERS_COLLECTION = "tbl_user";

//REPLACE THIS FOR CORRECT CREDENTIALS
const DEFAULT_USERS = [
  {
    id: 1,
    name: "Adminfirst Lastname",
    email: "adminlongnamed@gmail.com",
    password: "admin123",
    role: "ADMIN",
    contactNumber: "09768372918",
    dateRegistered: "November 7, 2025",
  },
  {
    id: 2,
    name: "Firstname LastName",
    email: "anotherlongname@gmail.com",
    password: "owner123",
    role: "OWNER",
    contactNumber: "09761234568",
    dateRegistered: "November 11, 2025",
  },
  {
    id: 3,
    name: "Firstname LastName",
    email: "shortemailname@gmail.com",
    password: "staff123",
    role: "STAFF",
    contactNumber: "09763283780",
    dateRegistered: "November 7, 2025",
  },
  {
    id: 4,
    name: "Firstname LastName",
    email: "stafflongname2@gmail.com",
    password: "staff456",
    role: "STAFF",
    contactNumber: "09761231234",
    dateRegistered: "November 7, 2025",
  },
  {
    id: 5,
    name: "Firstname LastName",
    email: "staffshort2@gmail.com",
    password: "staff789",
    role: "STAFF",
    contactNumber: "09768881923",
    dateRegistered: "November 7, 2025",
  },
];

function toTimestamp(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return Timestamp.now();
  }
  return Timestamp.fromDate(parsed);
}

export async function seedFirestoreUsers() {
  const batch = writeBatch(db);

  DEFAULT_USERS.forEach((user) => {
    const ref = doc(db, USERS_COLLECTION, String(user.id));

    batch.set(ref, {
      user_id: user.id,
      order_id: null,
      u_name: user.name,
      date_registered: toTimestamp(user.dateRegistered),
      email: user.email,
      password: user.password,
      phone_number: user.contactNumber,
      role: user.role,
    });
  });

  await batch.commit();

  return {
    ok: true,
    message: "tbl_user seeded successfully.",
  };
}