import { registerSW } from 'virtual:pwa-register';

declare global {
  interface Window {
    __forcePwaCachePurgeAndReload?: () => Promise<void>;
  }
}

/**
 * Exibe o aviso "Atualização disponível — Atualizar" e recarrega de forma limpa
 */
export function showUpdateNotification() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pwa-update-notice')) return;

  const notice = document.createElement('div');
  notice.id = 'pwa-update-notice';
  notice.setAttribute('style', 'position: fixed; bottom: 16px; left: 16px; right: 16px; max-width: 420px; margin: 0 auto; z-index: 9999; background: #201510; color: #fff; border: 1px solid #8C6B4F; border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); font-family: sans-serif;');
  notice.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #34d399; flex-shrink: 0;"></span>
      <div style="font-size: 12px; line-height: 1.3;">
        <strong style="color: #F0E8DF; display: block;">Atualização disponível</strong>
        <span style="color: #A89C94; font-size: 11px;">Novos serviços e fotos sincronizados</span>
      </div>
    </div>
    <button id="pwa-update-action-btn" style="background: #8C6B4F; color: #fff; border: none; border-radius: 10px; padding: 6px 14px; font-size: 12px; font-weight: bold; cursor: pointer; flex-shrink: 0;">
      Atualizar
    </button>
  `;

  document.body.appendChild(notice);

  const btn = document.getElementById('pwa-update-action-btn');
  if (btn) {
    btn.onclick = () => {
      window.location.reload();
    };
  }

  // Recarga automática após 3 segundos
  setTimeout(() => {
    window.location.reload();
  }, 3000);
}

/**
 * Configura as rotinas nucleares de atualização do Service Worker da PWA (apenas em produção)
 */
export function setupPwaAutoUpdate() {
  if (typeof window === 'undefined') return;

  // Fora de produção: desregistra todos os Service Workers e limpa caches de desenvolvimento
  if (!import.meta.env.PROD) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      }).catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).catch(() => {});
    }
    return;
  }

  if ('serviceWorker' in navigator) {
    // 1. Escuta quando um novo Service Worker assume o controle da página
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    // 2. Registro com VitePWA (registerType: 'autoUpdate')
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true);
      },
      onRegisterError(err) {
        console.warn('[PWA] Aviso no registro do Service Worker:', err);
      }
    });

    // 3. Atualização automática ao retornar ao app ou alternar abas
    const triggerUpdate = () => {
      if (navigator.onLine) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerUpdate();
      }
    });

    window.addEventListener('focus', triggerUpdate);
    window.addEventListener('online', triggerUpdate);
  }
}

export const initPWAAutoUpdate = setupPwaAutoUpdate;
