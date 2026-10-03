import React, { useState, useMemo } from 'react';
import { useStore } from '../StoreContext';
import { Appointment, Cliente, StatusCliente, ClienteAtendimento, ClientProfile, Service, ComplementaryService } from '../types';
import { 
  cleanPhoneNumber, 
  formatPhoneMask, 
  formatCurrencyFromDigits, 
  formatNumberToCurrencyString, 
  parseCurrencyStringToNumber 
} from '../utils';
import { 
  Search, 
  Phone, 
  Calendar as CalendarIcon, 
  MessageCircle, 
  History,
  X,
  Clock,
  CheckCircle2,
  CalendarCheck,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle,
  ExternalLink,
  UserPlus,
  AlertCircle,
  ChevronDown,
  Users,
  UserX,
  Camera
} from 'lucide-react';

const parseDateStr = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};

const diffDays = (date1: Date, date2: Date) => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${d} ${months[parseInt(m) - 1]}`;
};

const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${d} ${months[parseInt(m) - 1]} ${y} · ${weekDays[date.getDay()]}`;
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const NAIL_SHAPE_OPTIONS = ['Amendoada', 'Quadrada', 'Bailarina', 'Stiletto', 'Oval', 'Redonda'];
const PREFERENCES_OPTIONS = ['Tons Nudes', 'Francesinha', 'Tons Escuros', 'Vermelho Clássico', 'Glitter / Brilho', 'Nail Art Minimalista'];
const ALLERGIES_OPTIONS = ['Nenhuma restrição', 'Sensibilidade cabine LED', 'Primer sem ácido', 'Cutículas sensíveis'];

