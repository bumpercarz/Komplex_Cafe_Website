// authService.js
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const STORAGE_KEY = "komplex_auth_users";
const CURRENT_USER_KEY = "komplex_current_user";
const USERS_COLLECTION = "tbl_user";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function seedUsers() {
  const storage = getStorage();
  if (!storage) return;

  const existing = storage.getItem(STORAGE_KEY);
  if (!existing) {
    storage.setItem(STORAGE_KEY, JSON.stringify([]));
  }
}

function readUsers() {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  seedUsers();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function writeUsers(users) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY, JSON.stringify(users));
  }
  return clone(users);
}

function normalizeRole(role) {
  const normalized = String(role || "STAFF").trim().toUpperCase();
  if (["ADMIN", "OWNER", "STAFF"].includes(normalized)) {
    return normalized;
  }
  return "STAFF";
}

function formatDateRegistered(date = new Date()) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatFirestoreDate(value) {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    return formatDateRegistered(value.toDate());
  }

  return formatDateRegistered(value);
}

function mapFirestoreUser(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: Number(data.user_id ?? docSnap.id),
    orderId: data.order_id ?? null,
    name: String(data.u_name || "").trim(),
    email: String(data.email || "").trim(),
    password: String(data.password || ""),
    role: normalizeRole(data.role),
    contactNumber: String(data.phone_number || "").trim(),
    dateRegistered: formatFirestoreDate(data.date_registered),
    isDeleted: data.is_deleted === true,
  };
}

async function fetchFirestoreUsers() {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const firestoreUsers = snapshot.docs.map(mapFirestoreUser);
  writeUsers(firestoreUsers);
  return firestoreUsers;
}

function nextId(users) {
  return users.length > 0
    ? Math.max(...users.map((user) => Number(user.id) || 0)) + 1
    : 1;
}

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readCurrentSession() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  const storage = getStorage();
  if (!storage) return null;

  const safeUser = sanitizeUser(user);
  storage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
  return safeUser;
}

export function clearCurrentUser() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(CURRENT_USER_KEY);
}

function syncCurrentUser(updatedUser) {
  const current = readCurrentSession();
  if (!current) return;

  if (current.id === updatedUser.id) {
    setCurrentUser(updatedUser);
  }
}

export function getCurrentUser() {
  const session = readCurrentSession();
  if (!session) return null;
  return session;
}

export function logoutUser() {
  clearCurrentUser();
}

export function getLoginDestination(role) {
  return normalizeRole(role) === "STAFF" ? "/staff" : "/admin";
}

export function getAllAuthUsers() {
  return readUsers().sort((a, b) => a.id - b.id).map(sanitizeUser);
}

export async function getAllAuthUsersLive() {
  const users = await fetchFirestoreUsers();
  const activeUsers = users.filter(user => !user.isDeleted);
  return activeUsers.sort((a, b) => a.id - b.id).map(sanitizeUser);
}

export async function validateCredentials(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e || !p) {
    return { ok: false, message: "Please enter your email and password." };
  }

  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const firestoreUsers = snapshot.docs.map(mapFirestoreUser);

  writeUsers(firestoreUsers);

  const user = firestoreUsers.find(
    (item) => item.email.toLowerCase() === e && item.password === p
  );

  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }

  // Added: Check if user is soft deleted - prevent login
  if (user.isDeleted === true) {
    return { ok: false, message: "Your account has been deactivated. Please contact an administrator." };
  }

  setCurrentUser(user);

  return {
    ok: true,
    user: sanitizeUser(user),
    redirectTo: getLoginDestination(user.role),
  };
}

