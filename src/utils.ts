import { Appointment, Block, BusySlot, WorkingDay } from './types';

export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const generateTimeSlots = (
  date: string, // YYYY-MM-DD
  serviceDuration: number,
  workingHours: WorkingDay[],
  appointments: (Appointment | BusySlot)[],
  blocks: Block[],
  slotInterval: number = 15,
  procedureIntervalMinutes: number = 0
): string[] => {
  // Use a local date to avoid timezone shifts
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();
  const dayConfig = workingHours.find(w => w.dayOfWeek === dayOfWeek);

  if (!dayConfig || !dayConfig.isOpen) return [];

  // Check full day blocks
  const dateBlocks = blocks.filter(b => b.date === date);
  if (dateBlocks.some(b => b.isFullDay)) return [];

  const openMins = timeToMinutes(dayConfig.openTime);
  const closeMins = timeToMinutes(dayConfig.closeTime);
  
  // Lunch break check
  const hasLunch = !!(dayConfig.hasLunchBreak && dayConfig.lunchStart && dayConfig.lunchEnd);
  const lunchStartMins = hasLunch ? timeToMinutes(dayConfig.lunchStart!) : 0;
  const lunchEndMins = hasLunch ? timeToMinutes(dayConfig.lunchEnd!) : 0;

  const slots: string[] = [];
  const interval = (typeof slotInterval === 'number' && slotInterval > 0) ? slotInterval : 15;

  for (let t = openMins; t + serviceDuration <= closeMins; t += interval) {
    const slotStart = t;
    const slotEnd = t + serviceDuration;

    // Check overlap with lunch break
    if (hasLunch) {
      if (Math.max(slotStart, lunchStartMins) < Math.min(slotEnd, lunchEndMins)) {
        continue;
      }
    }

    // Check overlaps with appointments (supports Appointment or BusySlot)
    const dateApps = appointments.filter(a => {
      const apptDate = 'appt_date' in a ? a.appt_date : a.date;
      const status = 'status' in a ? a.status : 'confirmed';
      return apptDate === date && status !== 'cancelled';
    });
    const hasAppOverlap = dateApps.some(app => {
      const startTime = 'start_time' in app ? app.start_time : app.startTime;
      const endTime = 'end_time' in app ? app.end_time : app.endTime;
      const appStart = timeToMinutes(startTime);
      const appEnd = timeToMinutes(endTime) + (procedureIntervalMinutes || 0);
      return Math.max(slotStart, appStart) < Math.min(slotEnd, appEnd); // Overlap condition
    });

    if (hasAppOverlap) continue;

    // Check overlaps with partial blocks
    const hasBlockOverlap = dateBlocks.some(b => {
      if (b.isFullDay || !b.startTime || !b.endTime) return false;
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return Math.max(slotStart, bStart) < Math.min(slotEnd, bEnd);
    });

    if (hasBlockOverlap) continue;

    slots.push(minutesToTime(slotStart));
  }

  return slots;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(d);
};

export const formatShortDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

export const formatDuration = (mins: number): string => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const formatPhoneMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits.length) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length === 11 || (digits[2] === '9' && digits.length > 6)) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
};

/**
 * Formata digitação de moeda com milhar e centavos automáticos:
 * Ex: "15000" -> "150,00", "125000" -> "1.250,00", "50" -> "0,50"
 */
