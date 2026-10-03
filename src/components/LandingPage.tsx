import React, { useState } from 'react';
import { Menu, Instagram, MessageCircle, MapPin, ClipboardList, ArrowRight, Clock, Sparkles, X } from 'lucide-react';
import { MyAppointmentsModal } from './MyAppointmentsModal';
import { ServicesGrid } from './ServicesGrid';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { Service } from '../types';
import { useStore } from '../StoreContext';
import { cleanPhoneNumber, formatCurrency, formatDuration } from '../utils';
import { useDeviceBackButton } from '../hooks/useDeviceBackButton';

interface LandingPageProps {
  onStart: () => void;
  onAdminClick: () => void;
  onOpenMenu: () => void;
  onSelectService?: (service: Service) => void;
  selectedServices?: Service[];
  onToggleService?: (service: Service) => void;
  onRemoveService?: (serviceId: string, e?: React.MouseEvent) => void;
  onClearSelection?: () => void;
  onContinueToBooking?: () => void;
  onUpdateComplements?: (parentService: Service, complements: Service[]) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStart, 
  onAdminClick, 
  onOpenMenu, 
  onSelectService,
  selectedServices = [],
  onToggleService,
  onRemoveService,
  onClearSelection,
  onContinueToBooking,
  onUpdateComplements,
}) => {
  const { services, config } = useStore();
  const [isMyAppointmentsOpen, setIsMyAppointmentsOpen] = useState(false);
  const [isComplementModalActive, setIsComplementModalActive] = useState(false);

  // Fecha o modal de 'Meus Agendamentos' se o usuário apertar o botão de voltar do dispositivo
  useDeviceBackButton(isMyAppointmentsOpen, () => setIsMyAppointmentsOpen(false));

  const cleanPhone = cleanPhoneNumber(config.whatsapp || '27996040206');
  const whatsappUrl = `https://wa.me/55${cleanPhone}`;
  const instagramUrl = `https://instagram.com/${config.instagram || 'gabrielanail.beauty'}`;
  const addressUrl = config.address ? `https://maps.google.com/?q=${encodeURIComponent(config.address)}` : '#';

  const totalDurationMinutes = selectedServices.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalPrice = selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);

  const handleSelectServiceCard = (service: Service) => {
    if (onSelectService) {
      onSelectService(service);
    } else {
      onStart();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#231812] flex flex-col justify-between selection:bg-[#F5EFEB] selection:text-[#231812] antialiased">
      
      {/* 1. Header (Mobile: Centralizado + Hambúrguer | Desktop: Logo na esquerda, links no centro e botões à direita) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-100/80 px-4 sm:px-8 py-3 sm:py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative">
          
          {/* Mobile Spacer (mantém logo perfeitamente centralizado em telas menores que md) */}
          <div className="w-8 h-8 shrink-0 md:hidden invisible" aria-hidden="true" />
          
          {/* Logo Gabriela Santos */}
          <div 
            className="md:relative absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 flex items-center cursor-pointer text-center z-10" 
            onClick={onStart}
          >
            <img src="/logo_gabi_header.png" alt="Gabriela Santos" className="h-8 sm:h-10 md:h-11 w-auto object-contain select-none" />
          </div>

          {/* Navegação Desktop / Tablet (visível a partir de md:) */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-[11px] lg:text-xs font-bold uppercase tracking-wider text-[#231812]">
            <a 
              href="#servicos" 
              className="hover:text-[#8C6B4F] transition-colors cursor-pointer py-1 uppercase"
            >
              SERVIÇOS
            </a>
            <button 
              type="button" 
              onClick={() => setIsMyAppointmentsOpen(true)}
              className="hover:text-[#8C6B4F] transition-colors cursor-pointer py-1 uppercase"
            >
              MEUS AGENDAMENTOS
            </button>
            <button 
              type="button" 
              onClick={onOpenMenu}
              className="hover:text-[#8C6B4F] transition-colors cursor-pointer py-1 uppercase"
            >
              MENU E CATÁLOGO
            </button>
            <button 
              type="button" 
              onClick={onAdminClick}
              className="text-[#8C6B4F] hover:text-[#201510] transition-colors cursor-pointer py-1 uppercase"
            >
              ÁREA DO PROFISSIONAL
            </button>
          </nav>

          {/* Ações da Direita: CTA Agendar em desktop + Menu Hambúrguer */}
          <div className="flex items-center gap-2.5 sm:gap-3 z-10">
            <button
              type="button"
              onClick={onStart}
              className="hidden md:flex items-center gap-2 bg-[#201510] text-white hover:bg-[#38261E] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>AGENDAR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button 
              onClick={onOpenMenu} 
              title="Menu de opções"
              className="w-8 h-8 flex items-center justify-center text-[#231812] hover:opacity-75 transition-opacity cursor-pointer shrink-0"
            >
              <Menu className="w-6 h-6 text-[#231812]" strokeWidth={1.3} />
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section */}
        <section className="relative bg-[#F5EFEB] overflow-hidden pt-10 sm:pt-14 md:pt-16 pb-16 sm:pb-20 md:pb-24 min-h-[360px] sm:min-h-[420px] flex items-center justify-center text-center">
          
          {/* Conteúdo textual da Hero centralizado */}
          <div className="max-w-3xl mx-auto px-4 sm:px-8 w-full relative z-10 flex flex-col items-center justify-center">
            <div className="w-full space-y-6 sm:space-y-8">
              
              <h1 className="font-serif text-[2.75rem] sm:text-5xl lg:text-[4rem] leading-[1.05] text-[#221711] font-normal tracking-tight">
                Seja<br />
                <span className="font-serif">bem-vinda</span>
              </h1>

              <div className="pt-2 sm:pt-4 pb-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full">
                {/* Botão Principal: Agendar Horário */}
                <button 
                  id="btn-agendar-horario-hero"
                  onClick={onStart} 
                  className="w-full max-w-[280px] h-[52px] group relative overflow-hidden bg-[#201510] border-[1.5px] border-[#201510] text-[#FDFBF7] px-6 rounded-full flex items-center justify-center gap-3 text-[13px] sm:text-sm font-bold tracking-[0.14em] uppercase hover:bg-[#38261E] hover:border-[#38261E] transition-all duration-300 shadow-[0_8px_25px_rgb(32,21,16,0.18)] hover:shadow-[0_12px_32px_rgb(32,21,16,0.28)] hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer shrink-0"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                  <span className="relative z-10">AGENDAR HORÁRIO</span>
                  {/* Ícone de calendário conforme imagem */}
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#FDFBF7] fill-none stroke-current stroke-[2] relative z-10 group-hover:scale-110 transition-transform duration-300 shrink-0" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>

                {/* Botão Secundário: Meus Agendamentos (Equalizado com o primeiro) */}
                <button 
                  id="btn-meus-agendamentos-hero"
                  onClick={() => setIsMyAppointmentsOpen(true)} 
                  className="w-full max-w-[280px] h-[52px] group relative overflow-hidden bg-[#F5EFEB] border-[1.5px] border-[#201510] text-[#201510] px-6 rounded-full flex items-center justify-center gap-3 text-[13px] sm:text-sm font-bold tracking-[0.14em] uppercase hover:bg-[#201510]/5 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer shadow-xs shrink-0"
                >
                  <span className="relative z-10">MEUS AGENDAMENTOS</span>
                  <ClipboardList className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#201510] stroke-[1.8] relative z-10 group-hover:scale-110 transition-transform duration-300 shrink-0" />
                </button>
              </div>

            </div>
          </div>

          {/* Divisor de onda orgânica branca sinuosa (Wave exata da imagem) */}
          <svg 
            viewBox="0 0 1440 90" 
            className="absolute bottom-0 left-0 w-full h-7 sm:h-11 text-white fill-current z-20 transform translate-y-[1px]" 
            preserveAspectRatio="none"
          >
            <path d="M 0,38 C 360,10 680,60 1020,55 C 1220,52 1360,38 1440,30 L 1440,100 L 0,100 Z" />
          </svg>
        </section>

        {/* 3. Seção: Cards dos Serviços organizados de 2 em 2 (Sem Scroll Horizontal) */}
        <ServicesGrid 
          services={services}
          onSelectService={handleSelectServiceCard}
          selectedServices={selectedServices}
          onToggleService={onToggleService}
          onRemoveService={onRemoveService}
          onClearSelection={onClearSelection}
          onContinueToBooking={onContinueToBooking || onStart}
          onUpdateComplements={onUpdateComplements}
          onComplementModalChange={setIsComplementModalActive}
        />

        {/* Card na parte inferior da tela com quantidade, tempo e preço dos serviços selecionados */}
        {selectedServices.length > 0 && !isComplementModalActive && (
          <div className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 animate-fade-in">
            <div className="bg-[#201510] text-[#FDFBF7] p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.38)] border border-[#8C6B4F]/50 backdrop-blur-md flex flex-col gap-2.5">
              
              {/* Topo do card: Quantidade de serviços selecionados + Limpar seleção */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span className="text-[11px] sm:text-xs font-bold tracking-wider text-[#C5A88E] uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A88E]" />
                  {selectedServices.length} {selectedServices.length === 1 ? 'SERVIÇO SELECIONADO' : 'SERVIÇOS SELECIONADOS'}
                </span>
                {onClearSelection && (
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-[11px] sm:text-xs text-stone-300 hover:text-white underline cursor-pointer transition-colors"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>

              {/* Chips dos serviços selecionados sem scroll horizontal (com quebra natural de linha) */}
              <div className="flex flex-wrap gap-1.5 py-0.5 max-h-36 overflow-y-auto">
                {selectedServices.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/15 text-[11px] sm:text-xs"
                  >
                    {s.isComplement && <Sparkles className="w-2.5 h-2.5 text-[#C5A88E] shrink-0" />}
                    <span>{s.name}</span>
                    {s.isComplement && s.parentServiceName && (
                      <span className="text-[10px] text-stone-300 opacity-85">({s.parentServiceName})</span>
                    )}
                    <span className="text-[#C5A88E] text-[10px]">({formatDuration(s.durationMinutes)})</span>
                    {onRemoveService && (
                      <button
                        type="button"
                        onClick={(e) => onRemoveService(s.id, e)}
                        className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/20 transition-colors ml-0.5 cursor-pointer"
                        title="Remover serviço"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Informações de Tempo, Preço e Botão de Agendamento */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-3 sm:gap-5 flex-wrap min-w-0">
                  {/* Tempo Total */}
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-200">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C5A88E] shrink-0" />
                    <span className="text-stone-300 text-[11px] sm:text-xs">Tempo:</span>
                    <strong className="text-white font-semibold">{formatDuration(totalDurationMinutes)}</strong>
                  </div>

                  {/* Divisor vertical */}
                  <div className="h-3.5 w-px bg-white/20 hidden xs:block" />

                  {/* Preço Total */}
                  <div className="flex items-baseline gap-1.5 text-xs sm:text-sm">
                    <span className="text-stone-300 text-[11px] sm:text-xs">Total:</span>
                    <strong className="text-[#FDFBF7] font-serif font-bold text-sm sm:text-base">
                      {formatCurrency(totalPrice)}
                    </strong>
                  </div>
                </div>

                {/* Botão de Agendar Horário */}
                <button
                  type="button"
                  id="btn-continuar-agendamento-inferior"
                  onClick={onContinueToBooking || onStart}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#8C6B4F] hover:bg-[#A07D5E] active:scale-95 text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 shadow-xs cursor-pointer"
                >
                  <span>Agendar</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Efeito de linhas (onda) separando os cards do rodapé */}
        <div className="w-full relative h-7 sm:h-11 overflow-hidden bg-[#FAF6F2]">
          <svg 
            viewBox="0 0 1440 90" 
            className="absolute top-0 left-0 w-full h-full text-white fill-current z-20 transform rotate-180" 
            preserveAspectRatio="none"
          >
            <path d="M 0,38 C 360,10 680,60 1020,55 C 1220,52 1360,38 1440,30 L 1440,100 L 0,100 Z" />
          </svg>
        </div>

        {/* 4. Rodapé com os 3 botões lado a lado: Instagram, WhatsApp e Endereço */}
        <footer className="bg-[#FAF6F2] pb-5 sm:pb-6 pt-2 w-full mt-auto">
          <div className="max-w-5xl mx-auto px-3 sm:px-8">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto mb-6 sm:mb-8">
              <a 
                href={instagramUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 border border-[#E2D6CB] rounded-full py-2 sm:py-2.5 px-1.5 sm:px-5 text-[10px] sm:text-xs font-semibold tracking-wider text-[#231812] hover:bg-white transition-colors shadow-2xs whitespace-nowrap bg-white/60"
              >
                <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B08D6E] stroke-[1.5] shrink-0" />
                <span>INSTAGRAM</span>
              </a>

              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 border border-[#E2D6CB] rounded-full py-2 sm:py-2.5 px-1.5 sm:px-5 text-[10px] sm:text-xs font-semibold tracking-wider text-[#231812] hover:bg-white transition-colors shadow-2xs whitespace-nowrap bg-white/60"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B08D6E] stroke-[1.5] shrink-0" />
                <span>WHATSAPP</span>
              </a>

              <a 
                href={addressUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1.5 sm:gap-2 border border-[#E2D6CB] rounded-full py-2 sm:py-2.5 px-1.5 sm:px-5 text-[10px] sm:text-xs font-semibold tracking-wider text-[#231812] hover:bg-white transition-colors shadow-2xs whitespace-nowrap bg-white/60"
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B08D6E] stroke-[1.5] shrink-0" />
                <span><span className="hidden sm:inline">VER </span>ENDEREÇO</span>
              </a>
            </div>

            {/* Linha Divisória Elegante */}
            <div className="w-full max-w-[200px] mx-auto h-[1px] bg-gradient-to-r from-transparent via-[#D4C3B5] to-transparent mb-5 sm:mb-6" />

            <p className="text-center text-[10px] sm:text-[11px] text-[#A89C94] font-normal tracking-wide mt-2 sm:mt-3">
              © 2026 Gabriela Santos Nail Designer. Todos os direitos reservados.
            </p>

          </div>
        </footer>

      </main>

      {/* Modais de suporte para consulta de agendamentos */}
      <MyAppointmentsModal 
        isOpen={isMyAppointmentsOpen}
        onClose={() => setIsMyAppointmentsOpen(false)}
        onReschedule={(app) => {
          const s = services.find(ser => ser.id === app.serviceId);
          if (s && onSelectService) {
            onSelectService(s);
          } else {
            onStart();
          }
        }}
      />

      {/* Banner flutuante para instalação rápida do PWA */}
      <PWAInstallPrompt variant="banner" />

    </div>
  );
};
