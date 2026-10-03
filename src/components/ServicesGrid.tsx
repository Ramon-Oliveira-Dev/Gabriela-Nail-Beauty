import React, { useState, useEffect, useMemo } from 'react';
import { Service, ComplementaryService } from '../types';
import { formatCurrency, formatDuration, getDefaultServiceImage, getDefaultServiceGallery, getServiceCategory } from '../utils';
import { Clock, Calendar, ArrowRight, ChevronLeft, ChevronRight, Check, Sparkles, X, Plus } from 'lucide-react';
import { ComplementaryServicesModal } from './ComplementaryServicesModal';

interface ServicesGridProps {
  services: Service[];
  onSelectService?: (service: Service) => void;
  onViewAll?: () => void;
  selectedServices?: Service[];
  onToggleService?: (service: Service) => void;
  onRemoveService?: (serviceId: string, e?: React.MouseEvent) => void;
  onClearSelection?: () => void;
  onContinueToBooking?: () => void;
  onUpdateComplements?: (parentService: Service, complements: Service[]) => void;
  onComplementModalChange?: (isOpen: boolean) => void;
}

const getCategoryBadge = (category?: string, name?: string): { label: string; color: string } => {
  if (category === 'aplicacao') return { label: 'Aplicação', color: 'bg-[#201510] text-white' };
  if (category === 'manutencao') return { label: 'Manutenção', color: 'bg-[#8C6B4F] text-white' };
  const n = (name || '').toLowerCase();
  if (n.includes('manuten')) return { label: 'Manutenção', color: 'bg-[#8C6B4F] text-white' };
  if (n.includes('along')) return { label: 'Aplicação', color: 'bg-[#201510] text-white' };
  return { label: 'Cuidados', color: 'bg-stone-800 text-white' };
};

/**
 * Retorna as imagens para o carrossel de cada serviço.
 * Se o serviço já tiver uma galeria definida em `service.images`, usa ela.
 * Caso contrário, monta o conjunto temático com as imagens padrão correspondentes.
 */
const getServiceImages = (service: Service): string[] => {
  const defaultGallery = getDefaultServiceGallery(service);
  const defaultImg = getDefaultServiceImage(service);

  let resultImages: string[] = [];

  if (service.images && service.images.length > 0) {
    const validImages = service.images
      .filter((img) => typeof img === 'string' && img.trim() !== '')
      .map((img) => {
        if (img === '/service_alongamento.jpg') return '/gallery/nail_almond.jpg';
        if (img === '/service_gel.jpg') return '/gallery/nail_care.jpg';
        if (img === '/service_manicure.jpg') return '/gallery/nail_french.jpg';
        if (img === '/service_nailart.jpg') return '/gallery/nail_art_1.jpg';
        if (img === '/test_nails.jpg') return '/gallery/nail_salon.jpg';
        if (img === '/hero_nails.jpg') return '/gallery/nail_almond.jpg';
        return img;
      });
    resultImages = Array.from(new Set(validImages));
  } else if (service.imageUrl && service.imageUrl.trim() !== '') {
    resultImages = [service.imageUrl];
  }

  // Se tiver menos de 2 fotos, combina com a galeria padrão temática para o carrossel girar perfeitamente
  if (resultImages.length < 2) {
    const combined = Array.from(new Set([...resultImages, ...defaultGallery]));
    return combined.length > 0 ? combined : [defaultImg];
  }

  return resultImages;
};

interface CardImageCarouselProps {
  images: string[];
  serviceName: string;
  badge: { label: string; color: string };
  durationMinutes: number;
  intervalMs?: number;
}

/**
 * Carrossel automático de imagens mantendo rigorosamente o layout e padrão visual do card.
 */
