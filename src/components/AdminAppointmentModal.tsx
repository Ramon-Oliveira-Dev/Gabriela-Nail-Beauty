import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service } from '../types';
import { useStore } from '../StoreContext';
import { 
  formatCurrency, 
  formatDuration, 
  formatPhoneMask, 
  formatCurrencyFromDigits, 
  formatNumberToCurrencyString, 
  parseCurrencyStringToNumber 
} from '../utils';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  Check, 
  Sparkles, 
  Trash2,
  Tag
} from 'lucide-react';

interface AdminAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  onDelete?: (id: string) => void;
  services: Service[];
  appointmentToEdit?: Appointment | null;
  defaultDate?: string;
}

interface FlattenedComplement {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  parentServiceName: string;
  parentServiceId: string;
}

export const AdminAppointmentModal: React.FC<AdminAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  services,
  appointmentToEdit,
  defaultDate,
}) => {
  const { appointments, config } = useStore();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedComplementNames, setSelectedComplementNames] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [price, setPrice] = useState(80);
  const [displayPrice, setDisplayPrice] = useState('80,00');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled'>('confirmed');
  const [notes, setNotes] = useState('');

  // Coleta todos os serviços complementares únicos cadastrados nos serviços
  const allAvailableComplements = useMemo(() => {
    const list: FlattenedComplement[] = [];
    const seen = new Set<string>();

    services.forEach((s) => {
      s.complements?.forEach((c) => {
        const key = c.name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: c.id,
            name: c.name,
            price: c.price,
            durationMinutes: c.durationMinutes,
            parentServiceName: s.name,
            parentServiceId: s.id,
          });
        }
      });
    });

    return list;
  }, [services]);

  // Calcula tempo final baseado no horário de início e na duração total em minutos
  const calculateEndTime = (start: string, totalMinutesDuration: number) => {
    if (!start) return start;
    const dur = totalMinutesDuration > 0 ? totalMinutesDuration : 60;
    const [h, m] = start.split(':').map((v) => parseInt(v, 10));
    if (isNaN(h) || isNaN(m)) return start;

    const total = h * 60 + m + dur;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;

    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  // Calcula totais atuais de serviços e complementos
  const selectedServicesList = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const selectedComplementsList = useMemo(() => {
    return allAvailableComplements.filter((c) => selectedComplementNames.includes(c.name));
  }, [allAvailableComplements, selectedComplementNames]);

  const totalCalculatedDuration = useMemo(() => {
    const servDuration = selectedServicesList.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const compDuration = selectedComplementsList.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
    return servDuration + compDuration || 60;
  }, [selectedServicesList, selectedComplementsList]);

  const totalCalculatedPrice = useMemo(() => {
    const servPrice = selectedServicesList.reduce((acc, s) => acc + (s.price || 0), 0);
    const compPrice = selectedComplementsList.reduce((acc, c) => acc + (c.price || 0), 0);
    return servPrice + compPrice;
  }, [selectedServicesList, selectedComplementsList]);

  // Inicializa o modal ao abrir ou alterar appointmentToEdit
  useEffect(() => {
    if (appointmentToEdit) {
      setClientName(appointmentToEdit.clientName);
      setClientPhone(formatPhoneMask(appointmentToEdit.clientPhone));
      
      const initialIds = appointmentToEdit.serviceIds && appointmentToEdit.serviceIds.length > 0
        ? appointmentToEdit.serviceIds
        : [appointmentToEdit.serviceId];
      setSelectedServiceIds(initialIds);

      // Detecta complementos presentes no serviceNames
      const serviceNamesLower = (appointmentToEdit.serviceNames || '').toLowerCase();
      const detectedComps = allAvailableComplements
        .filter((c) => serviceNamesLower.includes(c.name.toLowerCase()))
        .map((c) => c.name);
      setSelectedComplementNames(detectedComps);

      setDate(appointmentToEdit.date);
      setStartTime(appointmentToEdit.startTime);
      setEndTime(appointmentToEdit.endTime);
      setPrice(appointmentToEdit.price);
      setDisplayPrice(formatNumberToCurrencyString(appointmentToEdit.price));
      setStatus(appointmentToEdit.status);
      setNotes(appointmentToEdit.notes || '');
    } else {
      const targetDate = defaultDate || new Date().toISOString().split('T')[0];
      setDate(targetDate);

      // Calcula automaticamente considerando o último atendimento do dia + intervalo entre procedimentos
      const dayApps = appointments.filter(a => a.date === targetDate && a.status !== 'cancelled');
      let initialStart = '09:00';
      if (dayApps.length > 0) {
        let maxEndMins = 0;
        dayApps.forEach(a => {
          const [h, m] = a.endTime.split(':').map(Number);
          const totalMins = h * 60 + m;
          if (totalMins > maxEndMins) {
            maxEndMins = totalMins;
          }
        });
        const interval = config.procedureIntervalMinutes ?? 0;
        const nextStartMins = maxEndMins + interval;
        const h = Math.floor(nextStartMins / 60) % 24;
        const m = nextStartMins % 60;
        initialStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      } else {
        const [y, mm, dd] = targetDate.split('-').map(Number);
        const dateObj = new Date(y, mm - 1, dd);
        const dayOfWeek = dateObj.getDay();
        const dayConfig = config.workingHours?.find(w => w.dayOfWeek === dayOfWeek);
        if (dayConfig && dayConfig.isOpen && dayConfig.openTime) {
          initialStart = dayConfig.openTime;
        }
      }

      const initialService = services[0];
      const initialIds = initialService ? [initialService.id] : [];
      const initialPrice = initialService?.price || 80;
      const initialDuration = initialService?.durationMinutes || 60;

      setClientName('');
      setClientPhone('');
      setSelectedServiceIds(initialIds);
      setSelectedComplementNames([]);
      setStartTime(initialStart);
      setEndTime(calculateEndTime(initialStart, initialDuration));
      setPrice(initialPrice);
      setDisplayPrice(formatNumberToCurrencyString(initialPrice));
      setStatus('confirmed');
      setNotes('');
    }
  }, [appointmentToEdit, defaultDate, services, allAvailableComplements, isOpen, appointments, config.procedureIntervalMinutes, config.workingHours]);

  if (!isOpen) return null;

  // Toggle do procedimento principal
  const handleToggleService = (sId: string) => {
    let nextIds: string[];
    if (selectedServiceIds.includes(sId)) {
      // Se tiver mais de um selecionado, permite desmarcar; se for o único, mantém
      if (selectedServiceIds.length > 1) {
        nextIds = selectedServiceIds.filter((id) => id !== sId);
      } else {
        nextIds = [sId];
      }
    } else {
      // Permite múltiplos ou troca direta
      nextIds = [...selectedServiceIds, sId];
    }
    setSelectedServiceIds(nextIds);

    // Recalcula valor e horário
    const nextServices = services.filter((s) => nextIds.includes(s.id));
    const servPrice = nextServices.reduce((acc, s) => acc + (s.price || 0), 0);
    const compPrice = selectedComplementsList.reduce((acc, c) => acc + (c.price || 0), 0);
    const newPrice = servPrice + compPrice;
    setPrice(newPrice);
    setDisplayPrice(formatNumberToCurrencyString(newPrice));

    const servDuration = nextServices.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const compDuration = selectedComplementsList.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
    setEndTime(calculateEndTime(startTime, servDuration + compDuration));
  };

  // Toggle de serviço complementar
  const handleToggleComplement = (comp: FlattenedComplement) => {
    let nextNames: string[];
    if (selectedComplementNames.includes(comp.name)) {
      nextNames = selectedComplementNames.filter((name) => name !== comp.name);
    } else {
      nextNames = [...selectedComplementNames, comp.name];
    }
    setSelectedComplementNames(nextNames);

    // Recalcula valor e horário
    const nextComplements = allAvailableComplements.filter((c) => nextNames.includes(c.name));
    const servPrice = selectedServicesList.reduce((acc, s) => acc + (s.price || 0), 0);
    const compPrice = nextComplements.reduce((acc, c) => acc + (c.price || 0), 0);
    const newPrice = servPrice + compPrice;
    setPrice(newPrice);
    setDisplayPrice(formatNumberToCurrencyString(newPrice));

    const servDuration = selectedServicesList.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const compDuration = nextComplements.reduce((acc, c) => acc + (c.durationMinutes || 0), 0);
    setEndTime(calculateEndTime(startTime, servDuration + compDuration));
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(calculateEndTime(newStart, totalCalculatedDuration));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim() || selectedServiceIds.length === 0 || !date || !startTime) {
      alert('Por favor, preencha o nome, telefone, data, horário e selecione ao menos um procedimento.');
      return;
    }

    const selectedServs = services.filter((s) => selectedServiceIds.includes(s.id));
    const primaryId = selectedServiceIds[0] || (services[0]?.id || 's1');
    
    // Combina nomes dos procedimentos principais com os complementares
    const namesArray = [
      ...selectedServs.map((s) => s.name),
      ...selectedComplementNames
    ];
    const serviceNames = namesArray.join(' + ');

    const newApp: Appointment = {
      id: appointmentToEdit ? appointmentToEdit.id : Math.random().toString(36).substring(2, 9),
      serviceId: primaryId,
      serviceIds: selectedServiceIds,
      serviceNames,
      date,
      startTime,
      endTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      status,
      price: Number(price),
      notes: notes.trim() || undefined,
      reminderSent: appointmentToEdit ? appointmentToEdit.reminderSent : false,
    };

    onSave(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-[#FAF6F2] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#E5D7CA] flex items-center justify-center text-[#8C6B4F] shadow-2xs shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#201510] leading-tight">
                {appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento Manual'}
              </h3>
              <p className="text-[11px] text-[#76685F] mt-0.5">
                {appointmentToEdit ? 'Atualize os dados e procedimentos da cliente' : 'Cadastre um atendimento direto na agenda'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Seção 1: Dados da Cliente */}
          <div className="bg-[#FAF7F4] border border-[#EAE0D5] rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>1. Dados da Cliente</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Amanda Silva"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F] shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  WhatsApp / Telefone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhoneMask(e.target.value))}
                    placeholder="(27) 99999-9999"
                    maxLength={15}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F] shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Procedimento Principal */}
          <div className="bg-[#FAF7F4] border border-[#EAE0D5] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>2. Procedimento Principal *</span>
              </label>
              <span className="text-[10.5px] text-stone-500 font-medium">
                {selectedServicesList.length} selecionado(s)
              </span>
            </div>

            {services.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-2">
                Nenhum procedimento cadastrado. Cadastre procedimentos em Gestão de Serviços.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleService(s.id)}
                      className={`cursor-pointer p-2.5 rounded-xl flex items-center justify-between border transition-all text-xs select-none ${
                        isSelected
                          ? 'bg-white border-[#8C6B4F] text-[#201510] font-medium shadow-xs ring-1 ring-[#8C6B4F]/40'
                          : 'bg-white/80 border-stone-200 text-stone-700 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white' : 'border-stone-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold block truncate text-[11.5px] text-[#201510]">{s.name}</span>
                          <span className="text-[10px] text-stone-400">{formatDuration(s.durationMinutes)}</span>
                        </div>
                      </div>
                      <span className="font-serif font-bold text-xs text-[#8C6B4F] shrink-0 ml-1">
                        {formatCurrency(s.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 3: Serviços Complementares Cadastrados */}
          {allAvailableComplements.length > 0 && (
            <div className="bg-[#FAF7F4] border border-[#EAE0D5] rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  <span>3. Serviços Complementares</span>
                </label>
                <span className="text-[10.5px] text-stone-500 font-medium">
                  {selectedComplementNames.length} adicionado(s)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-0.5">
                {allAvailableComplements.map((comp, compIdx) => {
                  const isSelected = selectedComplementNames.includes(comp.name);
                  return (
                    <div
                      key={comp.id ? `${comp.id}-${compIdx}` : `comp-${compIdx}`}
                      onClick={() => handleToggleComplement(comp)}
                      className={`cursor-pointer p-2.5 rounded-xl flex items-center justify-between border transition-all text-xs select-none ${
                        isSelected
                          ? 'bg-white border-[#8C6B4F] text-[#201510] font-medium shadow-xs ring-1 ring-[#8C6B4F]/40'
                          : 'bg-white/80 border-stone-200 text-stone-700 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white' : 'border-stone-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium block truncate text-[11px] text-[#201510]">{comp.name}</span>
                          <span className="text-[9.5px] text-stone-400">+{comp.durationMinutes} min</span>
                        </div>
                      </div>
                      <span className="font-serif font-bold text-xs text-[#8C6B4F] shrink-0 ml-1">
                        +{formatCurrency(comp.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção 4: Data, Horários e Duração */}
          <div className="bg-white border border-stone-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>4. Data e Horário</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8C6B4F] bg-[#FAF6F2] px-2.5 py-1 rounded-full border border-[#E5D7CA]">
                <Clock className="w-3 h-3" />
                <span>Duração Total: {formatDuration(totalCalculatedDuration)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10.5px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#8C6B4F]" /> Data *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8C6B4F]" /> Horário Início *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-stone-400" /> Fim Estimado
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Preço e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#8C6B4F]" /> Valor do Atendimento
                </label>
                {totalCalculatedPrice > 0 && price !== totalCalculatedPrice && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrice(totalCalculatedPrice);
                      setDisplayPrice(formatNumberToCurrencyString(totalCalculatedPrice));
                    }}
                    className="text-[10px] text-[#8C6B4F] underline cursor-pointer"
                  >
                    Usar soma: {formatCurrency(totalCalculatedPrice)}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-stone-400 text-sm font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={displayPrice}
                  onChange={(e) => {
                    const formatted = formatCurrencyFromDigits(e.target.value);
                    setDisplayPrice(formatted);
                    setPrice(parseCurrencyStringToNumber(formatted));
                  }}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-bold focus:outline-none focus:border-[#8C6B4F]"
                />
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
              <label className="block text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider mb-1.5">
                Status do Agendamento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs font-semibold focus:outline-none focus:border-[#8C6B4F]"
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendente de Confirmação</option>
                <option value="completed">Atendimento Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Seção 6: Observações Internas */}
          <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
            <label className="block text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#8C6B4F]" /> Observações Internas (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Formato amendoado, cutícula fina, cliente pontual..."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
            />
          </div>

          {/* Footer de Ações */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100">
            {appointmentToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(appointmentToEdit.id);
                }}
                className="px-3.5 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200"
                title="Excluir este agendamento"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Agendamento</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#201510] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#3d2a20] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C5A88E]" />
                <span>{appointmentToEdit ? 'Atualizar Agendamento' : 'Salvar Agendamento'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