export const ClientesAdminView: React.FC = () => {
  const { 
    appointments, 
    services, 
    clientProfiles, 
    deletedClientPhones,
    saveClientProfile,
    addClientHistoryRecord, 
    updateClientHistoryRecord, 
    deleteClientHistoryRecord, 
    registerNewClient,
    updateClient,
    deleteClient
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'ativa' | 'pararam'>('todas');
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  
  // Feedback e exclusão de cliente
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [clientActionFeedback, setClientActionFeedback] = useState<string | null>(null);

  // Modal de Clientes que Pararam (+30 dias sem agendamento)
  const [isPararamModalOpen, setIsPararamModalOpen] = useState(false);
  const [pararamSearch, setPararamSearch] = useState('');

  // Modal de Histórico de Atendimentos
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Cliente | null>(null);

  // Modal de Edição de Informações da Cliente
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [isSavingEditClient, setIsSavingEditClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState({
    name: '',
    phone: '',
    avatarUrl: '',
    nailShape: '',
    preferences: '',
    allergies: '',
    notes: ''
  });

  // Modais de Adicionar / Editar Atendimento no Histórico
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    serviceNames: 'Alongamento em Gel',
    price: 130,
    status: 'completed' as 'completed' | 'confirmed' | 'pending' | 'cancelled',
    notes: ''
  });

  // Modal de Nova Cliente
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    phone: '',
    avatarUrl: '',
    includeFirstAppointment: false,
    serviceNames: '',
    price: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Helper de máscara para telefone brasileiro
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Helper para buscar o próximo agendamento futuro da cliente
  const getNextAppointment = (c: Cliente) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanCPhone = cleanPhoneNumber(c.telefone);
    const cleanCName = c.nome.trim().toLowerCase();

    const futureApps = appointments.filter(a => {
      if (a.status === 'cancelled') return false;
      const aPhone = cleanPhoneNumber(a.clientPhone);
      const aName = a.clientName.trim().toLowerCase();
      
      const phoneMatches = Boolean(
        cleanCPhone && aPhone && (
          cleanCPhone === aPhone || 
          (cleanCPhone.length >= 8 && aPhone.endsWith(cleanCPhone.slice(-8))) ||
          (aPhone.length >= 8 && cleanCPhone.endsWith(aPhone.slice(-8)))
        )
      );
      const nameMatches = Boolean(cleanCName && aName === cleanCName);

      return (phoneMatches || nameMatches) && a.date >= todayStr;
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    return futureApps[0] || null;
  };

  // Derive clients from appointments AND clientProfiles, strictly excluding any deleted client
  const clientes = useMemo(() => {
    const clientsMap = new Map<string, Cliente>();

    // 1. Inicializa a partir dos perfis (excluindo apagadas)
    (Object.values(clientProfiles) as ClientProfile[]).forEach((profile: ClientProfile) => {
      const phone = profile.phone.replace(/\D/g, '');
      if (!phone) return;
      
      const pName = profile.name ? profile.name.trim().toLowerCase() : '';
      const isDeleted = deletedClientPhones.some(d => {
        const dClean = d.replace(/\D/g, '');
        return d === profile.phone || 
               (dClean && (dClean === phone || (dClean.length >= 8 && phone.endsWith(dClean.slice(-8))))) ||
               (pName && d.toLowerCase() === pName);
      });
      if (isDeleted) return;

      clientsMap.set(phone, {
        id: phone,
        nome: profile.name,
        telefone: profile.phone,
        avatarUrl: profile.avatarUrl,
        clienteDesde: new Date().toISOString().split('T')[0],
        ultimoAtendimento: '',
        atendimentos: [],
        formatoUnhas: profile.nailShape,
        preferencias: profile.preferences,
        alergias: profile.allergies,
        observacoes: profile.notes
      });
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // 2. Adiciona dados dos agendamentos (excluindo apagadas)
    appointments.forEach(app => {
      const phone = app.clientPhone.replace(/\D/g, '');
      if (!phone) return;

      const aName = app.clientName ? app.clientName.trim().toLowerCase() : '';
      const isDeleted = deletedClientPhones.some(d => {
        const dClean = d.replace(/\D/g, '');
        return d === app.clientPhone || 
               (dClean && (dClean === phone || (dClean.length >= 8 && phone.endsWith(dClean.slice(-8))))) ||
               (aName && d.toLowerCase() === aName);
      });
      if (isDeleted) return;

      const srv = services.find(s => s.id === app.serviceId);
      const atendimento: ClienteAtendimento = {
        id: app.id,
        data: app.date,
        hora: app.startTime,
        procedimento: app.serviceNames || srv?.name || 'Procedimento',
        valor: app.price,
        status: app.status,
        observacoes: app.notes
      };

      const isPastOrToday = app.status !== 'cancelled' && app.date <= todayStr;

      if (clientsMap.has(phone)) {
        const client = clientsMap.get(phone)!;
        if (!client.atendimentos.some(at => at.id === app.id)) {
          client.atendimentos.push(atendimento);
        }
        if (isPastOrToday && (!client.ultimoAtendimento || app.date > client.ultimoAtendimento)) {
          client.ultimoAtendimento = app.date;
        }
        if (app.date < client.clienteDesde || client.clienteDesde === todayStr) {
          client.clienteDesde = app.date;
        }
        if (app.clientName && !client.nome) {
          client.nome = app.clientName;
        }
      } else {
        const prof = clientProfiles[app.clientPhone] || clientProfiles[phone];
        clientsMap.set(phone, {
          id: phone,
          nome: app.clientName,
          telefone: app.clientPhone,
          avatarUrl: prof?.avatarUrl,
          clienteDesde: app.date,
          ultimoAtendimento: isPastOrToday ? app.date : '',
          atendimentos: [atendimento],
          formatoUnhas: prof?.nailShape,
          preferencias: prof?.preferences,
          alergias: prof?.allergies,
          observacoes: prof?.notes
        });
      }
    });

    return Array.from(clientsMap.values()).map(client => {
      const prof = clientProfiles[client.telefone] || clientProfiles[client.id];
      if (prof) {
        if (prof.avatarUrl) client.avatarUrl = prof.avatarUrl;
        if (prof.nailShape) client.formatoUnhas = prof.nailShape;
        if (prof.preferences) client.preferencias = prof.preferences;
        if (prof.allergies) client.alergias = prof.allergies;
        if (prof.notes) client.observacoes = prof.notes;
      }
      client.atendimentos.sort((a, b) => b.data.localeCompare(a.data) || (b.hora || '').localeCompare(a.hora || ''));
      const pastAttendances = client.atendimentos.filter(a => a.status !== 'cancelled' && a.data <= todayStr);
      if (pastAttendances.length > 0) {
        client.ultimoAtendimento = pastAttendances[0].data;
      } else {
        client.ultimoAtendimento = '';
      }
      return client;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [appointments, services, clientProfiles, deletedClientPhones]);

  const today = new Date();

  // Helper to determine status: Clientes com mais de 30 dias sem agendamento vão para o status "Pararam"
  const getStatusInfo = (cliente: Cliente): { status: StatusCliente; text: string; alertMessage?: string; daysSince?: number } => {
    const nextApp = getNextAppointment(cliente);
    if (nextApp) {
      return { 
        status: 'ativa', 
        text: 'AGENDADA', 
        alertMessage: `Próximo atendimento agendado para ${formatShortDate(nextApp.date)} às ${nextApp.startTime}.` 
      };
    }

    if (!cliente.ultimoAtendimento) {
      const regDays = cliente.clienteDesde ? diffDays(parseDateStr(cliente.clienteDesde), today) : 0;
      if (regDays > 30) {
        return { 
          status: 'pararam', 
          text: 'PAROU', 
          alertMessage: `Mais de 30 dias sem agendamento (${regDays} dias de cadastro).`,
          daysSince: regDays 
        };
      }
      return { 
        status: 'ativa', 
        text: 'NOVA', 
        alertMessage: 'Cliente recém-cadastrada no sistema.' 
      };
    }

    const lastDate = parseDateStr(cliente.ultimoAtendimento);
    const daysSince = diffDays(lastDate, today);

    // Regra estrita: mais de 30 dias sem agendar vai para Pararam
    if (daysSince > 30) {
      return { 
        status: 'pararam', 
        text: 'PAROU', 
        alertMessage: `Mais de 30 dias sem agendamento (${daysSince} dias desde o último atendimento).`,
        daysSince 
      };
    }

    return { 
      status: 'ativa', 
      text: 'EM DIA', 
      alertMessage: `Última visita há ${daysSince} dias.`,
      daysSince 
    };
  };

  const filteredClientes = clientes.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || c.telefone.includes(searchTerm);
    if (!matchSearch) return false;
    
    if (filterStatus === 'ativa') {
      const { status } = getStatusInfo(c);
      if (status !== 'ativa') return false;
    } else if (filterStatus === 'pararam') {
      const { status } = getStatusInfo(c);
      if (status === 'ativa') return false;
    }
    return true;
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const statusColors: Record<StatusCliente, { bg: string; text: string }> = {
    ativa: { bg: 'bg-[#EEF3EC]', text: 'text-[#3F5C3A]' },
    risco: { bg: 'bg-[#FBF4E6]', text: 'text-[#8A6427]' },
    sumida: { bg: 'bg-[#F7EDE8]', text: 'text-[#8E4B37]' },
    pararam: { bg: 'bg-[#F7EDE8]', text: 'text-[#8E4B37]' }
  };

  const needContact = clientes.filter(c => {
    const s = getStatusInfo(c).status;
    return s !== 'ativa';
  });

  // Lista de clientes no status "Pararam" (+30 dias)
  const clientesPararam = useMemo(() => {
    return clientes.filter(c => {
      const info = getStatusInfo(c);
      return info.status !== 'ativa';
    }).sort((a, b) => {
      const infoA = getStatusInfo(a);
      const infoB = getStatusInfo(b);
      return (infoB.daysSince || 0) - (infoA.daysSince || 0);
    });
  }, [clientes, appointments, today]);

  const filteredClientesPararam = useMemo(() => {
    if (!pararamSearch.trim()) return clientesPararam;
    const term = pararamSearch.toLowerCase();
    return clientesPararam.filter(c => 
      c.nome.toLowerCase().includes(term) || c.telefone.includes(term)
    );
  }, [clientesPararam, pararamSearch]);

  // Abre o modal de histórico da cliente
  const handleOpenHistory = (c: Cliente) => {
    setSelectedClientForHistory(c);
  };

  // Histórico completo de atendimentos da cliente selecionada (unindo registros de atendimentos e agendamentos)
  const selectedClientAppointments = useMemo(() => {
    if (!selectedClientForHistory) return [];
    const cleanPhone = selectedClientForHistory.telefone.replace(/\D/g, '');
    const clientNameNorm = selectedClientForHistory.nome.toLowerCase().trim();

    const map = new Map<string, Appointment>();

    // 1. Atendimentos da ficha da cliente
    (selectedClientForHistory.atendimentos || []).forEach((at, idx) => {
      const key = at.id || `at-${at.data}-${at.hora || idx}`;
      map.set(key, {
        id: key,
        serviceId: '',
        serviceNames: at.procedimento,
        date: at.data,
        startTime: at.hora || '10:00',
        endTime: '',
        clientName: selectedClientForHistory.nome,
        clientPhone: selectedClientForHistory.telefone,
        status: (at.status || 'completed') as any,
        price: at.valor || 0,
        notes: at.observacoes || ''
      });
    });

    // 2. Agendamentos gerais que batem com telefone ou nome
    appointments.forEach(a => {
      const aPhone = a.clientPhone.replace(/\D/g, '');
      const aName = a.clientName.toLowerCase().trim();
      const matchesPhone = cleanPhone && (aPhone === cleanPhone || (cleanPhone.length >= 8 && aPhone.endsWith(cleanPhone.slice(-8))));
      const matchesName = aName && aName === clientNameNorm;

      if (matchesPhone || matchesName) {
        map.set(a.id, a);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || ''));
  }, [appointments, selectedClientForHistory]);

  // Registro real do último atendimento (somente do histórico passado ou concluído)
  const lastAttendanceRecord = useMemo(() => {
    if (!selectedClientAppointments || selectedClientAppointments.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Filtra atendimentos válidos (não cancelados) e que já aconteceram (data <= hoje ou status completed)
    const validPast = selectedClientAppointments.filter(a => 
      a.status !== 'cancelled' && (a.status === 'completed' || a.date <= todayStr)
    );

    if (validPast.length > 0) {
      return validPast[0]; // mais recente
    }

    return null;
  }, [selectedClientAppointments]);

  const clientTotalSpent = useMemo(() => {
    if (!selectedClientForHistory) return 0;
    return selectedClientAppointments
      .filter(a => a.status !== 'cancelled')
      .reduce((sum, a) => sum + (a.price || 0), 0);
  }, [selectedClientAppointments, selectedClientForHistory]);

  const averageTicket = useMemo(() => {
    const valid = selectedClientAppointments.filter(a => a.status !== 'cancelled');
    if (valid.length === 0) return 0;
    return clientTotalSpent / valid.length;
  }, [clientTotalSpent, selectedClientAppointments]);

  // Lista de todos os serviços complementares cadastrados em todos os procedimentos
  const allAvailableComplements = useMemo(() => {
    const list: { id: string; name: string; price: number; durationMinutes?: number; parentName: string }[] = [];
    const seen = new Set<string>();

    services.forEach(s => {
      s.complements?.forEach(c => {
        const key = c.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: c.id,
            name: c.name,
            price: c.price,
            durationMinutes: c.durationMinutes,
            parentName: s.name,
          });
        }
      });
    });

    return list;
  }, [services]);

  // Seleciona um procedimento base e preserva/soma complementos ativos
  const handleSelectBaseProcedure = (service: Service) => {
    setRecordForm(prev => {
      const activeComplements = allAvailableComplements.filter(c => 
        prev.serviceNames.toLowerCase().includes(c.name.toLowerCase())
      );
      
      const compNames = activeComplements.map(c => c.name).join(' + ');
      const compTotalPrice = activeComplements.reduce((sum, c) => sum + c.price, 0);
      
      const newNames = compNames ? `${service.name} + ${compNames}` : service.name;
      const newPrice = service.price + compTotalPrice;
      
      return {
        ...prev,
        serviceNames: newNames,
        price: newPrice
      };
    });
  };

  // Alterna a seleção de um serviço complementar no formulário de atendimento
  const handleToggleComplementInRecord = (comp: { name: string; price: number }) => {
    setRecordForm(prev => {
      const currentNames = prev.serviceNames;
      const escaped = comp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(\\s*\\+\\s*)?${escaped}`, 'i');
      const isPresent = regex.test(currentNames);

      if (isPresent) {
        let updatedNames = currentNames.replace(regex, '').trim();
        updatedNames = updatedNames.replace(/^\+\s*/, '').replace(/\s*\+$/, '').trim();
        if (!updatedNames) updatedNames = services[0]?.name || 'Procedimento';
        const updatedPrice = Math.max(0, prev.price - comp.price);
        return {
          ...prev,
          serviceNames: updatedNames,
          price: updatedPrice
        };
      } else {
        const updatedNames = currentNames ? `${currentNames} + ${comp.name}` : comp.name;
        const updatedPrice = prev.price + comp.price;
        return {
          ...prev,
          serviceNames: updatedNames,
          price: updatedPrice
        };
      }
    });
  };

  // Salvar novo atendimento ou edição
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForHistory) return;

    if (editingRecordId) {
      await updateClientHistoryRecord(editingRecordId, {
        date: recordForm.date,
        startTime: recordForm.startTime,
        serviceNames: recordForm.serviceNames,
        price: Number(recordForm.price),
        status: recordForm.status,
        notes: recordForm.notes
      });
    } else {
      await addClientHistoryRecord({
        clientName: selectedClientForHistory.nome,
        clientPhone: selectedClientForHistory.telefone,
        date: recordForm.date,
        startTime: recordForm.startTime,
        serviceNames: recordForm.serviceNames,
        price: Number(recordForm.price),
        status: recordForm.status,
        notes: recordForm.notes
      });
    }

    setIsRecordModalOpen(false);
    setEditingRecordId(null);
  };

  // Abrir modal de edição de registro
  const handleEditRecord = (app: Appointment) => {
    setEditingRecordId(app.id);
    setRecordForm({
      date: app.date,
      startTime: app.startTime || '10:00',
      serviceNames: app.serviceNames || 'Procedimento',
      price: app.price || 0,
      status: app.status || 'completed',
      notes: app.notes || ''
    });
    setIsRecordModalOpen(true);
  };

  // Excluir registro
  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este atendimento do histórico?')) {
      await deleteClientHistoryRecord(id);
    }
  };

  // Cadastrar nova cliente
  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.name.trim() || !newClientForm.phone.trim()) return;

    await registerNewClient({
      name: newClientForm.name.trim(),
      phone: newClientForm.phone.trim(),
      avatarUrl: newClientForm.avatarUrl || undefined,
      serviceNames: newClientForm.includeFirstAppointment ? (newClientForm.serviceNames || services[0]?.name) : undefined,
      price: newClientForm.includeFirstAppointment ? Number(newClientForm.price || services[0]?.price || 0) : undefined,
      date: newClientForm.includeFirstAppointment ? newClientForm.date : undefined,
      notes: newClientForm.notes.trim() || undefined
    });

    setIsNewClientModalOpen(false);
    setClientActionFeedback(`Cliente "${newClientForm.name.trim()}" cadastrada com sucesso!`);
    setTimeout(() => setClientActionFeedback(null), 4000);

    setNewClientForm({
      name: '',
      phone: '',
      avatarUrl: '',
      includeFirstAppointment: false,
      serviceNames: services[0]?.name || '',
      price: services[0]?.price || 0,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  // Excluir cliente permanentemente
  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    const targetName = clientToDelete.nome;
    const targetPhone = clientToDelete.telefone;
    try {
      await deleteClient(targetPhone, targetName);
      if (selectedClientForHistory?.telefone === targetPhone || selectedClientForHistory?.id === clientToDelete.id) {
        setSelectedClientForHistory(null);
      }
      setClientToDelete(null);
      setClientActionFeedback(`Cliente "${targetName}" foi removida com sucesso.`);
      setTimeout(() => setClientActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setClientActionFeedback('Erro ao remover cliente.');
      setTimeout(() => setClientActionFeedback(null), 4000);
    } finally {
      setIsDeletingClient(false);
    }
  };

  // Atalho para adicionar novo atendimento direto pelo card da cliente
  const handleQuickAddRecord = (c: Cliente) => {
    setSelectedClientForHistory(c);
    setEditingRecordId(null);
    const initialService = services[0];
    setRecordForm({
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      serviceNames: initialService?.name || 'Procedimento',
      price: initialService?.price || 100,
      status: 'completed',
      notes: ''
    });
    setIsRecordModalOpen(true);
  };

  // Abrir modal de edição de informações da cliente
  const handleOpenEditClient = (c: Cliente) => {
    const cleanPhone = cleanPhoneNumber(c.telefone);
    const profile = clientProfiles[c.telefone] || 
                    (cleanPhone ? clientProfiles[cleanPhone] : null) || 
                    clientProfiles[c.id];

    setEditingClient(c);
    setEditClientForm({
      name: profile?.name || c.nome || '',
      phone: formatPhoneMask(profile?.phone || c.telefone || ''),
      avatarUrl: profile?.avatarUrl || c.avatarUrl || '',
      nailShape: profile?.nailShape || c.formatoUnhas || '',
      preferences: profile?.preferences || c.preferencias || '',
      allergies: profile?.allergies || c.alergias || '',
      notes: profile?.notes || c.observacoes || ''
    });
    setIsEditClientModalOpen(true);
  };

  // Salvar alterações nas informações da cliente
  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editClientForm.name.trim() || !editClientForm.phone.trim()) return;

    setIsSavingEditClient(true);
    try {
      await updateClient(
        editingClient.telefone || editingClient.id,
        {
          name: editClientForm.name.trim(),
          phone: editClientForm.phone.trim(),
          avatarUrl: editClientForm.avatarUrl || undefined,
          nailShape: editClientForm.nailShape || undefined,
          preferences: editClientForm.preferences || undefined,
          allergies: editClientForm.allergies || undefined,
          notes: editClientForm.notes.trim() || undefined
        },
        editingClient.nome
      );

      // Atualiza referência no modal aberto de histórico se for a mesma cliente
      if (
        selectedClientForHistory &&
        (selectedClientForHistory.id === editingClient.id ||
         selectedClientForHistory.telefone === editingClient.telefone ||
         cleanPhoneNumber(selectedClientForHistory.telefone) === cleanPhoneNumber(editingClient.telefone))
      ) {
        setSelectedClientForHistory(prev => prev ? {
          ...prev,
          nome: editClientForm.name.trim(),
          telefone: editClientForm.phone.trim(),
          avatarUrl: editClientForm.avatarUrl || undefined,
          formatoUnhas: editClientForm.nailShape || undefined,
          preferencias: editClientForm.preferences || undefined,
          alergias: editClientForm.allergies || undefined,
          observacoes: editClientForm.notes.trim() || undefined
        } : null);
      }

      setIsEditClientModalOpen(false);
      setEditingClient(null);
      setClientActionFeedback(`Informações de "${editClientForm.name.trim()}" atualizadas com sucesso!`);
      setTimeout(() => setClientActionFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setClientActionFeedback('Erro ao atualizar informações da cliente.');
      setTimeout(() => setClientActionFeedback(null), 4000);
    } finally {
      setIsSavingEditClient(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header com resumo e botão de Nova Cliente - Otimizado para reduzir scroll */}
      <div className="bg-[#FAF6F2] border border-[#EADDCF] p-3.5 sm:p-4 rounded-2xl shadow-2xs relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <span className="text-[#8C6B4F] text-[10px] uppercase tracking-[0.16em] font-bold block">
              CRM & Clientes
            </span>
            <h3 className="font-serif text-lg sm:text-xl text-[#201510] font-bold leading-tight truncate">
              Gestão de Frequência
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewClientModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#201510] text-white text-xs font-bold tracking-wider uppercase hover:bg-[#38261D] transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nova Cliente</span>
            </button>
          </div>
        </div>

        {clientActionFeedback && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{clientActionFeedback}</span>
          </div>
        )}
        
        {/* Cards interativos de filtro com layout otimizado para mobile e desktop */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Card 1: Cadastradas (Todas) */}
          <button
            type="button"
            onClick={() => setFilterStatus('todas')}
            className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              filterStatus === 'todas'
                ? 'bg-white border-2 border-[#201510] shadow-sm ring-2 ring-[#201510]/10'
                : 'bg-white/85 border border-[#E2D6CB] hover:bg-white hover:border-[#D5C2AF] shadow-2xs'
            }`}
          >
            {/* Linha 1: Ícone à esquerda + Número grande à direita */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                filterStatus === 'todas'
                  ? 'bg-[#201510] border-[#201510] text-white shadow-2xs'
                  : 'bg-[#FAF6F2] border-[#EADDCF] text-[#8C6B4F]'
              }`}>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <span className="font-serif text-xl sm:text-2xl font-bold leading-none text-[#201510]">
                {clientes.length}
              </span>
            </div>

            {/* Linha 2: Texto completo sem corte + indicador discreto de filtro ativo */}
            <div className="flex items-center justify-between gap-1 w-full pt-0.5">
              <span className={`text-[10px] sm:text-xs font-bold leading-tight whitespace-nowrap ${
                filterStatus === 'todas' ? 'text-[#201510]' : 'text-[#76685F]'
              }`}>
                Cadastradas
              </span>
              {filterStatus === 'todas' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#201510] shrink-0" title="Filtro Ativo" />
              )}
            </div>
          </button>

          {/* Card 2: Em dia (Ativas) */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'ativa' ? 'todas' : 'ativa')}
            className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              filterStatus === 'ativa'
                ? 'bg-[#F2F8F1] border-2 border-[#2E5828] shadow-sm ring-2 ring-[#2E5828]/15'
                : 'bg-white/85 border border-[#C5DAC1] hover:bg-white hover:border-[#A4C49F] shadow-2xs'
            }`}
          >
            {/* Linha 1: Ícone à esquerda + Número grande à direita */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                filterStatus === 'ativa'
                  ? 'bg-[#2E5828] border-[#2E5828] text-white shadow-2xs'
                  : 'bg-[#EBF4E9] border-[#C5DAC1] text-[#2E5828]'
              }`}>
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <span className="font-serif text-xl sm:text-2xl font-bold leading-none text-[#2E5828]">
                {clientes.filter(c => getStatusInfo(c).status === 'ativa').length}
              </span>
            </div>

            {/* Linha 2: Texto completo sem corte + indicador discreto de filtro ativo */}
            <div className="flex items-center justify-between gap-1 w-full pt-0.5">
              <span className={`text-[10px] sm:text-xs font-bold leading-tight whitespace-nowrap ${
                filterStatus === 'ativa' ? 'text-[#2E5828]' : 'text-[#2E5828]/85'
              }`}>
                Em dia
              </span>
              {filterStatus === 'ativa' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E5828] shrink-0" title="Filtro Ativo" />
              )}
            </div>
          </button>

          {/* Card 3: Pararam (Mais de 30 dias sem agendamento) */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'pararam' ? 'todas' : 'pararam')}
            className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              filterStatus === 'pararam'
                ? 'bg-[#FDF3F0] border-2 border-[#8E4B37] shadow-sm ring-2 ring-[#8E4B37]/15'
                : 'bg-white/85 border border-[#EAD0C8] hover:bg-white hover:border-[#D9B5AA] shadow-2xs'
            }`}
          >
            {/* Linha 1: Ícone à esquerda + Número grande à direita */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                filterStatus === 'pararam'
                  ? 'bg-[#8E4B37] border-[#8E4B37] text-white shadow-2xs'
                  : 'bg-[#FBECE7] border-[#EAD0C8] text-[#8E4B37]'
              }`}>
                <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <span className="font-serif text-xl sm:text-2xl font-bold leading-none text-[#8E4B37]">
                {clientesPararam.length}
              </span>
            </div>

            {/* Linha 2: Texto completo sem corte + indicador discreto de filtro ativo */}
            <div className="flex items-center justify-between gap-1 w-full pt-0.5">
              <span className={`text-[10px] sm:text-xs font-bold leading-tight whitespace-nowrap ${
                filterStatus === 'pararam' ? 'text-[#8E4B37]' : 'text-[#8E4B37]/85'
              }`}>
                Pararam
              </span>
              {filterStatus === 'pararam' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#8E4B37] shrink-0" title="Filtro Ativo" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Banner de Ação Rápida para o Modal de Clientes Pararam (+30 dias) */}
      {clientesPararam.length > 0 && (
        <div className="bg-[#FAF4F2] border border-[#EAD0C8] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#8E4B37] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <UserX className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#8E4B37] truncate">
                {clientesPararam.length} {clientesPararam.length === 1 ? 'cliente está' : 'clientes estão'} no status Pararam (+30 dias)
              </h4>
              <p className="text-[11px] text-[#7A5A50] truncate">
                Clientes sem agendar há mais de 30 dias. Abra o modal para ver a lista e mensagens de reativação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPararamModalOpen(true)}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-[#8E4B37] text-white text-xs font-semibold hover:bg-[#743A2A] transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Abrir Modal Pararam</span>
          </button>
        </div>
      )}

      {/* Need Contact Carousel */}
      {needContact.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold">Precisam de contato</span>
            <span className="text-xs text-[#8A7458]">{needContact.length} clientes</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 scrollbar-none snap-x">
            {needContact.map(c => {
              const info = getStatusInfo(c);
              return (
                <div key={c.id} className="min-w-[240px] sm:min-w-[260px] bg-white rounded-2xl p-3.5 border border-[#EFE7DC] shadow-2xs snap-start shrink-0 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#F9F6F1] flex items-center justify-center text-[#8A7458] font-serif text-base border border-[#EAE2D7] overflow-hidden shrink-0">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.nome} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(c.nome)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-serif text-base text-[#2B2520] leading-tight truncate">{c.nome}</h4>
                      <p className="text-[11px] text-[#8A7458]">{info.status === 'sumida' ? 'Sem retorno' : 'Veio 1 mês só'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#6B5B48] leading-snug mb-3 h-[36px] line-clamp-2">{info.alertMessage}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenHistory(c)}
                      className="flex-1 py-2 rounded-xl border border-[#EAE2D7] text-xs font-semibold text-[#6B5B48] hover:bg-[#F9F6F1] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" /> Histórico
                    </button>
                    <button 
                      onClick={() => window.open(`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=Olá ${c.nome}! Tudo bem? Sentimos sua falta aqui no estúdio...`, '_blank')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chamar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Busca de Clientes - Botões de filtro anteriores removidos conforme solicitação */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#A2907A] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] placeholder:text-[#A2907A] focus:outline-none focus:border-[#9C8259] text-xs sm:text-sm shadow-2xs"
        />
      </div>

      {/* Client List */}
      <div className="space-y-3 pb-8">
        {filteredClientes.map(c => {
          const isExpanded = expandedClientId === c.id;
          const info = getStatusInfo(c);

          const procCounts: Record<string, number> = {};
          c.atendimentos.forEach(a => { procCounts[a.procedimento] = (procCounts[a.procedimento] || 0) + 1; });
          let habitual = 'Vários';
          let maxCount = 0;
          Object.keys(procCounts).forEach(k => {
            if (procCounts[k] > maxCount) { maxCount = procCounts[k]; habitual = k; }
          });

          const totalSpent = c.atendimentos
            .filter(a => a.status !== 'cancelled')
            .reduce((sum, a) => sum + (a.valor || 0), 0);
          
          const averageTicket = c.atendimentos.length > 0 ? totalSpent / c.atendimentos.length : 0;
          const daysSince = c.atendimentos.length > 0 ? diffDays(parseDateStr(c.ultimoAtendimento), today) : null;

          return (
            <div 
              key={c.id} 
              className="bg-white border border-[#EAE0D5] hover:border-[#D5C2AF] rounded-2xl overflow-hidden shadow-2xs transition-all duration-200"
            >
              {/* Card Primary Header Bar - Padrão conforme imagem de referência */}
              <div className="p-4 sm:p-5">
                {/* Linha Superior: Tag com Iniciais + Nome & Status + Telefone + Última Visita */}
                <div className="flex items-start gap-3.5">
                  {/* Tag com a foto ou iniciais da cliente */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-serif text-lg font-bold shrink-0 shadow-2xs overflow-hidden ${
                    c.avatarUrl
                      ? 'border border-[#E2D6CB] p-0 bg-[#F4EDE5]'
                      : info.status === 'ativa'
                      ? 'bg-[#E8EFE6] border border-[#D5E3D2] text-[#2E5828]'
                      : info.status === 'risco'
                      ? 'bg-[#FBF4E6] border border-[#EEDCBA] text-[#8A6427]'
                      : 'bg-[#FBECE7] border border-[#ECCDC5] text-[#8E4B37]'
                  }`}>
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.nome} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(c.nome)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-xl sm:text-2xl text-[#201510] font-bold leading-tight">
                        {c.nome}
                      </h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                        info.status === 'ativa' 
                          ? 'bg-[#EEF3EC] text-[#2E5828]' 
                          : info.status === 'risco' 
                          ? 'bg-[#FBF4E6] text-[#8A6427]' 
                          : 'bg-[#FBECE7] text-[#8E4B37]'
                      }`}>
                        {info.text}
                      </span>
                    </div>

                    {/* Telefone */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-[#201510]" />
                      <a 
                        href={`tel:${c.telefone.replace(/\D/g, '')}`}
                        className="text-xs sm:text-sm font-semibold text-[#201510] hover:text-[#8C6B4F] transition-colors"
                      >
                        {formatPhone(c.telefone)}
                      </a>
                    </div>

                    {/* Última visita */}
                    <p className="text-xs text-[#7A695C] mt-0.5">
                      {c.atendimentos.length > 0 
                        ? `Última visita há ${daysSince} dias (${formatShortDate(c.ultimoAtendimento)})`
                        : 'Nova cliente cadastrada'}
                    </p>
                  </div>
                </div>

                {/* Linha Inferior: Resumo de visitas & procedimento à esquerda | 5 botões de ação à direita */}
                <div className="mt-3.5 pt-3 border-t border-[#F4ECE2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-[#7A695C]">
                      <strong className="font-bold text-[#201510]">{c.atendimentos.length}</strong> {c.atendimentos.length === 1 ? 'visita' : 'visitas'}
                      {totalSpent > 0 && (
                        <span className="text-emerald-700 font-bold ml-1.5">
                          · {formatCurrency(totalSpent)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#7A695C] truncate mt-0.5 max-w-[240px] sm:max-w-xs">
                      {c.atendimentos.length > 0 ? (habitual !== 'Vários' ? habitual : c.atendimentos[0].procedimento) : 'Sem histórico'}
                    </div>
                  </div>

                  {/* Botões de Ação: WhatsApp, Histórico, Registrar (+), Editar, Remover, Abrir Menu Abaixo */}
                  <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center shrink-0">
                    {/* Botão WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `Olá, ${c.nome}! ✨ Tudo bem? Gostaria de agendar seu próximo horário no estúdio? 💕`;
                        window.open(`https://wa.me/55${c.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="w-9 h-9 rounded-xl border border-emerald-300/80 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Botão Histórico */}
                    <button
                      type="button"
                      onClick={() => handleOpenHistory(c)}
                      className="w-9 h-9 rounded-xl border border-[#EAE2D7] bg-white text-[#6B5B48] hover:bg-[#FAF6F2] hover:border-[#D5C2AF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Ver Histórico de Atendimentos"
                    >
                      <History className="w-4 h-4 text-[#6B5B48]" />
                    </button>

                    {/* Botão Registrar Atendimento (+) */}
                    <button
                      type="button"
                      onClick={() => handleQuickAddRecord(c)}
                      className="w-9 h-9 rounded-xl bg-[#201510] text-white hover:bg-[#38261D] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Registrar Novo Atendimento"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Botão Editar Informações da Cliente */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditClient(c)}
                      className="w-9 h-9 rounded-xl border border-[#EAE2D7] bg-white text-[#6B5B48] hover:bg-[#FAF6F2] hover:border-[#D5C2AF] hover:text-[#201510] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Editar informações da cliente"
                    >
                      <Edit2 className="w-4 h-4 text-[#8C6B4F]" />
                    </button>

                    {/* Botão Remover */}
                    <button
                      type="button"
                      onClick={() => setClientToDelete(c)}
                      className="w-9 h-9 rounded-xl border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title="Remover cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Botão para abrir o menu abaixo */}
                    <button
                      type="button"
                      onClick={() => setExpandedClientId(isExpanded ? null : c.id)}
                      className="w-9 h-9 rounded-xl border border-[#EAE2D7] bg-white text-[#6B5B48] hover:bg-[#FAF6F2] hover:border-[#D5C2AF] flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={isExpanded ? 'Fechar menu' : 'Abrir menu abaixo'}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu abaixo / Detalhes expandidos - Padrão da imagem de referência */}
              {isExpanded && (() => {
                const nextApp = getNextAppointment(c);
                return (
                  <div className="px-3.5 sm:px-4 pb-4 pt-3 border-t border-[#F0E8DF] bg-[#FAF7F3] space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Card 1: ÚLTIMO ATENDIMENTO */}
                      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EFE7DC] shadow-2xs">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6B4F] font-bold block mb-1 truncate">
                          Último Atendimento
                        </span>
                        <span className="text-sm sm:text-base text-[#201510] font-bold block truncate">
                          {c.atendimentos.length > 0 ? formatShortDate(c.ultimoAtendimento) : 'Sem atendimentos'}
                        </span>
                        {daysSince !== null ? (
                          <span className="text-xs text-[#7A695C] block mt-0.5 truncate">
                            há {daysSince} dias
                          </span>
                        ) : (
                          <span className="text-xs text-[#7A695C] block mt-0.5">-</span>
                        )}
                      </div>

                      {/* Card 2: PRÓXIMO ATENDIMENTO */}
                      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EFE7DC] shadow-2xs">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6B4F] font-bold block mb-1 truncate">
                          Próximo Atendimento
                        </span>
                        {nextApp ? (
                          <>
                            <span className="text-sm sm:text-base text-[#2E5828] font-bold block truncate">
                              {formatShortDate(nextApp.date)} às {nextApp.startTime}
                            </span>
                            <span className="text-xs text-[#7A695C] block mt-0.5 truncate">
                              {nextApp.serviceNames || 'Procedimento'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm sm:text-base text-stone-600 font-bold block truncate">
                              Nenhum agendado
                            </span>
                            <span className="text-xs text-[#7A695C] block mt-0.5 truncate">
                              Sem horário marcado
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                  {/* Card 5: ATENDIMENTOS RECENTES */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EFE7DC] shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6B4F] font-bold">
                        Atendimentos Recentes
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(c)}
                        className="text-xs text-[#8C6B4F] font-semibold hover:underline cursor-pointer"
                      >
                        Ver todos ({c.atendimentos.length}) →
                      </button>
                    </div>

                    {c.atendimentos.length > 0 ? (
                      <div className="divide-y divide-[#F6EFE8]">
                        {c.atendimentos.slice(0, 3).map((at, i) => (
                          <div key={at.id || i} className="flex items-center justify-between py-2 text-xs sm:text-sm first:pt-0 last:pb-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                              <span className="font-semibold text-[#201510] shrink-0">
                                {formatShortDate(at.data)}
                              </span>
                              <span className="text-[#C4B7AA]">·</span>
                              <span className="text-[#201510] truncate">
                                {at.procedimento}
                              </span>
                            </div>
                            <span className="font-bold text-emerald-700 shrink-0">
                              {formatCurrency(at.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#7A695C] py-1">
                        Nenhum atendimento registrado ainda.
                      </p>
                    )}
                  </div>

                  {/* Card 6: FICHA TÉCNICA & DADOS DA CLIENTE */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EFE7DC] shadow-2xs">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6B4F] font-bold">
                        Ficha Técnica & Informações
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditClient(c)}
                        className="text-xs text-[#8C6B4F] hover:text-[#201510] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Editar Informações</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5]">
                        <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block">Formato Favorito</span>
                        <span className="text-[#201510] font-medium block mt-0.5">{c.formatoUnhas || 'Não especificado'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5]">
                        <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block">Preferências / Cores</span>
                        <span className="text-[#201510] font-medium block mt-0.5">{c.preferencias || 'Nenhuma registrada'}</span>
                      </div>
                      {c.alergias && (
                        <div className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5] sm:col-span-2">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Sensibilidades / Alergias</span>
                          <span className="text-[#201510] font-medium block mt-0.5">{c.alergias}</span>
                        </div>
                      )}
                      {c.observacoes && (
                        <div className="p-2 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5] sm:col-span-2">
                          <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block">Observações</span>
                          <span className="text-[#201510] font-medium block mt-0.5">{c.observacoes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          );
        })}
        {filteredClientes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#EFE7DC] p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF6F2] border border-[#E8DDD2] flex items-center justify-center mx-auto text-[#8C6B4F]">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-[#201510]">
              {clientes.length === 0 ? 'Nenhuma cliente cadastrada ainda' : 'Nenhuma cliente encontrada com esse filtro ou busca'}
            </p>
            <p className="text-xs text-[#8A7458] max-w-sm mx-auto leading-relaxed">
              {clientes.length === 0
                ? 'Novas clientes aparecerão aqui automaticamente quando realizarem um agendamento ou quando você cadastrar uma manualmente pelo botão "Cadastrar Cliente".'
                : 'Tente alterar os termos de busca ou limpar os filtros de status.'}
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TELA CHEIA: HISTÓRICO & FICHA TÉCNICA DA CLIENTE             */}
      {/* ============================================================ */}
      {selectedClientForHistory && (() => {
        const nextApp = getNextAppointment(selectedClientForHistory);
        return (
          <div className="fixed inset-0 z-50 bg-[#FAF6F2] flex flex-col animate-fade-in overflow-hidden w-full h-full">
            {/* Header Tela Cheia */}
            <div className="p-4 sm:p-5 border-b border-[#EAE2D7] bg-white flex items-center justify-between shadow-2xs shrink-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#F4EDE5] text-[#8C6B4F] flex items-center justify-center font-serif text-xl sm:text-2xl font-bold border border-[#E2D6CB] shrink-0 overflow-hidden">
                  {selectedClientForHistory.avatarUrl ? (
                    <img src={selectedClientForHistory.avatarUrl} alt={selectedClientForHistory.nome} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(selectedClientForHistory.nome)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-xl sm:text-2xl text-[#201510] font-bold leading-tight truncate">
                      {selectedClientForHistory.nome}
                    </h3>
                    {(() => {
                      const st = getStatusInfo(selectedClientForHistory);
                      const cl = statusColors[st.status];
                      return (
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${cl.bg} ${cl.text}`}>
                          {st.text}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-[#7A695C] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#201510]">{selectedClientForHistory.telefone}</span>
                    <span>·</span>
                    <span>Cliente desde {formatShortDate(selectedClientForHistory.clienteDesde)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditClient(selectedClientForHistory)}
                  className="px-3 py-2 text-xs font-semibold text-[#201510] bg-[#FAF6F2] hover:bg-[#F3EAE0] rounded-xl transition-colors cursor-pointer border border-[#E2D6CB] flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Editar informações da cliente"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  <span className="hidden sm:inline">Editar Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClientToDelete(selectedClientForHistory)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
                  title="Excluir cliente do sistema"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClientForHistory(null)}
                  className="p-2 text-[#7A695C] hover:text-[#201510] hover:bg-[#EFE8DF] rounded-xl transition-colors cursor-pointer border border-[#E2D6CB]"
                  title="Fechar histórico"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metrics Bar - Substituído Ticket Médio para Próximo Atendimento */}
            <div className="p-3 sm:p-4 bg-[#F5EFE8]/80 border-b border-[#EAE2D7] shrink-0">
              <div className="max-w-4xl w-full mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center text-xs">
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E2D6CB] shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold text-[#8C6B4F] tracking-wider block mb-0.5 truncate">Visitas</span>
                  <span className="font-serif text-base sm:text-xl font-bold text-[#201510]">
                    {selectedClientAppointments.length}
                  </span>
                </div>
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E2D6CB] shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold text-[#8C6B4F] tracking-wider block mb-0.5 truncate">Total Gasto</span>
                  <span className="font-serif text-base sm:text-xl font-bold text-[#2E5828]">
                    {formatCurrency(clientTotalSpent)}
                  </span>
                </div>
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E2D6CB] shadow-2xs">
                  <span className="text-[9.5px] uppercase font-bold text-[#8C6B4F] tracking-wider block mb-0.5 truncate">Próximo Atendimento</span>
                  <span className="font-serif text-xs sm:text-sm font-bold text-[#2E5828] mt-0.5 block truncate">
                    {nextApp ? `${formatShortDate(nextApp.date)} às ${nextApp.startTime}` : 'Sem agendamento'}
                  </span>
                </div>
                <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-[#E2D6CB] shadow-2xs text-left sm:text-center">
                  <span className="text-[9.5px] uppercase font-bold text-[#8C6B4F] tracking-wider block mb-0.5 truncate">Último Atendimento</span>
                  {lastAttendanceRecord ? (
                    <div>
                      <span className="font-serif text-xs sm:text-sm font-bold text-[#201510] mt-0.5 block truncate">
                        {formatShortDate(lastAttendanceRecord.date)}
                      </span>
                      <span className="text-[10px] text-[#7A695C] block truncate font-medium" title={`${lastAttendanceRecord.serviceNames || 'Procedimento'} • ${formatCurrency(lastAttendanceRecord.price || 0)}`}>
                        {lastAttendanceRecord.serviceNames || 'Procedimento'}
                      </span>
                    </div>
                  ) : (
                    <span className="font-serif text-xs sm:text-sm font-bold text-[#7A695C] mt-0.5 block truncate">
                      {selectedClientForHistory.ultimoAtendimento ? formatShortDate(selectedClientForHistory.ultimoAtendimento) : 'Sem registros'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo do Histórico de Atendimentos */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="max-w-4xl w-full mx-auto space-y-4">
                {/* Card de Ficha Técnica da Cliente */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5DACF] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#8C6B4F] block">
                        Ficha Cadastral & Preferências
                      </span>
                      <h4 className="font-serif text-base font-bold text-[#201510]">
                        Informações da Cliente
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditClient(selectedClientForHistory)}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F3EAE0] text-[#7A5A50] hover:text-[#201510] border border-[#E2D6CB] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span>Editar Informações</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5]">
                      <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">Formato de Unhas</span>
                      <span className="text-sm font-bold text-[#201510] block">{selectedClientForHistory.formatoUnhas || 'Não informado'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5]">
                      <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">Preferências & Estilo</span>
                      <span className="text-xs text-[#201510] font-medium block leading-relaxed">{selectedClientForHistory.preferencias || 'Nenhuma preferência registrada'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5] sm:col-span-2 md:col-span-1">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Alergias / Restrições</span>
                      <span className="text-xs text-[#201510] font-medium block leading-relaxed">{selectedClientForHistory.alergias || 'Nenhuma restrição informada'}</span>
                    </div>
                  </div>

                  {selectedClientForHistory.observacoes && (
                    <div className="p-3 rounded-xl bg-[#FAF7F4] border border-[#EAE0D5] text-xs">
                      <span className="text-[10px] font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">Observações Internas</span>
                      <p className="text-xs text-[#3D2E24] leading-relaxed whitespace-pre-line">{selectedClientForHistory.observacoes}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] font-bold text-[#8C6B4F]">
                      Histórico Cronológico
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecordId(null);
                        setRecordForm({
                          date: new Date().toISOString().split('T')[0],
                          startTime: '10:00',
                          serviceNames: services[0]?.name || 'Alongamento em Gel',
                          price: services[0]?.price || 150,
                          status: 'completed',
                          notes: ''
                        });
                        setIsRecordModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#201510] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#38261D] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Atendimento
                    </button>
                  </div>

                  {selectedClientAppointments.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-[#E2D6CB] p-6 space-y-3">
                      <CalendarIcon className="w-9 h-9 text-[#8C6B4F] mx-auto opacity-50" />
                      <div>
                        <p className="text-sm font-medium text-[#201510]">Nenhum procedimento registrado ainda.</p>
                        <p className="text-xs text-[#7A695C] mt-0.5">Registre atendimentos passados ou atuais para manter a ficha atualizada.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRecordId(null);
                          setIsRecordModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#8C6B4F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#72553E] transition-colors"
                      >
                        + Registrar Primeiro Atendimento
                      </button>
                    </div>
                  ) : (
                    selectedClientAppointments.map((app, index) => {
                      const statusMap: Record<string, { label: string; bg: string; text: string }> = {
                        completed: { label: 'Concluído', bg: 'bg-[#EEF3EC]', text: 'text-[#2E5828]' },
                        confirmed: { label: 'Confirmado', bg: 'bg-[#EBF2F7]', text: 'text-[#1E4D6E]' },
                        pending: { label: 'Pendente', bg: 'bg-[#FBF4E6]', text: 'text-[#8A6427]' },
                        cancelled: { label: 'Cancelado', bg: 'bg-[#F7EDE8]', text: 'text-[#8E4B37]' }
                      };
                      const st = statusMap[app.status] || statusMap.completed;

                      return (
                        <div 
                          key={app.id || index}
                          className="bg-white p-4 rounded-2xl border border-[#E5DACF] shadow-2xs transition-all hover:border-[#D1BEAF]"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs text-[#8C6B4F] font-semibold mb-1">
                                <CalendarCheck className="w-3.5 h-3.5" />
                                <span>{formatFullDate(app.date)}</span>
                              </div>
                              <h4 className="font-serif text-base sm:text-lg text-[#201510] font-bold leading-snug">
                                {app.serviceNames || 'Procedimento'}
                              </h4>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 ${st.bg} ${st.text}`}>
                                {st.label}
                              </span>
                              <span className="block font-serif text-base font-bold text-[#201510]">
                                {formatCurrency(app.price || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-[#7A695C] pt-2 border-t border-[#F4EDE5] mt-2">
                            <div className="flex items-center gap-2">
                              {app.startTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                                  {app.startTime}
                                </span>
                              )}
                              {app.notes && (
                                <span className="text-[11px] text-[#8C6B4F] italic">
                                  Obs: {app.notes}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditRecord(app)}
                                className="p-1.5 text-[#7A695C] hover:text-[#201510] hover:bg-[#F5EFE8] rounded-lg transition-colors"
                                title="Editar Atendimento"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(app.id)}
                                className="p-1.5 text-[#8E4B37] hover:bg-[#FBF0EA] rounded-lg transition-colors"
                                title="Excluir Atendimento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#EAE2D7] shrink-0">
              <div className="max-w-4xl w-full mx-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = selectedClientForHistory.telefone.replace(/\D/g, '');
                    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversar no WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClientForHistory(null)}
                  className="py-3 px-5 rounded-xl border border-[#E2D6CB] hover:bg-[#F5EFE8] text-[#201510] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* MODAL: ADICIONAR / EDITAR ATENDIMENTO NO HISTÓRICO          */}
      {/* ============================================================ */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl border border-[#EADDCF] shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE2D7] mb-4">
              <div>
                <h4 className="font-serif text-lg sm:text-xl font-bold text-[#201510]">
                  {editingRecordId ? 'Editar Atendimento' : 'Registrar Atendimento'}
                </h4>
                <p className="text-[11px] text-[#8C6B4F]">
                  Selecione os procedimentos e serviços complementares realizados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 text-[#8C6B4F] hover:bg-[#F5EFE8] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              {/* Seleção de Procedimentos Principais */}
              <div className="bg-[#FAF7F4] border border-[#EAE0D5] rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span>1. Procedimento Principal</span>
                  </label>
                  <span className="text-[10px] text-stone-400">
                    Toque para selecionar
                  </span>
                </div>

                {services.length === 0 ? (
                  <p className="text-xs text-stone-500 italic p-3 bg-white rounded-xl border border-[#E5DACF]">
                    Nenhum procedimento cadastrado no sistema. Cadastre procedimentos na aba Serviços.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {services.map(s => {
                      const isSelected = recordForm.serviceNames.toLowerCase().includes(s.name.toLowerCase());
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectBaseProcedure(s)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-white border-[#8C6B4F] text-[#201510] shadow-2xs ring-1 ring-[#8C6B4F]/30'
                              : 'bg-white/70 border-[#E5DACF] text-stone-700 hover:bg-white hover:border-[#D4C3B5]'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-[11.5px] block truncate text-[#201510]">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {s.durationMinutes} min
                            </span>
                          </div>
                          <span className="font-serif font-bold text-xs text-[#8C6B4F] shrink-0">
                            R$ {s.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seleção de Serviços Complementares Cadastrados */}
              {allAvailableComplements.length > 0 && (
                <div className="bg-[#FAF7F4] border border-[#EAE0D5] rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#8C6B4F] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span>2. Serviços Complementares</span>
                    </label>
                    <span className="text-[10px] text-stone-400">
                      Opcional (adiciona ao valor)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {allAvailableComplements.map((comp, compIdx) => {
                      const isSelected = recordForm.serviceNames.toLowerCase().includes(comp.name.toLowerCase());
                      return (
                        <button
                          key={comp.id ? `${comp.id}-${compIdx}` : `comp-${compIdx}`}
                          type="button"
                          onClick={() => handleToggleComplementInRecord(comp)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-white border-[#8C6B4F] text-[#201510] shadow-2xs ring-1 ring-[#8C6B4F]/30'
                              : 'bg-white/70 border-[#E5DACF] text-stone-700 hover:bg-white hover:border-[#D4C3B5]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                              isSelected
                                ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white'
                                : 'bg-white border-[#D4C3B5] text-transparent'
                            }`}>
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span className="font-medium text-[11px] truncate text-[#201510]">
                              {comp.name}
                            </span>
                          </div>
                          <span className="font-serif font-bold text-xs text-[#8C6B4F] shrink-0">
                            +R$ {comp.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Descrição Final do Procedimento (Editável manualmente se necessário) */}
              <div>
                <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                  Descrição do Atendimento
                </label>
                <input
                  type="text"
                  required
                  value={recordForm.serviceNames}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, serviceNames: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] focus:outline-none focus:border-[#8C6B4F] bg-white"
                  placeholder="Ex: Alongamento em Gel + Nail Art..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={recordForm.date}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={recordForm.startTime}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0,00"
                      value={formatNumberToCurrencyString(recordForm.price)}
                      onChange={(e) => {
                        const formatted = formatCurrencyFromDigits(e.target.value);
                        const num = parseCurrencyStringToNumber(formatted);
                        setRecordForm(prev => ({ ...prev, price: num }));
                      }}
                      className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-[#EAE2D7] text-sm font-bold text-[#201510] focus:outline-none focus:border-[#8C6B4F]"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={recordForm.status}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] bg-white"
                  >
                    <option value="completed">Concluído</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendente</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                  Observações Técnicas do Atendimento
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cor vermelha, formato amendoado, ótima aderência..."
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-xs text-[#201510] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAE2D7] text-xs font-bold text-[#6B5B48]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#201510] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#38261D]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CADASTRAR NOVA CLIENTE                                */}
      {/* ============================================================ */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl border border-[#EADDCF] shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE2D7] mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8C6B4F] tracking-wider block">
                  CRM Nails
                </span>
                <h4 className="font-serif text-xl font-bold text-[#201510]">
                  Cadastrar Nova Cliente
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-2 text-[#8C6B4F] hover:bg-[#F5EFE8] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Opção de Adicionar / Remover Imagem da Cliente */}
              <div className="flex items-center gap-3.5 p-3 bg-[#FAF7F4] rounded-2xl border border-[#EAE0D5]">
                <div className="w-14 h-14 rounded-2xl bg-[#F4EDE5] border border-[#E2D6CB] flex items-center justify-center font-serif text-xl font-bold text-[#8C6B4F] shrink-0 overflow-hidden shadow-2xs relative">
                  {newClientForm.avatarUrl ? (
                    <img 
                      src={newClientForm.avatarUrl} 
                      alt="Foto da cliente" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span>{getInitials(newClientForm.name || 'Nova Cliente')}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[11px] text-[#201510] uppercase tracking-wider mb-1">
                    Foto da Cliente
                  </p>
                  <p className="text-[10px] text-[#7A695C] mb-2 leading-tight">
                    {newClientForm.avatarUrl 
                      ? 'Foto adicionada. Você pode alterá-la ou removê-la abaixo.' 
                      : 'Opcional. Se não adicionar foto, as iniciais da cliente serão exibidas.'}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-3 py-1.5 rounded-xl bg-white border border-[#D4C3B5] text-[#201510] font-semibold text-[11px] hover:bg-[#F5EFE8] cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span>{newClientForm.avatarUrl ? 'Alterar foto' : 'Adicionar foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setNewClientForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {newClientForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setNewClientForm(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Silveira"
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] focus:border-[#8C6B4F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    placeholder="(27) 99999-9999"
                    maxLength={15}
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, phone: formatPhoneMask(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] focus:border-[#8C6B4F] outline-none"
                  />
                </div>
              </div>

              {/* Toggle para primeiro atendimento com procedimentos cadastrados */}
              <div className="pt-3 border-t border-[#F4EDE5]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newClientForm.includeFirstAppointment}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const initialService = services[0];
                      setNewClientForm(prev => ({ 
                        ...prev, 
                        includeFirstAppointment: checked,
                        serviceNames: checked && !prev.serviceNames ? (initialService?.name || '') : prev.serviceNames,
                        price: checked && !prev.price ? (initialService?.price || 0) : prev.price
                      }));
                    }}
                    className="w-4 h-4 rounded text-[#201510] border-[#EADDCF] focus:ring-0"
                  />
                  <span className="font-bold text-[#8C6B4F] uppercase tracking-wider text-[11px]">
                    Registrar primeiro atendimento agora?
                  </span>
                </label>

                {newClientForm.includeFirstAppointment && (
                  <div className="mt-3 p-3 bg-[#FAF6F2] rounded-2xl border border-[#EADDCF] space-y-2.5 animate-fade-in">
                    <div>
                      <label className="text-[10.5px] font-semibold text-[#8C6B4F] block mb-1">
                        Procedimento Cadastrado *
                      </label>
                      {services.length === 0 ? (
                        <p className="text-xs text-stone-500 italic p-2 bg-white rounded-xl border border-[#EAE2D7]">
                          Nenhum procedimento cadastrado no sistema.
                        </p>
                      ) : (
                        <select
                          value={newClientForm.serviceNames}
                          onChange={(e) => {
                            const selectedName = e.target.value;
                            const matched = services.find(s => s.name === selectedName);
                            setNewClientForm(prev => ({
                              ...prev,
                              serviceNames: selectedName,
                              price: matched ? matched.price : prev.price
                            }));
                          }}
                          className="w-full p-2 rounded-xl border border-[#EAE2D7] text-xs text-[#201510] bg-white focus:outline-none focus:border-[#8C6B4F]"
                        >
                          <option value="">Selecione um procedimento cadastrado...</option>
                          {services.map(s => (
                            <option key={s.id} value={s.name}>
                              {s.name} - R$ {s.price} ({s.durationMinutes} min)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10.5px] font-semibold text-[#8C6B4F] block mb-1">Data</label>
                        <input
                          type="date"
                          value={newClientForm.date}
                          onChange={(e) => setNewClientForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full p-2 rounded-xl border border-[#EAE2D7] text-xs text-[#201510] bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10.5px] font-semibold text-[#8C6B4F] block mb-1">Valor (R$)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-stone-400 text-xs font-semibold">R$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={formatNumberToCurrencyString(newClientForm.price)}
                            onChange={(e) => {
                              const formatted = formatCurrencyFromDigits(e.target.value);
                              const num = parseCurrencyStringToNumber(formatted);
                              setNewClientForm(prev => ({ ...prev, price: num }));
                            }}
                            className="w-full pl-8 pr-2 py-2 rounded-xl border border-[#EAE2D7] text-xs font-semibold text-[#201510] bg-white focus:outline-none focus:border-[#8C6B4F]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                  Observações Gerais
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Veio por indicação, prefere atendimento à tarde..."
                  value={newClientForm.notes}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-xs text-[#201510] focus:border-[#8C6B4F] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#F4EDE5]">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAE2D7] text-xs font-bold text-[#6B5B48] hover:bg-[#FAF6F2] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#201510] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#38261D] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar Cliente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDITAR INFORMAÇÕES DA CLIENTE                         */}
      {/* ============================================================ */}
      {isEditClientModalOpen && editingClient && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-[#EADDCF] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#EAE2D7] bg-[#FAF6F2] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6B4F] font-bold block">
                  CRM Nails & Ficha Técnica
                </span>
                <h3 className="font-serif text-lg sm:text-xl text-[#201510] font-bold">
                  Editar Informações da Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditClientModalOpen(false)}
                className="p-2 text-[#7A695C] hover:text-[#201510] rounded-xl hover:bg-[#EFE8DF] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleSaveEditClient} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Foto de Perfil */}
              <div>
                <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-2">
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4EDE5] text-[#8C6B4F] flex items-center justify-center font-serif text-lg font-bold border border-[#E2D6CB] shrink-0 overflow-hidden relative shadow-2xs">
                    {editClientForm.avatarUrl ? (
                      <img 
                        src={editClientForm.avatarUrl} 
                        alt="Foto da cliente" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      getInitials(editClientForm.name || 'Cliente')
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3 py-2 rounded-xl border border-[#E2D6CB] bg-[#FAF6F2] hover:bg-[#F3EAE0] text-[#201510] text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs active:scale-95">
                      <Camera className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span>{editClientForm.avatarUrl ? 'Trocar Foto' : 'Adicionar Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setEditClientForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    {editClientForm.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditClientForm(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-2.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nome e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome da cliente"
                    value={editClientForm.name}
                    onChange={(e) => setEditClientForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] focus:border-[#8C6B4F] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    value={editClientForm.phone}
                    onChange={(e) => setEditClientForm(prev => ({ ...prev, phone: formatPhoneMask(e.target.value) }))}
                    className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-sm text-[#201510] focus:border-[#8C6B4F] outline-none"
                  />
                </div>
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="font-bold text-[#8C6B4F] uppercase tracking-wider block mb-1">
                  Observações da Cliente
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Anotações internas, preferências gerais ou detalhes sobre a cliente..."
                  value={editClientForm.notes}
                  onChange={(e) => setEditClientForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#EAE2D7] text-xs text-[#201510] focus:border-[#8C6B4F] outline-none"
                />
              </div>

              {/* Ações / Botões */}
              <div className="flex gap-2 pt-3 border-t border-[#F4EDE5]">
                <button
                  type="button"
                  disabled={isSavingEditClient}
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAE2D7] text-xs font-bold text-[#6B5B48] hover:bg-[#FAF6F2] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditClient}
                  className="flex-1 py-2.5 rounded-xl bg-[#201510] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#38261D] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingEditClient ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CLIENTES QUE PARARAM (+30 DIAS SEM AGENDAMENTO)       */}
      {/* ============================================================ */}
      {isPararamModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#EAD0C8] overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#F0E4E0] bg-[#FAF5F3] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8E4B37] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#35201A]">
                      Clientes que Pararam
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F5DFD8] text-[#8E4B37] font-bold">
                      {clientesPararam.length}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A5A50] mt-0.5">
                    Clientes há mais de 30 dias sem agendamento no estúdio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPararamModalOpen(false)}
                className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Pesquisa rápida no modal */}
            <div className="p-3 sm:p-4 border-b border-stone-100 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={pararamSearch}
                  onChange={(e) => setPararamSearch(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:border-[#8E4B37] bg-stone-50/50 text-[#201510]"
                />
              </div>
            </div>

            {/* Lista de Clientes que Pararam */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
              {filteredClientesPararam.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5DFD8] text-[#8E4B37] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-serif font-bold text-stone-800 text-base">
                    Nenhuma cliente nesta condição
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    {pararamSearch
                      ? 'Nenhum resultado encontrado para a busca informada.'
                      : 'Todas as suas clientes estão com agendamentos em dia ou dentro do período de 30 dias.'}
                  </p>
                </div>
              ) : (
                filteredClientesPararam.map(c => {
                  const info = getStatusInfo(c);
                  const cleanPhone = cleanPhoneNumber(c.telefone);
                  const reativacaoMsg = `Olá ${c.nome}! ✨ Tudo bem? Sentimos sua falta aqui no estúdio da Gabriela Santos! Suas unhas devem estar precisando de manutenção. Que tal agendarmos seu horário essa semana? 💕`;
                  const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(reativacaoMsg)}`;

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 sm:p-4 rounded-2xl border border-[#EAD0C8] bg-white hover:border-[#D8B4A8] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Dados da cliente */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#FBECE7] text-[#8E4B37] flex items-center justify-center font-serif text-base font-bold border border-[#ECCDC5] shrink-0 overflow-hidden">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.nome} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(c.nome)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-base text-[#201510] truncate">
                              {c.nome}
                            </h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FBECE7] text-[#8E4B37]">
                              {info.daysSince ? `Há ${info.daysSince} dias sem agendar` : 'Sem visitas'}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-stone-800">{formatPhoneMask(c.telefone)}</span>
                            <span>•</span>
                            <span>
                              {c.ultimoAtendimento 
                                ? `Última visita: ${formatShortDate(c.ultimoAtendimento)}` 
                                : 'Nenhum atendimento anterior'}
                            </span>
                          </p>

                          {c.atendimentos.length > 0 && c.atendimentos[0] && (
                            <p className="text-[11px] text-[#8C6B4F] mt-0.5 truncate">
                              Último serviço: <strong>{c.atendimentos[0].procedimento}</strong> ({formatCurrency(c.atendimentos[0].valor)})
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1EBE5D] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title="Enviar mensagem de reativação pelo WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reativar no WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPararamModalOpen(false);
                            handleOpenHistory(c);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#FAF6F2] hover:bg-[#F3EAE0] text-[#7A5A50] hover:text-[#35201A] border border-[#E2D6CB] text-xs font-semibold transition-colors cursor-pointer"
                          title="Ver Ficha e Histórico Completo"
                        >
                          Ficha
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
              <span>{filteredClientesPararam.length} de {clientesPararam.length} clientes exibidas</span>
              <button
                type="button"
                onClick={() => setIsPararamModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE                    */}
      {/* ============================================================ */}
      {clientToDelete && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="bg-white w-full max-w-md rounded-3xl border border-[#EADDCF] shadow-2xl p-6 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h4 className="font-serif text-xl font-bold text-[#201510] mb-2">
              Excluir Cliente?
            </h4>

            <p className="text-sm text-[#6B5B48] leading-relaxed mb-5">
              Tem certeza que deseja remover <strong className="text-[#201510] font-bold">{clientToDelete.nome}</strong> ({clientToDelete.telefone})?
              Esta ação excluirá permanentemente todos os atendimentos, anotações de ficha técnica e dados históricos desta cliente.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#EAE2D7] text-xs font-bold text-[#6B5B48] hover:bg-[#FAF6F2] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={handleConfirmDeleteClient}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingClient ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
