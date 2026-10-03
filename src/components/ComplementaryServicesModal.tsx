import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Clock, Check, Plus, ShieldCheck } from 'lucide-react';
import { Service } from '../types';
import { formatCurrency, formatDuration } from '../utils';

interface ComplementaryServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentService: Service | null;
  allServices: Service[];
  selectedServices: Service[];
  onSaveComplements: (parentService: Service, complements: Service[]) => void;
}

export const ComplementaryServicesModal: React.FC<ComplementaryServicesModalProps> = ({
  isOpen,
  onClose,
  parentService,
  allServices = [],
  selectedServices = [],
  onSaveComplements,
}) => {
  // Lista de complementos definidos pelo administrador na edição do serviço
  const availableComplements = useMemo(() => {
    if (!parentService || !parentService.complements) return [];
    
    return parentService.complements.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      price: comp.price,
      durationMinutes: comp.durationMinutes,
      imageUrl: comp.images?.[0],
      images: comp.images,
      category: 'outros' as const,
      parentId: parentService.id,
      parentServiceName: parentService.name,
      isComplement: true,
    }));
  }, [parentService]);

  // Estado local dos complementos selecionados para este serviço pai (Hook incondicional)
  const [currentSelected, setCurrentSelected] = useState<Service[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Sincroniza complementos selecionados quando abre o modal (Hook incondicional)
  useEffect(() => {
    if (parentService && isOpen) {
      // Pega os complementos que já estavam selecionados para esse serviço
      const existing = selectedServices.filter(
        (s) => s.parentId === parentService.id || (s.isComplement && s.parentServiceName === parentService.name)
      );
      setCurrentSelected(existing);
    } else {
      setCurrentSelected([]);
    }
  }, [parentService, isOpen, selectedServices]);

  // Retorno antecipado APÓS todas as chamadas de hooks do componente
  if (!isOpen || !parentService) return null;

  const toggleComplement = (item: Service) => {
    setCurrentSelected((prev) => {
      const exists = prev.some(
        (s) => s.id === item.id || (s.name.toLowerCase() === item.name.toLowerCase() && s.parentId === parentService.id)
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.id === item.id || (s.name.toLowerCase() === item.name.toLowerCase() && s.parentId === parentService.id))
        );
      } else {
        return [
          ...prev,
          {
            ...item,
            parentId: parentService.id,
            parentServiceName: parentService.name,
            isComplement: true,
          },
        ];
      }
    });
  };

  const totalComplementsDuration = currentSelected.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalComplementsPrice = currentSelected.reduce((acc, s) => acc + (s.price || 0), 0);

  const handleConfirm = () => {
    onSaveComplements(parentService, currentSelected);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[#E5D7CC] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-3.5 sm:p-4 border-b border-[#F0E6DE] bg-[#FAF6F2] flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Serviços Complementares</span>
            </div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#201510] mt-0.5 leading-tight">
              {parentService.name}
            </h3>
            <p className="text-xs text-[#76685F] mt-0.5">
              Personalize seu atendimento adicionando cuidados extras e decorações.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Procedimentos Complementares Disponíveis */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
          {availableComplements.map((item, itemIdx) => {
            const isChecked = currentSelected.some(
              (s) => s.id === item.id || (s.name.toLowerCase() === item.name.toLowerCase() && s.parentId === parentService.id)
            );

            return (
              <div
                key={item.id ? `${parentService.id}-${item.id}` : `item-${itemIdx}`}
                onClick={() => toggleComplement(item)}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isChecked
                    ? 'border-[#8C6B4F] bg-[#FAF6F2]/70 ring-1 ring-[#8C6B4F]/30 shadow-2xs'
                    : 'border-stone-200/80 hover:border-[#8C6B4F]/40 hover:bg-stone-50/70'
                }`}
              >
                {/* Lado Esquerdo: Checkbox + Imagem (Opcional) + Título + Descrição */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors mt-0.5 shrink-0 ${
                      isChecked
                        ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white'
                        : 'border-stone-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                  
                  {item.imageUrl && (
                    <div 
                      className="relative shrink-0 mt-0.5 group/thumb"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(item.imageUrl || null);
                      }}
                      title="Toque para ampliar a foto"
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover bg-stone-100 border border-stone-200/90 shadow-2xs hover:opacity-90 transition-opacity"
                      />
                      {item.images && item.images.length > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-[#8C6B4F] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-2xs">
                          +{item.images.length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className={`text-xs sm:text-sm font-semibold leading-tight ${isChecked ? 'text-[#8C6B4F]' : 'text-[#201510]'}`}>
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-[#76685F] mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8C6B4F]" />
                        +{formatDuration(item.durationMinutes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Preço */}
                <div className="text-right shrink-0">
                  <span className="font-serif text-xs sm:text-sm font-bold text-[#8C6B4F]">
                    +{formatCurrency(item.price)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Resumo dos Complementos e Ação */}
        <div className="p-3 sm:p-4 border-t border-[#F0E6DE] bg-[#FAF6F2] flex items-center justify-between gap-3 shrink-0">
          <div className="text-left min-w-0">
            <div className="text-xs text-[#76685F] truncate">
              <strong className="text-[#201510] font-semibold">{currentSelected.length}</strong>{' '}
              {currentSelected.length === 1 ? 'adicional' : 'adicionais'}
            </div>
            {currentSelected.length > 0 && (
              <div className="text-[11px] sm:text-xs font-semibold text-[#8C6B4F] mt-0.5">
                +{formatDuration(totalComplementsDuration)} • +{formatCurrency(totalComplementsPrice)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 sm:px-4 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-confirmar-complementos"
              onClick={handleConfirm}
              className="py-2 px-3.5 sm:px-4 rounded-xl bg-[#201510] hover:bg-[#38261E] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#C5A88E]" />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visualizador de Foto Ampliada do Complemento */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={previewImage} 
              alt="Foto ampliada" 
              className="w-full h-auto max-h-[72vh] object-contain rounded-xl bg-stone-50"
            />
          </div>
        </div>
      )}
    </div>
  );
};
