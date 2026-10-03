import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../StoreContext';
import { getSupabaseClient, formatSupabaseErrorMessage } from '../supabaseClient';
import { Service, ComplementaryService } from '../types';
import { UploadCloud, CheckCircle2, AlertTriangle, X, Image as ImageIcon, Sparkles, Layers, RefreshCw } from 'lucide-react';

interface MigrationAddonItem extends ComplementaryService {
  origin?: 'servidor' | 'memória' | 'localStorage';
}

interface MigrationItem {
  serviceId: string;
  serviceName: string;
  category: string;
  isNewService: boolean;
  cloudHasAddons: boolean;
  cloudHasImages: boolean;
  addonsToAdd: MigrationAddonItem[];
  imagesToAdd: string[];
  willUpdate: boolean;
  finalPayload: any;
}

interface ImportLegacyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ImportLegacyDataModal: React.FC<ImportLegacyDataModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { services: localServices, pullFromSupabase, isSupabaseConnected } = useStore();
  const localServicesRef = useRef(localServices);
  localServicesRef.current = localServices;

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<MigrationItem[]>([]);
  const [summary, setSummary] = useState({ newServices: 0, updatedServices: 0, totalAddons: 0, totalImages: 0 });
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    servicesCount: number;
    addonsCount: number;
    imagesCount: number;
    migratedItemsCount: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmed(false);
      setConfirmationData(null);
      return;
    }

    const analyzeMigration = async () => {
      setLoading(true);
      setErrorMsg(null);
      setIsConfirmed(false);
      setConfirmationData(null);

      const client = getSupabaseClient();
      if (!client) {
        setErrorMsg('Supabase não configurado. Verifique as credenciais no painel.');
        setLoading(false);
        return;
      }

      try {
        // Origem 1: Catálogo em memória
        const memoryServices: Service[] = localServicesRef.current || [];

        // Origem 2: localStorage (GABI_APP_STATE_V3)
        let localCacheServices: Service[] = [];
        try {
          const raw = localStorage.getItem('GABI_APP_STATE_V3');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.services)) {
              localCacheServices = parsed.services;
            }
          }
        } catch (lsErr) {
          console.warn('Não foi possível ler GABI_APP_STATE_V3 do localStorage:', lsErr);
        }

        // Combina as origens locais sem duplicar (por id ou nome sem diferenciar maiúsculas)
        const combinedLegacyMap = new Map<string, { service: Service; complements: MigrationAddonItem[]; images: string[] }>();

        const alongCompIds = ['comp-along-1', 'comp-along-2', 'comp-along-3'];

        const mergeSource = (sourceList: Service[], originLabel: 'memória' | 'localStorage') => {
          (sourceList || []).forEach(s => {
            if (!s || !s.name) return;
            const normKey = s.name.trim().toLowerCase();
            const sId = String(s.id || '');
            const isManutencao = sId === '2' || normKey.includes('manuten');

            let entry = combinedLegacyMap.get(normKey) || (sId ? combinedLegacyMap.get(sId) : undefined);

            const sourceComplements: MigrationAddonItem[] = (Array.isArray(s.complements) ? s.complements : [])
              .filter(c => !(isManutencao && alongCompIds.includes(String(c?.id || ''))))
              .map(c => ({ ...c, origin: originLabel }));

            const sourceImages: string[] = Array.isArray(s.images) && s.images.length > 0
              ? s.images
              : (s.imageUrl ? [s.imageUrl] : []);

            if (!entry) {
              entry = {
                service: { ...s },
                complements: [],
                images: []
              };
              combinedLegacyMap.set(normKey, entry);
              if (sId) combinedLegacyMap.set(sId, entry);
            } else {
              // Preenche campos vazios sem sobrescrever os já preenchidos
              if (!entry.service.description && s.description) entry.service.description = s.description;
              if (!entry.service.price && s.price) entry.service.price = s.price;
              if (!entry.service.durationMinutes && s.durationMinutes) entry.service.durationMinutes = s.durationMinutes;
              if ((!entry.service.category || entry.service.category === 'outros') && s.category && s.category !== 'outros') {
                entry.service.category = s.category;
              }
            }

            // Mescla complementos sem duplicar por id ou nome
            sourceComplements.forEach(sc => {
              const scName = (sc.name || '').trim().toLowerCase();
              const scId = String(sc.id || '');
              const exists = entry!.complements.some(ec => 
                (ec.id && String(ec.id) === scId) || 
                (ec.name && ec.name.trim().toLowerCase() === scName)
              );
              if (!exists) {
                entry!.complements.push(sc);
              }
            });

            // Mescla imagens sem duplicar
            sourceImages.forEach(img => {
              if (img && typeof img === 'string' && !entry!.images.includes(img)) {
                entry!.images.push(img);
              }
            });
          });
        };

        // Ordem de prioridade: memória > localStorage
        mergeSource(memoryServices, 'memória');
        mergeSource(localCacheServices, 'localStorage');

        // Extrai a lista unificada única de serviços antigos
        const uniqueLegacyEntries = Array.from(new Set(Array.from(combinedLegacyMap.values())));

        // 2. Carrega os serviços existentes diretamente da tabela services do Supabase
        const { data: cloudServices, error: cloudErr } = await client.from('services').select('*');
        if (cloudErr) {
          setErrorMsg(`Erro ao consultar tabela services no Supabase: ${formatSupabaseErrorMessage(cloudErr)}`);
          setLoading(false);
          return;
        }

        const cloudMapById = new Map<string, any>();
        const cloudMapByName = new Map<string, any>();
        (cloudServices || []).forEach((cs: any) => {
          if (cs.id) cloudMapById.set(String(cs.id), cs);
          if (cs.name) cloudMapByName.set(cs.name.trim().toLowerCase(), cs);
        });

        // 3. Compara serviço a serviço, casando por id ou nome
        const migrationItems: MigrationItem[] = [];
        let newCount = 0;
        let updateCount = 0;
        let addonsCount = 0;
        let imagesCount = 0;

        for (const entry of uniqueLegacyEntries) {
          const leg = entry.service;
          const legName = (leg.name || '').trim().toLowerCase();
          const legId = String(leg.id || '');
          const isManutencao = legId === '2' || legName.includes('manuten');

          const cloudMatch = cloudMapById.get(legId) || cloudMapByName.get(legName);
          const legComplements = entry.complements.filter(c => !(isManutencao && alongCompIds.includes(String(c?.id || ''))));
          const legImages = entry.images.length > 0 ? entry.images : (leg.imageUrl ? [leg.imageUrl] : []);

          if (!cloudMatch) {
            // Serviço novo para a nuvem
            const cleanAddonsPayload = legComplements.map(({ origin, ...rest }) => rest);
            migrationItems.push({
              serviceId: leg.id,
              serviceName: leg.name,
              category: leg.category || 'outros',
              isNewService: true,
              cloudHasAddons: false,
              cloudHasImages: false,
              addonsToAdd: legComplements,
              imagesToAdd: legImages,
              willUpdate: true,
              finalPayload: {
                id: leg.id,
                name: leg.name,
                duration_minutes: leg.durationMinutes || 60,
                price: leg.price || 0,
                description: leg.description || '',
                category: leg.category || 'outros',
                images: legImages,
                addons: cleanAddonsPayload
              }
            });
            newCount++;
            addonsCount += legComplements.length;
            imagesCount += legImages.length;
          } else {
            // Serviço já existe na nuvem: mesclar preservando dados da nuvem
            const existingCloudAddons: any[] = Array.isArray(cloudMatch.addons) 
              ? cloudMatch.addons 
              : Array.isArray(cloudMatch.complements) 
                ? cloudMatch.complements 
                : [];
            const existingCloudImages: string[] = Array.isArray(cloudMatch.images) ? cloudMatch.images : [];

            // Addons locais que não existem na nuvem
            const addonsToAdd = legComplements.filter(lc => {
              return !existingCloudAddons.some(ca => 
                (ca.id && String(ca.id) === String(lc.id)) || 
                (ca.name && ca.name.trim().toLowerCase() === (lc.name || '').trim().toLowerCase())
              );
            });

            // Imagens locais que não existem na nuvem
            const imagesToAdd = legImages.filter(li => !existingCloudImages.includes(li));

            const cleanAddonsToAdd = addonsToAdd.map(({ origin, ...rest }) => rest);
            const finalAddons = [...existingCloudAddons, ...cleanAddonsToAdd];
            const finalImages = [...existingCloudImages, ...imagesToAdd];

            const willUpdate = addonsToAdd.length > 0 || imagesToAdd.length > 0;
            if (willUpdate) {
              updateCount++;
              addonsCount += addonsToAdd.length;
              imagesCount += imagesToAdd.length;
            }

            migrationItems.push({
              serviceId: cloudMatch.id || leg.id,
              serviceName: cloudMatch.name || leg.name,
              category: cloudMatch.category || leg.category || 'outros',
              isNewService: false,
              cloudHasAddons: existingCloudAddons.length > 0,
              cloudHasImages: existingCloudImages.length > 0,
              addonsToAdd,
              imagesToAdd,
              willUpdate,
              finalPayload: {
                id: cloudMatch.id || leg.id,
                name: cloudMatch.name || leg.name,
                duration_minutes: cloudMatch.duration_minutes || leg.durationMinutes || 60,
                price: cloudMatch.price || leg.price || 0,
                description: cloudMatch.description || leg.description || '',
                category: cloudMatch.category || leg.category || 'outros',
                images: finalImages,
                addons: finalAddons
              }
            });
          }
        }

        setItems(migrationItems);
        setSummary({
          newServices: newCount,
          updatedServices: updateCount,
          totalAddons: addonsCount,
          totalImages: imagesCount
        });
        setLoading(false);
      } catch (err: any) {
        setErrorMsg(`Falha ao preparar migração: ${err?.message || 'Erro inesperado'}`);
        setLoading(false);
      }
    };

    analyzeMigration();
  }, [isOpen]);

  const handleExecuteMigration = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setErrorMsg('Supabase não conectado.');
      return;
    }

    setExecuting(true);
    setErrorMsg(null);

    try {
      const itemsToSave = items.filter(it => it.willUpdate);
      if (itemsToSave.length === 0) {
        onClose();
        return;
      }

      const rows = itemsToSave.map(it => it.finalPayload);

      // Grava em lote na tabela services (colunas images jsonb e addons jsonb)
      const { error: upsertErr } = await client.from('services').upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      // Releitura rigorosa do Supabase para validação e confirmação das contagens gravadas
      const { data: verifiedRows, error: verifyErr } = await client.from('services').select('*');
      if (verifyErr) {
        throw new Error(`Dados gravados, mas ocorreu falha na releitura do Supabase: ${verifyErr.message}`);
      }

      const verifiedServicesCount = (verifiedRows || []).length;
      const verifiedAddonsCount = (verifiedRows || []).reduce((acc: number, r: any) => {
        const count = Array.isArray(r.addons) ? r.addons.length : (Array.isArray(r.complements) ? r.complements.length : 0);
        return acc + count;
      }, 0);
      const verifiedImagesCount = (verifiedRows || []).reduce((acc: number, r: any) => {
        const count = Array.isArray(r.images) && r.images.length > 0 ? r.images.length : (r.image_url ? 1 : 0);
        return acc + count;
      }, 0);

      setConfirmationData({
        servicesCount: verifiedServicesCount,
        addonsCount: verifiedAddonsCount,
        imagesCount: verifiedImagesCount,
        migratedItemsCount: itemsToSave.length
      });
      setIsConfirmed(true);

      // Atualiza o estado da aplicação a partir da nuvem
      await pullFromSupabase(true);
      onSuccess(itemsToSave.length);
    } catch (err: any) {
      setErrorMsg(`Erro ao gravar no Supabase: ${formatSupabaseErrorMessage(err)}`);
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Topo do Modal */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-[#FAF7F4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#201510] text-white flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5 text-[#C5A88E]" />
            </div>
            <div>
              <h3 className="font-bold text-[#201510] text-base sm:text-lg">
                Importar Dados Antigos para a Nuvem
              </h3>
              <p className="text-xs text-stone-500">
                Grava complementos (addons) e fotos (images) na tabela <strong className="font-mono text-stone-700">services</strong> do Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isConfirmed && confirmationData ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-stone-900">
                  Importação Concluída e Confirmada na Nuvem!
                </h4>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  Os dados foram salvos nas colunas <strong className="font-mono text-stone-800">addons</strong> e <strong className="font-mono text-stone-800">images</strong> da tabela <strong className="font-mono text-stone-800">services</strong> do Supabase.
                  Efetuamos uma releitura em tempo real do banco de dados para confirmar as contagens totais:
                </p>
              </div>

              {/* Contagens Re-lidas e Confirmadas do Supabase */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-2">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F4] border border-[#EADDCF] text-center shadow-2xs">
                  <span className="block text-[11px] text-stone-500">Procedimentos</span>
                  <strong className="text-xl font-bold text-[#201510]">{confirmationData.servicesCount}</strong>
                  <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">confirmados</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center shadow-2xs">
                  <span className="block text-[11px] text-emerald-800">Complementos</span>
                  <strong className="text-xl font-bold text-emerald-700">{confirmationData.addonsCount}</strong>
                  <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">armazenados</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center shadow-2xs">
                  <span className="block text-[11px] text-indigo-800">Fotos Vinculadas</span>
                  <strong className="text-xl font-bold text-indigo-700">{confirmationData.imagesCount}</strong>
                  <span className="block text-[10px] text-indigo-700 font-semibold mt-0.5">armazenadas</span>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500">
              <RefreshCw className="w-8 h-8 animate-spin text-[#8C6B4F]" />
              <p className="text-sm font-medium">Analisando catálogo local e do Supabase...</p>
            </div>
          ) : (
            <>
              {/* Regra de Ouro / Garantia de integridade */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Garantia de Não Sobrescrita:</strong>
                  <span>Nenhum campo já preenchido no Supabase será apagado ou sobrescrito com valor vazio. Apenas complementos e fotos que faltavam serão adicionados.</span>
                </div>
              </div>

              {/* Resumo da Prévia */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#FAF7F4] border border-[#EADDCF] text-center">
                  <span className="block text-[11px] text-stone-500">Novos Serviços</span>
                  <strong className="text-lg font-bold text-[#201510]">{summary.newServices}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF7F4] border border-[#EADDCF] text-center">
                  <span className="block text-[11px] text-stone-500">Serviços Atualizados</span>
                  <strong className="text-lg font-bold text-[#8C6B4F]">{summary.updatedServices}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF7F4] border border-[#EADDCF] text-center">
                  <span className="block text-[11px] text-stone-500">Complementos</span>
                  <strong className="text-lg font-bold text-emerald-700">+{summary.totalAddons}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#FAF7F4] border border-[#EADDCF] text-center">
                  <span className="block text-[11px] text-stone-500">Fotos Vinculadas</span>
                  <strong className="text-lg font-bold text-indigo-700">+{summary.totalImages}</strong>
                </div>
              </div>

              {/* Lista de Prévia por Serviço */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Prévia detalhada com contagens que serão enviadas por procedimento:
                </h4>

                <div className="space-y-2.5">
                  {items.map((it) => (
                    <div
                      key={it.serviceId}
                      className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-2.5 ${
                        it.willUpdate
                          ? 'bg-white border-stone-300 shadow-2xs'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong className="font-semibold text-stone-900">{it.serviceName}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            {it.category}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            it.isNewService
                              ? 'bg-purple-100 text-purple-800'
                              : it.willUpdate
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {it.isNewService
                            ? 'Novo na Nuvem'
                            : it.willUpdate
                            ? 'Será Enriquecido'
                            : 'Já Sincronizado'}
                        </span>
                      </div>

                      {/* Total que será enviado por serviço */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] bg-[#FAF7F4] p-2.5 rounded-xl border border-[#EADDCF]">
                        <span className="font-bold text-stone-700">Total a enviar para a nuvem:</span>
                        <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span><strong>{it.finalPayload?.addons?.length || 0}</strong> complemento(s)</span>
                          {it.addonsToAdd.length > 0 && (
                            <span className="text-[10px] text-emerald-600 font-normal">(+{it.addonsToAdd.length} novos)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-800 font-semibold">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span><strong>{it.finalPayload?.images?.length || 0}</strong> foto(s)</span>
                          {it.imagesToAdd.length > 0 && (
                            <span className="text-[10px] text-indigo-600 font-normal">(+{it.imagesToAdd.length} novas)</span>
                          )}
                        </span>
                      </div>

                      {/* Detalhe nominal dos novos complementos com origem */}
                      {it.addonsToAdd.length > 0 && (
                        <div className="text-[11px] text-stone-600 pl-1 flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="font-semibold text-stone-700">Complementos a adicionar:</span>
                          {it.addonsToAdd.map((a, aIdx) => (
                            <span key={`${a.id || a.name}-${aIdx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-800">
                              <span className="font-medium">{a.name}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                                a.origin === 'servidor' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : a.origin === 'memória' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {a.origin || 'local'}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-stone-200 bg-[#FAF7F4] flex items-center justify-between gap-3">
          {isConfirmed ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#201510] hover:bg-[#38261E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Concluir e Fechar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={executing}
                className="px-4 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={loading || executing || summary.newServices + summary.updatedServices === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                  loading || executing || summary.newServices + summary.updatedServices === 0
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-[#201510] hover:bg-[#38261E] text-white cursor-pointer active:scale-95'
                }`}
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A88E]" />
                    <span>Gravando e conferindo no Supabase...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#C5A88E]" />
                    <span>Confirmar e Gravar na Nuvem</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
