import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider } from './i18n';
import { AuthProvider } from './AuthContext';

/**
 * Must match CACHE_VERSION in public/sw.js — bump BOTH together on deploy.
 * main.tsx proactively unregisters any controlling service worker whose
 * reported version mismatches, so users never get stuck on a stale app.
 */
const EXPECTED_SW_VERSION = 'daybill-v1';

async function syncServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      const version = await new Promise<string | null>((resolve) => {
        const channel = new MessageChannel();
        const timer = window.setTimeout(() => resolve(null), 1500);
        channel.port1.onmessage = (event) => {
          window.clearTimeout(timer);
          const v =
            event.data && typeof event.data.version === 'string'
              ? (event.data.version as string)
              : null;
          resolve(v);
        };
        controller.postMessage({ type: 'DAYBILL_GET_VERSION' }, [
          channel.port2,
        ]);
      });
      if (version && version !== EXPECTED_SW_VERSION) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        window.location.reload();
        return;
      }
    }
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    // Service workers are best-effort; the app works fine without one.
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Register the worker only in production builds so dev stays uncached.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void syncServiceWorker();
  });
}
