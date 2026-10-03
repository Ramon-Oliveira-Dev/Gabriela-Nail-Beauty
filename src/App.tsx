import React, { useState, useCallback } from 'react';
import { StoreProvider } from './StoreContext';
import { ClientArea } from './components/ClientArea';
import { AdminArea } from './components/AdminArea';
import { SplashScreen } from './components/SplashScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <StoreProvider>
      <OfflineIndicator />
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {!showSplash && (
        view === 'client' ? (
          <ClientArea onAdminClick={() => setView('admin')} />
        ) : (
          <AdminArea onLogout={() => setView('client')} />
        )
      )}
    </StoreProvider>
  );
}

