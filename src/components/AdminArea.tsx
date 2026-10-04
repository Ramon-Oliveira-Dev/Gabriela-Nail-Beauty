import { ClientesAdminView } from "./ClientesAdminView";
import { ConfigAdminView } from "./ConfigAdminView";
import { CatalogContentAdminView } from "./CatalogContentAdminView";
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { Appointment, Block, Service } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatShortDate,
  formatDuration, 
  cleanPhoneNumber, 
  checkCancellationPolicy,
  getPublicClientUrl
} from '../utils';
import { 
  Lock, LogOut, CheckCircle, CheckCircle2, XCircle, Trash2, Phone, Calendar, 
  Clock, Plus, MessageCircle, AlertCircle, Share2, Copy, Eye, EyeOff,
  BellRing, Check, ShieldAlert, Sparkles, Menu, X, Settings, 
  Database, Edit, Search, Filter, RefreshCw, ChevronRight, User, Image as ImageIcon,
  CalendarDays, CalendarRange, UploadCloud
} from 'lucide-react';
import { ServicesModal } from './ServicesModal';
import { AdminServiceModal } from './AdminServiceModal';
import { AdminAppointmentModal } from './AdminAppointmentModal';
import { AdminNavbar, AdminTab } from './AdminNavbar';
import { AgendaDailyView } from './AgendaDailyView';
import { AgendaWeeklyView } from './AgendaWeeklyView';
import { AgendaMonthlyView } from './AgendaMonthlyView';
import { ShareLinkModal } from './ShareLinkModal';
import { ImportLegacyDataModal } from './ImportLegacyDataModal';
import { useDeviceBackButton } from '../hooks/useDeviceBackButton';
import { getSupabaseClient, formatSupabaseErrorMessage } from '../supabaseClient';

