const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// ─── Send Feedback Email ───────────────────────────────────────────────────
// Uses Gmail SMTP. Set these in Firebase config:
//   firebase functions:config:set gmail.user="your@gmail.com" gmail.pass="app-password"
exports.sendFeedbackEmail = functions.https.onCall({
  cors: ["https://komplex-guest.web.app", "https://komplex-guest.firebaseapp.com"],
}, async (data) => {
  const {name, email, mobile, feedback} = data;

  if (!name || !email || !feedback) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Name, email, and feedback are required.",
    );
  }

  const gmailUser = functions.config().gmail?.user;
  const gmailPass = functions.config().gmail?.pass;

  if (!gmailUser || !gmailPass) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "Email service is not configured. Please contact the administrator.",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {user: gmailUser, pass: gmailPass},
  });

  const mailOptions = {
    from: `"Komplex Café Feedback" <${gmailUser}>`,
    to: "komplexcafe.feedback@gmail.com",
    replyTo: email,
    subject: `${name} - Submitted a Feedback`,
    text: [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Mobile:  ${mobile || "N/A"}`,
      ``,
      `Feedback:`,
      feedback,
    ].join("\n"),
    html: `
      <h2 style="color:#e07820">New Feedback from Komplex Café</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Mobile:</strong> ${mobile || "N/A"}</p>
      <hr/>
      <p><strong>Feedback:</strong></p>
      <p style="white-space:pre-wrap">${feedback}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  return {success: true};
});

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