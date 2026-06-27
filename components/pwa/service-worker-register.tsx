"use client";

import { useEffect } from "react";

/**
 * Gestione del service worker.
 * - In **produzione**: registra `/sw.js` (PWA offline + caching).
 * - In **sviluppo**: deregistra ogni SW residuo e svuota le cache. Questo evita
 *   che un SW lasciato da una build di produzione girata sulla stessa porta
 *   (es. :3001) continui a servire asset stale rompendo CSS/JS in `next dev`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registrazione fallita: l'app resta comunque funzionante */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
