import React, { useState } from 'react';
import { 
  Calendar, ClipboardList, Sparkles, Clock, 
  Layers, Heart, User, Lock 
} from 'lucide-react';

export type ClientNavTab = 
  | 'agendar' 
  | 'meus-agendamentos' 
  | 'aplicacoes' 
  | 'manutencoes' 
  | 'esmaltacao' 
  | 'outros' 
  | 'experiencia' 
  | 'sobre';

interface ClientNavbarProps {
  activeTab?: ClientNavTab;
  onNavigateToBooking: (category?: 'todos' | 'aplicacao' | 'manutencao' | 'outros') => void;
  onOpenMyAppointments: () => void;
  onOpenAplicacoes: () => void;
  onOpenManutencoes: () => void;
  onOpenEsmaltacaoEmGel: () => void;
  onOpenOutrosServicos: () => void;
  onOpenGallery: (title: string, subtitle: string, images: string[]) => void;
  onNavigateToAboutMe: () => void;
  onAdminClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ClientNavbar: React.FC<ClientNavbarProps> = ({
  activeTab = 'agendar',
  onNavigateToBooking,
  onOpenMyAppointments,
  onOpenAplicacoes,
  onOpenManutencoes,
  onOpenEsmaltacaoEmGel,
  onOpenOutrosServicos,
  onOpenGallery,
  onNavigateToAboutMe,
  onAdminClick,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('GABI_CLIENT_SIDEBAR_COLLAPSED') === 'true';
    }
    return false;
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (externalOnToggleCollapse) {
      externalOnToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('GABI_CLIENT_SIDEBAR_COLLAPSED', String(next));
        }
        return next;
      });
    }
  };

  const navItems = [
    {
      id: 'agendar' as ClientNavTab,
      label: 'Agendar Horário',
      shortLabel: 'Agendar',
      icon: Calendar,
      onClick: () => onNavigateToBooking('todos'),
    },
    {
      id: 'meus-agendamentos' as ClientNavTab,
      label: 'Meus Agendamentos',
      shortLabel: 'Meus Horários',
      icon: ClipboardList,
      onClick: onOpenMyAppointments,
    },
    {
      id: 'aplicacoes' as ClientNavTab,
      label: 'Aplicações (Molde F1 / Gel)',
      shortLabel: 'Aplicações',
      icon: Sparkles,
      onClick: onOpenAplicacoes,
    },
    {
      id: 'manutencoes' as ClientNavTab,
      label: 'Manutenções de Unhas',
      shortLabel: 'Manutenções',
      icon: Clock,
      onClick: onOpenManutencoes,
    },
    {
      id: 'esmaltacao' as ClientNavTab,
      label: 'Esmaltação em Gel',
      shortLabel: 'Esmaltação',
      icon: Sparkles,
      onClick: onOpenEsmaltacaoEmGel,
    },
    {
      id: 'outros' as ClientNavTab,
      label: 'Outros Serviços',
      shortLabel: 'Outros',
      icon: Layers,
      onClick: onOpenOutrosServicos,
    },
    {
      id: 'experiencia' as ClientNavTab,
      label: 'Viva esta Experiência',
      shortLabel: 'Experiência',
      icon: Heart,
      onClick: () => onOpenGallery(
        'Viva esta Experiência',
        'SEU MOMENTO DE CUIDADO E RELAXAMENTO.',
        [
          '/viva_experiencia_1.webp',
          '/viva_experiencia_2.webp',
          '/viva_experiencia_3.webp',
          '/viva_experiencia_4.webp',
          '/viva_experiencia_5.webp',
        ]
      ),
    },
    {
      id: 'sobre' as ClientNavTab,
      label: 'Sobre a Gabriela',
      shortLabel: 'Sobre Mim',
      icon: User,
      onClick: onNavigateToAboutMe,
    },
  ];

  return (
    /* ========================================================================= */
    /* SIDEBAR DESKTOP / TABLET (SOMENTE NO MODO CURRENT SCREEN SIZE: md:)      */
    /* ========================================================================= */
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

          // Modo Recolhido: Mostra SOMENTE os Ícones
          if (isCollapsed) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                title={item.label}
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
              </button>
            );
          }

          // Modo Expandido: Mostra Ícone + Rótulo
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
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
            </button>
          );
        })}
      </nav>

      {/* Rodapé da Sidebar: Área Profissional */}
      <div className={`border-t border-[#F0E8DF] p-2.5 bg-[#FAF7F3] transition-all ${
        isCollapsed ? 'flex items-center justify-center' : ''
      }`}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={onAdminClick}
            title="Acesso Área Profissional"
            aria-label="Acesso Área Profissional"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-stone-600 hover:text-[#201510] hover:bg-[#FAF6F2] border border-stone-200/70 transition-colors cursor-pointer shadow-2xs group"
          >
            <Lock className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onAdminClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-stone-700 bg-white hover:bg-[#FAF6F2] hover:text-[#201510] border border-[#E2D6CB] text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Lock className="w-4 h-4 text-[#8C6B4F]" />
            <span>Área Profissional</span>
          </button>
        )}
      </div>
    </aside>
  );
};
