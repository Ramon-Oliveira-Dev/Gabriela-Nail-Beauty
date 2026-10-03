import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../StoreContext';

interface ServiceGalleryPageProps {
  title?: string;
  subtitle?: string;
  images?: string[];
  onBack: () => void;
}

export const ServiceGalleryPage: React.FC<ServiceGalleryPageProps> = ({ onBack }) => {
  const { catalogContent } = useStore();
  const expData = catalogContent.experiencia || {
    title: 'Viva Esta Experiência',
    subtitle: 'Galeria do Espaço Gabriela Santos',
    images: [
      { id: '1', url: '/gallery/nail_salon.jpg', caption: 'Nosso espaço aconchegante' },
      { id: '2', url: '/gallery/nail_art_1.jpg', caption: 'Detalhes em nail art' },
      { id: '3', url: '/gallery/nail_french.jpg', caption: 'Francesinha clássica' },
      { id: '4', url: '/gallery/nail_almond.jpg', caption: 'Formato amendoado' }
    ]
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const imageList = (expData.images || []).map(i => i.url);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-0 z-50 bg-[#FDFBF7] overflow-y-auto"
    >
      {/* Background silk-like shapes & floating elements */}
      <div className="fixed inset-0 opacity-60 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-[#F2E8DC] blur-3xl mix-blend-multiply opacity-50"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-[#E8DCC8] blur-3xl mix-blend-multiply opacity-50"
        />
      </div>

      {/* Botão de Voltar Flutuante */}
      <button 
        onClick={onBack}
        aria-label="Voltar"
        className="fixed top-5 left-5 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-[#EADDCE] text-[#54463E] hover:bg-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <div className="relative z-10 pb-20 pt-6">
        <div className="max-w-2xl mx-auto px-6 text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#8C6B4F] block mb-1">
            {expData.subtitle}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#201510] font-bold">
            {expData.title}
          </h2>
        </div>

        {/* Image Gallery em toda a extensão horizontal da tela */}
        <div className="w-full space-y-4">
          {imageList.map((img, idx) => {
            const caption = expData.images[idx]?.caption;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * idx }}
                className="w-full h-[380px] sm:h-[480px] md:h-[540px] bg-[#EADDCE] relative overflow-hidden group shadow-sm"
              >
                <div className="absolute inset-0 bg-[#c5a059]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                <img 
                  src={img} 
                  alt={`${expData.title} - Imagem ${idx + 1}`} 
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src.endsWith('.webp')) {
                      target.src = target.src.replace('.webp', '.jpg');
                    } else if (target.src.endsWith('.jpg')) {
                      target.src = target.src.replace('.jpg', '.png');
                    } else {
                      target.src = '/aplicacao_1.webp';
                    }
                  }}
                />
                {caption && (
                  <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/70 via-black/20 to-transparent text-white z-20">
                    <p className="font-serif text-base sm:text-lg font-medium">{caption}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
