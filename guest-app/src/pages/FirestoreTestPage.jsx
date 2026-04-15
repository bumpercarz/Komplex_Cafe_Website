import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export default function FirestoreTestPage() {
  const [name, setName] = useState("");
  const [users, setUsers] = useState([]);

  const usersRef = collection(db, "users");

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(usersRef);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(list);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddUser = async () => {
    if (!name.trim()) return;

    try {
      await addDoc(usersRef, {
        name: name.trim(),
        createdAt: serverTimestamp(),
      });
      setName("");
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: "24px" }}>
      <h1>Firestore Test</h1>

      <input
        type="text"
        value={name}
        placeholder="Enter name"
        onChange={(e) => setName(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      />

      <button onClick={handleAddUser}>Add User</button>

      <ul style={{ marginTop: "20px" }}>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}