export async function createAuthUser(userData) {
  const users = await fetchFirestoreUsers();

  const name = String(userData?.name || "").trim();
  const email = String(userData?.email || "").trim().toLowerCase();
  const password = String(userData?.password || "");
  const role = normalizeRole(userData?.role);
  const contactNumber = String(userData?.contactNumber || "").trim();

  if (!name || !email || !password || !contactNumber) {
    return { ok: false, message: "Please complete all required fields." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  // Added: Check if email exists including soft deleted users to prevent duplicate registration
  const duplicate = users.some(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );

  if (duplicate) {
    return { ok: false, message: "That email is already registered." };
  }

  const newId = nextId(users);

  try {
    await setDoc(doc(db, USERS_COLLECTION, String(newId)), {
      user_id: newId,
      order_id: null,
      u_name: name,
      date_registered: serverTimestamp(),
      email,
      password,
      phone_number: contactNumber,
      role,
      is_deleted: false,
    });

    const newUser = {
      id: newId,
      orderId: null,
      name,
      email,
      password,
      role,
      contactNumber,
      dateRegistered: formatDateRegistered(new Date()),
      isDeleted: false,
    };

    writeUsers([...users, newUser]);

    return {
      ok: true,
      message: "User added successfully.",
      user: sanitizeUser(newUser),
    };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to create user in database." };
  }
}

export async function updateAuthUser(userId, updates) {
  const numericUserId = Number(userId);
  const users = await fetchFirestoreUsers();
  const index = users.findIndex((user) => user.id === numericUserId);

  if (index === -1) {
    return { ok: false, message: "User not found." };
  }

  const current = users[index];

  // Added: Prevent update of soft deleted users
  if (current.isDeleted === true) {
    return { ok: false, message: "Cannot update a deactivated account." };
  }

  const name = String(updates?.name || "").trim();
  const email = String(updates?.email || "").trim().toLowerCase();
  const password = String(updates?.password || "");
  const role = normalizeRole(updates?.role || current.role);
  const contactNumber = String(updates?.contactNumber || "").trim();

  if (!name || !email || !contactNumber) {
    return { ok: false, message: "Please complete all required fields." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const duplicate = users.some(
    (user) =>
      user.id !== numericUserId &&
      user.email.toLowerCase() === email.toLowerCase()
  );

  if (duplicate) {
    return { ok: false, message: "That email is already registered." };
  }

  const updatePayload = {
    u_name: name,
    email,
    phone_number: contactNumber,
    role,
  };

  if (password) {
    updatePayload.password = password;
  }

  try {
    await updateDoc(doc(db, USERS_COLLECTION, String(numericUserId)), updatePayload);

    const updatedUser = {
      ...current,
      name,
      email,
      password: password || current.password,
      role,
      contactNumber,
    };

    const nextUsers = [...users];
    nextUsers[index] = updatedUser;
    writeUsers(nextUsers);
    syncCurrentUser(updatedUser);

    return {
      ok: true,
      message: "User updated successfully.",
      user: sanitizeUser(updatedUser),
    };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to update user in database." };
  }
}

export async function updateCurrentUserProfile(updates) {
  const current = getCurrentUser();

  if (!current) {
    return { ok: false, message: "No active user session found." };
  }

  return updateAuthUser(current.id, {
    name: updates?.name,
    email: updates?.email,
    password: updates?.password,
    role: current.role,
    contactNumber: updates?.contactNumber,
  });
}

export async function deleteAuthUser(userId) {
  const numericUserId = Number(userId);
  const users = await fetchFirestoreUsers();
  const target = users.find((user) => user.id === numericUserId);

  if (!target) {
    return { ok: false, message: "User not found." };
  }

  // Added: Prevent deletion of already soft deleted users
  if (target.isDeleted === true) {
    return { ok: false, message: "User is already deactivated." };
  }

  try {
    // Changed: Soft delete - set is_deleted to true instead of removing document
    await updateDoc(doc(db, USERS_COLLECTION, String(numericUserId)), {
      is_deleted: true,
    });

    const updatedUser = { ...target, isDeleted: true };
    const nextUsers = users.map((user) =>
      user.id === numericUserId ? updatedUser : user
    );
    writeUsers(nextUsers);

    const current = readCurrentSession();
    if (current && current.id === numericUserId) {
      clearCurrentUser();
    }

    return {
      ok: true,
      message: "User deactivated successfully.",
    };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to deactivate user in database." };
  }
}

// Added: New function to permanently delete a user (hard delete)
export async function hardDeleteAuthUser(userId) {
  const numericUserId = Number(userId);
  const users = await fetchFirestoreUsers();
  const target = users.find((user) => user.id === numericUserId);

  if (!target) {
    return { ok: false, message: "User not found." };
  }

  try {
    await deleteDoc(doc(db, USERS_COLLECTION, String(numericUserId)));

    writeUsers(users.filter((user) => user.id !== numericUserId));

    const current = readCurrentSession();
    if (current && current.id === numericUserId) {
      clearCurrentUser();
    }

    return {
      ok: true,
      message: "User permanently deleted successfully.",
    };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to permanently delete user." };
  }
}

// Added: New function to restore a soft deleted user
export async function restoreAuthUser(userId) {
  const numericUserId = Number(userId);
  const users = await fetchFirestoreUsers();
  const target = users.find((user) => user.id === numericUserId);

  if (!target) {
    return { ok: false, message: "User not found." };
  }

  if (target.isDeleted !== true) {
    return { ok: false, message: "User is not deactivated." };
  }

  try {
    await updateDoc(doc(db, USERS_COLLECTION, String(numericUserId)), {
      is_deleted: false,
    });

    const updatedUser = { ...target, isDeleted: false };
    const nextUsers = users.map((user) =>
      user.id === numericUserId ? updatedUser : user
    );
    writeUsers(nextUsers);

    return {
      ok: true,
      message: "User restored successfully.",
      user: sanitizeUser(updatedUser),
    };
  } catch (error) {
    return { ok: false, message: error.message || "Failed to restore user." };
  }
}

export function resetAuthUsers() {
  writeUsers([]);
  clearCurrentUser();
}