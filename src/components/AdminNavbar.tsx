import React, { useState, useEffect } from 'react';
import { useDeviceBackButton } from '../hooks/useDeviceBackButton';
import { 
  Calendar, Sparkles, BellRing, Settings, 
  LogOut, Menu, X, Users, Share2, BookOpen
} from 'lucide-react';

export type AdminTab = 'agenda' | 'servicos' | 'clientes' | 'lembretes' | 'config' | 'catalogo';

interface AdminNavbarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isSupabaseConnected?: boolean;
  supabaseStatus?: 'connected' | 'table_missing' | 'local' | 'error' | 'not_configured';
  servicesCount?: number;
  blocksCount?: number;
  remindersCount?: number;
  pendingRemindersCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenShareLink?: () => void;
  onLogout: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  activeTab,
  onSelectTab,
  isSupabaseConnected = false,
  supabaseStatus = 'local',
  pendingRemindersCount = 0,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
  onOpenShareLink,
  onLogout,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('GABI_ADMIN_SIDEBAR_COLLAPSED') === 'true';
    }
    return false;
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (externalOnToggleCollapse) {
      externalOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('GABI_ADMIN_SIDEBAR_COLLAPSED', String(next));
        }
        return next;
      });
    }
  };

  // Fecha o drawer mobile com o botão de voltar do dispositivo
  useDeviceBackButton(isMobileDrawerOpen, () => setIsMobileDrawerOpen(false));

  // Fecha o drawer mobile com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  const navItems = [
    { id: 'agenda' as AdminTab, label: 'Agenda & Atendimentos', shortLabel: 'Agenda', icon: Calendar },
    { id: 'servicos' as AdminTab, label: 'Serviços & Procedimentos', shortLabel: 'Serviços', icon: Sparkles },
    { id: 'clientes' as AdminTab, label: 'Gestão de Clientes', shortLabel: 'Clientes', icon: Users },
    { 
      id: 'lembretes' as AdminTab, 
      label: 'Lembretes 24h WhatsApp', 
      shortLabel: 'Lembretes', 
      icon: BellRing, 
      unreadCount: pendingRemindersCount 
    },
    { id: 'catalogo' as AdminTab, label: 'Catálogo & Conteúdo', shortLabel: 'Catálogo', icon: BookOpen },
    { id: 'config' as AdminTab, label: 'Configurações do Espaço', shortLabel: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. SIDEBAR DESKTOP / TABLET (LADO ESQUERDO DA TELA - PADRÃO CRM)          */}
      {/* ========================================================================= */}
      <aside 
        className={`hidden md:flex flex-col sticky top-0 h-screen shrink-0 bg-white border-r border-[#EFE7DC] shadow-xs z-30 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-[74px]' : 'w-64'
        }`}
      >
        {/* Topo / Header da Sidebar */}
        <div className={`border-b border-[#F0E8DF] flex items-center transition-all ${
          isCollapsed ? 'h-20 justify-center p-2' : 'h-20 justify-start px-4'
        }`}>
          {isCollapsed ? (
            /* Botão com a logo GS da pasta public quando o menu estiver recolhido */
            <button
              type="button"
              onClick={handleToggleCollapse}
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#FAF6F2] hover:bg-[#F3ECE4] active:scale-95 border border-[#EFE7DC] transition-all cursor-pointer shadow-2xs group"
            >
              <img 
                src="/monograma-gs_1.png" 
                alt="Logo GS - Expandir menu lateral" 
                className="w-8 h-8 object-contain transition-transform group-hover:scale-110 select-none" 
              />
            </button>
          ) : (
            /* Própria Logo Gabriela Santos como botão para recolher o menu quando aberto */
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer text-left py-1.5 px-1 rounded-xl group"
              title="Clique na logo para recolher o menu"
              aria-label="Recolher menu lateral"
            >
              <img 
                src="/logo_gabi_header.png" 
                alt="Gabriela Santos - Clique para recolher o menu" 
                className="h-8 w-auto object-contain select-none transition-transform group-hover:scale-[1.02]" 
              />
            </button>
          )}
        </div>

        {/* Lista de Navegação Principal */}
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
          {!isCollapsed && (
            <div className="px-2 pt-2 pb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F]">
                Navegação
              </span>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasUnread = item.unreadCount !== undefined && item.unreadCount > 0;

            // ==========================================
            // Modo Recolhido: Mostra SOMENTE os Ícones
            // ==========================================
            if (isCollapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={`${item.label}${hasUnread ? ` (${item.unreadCount} lembretes para enviar)` : ''}`}
                  className={`relative w-12 h-12 rounded-2xl mx-auto flex items-center justify-center transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#201510] text-[#C5A88E] shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-[#201510] hover:bg-[#FAF6F2]'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#C5A88E]' : 'text-stone-500 group-hover:text-[#201510]'
                    }`} 
                    strokeWidth={isActive ? 2 : 1.75} 
                  />

                  {/* Contador de mensagens não lidas no Ícone Lembretes */}
                  {hasUnread && (
                    <span 
                      className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-pulse leading-none"
                      title={`${item.unreadCount} lembretes para enviar`}
                    >
                      {item.unreadCount! > 99 ? '99+' : item.unreadCount}
                    </span>
                  )}
                </button>
              );
            }

            // ==========================================
            // Modo Expandido: Mostra Ícone + Label Completo
            // ==========================================
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#201510] text-white shadow-2xs'
                    : 'text-stone-700 hover:bg-[#FAF6F2] hover:text-[#201510]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative transition-colors ${
                    isActive ? 'bg-white/15 text-[#C5A88E]' : 'bg-[#FAF6F2] text-[#8C6B4F] group-hover:bg-[#F3ECE4]'
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                  </div>
                  <span className="truncate font-medium">{item.shortLabel}</span>
                </div>

                {/* Contador de mensagens não lidas no modo expandido */}
                {hasUnread && (
                  <span 
                    className="ml-2 bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs flex items-center justify-center min-w-[20px] animate-pulse"
                    title={`${item.unreadCount} lembretes aguardando envio`}
                  >
                    {item.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className={`border-t border-[#F0E8DF] p-2.5 bg-[#FAF7F3] space-y-2 transition-all ${
          isCollapsed ? 'flex flex-col items-center justify-center' : ''
        }`}>
          {onOpenShareLink && (
            isCollapsed ? (
              <button
                type="button"
                onClick={onOpenShareLink}
                title="Compartilhar Link com Clientes"
                aria-label="Compartilhar link com clientes"
                className="w-11 h-11 flex items-center justify-center rounded-xl text-[#8C6B4F] hover:text-[#201510] hover:bg-[#F2E8DC] bg-white border border-[#E6D8CA] transition-colors cursor-pointer shadow-2xs group"
              >
                <Share2 className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShareLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-[#8C6B4F] hover:text-[#201510] bg-white hover:bg-[#F2E8DC] border border-[#E6D8CA] text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Link p/ Clientes</span>
              </button>
            )
          )}

          {isCollapsed ? (
            /* Botão Sair no Modo Ícones */
            <button
              type="button"
              onClick={onLogout}
              title="Sair do Painel"
              aria-label="Sair do painel"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200/70 transition-colors cursor-pointer shadow-2xs group"
            >
              <LogOut className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
            </button>
          ) : (
            /* Botão Sair no Modo Expandido */
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/70 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Painel</span>
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. HEADER TOP MOBILE (< md)                                               */}
      {/* ========================================================================= */}
      <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button 
          type="button" 
          onClick={() => onSelectTab('agenda')}
          className="hover:opacity-85 transition-opacity cursor-pointer"
          title="Gabriela Santos"
        >
          <img src="/logo_gabi_header.png" alt="Gabriela Santos" className="h-7 w-auto object-contain" />
        </button>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 text-[#201510] hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer"
          title="Abrir menu lateral"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5 text-[#201510]" strokeWidth={1.75} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. DRAWER LATERAL MOBILE (SLIDE-IN PELA ESQUERDA)                         */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-start animate-fade-in font-sans">
          {/* Backdrop escuro com desfoque */}
          <div 
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Conteúdo do Drawer */}
          <div className="relative w-full max-w-[290px] bg-white h-full shadow-2xl flex flex-col justify-between z-10 border-r border-stone-200/80 overflow-y-auto">
            <div>
              {/* Header do Drawer */}
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-[#FAF6F2]">
                <img src="/logo_gabi_header.png" alt="Gabriela Santos" className="h-7 w-auto object-contain" />
                <button 
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
                  title="Fechar menu"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {/* Lista de Navegação Mobile */}
              <nav className="p-3 space-y-1.5">
                <div className="px-2 pt-1 pb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F]">
                    Módulos do Sistema
                  </span>
                </div>

                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const hasUnread = item.unreadCount !== undefined && item.unreadCount > 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#201510] text-white font-semibold shadow-xs'
                          : 'text-stone-700 hover:bg-[#FAF6F2] hover:text-[#201510]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isActive ? 'bg-white/15 text-[#C5A88E]' : 'bg-[#FAF6F2] text-[#8C6B4F]'
                        }`}>
                          <Icon className="w-4 h-4" strokeWidth={1.6} />
                        </div>
                        <span className="text-left font-medium">{item.label}</span>
                      </div>
                      {hasUnread && (
                        <span className="bg-rose-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs flex items-center justify-center min-w-[20px] animate-pulse">
                          {item.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé do Drawer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/70 space-y-2">
              {onOpenShareLink && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenShareLink();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[#8C6B4F] bg-white hover:bg-[#FAF6F2] border border-[#E6D8CA] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Link para Clientes</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair do Painel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM BAR MOBILE (< md)                                               */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/90 z-30 px-1 py-1 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasUnread = item.unreadCount !== undefined && item.unreadCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#201510] font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#8C6B4F]' : 'text-stone-400'}`} strokeWidth={isActive ? 2 : 1.5} />
                {hasUnread && (
                  <span className="absolute -top-1 -right-2 text-[9px] min-w-[16px] h-[16px] px-1 rounded-full font-bold bg-rose-600 text-white flex items-center justify-center leading-none border border-white animate-pulse">
                    {item.unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] mt-0.5 whitespace-nowrap ${isActive ? 'font-bold text-[#201510]' : 'font-medium'}`}>
                {item.shortLabel}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#8C6B4F] mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
