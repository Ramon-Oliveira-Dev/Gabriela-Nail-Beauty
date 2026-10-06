import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Service, ComplementaryService, Appointment, Block, Config, ClientProfile, ServiceCategory, CatalogContentMap, AppointmentResult, WorkingDay } from './types';
import { getSupabaseClient, testSupabaseConnection, getSupabaseConfig, formatSupabaseErrorMessage } from './supabaseClient';
import { getDefaultServiceImage, cleanPhoneNumber } from './utils';

const LOCAL_STORAGE_KEY = 'GABI_APP_STATE_V3';
const PREV_LOCAL_STORAGE_KEY = 'GABI_APP_STATE_V2';

export const defaultCategories: ServiceCategory[] = [
  { id: 'aplicacao', label: 'Aplicações', description: 'Molde F1 e banho de gel' },
  { id: 'manutencao', label: 'Manutenções', description: 'Com esmaltação, decorada e vindo de outra profissional' },
  { id: 'esmaltacao', label: 'Esmaltação em Gel', description: 'Pés ou mãos' },
  { id: 'outros', label: 'Outros Serviços', description: 'Manicure clássica e detalhes artísticos' },
];

export const defaultCatalogContent: CatalogContentMap = {
  aplicacoes: {
    title: 'Aplicação',
    subtitle: 'Conheça nossas aplicações',
    heroImage: '/aplicacao_1.webp',
    sections: [
      {
        id: 'primeiro',
        title: 'Primeiro Atendimento',
        text: 'No primeiro atendimento fazemos a remoção do produto (caso a cliente esteja com outro procedimento nas unhas) ou fazemos a aplicação normal conforme a escolha da cliente.',
        imageUrl: '/primeiro-atendimento.webp'
      },
      {
        id: 'molde',
        title: 'Aplicação no Molde F1',
        text: 'Técnica moderna que garante curvatura perfeita, naturalidade e alta durabilidade sem necessidade de excesso de lixamento.',
        imageUrl: '/molde-f1.webp'
      },
      {
        id: 'banho',
        title: 'Banho de Gel',
        text: 'Ideal para quem quer fortalecer a unha natural com elegância, brilho intenso e proteção contra quebras.',
        imageUrl: '/banho-de-gel.webp'
      }
    ]
  },
  manutencoes: {
    title: 'Manutenção',
    subtitle: 'Mantenha suas unhas perfeitas',
    heroImage: '/manutencao_1.webp',
    sections: [
      {
        id: 'esmaltacao',
        title: 'Manutenção com Esmaltação',
        text: 'Nivelamento do crescimento, reestruturação do ponto de tensão e nova esmaltação em gel impecável.',
        imageUrl: '/manutencao-esmaltacao.webp'
      },
      {
        id: 'decorada',
        title: 'Manutenção Decorada',
        text: 'Manutenção completa com inclusão de nail art exclusiva, encapsuladas ou francesinha sorriso.',
        imageUrl: '/manutencao-decorada.webp'
      },
      {
        id: 'outra',
        title: 'Vindo de Outra Profissional',
        text: 'Avaliação cuidadosa da estrutura anterior, remoção ou nivelamento adequado para garantir a saúde das suas unhas.',
        imageUrl: '/manutencao_1.webp'
      }
    ]
  },
  esmaltacao: {
    title: 'Esmaltação em Gel',
    subtitle: 'Brilho e durabilidade prolongada',
    heroImage: '/esmaltacao_em_gel_1.webp',
    sections: [
      {
        id: 'gel1',
        title: 'Esmaltação em Gel',
        text: 'Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.',
        imageUrl: '/esmaltacao_em_gel_1.webp'
      }
    ]
  },
  outros: {
    title: 'Outros Serviços',
    subtitle: 'Cuidados essenciais para mãos e pés',
    heroImage: '/outros_servicos_1.webp',
    sections: [
      {
        id: 'manicure',
        title: 'Manicure Tradicional',
        text: 'Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.',
        imageUrl: '/outros_servicos_1.webp'
      }
    ]
  },
  experiencia: {
    title: 'Viva Esta Experiência',
    subtitle: 'Galeria do Espaço Gabriela Santos',
    images: [
      { id: '1', url: '', caption: 'Nosso espaço aconchegante' },
      { id: '2', url: '', caption: 'Detalhes em nail art' },
      { id: '3', url: '', caption: 'Francesinha clássica' },
      { id: '4', url: '', caption: 'Formato amendoado' }
    ]
  },
  sobreMim: {
    name: 'Gabriela Santos',
    title: 'Nail Designer & Especialista',
    subtitle: 'Transformando unhas em obras de arte',
    photoUrl: '/about_gabriela.jpg',
    bioParagraphs: [
      'Sou Gabriela Santos, apaixonada por nail design e por elevar a autoestima de cada cliente através de um atendimento exclusivo e técnicas avançadas.',
      'Com anos de experiência e constante aperfeiçoamento, nosso estúdio é um refúgio de cuidado, sofisticação e perfeição em cada detalhe.'
    ],
    stats: [
      { label: 'Anos de Experiência', value: '5+' },
      { label: 'Clientes Atendidas', value: '1.200+' },
      { label: 'Procedimentos', value: '3.500+' }
    ]
  }
};

// Helpers para identificar e purgar dados de exemplo/modelo do sistema
const mockPhones = ['27998812233', '27997124455', '27996557788', '27995439900'];
const mockNames = ['larissa mendes', 'camila rocha', 'beatriz lima', 'fernanda souza'];

const isSeedAppointment = (a: any): boolean => {
  if (!a) return false;
  if (typeof a.id === 'string' && a.id.startsWith('hist-seed-')) return true;
  const phone = (a.clientPhone || '').replace(/\D/g, '');
  const name = (a.clientName || '').trim().toLowerCase();
  return mockPhones.includes(phone) || mockNames.includes(name);
};

const isSeedClient = (phoneOrKey: string, profile?: any): boolean => {
  const pClean = (phoneOrKey || '').replace(/\D/g, '');
  const profName = (profile?.name || '').trim().toLowerCase();
  return mockPhones.includes(pClean) || mockNames.includes(profName);
};

const defaultAppointments: Appointment[] = [];

const mapAppointmentRow = (a: any): Appointment => ({
  id: String(a.id),
  serviceId: a.service_id || 'custom',
  serviceNames: a.service_names || undefined,
  date: a.date,
  startTime: a.start_time,
  endTime: a.end_time,
  clientName: a.client_name || '',
  clientPhone: a.client_phone || '',
  status: a.status || 'pending',
  price: Number(a.price) || 0,
  notes: a.notes || undefined,
  reminderSent: Boolean(a.reminder_sent)
});

const defaultClientProfiles: Record<string, ClientProfile> = {};

