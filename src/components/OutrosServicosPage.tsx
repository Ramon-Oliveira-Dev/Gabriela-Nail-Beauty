import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../StoreContext';

interface OutrosServicosPageProps {
  onBack: () => void;
}

const ImageOrPlaceholder = ({ 
  src, 
  placeholderTitle, 
  className,
  priority = false 
}: { 
  src: string; 
  placeholderTitle: string; 
  className?: string;
  priority?: boolean;
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    if (currentSrc.endsWith('.webp')) {
      setCurrentSrc(currentSrc.replace('.webp', '.jpg'));
    } else if (currentSrc.endsWith('.jpg')) {
      setCurrentSrc(currentSrc.replace('.jpg', '.png'));
    } else {
      setError(true);
    }
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center text-[#54463E] border border-dashed border-[#A08775]/40 bg-black/5 ${className}`}>
        <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 mb-2 opacity-60" strokeWidth={1} />
        <p className="text-xs sm:text-sm font-medium text-center px-2">{placeholderTitle}</p>
      </div>
    );
  }

  return (
    <img 
      src={currentSrc} 
      alt={placeholderTitle} 
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
      className={`object-cover ${className}`}
    />
  );
};

export const OutrosServicosPage: React.FC<OutrosServicosPageProps> = ({ onBack }) => {
  const { catalogContent } = useStore();
  const pageContent = catalogContent.outros;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const heroImage = pageContent?.heroImage || '/outros_servicos_1.webp';
  const heroTitle = pageContent?.title || 'Outros Serviços';
  const heroSubtitle = pageContent?.subtitle || 'Cuidados essenciais para mãos e pés';
  const sections = pageContent?.sections || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-[#F9F6F0] overflow-y-auto"
    >
      {/* Header - Floating Back Button */}
      <div className="fixed top-6 left-4 z-[60]">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md border border-white/50 text-[#54463E] shadow-md hover:bg-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[60vh] min-h-[450px] flex flex-col items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <ImageOrPlaceholder 
            src={heroImage} 
            placeholderTitle="Outros serviços" 
            priority={true}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></div>
        </div>

        {/* Hero Overlay Text */}
        <div className="relative z-10 flex flex-col items-center text-white text-center px-4 mt-auto pb-16">
          <p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase font-medium mb-3 text-white/90">
            {heroSubtitle}
          </p>
          <div className="relative inline-block">
            <h1 className="font-serif text-5xl sm:text-6xl relative z-10 tracking-[0.05em] uppercase text-white drop-shadow-lg leading-tight whitespace-pre-line">
              {heroTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Sections Dynamic Rendering */}
      {sections.map((sec, idx) => {
        const isAlternate = idx % 2 === 1;
        const bgColor = isAlternate ? 'bg-[#EAE2D8]' : 'bg-[#F9F6F0]';
        const imgBgColor = isAlternate ? 'bg-[#D7C9B8]' : 'bg-[#EADDCE]';

        return (
          <React.Fragment key={sec.id || idx}>
            {idx > 0 && (
              <svg viewBox="0 0 1440 100" className={`w-full h-auto ${idx % 2 === 0 ? 'bg-[#EAE2D8]' : 'bg-[#F9F6F0]'} block -mb-1 text-[${idx % 2 === 0 ? '#F9F6F0' : '#EAE2D8'}]`} preserveAspectRatio="none">
                <path fill="currentColor" d="M0,50 C320,100 420,0 740,50 C1060,100 1120,0 1440,50 L1440,100 L0,100 Z"></path>
              </svg>
            )}

            <div className={`${bgColor} py-12 relative z-10`}>
              <div className="max-w-2xl mx-auto px-6 flex flex-col items-center text-center">
                <h2 className="font-serif text-[28px] sm:text-[34px] text-[#231812] leading-[1.15] mb-8 uppercase tracking-wide whitespace-pre-line">
                  {sec.title}
                </h2>
              </div>

              {/* Imagem */}
              <div className={`w-full h-[380px] sm:h-[480px] md:h-[540px] ${imgBgColor} mb-8 overflow-hidden relative`}>
                <ImageOrPlaceholder 
                  src={sec.imageUrl} 
                  placeholderTitle={sec.title} 
                  className="w-full h-full object-cover object-center" 
                />
              </div>

              <div className="max-w-2xl mx-auto px-6 flex flex-col items-center text-center">
                <p className="text-[15px] sm:text-base text-[#54463E] leading-[1.8] font-light max-w-lg">
                  {sec.text}
                </p>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Footer */}
      <div className="bg-[#FDFBF7] px-6 py-10 pb-16 text-center border-t border-[#EAE2D8]/50 mt-10" style={{
        borderTopLeftRadius: '50% 15%',
        borderTopRightRadius: '50% 15%',
      }}>
        <p className="text-[11px] sm:text-xs text-[#A08775] max-w-[280px] sm:max-w-md mx-auto">
          © 2026 Gabriela Santos Nail Designer. Todos os direitos reservados.
        </p>
      </div>
    </motion.div>
  );
};