export const formatCurrencyFromDigits = (typedValue: string | number): string => {
  const digits = String(typedValue).replace(/\D/g, '');
  if (!digits) return '';
  const val = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

/**
 * Formata um número existente para padrão BRL com milhar e decimais:
 * Ex: 80 -> "80,00", 1250.5 -> "1.250,50"
 */
export const formatNumberToCurrencyString = (val: number | string | undefined | null): string => {
  if (val === '' || val === undefined || val === null) return '';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Converte string formatada ("1.250,00" ou "80,00") para número float (1250 ou 80)
 */
export const parseCurrencyStringToNumber = (str: string | number | undefined | null): number => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const digits = String(str).replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
};

export const getAppointmentDate = (dateStr: string, timeStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
};

/**
 * Returns whether the appointment can be cancelled automatically (at least 24h prior)
 * and the exact hours remaining until the appointment.
 */
export const checkCancellationPolicy = (
  dateStr: string,
  timeStr: string
): { canCancel: boolean; hoursRemaining: number; isPast: boolean } => {
  const appDate = getAppointmentDate(dateStr, timeStr);
  const now = new Date();
  const diffMs = appDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  
  if (diffMs <= 0) {
    return { canCancel: false, hoursRemaining: 0, isPast: true };
  }

  // 2 full days = 48 hours
  return {
    canCancel: hoursRemaining >= 48,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    isPast: false
  };
};

/**
 * Checks if the appointment is happening within the next 24 to 36 hours
 * (ideal window for sending the 24h confirmation reminder).
 */
export const isReadyFor24hReminder = (dateStr: string, timeStr: string): boolean => {
  const appDate = getAppointmentDate(dateStr, timeStr);
  const now = new Date();
  const diffMs = appDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  // Between 0 and 36 hours away (covers tomorrow and today's upcoming appointments)
  return hoursRemaining > 0 && hoursRemaining <= 36;
};

export const getServiceCategory = (service: { name: string; category?: string }): 'aplicacao' | 'manutencao' | 'outros' => {
  if (service.category === 'aplicacao' || service.category === 'manutencao' || service.category === 'outros') {
    return service.category;
  }
  const n = service.name.toLowerCase();
  if (n.includes('manutenç') || n.includes('manutenc') || n.includes('reparo') || n.includes('retifica')) {
    return 'manutencao';
  }
  if (n.includes('alongamento') || n.includes('aplicação') || n.includes('aplicacao') || n.includes('fibra') || n.includes('gel moldado') || n.includes('tip') || n.includes('acrigel')) {
    return 'aplicacao';
  }
  return 'outros';
};

/**
 * Retorna a imagem padrão mais adequada para cada procedimento com fotos reais do estúdio.
 */
export const getDefaultServiceImage = (service: { name?: string; category?: string }): string => {
  const n = (service.name || '').toLowerCase();
  const cat = (service.category || '').toLowerCase();

  if (cat === 'manutencao' || n.includes('manuten') || n.includes('repar') || n.includes('nivel')) {
    return '/manutencao_1.webp';
  }
  if (cat === 'aplicacao' || n.includes('along') || n.includes('fibra') || n.includes('molde') || n.includes('banho')) {
    return '/aplicacao_1.webp';
  }
  if (n.includes('esmalt') || n.includes('brilho')) {
    return '/esmaltacao_em_gel_1.webp';
  }
  if (n.includes('art') || n.includes('design') || n.includes('decor')) {
    return '/manutencao-decorada.webp';
  }
  if (n.includes('manicure') || n.includes('pedicure') || n.includes('tradicional')) {
    return '/outros_servicos_1.webp';
  }
  return '/aplicacao_1.webp';
};

/**
 * Retorna uma galeria padrão de fotos reais do estúdio para exibição nos cards.
 */
export const getDefaultServiceGallery = (service: { name?: string; category?: string }): string[] => {
  const primary = getDefaultServiceImage(service);
  const n = (service.name || '').toLowerCase();
  const cat = (service.category || '').toLowerCase();

  if (cat === 'aplicacao' || n.includes('along') || n.includes('fibra')) {
    return [primary, '/molde-f1.webp', '/banho-de-gel.webp', '/primeiro-atendimento.webp'];
  }
  if (cat === 'manutencao' || n.includes('manuten')) {
    return [primary, '/manutencao-esmaltacao.webp', '/manutencao-decorada.webp', '/manutencao-outra-profissional.webp'];
  }
  if (n.includes('esmalt')) {
    return [primary, '/esmaltacao-em-gel.webp', '/esmaltacao_em_gel_1.webp'];
  }
  if (n.includes('art') || n.includes('design')) {
    return [primary, '/manutencao-decorada.webp', '/francesinha_1.jpg'];
  }
  return [primary, '/espaco-atendimento.webp', '/francesinha_1.jpg'];
};

/**
 * Retorna a URL pública oficial e atualizada para envio e compartilhamento com as clientes.
 * Trata ambientes de desenvolvimento (ais-dev -> ais-pre), localhost e domínios personalizados.
 */
export const getPublicClientUrl = (fallback?: string): string => {
  const envUrl = import.meta.env.VITE_PUBLIC_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (fallback && typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gabriela_nail_store_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.config?.publicUrl && typeof parsed.config.publicUrl === 'string' && parsed.config.publicUrl.trim()) {
          return parsed.config.publicUrl.trim().replace(/\/+$/, '');
        }
      }
    } catch {}
    if (window.location?.origin) {
      return window.location.origin;
    }
  }
  return '';
};