const defaultServices: Service[] = [
  { 
    id: '1', 
    name: 'Alongamento em Gel', 
    durationMinutes: 90, 
    price: 150, 
    description: 'Alongamento com gel para unhas naturais mais longas, resistentes e elegantes.',
    imageUrl: '/aplicacao_1.webp',
    images: ['/aplicacao_1.webp', '/molde-f1.webp', '/banho-de-gel.webp'],
    category: 'aplicacao',
    complements: [
      {
        id: 'comp-along-1',
        name: 'Francesinha / Reversa',
        description: 'Técnica clássica ou moderna com ponta branca ou colorida impecável',
        price: 30,
        durationMinutes: 20,
        images: ['/francesinha_1.jpg']
      },
      {
        id: 'comp-along-2',
        name: 'Nail Art Personalizada',
        description: 'Design exclusivo, pedrarias, folha de ouro ou traços artísticos',
        price: 25,
        durationMinutes: 20,
        images: ['/manutencao-decorada.webp']
      },
      {
        id: 'comp-along-3',
        name: 'Blindagem Extra com Top Coat',
        description: 'Camada reforçada para brilho espelhado prolongado e proteção',
        price: 20,
        durationMinutes: 15,
        images: ['/banho-de-gel.webp']
      }
    ]
  },
  { 
    id: '2', 
    name: 'Manutenção de Alongamento', 
    durationMinutes: 75, 
    price: 100, 
    description: 'Nivelamento, reforço do ponto de tensão e acabamento impecável.',
    imageUrl: '/manutencao_1.webp',
    images: ['/manutencao_1.webp', '/manutencao-esmaltacao.webp', '/manutencao-decorada.webp'],
    category: 'manutencao',
    complements: [
      {
        id: 'comp-manut-1',
        name: 'Reposição de Unha Quebrada',
        description: 'Reconstrução completa de unha que quebrou ou trincou',
        price: 15,
        durationMinutes: 15,
        images: ['/molde-f1.webp']
      },
      {
        id: 'comp-manut-2',
        name: 'Esmaltação em Gel na Manutenção',
        description: 'Aplicação de esmalte em gel sobre a manutenção com secagem em cabine',
        price: 35,
        durationMinutes: 25,
        images: ['/manutencao-esmaltacao.webp']
      },
      {
        id: 'comp-manut-3',
        name: 'Decoração Especial',
        description: 'Arte nas unhas para renovar o visual na manutenção',
        price: 25,
        durationMinutes: 20,
        images: ['/manutencao-decorada.webp']
      }
    ]
  },
  { 
    id: '3', 
    name: 'Esmaltação em Gel', 
    durationMinutes: 60, 
    price: 80, 
    description: 'Mais durabilidade, brilho intenso e secagem imediata por até 20 dias.',
    imageUrl: '/esmaltacao_em_gel_1.webp',
    images: ['/esmaltacao_em_gel_1.webp', '/esmaltacao-em-gel.webp'],
    category: 'outros',
    complements: [
      {
        id: 'comp-gel-1',
        name: 'Cutilagem Completa Alinhada',
        description: 'Cutilagem profissional profunda com acabamento contínuo',
        price: 20,
        durationMinutes: 15,
        images: ['/outros_servicos_1.webp']
      },
      {
        id: 'comp-gel-2',
        name: 'SPA das Mãos com Hidratação',
        description: 'Esfoliação e hidratação profunda para mãos sedosas e renovadas',
        price: 25,
        durationMinutes: 15,
        images: ['/espaco-atendimento.webp']
      },
      {
        id: 'comp-gel-3',
        name: 'Francesinha Delicada',
        description: 'Traço fino e delicado com esmalte em gel',
        price: 15,
        durationMinutes: 15,
        images: ['/francesinha_1.jpg']
      }
    ]
  },
  { 
    id: '4', 
    name: 'Manicure Tradicional', 
    durationMinutes: 45, 
    price: 60, 
    description: 'Cuidados essenciais, cutilagem alinhada e esmaltação perfeita.',
    imageUrl: '/outros_servicos_1.webp',
    images: ['/outros_servicos_1.webp', '/espaco-atendimento.webp', '/francesinha_1.jpg'],
    category: 'outros',
    complements: [
      {
        id: 'comp-mani-1',
        name: 'Esfoliação e Hidratação SPA',
        description: 'Tratamento com esfoliante e creme hidratante suave',
        price: 20,
        durationMinutes: 15,
        images: ['/espaco-atendimento.webp']
      },
      {
        id: 'comp-mani-2',
        name: 'Esmaltação Francesinha',
        description: 'Traço clássico com acabamento perfeito',
        price: 10,
        durationMinutes: 10,
        images: ['/francesinha_1.jpg']
      }
    ]
  },
  { 
    id: '5', 
    name: 'Nail Art Personalizada', 
    durationMinutes: 30, 
    price: 25, 
    description: 'Design exclusivo, traços finos e detalhes para unhas especiais.',
    imageUrl: '/manutencao-decorada.webp',
    images: ['/manutencao-decorada.webp', '/francesinha_1.jpg'],
    category: 'outros',
    complements: [
      {
        id: 'comp-art-1',
        name: 'Aplicação de Pedrarias e Joias',
        description: 'Pedrarias de alta fixação para ocasiões especiais',
        price: 15,
        durationMinutes: 15,
        images: ['/manutencao-decorada.webp']
      },
      {
        id: 'comp-art-2',
        name: 'Efeito Cromado / Holográfico',
        description: 'Pó cromado de alto impacto visual',
        price: 15,
        durationMinutes: 10,
        images: ['/esmaltacao-em-gel.webp']
      }
    ]
  },
];

const defaultConfig: Config = {
  address: 'R. Bico-de-Lacre, 32 - Porto Canoa, Serra - ES, 29168-330',
  whatsapp: '27996040206',
  instagram: 'gabrielanail.beauty',
  slotInterval: 15,
  workingHours: [
    { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '18:00', hasLunchBreak: false, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00', hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' },
    { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '14:00', hasLunchBreak: false, lunchStart: '12:00', lunchEnd: '13:00' },
  ],
};

/**
 * Garante que workingHours sempre tenha exatamente 7 dias (0 a 6),
 * completando com defaultConfig para qualquer dia ausente.
 * Ignora itens sem dayOfWeek numérico de 0 a 6.
 */
export const sanitizeWorkingHours = (inputHours?: any): WorkingDay[] => {
  const existingMap = new Map<number, any>();
  if (Array.isArray(inputHours)) {
    inputHours.forEach((w: any) => {
      if (typeof w?.dayOfWeek === 'number' && Number.isInteger(w.dayOfWeek) && w.dayOfWeek >= 0 && w.dayOfWeek <= 6) {
        existingMap.set(w.dayOfWeek, w);
      }
    });
  }

  return [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
    const existing = existingMap.get(dayOfWeek);
    const def = defaultConfig.workingHours[dayOfWeek];
    if (existing) {
      return {
        dayOfWeek,
        isOpen: typeof existing.isOpen === 'boolean' ? existing.isOpen : def.isOpen,
        openTime: existing.openTime || def.openTime,
        closeTime: existing.closeTime || def.closeTime,
        hasLunchBreak: typeof existing.hasLunchBreak === 'boolean' ? existing.hasLunchBreak : def.hasLunchBreak,
        lunchStart: existing.lunchStart || def.lunchStart || '12:00',
        lunchEnd: existing.lunchEnd || def.lunchEnd || '13:00',
      };
    }
    return { ...def };
  });
};

export const sanitizeConfig = (inputConfig?: any): Config => {
  const raw = (inputConfig && typeof inputConfig === 'object') ? inputConfig : {};
  return {
    ...raw,
    address: (!raw.address || raw.address.includes('Rua das Flores') || raw.address.includes('Atualize nas configurações'))
      ? defaultConfig.address
      : raw.address,
    whatsapp: raw.whatsapp || defaultConfig.whatsapp,
    instagram: raw.instagram || defaultConfig.instagram,
    slotInterval: typeof raw.slotInterval === 'number' && raw.slotInterval > 0 ? raw.slotInterval : defaultConfig.slotInterval,
    procedureIntervalMinutes: typeof raw.procedureIntervalMinutes === 'number' && raw.procedureIntervalMinutes >= 0 ? raw.procedureIntervalMinutes : defaultConfig.procedureIntervalMinutes,
    workingHours: sanitizeWorkingHours(raw.workingHours),
  };
};

