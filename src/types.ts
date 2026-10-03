export interface ComplementaryService {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  images?: string[];
}

export interface ServiceCategory {
  id: string;
  label: string;
  description?: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  description?: string;
  imageUrl?: string;
  images?: string[];
  category?: string;
  parentId?: string;
  parentServiceName?: string;
  isComplement?: boolean;
  complements?: ComplementaryService[];
}

export interface BusySlot {
  appt_date: string;
  start_time: string;
  end_time: string;
}

export interface AppointmentResult {
  success: boolean;
  error?: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceIds?: string[];
  serviceNames?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  clientName: string;
  clientPhone: string;
  clientBirthday?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
  reminderSent?: boolean;
  notes?: string;
}

export interface Block {
  id: string;
  date: string; // YYYY-MM-DD
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface WorkingDay {
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasLunchBreak?: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface Config {
  address: string;
  whatsapp: string;
  instagram: string;
  workingHours: WorkingDay[];
  slotInterval?: number; // 15, 30 ou 60 minutos
  procedureIntervalMinutes?: number; // Tempo de intervalo entre procedimentos (em minutos)
  publicUrl?: string; // URL pública personalizada para clientes (ex: Vercel)
}

export type StatusCliente = 'ativa' | 'risco' | 'sumida' | 'pararam';

export interface ClienteAtendimento {
  id?: string;
  data: string; // ISO format (YYYY-MM-DD)
  hora?: string; // HH:mm
  procedimento: string;
  valor: number;
  status?: 'completed' | 'confirmed' | 'pending' | 'cancelled';
  observacoes?: string;
}

export interface ClientProfile {
  phone: string;
  name: string;
  avatarUrl?: string;
  nailShape?: string;
  preferences?: string;
  allergies?: string;
  notes?: string;
  updatedAt?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;          // formato (27) 99999-9999
  avatarUrl?: string;
  clienteDesde: string;      // ISO
  ultimoAtendimento: string; // ISO
  atendimentos: ClienteAtendimento[];
  observacoes?: string;
  formatoUnhas?: string;
  preferencias?: string;
  alergias?: string;
}

export interface PageContentOverride {
  title: string;
  subtitle?: string;
  heroImage?: string;
  sections: {
    id: string;
    title: string;
    text: string;
    imageUrl: string;
  }[];
}

export interface ExperienceGalleryItem {
  id: string;
  url: string;
  caption: string;
}

export interface AboutMeContent {
  name: string;
  title: string;
  subtitle: string;
  photoUrl: string;
  bioParagraphs: string[];
  stats: { label: string; value: string }[];
}

export interface CatalogContentMap {
  aplicacoes?: PageContentOverride;
  manutencoes?: PageContentOverride;
  esmaltacao?: PageContentOverride;
  outros?: PageContentOverride;
  experiencia?: {
    title: string;
    subtitle: string;
    images: ExperienceGalleryItem[];
  };
  sobreMim?: AboutMeContent;
}

