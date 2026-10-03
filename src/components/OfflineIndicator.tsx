import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useStore } from '../StoreContext';
import { AlertTriangle, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { dataSource } = useStore();

  // Se a conexão física estiver ativa e os dados vierem da nuvem, não exibe alerta
  if (isOnline && dataSource === 'nuvem') return null;

  return (
    <aside aria-label="Aviso de conexão" className="bg-amber-500 text-white px-3.5 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-50 transition-all animate-fade-in">
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Dispositivo desconectado da internet. Navegando em cache offline.</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-100" />
          <span>Atenção: Banco na nuvem temporariamente indisponível. Dados carregados do cache (podem estar desatualizados).</span>
        </>
      )}
    </aside>
  );
};
