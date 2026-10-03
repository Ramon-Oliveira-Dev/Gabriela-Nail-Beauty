import React, { useState, useEffect, useMemo } from 'react';
import { useStore, sanitizeWorkingHours } from '../StoreContext';
import { Block, WorkingDay } from '../types';
import { formatDate, formatPhoneMask } from '../utils';
import { 
  X, 
  Check, 
  MapPin, 
  Phone, 
  Instagram, 
  ExternalLink, 
  Utensils, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  Clock, 
  AlertCircle,
  Layers,
  ChevronRight,
  Plus,
  Minus,
  Sliders,
  Sparkles,
  Trash2
} from 'lucide-react';

export interface ConfigAdminViewProps {
  initialTab?: 'horarios' | 'bloqueios' | 'estudio';
}

export const ConfigAdminView: React.FC<ConfigAdminViewProps> = ({ initialTab = 'horarios' }) => {
  const { config, setConfig, blocks, setBlocks, syncWithSupabase, isSupabaseConnected } = useStore();
  const [activeTab, setActiveTab] = useState<'horarios' | 'bloqueios' | 'estudio'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Estado para tipo de bloqueio: 'dias_especificos' | 'semana' | 'mes'
  const [blockScope, setBlockScope] = useState<'dias_especificos' | 'semana' | 'mes'>('dias_especificos');
  const [isFullDay, setIsFullDay] = useState(true);
  
  // Para seleção de múltiplos dias específicos
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateInputVal, setDateInputVal] = useState('');
  
  // Para seleção de semana inteira (data inicial e data final calculada)
  const [weekStartDate, setWeekStartDate] = useState('');
  
  // Para seleção de um ou múltiplos meses inteiros
  const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonths, setSelectedMonths] = useState<string[]>([currentYearMonth]);
  const [monthInputVal, setMonthInputVal] = useState(currentYearMonth);

  // Horários e motivo do bloqueio
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('18:00');
  const [blockReason, setBlockReason] = useState('');
  const [blockSuccessMsg, setBlockSuccessMsg] = useState<string | null>(null);
  const [blockErrorMsg, setBlockErrorMsg] = useState<string | null>(null);

  // Modal de confirmação in-app para exclusão de bloqueios (sem window.confirm)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'all' | 'selected' | 'single';
    blockId?: string;
    count: number;
  } | null>(null);

  // Estados para edição dos dados do estúdio
  const [studioAddress, setStudioAddress] = useState(config.address || '');
  const [studioWhatsapp, setStudioWhatsapp] = useState(config.whatsapp || '');
  const [studioInstagram, setStudioInstagram] = useState(config.instagram || '');
  const [studioPublicUrl, setStudioPublicUrl] = useState(config.publicUrl || '');
  const [procedureInterval, setProcedureInterval] = useState<number>(config.procedureIntervalMinutes ?? 10);
  const [studioSavedToast, setStudioSavedToast] = useState(false);
  const [hoursSavedToast, setHoursSavedToast] = useState(false);
  const [isSavingHours, setIsSavingHours] = useState(false);

  useEffect(() => {
    setStudioAddress(config.address || '');
    setStudioWhatsapp(config.whatsapp || '');
    setStudioInstagram(config.instagram || '');
    setStudioPublicUrl(config.publicUrl || '');
    setProcedureInterval(config.procedureIntervalMinutes ?? 10);
  }, [config]);

  const safeWorkingHours = useMemo(() => sanitizeWorkingHours(config.workingHours), [config.workingHours]);

  const handleSaveWorkingHours = async () => {
    const sanitized = sanitizeWorkingHours(config.workingHours);
    if (sanitized.length < 7) {
      return;
    }
    setIsSavingHours(true);
    setConfig({ ...config, workingHours: sanitized });
    try {
      if (syncWithSupabase) {
        await syncWithSupabase();
      }
    } catch (err) {
      console.warn('Erro ao salvar horários no Supabase:', err);
    } finally {
      setIsSavingHours(false);
      setHoursSavedToast(true);
      setTimeout(() => setHoursSavedToast(false), 3500);
    }
  };

  const handleSaveStudioInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig({
      ...config,
      address: studioAddress.trim(),
      whatsapp: studioWhatsapp.trim(),
      instagram: studioInstagram.trim(),
      publicUrl: studioPublicUrl.trim(),
      procedureIntervalMinutes: Number(procedureInterval),
    });
    setStudioSavedToast(true);
    setTimeout(() => {
      setStudioSavedToast(false);
    }, 3500);
  };

  const handleDayChange = (index: number, changes: Partial<WorkingDay>) => {
    const newHours = [...safeWorkingHours];
    newHours[index] = { ...newHours[index], ...changes };
    setConfig({ ...config, workingHours: newHours });
  };

  // Helper para adicionar data individual à lista de múltiplos dias
  const handleAddDateToSelection = (dStr: string) => {
    if (!dStr) return;
    if (!selectedDates.includes(dStr)) {
      setSelectedDates([...selectedDates, dStr].sort());
    }
    setDateInputVal('');
  };

  const handleRemoveDateFromSelection = (dStr: string) => {
    setSelectedDates(selectedDates.filter(d => d !== dStr));
  };

  // Helpers para seleção de múltiplos meses
  const formatMonthYearLabel = (yearMonth: string) => {
    if (!yearMonth) return { label: '', shortLabel: '', totalDays: 0, year: '', monthNum: 0 };
    const [y, m] = yearMonth.split('-').map(Number);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const totalDays = new Date(y, m, 0).getDate();
    return {
      label: `${months[m - 1]} de ${y}`,
      shortLabel: `${months[m - 1].slice(0, 3)}/${String(y).slice(2)}`,
      totalDays,
      year: String(y),
      monthNum: m
    };
  };

  const handleToggleMonth = (ym: string) => {
    if (selectedMonths.includes(ym)) {
      setSelectedMonths(selectedMonths.filter(m => m !== ym));
    } else {
      setSelectedMonths([...selectedMonths, ym].sort());
    }
  };

  const handleAddMonthToSelection = (ym: string) => {
    if (!ym) return;
    if (!selectedMonths.includes(ym)) {
      setSelectedMonths([...selectedMonths, ym].sort());
    }
  };

  const handleRemoveMonthFromSelection = (ym: string) => {
    setSelectedMonths(selectedMonths.filter(m => m !== ym));
  };

  const upcomingMonths = useMemo(() => {
    const result: { ym: string; label: string; shortLabel: string; totalDays: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const info = formatMonthYearLabel(ym);
      result.push({ ym, label: info.label, shortLabel: info.shortLabel, totalDays: info.totalDays });
    }
    return result;
  }, []);

  const totalDaysInSelectedMonths = useMemo(() => {
    return selectedMonths.reduce((acc, ym) => {
      const [y, m] = ym.split('-').map(Number);
      return acc + (new Date(y, m, 0).getDate() || 0);
    }, 0);
  }, [selectedMonths]);

  // Criação dos bloqueios conforme escopo selecionado
  const handleCreateBlocks = (e: React.FormEvent) => {
    e.preventDefault();
    setBlockErrorMsg(null);
    let datesToBlock: string[] = [];

    if (blockScope === 'dias_especificos') {
      if (dateInputVal && !selectedDates.includes(dateInputVal)) {
        datesToBlock = [...selectedDates, dateInputVal].sort();
      } else {
        datesToBlock = [...selectedDates];
      }

      if (datesToBlock.length === 0) {
        setBlockErrorMsg('Por favor, selecione ao menos um dia para bloquear.');
        return;
      }
    } else if (blockScope === 'semana') {
      if (!weekStartDate) {
        setBlockErrorMsg('Por favor, selecione a data inicial da semana.');
        return;
      }
      const [y, m, d] = weekStartDate.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      for (let i = 0; i < 7; i++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + i);
        const curStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        datesToBlock.push(curStr);
      }
    } else if (blockScope === 'mes') {
      let monthsToProcess = [...selectedMonths];
      if (monthsToProcess.length === 0 && monthInputVal) {
        monthsToProcess = [monthInputVal];
      }
      if (monthsToProcess.length === 0) {
        setBlockErrorMsg('Por favor, selecione ao menos um mês para bloquear.');
        return;
      }
      for (const mStr of monthsToProcess) {
        const [y, m] = mStr.split('-').map(Number);
        const totalDays = new Date(y, m, 0).getDate();
        for (let day = 1; day <= totalDays; day++) {
          const curStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          datesToBlock.push(curStr);
        }
      }
      datesToBlock = Array.from(new Set(datesToBlock)).sort();
    }

    if (!isFullDay && (!blockStartTime || !blockEndTime)) {
      setBlockErrorMsg('Preencha o horário de início e término do bloqueio.');
      return;
    }

    // Criar os registros de bloqueio
    const newBlocks: Block[] = datesToBlock.map(date => ({
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      date,
      isFullDay,
      startTime: isFullDay ? undefined : blockStartTime,
      endTime: isFullDay ? undefined : blockEndTime,
      reason: blockReason.trim() || undefined
    }));

    // Remove eventuais bloqueios idênticos pré-existentes para evitar duplicações
    const updatedBlocks = [
      ...blocks.filter(b => !datesToBlock.includes(b.date) || (isFullDay ? false : !b.isFullDay)),
      ...newBlocks
    ];

    setBlocks(updatedBlocks);
    setSelectedDates([]);
    setDateInputVal('');
    setBlockReason('');
    setBlockSuccessMsg(`${newBlocks.length} dia(s) bloqueado(s) com sucesso!`);
    setTimeout(() => setBlockSuccessMsg(null), 3500);
  };

  // Gerenciamento de seleção múltipla para exclusão de bloqueios
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedBlockIds(prev => prev.filter(id => blocks.some(b => b.id === id)));
  }, [blocks]);

  const handleToggleBlockSelection = (blockId: string) => {
    setSelectedBlockIds(prev =>
      prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
    );
  };

  const handleSelectAllBlocks = () => {
    if (selectedBlockIds.length === blocks.length) {
      setSelectedBlockIds([]);
    } else {
      setSelectedBlockIds(blocks.map(b => b.id));
    }
  };

  // Acionadores do modal de confirmação in-app
  const handleOpenDeleteSelectedModal = () => {
    if (selectedBlockIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      type: 'selected',
      count: selectedBlockIds.length
    });
  };

  const handleOpenDeleteAllModal = () => {
    if (blocks.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      type: 'all',
      count: blocks.length
    });
  };

  const handleOpenDeleteSingleModal = (blockId: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      type: 'single',
      blockId,
      count: 1
    });
  };

  // Confirmação final da exclusão
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return;

    if (deleteConfirmModal.type === 'all') {
      const totalDeleted = blocks.length;
      setBlocks([]);
      setSelectedBlockIds([]);
      setBlockSuccessMsg(`Todos os ${totalDeleted} bloqueios foram apagados com sucesso!`);
    } else if (deleteConfirmModal.type === 'selected') {
      const totalDeleted = selectedBlockIds.length;
      setBlocks(blocks.filter(b => !selectedBlockIds.includes(b.id)));
      setSelectedBlockIds([]);
      setBlockSuccessMsg(`${totalDeleted} bloqueio(s) apagado(s) com sucesso!`);
    } else if (deleteConfirmModal.type === 'single' && deleteConfirmModal.blockId) {
      const targetId = deleteConfirmModal.blockId;
      setBlocks(blocks.filter(b => b.id !== targetId));
      setSelectedBlockIds(prev => prev.filter(id => id !== targetId));
      setBlockSuccessMsg('Bloqueio apagado com sucesso!');
    }

    setDeleteConfirmModal(null);
    setTimeout(() => setBlockSuccessMsg(null), 3500);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmModal(null);
  };

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const openDaysCount = safeWorkingHours.filter(w => Boolean(w.isOpen)).length;

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Header com tom suave e elegante padrão do app */}
      <div className="bg-[#FAF6F2] border border-[#EADDCF] p-5 sm:p-6 rounded-3xl shadow-2xs relative overflow-hidden">
        <span className="text-[#8C6B4F] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5 block">Configurações</span>
        <h3 className="font-serif text-2xl sm:text-3xl text-[#201510] font-bold mb-5">Sua agenda & espaço</h3>
        
        {/* Navegação de Abas em Grid de 3 colunas */}
        <div className="grid grid-cols-3 bg-white/90 p-1 sm:p-1.5 rounded-2xl border border-[#E2D6CB] gap-1 shadow-2xs">
          <button 
            type="button"
            onClick={() => setActiveTab('horarios')}
            className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-center transition-all cursor-pointer ${
              activeTab === 'horarios' 
                ? 'bg-[#201510] text-white shadow-xs' 
                : 'text-[#6D5D52] hover:text-[#201510] hover:bg-[#F3ECE4]'
            }`}
          >
            <span className="block md:hidden text-[11.5px] font-semibold tracking-tight truncate">Horários</span>
            <span className="hidden md:block text-xs font-semibold whitespace-nowrap">Horários & Almoço</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('bloqueios')}
            className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-center transition-all cursor-pointer ${
              activeTab === 'bloqueios' 
                ? 'bg-[#201510] text-white shadow-xs' 
                : 'text-[#6D5D52] hover:text-[#201510] hover:bg-[#F3ECE4]'
            }`}
          >
            <span className="block md:hidden text-[11.5px] font-semibold tracking-tight truncate">Bloqueios</span>
            <span className="hidden md:block text-xs font-semibold whitespace-nowrap">Bloqueios & Folgas</span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('estudio')}
            className={`py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-center transition-all cursor-pointer ${
              activeTab === 'estudio' 
                ? 'bg-[#201510] text-white shadow-xs' 
                : 'text-[#6D5D52] hover:text-[#201510] hover:bg-[#F3ECE4]'
            }`}
          >
            <span className="block md:hidden text-[11.5px] font-semibold tracking-tight truncate">Estúdio</span>
            <span className="hidden md:block text-xs font-semibold whitespace-nowrap">Endereço & Contato</span>
          </button>
        </div>
      </div>

      {/* ==================== ABA HORÁRIOS & ALMOÇO ==================== */}
      {activeTab === 'horarios' && (
        <div className="space-y-5">
          {/* Card do Intervalo de Agendamento - Somente Ajuste Manual */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-[#8C6B4F]" />
                  <h4 className="font-serif text-xl sm:text-2xl text-[#2B2520] font-bold">Frequência dos Horários para as Clientes</h4>
                </div>
                <p className="text-xs sm:text-sm text-[#6B5B48]">
                  Defina manualmente o intervalo em minutos entre os horários disponíveis exibidos no agendamento.
                </p>
              </div>

              {/* Controles de Ajuste Manual */}
              <div className="flex items-center gap-2 bg-[#FAF6F2] p-1.5 sm:p-2 rounded-2xl border border-[#EADDCF] self-start sm:self-auto">
                {/* Botão diminuir 5 min */}
                <button
                  type="button"
                  title="Diminuir 5 minutos"
                  onClick={() => {
                    const current = config.slotInterval || 15;
                    const next = Math.max(5, current - 5);
                    setConfig({ ...config, slotInterval: next });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D3C4] text-[#2B2520] hover:bg-[#F3ECE4] active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>

                {/* Input numérico editável */}
                <div className="flex items-center bg-white border border-[#DCCFBC] rounded-xl px-3 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-[#201510]/30 focus-within:border-[#201510]">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    step={5}
                    value={config.slotInterval ?? 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        setConfig({ ...config, slotInterval: Math.min(180, Math.max(5, val)) });
                      }
                    }}
                    className="w-14 text-center font-bold text-[#201510] text-base focus:outline-none bg-transparent"
                  />
                  <span className="text-xs font-semibold text-[#8A7458] ml-1">min</span>
                </div>

                {/* Botão aumentar 5 min */}
                <button
                  type="button"
                  title="Aumentar 5 minutos"
                  onClick={() => {
                    const current = config.slotInterval || 15;
                    const next = Math.min(180, current + 5);
                    setConfig({ ...config, slotInterval: next });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D3C4] text-[#2B2520] hover:bg-[#F3ECE4] active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Prévia Dinâmica dos Horários Gerados */}
            <div className="pt-3 border-t border-[#EFE7DC] flex flex-wrap items-center gap-2 text-xs text-[#6B5B48]">
              <span className="font-semibold text-[#443831] flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-[#8C6B4F]" />
                Prévia dos horários que aparecerão:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(() => {
                  const step = config.slotInterval && config.slotInterval > 0 ? config.slotInterval : 15;
                  const baseMins = 9 * 60; // Início às 09:00
                  const samples: string[] = [];
                  for (let i = 0; i < 5; i++) {
                    const cur = baseMins + (i * step);
                    const h = Math.floor(cur / 60);
                    const m = cur % 60;
                    samples.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                  }
                  return samples.map((slot, idx) => (
                    <span key={idx} className="bg-[#FAF6F2] text-[#2B2520] font-mono font-bold px-2 py-0.5 rounded-md border border-[#E0D3C4] text-[11px]">
                      {slot}
                    </span>
                  ));
                })()}
                <span className="text-[#8A7458] font-medium text-[11px]">...</span>
              </div>
            </div>
          </div>

          {/* Card de Tempo de Intervalo entre Procedimentos */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-[#8C6B4F]" />
                  <h4 className="font-serif text-xl sm:text-2xl text-[#2B2520] font-bold">Tempo de Intervalo entre Procedimentos</h4>
                </div>
                <p className="text-xs sm:text-sm text-[#6B5B48]">
                  Tempo de pausa aplicado automaticamente após o término de um atendimento na agenda, calculando o próximo horário disponível.
                </p>
              </div>

              {/* Controles de Ajuste do Intervalo */}
              <div className="flex items-center gap-2 bg-[#FAF6F2] p-1.5 sm:p-2 rounded-2xl border border-[#EADDCF] self-start sm:self-auto">
                <button
                  type="button"
                  title="Diminuir 5 minutos"
                  onClick={() => {
                    const current = procedureInterval;
                    const next = Math.max(0, current - 5);
                    setProcedureInterval(next);
                    setConfig({ ...config, procedureIntervalMinutes: next });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D3C4] text-[#2B2520] hover:bg-[#F3ECE4] active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex items-center bg-white border border-[#DCCFBC] rounded-xl px-3 py-1.5 shadow-2xs">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    step={5}
                    value={procedureInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 0) {
                        const clamped = Math.min(60, Math.max(0, val));
                        setProcedureInterval(clamped);
                        setConfig({ ...config, procedureIntervalMinutes: clamped });
                      }
                    }}
                    className="w-14 text-center font-bold text-[#201510] text-base focus:outline-none bg-transparent"
                  />
                  <span className="text-xs font-semibold text-[#8A7458] ml-1">min</span>
                </div>

                <button
                  type="button"
                  title="Aumentar 5 minutos"
                  onClick={() => {
                    const current = procedureInterval;
                    const next = Math.min(60, current + 5);
                    setProcedureInterval(next);
                    setConfig({ ...config, procedureIntervalMinutes: next });
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E0D3C4] text-[#2B2520] hover:bg-[#F3ECE4] active:scale-95 flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-[#EFE7DC]">
              <span className="text-xs font-semibold text-[#6B5B48]">Opções rápidas:</span>
              {[0, 5, 10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setProcedureInterval(mins);
                    setConfig({ ...config, procedureIntervalMinutes: mins });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    Number(procedureInterval) === mins
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-stone-700 border-[#EADDCF] hover:bg-white'
                  }`}
                >
                  {mins === 0 ? 'Sem intervalo' : `${mins} min`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
            <div>
              <h4 className="font-serif text-2xl text-[#2B2520] font-bold leading-tight">Funcionamento & Horário de Almoço</h4>
              <p className="text-sm text-[#6B5B48] mt-0.5">
                Defina os dias de atendimento, horário de abertura/fechamento e o intervalo de almoço.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#8A7458] bg-[#FAF6F2] px-3 py-1 rounded-full border border-[#EADDCF] self-start sm:self-auto">
              {openDaysCount} dias abertos
            </span>
          </div>

          <div className="bg-white rounded-3xl p-3 sm:p-5 border border-[#EFE7DC] shadow-sm space-y-4">
            {safeWorkingHours.map((w, i) => (
              <div 
                key={i} 
                className={`p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                  w.isOpen ? 'bg-[#FCFAF8] border-[#EAE2D7]' : 'bg-[#F9F7F5] border-[#EFE7DC] opacity-75'
                }`}
              >
                {/* Linha Principal: Dia da Semana + Aberto/Fechado + Horário Geral */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer min-w-[130px]">
                    <input 
                      type="checkbox" 
                      checked={w.isOpen} 
                      onChange={e => handleDayChange(i, { isOpen: e.target.checked })}
                      className="w-5 h-5 rounded-md border-[#DCCFBC] text-[#1C1713] focus:ring-[#1C1713] accent-[#1C1713] cursor-pointer"
                    />
                    <span className={`text-sm sm:text-[15px] ${w.isOpen ? 'text-[#2B2520] font-bold' : 'text-[#A2907A] font-medium'}`}>
                      {dayNames[i]}
                    </span>
                  </label>
                  
                  {w.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-[#EAE2D7] shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-[#8C6B4F]" />
                        <span className="text-[10px] uppercase font-bold text-[#8A7458] mr-1 hidden sm:inline">Turno:</span>
                        <input 
                          type="time" 
                          value={w.openTime} 
                          onChange={e => handleDayChange(i, { openTime: e.target.value })}
                          className="text-[#2B2520] text-xs font-semibold focus:outline-none bg-transparent"
                        />
                        <span className="text-[#A2907A] text-xs font-bold">às</span>
                        <input 
                          type="time" 
                          value={w.closeTime} 
                          onChange={e => handleDayChange(i, { closeTime: e.target.value })}
                          className="text-[#2B2520] text-xs font-semibold focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 sm:flex-none flex justify-end">
                       <span className="text-xs font-medium text-[#A2907A] bg-[#EFE7DC]/50 px-3 py-1 rounded-full">Fechado</span>
                    </div>
                  )}
                </div>

                {/* Linha do Horário de Almoço */}
                {w.isOpen && (
                  <div className="mt-3 pt-3 border-t border-[#EFE7DC] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[#6B5B48]">
                      <input
                        type="checkbox"
                        checked={!!w.hasLunchBreak}
                        onChange={e => handleDayChange(i, { 
                          hasLunchBreak: e.target.checked,
                          lunchStart: w.lunchStart || '12:00',
                          lunchEnd: w.lunchEnd || '13:00'
                        })}
                        className="w-4 h-4 rounded border-[#DCCFBC] accent-[#8C6B4F] cursor-pointer"
                      />
                      <Utensils className="w-3.5 h-3.5 text-[#8C6B4F]" />
                      <span className="font-medium text-[13px] text-[#443831]">Pausa de Almoço</span>
                    </label>

                    {w.hasLunchBreak ? (
                      <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3 py-1 rounded-xl">
                        <span className="text-[11px] text-amber-900 font-medium">Intervalo:</span>
                        <input
                          type="time"
                          value={w.lunchStart || '12:00'}
                          onChange={e => handleDayChange(i, { lunchStart: e.target.value })}
                          className="text-amber-950 font-semibold text-xs bg-transparent focus:outline-none"
                        />
                        <span className="text-amber-800 text-xs font-bold">às</span>
                        <input
                          type="time"
                          value={w.lunchEnd || '13:00'}
                          onChange={e => handleDayChange(i, { lunchEnd: e.target.value })}
                          className="text-amber-950 font-semibold text-xs bg-transparent focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#A2907A] italic">Sem pausa cadastrada</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            <div className="pt-2 space-y-2">
              {safeWorkingHours.length < 7 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>É necessário configurar todos os 7 dias da semana para salvar.</span>
                </div>
              )}
              <button 
                type="button"
                onClick={handleSaveWorkingHours}
                disabled={isSavingHours || safeWorkingHours.length < 7}
                className="w-full py-4 rounded-2xl bg-[#1C1713] text-white text-[11px] font-bold tracking-[0.16em] uppercase hover:bg-[#332B23] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-75"
              >
                {isSavingHours ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SALVANDO HORÁRIOS & ALMOÇO NO BANCO...</span>
                  </>
                ) : hoursSavedToast ? (
                  <>
                    <Check className="w-4 h-4 text-[#25D366]" />
                    <span>HORÁRIOS & ALMOÇO SALVOS COM SUCESSO! {isSupabaseConnected ? '(SALVO NO BANCO)' : ''}</span>
                  </>
                ) : (
                  <span>SALVAR HORÁRIOS & INTERVALOS</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ABA BLOQUEIOS OTIMIZADA ==================== */}
      {activeTab === 'bloqueios' && (
        <div className="space-y-6">
          <div className="px-1">
            <h4 className="font-serif text-2xl text-[#2B2520] font-bold leading-tight">Bloqueios & Folgas</h4>
            <p className="text-sm text-[#6B5B48] mt-0.5">
              Bloqueie horários em múltiplos dias específicos, em uma semana inteira ou durante todo o mês.
            </p>
          </div>

          <form onSubmit={handleCreateBlocks} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-5">
            
            {/* Seletor do Escopo de Bloqueio */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-2">
                1. Selecione o Modo de Bloqueio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBlockScope('dias_especificos')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    blockScope === 'dias_especificos'
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-[#54463E] border-[#EADDCF] hover:bg-white'
                  }`}
                >
                  <CalendarIcon className={`w-4 h-4 shrink-0 mt-0.5 ${blockScope === 'dias_especificos' ? 'text-[#C5A88E]' : 'text-[#8C6B4F]'}`} />
                  <div>
                    <p className="text-xs font-bold leading-snug">Dias Específicos</p>
                    <p className={`text-[11px] mt-0.5 ${blockScope === 'dias_especificos' ? 'text-stone-300' : 'text-[#8A7458]'}`}>
                      Escolha 1 ou vários dias
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBlockScope('semana')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    blockScope === 'semana'
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-[#54463E] border-[#EADDCF] hover:bg-white'
                  }`}
                >
                  <CalendarDays className={`w-4 h-4 shrink-0 mt-0.5 ${blockScope === 'semana' ? 'text-[#C5A88E]' : 'text-[#8C6B4F]'}`} />
                  <div>
                    <p className="text-xs font-bold leading-snug">Semana Toda</p>
                    <p className={`text-[11px] mt-0.5 ${blockScope === 'semana' ? 'text-stone-300' : 'text-[#8A7458]'}`}>
                      Bloqueia 7 dias seguidos
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBlockScope('mes')}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    blockScope === 'mes'
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-[#54463E] border-[#EADDCF] hover:bg-white'
                  }`}
                >
                  <Layers className={`w-4 h-4 shrink-0 mt-0.5 ${blockScope === 'mes' ? 'text-[#C5A88E]' : 'text-[#8C6B4F]'}`} />
                  <div>
                    <p className="text-xs font-bold leading-snug">Mês / Mais de um Mês</p>
                    <p className={`text-[11px] mt-0.5 ${blockScope === 'mes' ? 'text-stone-300' : 'text-[#8A7458]'}`}>
                      Bloqueie 1 ou vários meses
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Configuração de Data conforme o Escopo */}
            <div className="bg-[#FAF6F2] p-4 rounded-2xl border border-[#EADDCF] space-y-3">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold block">
                2. Selecione as Datas
              </span>

              {/* Modo: DIAS ESPECÍFICOS */}
              {blockScope === 'dias_especificos' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="date"
                      value={dateInputVal}
                      onChange={e => setDateInputVal(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddDateToSelection(dateInputVal)}
                      disabled={!dateInputVal}
                      className="px-4 py-2.5 rounded-xl bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                    >
                      + Incluir Dia
                    </button>
                  </div>

                  {/* Tags com dias selecionados */}
                  {selectedDates.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-[#6D5D52]">
                        {selectedDates.length} dia(s) selecionado(s):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDates.map(dStr => (
                          <span 
                            key={dStr} 
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D9CCC1] text-xs font-medium text-[#2B2520] shadow-2xs"
                          >
                            <span>{formatShortDate(dStr)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDateFromSelection(dStr)}
                              className="text-[#994D38] hover:bg-stone-100 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8A7458] italic">
                      Selecione uma data acima e clique em "+ Incluir Dia". Você pode adicionar quantos dias desejar.
                    </p>
                  )}
                </div>
              )}

              {/* Modo: SEMANA TODA */}
              {blockScope === 'semana' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-[#54463E]">
                    Data de início da semana (serão bloqueados 7 dias a partir desta data):
                  </label>
                  <input 
                    type="date"
                    required
                    value={weekStartDate}
                    onChange={e => setWeekStartDate(e.target.value)}
                    className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]"
                  />
                  {weekStartDate && (
                    <p className="text-[11px] text-[#8C6B4F] font-medium pt-1">
                      Período de bloqueio: {formatShortDate(weekStartDate)} até {(() => {
                        const [y, m, d] = weekStartDate.split('-').map(Number);
                        const end = new Date(y, m - 1, d);
                        end.setDate(end.getDate() + 6);
                        return formatShortDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`);
                      })()} (7 dias)
                    </p>
                  )}
                </div>
              )}

              {/* Modo: MÊS / VÁRIOS MESES */}
              {blockScope === 'mes' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <label className="block text-xs font-bold text-[#54463E]">
                        Selecione 1 ou mais meses inteiros para bloquear:
                      </label>
                      <span className="text-[11px] text-[#8C6B4F] font-medium">
                        Clique nos meses para marcar/desmarcar
                      </span>
                    </div>

                    {/* Grade Rápida de Atalhos dos Próximos 12 Meses */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {upcomingMonths.map(m => {
                        const isSelected = selectedMonths.includes(m.ym);
                        return (
                          <button
                            key={m.ym}
                            type="button"
                            onClick={() => handleToggleMonth(m.ym)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? 'bg-[#201510] text-white border-[#201510] shadow-xs ring-2 ring-[#201510]/20 font-bold'
                                : 'bg-white text-[#443831] border-[#EAE2D7] hover:border-[#8C6B4F] hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold leading-tight">{m.shortLabel}</span>
                              {isSelected && <Check className="w-3 h-3 text-[#C5A88E]" />}
                            </div>
                            <span className={`text-[10px] ${isSelected ? 'text-[#C5A88E]' : 'text-[#8A7458]'}`}>
                              {m.totalDays} dias
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seletor Customizado de Mês via Input de Data */}
                  <div className="pt-1">
                    <p className="text-[11px] text-[#6B5B48] font-medium mb-1.5">
                      Ou escolha outro mês no seletor de calendário:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="month"
                        value={monthInputVal}
                        onChange={e => setMonthInputVal(e.target.value)}
                        className="w-full sm:w-64 px-4 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddMonthToSelection(monthInputVal);
                        }}
                        disabled={!monthInputVal}
                        className="px-4 py-2 rounded-xl bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                      >
                        + Incluir Mês
                      </button>
                    </div>
                  </div>

                  {/* Tags e Resumo com Meses Selecionados */}
                  {selectedMonths.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-[#EAE2D7]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <p className="text-xs font-bold text-[#2B2520]">
                          {selectedMonths.length} mês(es) selecionado(s) · {totalDaysInSelectedMonths} dias totais que serão bloqueados
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedMonths([])}
                          className="text-[11px] text-rose-700 hover:underline font-semibold"
                        >
                          Limpar seleção de meses
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedMonths.map(mStr => {
                          const info = formatMonthYearLabel(mStr);
                          return (
                            <span 
                              key={mStr} 
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#D9CCC1] text-xs font-medium text-[#2B2520] shadow-2xs"
                            >
                              <span className="font-semibold text-[#201510]">{info.label}</span>
                              <span className="text-[10px] text-[#8A7458] font-bold bg-[#FAF6F2] px-1.5 py-0.5 rounded-md border border-[#EADDCF]">
                                {info.totalDays} dias
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMonthFromSelection(mStr)}
                                className="text-[#994D38] hover:bg-stone-100 rounded-full p-0.5 cursor-pointer ml-0.5"
                                title="Remover mês"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                      <p className="font-medium">Nenhum mês selecionado ainda. Clique em um ou mais meses nos botões acima ou adicione pelo campo de data.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Motivo do Bloqueio */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1.5">
                3. Motivo ou Descrição (Opcional)
              </label>
              <input 
                type="text" 
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Ex: Férias, Reforma do estúdio, Curso de aperfeiçoamento, Consulta" 
                className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-sm focus:outline-none focus:border-[#9C8259] placeholder:text-[#A2907A]" 
              />
            </div>

            {/* Opção Dia Inteiro vs Horário Parcial */}
            <div className="bg-[#FAF6F2] p-4 rounded-2xl border border-[#EADDCF] space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="fullDay"
                  checked={isFullDay}
                  onChange={e => setIsFullDay(e.target.checked)}
                  className="w-5 h-5 rounded-md border-[#DCCFBC] text-[#1C1713] focus:ring-[#1C1713] accent-[#1C1713] cursor-pointer"
                />
                <label htmlFor="fullDay" className="text-sm text-[#2B2520] cursor-pointer font-bold">
                  Bloquear o dia inteiro
                </label>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[9.5px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1">
                      Horário Início
                    </label>
                    <input 
                      type="time" 
                      value={blockStartTime}
                      onChange={e => setBlockStartTime(e.target.value)}
                      required={!isFullDay}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1">
                      Horário Fim
                    </label>
                    <input 
                      type="time" 
                      value={blockEndTime}
                      onChange={e => setBlockEndTime(e.target.value)}
                      required={!isFullDay}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]" 
                    />
                  </div>
                </div>
              )}
            </div>

            {blockErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{blockErrorMsg}</span>
              </div>
            )}

            {blockSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{blockSuccessMsg}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-4 rounded-2xl bg-[#1C1713] text-[#F7F1E8] text-[11px] font-bold tracking-[0.16em] uppercase hover:bg-[#332B23] transition-colors cursor-pointer shadow-xs"
            >
              CONFIRMAR E APLICAR BLOQUEIO
            </button>
          </form>

          {/* Lista de Bloqueios Ativos com Seleção Múltipla ou Individual */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pb-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="text-[10px] uppercase tracking-[0.2em] text-[#8A7458] font-bold">
                  Bloqueios Cadastrados ({blocks.length})
                </h5>
                {selectedBlockIds.length > 0 && (
                  <span className="text-[11px] font-bold bg-[#201510] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    {selectedBlockIds.length} selecionado(s)
                  </span>
                )}
              </div>

              {blocks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botão Selecionar Todos / Desmarcar */}
                  <button
                    type="button"
                    onClick={handleSelectAllBlocks}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#DCD0C3] bg-white hover:bg-[#FAF6F2] text-[#54463E] transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
                  >
                    <input
                      type="checkbox"
                      checked={blocks.length > 0 && selectedBlockIds.length === blocks.length}
                      onChange={handleSelectAllBlocks}
                      className="w-3.5 h-3.5 accent-[#201510] cursor-pointer rounded pointer-events-none"
                    />
                    <span>{selectedBlockIds.length === blocks.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                  </button>

                  {/* Botão Apagar Selecionados (quando houver itens selecionados) */}
                  {selectedBlockIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenDeleteSelectedModal}
                      className="text-xs text-white bg-rose-700 hover:bg-rose-800 font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Apagar Selecionados ({selectedBlockIds.length})</span>
                    </button>
                  )}

                  {/* Botão Apagar Todos os Bloqueios */}
                  <button
                    type="button"
                    onClick={handleOpenDeleteAllModal}
                    className="text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                    <span>Apagar Todos</span>
                  </button>
                </div>
              )}
            </div>

            {blocks.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-stone-200 border-dashed text-center">
                <p className="text-xs text-stone-500 font-medium">Nenhum bloqueio cadastrado no momento.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {blocks
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(b => {
                     const bDate = parseDateStr(b.date);
                     const weekDays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
                     const dateLabel = `${formatShortDate(b.date)} · ${weekDays[bDate.getDay()]}`;
                     const detailLabel = b.isFullDay 
                       ? `Dia inteiro ${b.reason ? '— ' + b.reason : ''}`
                       : `${b.startTime} às ${b.endTime} ${b.reason ? '— ' + b.reason : ''}`;
                     const isSelected = selectedBlockIds.includes(b.id);
                       
                     return (
                       <div 
                         key={b.id} 
                         className={`rounded-2xl border transition-all flex items-center p-2.5 pl-0 relative overflow-hidden ${
                           isSelected 
                             ? 'bg-[#FAF2EC] border-[#BCA38E] ring-1 ring-[#BCA38E]/50 shadow-xs' 
                             : 'bg-white border-[#EFE7DC] shadow-2xs hover:border-[#DCCFBC]'
                         }`}
                       >
                         <div className={`w-1.5 absolute left-0 top-0 bottom-0 ${b.isFullDay ? 'bg-[#8E4B37]' : 'bg-[#D2A75C]'}`} />
                         
                         {/* Checkbox de seleção individual */}
                         <label className="flex items-center pl-3.5 pr-1 cursor-pointer select-none">
                           <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={() => handleToggleBlockSelection(b.id)}
                             className="w-4 h-4 rounded border-[#DCCFBC] text-[#201510] focus:ring-[#201510] accent-[#201510] cursor-pointer"
                           />
                         </label>

                         {/* Informações da Data e Bloqueio */}
                         <div 
                           onClick={() => handleToggleBlockSelection(b.id)} 
                           className="flex-1 pl-2 py-0.5 min-w-0 cursor-pointer"
                         >
                           <div className="flex items-center gap-2">
                             <p className="text-sm font-bold text-[#2B2520] truncate">{dateLabel}</p>
                             {isSelected && (
                               <span className="text-[9px] font-bold uppercase tracking-wider text-[#8C6B4F] bg-[#EFE7DC] px-1.5 py-0.5 rounded">
                                 Selecionado
                               </span>
                             )}
                           </div>
                           <p className="text-xs text-[#6B5B48] truncate mt-0.5">{detailLabel}</p>
                         </div>

                         {/* Botão de Exclusão Individual Rápida */}
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleOpenDeleteSingleModal(b.id);
                           }}
                           className="w-8 h-8 flex items-center justify-center shrink-0 border border-[#EAE2D7] rounded-xl mr-1 text-[#A2664F] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors cursor-pointer"
                           title="Excluir este bloqueio"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                     );
                })}
              </div>
            )}
          </div>

          {/* Modal Customizado de Confirmação de Exclusão (sem window.confirm) */}
          {deleteConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#EAE2D7] space-y-5 animate-scale-in">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#201510]">
                      {deleteConfirmModal.type === 'all' 
                        ? 'Apagar Todos os Bloqueios'
                        : deleteConfirmModal.type === 'selected'
                        ? 'Apagar Bloqueios Selecionados'
                        : 'Apagar Bloqueio'}
                    </h4>
                    <p className="text-xs text-[#6D5D52] mt-1.5 leading-relaxed">
                      {deleteConfirmModal.type === 'all' && (
                        <>Tem certeza que deseja apagar <strong>todos os {blocks.length} bloqueios</strong> da agenda? Os horários e dias voltarão a ficar disponíveis para clientes.</>
                      )}
                      {deleteConfirmModal.type === 'selected' && (
                        <>Tem certeza que deseja apagar os <strong>{deleteConfirmModal.count} bloqueios</strong> selecionados? Eles serão removidos imediatamente da agenda.</>
                      )}
                      {deleteConfirmModal.type === 'single' && (
                        <>Deseja realmente remover este bloqueio da agenda? O horário voltará a ficar disponível para agendamento.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="flex-1 py-3 px-4 rounded-xl border border-[#D9CCC1] text-[#54463E] text-xs font-bold hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {deleteConfirmModal.type === 'all' 
                        ? 'Sim, Apagar Todos'
                        : deleteConfirmModal.type === 'selected'
                        ? `Apagar (${deleteConfirmModal.count})`
                        : 'Sim, Apagar'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== ABA ESTÚDIO & CONTATO ==================== */}
      {activeTab === 'estudio' && (
        <div className="space-y-6">
          <div className="px-1">
            <h4 className="font-serif text-2xl text-[#2B2520] font-bold leading-tight">Endereço & Contato</h4>
            <p className="text-sm text-[#6B5B48] mt-0.5">
              Informações públicas exibidas para suas clientes no site e nos comprovantes de agendamento.
            </p>
          </div>

          <form onSubmit={handleSaveStudioInfo} className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-5">
            
            {/* Endereço */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  <span>Endereço Completo do Espaço</span>
                </label>
                {studioAddress && (
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(studioAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#8C6B4F] hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Testar no Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <textarea
                value={studioAddress}
                onChange={(e) => setStudioAddress(e.target.value)}
                required
                rows={2}
                placeholder="Ex: R. Bico-de-Lacre, 32 - Porto Canoa, Serra - ES, 29168-330"
                className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-sm focus:outline-none focus:border-[#9C8259] leading-relaxed"
              />
              <p className="text-[11px] text-[#8A7458] mt-1">
                Este endereço é utilizado para gerar as rotas no Google Maps e na confirmação do agendamento.
              </p>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#8C6B4F]" />
                <span>WhatsApp de Atendimento (com DDD)</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={formatPhoneMask(studioWhatsapp)}
                onChange={(e) => setStudioWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={15}
                required
                placeholder="(27) 99604-0206"
                className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-sm focus:outline-none focus:border-[#9C8259]"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1.5 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-[#8C6B4F]" />
                <span>Instagram (nome de usuário sem o @)</span>
              </label>
              <input
                type="text"
                value={studioInstagram}
                onChange={(e) => setStudioInstagram(e.target.value.replace(/@/g, '').trim())}
                required
                placeholder="Ex: gabrielanail.beauty"
                className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-sm focus:outline-none focus:border-[#9C8259]"
              />
            </div>

            {/* Link Público Oficial para Clientes */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8A7458] font-bold mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#8C6B4F]" />
                <span>Link Público Oficial para Clientes (URL do Vercel / Domínio)</span>
              </label>
              <input
                type="url"
                value={studioPublicUrl}
                onChange={(e) => setStudioPublicUrl(e.target.value)}
                placeholder="Ex: https://gabriela-nail-beauty.vercel.app"
                className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-sm focus:outline-none focus:border-[#9C8259]"
              />
              <p className="text-[11px] text-[#8A7458] mt-1">
                Insira o link oficial do Vercel ou domínio próprio para que os botões de compartilhamento, WhatsApp e QR Code direcionem corretamente as clientes (evitando links temporários de pré-visualização).
              </p>
            </div>

            {/* Pré-visualização do Endereço */}
            <div className="bg-[#FAF6F2] p-4 rounded-2xl border border-[#EDE4DC] space-y-1.5">
              <span className="text-[9.5px] uppercase tracking-[0.16em] text-[#8A7458] font-bold block">
                Visualização para Clientes
              </span>
              <div className="flex items-start gap-2 text-xs text-[#54463E]">
                <MapPin className="w-4 h-4 text-[#8C6B4F] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#221711]">{studioAddress || 'Nenhum endereço informado'}</p>
                  <p className="text-[11px] text-[#76685F] mt-0.5">
                    WhatsApp: {studioWhatsapp} • Instagram: @{studioInstagram}
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Salvar */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#1C1713] text-[#F7F1E8] text-[11px] font-bold tracking-[0.16em] uppercase hover:bg-[#332B23] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {studioSavedToast ? (
                <>
                  <Check className="w-4 h-4 text-[#25D366]" />
                  <span>DADOS SALVOS COM SUCESSO!</span>
                </>
              ) : (
                <span>SALVAR ENDEREÇO & CONTATO</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${d} ${months[parseInt(m) - 1]}`;
}
