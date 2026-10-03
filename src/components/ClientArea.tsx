import { AnimatePresence, motion } from 'motion/react';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../StoreContext';
import { Service, Appointment, ComplementaryService, BusySlot } from '../types';
import { generateTimeSlots, formatCurrency, formatDate, formatShortDate, formatDuration, cleanPhoneNumber, formatPhoneMask, getServiceCategory, getDefaultServiceImage } from '../utils';
import { getSupabaseClient, formatSupabaseErrorMessage } from '../supabaseClient';
import { MessageCircle, Clock, ChevronRight, ChevronLeft, CheckCircle2, User, Phone, MapPin, Search, Calendar as CalendarIcon, ArrowLeft, Menu, FileText, Sparkles, Check, X, Plus, Lock, Gift, Minus, ChevronDown, AlertCircle } from 'lucide-react';
import { LandingPage } from './LandingPage';
import { MyAppointmentsModal } from './MyAppointmentsModal';
import { ClientMenuDrawer } from './ClientMenuDrawer';
import { AboutMePage } from './AboutMePage';
import { ServiceGalleryPage } from './ServiceGalleryPage';
import { AplicacoesPage } from './AplicacoesPage';
import { ManutencoesPage } from './ManutencoesPage';
import { EsmaltacaoEmGelPage } from './EsmaltacaoEmGelPage';
import { OutrosServicosPage } from './OutrosServicosPage';
import { ComplementaryServicesModal } from './ComplementaryServicesModal';
import { useDeviceBackButton } from '../hooks/useDeviceBackButton';

