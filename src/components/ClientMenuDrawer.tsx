import React from 'react';
import { 
  X, Calendar, Sparkles, User, 
  Lock, ChevronRight
} from 'lucide-react';

interface ClientMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBooking: (category: any) => void;
  onOpenGallery: (title: string, subtitle: string, images: string[]) => void;
  onOpenAplicacoes?: () => void;
  onOpenManutencoes?: () => void;
  onOpenEsmaltacaoEmGel?: () => void;
  onOpenOutrosServicos?: () => void;
  onNavigateToAboutMe: () => void;
  onAdminClick: () => void;
  whatsappUrl?: string;
  instagramUrl?: string;
  addressUrl?: string;
  addressText?: string;
}

export const ClientMenuDrawer: React.FC<ClientMenuDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToBooking,
  onOpenGallery,
  onNavigateToAboutMe,
  onAdminClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Lateral */}
      <div className="relative w-full max-w-[300px] sm:max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 border-l border-stone-200/80 overflow-y-auto">
        <div>
          {/* Cabeçalho do Drawer */}
          <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-[#FAF6F2]/70">
            <img 
              src="/logo_gabi_header.png" 
              alt="Gabriela Santos" 
              className="h-8 sm:h-9 w-auto object-contain select-none" 
            />
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#76685F] hover:text-[#231812] hover:bg-stone-100 transition-colors"
              title="Fechar menu"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Menu de Navegação do Cliente */}
          <div className="p-3 sm:p-4 space-y-1.5">
            
            {/* 1. Agendar Horário */}
            <button
              onClick={() => onNavigateToBooking('todos')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#201510] text-white hover:bg-[#38261E] transition-all shadow-xs group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#C5A88E]">
                  <Calendar className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold tracking-wide">Agendar Horário</p>
                  <p className="text-[10px] text-stone-300 font-normal">Escolha serviço, data e horário</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Separador institucional */}
            <div className="pt-2 pb-1">
              <p className="px-2 text-[10px] uppercase font-bold tracking-wider text-[#A08775]">Institucional</p>
            </div>

            {/* Viva esta Experiência */}
            <button
              onClick={() => onOpenGallery(
                'Viva esta Experiência',
                'SEU MOMENTO DE CUIDADO E RELAXAMENTO.',
                [
                  '/viva_experiencia_1.webp',
                  '/viva_experiencia_2.webp',
                  '/viva_experiencia_3.webp',
                  '/viva_experiencia_4.webp',
                  '/viva_experiencia_5.webp',
                ]
              )}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-[#FAF6F2] text-[#231812] transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FAF6F2] group-hover:bg-white flex items-center justify-center text-[#8C6B4F] border border-[#EFE5DC] transition-colors">
                  <Sparkles className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#231812]">Viva esta Experiência</p>
                  <p className="text-[10px] text-[#76685F]">O que torna nosso espaço único</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Sobre Mim */}
            <button
              onClick={onNavigateToAboutMe}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-[#FAF6F2] text-[#231812] transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FAF6F2] group-hover:bg-white flex items-center justify-center text-[#8C6B4F] border border-[#EFE5DC] transition-colors">
                  <User className="w-4 h-4" strokeWidth={1.6} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#231812]">Sobre Mim</p>
                  <p className="text-[10px] text-[#76685F]">Conheça a Gabriela Santos</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

          </div>
        </div>

        {/* 7. Parte Inferior: Acesso Admin */}
        <div className="p-4 border-t border-stone-100 bg-[#FAF6F2]/80 space-y-2">
          {/* Botão Acesso Admin */}
          <button
            onClick={() => {
              onClose();
              onAdminClick();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-stone-50 border border-[#E2D6CB] text-[#231812] transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#F4EFEA] flex items-center justify-center text-[#8C6B4F]">
                <Lock className="w-3.5 h-3.5" strokeWidth={1.8} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#231812] uppercase tracking-wider">Acesso Admin</p>
                <p className="text-[10px] text-[#76685F]">Painel de gestão da profissional</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </button>


        </div>

      </div>
    </div>
  );
};
