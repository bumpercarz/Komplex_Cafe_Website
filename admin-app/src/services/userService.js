import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore";

export async function registerUser({
  u_name,
  email,
  password,
  phone_number,
  role = "staff",
}) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const uid = userCredential.user.uid;

  await setDoc(doc(db, "users", uid), {
    user_id: uid,
    u_name,
    email,
    phone_number,
    role,
    date_registered: serverTimestamp(),
  });

  return userCredential.user;
}

export async function getUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}