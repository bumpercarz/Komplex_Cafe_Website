// ─── guestPushService.js ──────────────────────────────────────────────────────
// Mirrors how the admin app handles push, but for the guest side.
// Call initGuestPush() once on ConfirmationPage mount.
// Call sendGuestPush() whenever you want to fire a notification.

const VAPID_PUBLIC_KEY = "qAM7nOvzlnbAxCG6Xbeqr6yLNdVd7_HEFcS-tgUWMZw";

// Same Cloud Function the admin app uses
const PUSH_FUNCTION_URL =
  "https://us-central1-" +
  (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "YOUR_PROJECT_ID") +
  ".cloudfunctions.net/sendPush";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Register SW + subscribe to push, store subscription in sessionStorage ────
export async function initGuestPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    // Reuse existing subscription if available
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Persist so sendGuestPush() can grab it without re-registering
    sessionStorage.setItem("guest_push_sub", JSON.stringify(subscription));
    return subscription;
  } catch (err) {
    console.error("[guestPushService] initGuestPush failed:", err);
    return null;
  }
}

// ─── Send a push notification to this guest via the Cloud Function ─────────────
export async function sendGuestPush({ title, body, tag = "order-status", requireInteraction = false, url = "/confirmation" }) {
  let subscription = null;

  // Try sessionStorage first (faster), fall back to live SW subscription
  try {
    const stored = sessionStorage.getItem("guest_push_sub");
    if (stored) {
      subscription = JSON.parse(stored);
    } else if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      subscription = await registration.pushManager.getSubscription();
    }
  } catch (err) {
    console.warn("[guestPushService] Could not retrieve subscription:", err);
  }

  if (!subscription) {
    console.warn("[guestPushService] No push subscription found — skipping push.");
    return;
  }

  try {
    await fetch(PUSH_FUNCTION_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        title,
        body,
        tag,
        requireInteraction,
        url,
      }),
    });
  } catch (err) {
    console.error("[guestPushService] sendGuestPush fetch failed:", err);
  }
}