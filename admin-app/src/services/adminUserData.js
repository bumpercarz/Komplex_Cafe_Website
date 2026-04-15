// adminUserData.js
import {
  getAllAuthUsers,
  getAllAuthUsersLive,
  createAuthUser,
  updateAuthUser,
  deleteAuthUser,
} from "./authService";

// OWNER is excluded — ownership is only assigned via transferOwnership()
export const USER_ROLE_OPTIONS = ["ADMIN", "STAFF"];

function toRoleLabel(role) {
  const normalized = String(role || "").toUpperCase();
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function mapUser(user) {
  return {
    ...user,
    roleLabel: toRoleLabel(user.role),
  };
}

export function getAllUsers() {
  return getAllAuthUsers().map(mapUser);
}

export async function getAllUsersLive() {
  const users = await getAllAuthUsersLive();
  return users.map(mapUser);
}

export async function createUserAccount(formValues) {
  return createAuthUser({
    name: formValues.name,
    email: formValues.email,
    password: formValues.password,
    role: formValues.role,
    contactNumber: formValues.contactNumber.replace(/\D/g, ""),
  });
}

export async function updateUserAccount(userId, formValues) {
  return updateAuthUser(userId, {
    name: formValues.name,
    email: formValues.email,
    password: formValues.password,
    role: formValues.role,
    contactNumber: formValues.contactNumber.replace(/\D/g, ""),
  });
}

export async function deleteUserAccount(userId) {
  return deleteAuthUser(userId);
}

export async function transferOwnership(currentOwnerId, newOwnerId) {
  const currentId = Number(currentOwnerId);
  const newId = Number(newOwnerId);

  const users = await getAllAuthUsersLive();

  const newOwner = users.find((u) => Number(u.id) === newId);
  const currentOwner = users.find((u) => Number(u.id) === currentId);

  if (!newOwner || !currentOwner) {
    return { ok: false, message: "User not found." };
  }

  await updateAuthUser(newId, {
    name: newOwner.name,
    email: newOwner.email,
    password: "",
    role: "OWNER",
    contactNumber: newOwner.contactNumber,
  });

  await updateAuthUser(currentId, {
    name: currentOwner.name,
    email: currentOwner.email,
    password: "",
    role: "ADMIN",
    contactNumber: currentOwner.contactNumber,
  });

  return { ok: true, message: "Ownership transferred successfully." };
}