export const ClientArea: React.FC<{onAdminClick: () => void}> = ({ onAdminClick }) => {
  const { services, config, appointments, blocks, addAppointment } = useStore();
  
  // 0 = LandingPage, 1 = Serviço, 2 = Data, 3 = Horário, 4 = Dados, 5 = Confirmação, 6 = Sucesso
  const [step, setStep] = useState<number>(0);

  // Seleção de serviços: inicia sem nenhum procedimento selecionado
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timePeriodFilter, setTimePeriodFilter] = useState<'todos' | 'manha' | 'tarde'>('todos');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientBirthday, setClientBirthday] = useState('');
  const [birthdayDay, setBirthdayDay] = useState<number | ''>('');
  const [birthdayMonth, setBirthdayMonth] = useState<number | ''>('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [debugRpcInfo, setDebugRpcInfo] = useState<{ from: string; to: string; error?: string }>({ from: '', to: '' });

  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }, []);

  // Carrega busy_slots via RPC para o mês visível da agenda
  const fetchBusySlots = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data, error } = await client.rpc('busy_slots', { p_from: from, p_to: to });
    setDebugRpcInfo({
      from,
      to,
      error: error ? formatSupabaseErrorMessage(error) : undefined
    });
    if (data && Array.isArray(data)) {
      setBusySlots(data);
    }
  }, [calendarMonthDate]);

  useEffect(() => {
    fetchBusySlots();
    const onRecheck = () => {
      fetchBusySlots();
    };
    window.addEventListener('focus', onRecheck);
    document.addEventListener('visibilitychange', onRecheck);
    return () => {
      window.removeEventListener('focus', onRecheck);
      document.removeEventListener('visibilitychange', onRecheck);
    };
  }, [fetchBusySlots]);

  const monthsList = useMemo(() => [
    { value: 1, name: 'Janeiro' },
    { value: 2, name: 'Fevereiro' },
    { value: 3, name: 'Março' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Maio' },
    { value: 6, name: 'Junho' },
    { value: 7, name: 'Julho' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Setembro' },
    { value: 10, name: 'Outubro' },
    { value: 11, name: 'Novembro' },
    { value: 12, name: 'Dezembro' }
  ], []);

  useEffect(() => {
    if (birthdayDay && birthdayMonth) {
      const dStr = String(birthdayDay).padStart(2, '0');
      const mStr = String(birthdayMonth).padStart(2, '0');
      setClientBirthday(`${dStr}/${mStr}`);
    } else {
      setClientBirthday('');
    }
  }, [birthdayDay, birthdayMonth]);

  const [clientNotes, setClientNotes] = useState('');

  // Sincronização imediata: se o admin remover ou atualizar um serviço no catálogo,
  // ajusta instantaneamente a seleção do cliente sem quebrar o estado ou exibir dados fantasmas
  useEffect(() => {
    if (selectedServices.length > 0) {
      setSelectedServices(prev => 
        prev.filter(sel => {
          if (sel.isComplement && sel.parentId) {
            const parent = services.find(s => s.id === sel.parentId);
            return !!parent && (parent.complements?.some(c => c.id === sel.id || c.name === sel.name) ?? true);
          }
          return services.some(s => s.id === sel.id);
        })
      );
    }
  }, [services]);

  // Modais
  const [isMyAppointmentsOpen, setIsMyAppointmentsOpen] = useState(false);
  const [isAboutMeOpen, setIsAboutMeOpen] = useState(false);
  const [isAplicacoesOpen, setIsAplicacoesOpen] = useState(false);
  const [isManutencoesOpen, setIsManutencoesOpen] = useState(false);
  const [isEsmaltacaoEmGelOpen, setIsEsmaltacaoEmGelOpen] = useState(false);
  const [isOutrosServicosOpen, setIsOutrosServicosOpen] = useState(false);
  const [galleryData, setGalleryData] = useState<{title: string, subtitle?: string, images: string[]} | null>(null);
  const [modalParentService, setModalParentService] = useState<Service | null>(null);
  const [lastBookedApp, setLastBookedApp] = useState<Appointment | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<'todos' | 'aplicacao' | 'manutencao' | 'outros'>('todos');

  // Controle do botão Voltar do dispositivo / navegador em cascata (LIFO):
  // 1. Base do fluxo de agendamento (Passos 1 a 6)
  useDeviceBackButton(step > 0, () => {
    if (step === 6) {
      setStep(0);
      setSelectedDate('');
      setSelectedTime('');
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      setStep(0);
    }
  });

  // 2. Telas cheias, páginas informativas e modais de apoio
  useDeviceBackButton(isAboutMeOpen, () => setIsAboutMeOpen(false));
  useDeviceBackButton(isAplicacoesOpen, () => setIsAplicacoesOpen(false));
  useDeviceBackButton(isManutencoesOpen, () => setIsManutencoesOpen(false));
  useDeviceBackButton(isEsmaltacaoEmGelOpen, () => setIsEsmaltacaoEmGelOpen(false));
  useDeviceBackButton(isOutrosServicosOpen, () => setIsOutrosServicosOpen(false));
  useDeviceBackButton(!!galleryData, () => setGalleryData(null));
  useDeviceBackButton(isMyAppointmentsOpen, () => setIsMyAppointmentsOpen(false));
  useDeviceBackButton(!!modalParentService, () => setModalParentService(null));

  // 3. Menu Hambúrguer (gaveta lateral sobreposta, fecha com prioridade)
  useDeviceBackButton(isClientMenuOpen, () => setIsClientMenuOpen(false));

  // Cálculo automático do tempo total da agenda somando cada serviço selecionado
  const totalDurationMinutes = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  }, [selectedServices]);

  // Cálculo automático do valor total somando cada serviço selecionado
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((acc, s) => acc + (s.price || 0), 0);
  }, [selectedServices]);

  // Nomes combinados dos serviços selecionados
  const selectedServiceNames = useMemo(() => {
    if (selectedServices.length === 0) return '';
    return selectedServices.map(s => s.name).join(' + ');
  }, [selectedServices]);

  // Data mínima (hoje)
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Verifica se o mês exibido é o mês atual (ou passado) para desabilitar o botão 'Mês Anterior'
  const isCurrentMonthOrEarlier = useMemo(() => {
    const now = new Date();
    return (
      calendarMonthDate.getFullYear() < now.getFullYear() ||
      (calendarMonthDate.getFullYear() === now.getFullYear() && calendarMonthDate.getMonth() <= now.getMonth())
    );
  }, [calendarMonthDate]);

  // Verifica se o mês exibido é 2 meses à frente ou mais (limite máximo de 2 meses no futuro)
  const isTwoMonthsAheadOrMore = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const maxYear = currentMonth + 2 > 11 ? currentYear + 1 : currentYear;
    const maxMonth = (currentMonth + 2) % 12;
    return (
      calendarMonthDate.getFullYear() > maxYear ||
      (calendarMonthDate.getFullYear() === maxYear && calendarMonthDate.getMonth() >= maxMonth)
    );
  }, [calendarMonthDate]);

  // Nome formatado do mês em exibição (ex: SETEMBRO DE 2026)
  const monthNameFormatted = useMemo(() => {
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(calendarMonthDate);
    return `${name.toUpperCase()} DE ${calendarMonthDate.getFullYear()}`;
  }, [calendarMonthDate]);

  // Lista dos dias do mês com preenchimento da grade semanal (Domingo a Sábado)
  const monthlyCalendarCells = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    
    // Primeiro dia da semana do mês (0 = Domingo, 1 = Segunda, etc.)
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    // Quantidade total de dias no mês
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    // Quantidade de dias no mês anterior (para os dias de preenchimento)
    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Limite máximo de 2 meses à frente
    const maxYear = now.getMonth() + 2 > 11 ? now.getFullYear() + 1 : now.getFullYear();
    const maxMonth = (now.getMonth() + 2) % 12;
    const maxAllowedDate = new Date(maxYear, maxMonth + 1, 0); // último dia do mês limite (2 meses à frente)
    const maxAllowedDateStr = `${maxAllowedDate.getFullYear()}-${String(maxAllowedDate.getMonth() + 1).padStart(2, '0')}-${String(maxAllowedDate.getDate()).padStart(2, '0')}`;
    
    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isAvailable: boolean;
      isBlocked: boolean;
      isClosedDay: boolean;
      isToday: boolean;
      isPast: boolean;
      blockReason?: string;
      slotsCount: number;
    }[] = [];

    // Dias do mês anterior para completar o início da primeira semana
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDaysCount - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isAvailable: false,
        isBlocked: false,
        isClosedDay: false,
        isToday: false,
        isPast: true,
        slotsCount: 0,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = d.getDay();
      
      const isPast = dateStr < todayDateStr || dateStr > maxAllowedDateStr;
      
      // Verifica se o estúdio atende nesse dia da semana
      const dayConfig = (config.workingHours || []).find(w => w.dayOfWeek === dayOfWeek);
      const isWorking = !!(dayConfig && dayConfig.isOpen);
      
      // Verifica bloqueio de DIA INTEIRO considerando todos os registros da data
      const dayBlocks = blocks.filter(b => b.date === dateStr);
      const fullDayBlock = dayBlocks.find(b => b.isFullDay);
      const isBlocked = !!fullDayBlock;

      // Calcula os horários livres se o dia não estiver no passado, fechado ou com bloqueio integral
      let slotsCount = 0;
      if (!isPast && isWorking && !isBlocked) {
        const testDuration = totalDurationMinutes > 0 ? totalDurationMinutes : 30;
        const slots = generateTimeSlots(
          dateStr,
          testDuration,
          config.workingHours,
          busySlots,
          blocks,
          config.slotInterval || 15
        );
        slotsCount = slots.length;
      }
      
      const isToday = dateStr === todayDateStr;
      const isAvailable = !isPast && isWorking && !isBlocked && slotsCount > 0;

      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isAvailable,
        isBlocked,
        isClosedDay: !isWorking,
        isToday,
        isPast,
        blockReason: fullDayBlock?.reason,
        slotsCount,
      });
    }

    // Dias do próximo mês para completar o final da última semana
    const remainingCells = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isAvailable: false,
        isBlocked: false,
        isClosedDay: false,
        isToday: false,
        isPast: false,
        slotsCount: 0,
      });
    }

    return cells;
  }, [calendarMonthDate, config.workingHours, blocks, busySlots, totalDurationMinutes, config.slotInterval]);

  // Horários disponíveis para a data calculados com a DURAÇÃO TOTAL ACUMULADA dos serviços
  const availableSlots = useMemo(() => {
    if (!selectedDate || selectedServices.length === 0 || totalDurationMinutes <= 0) return [];
    return generateTimeSlots(
      selectedDate, 
      totalDurationMinutes, 
      config.workingHours, 
      busySlots, 
      blocks,
      config.slotInterval || 15
    );
  }, [selectedDate, selectedServices, totalDurationMinutes, config.workingHours, busySlots, blocks, config.slotInterval]);

  // Horário final calculado automaticamente com base no horário de início e na duração total
  const calculatedEndTime = useMemo(() => {
    if (!selectedTime || totalDurationMinutes <= 0) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const endMins = h * 60 + m + totalDurationMinutes;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [selectedTime, totalDurationMinutes]);

  // Separação dos horários em Manhã e Tarde
  const morningSlots = useMemo(() => availableSlots.filter(s => parseInt(s.split(':')[0], 10) < 13), [availableSlots]);
  const afternoonSlots = useMemo(() => availableSlots.filter(s => parseInt(s.split(':')[0], 10) >= 13), [availableSlots]);

  // Horários exibidos de acordo com o filtro selecionado (Todos / Manhã / Tarde)
  const displayedSlots = useMemo(() => {
    if (timePeriodFilter === 'manha') return morningSlots;
    if (timePeriodFilter === 'tarde') return afternoonSlots;
    return availableSlots;
  }, [timePeriodFilter, morningSlots, afternoonSlots, availableSlots]);

  const cleanPhone = cleanPhoneNumber(config.whatsapp || '27996040206');
  const whatsappUrl = `https://wa.me/55${cleanPhone}`;
  const instagramUrl = `https://instagram.com/${config.instagram || 'gabrielanail.beauty'}`;
  const addressUrl = config.address ? `https://maps.google.com/?q=${encodeURIComponent(config.address)}` : '#';

  const handleNavigateToBooking = (category: 'todos' | 'aplicacao' | 'manutencao' | 'outros' = 'todos') => {
    setServiceCategoryFilter(category);
    setIsClientMenuOpen(false);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAboutMe = () => {
    setIsClientMenuOpen(false);
    setIsAboutMeOpen(true);
  };

  // Alterna a seleção de um serviço (selecionar / desmarcar)
  const handleToggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        // Remove o serviço e quaisquer complementos associados a ele
        return prev.filter(s => s.id !== service.id && s.parentId !== service.id);
      } else {
        return [...prev, service];
      }
    });
    // Limpa o horário escolhido pois a nova duração recalculará a grade de horários disponíveis
    setSelectedTime('');
  };

  // Remove serviço selecionado pelo chip
  const handleRemoveService = (serviceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId && s.parentId !== serviceId));
    setSelectedTime('');
  };

  // Atualiza serviços complementares de um serviço específico
  const handleUpdateComplements = (parentService: Service, complements: Service[]) => {
    setSelectedServices(prev => {
      let next = [...prev];
      // Garante que o serviço pai está selecionado
      if (!next.some(s => s.id === parentService.id)) {
        next.push(parentService);
      }
      // Remove complementos antigos do mesmo pai
      next = next.filter(s => s.parentId !== parentService.id && !(s.isComplement && s.parentServiceName === parentService.name));
      // Adiciona os novos complementos
      next.push(...complements);
      return next;
    });
    setSelectedTime('');
  };

  // Alterna diretamente a seleção de um serviço complementar a partir do card
  const handleToggleComplementDirect = (parentService: Service, comp: ComplementaryService) => {
    const currentComplements = selectedServices.filter(
      s => s.parentId === parentService.id || (s.isComplement && s.parentServiceName === parentService.name)
    );

    const isAlreadySelected = currentComplements.some(
      s => s.id === comp.id || (s.isComplement && s.name === comp.name)
    );

    let nextComplements: Service[];
    if (isAlreadySelected) {
      nextComplements = currentComplements.filter(
        s => s.id !== comp.id && !(s.isComplement && s.name === comp.name)
      );
    } else {
      const newCompService: Service = {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        price: comp.price,
        durationMinutes: comp.durationMinutes,
        imageUrl: comp.images?.[0],
        images: comp.images,
        category: 'outros',
        parentId: parentService.id,
        parentServiceName: parentService.name,
        isComplement: true,
      };
      nextComplements = [...currentComplements, newCompService];
    }

    handleUpdateComplements(parentService, nextComplements);
  };

  // Filtra serviços baseado na categoria selecionada no menu ou na aba
  const displayedServices = useMemo(() => {
    if (serviceCategoryFilter === 'todos') return services;
    const filtered = services.filter(s => getServiceCategory(s) === serviceCategoryFilter);
    return filtered.length > 0 ? filtered : services;
  }, [services, serviceCategoryFilter]);

  // Se o usuário clicar em agendar na landing page com serviço pré-selecionado
  const handleSelectFromLanding = (service: Service) => {
    setSelectedServices([service]);
    setSelectedTime('');
    setStep(2); // Avança direto para a data
  };

  const handleConfirmBooking = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !clientName || !clientPhone) return;

    // Validação de 48 horas de antecedência
    const apptDate = new Date(`${selectedDate}T${selectedTime}`);
    const now = new Date();
    const diffHours = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 48) {
      setBookingError("Agendamentos com menos de 48 horas de antecedência devem ser realizados exclusivamente com a Gabriela.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    const client = getSupabaseClient();
    if (!client) {
      setBookingError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Consulta fresca dos horários ocupados antes de confirmar
      const { data: freshBusy, error: rpcErr } = await client.rpc('busy_slots', {
        p_from: selectedDate,
        p_to: selectedDate
      });

      if (rpcErr) {
        console.warn('Falha ao verificar horários ocupados:', rpcErr);
      }

      const activeBusy = (Array.isArray(freshBusy) ? freshBusy : busySlots) as (Appointment | BusySlot)[];
      const slotsCheck = generateTimeSlots(
        selectedDate,
        totalDurationMinutes,
        config.workingHours,
        activeBusy,
        blocks,
        config.slotInterval || 15
      );

      if (!slotsCheck.includes(selectedTime)) {
        setBookingError("Desculpe, este horário acabou de ser ocupado. Por favor, selecione outro horário disponível.");
        setSelectedTime('');
        setStep(3); // Volta para o passo de escolha de horário
        setIsSubmitting(false);
        return;
      }

      // 2. Monta campos para inserção pura (sem upsert, sem .select())
      const newId = crypto.randomUUID();
      const serviceNamesStr = selectedServices.map(s => s.name).join(' + ');
      const servicesPayload = selectedServices.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes
      }));

      const { error: insertErr } = await client.from('appointments').insert({
        id: newId,
        service_id: selectedServices[0]?.id || 'custom',
        service_names: serviceNamesStr,
        services: servicesPayload,
        date: selectedDate,
        start_time: selectedTime,
        end_time: calculatedEndTime,
        client_name: clientName.trim(),
        client_phone: cleanPhoneNumber(clientPhone),
        status: 'pending',
        price: totalPrice,
        notes: clientNotes.trim() || null
      });

      if (insertErr) {
        setBookingError(`Erro ao confirmar agendamento: ${formatSupabaseErrorMessage(insertErr)}`);
        setIsSubmitting(false);
        return;
      }

      // 3. Monta objeto de confirmação
      const app: Appointment = {
        id: newId,
        serviceId: selectedServices[0]?.id || 'custom',
        serviceIds: selectedServices.map(s => s.id),
        serviceNames: serviceNamesStr,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculatedEndTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientBirthday: clientBirthday.trim() || undefined,
        notes: clientNotes.trim() || undefined,
        status: 'pending',
        price: totalPrice
      };

      setLastBookedApp(app);
      setIsSubmitting(false);
      setStep(6); // Tela de sucesso
    } catch (err: any) {
      setBookingError(`Erro inesperado ao realizar o agendamento: ${err?.message || 'Falha de conexão'}`);
      setIsSubmitting(false);
    }
  };

  // Se estiver na Landing Page
  if (step === 0) {
    return (
      <>
        <LandingPage 
          onStart={() => {
            if (selectedServices.length > 0) {
              setSelectedTime('');
              setStep(2);
            } else {
              setServiceCategoryFilter('todos');
              setStep(1);
            }
          }} 
          onAdminClick={onAdminClick}
          onOpenMenu={() => setIsClientMenuOpen(true)}
          onSelectService={handleSelectFromLanding}
          selectedServices={selectedServices}
          onToggleService={handleToggleService}
          onRemoveService={handleRemoveService}
          onClearSelection={() => {
            setSelectedServices([]);
            setSelectedTime('');
          }}
          onContinueToBooking={() => {
            if (selectedServices.length > 0) {
              setSelectedTime('');
              setStep(2);
            } else {
              setStep(1);
            }
          }}
          onUpdateComplements={handleUpdateComplements}
        />
        <ClientMenuDrawer 
          isOpen={isClientMenuOpen}
          onClose={() => setIsClientMenuOpen(false)}
          onNavigateToBooking={handleNavigateToBooking}
          onOpenGallery={(title, subtitle, images) => {
            setGalleryData({ title, subtitle, images });
            setIsClientMenuOpen(false);
          }}
          onOpenAplicacoes={() => {
            setIsAplicacoesOpen(true);
            setIsClientMenuOpen(false);
          }}
          onOpenManutencoes={() => {
            setIsManutencoesOpen(true);
            setIsClientMenuOpen(false);
          }}
          onOpenEsmaltacaoEmGel={() => {
            setIsEsmaltacaoEmGelOpen(true);
            setIsClientMenuOpen(false);
          }}
          onOpenOutrosServicos={() => {
            setIsOutrosServicosOpen(true);
            setIsClientMenuOpen(false);
          }}
          onNavigateToAboutMe={handleNavigateToAboutMe}
          onAdminClick={onAdminClick}
          whatsappUrl={whatsappUrl}
          instagramUrl={instagramUrl}
          addressUrl={addressUrl}
          addressText={config.address}
        />
        <AnimatePresence>
          {isAboutMeOpen && (
            <AboutMePage 
              onBack={() => setIsAboutMeOpen(false)}
              config={config}
            />
          )}
          {isAplicacoesOpen && (
            <AplicacoesPage onBack={() => setIsAplicacoesOpen(false)} />
          )}
          {isManutencoesOpen && (
            <ManutencoesPage onBack={() => setIsManutencoesOpen(false)} />
          )}
          {isEsmaltacaoEmGelOpen && (
            <EsmaltacaoEmGelPage onBack={() => setIsEsmaltacaoEmGelOpen(false)} />
          )}
          {isOutrosServicosOpen && (
            <OutrosServicosPage onBack={() => setIsOutrosServicosOpen(false)} />
          )}
          {galleryData && (
            <ServiceGalleryPage
              title={galleryData.title}
              subtitle={galleryData.subtitle}
              images={galleryData.images}
              onBack={() => setGalleryData(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Se estiver no fluxo de Agendamento (Passos 1 a 6)
  return (
    <div className="min-h-screen bg-white font-sans text-[#231812] flex flex-col justify-between selection:bg-[#F5EFEB] selection:text-[#231812] antialiased">
      
      {/* 1. Header Fixo + Linha com as etapas do agendamento fixa abaixo dele */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all">
        <header className="max-w-6xl mx-auto px-4 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between relative">
          <button 
            onClick={() => {
              if (step > 1 && step < 6) {
                setStep(step - 1);
              } else {
                setStep(0);
              }
            }}
            className="w-8 h-8 flex items-center justify-center text-[#231812] hover:opacity-75 transition-opacity cursor-pointer shrink-0 z-10"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-[#231812]" strokeWidth={1.5} />
          </button>

          <div 
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer text-center z-0" 
            onClick={() => setStep(0)}
          >
            <img src="/logo_gabi_header.png" alt="Gabriela Santos" className="h-8 sm:h-10 md:h-12 w-auto object-contain select-none" />
          </div>

          <button 
            onClick={() => setIsClientMenuOpen(true)} 
            title="Menu de opções"
            className="w-8 h-8 flex items-center justify-center text-[#231812] hover:opacity-75 transition-opacity cursor-pointer shrink-0 z-10"
          >
            <Menu className="w-6 h-6 text-[#231812]" strokeWidth={1.3} />
          </button>
        </header>

        {/* 2. Stepper com 5 Etapas mantido fixo logo abaixo do Header */}
        {step >= 1 && step <= 5 && (
          <div className="border-t border-stone-100/70 bg-white/90">
            <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-3.5 w-full">
              <div className="flex items-center justify-between relative">
                
                {/* Linha horizontal contínua de fundo conectando os círculos */}
                <div className="absolute left-[8%] right-[8%] top-[14px] sm:top-[16px] h-[1px] bg-[#E2D6CB] -z-0" />

                {/* Etapas: 1 Serviço, 2 Data, 3 Horário, 4 Dados, 5 Confirmação */}
                {[
                  { number: 1, label: 'Serviço' },
                  { number: 2, label: 'Data' },
                  { number: 3, label: 'Horário' },
                  { number: 4, label: 'Dados' },
                  { number: 5, label: 'Confirmação' },
                ].map((s) => {
                  const isActive = step === s.number;
                  const isPassed = step > s.number;

                  return (
                    <div 
                      key={s.number} 
                      className="flex flex-col items-center relative z-10 cursor-pointer"
                      onClick={() => {
                        // Permite voltar para uma etapa já concluída
                        if (s.number < step) {
                          setStep(s.number);
                        }
                      }}
                    >
                      <div 
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-[13px] font-medium transition-all ${
                          isActive
                            ? 'bg-[#201510] text-white shadow-xs scale-105'
                            : isPassed
                            ? 'bg-[#8C6B4F] text-white'
                            : 'bg-white border border-[#D4C3B5] text-[#76685F]'
                        }`}
                      >
                        {s.number}
                      </div>
                      <span 
                        className={`text-[10px] sm:text-[11px] mt-1.5 transition-colors ${
                          isActive 
                            ? 'font-medium text-[#201510]' 
                            : isPassed
                            ? 'font-medium text-[#8C6B4F]'
                            : 'text-[#8C7D73]'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        )}
      </div>

      <main className={`flex-1 flex flex-col ${step === 3 ? 'pt-2.5 sm:pt-4' : 'pt-4 sm:pt-6'}`}>

        {/* 4. Conteúdo Central de Cada Etapa */}
        <div className={`max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${step === 3 ? 'pb-20 sm:pb-24 lg:pb-6' : (step >= 1 && step <= 5 ? 'pb-24 sm:pb-28 lg:pb-12' : 'pb-8')}`}>
          
          {step >= 1 && step <= 5 ? (
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
              
              {/* Coluna Principal da Etapa */}
              <div className="lg:col-span-7 xl:col-span-8">
          
          {/* ==================== ETAPA 1: ESCOLHA O SERVIÇO ==================== */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#221711] font-normal">
                  1. Escolha os serviços
                </h2>
                <p className="text-xs text-[#76685F] mt-0.5">
                  Selecione um ou mais procedimentos para o seu atendimento.
                </p>
              </div>

              {/* Barra de resumo de serviços selecionados (com tempo e valor automáticos - visível apenas no mobile) */}
              {selectedServices.length > 0 && (
                <div className="rounded-2xl bg-[#FAF6F2] p-4 border border-[#E5D7CC] space-y-2.5 shadow-2xs lg:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#54463E] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      {selectedServices.length} {selectedServices.length === 1 ? 'Serviço Selecionado' : 'Serviços Selecionados'}
                    </span>
                    <button 
                      onClick={() => { setSelectedServices([]); setSelectedTime(''); }}
                      className="text-[11px] text-[#A08775] hover:text-[#201510] underline"
                    >
                      Limpar seleção
                    </button>
                  </div>

                  {/* Chips dos serviços selecionados com botão de remover */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedServices.map(s => (
                      <span 
                        key={s.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#DDD0C3] text-xs font-medium text-[#201510] shadow-2xs"
                      >
                        <span>{s.name}</span>
                        <span className="text-[#8C6B4F] text-[10px] font-normal">({formatDuration(s.durationMinutes)})</span>
                        <button 
                          onClick={(e) => handleRemoveService(s.id, e)}
                          className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-0.5"
                          title="Remover serviço"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Métricas calculadas automaticamente */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8DDD2] text-xs">
                    <div className="flex items-center gap-1.5 text-[#54463E]">
                      <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span>Tempo total de agenda:</span>
                      <strong className="text-[#201510] font-semibold">{formatDuration(totalDurationMinutes)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[#54463E] mr-1.5">Total:</span>
                      <strong className="text-[#201510] text-sm font-serif font-bold">{formatCurrency(totalPrice)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Categorias: Todos, Aplicações, Manutenções, Outros Serviços (Sem Scroll Horizontal) */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2 w-full">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'aplicacao', label: 'Aplicações' },
                  { id: 'manutencao', label: 'Manutenções' },
                  { id: 'outros', label: 'Outros', fullLabel: 'Outros Serviços' },
                ].map((cat) => {
                  const isActive = serviceCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setServiceCategoryFilter(cat.id as any)}
                      className={`w-full py-2 px-1 sm:px-3 rounded-full text-[11px] sm:text-xs font-semibold transition-all text-center truncate cursor-pointer ${
                        isActive
                          ? 'bg-[#201510] text-white shadow-xs'
                          : 'bg-[#FAF6F2] text-[#76685F] hover:bg-[#F2EAE1] hover:text-[#201510] border border-[#EFE5DC]'
                      }`}
                    >
                      <span className="sm:hidden">{cat.label}</span>
                      <span className="hidden sm:inline">{cat.fullLabel || cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Lista dos cards de serviço com seleção múltipla */}
              <div className="space-y-3">
                {displayedServices.map((s) => {
                  const isSelected = selectedServices.some(item => item.id === s.id);
                  
                  // Identifica complementos selecionados para este procedimento específico
                  const serviceComplements = selectedServices.filter(
                    item => item.parentId === s.id || (item.isComplement && item.parentServiceName === s.name)
                  );
                  const complementsCount = serviceComplements.length;
                  
                  return (
                    <div 
                      key={s.id}
                      className={`rounded-2xl p-3.5 sm:p-4 transition-all border flex flex-col gap-2.5 ${
                        isSelected 
                          ? 'border-[#8C6B4F] bg-[#FAF6F2]/80 shadow-xs ring-1 ring-[#8C6B4F]/30' 
                          : 'border-[#EDE4DC] bg-white hover:border-[#D4C3B5]'
                      }`}
                    >
                      {/* Topo do Procedimento: Foto, Informações, Preço e Seleção */}
                      <div 
                        onClick={() => handleToggleService(s)}
                        className="flex items-center justify-between gap-3 sm:gap-4 cursor-pointer"
                      >
                        {/* Lado Esquerdo: Foto em miniatura + Textos */}
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          {s.imageUrl || getDefaultServiceImage(s) ? (
                            <img 
                              src={s.imageUrl || getDefaultServiceImage(s)} 
                              alt={s.name} 
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-stone-100 shadow-2xs"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getDefaultServiceImage(s);
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#FAF6F2] border border-[#EDE4DC] shrink-0 flex items-center justify-center text-[#8C6B4F]">
                              <Sparkles className="w-6 h-6 stroke-[1.4]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3 className="font-medium text-sm sm:text-base text-[#221711] leading-snug">
                                {s.name}
                              </h3>
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8C6B4F] text-white font-medium shrink-0">
                                  Selecionado
                                </span>
                              )}
                              {complementsCount > 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EADDCF] text-[#42342B] font-medium shrink-0">
                                  +{complementsCount} {complementsCount === 1 ? 'extra' : 'extras'}
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-xs text-[#76685F] mt-0.5 leading-relaxed line-clamp-2">
                                {s.description}
                              </p>
                            )}
                            <span className="inline-block text-[11px] text-[#A08775] mt-1 font-normal">
                              Duração: {formatDuration(s.durationMinutes)}
                            </span>
                          </div>
                        </div>

                        {/* Lado Direito: Preço + Caixa de seleção */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-1">
                          <span className="font-semibold text-sm sm:text-base text-[#221711] whitespace-nowrap">
                            {formatCurrency(s.price)}
                          </span>

                          {/* Seletor visual estilizado (Checkbox redondo com ícone de check) */}
                          <div 
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-[#8C6B4F] bg-[#8C6B4F] text-white shadow-2xs scale-105' 
                                : 'border-[#D4C3B5] bg-white text-transparent hover:border-[#8C6B4F]'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Serviços complementares cadastrados dentro do card */}
                      {s.complements && s.complements.length > 0 && (
                        <div className="pt-2.5 border-t border-[#EDE4DC]/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#8C6B4F]" />
                              Serviços Complementares Disponíveis
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalParentService(s);
                              }}
                              className="text-[10px] text-[#8C6B4F] hover:underline cursor-pointer"
                            >
                              Ver fotos ({s.complements.length})
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {s.complements.map((comp, compIdx) => {
                              const isCompSelected = selectedServices.some(
                                sel => (sel.id === comp.id && (sel.parentId === s.id || sel.parentServiceName === s.name)) ||
                                       (sel.isComplement && sel.name === comp.name && (sel.parentId === s.id || sel.parentServiceName === s.name))
                              );

                              return (
                                <button
                                  key={comp.id ? `${s.id}-${comp.id}` : `comp-${s.id}-${compIdx}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplementDirect(s, comp);
                                  }}
                                  className={`p-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 border text-xs cursor-pointer ${
                                    isCompSelected
                                      ? 'bg-white border-[#8C6B4F] text-[#201510] shadow-2xs ring-1 ring-[#8C6B4F]/30'
                                      : 'bg-[#FAF7F4] border-[#EADDCF]/70 text-[#54463E] hover:bg-white hover:border-[#D4C3B5]'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                      isCompSelected
                                        ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white'
                                        : 'bg-white border-[#D4C3B5] text-transparent'
                                    }`}>
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                    <span className="font-medium text-[11px] truncate text-[#201510]">
                                      {comp.name}
                                    </span>
                                  </div>
                                  <span className="font-serif font-bold text-[11px] text-[#8C6B4F] shrink-0">
                                    +{formatCurrency(comp.price)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ==================== ETAPA 2: ESCOLHA A DATA ==================== */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              {isDebugMode && (
                <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl text-xs font-mono space-y-3 border border-amber-500/50 shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-700 pb-2">
                    <span className="font-bold text-amber-400 uppercase tracking-wider">🔬 Painel de Diagnóstico (?debug=1)</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">Ativo</span>
                  </div>

                  <div>
                    <strong className="text-amber-300">1. config.workingHours ({config.workingHours?.length || 0} dias configurados):</strong>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 bg-stone-950 p-2 rounded border border-stone-800 text-[11px]">
                      {(config.workingHours || []).map(w => {
                        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        return (
                          <div key={w.dayOfWeek} className={w.isOpen ? 'text-emerald-400' : 'text-red-400'}>
                            {days[w.dayOfWeek]} ({w.dayOfWeek}): {w.isOpen ? `Aberto ${w.openTime} - ${w.closeTime}` : 'Fechado'}
                            {w.isOpen && w.lunchStart && ` (Almoço ${w.lunchStart}-${w.lunchEnd})`}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <strong className="text-amber-300">2. Blocks Carregados ({blocks.length}):</strong>
                    {blocks.length === 0 ? (
                      <p className="text-stone-400 text-[11px]">Nenhum bloqueio na tabela schedule_blocks.</p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto bg-stone-950 p-2 rounded border border-stone-800 space-y-1 text-[11px]">
                        {blocks.map(b => (
                          <div key={b.id} className="text-stone-300">
                            • Data: {b.date} | {b.isFullDay ? 'Dia Inteiro' : `${b.startTime} às ${b.endTime}`} {b.reason ? `(${b.reason})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <strong className="text-amber-300">3. BusySlots Carregados ({busySlots.length}):</strong>
                    {busySlots.length === 0 ? (
                      <p className="text-stone-400 text-[11px]">Nenhum busy_slot retornado no período.</p>
                    ) : (
                      <div className="bg-stone-950 p-2 rounded border border-stone-800 space-y-1 text-[11px]">
                        <p className="text-stone-400">Primeiros 5 registros:</p>
                        {busySlots.slice(0, 5).map((bs, i) => (
                          <div key={i} className="text-stone-300">
                            • {bs.appt_date} das {bs.start_time} às {bs.end_time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <strong className="text-amber-300">4. Chamada busy_slots:</strong>
                    <p className="text-[11px] text-stone-300">
                      Período consultado: <code>{debugRpcInfo.from || 'N/A'}</code> até <code>{debugRpcInfo.to || 'N/A'}</code>
                    </p>
                    {debugRpcInfo.error ? (
                      <p className="text-red-400 text-[11px]">Erro RPC: {debugRpcInfo.error}</p>
                    ) : (
                      <p className="text-emerald-400 text-[11px]">RPC executada com sucesso</p>
                    )}
                  </div>

                  <div>
                    <strong className="text-amber-300">5. Duração Total Selecionada:</strong>
                    <p className="text-[11px] text-stone-300">
                      {totalDurationMinutes} minutos ({selectedServices.map(s => s.name).join(' + ') || 'Nenhum serviço'})
                    </p>
                  </div>

                  <div>
                    <strong className="text-amber-300">6. Status e Horários Livres por Dia do Mês:</strong>
                    <div className="max-h-48 overflow-y-auto bg-stone-950 p-2 rounded border border-stone-800 text-[11px] space-y-1">
                      {monthlyCalendarCells.filter(c => c.isCurrentMonth).map(c => {
                        const dayOfWeek = new Date(c.dateStr + 'T12:00:00').getDay();
                        const dayConf = config.workingHours.find(w => w.dayOfWeek === dayOfWeek);
                        const dayBlocks = blocks.filter(b => b.date === c.dateStr);
                        const fullDayBlock = dayBlocks.find(b => b.isFullDay);
                        let reason = `${c.slotsCount} horários livres (Disponível)`;
                        if (c.isPast) reason = 'No passado / Fora do limite permitido';
                        else if (!dayConf || !dayConf.isOpen) reason = 'Fechado pela configuração de horários';
                        else if (fullDayBlock) reason = `Bloqueado: ${fullDayBlock.reason || 'Dia inteiro'}`;
                        else if (c.slotsCount === 0) reason = 'Sem horários livres para esta duração';

                        return (
                          <div key={c.dateStr} className={`flex justify-between ${c.isAvailable ? 'text-emerald-400 font-semibold' : 'text-stone-400'}`}>
                            <span>{c.dateStr} (Dia {c.dayNumber}):</span>
                            <span>{reason}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl sm:text-2xl text-[#221711] font-normal">
                    2. Escolha a data
                  </h2>
                  <button 
                    onClick={() => setStep(1)} 
                    className="text-xs text-[#8C6B4F] underline hover:text-[#201510]"
                  >
                    Alterar serviços
                  </button>
                </div>
                {selectedServices.length > 0 && (
                  <p className="text-xs text-[#76685F] mt-1">
                    Procedimento(s): <strong className="text-[#201510]">{selectedServiceNames}</strong> • {formatCurrency(totalPrice)} • Tempo total: <strong>{formatDuration(totalDurationMinutes)}</strong>
                  </p>
                )}
              </div>

              {/* Seletor visual de datas por Calendário Mensal com Navegação Esquerda/Direita */}
              {!(config.workingHours || []).some(w => w.isOpen) ? (
                <div className="bg-[#FAF5EF] border border-[#E6D8CA] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
                  <div className="w-12 h-12 bg-amber-100 text-[#8C6B4F] rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#201510]">
                      Horários em Atualização
                    </h3>
                    <p className="text-xs sm:text-sm text-[#76685F] leading-relaxed">
                      Os horários de atendimento estão sendo atualizados. Fale com a Gabriela pelo WhatsApp.
                    </p>
                  </div>
                  <a
                    href={`${whatsappUrl}?text=${encodeURIComponent('Olá, Gabriela! Gostaria de consultar os horários disponíveis para atendimento.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp</span>
                  </a>
                </div>
              ) : (
              <div className="bg-[#FAF5EF] border border-[#E6D8CA] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                
                {/* Header de Navegação entre Meses com Botões nos Cantos */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EDE3D6]">
                  {/* Botão no Canto Esquerdo: Mês Anterior */}
                  <button
                    type="button"
                    disabled={isCurrentMonthOrEarlier}
                    onClick={() => {
                      if (isCurrentMonthOrEarlier) return;
                      setCalendarMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                    }}
                    className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      isCurrentMonthOrEarlier
                        ? 'bg-stone-100/60 text-stone-300 border-stone-200/50 cursor-not-allowed'
                        : 'bg-white text-[#201510] border-[#DDD0C3] hover:bg-[#F2EAE1] hover:border-[#8C6B4F] shadow-2xs active:scale-95'
                    }`}
                    title="Ver mês anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Informação Central do Mês e Ano */}
                  <div className="text-center min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F] block">
                      Calendário Mensal
                    </span>
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#201510] font-sans tracking-wide truncate mt-0.5">
                      {monthNameFormatted}
                    </h3>
                  </div>

                  {/* Botão no Canto Direito: Próximo Mês */}
                  <button
                    type="button"
                    disabled={isTwoMonthsAheadOrMore}
                    onClick={() => {
                      if (isTwoMonthsAheadOrMore) return;
                      setCalendarMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                    }}
                    className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      isTwoMonthsAheadOrMore
                        ? 'bg-stone-100/60 text-stone-300 border-stone-200/50 cursor-not-allowed'
                        : 'bg-white text-[#201510] border-[#DDD0C3] hover:bg-[#F2EAE1] hover:border-[#8C6B4F] shadow-2xs active:scale-95'
                    }`}
                    title="Ver próximo mês"
                  >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Cabeçalho dos Dias da Semana (DOM, SEG, TER, QUA, QUI, SEX, SÁB) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((dayName, idx) => (
                    <div
                      key={dayName}
                      className={`text-[10px] sm:text-[11px] font-bold py-1 uppercase tracking-tight ${
                        idx === 0 || idx === 6 ? 'text-[#A88B74]' : 'text-[#8C6B4F]'
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Grade Mensal Completa (Domingo a Sábado) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {monthlyCalendarCells.map((d, index) => {
                    if (!d.isCurrentMonth) {
                      return (
                        <div
                          key={`pad-${index}`}
                          className="py-2 sm:py-2.5 px-1 rounded-xl sm:rounded-2xl flex items-center justify-center text-center text-stone-300 opacity-25 select-none text-xs font-medium"
                        >
                          {d.dayNumber}
                        </div>
                      );
                    }

                    const isSelected = selectedDate === d.dateStr;
                    const isBlockedDay = d.isBlocked && !d.isPast;

                    return (
                      <button
                        key={d.dateStr}
                        type="button"
                        disabled={!d.isAvailable}
                        onClick={() => {
                          if (!d.isAvailable) return;
                          setSelectedDate(d.dateStr);
                          setSelectedTime('');
                        }}
                        title={
                          d.isPast
                            ? 'Data passada ou fora do limite de agendamento'
                            : isBlockedDay 
                            ? (d.blockReason ? `Bloqueado: ${d.blockReason}` : 'Dia bloqueado para agendamentos') 
                            : !d.isAvailable && d.isClosedDay 
                            ? 'Estúdio fechado neste dia' 
                            : !d.isAvailable && d.slotsCount === 0
                            ? 'Sem horários livres para esta duração'
                            : undefined
                        }
                        className={`py-2 sm:py-2.5 px-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all text-center relative min-h-[46px] sm:min-h-[52px] ${
                          isSelected
                            ? 'bg-[#201510] text-white shadow-md ring-2 ring-[#8C6B4F]/60 scale-[1.04] z-10 cursor-pointer'
                            : isBlockedDay || !d.isAvailable
                            ? 'bg-[#FAF6F2]/60 text-[#C2B4A6] border border-[#EFE5DC]/60 cursor-not-allowed opacity-45'
                            : 'bg-[#F2E8DC] hover:bg-[#EBDCCF] text-[#221711] border border-[#DDD0C3] hover:border-[#8C6B4F] shadow-2xs active:scale-95 cursor-pointer'
                        }`}
                      >
                        {/* Número do Dia */}
                        <span className="text-xs sm:text-sm font-extrabold leading-tight">
                          {d.dayNumber}
                        </span>

                        {/* Indicadores: Hoje */}
                        {d.isToday && (
                          <span className={`text-[7px] sm:text-[8px] font-bold uppercase px-1 rounded-xs mt-0.5 leading-tight ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#8C6B4F] text-white'
                          }`}>
                            Hoje
                          </span>
                        )}

                        {/* Ponto Verde apenas quando disponível */}
                        {d.isAvailable && !isSelected && !d.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                        )}
                        {isSelected && !d.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E5D7CA] mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legenda visual explicativa do calendário */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#76685F] pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#A2907A]">
                    <span className="w-2 h-2 rounded-full bg-[#D8C7B8] shrink-0 opacity-60" />
                    <span>Indisponível / Fechado</span>
                  </div>
                </div>

                {/* Seletor Manual de Calendário Alternativo em tom Nude */}
                <div className="pt-3 border-t border-[#EDE3D6] flex items-center justify-between text-xs text-[#76685F]">
                  <span className="font-medium">Ou escolha outra data no calendário:</span>
                  <div className="relative">
                    <input 
                      type="date" 
                      min={todayStr}
                      value={selectedDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDate(val);
                        setSelectedTime('');
                        if (val) {
                          const [y, m] = val.split('-').map(Number);
                          if (!isNaN(y) && !isNaN(m)) {
                            setCalendarMonthDate(new Date(y, m - 1, 1));
                          }
                        }
                      }}
                      className="border border-[#DDD0C3] rounded-xl px-3 py-1.5 text-xs text-[#221711] bg-white focus:outline-none focus:border-[#8C6B4F] shadow-2xs font-medium"
                    />
                  </div>
                </div>

              </div>
              )}

              {selectedDate && (
                <div className="rounded-2xl bg-[#FAF6F2] p-4 flex items-center gap-3 text-xs text-[#54463E]">
                  <CalendarIcon className="w-5 h-5 text-[#8C6B4F] shrink-0" />
                  <div>
                    <span className="font-semibold text-[#221711]">Data selecionada:</span>{' '}
                    {formatDate(selectedDate)}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================== ETAPA 3: ESCOLHA O HORÁRIO ==================== */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              {/* Cabeçalho do Passo com botão de trocar data */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-serif text-lg sm:text-xl text-[#221711] font-normal leading-snug truncate">
                    3. Escolha o horário
                  </h2>
                  <p className="text-[11px] sm:text-xs text-[#76685F] mt-0.5 truncate capitalize">
                    {formatDate(selectedDate)} • <span className="font-semibold text-[#201510]">{selectedServiceNames}</span>
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setStep(2)} 
                  className="text-xs font-bold text-[#8C6B4F] hover:text-[#201510] px-3 py-1.5 rounded-full bg-[#FAF5EF] border border-[#E6D8CA] hover:bg-[#F2E8DC] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1 shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trocar data</span>
                </button>
              </div>

              {bookingError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-2.5 text-xs text-red-700 animate-shake">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900">Aviso de disponibilidade</p>
                      <p className="mt-0.5 leading-relaxed">{bookingError}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setBookingError(null)} 
                      className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {bookingError.includes('48 horas') && (
                    <a
                      href={`${whatsappUrl}?text=${encodeURIComponent(`Olá Gabriela! Gostaria de agendar ${selectedServiceNames} para o dia ${formatDate(selectedDate)} às ${selectedTime}. Como é com menos de 48 horas de antecedência, gostaria de verificar a disponibilidade com você.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#20ba59] transition-all shadow-xs"
                    >
                      <span>Falar com a Gabriela no WhatsApp</span>
                    </a>
                  )}
                </div>
              )}

              {availableSlots.length === 0 ? (
                <div className="bg-[#FAF5EF] rounded-2xl p-5 text-center border border-[#E6D8CA] space-y-2.5 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-[#F2E8DC] border border-[#DDD0C3] flex items-center justify-center mx-auto text-[#8C6B4F]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[#221711] text-xs sm:text-sm">
                      Não há horários disponíveis para este dia com duração de {formatDuration(totalDurationMinutes)}.
                    </p>
                    <p className="text-[11px] text-[#76685F] max-w-md mx-auto mt-0.5">
                      Todos os intervalos compatíveis com essa duração podem estar ocupados ou o estúdio possui horários reduzidos nesta data.
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setStep(2)} 
                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#201510] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#38261E] transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Escolher outra data</span>
                  </button>
                </div>
              ) : (
                /* Módulo de Horários em Tom Areia / Nude (#FAF5EF / #E6D8CA) */
                <div className="bg-[#FAF5EF] border border-[#E6D8CA] rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs space-y-3">
                  
                  {/* Header do Módulo de Horários com Filtro por Período */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#EDE3D6]">
                    <div className="min-w-0">
                      <span className="text-[9.5px] uppercase font-bold tracking-wider text-[#8C6B4F] block leading-none">
                        Horários de Atendimento
                      </span>
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#201510] font-sans tracking-tight mt-0.5 truncate">
                        {availableSlots.length} {availableSlots.length === 1 ? 'horário livre' : 'horários livres'}
                      </h3>
                    </div>

                    {/* Filtro Rápido de Período (Todos / Manhã / Tarde) */}
                    <div className="flex items-center gap-0.5 bg-white/95 p-0.5 rounded-full border border-[#DDD0C3] shrink-0 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setTimePeriodFilter('todos')}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          timePeriodFilter === 'todos'
                            ? 'bg-[#201510] text-white shadow-2xs'
                            : 'text-[#76685F] hover:text-[#201510]'
                        }`}
                      >
                        Todos ({availableSlots.length})
                      </button>
                      {morningSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTimePeriodFilter('manha')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                            timePeriodFilter === 'manha'
                              ? 'bg-[#201510] text-white shadow-2xs'
                              : 'text-[#76685F] hover:text-[#201510]'
                          }`}
                        >
                          <span>Manhã</span>
                          <span className="opacity-75 text-[10px]">({morningSlots.length})</span>
                        </button>
                      )}
                      {afternoonSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setTimePeriodFilter('tarde')}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                            timePeriodFilter === 'tarde'
                              ? 'bg-[#201510] text-white shadow-2xs'
                              : 'text-[#76685F] hover:text-[#201510]'
                          }`}
                        >
                          <span>Tarde</span>
                          <span className="opacity-75 text-[10px]">({afternoonSlots.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grade Otimizada e Compacta de Horários (Sem Scroll Vertical na Janela) */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-2 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto pr-0.5">
                    {displayedSlots.map((time) => {
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 rounded-xl flex items-center justify-center transition-all text-center relative cursor-pointer min-h-[38px] sm:min-h-[42px] ${
                            isSelected
                              ? 'bg-[#201510] text-white border-[#201510] shadow-md ring-2 ring-[#8C6B4F]/60 scale-[1.03] z-10'
                              : 'bg-[#F2E8DC] hover:bg-[#EBDCCF] text-[#221711] border border-[#DDD0C3] hover:border-[#8C6B4F] shadow-2xs active:scale-95'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className={`w-3 h-3 shrink-0 ${isSelected ? 'text-[#DBC3AE]' : 'text-[#8C6B4F]'}`} />
                            <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                              {time}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Rodapé Informativo Integrado com a Duração e Previsão de Término */}
                  <div className="pt-2.5 border-t border-[#EDE3D6] flex flex-wrap items-center justify-between gap-2 text-xs text-[#76685F]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium">Duração calculada:</span>
                      <span className="font-extrabold text-[#201510] bg-[#F2E8DC] px-2 py-0.5 rounded-lg border border-[#DDD0C3] text-[11px]">
                        {formatDuration(totalDurationMinutes)}
                      </span>
                    </div>

                    {selectedTime && calculatedEndTime ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#201510] bg-white px-2.5 py-1 rounded-xl border border-[#DDD0C3] shadow-2xs">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Atendimento das {selectedTime} às {calculatedEndTime}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#A08775] italic">
                        Toque em um horário para selecionar
                      </span>
                    )}
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ==================== ETAPA 4: SEUS DADOS ==================== */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#221711] font-normal">
                  4. Seus dados de contato
                </h2>
                <p className="text-xs text-[#76685F] mt-1">
                  Enviaremos a confirmação e o lembrete de atendimento pelo WhatsApp.
                </p>
              </div>

              <div className="bg-white border border-[#EDE4DC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                
                {/* Campos de Nome e WhatsApp em 2 colunas em telas médias/grandes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-xs font-semibold text-[#54463E] uppercase tracking-wider mb-2">
                      Nome completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A08775]" />
                      <input 
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Como você prefere ser chamada?"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D4C3B5] bg-white text-sm text-[#221711] placeholder:text-stone-400 focus:outline-none focus:border-[#8C6B4F] focus:ring-1 focus:ring-[#8C6B4F]"
                      />
                    </div>
                  </div>

                  {/* WhatsApp com máscara automática */}
                  <div>
                    <label className="block text-xs font-semibold text-[#54463E] uppercase tracking-wider mb-2">
                      WhatsApp com DDD *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A08775]" />
                      <input 
                        type="tel"
                        inputMode="numeric"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhoneMask(e.target.value))}
                        placeholder="(27) 99999-9999"
                        maxLength={15}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D4C3B5] bg-white text-sm text-[#221711] placeholder:text-stone-400 focus:outline-none focus:border-[#8C6B4F] focus:ring-1 focus:ring-[#8C6B4F]"
                      />
                    </div>
                    <p className="text-[11px] text-[#76685F] mt-1.5">
                      Lembrete de confirmação de 24 horas será enviado para este número.
                    </p>
                  </div>
                </div>

                {/* Observações / Detalhes adicionais (opcional) */}
                <div>
                  <label className="block text-xs font-semibold text-[#54463E] uppercase tracking-wider mb-2">
                    Observações ou preferências <span className="font-normal text-[#A08775]">(opcional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-[#A08775]" />
                    <textarea 
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Ex: Gostaria de unhas amendoadas, francesinha fina, unhas sensíveis..."
                      rows={2}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D4C3B5] bg-white text-sm text-[#221711] placeholder:text-stone-400 focus:outline-none focus:border-[#8C6B4F] focus:ring-1 focus:ring-[#8C6B4F]"
                    />
                  </div>
                </div>

                {/* Data de Aniversário (Dia e Mês) para brindes e promoções */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <label className="text-xs font-bold text-[#54463E] uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-[#8C6B4F]" />
                      <span>Data de Aniversário <span className="font-normal text-[#A08775] text-[11px] lowercase">(opcional)</span></span>
                    </label>
                    <span className="text-[11px] font-bold text-[#8C6B4F] bg-[#FAF5EF] px-2.5 py-1 rounded-full border border-[#E6D8CA] self-start sm:self-auto flex items-center gap-1">
                      <span>🎁</span> Ganhe brindes e promoções no seu mês!
                    </span>
                  </div>
                  
                  <div className="flex gap-4 max-w-md">
                    {/* Seletor do Dia */}
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-[#76685F] uppercase tracking-wider mb-1">
                        Dia
                      </label>
                      <div className="flex items-center bg-[#FAF6F2] border border-[#D4C3B5] rounded-xl overflow-hidden focus-within:border-[#8C6B4F] focus-within:ring-1 focus-within:ring-[#8C6B4F] transition-all">
                        {/* Botão Diminuir */}
                        <button
                          type="button"
                          onClick={() => {
                            setBirthdayDay((prev) => {
                              if (prev === '') return 1;
                              const newVal = Number(prev) - 1;
                              return newVal < 1 ? 31 : newVal;
                            });
                          }}
                          className="px-3 py-3 text-[#8C6B4F] hover:bg-[#F2E8DC] active:bg-[#E6D8CA] transition-colors focus:outline-none flex items-center justify-center cursor-pointer select-none"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        
                        {/* Campo de Entrada Numérica */}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={birthdayDay}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val === '') {
                              setBirthdayDay('');
                              return;
                            }
                            const num = Number(val);
                            if (num >= 1 && num <= 31) {
                              setBirthdayDay(num);
                            } else if (num > 31) {
                              setBirthdayDay(31);
                            }
                          }}
                          placeholder="Dia"
                          className="w-full text-center py-2 bg-transparent font-bold text-sm text-[#221711] placeholder:text-stone-400 focus:outline-none"
                        />
                        
                        {/* Botão Aumentar */}
                        <button
                          type="button"
                          onClick={() => {
                            setBirthdayDay((prev) => {
                              if (prev === '') return 1;
                              const newVal = Number(prev) + 1;
                              return newVal > 31 ? 1 : newVal;
                            });
                          }}
                          className="px-3 py-3 text-[#8C6B4F] hover:bg-[#F2E8DC] active:bg-[#E6D8CA] transition-colors focus:outline-none flex items-center justify-center cursor-pointer select-none"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Seletor do Mês */}
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-[#76685F] uppercase tracking-wider mb-1">
                        Mês
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMonthPickerOpen(true)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#D4C3B5] bg-[#FAF6F2] hover:bg-[#FAF5EF] text-sm text-[#221711] font-bold transition-colors focus:outline-none focus:border-[#8C6B4F] focus:ring-1 focus:ring-[#8C6B4F] cursor-pointer"
                      >
                        <span className={birthdayMonth ? 'text-[#221711]' : 'text-stone-400 font-normal'}>
                          {birthdayMonth ? monthsList.find(m => m.value === birthdayMonth)?.name : 'Mês'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-[#8C6B4F]" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#76685F] mt-2">
                    Informe apenas o dia e selecione o mês para concorrer a brindes e promoções exclusivas no mês do seu aniversário.
                  </p>

                  {/* Limpar aniversário, se preenchido */}
                  {(birthdayDay || birthdayMonth) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBirthdayDay('');
                        setBirthdayMonth('');
                      }}
                      className="text-xs text-[#8C6B4F] hover:text-[#201510] underline mt-2.5 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Limpar aniversário
                    </button>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ==================== ETAPA 5: CONFIRMAÇÃO ==================== */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-[#221711] font-normal">
                  5. Confirmação do agendamento
                </h2>
                <p className="text-xs text-[#76685F] mt-1">
                  Revise os detalhes dos serviços selecionados antes de finalizar.
                </p>
              </div>

              {bookingError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-2.5 text-xs text-red-700 animate-shake">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900 text-sm">Erro ao confirmar agendamento</p>
                      <p className="mt-0.5 leading-relaxed">{bookingError}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setBookingError(null)} 
                      className="text-red-400 hover:text-red-700 p-0.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {bookingError.includes('48 horas') && (
                    <a
                      href={`${whatsappUrl}?text=${encodeURIComponent(`Olá Gabriela! Gostaria de agendar ${selectedServiceNames} para o dia ${formatDate(selectedDate)} às ${selectedTime}. Como é com menos de 48 horas de antecedência, gostaria de verificar a disponibilidade com você.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#20ba59] transition-all shadow-xs"
                    >
                      <span>Falar com a Gabriela no WhatsApp</span>
                    </a>
                  )}
                </div>
              )}

              {/* Resumo do Agendamento */}
              <div className="bg-white border border-[#EDE4DC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5">
                
                {/* Lista de Procedimentos */}
                <div className="border-b border-stone-100 pb-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#76685F] text-xs font-semibold uppercase tracking-wider">
                      {selectedServices.length === 1 ? 'Procedimento' : `Procedimentos (${selectedServices.length})`}
                    </span>
                    <button 
                      onClick={() => setStep(1)} 
                      className="text-xs text-[#8C6B4F] underline hover:text-[#201510]"
                    >
                      Alterar
                    </button>
                  </div>
                  
                  <div className="space-y-1.5 pt-1">
                    {selectedServices.map((s, idx) => (
                      <div key={s.parentId ? `${s.parentId}-${s.id}-${idx}` : `${s.id}-${idx}`} className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-[#221711] font-medium">• {s.name}</span>
                        <span className="text-[#76685F]">
                          {formatDuration(s.durationMinutes)} • {formatCurrency(s.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[#76685F] text-xs">Tempo total estimado</span>
                  <span className="text-[#221711] font-semibold flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                    {formatDuration(totalDurationMinutes)}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[#76685F] text-xs">Data</span>
                  <span className="font-medium text-[#221711] text-xs sm:text-sm capitalize">
                    {selectedDate ? formatDate(selectedDate) : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[#76685F] text-xs">Horário reservado</span>
                  <span className="font-bold text-[#221711] text-sm sm:text-base">
                    {selectedTime} {calculatedEndTime ? `às ${calculatedEndTime}` : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[#76685F] text-xs">Cliente</span>
                  <span className="font-medium text-[#221711] text-sm">
                    {clientName}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                  <span className="text-[#76685F] text-xs">WhatsApp</span>
                  <span className="font-medium text-[#221711] text-xs">
                    {clientPhone}
                  </span>
                </div>

                {clientBirthday && (
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                    <span className="text-[#76685F] text-xs">Aniversário</span>
                    <span className="font-medium text-[#201510] text-xs flex items-center gap-1 font-bold">
                      🎁 {birthdayDay} de {monthsList.find(m => m.value === birthdayMonth)?.name}
                    </span>
                  </div>
                )}

                {clientNotes && (
                  <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                    <span className="text-[#76685F] text-xs">Obs.</span>
                    <span className="text-[#221711] text-xs text-right max-w-[240px]">
                      {clientNotes}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#54463E] text-sm font-medium">Valor Total</span>
                  <span className="font-serif text-2xl text-[#201510] font-bold">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Política de Agendamento */}
              <div className="rounded-2xl bg-[#FAF6F2] border border-[#E8DDD2] p-4 text-xs text-[#54463E] space-y-1.5">
                <p className="font-semibold text-[#221711]">Política de Agendamento:</p>
                <p>• Tolerância de espera (10 minutos).</p>
                <p>• O cancelamento e reagendamento deve ser feito em até 48 horas. Em 24h para o procedimento agendado, o cancelamento e reagendamento só será possível entrando em contato com a Gabriela Santos.</p>
                <p>• Em caso de imprevisto próximo ao horário, entre em contato diretamente pelo WhatsApp.</p>
              </div>

            </div>
          )}

              </div>

              {/* Coluna Direita: Resumo Fixo / Sticky no Desktop */}
              <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-28">
                <div className="bg-white border border-[#EDE4DC] rounded-3xl p-5 lg:p-6 shadow-xs space-y-4">
                  
                  {/* Cabeçalho do Resumo */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#8C6B4F]" />
                      <h3 className="font-serif text-lg font-normal text-[#201510]">
                        Seu Agendamento
                      </h3>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF6F2] text-[#8C6B4F] font-semibold border border-[#E8DDD2]">
                      Etapa {step} de 5
                    </span>
                  </div>

                  {/* Procedimentos Selecionados */}
                  {selectedServices.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#76685F] space-y-1.5">
                      <Sparkles className="w-6 h-6 text-[#A08775] mx-auto opacity-70" />
                      <p className="font-medium text-[#201510]">Nenhum serviço selecionado ainda</p>
                      <p className="text-[11px]">Selecione os procedimentos desejados na lista ao lado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#76685F] font-semibold uppercase tracking-wider">
                          Procedimentos ({selectedServices.length}):
                        </span>
                        {step === 1 && (
                          <button 
                            type="button"
                            onClick={() => { setSelectedServices([]); setSelectedTime(''); }}
                            className="text-[11px] text-[#8C6B4F] hover:underline cursor-pointer"
                          >
                            Limpar
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {selectedServices.map((s, idx) => (
                          <div key={s.parentId ? `${s.parentId}-${s.id}-${idx}` : `${s.id}-${idx}`} className="flex items-start justify-between text-xs gap-2 p-2.5 rounded-xl bg-[#FAF6F2]/70 border border-[#EFE5DC]">
                            <div className="min-w-0">
                              <p className="font-medium text-[#201510] truncate">{s.name}</p>
                              <p className="text-[11px] text-[#8C6B4F]">{formatDuration(s.durationMinutes)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold text-[#201510]">{formatCurrency(s.price)}</span>
                              {step === 1 && (
                                <button 
                                  type="button"
                                  onClick={(e) => handleRemoveService(s.id, e)}
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                                  title="Remover serviço"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Métricas de tempo e valor */}
                      <div className="pt-2 border-t border-stone-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[#54463E]">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                            Tempo total estimado:
                          </span>
                          <strong className="text-[#201510]">{formatDuration(totalDurationMinutes)}</strong>
                        </div>

                        {selectedDate && (
                          <div className="flex items-center justify-between text-[#54463E]">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-[#8C6B4F]" />
                              Data escolhida:
                            </span>
                            <strong className="text-[#201510] capitalize">{formatDate(selectedDate)}</strong>
                          </div>
                        )}

                        {selectedTime && (
                          <div className="flex items-center justify-between text-[#54463E]">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                              Horário:
                            </span>
                            <strong className="text-[#201510]">{selectedTime} {calculatedEndTime ? `às ${calculatedEndTime}` : ''}</strong>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-[#E8DDD2]">
                          <span className="text-sm font-semibold text-[#201510]">Valor Total:</span>
                          <span className="font-serif text-xl font-bold text-[#201510]">{formatCurrency(totalPrice)}</span>
                        </div>
                      </div>

                      {/* Botões de Ação na barra lateral para Desktop */}
                      <div className="pt-2 space-y-2">
                        {step === 1 && (
                          <button
                            type="button"
                            disabled={selectedServices.length === 0}
                            onClick={() => setStep(2)}
                            className="w-full bg-[#201510] text-white py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <span>Continuar para a Data</span>
                            <ChevronRight className="w-4 h-4 text-white/90" />
                          </button>
                        )}

                        {step === 2 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="w-1/3 border border-[#D4C3B5] text-[#54463E] py-3 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              disabled={!selectedDate}
                              onClick={() => setStep(3)}
                              className="flex-1 bg-[#201510] text-white py-3 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <span>Horário</span>
                              <ChevronRight className="w-4 h-4 text-white/90" />
                            </button>
                          </div>
                        )}

                        {step === 3 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(2)}
                              className="w-1/3 border border-[#D4C3B5] text-[#54463E] py-3 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              disabled={!selectedTime}
                              onClick={() => setStep(4)}
                              className="flex-1 bg-[#201510] text-white py-3 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <span>Dados</span>
                              <ChevronRight className="w-4 h-4 text-white/90" />
                            </button>
                          </div>
                        )}

                        {step === 4 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStep(3)}
                              className="w-1/3 border border-[#D4C3B5] text-[#54463E] py-3 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              disabled={!clientName.trim() || clientPhone.replace(/\D/g, '').length < 10}
                              onClick={() => setStep(5)}
                              className="flex-1 bg-[#201510] text-white py-3 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <span>Revisar</span>
                              <ChevronRight className="w-4 h-4 text-white/90" />
                            </button>
                          </div>
                        )}

                        {step === 5 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setStep(4)}
                              className="w-1/3 border border-[#D4C3B5] text-[#54463E] py-3 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Voltar
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={handleConfirmBooking}
                              className="flex-1 bg-[#201510] text-white py-3 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>{isSubmitting ? 'Confirmando...' : 'Confirmar'}</span>
                              <CheckCircle2 className="w-4 h-4 text-white/90" />
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                </div>
              </aside>

            </div>
          ) : null}

          {/* ==================== ETAPA 6: SUCESSO ==================== */}
          {step === 6 && (
            <div className="space-y-6 animate-fade-in text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#FAF6F2] text-[#8C6B4F] border border-[#E8DDD2] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9 stroke-[1.5]" />
              </div>

              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#221711] font-normal">
                  Agendamento Concluído!
                </h2>
                <p className="text-xs sm:text-sm text-[#76685F] mt-1.5 max-w-md mx-auto">
                  Tudo pronto para o seu momento de cuidado, <strong>{clientName}</strong>!
                </p>
              </div>

              {/* Resumo do agendamento */}
              <div className="bg-[#FAF6F2] border border-[#EDE4DC] rounded-2xl p-5 text-left max-w-md mx-auto space-y-2.5 text-xs text-[#54463E]">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#221711]">
                  <CalendarIcon className="w-4 h-4 text-[#8C6B4F]" />
                  <span>
                    {selectedDate ? formatDate(selectedDate) : ''} • {selectedTime} {calculatedEndTime ? `às ${calculatedEndTime}` : ''}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#8C6B4F] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-[#221711]">{selectedServiceNames}</span>
                    <span className="block text-[11px] text-[#76685F]">
                      Duração aprox. {formatDuration(totalDurationMinutes)} • Total: {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
                {config.address && (
                  <a
                    href={addressUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 pt-2 border-t border-[#E2D6CB] hover:opacity-85 transition-opacity group cursor-pointer"
                    title="Abrir no Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#8C6B4F] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="block font-medium text-[#221711]">{config.address}</span>
                      <span className="text-[10px] text-[#8C6B4F] underline">Toque para ver localização no Google Maps</span>
                    </div>
                  </a>
                )}
              </div>

              {/* Botão para avisar no WhatsApp da Gabriela */}
              <div className="space-y-3 max-w-md mx-auto">
                <a 
                  href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                    `Olá Gabriela!\nFiz meu agendamento para,\nData: ${selectedDate ? formatShortDate(selectedDate) : ''}\nHorário: ${selectedTime}\nServiço: ${selectedServiceNames}  Valor: ${formatCurrency(totalPrice)}\nNome cliente: ${clientName}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] text-white py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#1EBE5D] transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>CONFIRMAR NO WHATSAPP</span>
                </a>

                <button 
                  onClick={() => setIsMyAppointmentsOpen(true)}
                  className="w-full bg-[#201510] text-white py-3 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-[#38261E] transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>VER MEUS HORÁRIOS / CANCELAR</span>
                </button>

                <button 
                  onClick={() => {
                    setStep(0);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                  className="w-full border border-[#D4C3B5] text-[#54463E] py-2.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Barra de Ações Flutuante Fixa na Parte Inferior (Passos 1 ao 5 - apenas em mobile e telas menores que lg) */}
      {step === 1 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EADDCE] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_-4px_20px_rgba(32,21,16,0.08)] lg:hidden">
          <div className="max-w-2xl mx-auto w-full">
            <button 
              id="btn-floating-step1"
              type="button"
              disabled={selectedServices.length === 0}
              onClick={() => setStep(2)}
              className="w-full bg-[#201510] text-white py-3.5 sm:py-4 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>
                {selectedServices.length === 0
                  ? 'SELECIONE AO MENOS UM SERVIÇO'
                  : `CONTINUAR PARA A DATA (${selectedServices.length} ${selectedServices.length === 1 ? 'SERVIÇO' : 'SERVIÇOS'} • ${formatDuration(totalDurationMinutes)})`}
              </span>
              <ChevronRight className="w-4 h-4 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EADDCE] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_-4px_20px_rgba(32,21,16,0.08)] lg:hidden">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-2.5 sm:gap-3">
            <button 
              id="btn-floating-back-step2"
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 sm:w-1/4 border border-[#D4C3B5] text-[#54463E] py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer text-center"
            >
              Voltar
            </button>
            <button 
              id="btn-floating-next-step2"
              type="button"
              disabled={!selectedDate}
              onClick={() => setStep(3)}
              className="flex-1 bg-[#201510] text-white py-3.5 sm:py-4 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>CONTINUAR PARA O HORÁRIO</span>
              <ChevronRight className="w-4 h-4 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EADDCE] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_-4px_20px_rgba(32,21,16,0.08)] lg:hidden">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-2.5 sm:gap-3">
            <button 
              id="btn-floating-back-step3"
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 sm:w-1/4 border border-[#D4C3B5] text-[#54463E] py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer text-center"
            >
              Voltar
            </button>
            <button 
              id="btn-floating-next-step3"
              type="button"
              disabled={!selectedTime}
              onClick={() => setStep(4)}
              className="flex-1 bg-[#201510] text-white py-3.5 sm:py-4 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>CONTINUAR PARA OS DADOS</span>
              <ChevronRight className="w-4 h-4 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EADDCE] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_-4px_20px_rgba(32,21,16,0.08)] lg:hidden">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-2.5 sm:gap-3">
            <button 
              id="btn-floating-back-step4"
              type="button"
              onClick={() => setStep(3)}
              className="w-1/3 sm:w-1/4 border border-[#D4C3B5] text-[#54463E] py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer text-center"
            >
              Voltar
            </button>
            <button 
              id="btn-floating-next-step4"
              type="button"
              disabled={!clientName.trim() || clientPhone.replace(/\D/g, '').length < 10}
              onClick={() => setStep(5)}
              className="flex-1 bg-[#201510] text-white py-3.5 sm:py-4 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>AVANÇAR PARA CONFIRMAÇÃO</span>
              <ChevronRight className="w-4 h-4 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EADDCE] px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_-4px_20px_rgba(32,21,16,0.08)] lg:hidden">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-2.5 sm:gap-3">
            <button 
              id="btn-floating-back-step5"
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep(4)}
              className="w-1/3 sm:w-1/4 border border-[#D4C3B5] text-[#54463E] py-3.5 rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-[#FAF6F2] transition-colors cursor-pointer text-center disabled:opacity-50"
            >
              Voltar
            </button>
            <button 
              id="btn-floating-confirm-step5"
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmBooking}
              className="flex-1 bg-[#201510] text-white py-3.5 sm:py-4 rounded-full font-semibold uppercase tracking-wider text-xs sm:text-[13px] flex items-center justify-center gap-2 hover:bg-[#38261E] transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isSubmitting ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'}</span>
              <CheckCircle2 className="w-4 h-4 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {/* Modais auxiliares */}
      <MyAppointmentsModal 
        isOpen={isMyAppointmentsOpen}
        onClose={() => setIsMyAppointmentsOpen(false)}
        onReschedule={(app) => {
          const reschedServices = (app.serviceIds && app.serviceIds.length > 0)
            ? services.filter(ser => app.serviceIds!.includes(ser.id))
            : services.filter(ser => ser.id === app.serviceId);
          if (reschedServices.length > 0) {
            setSelectedServices(reschedServices);
          }
          setSelectedDate(app.date);
          setStep(3);
        }}
      />

      <ClientMenuDrawer 
        isOpen={isClientMenuOpen}
        onClose={() => setIsClientMenuOpen(false)}
        onNavigateToBooking={handleNavigateToBooking}
        onOpenGallery={(title, subtitle, images) => {
          setGalleryData({ title, subtitle, images });
          setIsClientMenuOpen(false);
        }}
        onOpenAplicacoes={() => {
          setIsAplicacoesOpen(true);
          setIsClientMenuOpen(false);
        }}
        onOpenManutencoes={() => {
          setIsManutencoesOpen(true);
          setIsClientMenuOpen(false);
        }}
        onOpenEsmaltacaoEmGel={() => {
          setIsEsmaltacaoEmGelOpen(true);
          setIsClientMenuOpen(false);
        }}
        onOpenOutrosServicos={() => {
          setIsOutrosServicosOpen(true);
          setIsClientMenuOpen(false);
        }}
        onNavigateToAboutMe={handleNavigateToAboutMe}
        onAdminClick={onAdminClick}
        whatsappUrl={whatsappUrl}
        instagramUrl={instagramUrl}
        addressUrl={addressUrl}
        addressText={config.address}
      />

      <AnimatePresence>
        {isAboutMeOpen && (
          <AboutMePage 
            onBack={() => setIsAboutMeOpen(false)}
            config={config}
          />
        )}
        {isAplicacoesOpen && (
          <AplicacoesPage onBack={() => setIsAplicacoesOpen(false)} />
        )}
        {isManutencoesOpen && (
          <ManutencoesPage onBack={() => setIsManutencoesOpen(false)} />
        )}
        {isEsmaltacaoEmGelOpen && (
          <EsmaltacaoEmGelPage onBack={() => setIsEsmaltacaoEmGelOpen(false)} />
        )}
        {isOutrosServicosOpen && (
          <OutrosServicosPage onBack={() => setIsOutrosServicosOpen(false)} />
        )}
        {galleryData && (
          <ServiceGalleryPage
            title={galleryData.title}
            subtitle={galleryData.subtitle}
            images={galleryData.images}
            onBack={() => setGalleryData(null)}
          />
        )}
        {isMonthPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#201510]/55 backdrop-blur-xs cursor-pointer"
              onClick={() => setIsMonthPickerOpen(false)}
            />
            
            {/* Conteúdo do Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="relative bg-[#FAF6F2] border border-[#E8DDD2] rounded-3xl shadow-xl w-full max-w-sm overflow-hidden z-10 p-6"
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between border-b border-[#EDE4DC] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[#8C6B4F]" />
                  <h3 className="font-serif text-lg text-[#221711] font-normal">
                    Selecione o Mês
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="p-1 rounded-full text-[#76685F] hover:bg-[#F2E8DC] hover:text-[#221711] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Grid de Meses */}
              <div className="grid grid-cols-3 gap-2.5">
                {monthsList.map((month) => {
                  const isSelected = birthdayMonth === month.value;
                  return (
                    <button
                      type="button"
                      key={month.value}
                      onClick={() => {
                        setBirthdayMonth(month.value);
                        setIsMonthPickerOpen(false);
                      }}
                      className={`py-3 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#201510] text-white border-[#201510] shadow-md scale-[1.03]'
                          : 'bg-white hover:bg-[#F2E8DC] text-[#54463E] border-[#EDE4DC] hover:border-[#8C6B4F] active:scale-95'
                      }`}
                    >
                      {month.name}
                    </button>
                  );
                })}
              </div>
              
              {/* Rodapé explicativo */}
              <p className="text-[10px] text-[#A08775] text-center mt-5 italic">
                Toque em um mês para selecionar e fechar.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Serviços Complementares */}
      <ComplementaryServicesModal
        isOpen={!!modalParentService}
        onClose={() => setModalParentService(null)}
        parentService={modalParentService}
        allServices={services}
        selectedServices={selectedServices}
        onSaveComplements={(parent, complements) => {
          handleUpdateComplements(parent, complements);
          setModalParentService(null);
        }}
      />

    </div>
  );
};