export interface StoreContextType {
  services: Service[];
  setServices: (services: Service[]) => void;
  categories: ServiceCategory[];
  setCategories: (categories: ServiceCategory[]) => Promise<{ success: boolean; error?: string }>;
  addCategory: (cat: Omit<ServiceCategory, 'id'> & { id?: string }) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (id: string, updates: Partial<ServiceCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  appointments: Appointment[];
  setAppointments: (apps: Appointment[]) => void;
  refreshAppointments: () => Promise<void>;
  notifySlotsChanged: (date?: string) => void;
  blocks: Block[];
  addBlock: (block: Block) => Promise<AppointmentResult>;
  updateBlock: (id: string, updates: Partial<Block>) => Promise<AppointmentResult>;
  deleteBlock: (id: string) => Promise<AppointmentResult>;
  setBlocks: (blocks: Block[]) => void;
  config: Config;
  setConfig: (config: Config) => void;
  isAdminUser: boolean;
  adminCheckError: string | null;
  appointmentsError: string | null;
  catalogContent: CatalogContentMap;
  setCatalogContent: (c: CatalogContentMap) => Promise<{ success: boolean; error?: string }>;
  clientProfiles: Record<string, ClientProfile>;
  deletedClientPhones: string[];
  saveClientProfile: (phone: string, profile: Partial<ClientProfile>) => Promise<AppointmentResult>;
  registerNewClient: (client: {
    name: string;
    phone: string;
    avatarUrl?: string;
    serviceNames?: string;
    price?: number;
    date?: string;
    notes?: string;
    nailShape?: string;
  }) => Promise<AppointmentResult>;
  updateClient: (
    oldPhoneOrId: string,
    updatedData: {
      name: string;
      phone: string;
      avatarUrl?: string;
      nailShape?: string;
      preferences?: string;
      allergies?: string;
      notes?: string;
    },
    oldClientName?: string
  ) => Promise<AppointmentResult>;
  deleteClient: (phoneOrId: string, clientName?: string) => Promise<AppointmentResult>;
  addAppointment: (app: Appointment) => Promise<AppointmentResult>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<AppointmentResult>;
  cancelAppointment: (id: string) => Promise<AppointmentResult>;
  deleteAppointment: (id: string) => Promise<AppointmentResult>;
  addService: (service: Service) => Promise<{ success: boolean; error?: string }>;
  updateService: (id: string, updates: Partial<Service>) => Promise<{ success: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;
  reloadFromSupabase: () => Promise<{ success: boolean; message: string }>;
  reloadFromServer: () => Promise<void>;
  pullFromSupabase: (isSilent?: boolean) => Promise<{ success: boolean; message: string }>;
  hasPendingMigration: boolean;
  dataSource: 'nuvem' | 'cache';
  isSupabaseConfigured: boolean;
  isSupabaseConnected: boolean;
  supabaseStatus: 'connected' | 'table_missing' | 'error' | 'not_configured';
  supabaseErrorMessage: string | null;
  supabaseHost: string;
  lastSyncedAt: Date | null;
  lastLoadedAt: Date | null;
  appVersion: string;
  isSyncing: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};

// Higieniza e garante imagens padrão de alta qualidade para todos os procedimentos
const sanitizeServices = (loadedServices: Service[]): Service[] => {
  if (!Array.isArray(loadedServices) || loadedServices.length === 0) return defaultServices;

  return loadedServices.map(s => {
    const sName = (s.name || '').toLowerCase().trim();
    const sId = String(s.id || '');

    // 1. Busca exata primeiro (por id exato ou nome exato sem diferenciar maiúsculas)
    let def = defaultServices.find(d => 
      String(d.id) === sId || 
      d.name.toLowerCase().trim() === sName
    );

    // 2. Só se não achar por id/nome exato, busca por regras parciais, testando 'manuten' ANTES de 'alongamento'
    if (!def) {
      if (sName.includes('manuten')) {
        def = defaultServices.find(d => d.name.toLowerCase().trim().includes('manuten') || d.id === '2');
      } else if (sName.includes('alongamento')) {
        def = defaultServices.find(d => d.name.toLowerCase().trim().includes('alongamento') || d.id === '1');
      } else if (sName.includes('esmalta')) {
        def = defaultServices.find(d => d.name.toLowerCase().trim().includes('esmalta') || d.id === '3');
      } else if (sName.includes('manicure')) {
        def = defaultServices.find(d => d.name.toLowerCase().trim().includes('manicure') || d.id === '4');
      } else if (sName.includes('nail art')) {
        def = defaultServices.find(d => d.name.toLowerCase().trim().includes('nail art') || d.id === '5');
      }
    }

    const defaultImg = def?.imageUrl || getDefaultServiceImage(s);

    const normalizeImgPath = (imgPath: string | undefined): string => {
      if (!imgPath || typeof imgPath !== 'string' || imgPath.trim() === '') return defaultImg;
      if (imgPath.startsWith('data:image')) return imgPath; // Imagem em base64 customizada
      if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;

      // Normaliza caminhos antigos, nomes com acentos/espaços ou placeholders
      if (
        imgPath.includes('placeholder') ||
        imgPath === '/service_alongamento.jpg' ||
        imgPath === '/service_gel.jpg' ||
        imgPath === '/service_manicure.jpg' ||
        imgPath === '/service_nailart.jpg' ||
        imgPath === '/test_nails.jpg' ||
        imgPath === '/hero_nails.jpg'
      ) {
        return defaultImg;
      }
      if (imgPath.includes('Manutenções_1-1.webp') || imgPath.includes('manutencoes_1.webp') || imgPath.includes('Manutenções_1.jpg')) {
        return '/manutencao_1.webp';
      }
      if (imgPath.includes('Esmaltação em gel_1.webp') || imgPath.includes('Esmaltação em gel_1.jpg')) {
        return '/esmaltacao_em_gel_1.webp';
      }
      if (imgPath.includes('Outros serviços_1.webp') || imgPath.includes('Outros serviços_1.jpg')) {
        return '/outros_servicos_1.webp';
      }
      if (imgPath.includes('Aplicação_1.jpg') || imgPath.includes('Aplicação_1.png')) {
        return '/aplicacao_1.webp';
      }
      if (imgPath === '/gallery/nail_almond.jpg' || imgPath === '/gallery/nail_care.jpg' || imgPath === '/gallery/nail_french.jpg' || imgPath === '/gallery/nail_art_1.jpg' || imgPath === '/gallery/nail_art_2.jpg' || imgPath === '/gallery/nail_salon.jpg') {
        return defaultImg;
      }
      // Se um serviço não-aplicação vier com a imagem genérica /aplicacao_1.webp, atribui a imagem específica dele
      if (def && def.imageUrl !== '/aplicacao_1.webp' && imgPath === '/aplicacao_1.webp') {
        return def.imageUrl;
      }
      return imgPath;
    };

    // Prioriza imagens customizadas (base64 ou URL) enviadas pelo usuário
    let rawImages: string[] = [];
    if (Array.isArray(s.images) && s.images.length > 0) {
      rawImages = s.images;
    } else if (s.imageUrl && typeof s.imageUrl === 'string' && s.imageUrl.trim().length > 0) {
      rawImages = [s.imageUrl];
    } else {
      rawImages = def?.images || [defaultImg];
    }

    let images = rawImages
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
      .map(normalizeImgPath);

    if (def && def.imageUrl !== '/aplicacao_1.webp' && images.every(img => img === '/aplicacao_1.webp')) {
      images = def.images || [def.imageUrl];
    }

    if (images.length === 0) images = def?.images || [defaultImg];

    let finalImageUrl = (s.imageUrl && s.imageUrl.trim().length > 0)
      ? normalizeImgPath(s.imageUrl)
      : (images[0] || defaultImg);

    if (def && def.imageUrl !== '/aplicacao_1.webp' && finalImageUrl === '/aplicacao_1.webp' && !s.imageUrl?.startsWith('data:image')) {
      finalImageUrl = def.imageUrl;
    }
    if (!finalImageUrl) {
      finalImageUrl = images[0] || def?.imageUrl || defaultImg;
    }

    // Remove complementos de alongamento que possam ter entrado por engano na Manutenção
    const isManutencao = s.id === '2' || sName.includes('manuten');
    const alongamentoCompIds = ['comp-along-1', 'comp-along-2', 'comp-along-3'];

    let rawComplements: ComplementaryService[] = Array.isArray(s.complements)
      ? s.complements.filter(c => {
          if (isManutencao && alongamentoCompIds.includes(String(c?.id || ''))) {
            return false;
          }
          return true;
        })
      : [];

    if (isManutencao) {
      rawComplements = rawComplements.filter(c => !alongamentoCompIds.includes(String(c?.id || '')));
    }

    // Deduplica complementos por ID e Nome normalizado para garantir chaves estritamente únicas no React
    const seenCompIds = new Set<string>();
    const seenCompNames = new Set<string>();
    const complements: ComplementaryService[] = [];

    for (let i = 0; i < rawComplements.length; i++) {
      const c = rawComplements[i];
      if (!c || typeof c.name !== 'string' || !c.name.trim()) continue;
      
      const trimmedName = c.name.trim().toLowerCase();
      let compId = c.id ? String(c.id).trim() : '';

      // Se já houver complemento com o mesmo ID ou mesmo Nome neste serviço, ignora a duplicata
      if ((compId && seenCompIds.has(compId)) || seenCompNames.has(trimmedName)) {
        continue;
      }

      if (!compId) {
        compId = `comp-${s.id || 'serv'}-${i}-${Date.now()}`;
      }

      seenCompIds.add(compId);
      seenCompNames.add(trimmedName);

      complements.push({
        id: compId,
        name: c.name.trim(),
        description: (c.description || '').trim(),
        price: Number(c.price) || 0,
        durationMinutes: Number(c.durationMinutes) || 15,
        images: Array.isArray(c.images) && c.images.length > 0 ? c.images : []
      });
    }

    // Categoria consistente
    const validCategory = s.category && s.category !== 'cuidados' ? s.category : (def?.category || 'outros');

    return {
      ...s,
      category: validCategory,
      imageUrl: finalImageUrl,
      images,
      complements,
    };
  });
};

// Carrega o estado salvo no localStorage para não perder nada offline ou sem Supabase
const loadLocalState = () => {
  if (typeof window === 'undefined') {
    return {
      services: defaultServices,
      categories: defaultCategories,
      appointments: [] as Appointment[],
      blocks: [] as Block[],
      config: defaultConfig,
      clientProfiles: {} as Record<string, ClientProfile>,
      deletedClientPhones: [] as string[],
      catalogContent: defaultCatalogContent
    };
  }
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    let isMigration = false;
    if (!raw) {
      const prevRaw = localStorage.getItem(PREV_LOCAL_STORAGE_KEY) || localStorage.getItem('gabriela_beauty_store_state_v1');
      if (prevRaw) {
        raw = prevRaw;
        isMigration = true;
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      
      // Se for migração da versão anterior, usa defaultServices diretamente para garantir todos os complementos
      let rawServices = defaultServices;
      if (!isMigration && Array.isArray(parsed.services) && parsed.services.length > 0) {
        rawServices = sanitizeServices(parsed.services);
      }
      const loadedCategories: ServiceCategory[] = (!isMigration && Array.isArray(parsed.categories) && parsed.categories.length > 0 && parsed.categories.some((c: any) => c.id === 'esmaltacao' || c.id === 'aplicacao'))
        ? parsed.categories
        : defaultCategories;
      const loadedConfig = sanitizeConfig(parsed.config);
      const loadedCatalog = (parsed.catalogContent && typeof parsed.catalogContent === 'object')
        ? { ...defaultCatalogContent, ...parsed.catalogContent }
        : defaultCatalogContent;

      const sanitizedServs = sanitizeServices(rawServices);

      // Limpa dados de agendamentos e clientes sensíveis do cache local antigo
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          services: sanitizedServs,
          categories: loadedCategories,
          config: loadedConfig,
          catalogContent: loadedCatalog
        }));
      } catch {}

