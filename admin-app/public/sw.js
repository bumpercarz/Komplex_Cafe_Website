// ─── sw.js — place this file in your admin-app/public folder ─────────────────

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (err) {
    console.warn("[sw.js] Could not parse push payload:", err);
  }

  const title   = data.title ?? "New Notification";
  const options = {
    body:               data.body              ?? "",
    icon:               data.icon              ?? "/favicon.ico",
    badge:              data.badge             ?? "/favicon.ico",
    tag:                data.tag               ?? "default",
    requireInteraction: data.requireInteraction ?? false,
    data: {
      // ── Append ?from=notification so App.jsx knows NOT to clear the session
      url:            (data.url ?? "/admin/notifications") + "?from=notification",
      notificationId: data.notificationId ?? null,
      isPersistent:   data.isPersistent   ?? false,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click: open /admin/notifications without clearing session ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/admin/notifications?from=notification";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open in a tab, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // No existing tab — open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
