import React from 'react';
import { ArrowLeft, Sparkles, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../StoreContext';

interface AboutMePageProps {
  onBack: () => void;
}

export const AboutMePage: React.FC<AboutMePageProps> = ({ onBack }) => {
  const { catalogContent, config } = useStore();
  const aboutData = catalogContent.sobreMim || {
    name: 'Gabriela Santos',
    title: 'Nail Designer & Especialista',
    subtitle: 'Transformando unhas em obras de arte',
    photoUrl: '/sobre_mim.webp',
    bioParagraphs: [
      'Sou Gabriela Santos, apaixonada por nail design e por elevar a autoestima de cada cliente através de um atendimento exclusivo e técnicas avançadas.',
      'Com anos de experiência e constante aperfeiçoamento, nosso estúdio é um refúgio de cuidado, sofisticação e perfeição em cada detalhe.'
    ],
    stats: [
      { label: 'Anos de Experiência', value: '5+' },
      { label: 'Clientes Atendidas', value: '1.200+' },
      { label: 'Procedimentos', value: '3.500+' }
    ]
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#FDFBF7] overflow-hidden font-sans select-none h-[100dvh] max-h-[100dvh] w-full"
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

      {/* Top Header Bar */}
      <div className="relative z-30 flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3.5 shrink-0 border-b border-[#EADDCE]/40 bg-white/40 backdrop-blur-xs">
        <button 
          onClick={onBack}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/90 border border-[#E8DDD2] text-[#201510] shadow-xs hover:bg-white hover:border-[#C5A88E] active:scale-95 transition-all cursor-pointer"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>
        <div className="flex items-center gap-1.5 text-[#8C6B4F] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A88E]" />
          <span>Sobre Mim</span>
        </div>
        <div className="w-9 sm:w-10" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center w-full px-4 sm:px-6 md:px-8 py-2 md:py-6 overflow-y-auto">
        
        {/* DESKTOP & TABLET LAYOUT */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-10 lg:gap-14 md:items-center md:max-w-5xl md:w-full my-auto">
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
            <div className="relative w-[300px] h-[340px] lg:w-[360px] lg:h-[400px] xl:w-[420px] xl:h-[460px] flex items-center justify-center group shrink-0">
              <div className="absolute inset-[-16px] bg-gradient-to-tr from-[#c5a059] via-[#E8DCC8] to-[#F2E8DC] blob-shape opacity-40 blur-2xl group-hover:opacity-60 transition-opacity duration-700" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-10px] rounded-[45%_55%_70%_30%/40%_50%_60%_50%] border-2 border-[#c5a059]/40 border-dashed pointer-events-none"
              />
              <img 
                src={aboutData.photoUrl || '/sobre_mim.webp'} 
                alt="Sobre Mim" 
                className="w-full h-full object-cover blob-shape relative z-10 shadow-2xl border-[3px] border-[#FDFBF7]"
                onError={(e)=>{(e.target as any).src='/sobre_mim.webp'}}
              />
            </div>

            <div className="mt-4 flex items-center justify-center">
              <img 
                src={config.logoUrl || '/logo_gabi_header.png'} 
                alt="Gabriela Santos" 
                className="h-10 sm:h-12 w-auto object-contain select-none" 
              />
            </div>
          </div>

          <div className="md:col-span-7 text-left flex flex-col justify-center space-y-4">
            <div>
              <span className="text-[#8C6B4F] text-xs font-bold tracking-[0.25em] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A88E]" />
                {aboutData.subtitle}
              </span>
            </div>

            <div className="space-y-3.5 text-[15.5px] lg:text-[17px] text-[#42342B] leading-relaxed">
              {aboutData.bioParagraphs?.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
              
              {aboutData.stats && aboutData.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-3 pt-3">
                  {aboutData.stats.map((st, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#F8F2EC] border border-[#EADDCE] text-center">
                      <p className="font-serif text-lg font-bold text-[#201510]">{st.value}</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F] mt-0.5">{st.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="md:hidden flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full text-center py-2 space-y-3">
          <div className="relative w-[190px] h-[210px] sm:w-[240px] sm:h-[270px] flex items-center justify-center group shrink-0 my-auto">
            <div className="absolute inset-[-10px] bg-gradient-to-tr from-[#c5a059] via-[#E8DCC8] to-[#F2E8DC] blob-shape opacity-45 blur-xl" />
            <img 
              src={aboutData.photoUrl || '/sobre_mim.webp'} 
              alt="Sobre Mim" 
              className="w-full h-full object-cover blob-shape relative z-10 shadow-xl border-2 border-[#FDFBF7]"
              onError={(e)=>{(e.target as any).src='/sobre_mim.webp'}}
            />
          </div>

          <div className="flex items-center justify-center my-1">
            <img 
              src={config.logoUrl || '/logo_gabi_header.png'} 
              alt="Gabriela Santos" 
              className="h-8 sm:h-10 w-auto object-contain select-none" 
            />
          </div>

          <div className="space-y-2 text-xs text-[#42342B] leading-relaxed px-2 overflow-y-auto max-h-[180px]">
            {aboutData.bioParagraphs?.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {aboutData.stats && aboutData.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2 w-full pt-1">
              {aboutData.stats.map((st, i) => (
                <div key={i} className="p-2 rounded-xl bg-[#F8F2EC] border border-[#EADDCE] text-center">
                  <p className="font-serif text-sm font-bold text-[#201510]">{st.value}</p>
                  <p className="text-[9px] uppercase font-bold text-[#8C6B4F]">{st.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
};
