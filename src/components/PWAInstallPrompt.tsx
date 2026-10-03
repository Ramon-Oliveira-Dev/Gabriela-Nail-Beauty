import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'menu-item' | 'auto';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ 
  variant = 'button',
  className = '' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  // Auto-prompt banner for first access
  useEffect(() => {
    if (isInstalled) return;

    // Check if user already dismissed or interacted with the banner
    const hasSeenBanner = localStorage.getItem('gabi_pwa_first_access_banner');
    if (!hasSeenBanner) {
      // Small delay to let the page load
      const timer = setTimeout(() => {
        setIsDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  // If already installed in standalone mode, suppress all install UI
  if (isInstalled) {
    return null;
  }

  const handleDismissBanner = () => {
    setIsDismissed(true);
    localStorage.setItem('gabi_pwa_first_access_banner', 'true');
  };

  const handleInstallClick = async () => {
    localStorage.setItem('gabi_pwa_first_access_banner', 'true');
    if (isInstallable) {
      const outcome = await install();
      if (outcome) setIsDismissed(true);
    } else if (isIOS) {
      setIsDismissed(true);
      setShowIOSGuide(true);
    } else {
      setIsDismissed(true);
      setShowAndroidGuide(true);
    }
  };

  // Render Guide Modals
  const renderModals = () => (
    <>
      {/* 1. Modal de Instruções para iPhone / iPad (iOS Safari) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6F2] p-6 shadow-2xl border border-[#EADDCF] relative text-[#201510]">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/pwa-192x192.png" 
                alt="Logo Gabriela Nail" 
                className="w-12 h-12 rounded-xl border border-[#EADDCF] object-contain bg-white p-0.5 shadow-sm"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-[#201510]">Instalar no iPhone</h3>
                <p className="text-[11px] text-[#76685F]">Adicione o app com o ícone oficial</p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs text-[#54463E] leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#EADDCF]/70">
                <div className="w-7 h-7 rounded-xl bg-[#FAF6F2] flex items-center justify-center text-[#8C6B4F] shrink-0 font-bold text-xs">
                  1
                </div>
                <p>
                  Toque no botão de <strong>Compartilhar</strong> <Share2 className="w-3.5 h-3.5 inline text-[#8C6B4F] mx-0.5" /> na barra inferior do Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#EADDCF]/70">
                <div className="w-7 h-7 rounded-xl bg-[#FAF6F2] flex items-center justify-center text-[#8C6B4F] shrink-0 font-bold text-xs">
                  2
                </div>
                <p>
                  Role a lista e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#8C6B4F] mx-0.5" />.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#EADDCF]/70">
                <div className="w-7 h-7 rounded-xl bg-[#FAF6F2] flex items-center justify-center text-[#8C6B4F] shrink-0 font-bold text-xs">
                  3
                </div>
                <p>
                  Toque em <strong>Adicionar</strong> no canto superior direito para finalizar.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3.5 rounded-2xl bg-[#201510] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#38261E] transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal de Instruções para Android / Outros Navegadores */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF6F2] p-6 shadow-2xl border border-[#EADDCF] relative text-[#201510]">
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-200/80 hover:bg-stone-300 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/pwa-192x192.png" 
                alt="Logo Gabriela Nail" 
                className="w-12 h-12 rounded-xl border border-[#EADDCF] object-contain bg-white p-0.5 shadow-sm"
              />
              <div>
                <h3 className="font-serif text-lg font-bold text-[#201510]">Instalar Aplicativo</h3>
                <p className="text-[11px] text-[#76685F]">Adicione o app direto na tela inicial</p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs text-[#54463E] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-white border border-[#EADDCF]/70">
                <p className="font-semibold text-[#201510] mb-1">Pelo menu do seu navegador:</p>
                <p className="text-[11px] text-stone-600">
                  Toque no ícone de <strong>três pontos (⋮)</strong> no canto superior direito e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/70 p-2.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>O ícone oficial da Gabriela aparecerá junto aos seus aplicativos!</span>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-3.5 rounded-2xl bg-[#201510] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#38261E] transition-colors cursor-pointer"
            >
              Ok, entendi
            </button>
          </div>
        </div>
      )}
    </>
  );

  // Variant: Menu Item (Used inside Drawer menu)
  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-[#FAF6F2] text-[#231812] transition-colors group text-left cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAF6F2] group-hover:bg-white flex items-center justify-center text-[#8C6B4F] border border-[#EFE5DC] transition-colors overflow-hidden">
              <img src="/pwa-192x192.png" alt="App" className="w-6 h-6 object-contain rounded-md" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-medium text-[#231812]">Instalar Aplicativo</p>
                <span className="bg-[#8C6B4F] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">PWA</span>
              </div>
              <p className="text-[10px] text-[#76685F]">Adicione à tela inicial do celular</p>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#8C6B4F] group-hover:translate-y-0.5 transition-all" />
        </button>
        {renderModals()}
      </>
    );
  }

  // Variant: Banner (Bottom floating or dock banner)
  if (variant === 'banner') {
    if (isDismissed) return renderModals();

    return (
      <>
        <div className={`fixed bottom-3 inset-x-3 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-sm bg-[#201510] text-white rounded-2xl p-3 shadow-xl border border-[#8C6B4F]/40 flex items-center justify-between gap-3 animate-slide-up ${className}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img 
              src="/pwa-192x192.png" 
              alt="Logo Gabriela Nail" 
              className="w-10 h-10 rounded-xl bg-white p-0.5 border border-[#8C6B4F]/40 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">Instalar Aplicativo</p>
              <p className="text-[10px] text-stone-300 line-clamp-1">Agende mais rápido pela tela inicial</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#8C6B4F] hover:bg-[#A37E60] text-white text-[11px] font-bold tracking-wider uppercase transition-colors shadow-2xs cursor-pointer"
            >
              Instalar
            </button>
            <button
              onClick={handleDismissBanner}
              className="w-7 h-7 rounded-lg text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Dispensar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {renderModals()}
      </>
    );
  }

  // Variant: Standard Button (Header, Navbar, etc.)
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2D6CB] hover:border-[#8C6B4F] bg-white/90 hover:bg-white text-xs font-semibold text-[#201510] transition-colors shadow-2xs cursor-pointer ${className}`}
        title="Instalar aplicativo no dispositivo"
      >
        <img src="/pwa-192x192.png" alt="" className="w-3.5 h-3.5 rounded object-contain" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
      {renderModals()}
    </>
  );
};