      return {
        services: sanitizedServs,
        categories: loadedCategories,
        appointments: [] as Appointment[],
        blocks: [] as Block[],
        config: loadedConfig,
        clientProfiles: {} as Record<string, ClientProfile>,
        deletedClientPhones: [] as string[],
        catalogContent: loadedCatalog
      };
    }
  } catch (e) {
    console.warn('Erro ao carregar do localStorage:', e);
  }
  return {
    services: defaultServices,
    categories: defaultCategories,
    appointments: [] as Appointment[],
    blocks: [] as Block[],
    config: defaultConfig,
    clientProfiles: {} as Record<string, ClientProfile>,
    deletedClientPhones: [] as string[],
    catalogContent: defaultCatalogContent
  };
};

export const StoreProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const APP_VERSION = 'v5.1.0-prod';
  const localInitial = loadLocalState();
  // 1. DADOS: serviços, complementos e fotos NÃO dependem de localStorage/IndexedDB.
  // Sempre inicializamos com os 5 procedimentos completos e sincronizamos imediatamente do backend.
  const [services, setServicesState] = useState<Service[]>(() => defaultServices);
  const [categories, setCategoriesState] = useState<ServiceCategory[]>(localInitial.categories || defaultCategories);
  const [appointments, setAppointmentsState] = useState<Appointment[]>(localInitial.appointments);
  const [blocks, setBlocksState] = useState<Block[]>(localInitial.blocks);
  const [config, setConfigState] = useState<Config>(localInitial.config);
  const [isAdminUser, setIsAdminUserState] = useState<boolean>(false);
  const [adminCheckError, setAdminCheckErrorState] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsErrorState] = useState<string | null>(null);
  const [clientProfiles, setClientProfilesState] = useState<Record<string, ClientProfile>>(localInitial.clientProfiles);
  const [deletedClientPhones, setDeletedClientPhonesState] = useState<string[]>(localInitial.deletedClientPhones || []);
  const [catalogContent, setCatalogContentState] = useState<CatalogContentMap>(localInitial.catalogContent || defaultCatalogContent);

  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'table_missing' | 'error' | 'not_configured'>('not_configured');
  const [supabaseErrorMessage, setSupabaseErrorMessage] = useState<string | null>(null);
  const [supabaseHost, setSupabaseHost] = useState<string>(() => {
    try {
      const cfg = getSupabaseConfig();
      return cfg.url ? new URL(cfg.url).host : 'Não configurado';
    } catch {
      return 'Não configurado';
    }
  });
  const [dataSource, setDataSource] = useState<'nuvem' | 'cache'>('cache');
  const [hasPendingMigration, setHasPendingMigration] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(() => new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Ref que mantém sempre o estado mais recente para evitar closures antigas (stale closures)
  const stateRef = useRef({
    services,
    categories,
    appointments,
    blocks,
    config,
    clientProfiles,
    deletedClientPhones,
    catalogContent
  });

  useEffect(() => {
    stateRef.current = {
      services,
      categories,
      appointments,
      blocks,
      config,
      clientProfiles,
      deletedClientPhones,
      catalogContent
    };
  }, [services, categories, appointments, blocks, config, clientProfiles, deletedClientPhones, catalogContent]);

  const isAdminUserRef = useRef(isAdminUser);
  useEffect(() => {
    isAdminUserRef.current = isAdminUser;
  }, [isAdminUser]);

  const notifySlotsChanged = useCallback((date?: string) => {
    if (realtimeSyncChannelRef.current) {
      try {
        realtimeSyncChannelRef.current.send({
          type: 'broadcast',
          event: 'SLOTS_CHANGED',
          payload: { date }
        });
      } catch {}
    }
  }, []);

  const refreshAppointments = useCallback(async () => {
    if (!isAdminUserRef.current) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: cloudAppointments, error: apptsErr } = await client
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (apptsErr) {
        setAppointmentsErrorState(formatSupabaseErrorMessage(apptsErr));
        return;
      }

      setAppointmentsErrorState(null);
      const loadedAppointments: Appointment[] = (cloudAppointments || []).map(mapAppointmentRow);
      setAppointmentsState(loadedAppointments);
    } catch (err: any) {
      setAppointmentsErrorState(formatSupabaseErrorMessage(err));
    }
  }, []);

  // Canais ativos mantidos abertos para sincronização imediata
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const realtimeSyncChannelRef = useRef<any>(null);
  const writeLockRef = useRef<number>(0);
  const pullFromSupabaseRef = useRef<((isSilent?: boolean) => Promise<{ success: boolean; message: string }>) | null>(null);

  // Dispara sincronização imediata (sub-50ms) entre todas as abas e todos os dispositivos conectados
  const broadcastStateChange = useCallback((payload: {
    services?: Service[];
    categories?: ServiceCategory[];
    catalogContent?: CatalogContentMap;
    appointments?: Appointment[];
    blocks?: Block[];
    config?: Config;
  }) => {
    // 1. Notifica via BroadcastChannel local (outras abas no mesmo aparelho - 0ms)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'STATE_UPDATED',
          payload,
          timestamp: Date.now()
        });
      } catch {}
    }

    // 2. Notifica via Supabase Realtime Broadcast (celulares das clientes e outros computadores - <50ms)
    if (realtimeSyncChannelRef.current) {
      try {
        realtimeSyncChannelRef.current.send({
          type: 'broadcast',
          event: 'SYNC_UPDATE',
          payload: {
            ...payload,
            timestamp: Date.now()
          }
        });
      } catch {}
    }

    // 3. Evento nativo de janela (para componentes da mesma aba)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('GABI_STATE_CHANGE', { detail: payload }));
      } catch {}
    }
  }, []);

  // Salva no localStorage imediatamente para garantir persistência offline e resiliente
  const saveToLocalStorage = useCallback((
    s: Service[], 
    c: Config,
    cats?: ServiceCategory[],
    cc?: CatalogContentMap
  ) => {
    if (typeof window === 'undefined') return;
    try {
      const current = stateRef.current;
      const currentComplementsCount = (current.services || []).reduce((acc, sv) => acc + (sv.complements?.length || 0), 0);
      const incomingComplementsCount = (s || []).reduce((acc, sv) => acc + (sv.complements?.length || 0), 0);
      let safeServices = s;
      if (incomingComplementsCount < currentComplementsCount && currentComplementsCount > 0) {
        safeServices = s.map(serv => {
          if (!serv.complements || serv.complements.length === 0) {
            const match = current.services.find(ls => ls.id === serv.id || (ls.name && serv.name && ls.name.trim().toLowerCase() === serv.name.trim().toLowerCase()));
            if (match?.complements && match.complements.length > 0) {
              return {
                ...serv,
                complements: match.complements,
                images: (serv.images?.length || 0) < (match.images?.length || 0) ? match.images : serv.images
              };
            }
          }
          return serv;
        });
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        services: safeServices, 
        categories: cats !== undefined ? cats : current.categories,
        config: c,
        catalogContent: cc !== undefined ? cc : current.catalogContent
      }));
    } catch (e) {
      console.warn('Falha ao salvar no localStorage:', e);
    }
  }, []);

  // Função centralizada para enviar config/categorias/catalogContent para o Supabase
  const pushToSupabase = useCallback(async (
    s: Service[], 
    c: Config,
    cats?: ServiceCategory[],
    cc?: CatalogContentMap
  ) => {
    const current = stateRef.current;
    const finalCategories = cats !== undefined ? cats : current.categories;
    const finalCatalog = cc !== undefined ? cc : current.catalogContent;

    const payload = { 
      categories: finalCategories,
      config: c, 
      catalogContent: finalCatalog
    };

    const client = getSupabaseClient();
    if (!client) {
      setIsSupabaseConfigured(false);
      setIsSupabaseConnected(false);
      setSupabaseStatus('not_configured');
      return { success: true, message: 'Dados salvos no servidor local com sucesso!' };
    }

    setIsSupabaseConfigured(true);
    setIsSyncing(true);
    writeLockRef.current += 1;
    let pushSuccess = false;

    try {
      const { error } = await client.from('app_state').upsert({
        id: 1,
        data: payload,
      });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST125' || error.message?.includes('does not exist')) {
          setSupabaseStatus('table_missing');
          setIsSupabaseConnected(false);
          return {
            success: false,
            message: 'Tabela "app_state" não encontrada no Supabase.',
          };
        }
        setSupabaseStatus('error');
        setIsSupabaseConnected(false);
        return { success: false, message: `Erro ao salvar no Supabase: ${error.message}` };
      }

      setSupabaseStatus('connected');
      setIsSupabaseConnected(true);
      setLastSyncedAt(new Date());

      broadcastStateChange({
        categories: finalCategories,
        catalogContent: finalCatalog,
        config: c
      });

      pushSuccess = true;
      return { success: true, message: 'Dados sincronizados com o Supabase com sucesso!' };
    } catch (err: any) {
      setSupabaseStatus('error');
      setIsSupabaseConnected(false);
      return { success: false, message: `Erro de rede no Supabase: ${err?.message || 'Falha de conexão'}` };
    } finally {
      writeLockRef.current = Math.max(0, writeLockRef.current - 1);
      setIsSyncing(false);
      if (writeLockRef.current === 0) {
        pullFromSupabaseRef.current?.(true);
      }
    }
  }, [broadcastStateChange]);

  // Carrega do Supabase
  const pullFromSupabase = useCallback(async (isSilent = false) => {
    if (writeLockRef.current > 0) {
      return { success: true, message: 'ignorado' };
    }
    const client = getSupabaseClient();
    if (!client) {
      const err = 'Supabase não configurado: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.';
      console.warn('[Supabase Config]', err);
      setIsSupabaseConfigured(false);
      setIsSupabaseConnected(false);
      setSupabaseStatus('not_configured');
      setSupabaseErrorMessage(err);
      setDataSource('cache');
      return { success: false, message: err };
    }

    setIsSupabaseConfigured(true);
    if (!isSilent) {
      setIsSyncing(true);
    }

    try {
      // 0. Identifica sessão e se é usuária admin na tabela admins
      const { data: { session } } = await client.auth.getSession();
      let isAdmin = false;
      setAdminCheckErrorState(null);
      setAppointmentsErrorState(null);

      if (session?.user?.id) {
        const { data: adminRow, error: adminErr } = await client
          .from('admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (adminErr) {
          console.warn('[Admin Check]', formatSupabaseErrorMessage(adminErr));
          setAdminCheckErrorState(formatSupabaseErrorMessage(adminErr));
          isAdmin = false;
        } else {
          isAdmin = Boolean(adminRow);
        }
      }
      setIsAdminUserState(isAdmin);

      // 1. O Catálogo é lido estritamente da tabela 'services'
      const { data: cloudServices, error: servErr } = await client.from('services').select('*');

      if (servErr) {
        const formattedErr = formatSupabaseErrorMessage(servErr);
        console.warn('[Supabase Sync Aviso] Falha ao consultar tabela services:', formattedErr);
        setSupabaseStatus('error');
        setSupabaseErrorMessage(formattedErr);
        setIsSupabaseConnected(false);
        setDataSource('cache');
        return { success: false, message: formattedErr };
      }

      let activeServices = stateRef.current.services;
      if (cloudServices && Array.isArray(cloudServices) && cloudServices.length > 0) {
        const loadedServices: Service[] = cloudServices.map((r: any) => {
          const cloudAddons: ComplementaryService[] = Array.isArray(r.addons)
            ? r.addons
            : Array.isArray(r.complements)
              ? r.complements
              : [];
          const cloudImgs: string[] = Array.isArray(r.images) && r.images.length > 0
            ? r.images
            : (r.image_url ? [r.image_url] : []);

          return {
            id: String(r.id),
            name: r.name || '',
            durationMinutes: Number(r.duration_minutes) || 60,
            price: Number(r.price) || 0,
            description: r.description || '',
            category: r.category || 'outros',
            images: cloudImgs,
            imageUrl: cloudImgs[0] || r.image_url || undefined,
            complements: cloudAddons
          };
        });

        activeServices = sanitizeServices(loadedServices);
        setServicesState(activeServices);
      }

      // 2. Consulta configurações e catálogo do app_state
      const { data } = await client.from('app_state').select('data').eq('id', 1).single();
      const current = stateRef.current;
      let newConfig = current.config;
      let newCategories = current.categories;
      let newCatalog = current.catalogContent;

      if (data && data.data) {
        const state = data.data;
        newCategories = Array.isArray(state.categories) && state.categories.length > 0
          ? state.categories
          : (current.categories && current.categories.length > 0 ? current.categories : defaultCategories);
        newConfig = sanitizeConfig(state.config || current.config);

        newCatalog = (state.catalogContent && typeof state.catalogContent === 'object')
          ? { ...defaultCatalogContent, ...state.catalogContent }
          : current.catalogContent;

        setCategoriesState(newCategories);
        setConfigState(newConfig);
        setCatalogContentState(newCatalog);
      }

      // 3. Bloqueios de agenda (leitura pública para cálculo da grade)
      const { data: cloudBlocks } = await client.from('schedule_blocks').select('*');
      const loadedBlocks: Block[] = (cloudBlocks || []).map((b: any) => ({
        id: String(b.id),
        date: b.date,
        isFullDay: Boolean(b.is_full_day),
        startTime: b.start_time || undefined,
        endTime: b.end_time || undefined,
        reason: b.reason || undefined
      }));
      setBlocksState(loadedBlocks);

      // 4. Carrega appointments e clients da nuvem (sempre)
      const { data: cloudAppointments, error: apptsErr } = await client
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (apptsErr) {
        setAppointmentsErrorState(formatSupabaseErrorMessage(apptsErr));
      }

      const loadedAppointments: Appointment[] = (cloudAppointments || []).map(mapAppointmentRow);
      setAppointmentsState(loadedAppointments);

      const { data: cloudClients } = await client.from('clients').select('*');
      const loadedProfiles: Record<string, ClientProfile> = {};
      (cloudClients || []).forEach((c: any) => {
        if (c.phone) {
          loadedProfiles[c.phone] = {
            name: c.name || '',
            phone: c.phone,
            avatarUrl: c.avatar_url || undefined,
            nailShape: c.nail_shape || undefined,
            preferences: c.preferences || undefined,
            allergies: c.allergies || undefined,
            notes: c.notes || undefined,
            updatedAt: c.updated_at || c.created_at
          };
        }
      });
      setClientProfilesState(loadedProfiles);

      // Salva no localStorage como cache offline
      saveToLocalStorage(activeServices, newConfig, newCategories, newCatalog);

      setSupabaseStatus('connected');
      setIsSupabaseConnected(true);
      setDataSource('nuvem');
      setLastSyncedAt(new Date());
      return { success: true, message: 'Dados carregados da nuvem com sucesso!' };
    } catch (err: any) {
      console.warn('[Supabase Sync Falha]', formatSupabaseErrorMessage(err));
      const formatted = formatSupabaseErrorMessage(err);
      setSupabaseStatus('error');
      setSupabaseErrorMessage(formatted);
      setIsSupabaseConnected(false);
      setDataSource('cache');
      return { success: false, message: formatted };
    } finally {
      if (!isSilent) {
        setIsSyncing(false);
      }
    }
  }, [saveToLocalStorage]);

  pullFromSupabaseRef.current = pullFromSupabase;

  // Atualização periódica leve da agenda para admin enquanto aba estiver visível
  useEffect(() => {
    if (!isAdminUser) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAppointments();
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [isAdminUser, refreshAppointments]);

  // Inicialização e escuta Realtime Ultrarrápida / Sincronização Automática
  useEffect(() => {
    let isMounted = true;
    let realtimeChannel: any = null;
    let adminRealtimeChannel: any = null;
    let realtimeSyncChannel: any = null;
    let broadcastChannel: BroadcastChannel | null = null;
    const client = getSupabaseClient();

    // 1. BroadcastChannel para comunicação instantânea entre abas no mesmo aparelho (0ms)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel('gabi_app_state_broadcast');
        broadcastChannelRef.current = broadcastChannel;
        broadcastChannel.onmessage = () => {
          pullFromSupabase(true);
        };
      } catch {}
    }

    // 2. Escuta evento nativo de Storage do navegador
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        pullFromSupabase(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 2.1 Escuta evento customizado de janela local
    const handleCustomChange = () => {
      pullFromSupabase(true);
    };
    window.addEventListener('GABI_STATE_CHANGE', handleCustomChange);

    const handleSlotsChanged = () => {
      refreshAppointments();
    };
    window.addEventListener('GABI_SLOTS_CHANGED', handleSlotsChanged);

    const removeAdminRealtime = () => {
      if (adminRealtimeChannel && client) {
        try {
          client.removeChannel(adminRealtimeChannel);
        } catch {}
        adminRealtimeChannel = null;
      }
    };

    const setupAdminRealtime = async () => {
      if (adminRealtimeChannel || !client) {
        return;
      }
      const { data: { session } } = await client.auth.getSession();
      if (session?.user?.id) {
        const { data: adminRow } = await client
          .from('admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (adminRow && isMounted && !adminRealtimeChannel) {
          try {
            adminRealtimeChannel = client
              .channel('pwa_admin_db')
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointments' },
                () => refreshAppointments()
              )
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'clients' },
                () => pullFromSupabase(true)
              )
              .subscribe();
          } catch (adminRtErr) {
            console.warn('[PWA Realtime] Falha ao assinar canal admin:', adminRtErr);
          }
        }
      }
    };

    // 3. Inicialização e canais do Supabase
    const init = async () => {
      if (client) {
        setIsSupabaseConfigured(true);
        setSupabaseErrorMessage(null);
        try { setSupabaseHost(new URL(getSupabaseConfig().url).host); } catch {}
        
        pullFromSupabase(false).then((res) => {
          if (!isMounted) return;
          if (res?.success) {
            setIsSupabaseConnected(true);
            setSupabaseStatus('connected');
            setSupabaseErrorMessage(null);
          } else if (res?.message) {
            setSupabaseErrorMessage(res.message);
          }
        });

        // 3.1 Canal Supabase Realtime Broadcast
        try {
          realtimeSyncChannel = client.channel('gabi_realtime_sync', {
            config: { broadcast: { self: false } }
          });

          realtimeSyncChannel
            .on('broadcast', { event: 'SYNC_UPDATE' }, () => {
              pullFromSupabase(true);
            })
            .on('broadcast', { event: 'SLOTS_CHANGED' }, (payload: any) => {
              if (typeof window !== 'undefined') {
                try {
                  window.dispatchEvent(new CustomEvent('GABI_SLOTS_CHANGED', { detail: payload }));
                } catch {}
              }
            })
            .subscribe();

          realtimeSyncChannelRef.current = realtimeSyncChannel;
        } catch (syncErr) {
          console.warn('[PWA Realtime Broadcast] Falha ao assinar broadcast:', syncErr);
        }

        // 3.2 Assinatura pública: services, schedule_blocks, app_state
        try {
          realtimeChannel = client
            .channel('pwa_public_db')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'services' },
              () => pullFromSupabase(true)
            )
              .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'schedule_blocks' },
              () => pullFromSupabase(true)
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'app_state' },
              () => pullFromSupabase(true)
            )
            .subscribe();
        } catch (rtErr) {
          console.warn('[PWA Realtime] Falha ao assinar canal realtime público:', rtErr);
        }

        // 3.3 Assinatura restrita para admin: appointments, clients
        setupAdminRealtime();
      } else {
        const errorMsg = 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.';
        setIsSupabaseConfigured(false);
        setIsSupabaseConnected(false);
        setSupabaseStatus('not_configured');
        setSupabaseErrorMessage(errorMsg);
      }

      if (isMounted) {
        setIsInitialized(true);
      }
    };

    init();

    // 3.4 Recarregamento imediato em login / logout
    let authSub: any = null;
    if (client) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
          if (event === 'SIGNED_OUT' || !session) {
            removeAdminRealtime();
          } else if (event === 'SIGNED_IN' || session) {
            setupAdminRealtime();
          }
          pullFromSupabase(true);
        }, 0);
      });
      authSub = data?.subscription;
    }

    const handleReengagement = () => {
      if (navigator.onLine) {
        pullFromSupabase(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReengagement();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => {
      handleReengagement();
    };
    window.addEventListener('focus', handleFocus);

    const handlePageShow = () => {
      handleReengagement();
    };
    window.addEventListener('pageshow', handlePageShow);

    const handleOnline = () => {
      handleReengagement();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('GABI_STATE_CHANGE', handleCustomChange);
      window.removeEventListener('GABI_SLOTS_CHANGED', handleSlotsChanged);
      if (authSub) authSub.unsubscribe();
      if (broadcastChannel) broadcastChannel.close();
      broadcastChannelRef.current = null;
      if (realtimeSyncChannel && client) {
        try { client.removeChannel(realtimeSyncChannel); } catch {}
        realtimeSyncChannelRef.current = null;
      }
      if (realtimeChannel && client) {
        try { client.removeChannel(realtimeChannel); } catch {}
      }
      removeAdminRealtime();
    };
  }, [pullFromSupabase, refreshAppointments]);

  // Gerenciamento de agendamentos com gravação direta no Supabase
  const addAppointment = async (app: Appointment): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const cleanPhone = cleanPhoneNumber(app.clientPhone);
    const newId = app.id || crypto.randomUUID();
    const { error } = await client.from('appointments').insert({
      id: newId,
      service_id: app.serviceId,
      service_names: app.serviceNames,
      date: app.date,
      start_time: app.startTime,
      end_time: app.endTime,
      client_name: app.clientName.trim(),
      client_phone: cleanPhone,
      status: app.status || 'pending',
      price: app.price,
      notes: app.notes || null,
      reminder_sent: app.reminderSent || false
    });

    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const created: Appointment = {
      ...app,
      id: newId,
      clientPhone: cleanPhone
    };
    setAppointmentsState(prev => [created, ...prev.filter(a => a.id !== newId)]);
    broadcastStateChange({ appointments: [created, ...stateRef.current.appointments.filter(a => a.id !== newId)] });
    notifySlotsChanged(app.date);
    return { success: true };
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const existing = stateRef.current.appointments.find(a => a.id === id);
    const targetDate = updates.date || existing?.date;
    const dbUpdates: Record<string, any> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName.trim();
    if (updates.clientPhone !== undefined) dbUpdates.client_phone = cleanPhoneNumber(updates.clientPhone);
    if (updates.serviceNames !== undefined) dbUpdates.service_names = updates.serviceNames;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.reminderSent !== undefined) dbUpdates.reminder_sent = updates.reminderSent;

    const { error } = await client.from('appointments').update(dbUpdates).eq('id', id);
    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const updated = stateRef.current.appointments.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...updates,
          clientPhone: updates.clientPhone !== undefined ? cleanPhoneNumber(updates.clientPhone) : a.clientPhone
        };
      }
      return a;
    });
    setAppointmentsState(updated);
    broadcastStateChange({ appointments: updated });
    notifySlotsChanged(targetDate);
    return { success: true };
  };

  const cancelAppointment = async (id: string): Promise<AppointmentResult> => {
    return updateAppointment(id, { status: 'cancelled' });
  };

  const deleteAppointment = async (id: string): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const targetDate = stateRef.current.appointments.find(a => a.id === id)?.date;
    const { error } = await client.from('appointments').delete().eq('id', id);
    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const updated = stateRef.current.appointments.filter(a => a.id !== id);
    setAppointmentsState(updated);
    broadcastStateChange({ appointments: updated });
    notifySlotsChanged(targetDate);
    return { success: true };
  };

  // Gerenciamento de bloqueios de agenda
  const addBlock = async (b: Block): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const newId = b.id || crypto.randomUUID();
    const { error } = await client.from('schedule_blocks').insert({
      id: newId,
      date: b.date,
      is_full_day: b.isFullDay,
      start_time: b.startTime || null,
      end_time: b.endTime || null,
      reason: b.reason || null
    });

    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const created: Block = { ...b, id: newId };
    const updated = [...stateRef.current.blocks.filter(x => x.id !== newId), created];
    setBlocksState(updated);
    broadcastStateChange({ blocks: updated });
    notifySlotsChanged(b.date);
    return { success: true };
  };

  const updateBlock = async (id: string, updates: Partial<Block>): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const existing = stateRef.current.blocks.find(b => b.id === id);
    const targetDate = updates.date || existing?.date;
    const dbUpdates: Record<string, any> = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.isFullDay !== undefined) dbUpdates.is_full_day = updates.isFullDay;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime || null;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime || null;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason || null;

    const { error } = await client.from('schedule_blocks').update(dbUpdates).eq('id', id);
    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const updated = stateRef.current.blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    setBlocksState(updated);
    broadcastStateChange({ blocks: updated });
    notifySlotsChanged(targetDate);
    return { success: true };
  };

  const deleteBlock = async (id: string): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const targetDate = stateRef.current.blocks.find(b => b.id === id)?.date;
    const { error } = await client.from('schedule_blocks').delete().eq('id', id);
    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    const updated = stateRef.current.blocks.filter(b => b.id !== id);
    setBlocksState(updated);
    broadcastStateChange({ blocks: updated });
    notifySlotsChanged(targetDate);
    return { success: true };
  };

  const setBlocks = (b: Block[]) => {
    setBlocksState(b);
  };

  // Funções para Gerenciamento de Clientes (tabela clients)
  const saveClientProfile = async (phone: string, profile: Partial<ClientProfile>): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) return { success: false, error: 'Telefone inválido' };

    const { data: existing } = await client.from('clients').select('*').eq('phone', cleanPhone).maybeSingle();
    const payload: Record<string, any> = {
      id: existing?.id || cleanPhone || crypto.randomUUID(),
      phone: cleanPhone,
      name: profile.name !== undefined ? profile.name.trim() : (existing?.name || ''),
      updated_at: new Date().toISOString()
    };
    if (profile.avatarUrl !== undefined) payload.avatar_url = profile.avatarUrl;
    if (profile.nailShape !== undefined) payload.nail_shape = profile.nailShape;
    if (profile.preferences !== undefined) payload.preferences = profile.preferences;
    if (profile.allergies !== undefined) payload.allergies = profile.allergies;
    if (profile.notes !== undefined) payload.notes = profile.notes;

    const { error } = await client.from('clients').upsert(payload, { onConflict: 'phone' });
    if (error) {
      const msg = formatSupabaseErrorMessage(error);
      return { success: false, error: msg };
    }

    setClientProfilesState(prev => ({
      ...prev,
      [cleanPhone]: {
        ...(prev[cleanPhone] || {}),
        ...profile,
        phone: cleanPhone,
        name: payload.name
      }
    }));
    return { success: true };
  };

  const registerNewClient = async (clientData: {
    name: string;
    phone: string;
    avatarUrl?: string;
    serviceNames?: string;
    price?: number;
    date?: string;
    notes?: string;
    nailShape?: string;
  }): Promise<AppointmentResult> => {
    const saveRes = await saveClientProfile(clientData.phone, {
      name: clientData.name,
      phone: clientData.phone,
      avatarUrl: clientData.avatarUrl,
      nailShape: clientData.nailShape,
      notes: clientData.notes
    });

    if (!saveRes.success) return saveRes;

    if (clientData.serviceNames && clientData.price) {
      const appRes = await addAppointment({
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        serviceId: 'custom',
        serviceNames: clientData.serviceNames,
        date: clientData.date || new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        clientName: clientData.name.trim(),
        clientPhone: clientData.phone.trim(),
        status: 'completed',
        price: clientData.price,
        notes: clientData.notes
      });
      if (!appRes.success) return appRes;
    }

    return { success: true };
  };

  const updateClient = async (
    oldPhoneOrId: string,
    updatedData: {
      name: string;
      phone: string;
      avatarUrl?: string;
      nailShape?: string;
      preferences?: string;
      allergies?: string;
      notes?: string;
    },
    oldClientName?: string
  ): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const cleanOldPhone = cleanPhoneNumber(oldPhoneOrId);
    const cleanNewPhone = cleanPhoneNumber(updatedData.phone);
    if (!cleanNewPhone) return { success: false, error: 'Novo telefone inválido' };

    // 1. Upsert do novo registro mesclando campos definidos
    const saveRes = await saveClientProfile(cleanNewPhone, {
      name: updatedData.name,
      phone: cleanNewPhone,
      avatarUrl: updatedData.avatarUrl,
      nailShape: updatedData.nailShape,
      preferences: updatedData.preferences,
      allergies: updatedData.allergies,
      notes: updatedData.notes
    });

    if (!saveRes.success) return saveRes;

    // 2. Se o telefone mudou, apaga o registro antigo em clients
    if (cleanOldPhone && cleanOldPhone !== cleanNewPhone) {
      await client.from('clients').delete().eq('phone', cleanOldPhone);
      await client.from('clients').delete().eq('id', oldPhoneOrId);

      setClientProfilesState(prev => {
        const next = { ...prev };
        delete next[oldPhoneOrId];
        delete next[cleanOldPhone];
        return next;
      });
    }

    // 3. Atualiza agendamentos em appointments com o novo nome e novo telefone
    const { error: apptError } = await client.from('appointments')
      .update({
        client_name: updatedData.name.trim(),
        client_phone: cleanNewPhone
      })
      .or(`client_phone.eq.${cleanOldPhone || oldPhoneOrId},client_phone.eq.${oldPhoneOrId}`);

    if (apptError) {
      console.warn('[updateClient] Falha ao atualizar appointments vinculados:', apptError);
    }

    const oldNameNorm = oldClientName ? oldClientName.trim().toLowerCase() : '';
    setAppointmentsState(prev => prev.map(a => {
      const aClean = cleanPhoneNumber(a.clientPhone);
      const aNameNorm = a.clientName ? a.clientName.trim().toLowerCase() : '';
      const matchPhone = a.clientPhone === oldPhoneOrId || (cleanOldPhone && aClean === cleanOldPhone);
      const matchName = oldNameNorm && aNameNorm === oldNameNorm;
      if (matchPhone || matchName) {
        return {
          ...a,
          clientName: updatedData.name.trim(),
          clientPhone: cleanNewPhone
        };
      }
      return a;
    }));

    return { success: true };
  };

  const deleteClient = async (phoneOrId: string, clientName?: string): Promise<AppointmentResult> => {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não conectado' };

    const cleanPhone = cleanPhoneNumber(phoneOrId);

    // 1. Apaga de clients
    const { error: delErr } = await client.from('clients').delete().or(`phone.eq.${cleanPhone || phoneOrId},id.eq.${phoneOrId}`);
    if (delErr) {
      return { success: false, error: formatSupabaseErrorMessage(delErr) };
    }

    // 2. Apaga agendamentos da cliente
    await client.from('appointments').delete().or(`client_phone.eq.${cleanPhone || phoneOrId},client_phone.eq.${phoneOrId}`);

    // 3. Atualiza estado local
    setClientProfilesState(prev => {
      const next = { ...prev };
      delete next[phoneOrId];
      if (cleanPhone) delete next[cleanPhone];
      return next;
    });

    const cleanName = clientName ? clientName.trim().toLowerCase() : '';
    setAppointmentsState(prev => prev.filter(a => {
      const aClean = cleanPhoneNumber(a.clientPhone);
      const matchPhone = a.clientPhone === phoneOrId || (cleanPhone && aClean === cleanPhone);
      const matchName = cleanName && a.clientName && a.clientName.trim().toLowerCase() === cleanName;
      return !matchPhone && !matchName;
    }));

    return { success: true };
  };

  // Gerenciamento de serviços ultrarrápido com sincronização imediata
  const addService = async (service: Service): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConnected) {
      const msg = 'Operação bloqueada: O Supabase está offline. Conecte-se ao Supabase para criar novos procedimentos.';
      return { success: false, error: msg };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase não inicializado.' };
    }

    const sanitized = sanitizeServices([service])[0];
    const imagesPayload = Array.isArray(sanitized.images) && sanitized.images.length > 0 
      ? sanitized.images 
      : (sanitized.imageUrl ? [sanitized.imageUrl] : []);
    const addonsPayload = sanitized.complements || [];

    const { error } = await client.from('services').upsert({
      id: sanitized.id,
      name: sanitized.name,
      duration_minutes: sanitized.durationMinutes,
      price: sanitized.price,
      description: sanitized.description || '',
      category: sanitized.category || 'outros',
      addons: addonsPayload,
      images: imagesPayload,
      image_url: sanitized.imageUrl || null
    }, { onConflict: 'id' });

    if (error) {
      const formatted = formatSupabaseErrorMessage(error);
      return { success: false, error: formatted };
    }

    const current = stateRef.current;
    const updated = [...current.services.filter(s => s.id !== sanitized.id), sanitized];
    setServicesState(updated);
    saveToLocalStorage(updated, current.config, current.categories, current.catalogContent);
    broadcastStateChange({ services: updated });
    pushToSupabase(updated, current.config, current.categories, current.catalogContent);

    return { success: true };
  };

  const updateService = async (id: string, updates: Partial<Service>): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConnected) {
      const msg = 'Operação bloqueada: O Supabase está offline. Conecte-se ao Supabase para alterar procedimentos.';
      return { success: false, error: msg };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase não inicializado.' };
    }

    const current = stateRef.current;
    const existing = current.services.find(s => s.id === id);
    if (!existing) {
      return { success: false, error: 'Procedimento não encontrado.' };
    }

    const merged = sanitizeServices([{ ...existing, ...updates }])[0];
    const imagesPayload = Array.isArray(merged.images) && merged.images.length > 0 
      ? merged.images 
      : (merged.imageUrl ? [merged.imageUrl] : []);
    const addonsPayload = merged.complements || [];

    const { error } = await client.from('services').upsert({
      id: merged.id,
      name: merged.name,
      duration_minutes: merged.durationMinutes,
      price: merged.price,
      description: merged.description || '',
      category: merged.category || 'outros',
      addons: addonsPayload,
      images: imagesPayload,
      image_url: merged.imageUrl || null
    }, { onConflict: 'id' });

    if (error) {
      const formatted = formatSupabaseErrorMessage(error);
      return { success: false, error: formatted };
    }

    const updated = current.services.map(s => s.id === id ? merged : s);
    setServicesState(updated);
    saveToLocalStorage(updated, current.config, current.categories, current.catalogContent);
    broadcastStateChange({ services: updated });
    pushToSupabase(updated, current.config, current.categories, current.catalogContent);

    return { success: true };
  };

  const deleteService = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConnected) {
      const msg = 'Operação bloqueada: O Supabase está offline. Conecte-se ao Supabase para excluir procedimentos.';
      return { success: false, error: msg };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase não inicializado.' };
    }

    const { error } = await client.from('services').delete().eq('id', id);

    if (error) {
      const formatted = formatSupabaseErrorMessage(error);
      return { success: false, error: formatted };
    }

    const current = stateRef.current;
    const updated = current.services.filter(s => s.id !== id);
    setServicesState(updated);
    saveToLocalStorage(updated, current.config, current.categories, current.catalogContent);
    broadcastStateChange({ services: updated });
    pushToSupabase(updated, current.config, current.categories, current.catalogContent);

    return { success: true };
  };

  const setServices = (s: Service[]) => {
    const sanitized = sanitizeServices(s);
    const current = stateRef.current;
    setServicesState(sanitized);
    saveToLocalStorage(sanitized, current.config, current.categories, current.catalogContent);
    broadcastStateChange({ services: sanitized });
    pushToSupabase(sanitized, current.config, current.categories, current.catalogContent);
  };

  const setAppointments = (a: Appointment[]) => {
    setAppointmentsState(a);
    broadcastStateChange({ appointments: a });
  };

  const setConfig = (c: Config) => {
    const sanitized = sanitizeConfig(c);
    const current = stateRef.current;
    setConfigState(sanitized);
    saveToLocalStorage(current.services, sanitized, current.categories, current.catalogContent);
    broadcastStateChange({ config: sanitized });
    pushToSupabase(current.services, sanitized, current.categories, current.catalogContent);

    const client = getSupabaseClient();
    if (client) {
      client.from('app_config').upsert({
        id: 1,
        whatsapp: sanitized.whatsapp,
        instagram: sanitized.instagram,
        address: sanitized.address,
        working_hours: sanitized.workingHours,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).then(() => {});
    }
  };

  const addCategory = async (cat: Omit<ServiceCategory, 'id'> & { id?: string }): Promise<{ success: boolean; error?: string }> => {
    const rawLabel = cat.label.trim();
    if (!rawLabel) return { success: false, error: 'Nome da categoria inválido' };
    const cleanId = cat.id?.trim() || `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newCat: ServiceCategory = {
      id: cleanId,
      label: rawLabel,
      description: cat.description ? cat.description.trim() : undefined,
    };
    const current = stateRef.current;
    const updated = [...current.categories, newCat];

    const pushRes = await pushToSupabase(current.services, current.config, updated, current.catalogContent);
    if (!pushRes.success) {
      return { success: false, error: pushRes.message };
    }

    setCategoriesState(updated);
    saveToLocalStorage(current.services, current.config, updated, current.catalogContent);
    broadcastStateChange({ categories: updated });
    return { success: true };
  };

  const updateCategory = async (id: string, updates: Partial<ServiceCategory>): Promise<{ success: boolean; error?: string }> => {
    const current = stateRef.current;
    const updated = current.categories.map(c => (c.id === id ? { ...c, ...updates, label: updates.label !== undefined ? updates.label.trim() : c.label } : c));

    const pushRes = await pushToSupabase(current.services, current.config, updated, current.catalogContent);
    if (!pushRes.success) {
      return { success: false, error: pushRes.message };
    }

    setCategoriesState(updated);
    saveToLocalStorage(current.services, current.config, updated, current.catalogContent);
    broadcastStateChange({ categories: updated });
    return { success: true };
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const current = stateRef.current;
    if (current.categories.length <= 1) {
      return { success: false, error: 'É necessário manter pelo menos uma categoria cadastrada.' };
    }

    const updated = current.categories.filter(c => c.id !== id);
    const fallbackCat = updated[0]?.id || 'outros';
    const updatedServices = current.services.map(s => (s.category === id ? { ...s, category: fallbackCat } : s));

    const affectedServices = current.services.filter(s => s.category === id);
    const client = getSupabaseClient();
    if (client && affectedServices.length > 0) {
      const { error: updErr } = await client
        .from('services')
        .update({ category: fallbackCat })
        .in('id', affectedServices.map(s => s.id));

      if (updErr) {
        const errMsg = `Erro ao reatribuir serviços: ${updErr.message}`;
        console.error(errMsg);
        return { success: false, error: errMsg };
      }
    }

    const pushRes = await pushToSupabase(updatedServices, current.config, updated, current.catalogContent);
    if (!pushRes.success) {
      return { success: false, error: pushRes.message };
    }

    setServicesState(updatedServices);
    setCategoriesState(updated);
    saveToLocalStorage(updatedServices, current.config, updated, current.catalogContent);
    broadcastStateChange({ services: updatedServices, categories: updated });
    return { success: true };
  };

  const setCategories = async (cats: ServiceCategory[]): Promise<{ success: boolean; error?: string }> => {
    const current = stateRef.current;
    const pushRes = await pushToSupabase(current.services, current.config, cats, current.catalogContent);
    if (!pushRes.success) {
      return { success: false, error: pushRes.message };
    }

    setCategoriesState(cats);
    saveToLocalStorage(current.services, current.config, cats, current.catalogContent);
    broadcastStateChange({ categories: cats });
    return { success: true };
  };

  const setCatalogContent = async (cc: CatalogContentMap): Promise<{ success: boolean; error?: string }> => {
    const current = stateRef.current;
    const pushRes = await pushToSupabase(current.services, current.config, current.categories, cc);
    if (!pushRes.success) {
      return { success: false, error: pushRes.message };
    }

    setCatalogContentState(cc);
    saveToLocalStorage(current.services, current.config, current.categories, cc);
    broadcastStateChange({ catalogContent: cc });
    return { success: true };
  };

  const syncWithSupabase = async () => {
    return await pushToSupabase(services, config, categories, catalogContent);
  };

  const reloadFromSupabase = async () => {
    return await pullFromSupabase();
  };

  const reloadFromServer = useCallback(async () => {
    return await pullFromSupabase();
  }, [pullFromSupabase]);

  return (
    <StoreContext.Provider value={{
      services, setServices,
      categories, setCategories,
      addCategory, updateCategory, deleteCategory,
      appointments, setAppointments,
      refreshAppointments,
      notifySlotsChanged,
      blocks, addBlock, updateBlock, deleteBlock, setBlocks,
      config, setConfig,
      isAdminUser,
      adminCheckError,
      appointmentsError,
      catalogContent, setCatalogContent,
      clientProfiles,
      deletedClientPhones,
      saveClientProfile,
      registerNewClient,
      updateClient,
      deleteClient,
      addAppointment,
      updateAppointment,
      cancelAppointment,
      deleteAppointment,
      addService,
      updateService,
      deleteService,
      syncWithSupabase,
      reloadFromSupabase,
      reloadFromServer,
      pullFromSupabase,
      hasPendingMigration,
      dataSource,
      isSupabaseConfigured,
      isSupabaseConnected,
      supabaseStatus,
      supabaseErrorMessage,
      supabaseHost,
      lastSyncedAt,
      lastLoadedAt,
      appVersion: APP_VERSION,
      isSyncing
    }}>
      {children}
    </StoreContext.Provider>
  );
};
