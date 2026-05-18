// ─── sw.js — guest-app/public/sw.js ──────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (err) {
    console.warn("[guest sw.js] Could not parse push payload:", err);
  }

  const title   = data.title ?? "Komplex Cafe";
  const options = {
    body:               data.body              ?? "",
    icon:               "/komplexLogoTransparent.png",
    badge:              "/komplexLogoTransparent.png",
    tag:                data.tag               ?? "order-status",
    requireInteraction: data.requireInteraction ?? false,
    data: {
      url: data.url ?? "/confirmation",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Tap notification → bring the guest back to the confirmation page ─────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/confirmation";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
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