const { onRequest } = require("firebase-functions/v2/https");
const webpush = require("web-push");

exports.sendPush = onRequest(
  { secrets: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).send("");

    const { subscription, title, body, tag, requireInteraction } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: "Missing subscription" });
    }

    webpush.setVapidDetails(
      "mailto:you@yourdomain.com",  // <-- replace with your actual email
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title:              title             ?? "New Notification",
      body:               body              ?? "",
      tag:                tag               ?? "default",
      requireInteraction: requireInteraction ?? false,
      url:                "/",
    });

    try {
      await webpush.sendNotification(subscription, payload);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Push failed:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);