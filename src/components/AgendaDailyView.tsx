import React, { useState, useMemo } from 'react';
import { Appointment, Block, Service, WorkingDay } from '../types';
import { formatDate, formatCurrency, formatDuration } from '../utils';
import { 
  Calendar, Clock, Phone, Plus, Search, X, CheckCircle, 
  Check, Edit, Trash2, ShieldAlert, MessageCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface AgendaDailyViewProps {
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
  onManageBlocks: () => void;
}

export const AgendaDailyView: React.FC<AgendaDailyViewProps> = ({
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
  onManageBlocks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('todos');

  // Cálculos de navegação
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    onSelectDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    onSelectDate(date.toISOString().split('T')[0]);
  };

  // Filtragem dos atendimentos do dia
  const dayAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (app.date !== selectedDate) return false;
      if (statusFilter !== 'todos' && app.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const serv = services.find(s => s.id === app.serviceId);
        const sName = (app.serviceNames || serv?.name || '').toLowerCase();
        const matchName = app.clientName.toLowerCase().includes(q);
        const matchPhone = app.clientPhone.includes(q);
        const matchService = sName.includes(q);
        if (!matchName && !matchPhone && !matchService) return false;
      }
      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, selectedDate, statusFilter, searchQuery, services]);

  // Métricas do dia (desconsiderando cancelados)
  const validAppointments = appointments.filter(a => a.date === selectedDate && a.status !== 'cancelled');
  const dayRevenue = validAppointments.reduce((sum, a) => sum + a.price, 0);
  const dayBlocks = blocks.filter(b => b.date === selectedDate);

  // Verificação do dia da semana e funcionamento
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const dayConfig = workingHours.find(w => w.dayOfWeek === dayOfWeek);
  const isStudioOpen = !!(dayConfig && dayConfig.isOpen);

  return (
    <div className="space-y-6">
      
      {/* Topo da Visão Diária: Navegação de Dias & Ação Rápida */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Controle de Data: Anterior / Data Atual / Próximo */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              title="Dia Anterior"
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              title="Próximo Dia"
              className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Seletor de Data Otimizado com Ícone e Largura Garantida */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex items-center shrink-0">
              <Calendar className="w-4 h-4 text-[#8C6B4F] absolute left-3 pointer-events-none z-10" />
              <input 
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && onSelectDate(e.target.value)}
                title="Selecionar Data da Agenda"
                aria-label="Selecionar Data da Agenda"
                className="pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-800 bg-stone-50 hover:bg-stone-100 focus:bg-white focus:outline-none focus:border-[#987353] cursor-pointer min-w-[155px] sm:min-w-[175px] transition-all shadow-2xs"
                style={{ colorScheme: 'light' }}
              />
            </div>
            
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className={`px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shrink-0 shadow-2xs ${
                selectedDate === todayStr 
                  ? 'bg-[#201510] text-white border-[#201510]' 
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => onSelectDate(tomorrowStr)}
              className={`px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer shrink-0 shadow-2xs ${
                selectedDate === tomorrowStr 
                  ? 'bg-[#201510] text-white border-[#201510]' 
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Amanhã
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF6F2] border border-[#EADDCF] text-xs font-semibold text-[#8C6B4F] capitalize shrink-0 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#8C6B4F]" />
            <span>{formatDate(selectedDate)}</span>
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

      {/* KPI Cards do Dia */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold">Atendimentos no Dia</p>
          <p className="text-2xl sm:text-3xl font-serif text-stone-800">{validAppointments.length}</p>
          <p className="text-[11px] text-stone-400 mt-1">
            {isStudioOpen 
              ? `Horário: ${dayConfig?.openTime} às ${dayConfig?.closeTime}${dayConfig?.hasLunchBreak && dayConfig?.lunchStart && dayConfig?.lunchEnd ? ` (Almoço: ${dayConfig.lunchStart} - ${dayConfig.lunchEnd})` : ''}` 
              : 'Studio Fechado neste dia'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold">Faturamento Previsto</p>
          <p className="text-2xl sm:text-3xl font-serif text-[#987353]">{formatCurrency(dayRevenue)}</p>
          <p className="text-[11px] text-stone-400 mt-1">Total confirmado e pendente</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1 font-bold">Bloqueios no Dia</p>
            <p className="text-2xl sm:text-3xl font-serif text-stone-800">{dayBlocks.length}</p>
            <p className="text-[11px] text-stone-400 mt-1">
              {dayBlocks.some(b => b.isFullDay) ? 'Dia inteiro bloqueado' : 'Horários indisponíveis'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onManageBlocks} 
            className="text-xs text-[#987353] hover:underline font-semibold"
          >
            Gerenciar
          </button>
        </div>
      </div>

      {/* Bloqueios Ativos Aviso */}
      {dayBlocks.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            Atenção: Existem bloqueios de agenda em {formatDate(selectedDate)}:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {dayBlocks.map(b => (
              <span key={b.id} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-amber-300 font-medium">
                {b.isFullDay ? 'Dia Inteiro' : `${b.startTime} às ${b.endTime}`}
                {b.reason && ` (${b.reason})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtros de Status */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-100 shadow-xs space-y-3">
        {/* Barra de Busca */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar cliente, telefone ou serviço..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:border-[#987353]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botões de Filtro Abaixo da Busca - Sem Scroll Horizontal */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'confirmed', label: 'Confirmados' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'completed', label: 'Concluídos' },
            { id: 'cancelled', label: 'Cancelados' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id as any)}
              className={`w-full py-2 px-1 sm:px-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer truncate ${
                statusFilter === item.id
                  ? 'bg-[#201510] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Atendimentos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-lg sm:text-xl text-stone-800 font-bold capitalize">
            {formatDate(selectedDate)}
          </h4>
          <span className="text-xs text-stone-500">
            {dayAppointments.length} agendamento(s)
          </span>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 border-dashed space-y-3">
            <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-stone-500 text-sm font-medium">Nenhum atendimento agendado para esta data.</p>
            <button
              type="button"
              onClick={() => onOpenNewAppointment(selectedDate)}
              className="px-4 py-2 rounded-full bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] transition-colors"
            >
              + Agendar Cliente Manualmente
            </button>
          </div>
        ) : (
          dayAppointments.map(app => {
            const serv = services.find(s => s.id === app.serviceId);
            const serviceName = app.serviceNames || serv?.name || 'Procedimento';
            
            // Calcula duração baseada no início/fim ou na soma dos serviços
            const [sh, sm] = app.startTime.split(':').map(Number);
            const [eh, em] = app.endTime.split(':').map(Number);
            const calculatedDuration = !isNaN(sh) && !isNaN(eh) ? (eh * 60 + em) - (sh * 60 + sm) : 0;
            const durationMins = calculatedDuration > 0 ? calculatedDuration : (serv?.durationMinutes || 45);

            return (
              <div 
                key={app.id}
                className={`p-5 sm:p-6 rounded-3xl border flex flex-col lg:flex-row justify-between gap-5 transition-all ${
                  app.status === 'cancelled' 
                    ? 'bg-stone-50 border-stone-200 opacity-60' 
                    : app.status === 'confirmed' 
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                    : app.status === 'completed'
                    ? 'bg-stone-50/80 border-stone-200 shadow-2xs'
                    : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                {/* Detalhes do Agendamento */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-serif text-2xl font-bold text-stone-800">{app.startTime}</span>
                    <span className="text-xs text-stone-400">até {app.endTime}</span>
                    
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                      app.status === 'pending' ? 'bg-[#F5F0EB] text-[#C5A059]' : 
                      app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                      app.status === 'completed' ? 'bg-stone-200 text-stone-700' : 
                      'bg-red-50 text-red-700'
                    }`}>
                      {app.status === 'pending' ? 'Pendente' : 
                       app.status === 'confirmed' ? 'Confirmado' : 
                       app.status === 'completed' ? 'Concluído' : 'Cancelado'}
                    </span>

                    {app.reminderSent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Lembrete 24h Enviado
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif text-lg font-bold text-stone-800">{app.clientName}</h4>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                    <button 
                      type="button"
                      onClick={() => onOpenWhatsApp(app)}
                      className="flex items-center gap-1.5 text-emerald-700 hover:underline font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5" /> {app.clientPhone} (WhatsApp)
                    </button>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" /> Duração: {formatDuration(durationMins)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-stone-800 font-semibold bg-white px-3 py-1 rounded-xl border border-stone-200 shadow-2xs">
                      {serviceName} • {formatCurrency(app.price)}
                    </span>
                    {app.notes && (
                      <span className="text-xs text-stone-500 italic bg-stone-100/80 px-2.5 py-1 rounded-xl">
                        Obs: "{app.notes}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações Rápidas & Gestão */}
                <div className="flex flex-wrap lg:flex-col gap-2 justify-end lg:items-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-200/60">
                  {app.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => onUpdateAppointmentStatus(app.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Confirmar
                    </button>
                  )}

                  {app.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => onUpdateAppointmentStatus(app.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl bg-stone-700 text-white hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Concluir Atendimento
                    </button>
                  )}

                  {app.status !== 'cancelled' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateAppointmentStatus(app.id, 'cancelled')}
                      className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateAppointmentStatus(app.id, 'confirmed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                    >
                      Reativar
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAppointment(app);
                      }}
                      className="p-2 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
                      title="Editar Atendimento"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAppointment(app.id);
                      }}
                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsApp(app);
                      }}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                      title="Abrir Conversa no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
