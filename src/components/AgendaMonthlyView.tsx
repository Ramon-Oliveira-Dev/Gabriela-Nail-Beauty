import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Appointment, Block, Service, WorkingDay } from '../types';
import { formatDate, formatCurrency, formatDuration } from '../utils';
import { 
  Calendar, Clock, Plus, Phone, MessageCircle, 
  ChevronLeft, ChevronRight, Edit, Trash2, CheckCircle, 
  ShieldAlert, ArrowRight, Check 
} from 'lucide-react';

interface AgendaMonthlyViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: Appointment[];
  services: Service[];
  blocks: Block[];
  workingHours: WorkingDay[];
  onOpenNewAppointment: (defaultDate?: string) => void;
  onEditAppointment: (app: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onUpdateAppointmentStatus: (id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') => void;
  onOpenWhatsApp: (app: Appointment) => void;
  onSwitchToDailyView: (date: string) => void;
}

// Dias da semana com letra única exatamente como no layout da imagem de referência
const WEEKDAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Nomes dos meses abreviados para a barra de seleção superior
const MONTH_NAMES_SHORT = [
  'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
  'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'
];

export const AgendaMonthlyView: React.FC<AgendaMonthlyViewProps> = ({
  selectedDate,
  onSelectDate,
  appointments,
  services,
  blocks,
  workingHours,
  onOpenNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onUpdateAppointmentStatus,
  onOpenWhatsApp,
  onSwitchToDailyView,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Extrai ano e mês da data selecionada
  const [selectedY, selectedM] = selectedDate.split('-').map(Number);
  const [currentYear, setCurrentYear] = useState(selectedY || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedM ? selectedM - 1 : new Date().getMonth()); // 0-11

  const monthListRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);

  // Efeito para centralizar o botão do mês selecionado na faixa horizontal
  useEffect(() => {
    const behavior: ScrollBehavior = isInitialMountRef.current ? 'auto' : 'smooth';
    isInitialMountRef.current = false;

    const doScroll = () => {
      const container = monthListRef.current;
      if (!container) return;
      const botao = container.querySelector<HTMLButtonElement>(`[data-month="${currentMonth}"]`);
      if (botao) {
        container.scrollTo({
          left: botao.offsetLeft - container.clientWidth / 2 + botao.clientWidth / 2,
          behavior,
        });
      }
    };

    doScroll();
    const timer = setTimeout(doScroll, 50);
    return () => clearTimeout(timer);
  }, [currentMonth, currentYear]);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    setCurrentYear(nowYear);
    setCurrentMonth(nowMonth);
    onSelectDate(todayStr);

    const container = monthListRef.current;
    if (container) {
      const botao = container.querySelector<HTMLButtonElement>(`[data-month="${nowMonth}"]`);
      if (botao) {
        container.scrollTo({
          left: botao.offsetLeft - container.clientWidth / 2 + botao.clientWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  };

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d);
  }, [currentYear, currentMonth]);

  // Geração da grade mensal (35 ou 42 células)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Domingo
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isWeekend: boolean;
      dayOfWeek: number;
    }[] = [];

    // Dias do mês anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(prevY, prevM, dayNum);
      const dow = dObj.getDay();

      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isWeekend: dow === 0 || dow === 6,
        dayOfWeek: dow,
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(currentYear, currentMonth, d);
      const dow = dObj.getDay();

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isWeekend: dow === 0 || dow === 6,
        dayOfWeek: dow,
      });
    }

    // Dias do próximo mês para completar semanas
    const remaining = (7 - (cells.length % 7)) % 7;
    const totalNeeded = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    const nextDaysCount = totalNeeded - cells.length;

    for (let d = 1; d <= nextDaysCount; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(nextY, nextM, d);
      const dow = dObj.getDay();

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isWeekend: dow === 0 || dow === 6,
        dayOfWeek: dow,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, selectedDate]);

  // Agendamentos pertencentes ao mês atual
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthAppointments = useMemo(() => {
    return appointments.filter(a => a.date.startsWith(monthPrefix));
  }, [appointments, monthPrefix]);

  const validMonthApps = monthAppointments.filter(a => a.status !== 'cancelled');
  const monthRevenue = validMonthApps.reduce((acc, a) => acc + a.price, 0);

  // Dias com agendamento no mês
  const activeDaysCount = useMemo(() => {
    const daysSet = new Set(validMonthApps.map(a => a.date));
    return daysSet.size;
  }, [validMonthApps]);

  // Atendimentos do dia selecionado
  const selectedDayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, selectedDate]);

  const validSelectedDayApps = selectedDayAppointments.filter(a => a.status !== 'cancelled');
  const selectedDayRevenue = validSelectedDayApps.reduce((acc, a) => acc + a.price, 0);
  const selectedDayBlocks = blocks.filter(b => b.date === selectedDate);

  return (
    <div className="space-y-6 relative">
      
      {/* ============================================================ */}
      {/* BARRA SUPERIOR DE MESES EM PÍLULAS (CONFORME A IMAGEM) */}
      {/* ============================================================ */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={handlePrevMonth}
          title="Mês Anterior"
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Lista Horizontal de Meses em Pílulas */}
        <div 
          ref={monthListRef}
          className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 scrollbar-none"
        >
          {MONTH_NAMES_SHORT.map((mShort, idx) => {
            const isSelected = idx === currentMonth;
            return (
              <button
                key={mShort}
                type="button"
                data-month={idx}
                onClick={() => {
                  setCurrentMonth(idx);
                  const newDateStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}-01`;
                  onSelectDate(newDateStr);
                }}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#BAE6FD] text-[#0369A1] font-bold shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {mShort}
              </button>
            );
          })}

          {/* Indicador do Ano */}
          <span className="text-xs font-bold text-stone-500 px-2.5 py-1 bg-stone-100 rounded-full whitespace-nowrap">
            {currentYear}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          title="Próximo Mês"
          className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors shrink-0 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards do Mês - Lado a Lado para Evitar Scroll Vertical */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold truncate">Atendimentos no Mês</p>
          <p className="text-xl sm:text-3xl font-serif text-stone-800">{validMonthApps.length}</p>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">{activeDaysCount} dia(s) ativos</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold truncate">Faturamento Previsto</p>
          <p className="text-xl sm:text-3xl font-serif text-[#987353] truncate">{formatCurrency(monthRevenue)}</p>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">Total de {monthName.split(' ')[0]}</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* GRADE DO CALENDÁRIO MENSAL (CONFORME A IMAGEM DE REFERÊNCIA) */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        
        {/* Cabeçalho dos Dias da Semana: D S T Q Q S S */}
        <div className="grid grid-cols-7 border-b border-stone-200 bg-[#FAF7F4] text-center">
          {WEEKDAY_NAMES.map((name, i) => (
            <div 
              key={i} 
              className="py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-stone-600"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Células dos Dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-stone-200">
          {calendarCells.map(cell => {
            const dayApps = appointments.filter(a => a.date === cell.dateStr && a.status !== 'cancelled');
            const dayBlocks = blocks.filter(b => b.date === cell.dateStr);

            return (
              <div
                key={cell.dateStr}
                onClick={() => onSelectDate(cell.dateStr)}
                className={`min-h-[85px] sm:min-h-[110px] p-1 sm:p-1.5 flex flex-col justify-start cursor-pointer transition-colors relative ${
                  !cell.isCurrentMonth
                    ? 'bg-stone-50/40 text-stone-300'
                    : cell.isSelected
                    ? 'bg-[#F0F9FF] ring-2 ring-inset ring-[#0284C7]'
                    : cell.isToday
                    ? 'bg-amber-50/20'
                    : 'bg-white hover:bg-stone-50/80'
                }`}
              >
                {/* Número do Dia Centralizado no Topo da Célula */}
                <div className="flex justify-center items-center pb-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      cell.isToday
                        ? 'bg-[#201510] text-white font-bold'
                        : cell.isSelected
                        ? 'bg-[#0284C7] text-white font-bold'
                        : cell.isCurrentMonth
                        ? 'text-stone-900'
                        : 'text-stone-400'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                </div>

                {/* Bloqueios do Dia (ex: Folga, Férias, Laser) */}
                {dayBlocks.length > 0 && (
                  <div className="space-y-0.5 mb-0.5">
                    {dayBlocks.slice(0, 1).map(b => (
                      <div
                        key={b.id}
                        className="bg-[#38BDF8] text-white text-[9px] sm:text-[10px] font-semibold px-1 py-0.5 rounded-xs sm:rounded-sm truncate text-center sm:text-left shadow-2xs leading-tight"
                        title={b.reason || 'Bloqueio'}
                      >
                        {b.reason || 'Bloqueio'}
                      </div>
                    ))}
                  </div>
                )}

                {/* CHIPS AZUIS: HORÁRIO COM TAG E NOME DA CLIENTE (CONFORME SOLICITADO) */}
                <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
                  {dayApps.map(app => (
                    <div
                      key={app.id}
                      className="bg-[#0284C7] hover:bg-[#0369A1] text-white text-[10px] sm:text-[11px] font-medium sm:font-semibold px-1 sm:px-1.5 py-0.5 rounded-xs sm:rounded-sm shadow-2xs leading-tight transition-colors flex items-center gap-1 min-w-0"
                      title={`${app.clientName} (${app.startTime})`}
                    >
                      <span className="bg-black text-white px-1 py-0.5 rounded-[3px] text-[8px] sm:text-[9px] font-extrabold shrink-0 tracking-tighter">
                        {app.startTime}
                      </span>
                      <span className="truncate flex-1 text-left">
                        {app.clientName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTÃO FLUTUANTE (+) NO CANTO INFERIOR DIREITO (CONFORME IMAGEM) */}
      {/* ============================================================ */}
      <button
        type="button"
        onClick={() => onOpenNewAppointment(selectedDate)}
        title="Novo Agendamento"
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-30 w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#E0EEFA] hover:bg-[#CCE3F7] active:scale-95 text-[#0369A1] shadow-lg flex items-center justify-center border border-[#BAE6FD] transition-all cursor-pointer"
      >
        <Plus className="w-7 h-7 stroke-[2.2]" />
      </button>

      {/* ============================================================ */}
      {/* DETALHES DO DIA SELECIONADO NA VISÃO MENSAL */}
      {/* ============================================================ */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Dia Selecionado</span>
            <h4 className="font-serif text-xl sm:text-2xl text-stone-800 font-bold capitalize">
              {formatDate(selectedDate)}
            </h4>
            <p className="text-xs text-stone-500">
              {selectedDayAppointments.length} atendimento(s) • Faturamento previsto: <strong className="text-[#8C6B4F]">{formatCurrency(selectedDayRevenue)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenNewAppointment(selectedDate)}
              className="px-4 py-2 rounded-full bg-[#201510] text-white hover:bg-[#38261E] text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A88E]" />
              <span>Agendar neste dia</span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchToDailyView(selectedDate)}
              className="px-4 py-2 rounded-full border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Abrir na Visão Diária</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bloqueios do Dia Selecionado */}
        {selectedDayBlocks.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Bloqueios cadastrados neste dia:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedDayBlocks.map(b => (
                <span key={b.id} className="bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-medium">
                  {b.isFullDay ? 'Dia Inteiro' : `${b.startTime} às ${b.endTime}`}
                  {b.reason && ` (${b.reason})`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Atendimentos do Dia Selecionado */}
        {selectedDayAppointments.length === 0 ? (
          <div className="text-center py-8 bg-stone-50/60 rounded-2xl border border-stone-100">
            <p className="text-xs text-stone-500">Nenhum atendimento agendado para este dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDayAppointments.map(app => {
              const serv = services.find(s => s.id === app.serviceId);
              const sName = app.serviceNames || serv?.name || 'Procedimento';

              return (
                <div
                  key={app.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                    app.status === 'cancelled'
                      ? 'bg-stone-50 border-stone-200 opacity-60'
                      : app.status === 'confirmed'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : app.status === 'completed'
                      ? 'bg-stone-50 border-stone-200'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg font-bold text-stone-800">
                          {app.startTime} - {app.endTime}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                          app.status === 'pending' ? 'bg-[#F5F0EB] text-[#C5A059]' : 
                          app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                          app.status === 'completed' ? 'bg-stone-200 text-stone-700' : 
                          'bg-red-100 text-red-700'
                        }`}>
                          {app.status === 'confirmed' ? 'Confirmado' : 
                           app.status === 'pending' ? 'Pendente' : 
                           app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-stone-800 mt-1">{app.clientName}</p>
                      <p className="text-xs text-stone-500">{sName} • {formatCurrency(app.price)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(app)}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-200/60 pt-2 text-xs">
                    <div className="flex items-center gap-1">
                      {app.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdateAppointmentStatus(app.id, 'confirmed')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Confirmar
                        </button>
                      )}
                      {app.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateAppointmentStatus(app.id, 'completed')}
                          className="px-2.5 py-1 rounded-lg bg-stone-700 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Concluir
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAppointment(app);
                        }}
                        className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAppointment(app.id);
                        }}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