const CardImageCarousel: React.FC<CardImageCarouselProps> = ({
  images,
  serviceName,
  badge,
  durationMinutes,
  intervalMs = 3800,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Transição automática cronometrada
  useEffect(() => {
    if (images.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, isHovered, intervalMs]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div
      className="relative aspect-[4/3] sm:h-44 md:h-52 w-full overflow-hidden bg-stone-100 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Imagens empilhadas com transição suave em cross-fade */}
      {images.map((img, idx) => {
        const isActive = idx === currentIndex;
        return (
          <img
            key={img + idx}
            src={img}
            alt={`${serviceName} - foto ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-700 ease-in-out ${
              isActive ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
            }`}
            loading={idx === 0 ? 'eager' : 'lazy'}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getDefaultServiceImage({ name: serviceName, category: badge.label });
            }}
          />
        );
      })}

      {/* Badge de Categoria */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 pointer-events-none">
        <span className={`text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-2xs backdrop-blur-xs ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Duração Pill */}
      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10 bg-black/65 backdrop-blur-xs text-white text-[9px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs pointer-events-none">
        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#C5A88E]" />
        <span>{formatDuration(durationMinutes)}</span>
      </div>

      {/* Controles manuais sutis no hover e dots de navegação */}
      {images.length > 1 && (
        <>
          {/* Botões laterais discretos no hover */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer shadow-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Próxima foto"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer shadow-xs"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Indicadores / Mini dots centralizados */}
          <div
            className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-3.5 sm:w-4 bg-white'
                    : 'w-1 sm:w-1.5 bg-white/50 hover:bg-white/85'
                }`}
                aria-label={`Ver foto ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const ServicesGrid: React.FC<ServicesGridProps> = ({
  services,
  onSelectService,
  onViewAll,
  selectedServices = [],
  onToggleService,
  onRemoveService,
  onClearSelection,
  onContinueToBooking,
  onUpdateComplements,
  onComplementModalChange,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'aplicacao' | 'manutencao' | 'outros'>('todos');
  const [modalParentService, setModalParentService] = useState<Service | null>(null);

  const handleOpenComplementsModal = (service: Service) => {
    setModalParentService(service);
    if (onComplementModalChange) {
      onComplementModalChange(true);
    }
  };

  const handleCloseComplementsModal = () => {
    setModalParentService(null);
    if (onComplementModalChange) {
      onComplementModalChange(false);
    }
  };

  const displayedServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    if (categoryFilter === 'todos') return services;
    const filtered = services.filter(s => getServiceCategory(s) === categoryFilter);
    return filtered.length > 0 ? filtered : services;
  }, [services, categoryFilter]);

  if (!services || services.length === 0) return null;

  const handleToggle = (service: Service) => {
    if (onToggleService) {
      onToggleService(service);
    } else if (onSelectService) {
      onSelectService(service);
    }
  };

  // Alterna diretamente a seleção de um serviço complementar no próprio card
  const handleToggleComplement = (parentService: Service, comp: ComplementaryService) => {
    if (!onUpdateComplements) return;

    // Obtém complementos atualmente selecionados para este serviço pai
    const currentComplements = selectedServices.filter(
      s => s.parentId === parentService.id || (s.isComplement && s.parentServiceName === parentService.name)
    );

    const isAlreadySelected = currentComplements.some(
      s => s.id === comp.id || (s.isComplement && s.name === comp.name)
    );

    let nextComplements: Service[];
    if (isAlreadySelected) {
      nextComplements = currentComplements.filter(
        s => s.id !== comp.id && !(s.isComplement && s.name === comp.name)
      );
    } else {
      const newCompService: Service = {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        price: comp.price,
        durationMinutes: comp.durationMinutes,
        imageUrl: comp.images?.[0],
        images: comp.images,
        category: 'outros',
        parentId: parentService.id,
        parentServiceName: parentService.name,
        isComplement: true,
      };
      nextComplements = [...currentComplements, newCompService];
    }

    onUpdateComplements(parentService, nextComplements);
  };

  return (
    <section 
      id="servicos" 
      className="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 scroll-mt-20 w-full"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#201510] font-normal tracking-tight">
            Nossos Serviços
          </h2>
        </div>
      </div>

      {/* Categorias: Todos, Aplicações, Manutenções, Outros Serviços (Sem Scroll Horizontal) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4 sm:mb-6 w-full max-w-2xl mx-auto">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'aplicacao', label: 'Aplicações' },
          { id: 'manutencao', label: 'Manutenções' },
          { id: 'outros', label: 'Outros', fullLabel: 'Outros Serviços' },
        ].map((cat) => {
          const isActive = categoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`w-full py-2 px-1 sm:px-3 rounded-full text-[11px] sm:text-xs font-semibold transition-all text-center truncate cursor-pointer ${
                isActive
                  ? 'bg-[#201510] text-white shadow-xs'
                  : 'bg-[#FAF6F2] text-[#76685F] hover:bg-[#F2EAE1] hover:text-[#201510] border border-[#EFE5DC]'
              }`}
            >
              <span className="sm:hidden">{cat.label}</span>
              <span className="hidden sm:inline">{cat.fullLabel || cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Organizado de 2 em 2 no Mobile e 3 a 4 colunas em telas maiores */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-6 w-full">
        {displayedServices.map((service, cardIndex) => {
          const images = getServiceImages(service);
          const badge = getCategoryBadge(service.category, service.name);
          const intervalMs = 3600 + (cardIndex % 3) * 600;
          const isSelected = selectedServices.some(s => s.id === service.id);
          
          // Identifica complementos selecionados para este procedimento específico
          const serviceComplements = selectedServices.filter(
            s => s.parentId === service.id || (s.isComplement && s.parentServiceName === service.name)
          );
          const complementsCount = serviceComplements.length;

          return (
            <div
              key={service.id}
              onClick={() => handleToggle(service)}
              className={`group bg-white rounded-2xl sm:rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer w-full relative ${
                isSelected
                  ? 'border-[#8C6B4F] bg-[#FAF6F2]/35 shadow-sm ring-2 ring-[#8C6B4F]/40'
                  : 'border-[#EADDCF]/80 hover:border-[#8C6B4F]/60'
              }`}
            >
              {/* Badge "Selecionado" (Ícone OK) no canto superior quando ativo */}
              {isSelected && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 pointer-events-none">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#8C6B4F] shadow-sm flex items-center justify-center border-2 border-white">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[3]" />
                  </div>
                </div>
              )}

              {/* Imagem do Procedimento com Carrossel Automático */}
              <CardImageCarousel
                images={images}
                serviceName={service.name}
                badge={badge}
                durationMinutes={service.durationMinutes}
                intervalMs={intervalMs}
              />

              {/* Informações do Card */}
              <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
                <div>
                  <h3 className={`font-serif text-sm sm:text-lg md:text-xl font-bold leading-tight transition-colors line-clamp-1 ${
                    isSelected ? 'text-[#8C6B4F]' : 'text-[#201510] group-hover:text-[#8C6B4F]'
                  }`}>
                    {service.name}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-[#76685F] mt-1 line-clamp-2 leading-relaxed min-h-[28px] sm:min-h-[32px]">
                    {service.description || 'Procedimento realizado com materiais de alta qualidade e acabamento refinado.'}
                  </p>

                  {/* Serviços complementares cadastrados diretamente no card */}
                  {(service.complements ?? []).length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#F0E8DF]/90 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#8C6B4F] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#8C6B4F]" />
                          Complementos
                        </span>
                        <span className="text-[9.5px] text-stone-400 font-medium">
                          {(service.complements ?? []).length} {(service.complements ?? []).length === 1 ? 'opção' : 'opções'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 sm:gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                        {(service.complements ?? []).map((comp, compIdx) => {
                          const isCompSelected = selectedServices.some(
                            s => (s.id === comp.id && (s.parentId === service.id || s.parentServiceName === service.name)) ||
                                 (s.isComplement && s.name === comp.name && (s.parentId === service.id || s.parentServiceName === service.name))
                          );

                          return (
                            <button
                              key={comp.id ? `${service.id}-${comp.id}` : `comp-${service.id}-${compIdx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplement(service, comp);
                              }}
                              className={`w-full p-1.5 sm:p-2 rounded-xl text-left transition-all flex items-center justify-between gap-1.5 border cursor-pointer ${
                                isCompSelected
                                  ? 'bg-[#FAF4ED] border-[#8C6B4F] text-[#201510] shadow-2xs ring-1 ring-[#8C6B4F]/30'
                                  : 'bg-[#FAF7F4]/80 border-[#EADDCF]/80 text-[#54463E] hover:bg-[#FAF4ED]/60 hover:border-[#D4C3B5]'
                              }`}
                              title={comp.description || comp.name}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                                  isCompSelected
                                    ? 'bg-[#8C6B4F] border-[#8C6B4F] text-white'
                                    : 'bg-white border-[#D4C3B5] text-transparent'
                                }`}>
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                                <span className="font-medium text-[10.5px] sm:text-xs truncate text-[#201510]">
                                  {comp.name}
                                </span>
                              </div>
                              <span className="font-serif font-bold text-[10.5px] sm:text-xs text-[#8C6B4F] shrink-0">
                                +{formatCurrency(comp.price)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preço e Botões: Selecionar + Adicionar Complementares */}
                <div className="pt-3 sm:pt-3.5 border-t border-stone-100/90 flex flex-col gap-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-[0.15em] text-stone-400">
                      a partir de
                    </span>
                    <span className="font-serif text-lg sm:text-xl font-medium text-[#1C1613]">
                      {formatCurrency(service.price)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    {/* Botão de seleção interativo */}
                    <button
                      id={`btn-select-service-${service.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(service);
                      }}
                      className={`w-full py-2.5 sm:py-3 px-3 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-[#8C6B4F] text-white shadow-2xs'
                          : 'bg-[#3A302A] text-white hover:bg-[#2C241F] active:scale-95'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          Selecionado
                        </>
                      ) : (
                        'Selecionar'
                      )}
                    </button>

                    {/* Botão para ver fotos e detalhes dos complementos */}
                    {service.complements && service.complements.length > 0 && (
                      <button
                        id={`btn-complements-service-${service.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenComplementsModal(service);
                        }}
                        className="text-[10px] sm:text-[11px] text-[#8C6B4F] hover:text-[#54463E] font-medium text-center hover:underline py-0.5 cursor-pointer flex items-center justify-center gap-1"
                        title="Ver fotos e detalhes dos complementos"
                      >
                        <Sparkles className="w-3 h-3 text-[#8C6B4F]" />
                        <span>Ver fotos dos complementos</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal de Serviços Complementares */}
      <ComplementaryServicesModal
        isOpen={!!modalParentService}
        onClose={handleCloseComplementsModal}
        parentService={modalParentService}
        allServices={services}
        selectedServices={selectedServices}
        onSaveComplements={(parent, complements) => {
          if (onUpdateComplements) {
            onUpdateComplements(parent, complements);
          }
        }}
      />
    </section>
  );
};