export const AdminArea: React.FC<{onLogout: () => void}> = ({ onLogout }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState('gabriela.nail.beauty@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Contador de bloqueio por tentativas excessivas
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);
  
  const { 
    appointments, 
    setAppointments, 
    addAppointment, 
    updateAppointment, 
    deleteAppointment,
    services, 
    setServices, 
    addService,
    updateService,
    deleteService,
    config, 
    setConfig, 
    blocks, 
    setBlocks,
    categories,
    catalogContent,
    isAdminUser,
    adminCheckError,
    appointmentsError,
    isSupabaseConnected,
    isSupabaseConfigured,
    supabaseStatus,
    supabaseErrorMessage,
    supabaseHost,
    dataSource,
    hasPendingMigration,
    syncWithSupabase,
    lastLoadedAt,
    appVersion,
    reloadFromServer,
    isSyncing
  } = useStore();

  const totalComplementsCount = useMemo(() => {
    return (services || []).reduce(
      (acc, s) => acc + (Array.isArray(s.complements) ? s.complements.length : 0),
      0
    );
  }, [services]);

  const totalPhotosCount = useMemo(() => {
    return (services || []).reduce((acc, s) => {
      const sImgs = Array.isArray(s.images) && s.images.length > 0 ? s.images.length : (s.imageUrl ? 1 : 0);
      const cImgs = (s.complements || []).reduce((cAcc, c) => cAcc + (Array.isArray(c.images) ? c.images.length : 0), 0);
      return acc + sImgs + cImgs;
    }, 0);
  }, [services]);

  const [isImportLegacyModalOpen, setIsImportLegacyModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('agenda');
  const [configInitialTab, setConfigInitialTab] = useState<'horarios' | 'bloqueios' | 'estudio'>('horarios');
  const [agendaViewMode, setAgendaViewMode] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>(undefined);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllDates, setShowAllDates] = useState(false);
  const [agendaSearch, setAgendaSearch] = useState('');
  const [agendaStatusFilter, setAgendaStatusFilter] = useState<'todos' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('todos');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<'todos' | 'aplicacao' | 'manutencao' | 'outros'>('todos');
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [previewServicesModal, setPreviewServicesModal] = useState(false);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Modais de Gestão
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  // Estados de Exclusão com Modal Customizado Seguro (não bloqueado por iframes)
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast(null);
    }, 3500);
  };

  // Verificação inicial e contínua de sessão ativa do Administrador
  useEffect(() => {
    let isMounted = true;

    // Limpeza defensiva de flags legadas de bypass
    try {
      localStorage.removeItem('admin_bypass');
    } catch {}

    const verifyAdminSession = async () => {
      setIsCheckingAuth(true);
      setAuthError(null);

      const client = getSupabaseClient();
      if (!client) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const { data: { session }, error: sessionErr } = await client.auth.getSession();
        if (sessionErr || !session?.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            setIsCheckingAuth(false);
          }
          return;
        }

        const user = session.user;
        const { data: adminRow, error: adminErr } = await client
          .from('admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (adminErr) {
          console.error('Erro ao verificar permissão na sessão:', adminErr);
          await client.auth.signOut();
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUserEmail(null);
          }
          return;
        }

        if (adminRow && isMounted) {
          setCurrentUserEmail(user.email || null);
          setIsAuthenticated(true);
        } else {
          await client.auth.signOut();
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUserEmail(null);
          }
        }
      } catch (err: any) {
        console.warn('Erro ao verificar sessão:', err);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    };

    verifyAdminSession();

    const client = getSupabaseClient();
    const { data: authListener } = client?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
        }
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Controle do botão Voltar do dispositivo para o Painel Administrativo
  // 1. Fecha modais abertos
  useDeviceBackButton(isShareModalOpen, () => {
    setIsShareModalOpen(false);
  });

  useDeviceBackButton(isServiceModalOpen, () => {
    setIsServiceModalOpen(false);
    setServiceToEdit(null);
  });

  useDeviceBackButton(isAppointmentModalOpen, () => {
    setIsAppointmentModalOpen(false);
    setAppointmentToEdit(null);
    setModalDefaultDate(undefined);
  });

  useDeviceBackButton(previewServicesModal, () => {
    setPreviewServicesModal(false);
  });

  useDeviceBackButton(!!appointmentToDelete, () => {
    setAppointmentToDelete(null);
  });

  useDeviceBackButton(!!serviceToDelete, () => {
    setServiceToDelete(null);
  });

  // 2. Se estiver na tela de login de admin (não autenticado), voltar retorna ao site da cliente
  useDeviceBackButton(!isAuthenticated, onLogout);

  // 3. Se estiver autenticado e em aba diferente da inicial ('agenda'), voltar retorna à aba 'agenda'
  useDeviceBackButton(isAuthenticated && activeTab !== 'agenda' && !isServiceModalOpen && !isAppointmentModalOpen && !previewServicesModal, () => {
    setActiveTab('agenda');
  });

  // Data de amanhã para lembretes
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  const tomorrowStr = tomorrowDateObj.toISOString().split('T')[0];
  const [reminderTargetDate, setReminderTargetDate] = useState(tomorrowStr);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setAuthError(null);
    setIsLoggingIn(true);

    const registerFailedAttempt = () => {
      const next = failedAttempts + 1;
      if (next >= 5) {
        setLockoutSeconds(60);
        setFailedAttempts(0);
        setAuthError('Muitas tentativas incorretas. Botão bloqueado por 60 segundos.');
      } else {
        setFailedAttempts(next);
      }
    };

    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Supabase não configurado no ambiente.');
      setIsLoggingIn(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !authData?.user) {
        const rawMsg = authError?.message || '';
        const errMsg = rawMsg.toLowerCase();
        const status = (authError as any)?.status;

        if (
          status === 429 ||
          errMsg.includes('rate limit') ||
          errMsg.includes('too many') ||
          errMsg.includes('over_email_send_rate_limit')
        ) {
          setAuthError('Muitas tentativas. Aguarde alguns minutos e tente de novo.');
        } else if (
          errMsg.includes('email not confirmed') ||
          errMsg.includes('unconfirmed')
        ) {
          setAuthError('Seu e-mail ainda não foi confirmado. Fale com quem administra o app.');
        } else if (
          errMsg.includes('invalid login credentials') ||
          errMsg.includes('invalid') ||
          errMsg.includes('credentials') ||
          errMsg.includes('grant')
        ) {
          setAuthError('E-mail ou senha incorretos.');
        } else {
          setAuthError(formatSupabaseErrorMessage(authError || 'Erro ao autenticar.'));
        }

        registerFailedAttempt();
        setIsLoggingIn(false);
        return;
      }

      const userId = authData.user.id;
      const userEmail = (authData.user.email || cleanEmail).toLowerCase();

      // Valida se a usuária existe na tabela admins por user_id
      const { data: adminRow, error: adminErr } = await client
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminErr) {
        console.error('Erro ao verificar permissão:', formatSupabaseErrorMessage(adminErr));
        await client.auth.signOut();
        setAuthError('Não foi possível verificar a permissão. Tente novamente.');
        registerFailedAttempt();
        setIsLoggingIn(false);
        return;
      }

      if (!adminRow) {
        await client.auth.signOut();
        setAuthError('Esta conta não tem acesso ao painel.');
        registerFailedAttempt();
        setIsLoggingIn(false);
        return;
      }

      // Sucesso na autenticação e confirmação de privilégio de administrador
      setFailedAttempts(0);
      setLockoutSeconds(0);
      setCurrentUserEmail(userEmail);
      setIsAuthenticated(true);
      setPassword('');
      await reloadFromServer();
    } catch (err: any) {
      setAuthError(formatSupabaseErrorMessage(err));
      registerFailedAttempt();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('admin_bypass');
    } catch {}
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Erro ao deslogar do Supabase:', err);
      }
    }
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    onLogout();
  };

  // Filtragem avançada da agenda (declarada antes do retorno condicional para respeitar as Regras de Hooks do React)
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      // Filtro de data
      if (!showAllDates && app.date !== selectedDate) {
        return false;
      }
      // Filtro de status
      if (agendaStatusFilter !== 'todos' && app.status !== agendaStatusFilter) {
        return false;
      }
      // Filtro de busca por nome ou telefone ou serviço
      if (agendaSearch.trim()) {
        const query = agendaSearch.toLowerCase();
        const serv = services.find(s => s.id === app.serviceId);
        const servName = serv?.name?.toLowerCase() || '';
        const matchName = app.clientName.toLowerCase().includes(query);
        const matchPhone = app.clientPhone.includes(query);
        const matchService = servName.includes(query);
        if (!matchName && !matchPhone && !matchService) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments, selectedDate, showAllDates, agendaStatusFilter, agendaSearch, services]);

  // Cálculos para o dia selecionado
  const todaysAppointments = appointments.filter(a => a.date === selectedDate && a.status !== 'cancelled');
  const todaysRevenue = todaysAppointments.reduce((acc, app) => acc + app.price, 0);
  const todaysBlocks = blocks.filter(b => b.date === selectedDate);

  // Lembretes para 24h
  const reminderAppointments = appointments.filter(
    a => a.date === reminderTargetDate && a.status !== 'cancelled'
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Contagem de lembretes pendentes de envio (não cancelados e ainda não enviados)
  const pendingRemindersCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetPending = appointments.filter(
      a => a.date === reminderTargetDate && a.status !== 'cancelled' && !a.reminderSent
    );
    if (targetPending.length > 0) return targetPending.length;

    return appointments.filter(
      a => (a.date === todayStr || a.date === tomorrowStr) && a.status !== 'cancelled' && !a.reminderSent
    ).length;
  }, [appointments, reminderTargetDate, tomorrowStr]);

  // Estado de colapso do menu lateral CRM no desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('GABI_ADMIN_SIDEBAR_COLLAPSED') === 'true';
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('GABI_ADMIN_SIDEBAR_COLLAPSED', String(next));
      }
      return next;
    });
  };

  const send24hReminderWhatsApp = (app: Appointment) => {
    const s = services.find(ser => ser.id === app.serviceId);
    const serviceName = app.serviceNames || (s ? s.name : 'Procedimento');
    const cleanPhone = cleanPhoneNumber(app.clientPhone);
    
    const message = `Olá, ${app.clientName}! ✨ Tudo bem? Passando para lembrar do seu momento de cuidado amanhã, dia ${formatDate(app.date)} às ${app.startTime}, para o procedimento *${serviceName}* com a Gabriela Santos Nail Designer! 💅\n\nPor favor, responda com *CONFIRMAR* para garantir seu horário. (Caso precise reagendar com antecedência, nos avise o quanto antes).\n\nTe esperamos com carinho! 💕`;
    
    updateAppointment(app.id, { reminderSent: true });

    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const getAppointmentDurationText = (app: Appointment, srv?: Service): string => {
    if (app.startTime && app.endTime) {
      const [sh, sm] = app.startTime.split(':').map(Number);
      const [eh, em] = app.endTime.split(':').map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff > 0) return formatDuration(diff);
    }
    if (srv?.durationMinutes) {
      return formatDuration(srv.durationMinutes);
    }
    return '1h';
  };

  const getAdminConfirmationMessage = (app: Appointment): string => {
    const s = services.find(ser => ser.id === app.serviceId);
    const serviceName = app.serviceNames || (s ? s.name : 'Procedimento');
    const duration = getAppointmentDurationText(app, s);
    return [
      'Agendamento concluído com a Profissional Gabriela Santos',
      `Data: ${formatShortDate(app.date)}`,
      `Serviço: ${serviceName}`,
      `Horário: ${app.startTime}`,
      `Tempo de atendimento: ${duration}`
    ].join('\n');
  };

  const openConfirmationWhatsApp = (app: Appointment) => {
    const cleanPhone = cleanPhoneNumber(app.clientPhone);
    const message = getAdminConfirmationMessage(app);
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openWhatsAppClient = (app: Appointment) => {
    openConfirmationWhatsApp(app);
  };

  const handleUpdateAppointmentStatus = (id: string, status: 'pending' | 'confirmed' | 'completed' | 'cancelled', sendWhatsApp: boolean = true) => {
    updateAppointment(id, { status });
    if (status === 'confirmed' && sendWhatsApp) {
      const app = appointments.find(a => a.id === id);
      if (app) {
        openConfirmationWhatsApp(app);
      }
    }
  };

  // Serviços exibidos na gestão
  const displayedServices = services;

  const copyClientServicesText = () => {
    const clientUrl = getPublicClientUrl();
    let text = `💅 *Tabela de Procedimentos & Serviços - Gabriela Santos Nail Designer*\n\n`;
    services.forEach(s => {
      text += `✨ *${s.name}*\n⏳ Tempo: ${formatDuration(s.durationMinutes)} | 💰 ${formatCurrency(s.price)}\n${s.description ? `_${s.description}_\n` : ''}`;
      if (s.complements && s.complements.length > 0) {
        text += `   ➕ *Opções Complementares:*\n`;
        s.complements.forEach(c => {
          text += `     • ${c.name}: +${formatCurrency(c.price)} (+${formatDuration(c.durationMinutes)})\n`;
        });
      }
      text += `\n`;
    });
    text += `📍 Endereço: ${config.address}\n📲 Agende online pelo nosso aplicativo:\n👉 ${clientUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Salvar serviço do modal
  const handleSaveService = async (serviceData: Omit<Service, 'id'>, existingId?: string): Promise<boolean> => {
    if (existingId) {
      const res = await updateService(existingId, serviceData);
      if (res && !res.success) {
        showToast(res.error || 'Erro ao atualizar no Supabase');
        return false;
      }
      showToast('Procedimento atualizado no Supabase!');
      return true;
    } else {
      const newService: Service = {
        ...serviceData,
        id: Math.random().toString(36).substring(2, 9),
      };
      const res = await addService(newService);
      if (res && !res.success) {
        showToast(res.error || 'Erro ao salvar no Supabase');
        return false;
      }
      showToast('Procedimento criado no Supabase!');
      return true;
    }
  };

  // Salvar agendamento do modal
  const handleSaveAppointment = (appointmentData: Appointment) => {
    const exists = appointments.some(a => a.id === appointmentData.id);
    if (exists) {
      updateAppointment(appointmentData.id, appointmentData);
    } else {
      addAppointment(appointmentData);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-organic bg-cover flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-stone-100">
          <RefreshCw className="w-8 h-8 animate-spin text-[#987353]" />
          <p className="text-xs font-semibold text-stone-600">Verificando sessão de administrador...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-organic bg-cover flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-stone-100 text-center animate-fade-in">
          <img src="/logo_gabi.png" alt="Gabriela Nail&Beauty" className="w-48 h-auto mx-auto mb-4" />
          <img 
            src="/gabi.webp" 
            alt="Gabriela Santos" 
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src.endsWith('.webp')) target.src = '/gabi.jpg';
            }}
            className="w-28 h-28 mx-auto rounded-full object-cover mb-6 border-4 border-[#FAF6F2] shadow-sm" 
          />
          
          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5 font-semibold">E-mail</label>
              <input 
                type="email" 
                placeholder="seu-email@dominio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#987353] text-stone-800 bg-stone-50/50"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5 font-semibold">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#987353] text-stone-800 bg-stone-50/50 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn || lockoutSeconds > 0}
              className="w-full bg-[#2A1E18] text-white py-3.5 rounded-full text-xs uppercase tracking-wider font-semibold hover:bg-[#433128] transition-colors shadow-sm mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#C5A88E]" />
                  <span>Autenticando...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <span>Aguarde {lockoutSeconds}s para tentar novamente</span>
              ) : (
                'Acessar Painel'
              )}
            </button>
          </form>

          <button onClick={onLogout} className="mt-6 text-xs text-stone-400 hover:text-stone-700">
            Voltar ao site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F3] flex flex-col md:flex-row font-sans">
      
      {/* Navbar Lateral CRM (Esquerda no Desktop/Tablet com colapso por hambúrguer) */}
      <AdminNavbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'config') {
            setConfigInitialTab('horarios');
          }
          setActiveTab(tab);
        }}
        isSupabaseConnected={isSupabaseConnected}
        supabaseStatus={supabaseStatus}
        servicesCount={services.length}
        blocksCount={blocks.length}
        remindersCount={reminderAppointments.length}
        pendingRemindersCount={pendingRemindersCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onOpenShareLink={() => setIsShareModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal à Direita da Sidebar */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden pb-16 md:pb-8">
        <main className="max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 flex-1">

        {/* Alerta de Modo Offline / Cache Ativo com Bloqueio de Gravação */}
        {(!isSupabaseConnected || dataSource === 'cache') && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">⚠️</span>
              <div>
                <strong className="block font-bold">Modo Somente Leitura Ativo (Dados podem estar desatualizados)</strong>
                <p className="text-amber-900 mt-0.5 leading-relaxed text-xs">
                  O Supabase está offline ou inacessível. O aplicativo está exibindo os dados salvos em cache offline.
                  Para evitar divergência de dados entre aparelhos, a criação, edição e exclusão de procedimentos estão temporariamente bloqueadas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => syncWithSupabase()}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shrink-0 transition-colors cursor-pointer"
            >
              Tentar Reconectar
            </button>
          </div>
        )}

        {/* Alerta de Dados Locais Pendentes de Migração */}
        {hasPendingMigration && (
          <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-2xl text-orange-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">📦</span>
              <div>
                <strong className="block font-bold">Há dados locais pendentes de migração</strong>
                <p className="text-orange-900 mt-0.5 leading-relaxed text-xs">
                  Existem complementos ou fotos presentes no seu cache local que ainda não foram gravados no catálogo do Supabase.
                  Importe os dados para a nuvem para consolidá-los definitivamente em todos os dispositivos.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsImportLegacyModalOpen(true)}
              disabled={!isSupabaseConnected}
              className={`px-4 py-2 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-2xs flex items-center gap-1.5 ${
                !isSupabaseConnected 
                  ? 'bg-stone-300 text-stone-500 cursor-not-allowed' 
                  : 'bg-[#201510] hover:bg-[#38261E] text-white cursor-pointer active:scale-95'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#C5A88E]" />
              <span>Importar para a Nuvem</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 1: AGENDA COM VISÃO DIÁRIA, SEMANAL E MENSAL */}
        {/* ============================================================ */}
        {activeTab === 'agenda' && (
          <div className="animate-fade-in space-y-6">

            {/* Topo da Gestão de Agenda & Seletor de Modos (Diária / Semanal / Mensal) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-stone-800 font-bold">Gestão da Agenda</h3>
                <p className="text-xs text-stone-500">Acompanhe e controle atendimentos nos modos diário, semanal ou mensal</p>
              </div>

              {/* Seletor Segmentado dos Modos de Visualização */}
              <div className="flex items-center p-1 bg-stone-100 rounded-2xl border border-stone-200/60 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAgendaViewMode('dia')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    agendaViewMode === 'dia'
                      ? 'bg-[#201510] text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Diária</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAgendaViewMode('semana')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    agendaViewMode === 'semana'
                      ? 'bg-[#201510] text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Semanal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAgendaViewMode('mes')}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    agendaViewMode === 'mes'
                      ? 'bg-[#201510] text-white shadow-xs font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>Mensal</span>
                </button>
              </div>
            </div>

            {/* Renderização do Modo Selecionado */}
            {agendaViewMode === 'dia' && (
              <AgendaDailyView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                appointments={appointments}
                services={services}
                blocks={blocks}
                workingHours={config.workingHours}
                onOpenNewAppointment={(date) => {
                  setModalDefaultDate(date || selectedDate);
                  setAppointmentToEdit(null);
                  setIsAppointmentModalOpen(true);
                }}
                onEditAppointment={(app) => {
                  setAppointmentToEdit(app);
                  setIsAppointmentModalOpen(true);
                }}
                onDeleteAppointment={(id) => {
                  const app = appointments.find(a => a.id === id);
                  if (app) {
                    setAppointmentToDelete(app);
                  }
                }}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onOpenWhatsApp={openWhatsAppClient}
                onManageBlocks={() => {
                  setConfigInitialTab('bloqueios');
                  setActiveTab('config');
                }}
              />
            )}

            {agendaViewMode === 'semana' && (
              <AgendaWeeklyView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                appointments={appointments}
                services={services}
                blocks={blocks}
                workingHours={config.workingHours}
                onOpenNewAppointment={(date) => {
                  setModalDefaultDate(date || selectedDate);
                  setAppointmentToEdit(null);
                  setIsAppointmentModalOpen(true);
                }}
                onEditAppointment={(app) => {
                  setAppointmentToEdit(app);
                  setIsAppointmentModalOpen(true);
                }}
                onOpenWhatsApp={openWhatsAppClient}
                onSwitchToDailyView={(date) => {
                  setSelectedDate(date);
                  setAgendaViewMode('dia');
                }}
              />
            )}

            {agendaViewMode === 'mes' && (
              <AgendaMonthlyView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                appointments={appointments}
                services={services}
                blocks={blocks}
                workingHours={config.workingHours}
                onOpenNewAppointment={(date) => {
                  setModalDefaultDate(date || selectedDate);
                  setAppointmentToEdit(null);
                  setIsAppointmentModalOpen(true);
                }}
                onEditAppointment={(app) => {
                  setAppointmentToEdit(app);
                  setIsAppointmentModalOpen(true);
                }}
                onDeleteAppointment={(id) => {
                  const app = appointments.find(a => a.id === id);
                  if (app) {
                    setAppointmentToDelete(app);
                  }
                }}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onOpenWhatsApp={openWhatsAppClient}
                onSwitchToDailyView={(date) => {
                  setSelectedDate(date);
                  setAgendaViewMode('dia');
                }}
              />
            )}

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: SERVIÇOS & PROCEDIMENTOS (COM ADICIONAR E REMOVER IMAGENS) */}
        {/* ============================================================ */}
        {activeTab === 'servicos' && (
          <div className="animate-fade-in space-y-4">
            
            {/* Header de Serviços - Layout Otimizado para Evitar Scroll Vertical Excessivo */}
            <div className="bg-[#FAF6F2] border border-[#EADDCF] p-3 sm:p-4 rounded-2xl shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-lg sm:text-xl text-[#201510] font-bold leading-tight">
                      Procedimentos & Serviços
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#D9CCC1] text-[#8C6B4F]">
                      {services.length} {services.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#76685F] mt-0.5">
                    Gerencie valores, durações, fotos e serviços complementares.
                  </p>
                </div>

                {/* Toolbar de Ações - Compacta, Organizada e Sem Scroll Desnecessário */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      setServiceToEdit(null);
                      setIsServiceModalOpen(true);
                    }}
                    className="col-span-2 sm:col-span-1 px-3.5 py-2 rounded-xl bg-[#201510] text-white hover:bg-[#38261E] text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C5A88E]" /> 
                    <span>Novo Procedimento</span>
                  </button>

                  <button 
                    onClick={() => setPreviewServicesModal(true)}
                    className="px-3 py-2 rounded-xl bg-white border border-[#D9CCC1] text-[#201510] hover:bg-stone-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Visualizar catálogo na perspectiva da cliente"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#8C6B4F]" /> 
                    <span className="truncate">Visão da Cliente</span>
                  </button>

                  <button 
                    onClick={copyClientServicesText}
                    className="px-3 py-2 rounded-xl bg-white border border-[#D9CCC1] text-[#201510] hover:bg-stone-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title="Copiar procedimentos e valores para colar no WhatsApp"
                  >
                    {copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#8C6B4F]" />
                    )}
                    <span className="truncate">{copiedLink ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de Serviços Cadastrados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedServices.map(s => {
                const hasComplements = s.complements && s.complements.length > 0;
                return (
                  <div 
                    key={s.id} 
                    className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200/90 shadow-sm hover:border-[#8C6B4F]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Topo do Card: Foto e Dados Básicos */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative flex items-center justify-center">
                          {s.imageUrl ? (
                            <img 
                              src={s.imageUrl} 
                              alt={s.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="text-center p-1 text-stone-300">
                              <ImageIcon className="w-6 h-6 mx-auto mb-0.5 text-stone-300" />
                              <span className="text-[9px] block text-stone-400 font-medium">Sem foto</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold ${
                              s.category === 'aplicacao' 
                                ? 'bg-amber-100 text-amber-900' 
                                : s.category === 'manutencao' 
                                ? 'bg-blue-100 text-blue-900' 
                                : 'bg-[#F2EAE1] text-[#634E3E]'
                            }`}>
                              {categories.find(c => c.id === s.category)?.label || (s.category === 'aplicacao' ? 'Aplicação' : s.category === 'manutencao' ? 'Manutenção' : 'Outros')}
                            </span>

                            {hasComplements && (
                              <span className="text-[9px] font-semibold bg-[#FAF4ED] text-[#8C6B4F] border border-[#EADBCC] px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-[#8C6B4F]" />
                                {s.complements!.length} {s.complements!.length === 1 ? 'complemento' : 'complementos'}
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif text-lg font-bold text-stone-800 mt-1 leading-snug truncate">
                            {s.name}
                          </h4>

                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="font-bold text-[#8C6B4F]">
                              {formatCurrency(s.price)}
                            </span>
                            <span className="text-stone-400">•</span>
                            <span className="text-stone-500 font-medium">
                              {formatDuration(s.durationMinutes)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Descrição do Procedimento */}
                      {s.description && (
                        <p className="text-xs text-stone-600 mt-3 line-clamp-2 leading-relaxed bg-stone-50/70 p-2.5 rounded-xl border border-stone-100">
                          {s.description}
                        </p>
                      )}

                      {/* Informações dos Serviços Complementares (quando adicionados) */}
                      {hasComplements && (
                        <div className="mt-3.5 pt-3 border-t border-[#F0E8DF]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#8C6B4F]" />
                              <span className="text-[11px] font-bold text-[#201510] uppercase tracking-wider">
                                Serviços Complementares
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-[#8C6B4F] bg-[#FAF5F0] border border-[#E8DDD2] px-2 py-0.5 rounded-full">
                              {s.complements!.length} {s.complements!.length === 1 ? 'opção' : 'opções'}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {s.complements!.map((comp, compIdx) => (
                              <div 
                                key={comp.id ? `${s.id}-${comp.id}` : `comp-${s.id}-${compIdx}`}
                                className="bg-[#FAF7F3] border border-[#EAE0D5] rounded-xl p-2.5 flex items-start justify-between gap-2.5 hover:border-[#8C6B4F]/40 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8C6B4F] shrink-0" />
                                    <h5 className="text-xs font-semibold text-[#201510] truncate">
                                      {comp.name}
                                    </h5>
                                  </div>
                                  {comp.description && (
                                    <p className="text-[10.5px] text-stone-500 mt-0.5 line-clamp-1 pl-3 leading-tight">
                                      {comp.description}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-[#8C6B4F] block">
                                    +{formatCurrency(comp.price)}
                                  </span>
                                  <span className="text-[10px] text-stone-400 font-medium block">
                                    +{formatDuration(comp.durationMinutes)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões do Card */}
                    <div className="pt-3.5 mt-3.5 border-t border-stone-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (!isSupabaseConnected) {
                            showToast('Edição bloqueada: Supabase offline.');
                            return;
                          }
                          setServiceToEdit(s);
                          setIsServiceModalOpen(true);
                        }}
                        disabled={!isSupabaseConnected}
                        className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          !isSupabaseConnected 
                            ? 'text-stone-400 cursor-not-allowed opacity-60' 
                            : 'text-[#8C6B4F] hover:text-[#201510] cursor-pointer'
                        }`}
                        title={!isSupabaseConnected ? 'Edição bloqueada enquanto o Supabase estiver offline' : undefined}
                      >
                        <Edit className="w-3.5 h-3.5" /> Editar Procedimento & Fotos
                      </button>

                      <button
                        onClick={() => {
                          if (!isSupabaseConnected) {
                            showToast('Exclusão bloqueada: Supabase offline.');
                            return;
                          }
                          if (services.length <= 1) {
                            showToast('Mantenha pelo menos 1 serviço cadastrado.');
                            return;
                          }
                          setServiceToDelete(s);
                        }}
                        disabled={!isSupabaseConnected}
                        className={`p-1.5 rounded-lg transition-colors ${
                          !isSupabaseConnected 
                            ? 'text-stone-300 cursor-not-allowed opacity-50' 
                            : 'text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                        }`}
                        title={!isSupabaseConnected ? 'Exclusão bloqueada enquanto o Supabase estiver offline' : "Excluir procedimento"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 3: CLIENTES */}
        {/* ============================================================ */}
        {activeTab === 'clientes' && <ClientesAdminView />}

        {/* ============================================================ */}
        {/* ABA 4: LEMBRETES 24H (CONFIRMAÇÃO VIA WHATSAPP) */}
        {/* ============================================================ */}
        {activeTab === 'lembretes' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
                <div>
                  <h3 className="font-serif text-2xl text-stone-800 flex items-center gap-2.5">
                    <BellRing className="w-6 h-6 text-[#987353]" />
                    Lembretes de Confirmação (24 Horas Antes)
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    Envie lembrete pelo WhatsApp com 1 clique para as clientes de amanhã confirmarem presença.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-semibold text-stone-600">Data de Envio:</label>
                  <input 
                    type="date" 
                    value={reminderTargetDate}
                    onChange={e => setReminderTargetDate(e.target.value)}
                    className="px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#987353] text-stone-800 bg-stone-50/50"
                  />
                </div>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-[#FDFBF9] border border-[#EADDCF]">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#7A6B62]">Total para este dia</p>
                  <p className="text-2xl font-serif text-[#2A1E18]">{reminderAppointments.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-blue-700">Lembrete Enviado</p>
                  <p className="text-2xl font-serif text-blue-900">
                    {reminderAppointments.filter(a => a.reminderSent).length}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Presença Confirmada</p>
                  <p className="text-2xl font-serif text-emerald-900">
                    {reminderAppointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
              </div>

              {/* Reminder List */}
              <div className="space-y-4">
                {reminderAppointments.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
                    <p className="text-stone-500 text-xs">Nenhum atendimento agendado para esta data.</p>
                  </div>
                ) : (
                  reminderAppointments.map(app => {
                    const serv = services.find(s => s.id === app.serviceId);
                    const serviceName = serv?.name || 'Procedimento';
                    const durationMins = serv?.durationMinutes || 45;

                    return (
                      <div 
                        key={app.id} 
                        className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          app.status === 'confirmed' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-stone-200 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-serif text-xl font-bold text-stone-800">{app.startTime}</span>
                            <span className="text-xs text-stone-400">({formatDuration(durationMins)})</span>
                            {app.status === 'confirmed' ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Confirmado
                              </span>
                            ) : app.reminderSent ? (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                Lembrete Enviado
                              </span>
                            ) : (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Aguardando Envio
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-stone-800">{app.clientName}</h4>
                          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-stone-400" /> {app.clientPhone} • {serviceName} ({formatCurrency(app.price)})
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => send24hReminderWhatsApp(app)}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4" />
                            {app.reminderSent ? 'Reenviar WhatsApp' : 'Disparar Lembrete WhatsApp (24h)'}
                          </button>

                          {app.status !== 'confirmed' && (
                            <button 
                              onClick={() => handleUpdateAppointmentStatus(app.id, 'confirmed')}
                              title="Marcar como confirmado e enviar WhatsApp"
                              className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium text-stone-700"
                            >
                              <Check className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 5: CONFIGURAÇÕES DO ESPAÇO */}
        {/* ============================================================ */}
        {activeTab === 'config' && <ConfigAdminView initialTab={configInitialTab} />}

        {/* ============================================================ */}
        {/* ABA 6: CATÁLOGO & CONTEÚDO DAS PÁGINAS */}
        {/* ============================================================ */}
        {activeTab === 'catalogo' && <CatalogContentAdminView />}

        </main>
      </div>

      {/* Modal de Adicionar/Editar Procedimento */}
      <AdminServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setServiceToEdit(null);
        }}
        onSave={handleSaveService}
        serviceToEdit={serviceToEdit}
      />

      {/* Modal de Adicionar/Editar Agendamento */}
      <AdminAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setAppointmentToEdit(null);
          setModalDefaultDate(undefined);
        }}
        onSave={handleSaveAppointment}
        onDelete={(id) => {
          const app = appointments.find(a => a.id === id);
          if (app) {
            setAppointmentToDelete(app);
          }
        }}
        services={services}
        appointmentToEdit={appointmentToEdit}
        defaultDate={modalDefaultDate || selectedDate}
      />

      {/* Modal de Pré-visualização do Catálogo da Cliente */}
      <ServicesModal 
        isOpen={previewServicesModal} 
        onClose={() => setPreviewServicesModal(false)}
        onSelectService={(s) => {
          setPreviewServicesModal(false);
          showToast(`Você selecionou "${s.name}". Na visão da cliente, este clique leva direto para a escolha da data!`);
        }}
      />

      {/* Modal de Confirmação para Exclusão Permanente de Agendamento */}
      {appointmentToDelete && (
        <div 
          className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAppointmentToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Excluir Agendamento?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o agendamento de <strong className="text-stone-900 font-bold">{appointmentToDelete.clientName}</strong>?
              </p>
              
              <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 text-left text-xs space-y-1.5 my-2">
                <div className="flex items-center gap-2 text-stone-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  <span>{formatDate(appointmentToDelete.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  <span>{appointmentToDelete.startTime} às {appointmentToDelete.endTime}</span>
                </div>
                <div className="text-[11px] text-stone-500 pt-0.5 border-t border-stone-200/60">
                  Valor: {formatCurrency(appointmentToDelete.price)}
                </div>
              </div>

              <p className="text-[11px] text-red-500 font-medium">
                Esta ação liberará imediatamente o horário na agenda e não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setAppointmentToDelete(null)}
                className="w-full py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAppointment(appointmentToDelete.id);
                  setAppointmentToDelete(null);
                  showToast('Agendamento excluído com sucesso!');
                }}
                className="w-full py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Exclusão de Procedimento */}
      {serviceToDelete && (
        <div 
          className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setServiceToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-100 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Excluir Procedimento?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o procedimento <strong className="text-stone-900 font-bold">"{serviceToDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-red-500 font-medium">
                Esta ação removerá o serviço do catálogo e não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="w-full py-2.5 rounded-full border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!serviceToDelete) return;
                  const res = await deleteService(serviceToDelete.id);
                  if (res && !res.success) {
                    showToast(res.error || 'Erro ao excluir procedimento');
                  } else {
                    showToast(`Procedimento "${serviceToDelete.name}" excluído.`);
                    setServiceToDelete(null);
                  }
                }}
                className="w-full py-2.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento do Link com as Clientes */}
      <ShareLinkModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicUrl={getPublicClientUrl()}
      />

      {/* Modal de Migração de Dados Antigos para a Nuvem */}
      <ImportLegacyDataModal
        isOpen={isImportLegacyModalOpen}
        onClose={() => setIsImportLegacyModalOpen(false)}
        onSuccess={(count) => showToast(`Importação concluída! ${count} serviço(s) sincronizados com o Supabase.`)}
      />

      {/* Toast Notificação Admin */}
      {adminToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70 bg-stone-900/95 backdrop-blur-xs text-white text-xs font-semibold px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-stone-800">
          <CheckCircle2 className="w-4 h-4 text-[#C5A88E]" />
          <span>{adminToast}</span>
        </div>
      )}

    </div>
  );
};
