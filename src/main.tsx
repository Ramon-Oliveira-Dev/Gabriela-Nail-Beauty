import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupPwaAutoUpdate } from './pwaAutoUpdate';

// Gerenciamento de Service Worker e Caches (apenas PROD registra)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (const registration of registrations) {
        registration.update().catch((err) => {
          console.warn('[PWA] Falha ao atualizar Service Worker (rede/offline):', err);
        });
      }
    }).catch(() => {});

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  } else {
    // Fora de produção: desregistra todos os Service Workers e limpa os caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});

    if ('caches' in window) {
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).catch(() => {});
    }
  }
}

// Inicializa a rotina de atualização da PWA
setupPwaAutoUpdate();

createRoot(document.getElementById('root')!).render(
  <App />
);


