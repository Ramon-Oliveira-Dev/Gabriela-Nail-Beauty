import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { Appointment, Service } from '../types';
import { formatCurrency, formatDate, formatDuration, cleanPhoneNumber, formatPhoneMask } from '../utils';
import { getSupabaseClient, formatSupabaseErrorMessage } from '../supabaseClient';
import { X, Search, Calendar, Clock, AlertTriangle, MessageCircle, CheckCircle2, Ban, Phone } from 'lucide-react';

interface MyAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReschedule?: (app: Appointment) => void;
}

interface FetchedAppointment extends Appointment {
  canCancel?: boolean;
}

export const MyAppointmentsModal: React.FC<MyAppointmentsModalProps> = ({ isOpen, onClose, onReschedule }) => {
  const { services, config } = useStore();
  const [phoneSearch, setPhoneSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [userAppointments, setUserAppointments] = useState<FetchedAppointment[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<FetchedAppointment | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<FetchedAppointment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deadlineExceededApp, setDeadlineExceededApp] = useState<FetchedAppointment | null>(null);

  if (!isOpen) return null;

  const cleanSearch = cleanPhoneNumber(phoneSearch);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanSearch) return;

    setIsSearching(true);
    setSearchError(null);
    setFeedbackMsg(null);
    setDeadlineExceededApp(null);

    const client = getSupabaseClient();
    if (!client) {
      setSearchError('Não foi possível conectar ao servidor. Verifique sua conexão.');
      setIsSearching(false);
      return;
    }

    try {
      const { data, error } = await client.rpc('my_appointments', { p_phone: cleanSearch });
      if (error) {
        setSearchError(formatSupabaseErrorMessage(error));
        setUserAppointments([]);
      } else if (Array.isArray(data)) {
        const mapped: FetchedAppointment[] = data.map((row: any) => ({
          id: row.id,
          serviceId: row.service_id,
          serviceNames: row.service_names,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          clientName: row.client_name,
          clientPhone: row.client_phone,
          status: row.status,
          price: Number(row.price || 0),
          notes: row.notes || undefined,
          canCancel: Boolean(row.can_cancel)
        }));
        setUserAppointments(mapped);
      } else {
        setUserAppointments([]);
      }
      setHasSearched(true);
    } catch (err: any) {
      setSearchError(err?.message || 'Erro ao buscar agendamentos.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return;
    setIsProcessing(true);
    setSearchError(null);
    setDeadlineExceededApp(null);

    const client = getSupabaseClient();
    if (!client) {
      setSearchError('Não foi possível conectar ao servidor.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data: success, error } = await client.rpc('cancel_my_appointment', {
        p_id: appointmentToCancel.id,
        p_phone: cleanSearch
      });

      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes('PRAZO_CANCELAMENTO')) {
          setDeadlineExceededApp(appointmentToCancel);
          setAppointmentToCancel(null);
        } else {
          setSearchError(formatSupabaseErrorMessage(error));
        }
      } else if (success) {
        setFeedbackMsg(`Agendamento de ${formatDate(appointmentToCancel.date)} às ${appointmentToCancel.startTime} cancelado com sucesso. O horário foi liberado.`);
        setAppointmentToCancel(null);
        handleSearch();
      } else {
        setSearchError('Não foi possível cancelar o agendamento.');
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes('PRAZO_CANCELAMENTO')) {
        setDeadlineExceededApp(appointmentToCancel);
        setAppointmentToCancel(null);
      } else {
        setSearchError(errMsg || 'Erro inesperado ao cancelar.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!appointmentToReschedule) return;
    const app = appointmentToReschedule;
    setIsProcessing(true);
    setSearchError(null);
    setDeadlineExceededApp(null);

    const client = getSupabaseClient();
    if (!client) {
      setSearchError('Não foi possível conectar ao servidor.');
      setIsProcessing(false);
      return;
    }

    try {
      const { data: success, error } = await client.rpc('cancel_my_appointment', {
        p_id: app.id,
        p_phone: cleanSearch
      });

      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes('PRAZO_CANCELAMENTO')) {
          setDeadlineExceededApp(app);
          setAppointmentToReschedule(null);
        } else {
          setSearchError(formatSupabaseErrorMessage(error));
        }
      } else if (success) {
        setAppointmentToReschedule(null);
        if (onReschedule) {
          onReschedule(app);
        }
        onClose();
      } else {
        setSearchError('Não foi possível reagendar o atendimento.');
      }
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes('PRAZO_CANCELAMENTO')) {
        setDeadlineExceededApp(app);
        setAppointmentToReschedule(null);
      } else {
        setSearchError(errMsg || 'Erro ao solicitar reagendamento.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getService = (serviceId: string): Service | undefined => {
    return services.find(s => s.id === serviceId);
  };

  const buildWhatsAppMessage = (app: FetchedAppointment, sName: string) => {
    const text = `Olá Gabriela! Sou ${app.clientName}. Gostaria de solicitar o cancelamento ou reagendamento do meu horário agendado para o dia ${formatDate(app.date)} às ${app.startTime} (${sName}). Como faltam menos de 48h, entrei em contato diretamente como solicitado. Aguardo seu retorno! 💕`;
    const targetPhone = cleanPhoneNumber(config.whatsapp || '27996040206');
    return `https://wa.me/55${targetPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-100 relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center bg-[#FDFBF9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F4EFEA] flex items-center justify-center text-[#987353]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-[#2A1E18]">Meus Agendamentos</h3>
              <p className="text-xs text-[#7A6B62]">Consulte, cancele ou solicite reagendamento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Policy info box */}
          <div className="bg-[#FFFBF5] p-4 rounded-2xl border border-[#F3E5D8] flex items-start gap-3 text-xs text-[#6B5A51]">
            <AlertTriangle className="w-5 h-5 text-[#987353] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#2A1E18] mb-0.5">Política de Agendamento:</p>
              <p>• Tolerância de espera (10 minutos).</p>
              <p>• O cancelamento e reagendamento deve ser feito em até 48 horas. Em 24h para o procedimento agendado, o cancelamento e reagendamento só será possível entrando em contato com a Gabriela Santos.</p>
            </div>
          </div>

          {/* Aviso especial caso exceda o prazo de cancelamento direto */}
          {deadlineExceededApp && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-3 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950 text-sm">Cancelamento fora do prazo autônomo</p>
                  <p className="mt-1">
                    Como faltam menos de 48 horas para o horário agendado, o cancelamento ou reagendamento precisa ser solicitado diretamente à profissional pelo WhatsApp.
                  </p>
                </div>
              </div>
              <a
                href={buildWhatsAppMessage(deadlineExceededApp, deadlineExceededApp.serviceNames || 'Procedimento')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-white hover:bg-[#1EBE5D] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com Gabriela Santos no WhatsApp
              </a>
            </div>
          )}

          {/* Search box */}
          <form 
            onSubmit={handleSearch} 
            className="space-y-3"
          >
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
              Digite seu número de WhatsApp / Telefone:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="Ex: (27) 99999-9999"
                  maxLength={15}
                  value={phoneSearch}
                  onChange={(e) => {
                    setPhoneSearch(formatPhoneMask(e.target.value));
                    setHasSearched(false);
                    setSearchError(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#987353] text-[#2A1E18]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !cleanSearch}
                className="px-5 py-3 rounded-xl bg-[#2A1E18] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#433128] transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-4 h-4" /> {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {searchError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {feedbackMsg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Results */}
          {hasSearched && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Seus Agendamentos ({userAppointments.length})
              </h4>

              {userAppointments.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-xs text-stone-500">Nenhum agendamento encontrado para este telefone.</p>
                </div>
              ) : (
                userAppointments.map(app => {
                  const service = getService(app.serviceId);
                  const sName = app.serviceNames || service?.name || 'Procedimento';
                  
                  const [sh, sm] = app.startTime.split(':').map(Number);
                  const [eh, em] = (app.endTime || app.startTime).split(':').map(Number);
                  const calcDuration = !isNaN(sh) && !isNaN(eh) ? (eh * 60 + em) - (sh * 60 + sm) : 0;
                  const sDuration = calcDuration > 0 ? calcDuration : (service?.durationMinutes || 45);
                  
                  const isCancelled = app.status === 'cancelled';
                  const isCompleted = app.status === 'completed';
                  const canCancel = app.canCancel ?? false;

                  return (
                    <div 
                      key={app.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCancelled ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-[#FDFBF9] border-[#EADDCF] shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                            isCancelled ? 'bg-red-50 text-red-700' :
                            isCompleted ? 'bg-stone-200 text-stone-700' :
                            app.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-[#F4EFEA] text-[#987353]'
                          }`}>
                            {isCancelled ? 'Cancelado' : isCompleted ? 'Concluído' : app.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                          </span>
                          <h5 className="font-serif text-lg text-[#2A1E18] font-bold mt-1.5">{sName}</h5>
                          <p className="text-xs text-[#7A6B62] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Duração: {formatDuration(sDuration)} • {formatCurrency(app.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#2A1E18]">{app.startTime}</p>
                          <p className="text-xs text-stone-500">{formatDate(app.date)}</p>
                        </div>
                      </div>

                      {/* Action conditions */}
                      {!isCancelled && !isCompleted && (
                        <div className="mt-4 pt-3 border-t border-stone-100 space-y-3">
                          {canCancel ? (
                            <div>
                              <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl mb-3">
                                <span>Cancelamento e reagendamento online liberados.</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  id={`btn-cancel-app-${app.id}`}
                                  type="button"
                                  onClick={() => setAppointmentToCancel(app)}
                                  className="flex-1 py-2.5 px-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 active:scale-95 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Cancelar Horário
                                </button>
                                {onReschedule && (
                                  <button
                                    id={`btn-reschedule-app-${app.id}`}
                                    type="button"
                                    onClick={() => setAppointmentToReschedule(app)}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#2A1E18] text-white hover:bg-[#433128] active:scale-95 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    Reagendar Horário
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                                <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-950">
                                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                  Menos de 48h para o atendimento
                                </p>
                                <p>
                                  O cancelamento e reagendamento deve ser feito em até 48 horas. Em 24h para o procedimento agendado, o cancelamento e reagendamento só será possível entrando em contato com a Gabriela Santos.
                                </p>
                              </div>
                              <a
                                href={buildWhatsAppMessage(app, sName)}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-white hover:bg-[#1EBE5D] text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Entrar em contato via WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Modal de Confirmação de Cancelamento */}
        {appointmentToCancel && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto shadow-2xs">
                <Ban className="w-7 h-7" />
              </div>
              
              <div>
                <h4 className="font-serif text-xl font-bold text-[#2A1E18]">
                  Cancelar Horário?
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Tem certeza que deseja cancelar seu atendimento?
                </p>
              </div>

              <div className="bg-[#FAF6F2] rounded-2xl p-3.5 border border-[#EADDCF] text-left text-xs space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-stone-500 shrink-0">Procedimento:</span>
                  <span className="font-semibold text-[#2A1E18] text-right">
                    {appointmentToCancel.serviceNames || getService(appointmentToCancel.serviceId)?.name || 'Procedimento'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Data e Horário:</span>
                  <span className="font-semibold text-[#2A1E18]">
                    {formatDate(appointmentToCancel.date)} às {appointmentToCancel.startTime}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-500">Cliente:</span>
                  <span className="font-semibold text-[#2A1E18]">{appointmentToCancel.clientName}</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-400 leading-tight">
                Esta ação liberará imediatamente a vaga na agenda para outras clientes.
              </p>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAppointmentToCancel(null)}
                  className="flex-1 py-3 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 active:scale-95 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-cancellation"
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmCancel}
                  className="flex-1 py-3 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  {isProcessing ? 'Cancelando...' : 'Sim, Cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Reagendamento */}
        {appointmentToReschedule && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#FAF6F2] border border-[#EADDCF] flex items-center justify-center text-[#987353] mx-auto shadow-2xs">
                <Calendar className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-serif text-xl font-bold text-[#2A1E18]">
                  Reagendar Atendimento
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  O horário atual de <strong>{formatDate(appointmentToReschedule.date)} às {appointmentToReschedule.startTime}</strong> será liberado e você escolherá uma nova data.
                </p>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setAppointmentToReschedule(null)}
                  className="flex-1 py-3 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 active:scale-95 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  id="btn-confirm-reschedule"
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmReschedule}
                  className="flex-1 py-3 px-3 rounded-xl bg-[#2A1E18] hover:bg-[#433128] active:scale-95 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Reagendando...' : 'Escolher Nova Data'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
