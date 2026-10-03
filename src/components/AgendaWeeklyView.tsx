import React, { useMemo } from 'react';
import { Appointment, Block, Service, WorkingDay } from '../types';
import { formatCurrency, formatShortDate } from '../utils';
import { 
  Calendar, Clock, Plus, Phone, MessageCircle, 
  ChevronLeft, ChevronRight, Edit, ShieldAlert, CheckCircle2 
} from 'lucide-react';

interface AgendaWeeklyViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: Appointment[];
  services: Service[];
  blocks: Block[];
  workingHours: WorkingDay[];
  onOpenNewAppointment: (defaultDate?: string) => void;
  onEditAppointment: (app: Appointment) => void;
  onOpenWhatsApp: (app: Appointment) => void;
  onSwitchToDailyView: (date: string) => void;
}

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const AgendaWeeklyView: React.FC<AgendaWeeklyViewProps> = ({
  selectedDate,
  onSelectDate,
  appointments,
  services,
  blocks,
  workingHours,
  onOpenNewAppointment,
  onEditAppointment,
  onOpenWhatsApp,
  onSwitchToDailyView,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Calcula os 7 dias da semana (Segunda a Domingo) contendo a data selecionada
  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
    
    // Distância para a Segunda-feira
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    const days: { dateStr: string; dayIndex: number; dayName: string; dayNumber: number; monthName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(current).replace('.', '');

      days.push({
        dateStr,
        dayIndex: i,
        dayName: DAY_NAMES[i],
        dayNumber: current.getDate(),
        monthName,
      });
    }
    return days;
  }, [selectedDate]);

  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  // Navegação de semanas
  const handlePrevWeek = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    onSelectDate(date.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    onSelectDate(date.toISOString().split('T')[0]);
  };

  // Agendamentos pertencentes à semana inteira
  const weekAppointments = useMemo(() => {
    return appointments.filter(a => a.date >= weekStartStr && a.date <= weekEndStr);
  }, [appointments, weekStartStr, weekEndStr]);

  const validWeekApps = weekAppointments.filter(a => a.status !== 'cancelled');
  const weekRevenue = validWeekApps.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="space-y-6">
      
      {/* Barra Superior da Visão Semanal: Navegação & Botão Novo */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Navegação de semanas */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              title="Semana Anterior"
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextWeek}
              title="Próxima Semana"
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(todayStr)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
          >
            Semana Atual
          </button>

          <div className="text-xs sm:text-sm font-bold text-stone-800">
            {formatShortDate(weekStartStr)} a {formatShortDate(weekEndStr)}
          </div>
        </div>

        {/* Botão Novo Agendamento */}
        <button
          type="button"
          onClick={() => onOpenNewAppointment(selectedDate)}
          className="px-4 sm:px-5 py-2.5 rounded-full bg-[#201510] text-white hover:bg-[#38261E] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-[#C5A88E]" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* KPI Cards da Semana - Lado a Lado para Evitar Scroll Vertical */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold truncate">Atendimentos na Semana</p>
          <p className="text-xl sm:text-3xl font-serif text-stone-800">{validWeekApps.length}</p>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">Horários ativos na semana</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold truncate">Faturamento Previsto</p>
          <p className="text-xl sm:text-3xl font-serif text-[#987353] truncate">{formatCurrency(weekRevenue)}</p>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">Total para os 7 dias</p>
        </div>
      </div>

      {/* Colunas da Semana (Grid responsivo de 7 dias) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
        {weekDays.map(day => {
          const [yy, mm, dd] = day.dateStr.split('-').map(Number);
          const dObj = new Date(yy, mm - 1, dd);
          const dow = dObj.getDay();
          const dayWorking = workingHours.find(w => w.dayOfWeek === dow);
          const isOpen = !!(dayWorking && dayWorking.isOpen);

          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDate;

          // Atendimentos daquele dia
          const dayApps = appointments
            .filter(a => a.date === day.dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          const validDayApps = dayApps.filter(a => a.status !== 'cancelled');
          const dayTotalRevenue = validDayApps.reduce((acc, a) => acc + a.price, 0);

          // Bloqueios do dia
          const dayBlocks = blocks.filter(b => b.date === day.dateStr);

          return (
            <div
              key={day.dateStr}
              className={`rounded-3xl border flex flex-col justify-between transition-all ${
                isToday 
                  ? 'bg-amber-50/20 border-[#C5A88E] shadow-sm ring-2 ring-[#C5A88E]/30' 
                  : isSelected
                  ? 'bg-white border-[#201510] shadow-xs'
                  : 'bg-white border-stone-200/80 shadow-xs'
              }`}
            >
              {/* Header do Dia */}
              <div className="p-3.5 border-b border-stone-100 bg-[#FAF7F4]/60 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    {day.dayName.slice(0, 3)}
                  </span>
                  
                  {isToday ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#201510] text-white text-[10px] font-bold">
                      Hoje
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-400">
                      {day.monthName}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-serif font-bold text-stone-800">
                    {day.dayNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate(day.dateStr);
                      onSwitchToDailyView(day.dateStr);
                    }}
                    className="text-[10px] text-[#8C6B4F] hover:underline font-semibold"
                    title="Abrir este dia na Visão Diária"
                  >
                    Ver Dia
                  </button>
                </div>

                {/* Status do Studio (Aberto / Fechado) */}
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  {isOpen ? (
                    <span className="text-stone-500 font-medium">
                      {dayWorking?.openTime} - {dayWorking?.closeTime}
                    </span>
                  ) : (
                    <span className="text-stone-400 italic">Fechado</span>
                  )}

                  {validDayApps.length > 0 && (
                    <span className="font-bold text-[#8C6B4F]">
                      {formatCurrency(dayTotalRevenue)}
                    </span>
                  )}
                </div>

                {/* Aviso se houver bloqueios */}
                {dayBlocks.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md">
                    <ShieldAlert className="w-3 h-3 text-amber-700" />
                    <span>{dayBlocks.some(b => b.isFullDay) ? 'Bloqueio integral' : `${dayBlocks.length} bloqueio(s)`}</span>
                  </div>
                )}
              </div>

              {/* Lista de Cards de Atendimentos */}
              <div className="p-3 flex-1 space-y-2 overflow-y-auto max-h-[380px] scrollbar-none">
                {dayApps.length === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs italic">
                    Sem agendamentos
                  </div>
                ) : (
                  dayApps.map(app => {
                    const serv = services.find(s => s.id === app.serviceId);
                    const sName = app.serviceNames || serv?.name || 'Procedimento';

                    return (
                      <div
                        key={app.id}
                        className={`p-2.5 rounded-2xl border text-xs transition-all flex flex-col justify-between gap-1.5 ${
                          app.status === 'cancelled'
                            ? 'bg-stone-50 border-stone-200 opacity-60'
                            : app.status === 'confirmed'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : app.status === 'completed'
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-[#FFFBF5] border-amber-200'
                        }`}
                      >
                        {/* Horário e Status */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-stone-800 text-[11px]">
                            {app.startTime} - {app.endTime}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-bold ${
                            app.status === 'pending' ? 'bg-[#F5F0EB] text-[#C5A059]' : 
                            app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                            app.status === 'completed' ? 'bg-stone-200 text-stone-700' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {app.status === 'confirmed' ? 'Conf' : 
                             app.status === 'pending' ? 'Pend' : 
                             app.status === 'completed' ? 'Conc' : 'Canc'}
                          </span>
                        </div>

                        {/* Cliente e Procedimento */}
                        <div>
                          <p className="font-semibold text-stone-800 truncate" title={app.clientName}>
                            {app.clientName}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate" title={sName}>
                            {sName} • {formatCurrency(app.price)}
                          </p>
                        </div>

                        {/* Ações Rápidas no Card */}
                        <div className="flex items-center justify-between pt-1 border-t border-stone-200/50 text-[10px]">
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(app)}
                            className="text-emerald-700 hover:underline flex items-center gap-0.5 font-semibold"
                            title="WhatsApp da Cliente"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Whats</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => onEditAppointment(app)}
                            className="text-stone-500 hover:text-stone-800 flex items-center gap-0.5"
                            title="Editar Atendimento"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Botão Adicionar no Dia */}
              <div className="p-2 border-t border-stone-100 bg-[#FAF7F4]/40 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => onOpenNewAppointment(day.dateStr)}
                  className="w-full py-1.5 px-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3 text-[#8C6B4F]" />
                  <span>Agendar neste dia</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
