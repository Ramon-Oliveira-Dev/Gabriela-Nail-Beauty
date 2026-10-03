import React from 'react';
import { useStore } from '../StoreContext';
import { Service } from '../types';
import { formatCurrency, formatDuration, getDefaultServiceImage } from '../utils';
import { X, Clock, Sparkles, Calendar, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

export const ServicesModal: React.FC<ServicesModalProps> = ({ isOpen, onClose, onSelectService }) => {
  const { services } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center bg-[#FAF6F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#E5D7CA] flex items-center justify-center text-[#8C6B4F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-[#201510] font-bold">Procedimentos & Serviços</h3>
              <p className="text-xs text-[#76685F]">Consulte o tempo estimado, detalhes e valores de cada procedimento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-stone-100">
          {services.map(service => (
            <div key={service.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Foto do Serviço */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#FAF6F2] border border-stone-200 shrink-0 flex items-center justify-center shadow-2xs">
                  <img 
                    src={service.imageUrl || getDefaultServiceImage(service)} 
                    alt={service.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getDefaultServiceImage(service);
                    }}
                  />
                </div>

                {/* Textos e Valores */}
                <div className="space-y-1 max-w-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-lg text-[#201510] font-bold">{service.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F2] text-[#8C6B4F] border border-[#E8DDD2]">
                      <Clock className="w-3 h-3" /> {formatDuration(service.durationMinutes)}
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-xs text-[#6B5A51] leading-relaxed line-clamp-2">{service.description}</p>
                  )}

                  <p className="text-base font-serif font-bold text-[#8C6B4F]">
                    {formatCurrency(service.price)}
                  </p>

                  {service.complements && service.complements.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className="text-[10px] font-semibold text-[#8C6B4F] bg-[#FAF6F2] border border-[#E8DDD2] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> {service.complements.length} {service.complements.length === 1 ? 'serviço complementar' : 'serviços complementares'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectService(service);
                  onClose();
                }}
                className="self-start sm:self-center shrink-0 px-5 py-2.5 rounded-full bg-[#201510] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#38261E] transition-colors flex items-center gap-2 shadow-sm"
              >
                Agendar <ChevronRight className="w-3.5 h-3.5 text-[#C5A88E]" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#FAF6F2] border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#76685F]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#8C6B4F]" />
            Cancelamentos e reagendamentos com até 24h de antecedência.
          </span>
          <button 
            onClick={onClose}
            className="text-[#201510] font-bold hover:underline"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
