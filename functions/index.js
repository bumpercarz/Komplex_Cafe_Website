const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// Example: GET /api/v1/courses
app.get("/v1/courses", async (req, res) => {
  try {
    const perPage = Number(req.query.per_page) || 10;
    const snapshot = await db
    .collection("courses")
    .limit(perPage)
    .get();

    const courses = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json({data: courses});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// Export as "api" → becomes /api/v1/courses
exports.api = functions.https.onRequest(app);
