import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasFiredRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, 4500);
    return () => clearTimeout(timer);
  }, [handleFinish]);

  const text = "SEU MOMENTO DE CUIDADO COMEÇA AQUI.";
  const words = text.split(" ");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 1.2 }
    }
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFBF7] overflow-hidden"
    >
      {/* Background silk-like shapes & floating elements */}
      <div className="absolute inset-0 opacity-60 pointer-events-none overflow-hidden">
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

         {/* Floating light particles */}
         <motion.div 
           animate={{ y: [0, -40, 0], opacity: [0.2, 0.6, 0.2] }}
           transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-[20%] left-[15%] w-3 h-3 rounded-full bg-[#c5a059] blur-[2px]"
         />
         <motion.div 
           animate={{ y: [0, -50, 0], opacity: [0.2, 0.5, 0.2] }}
           transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
           className="absolute bottom-[25%] right-[20%] w-4 h-4 rounded-full bg-[#E8DCC8] blur-[2px]"
         />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center w-full max-w-lg px-4"
      >
        {/* Decorative Leaf - Top Left */}
        <motion.svg 
          initial={{ opacity: 0, x: -20, rotate: -30 }}
          animate={{ opacity: 0.5, x: 0, rotate: -15 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
          className="absolute -top-8 left-0 sm:left-10 w-20 h-20 sm:w-24 sm:h-24 text-[#c5a059] pointer-events-none z-0 drop-shadow-sm" 
          viewBox="0 0 100 100" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5"
        >
          <path d="M50,90 C30,70 10,40 20,20 C40,10 70,30 90,50 C90,70 70,90 50,90 Z" />
          <path d="M20,20 L50,90" />
          <path d="M35,55 C45,45 55,50 55,50" />
        </motion.svg>

        {/* Decorative Leaf - Bottom Right */}
        <motion.svg 
          initial={{ opacity: 0, x: 20, rotate: 30 }}
          animate={{ opacity: 0.35, x: 0, rotate: 15 }}
          transition={{ duration: 1.5, delay: 0.7, ease: "easeOut" }}
          className="absolute top-44 right-[-10px] sm:right-2 w-20 h-20 text-[#B08D6E] pointer-events-none z-0" 
          viewBox="0 0 100 100" 
          fill="currentColor" 
        >
          <path d="M50 0 C70 20, 90 40, 90 70 C90 90, 70 100, 50 100 C30 100, 10 90, 10 70 C10 40, 30 20, 50 0 Z" />
        </motion.svg>

        {/* Blob Photo Container */}
        <div className="relative mb-10 w-[240px] h-[260px] sm:w-[300px] sm:h-[320px] flex items-center justify-center group mt-8">
          {/* Subtle gold glow behind */}
          <div className="absolute inset-[-15px] bg-gradient-to-tr from-[#c5a059] via-[#E8DCC8] to-[#F2E8DC] blob-shape opacity-40 blur-2xl group-hover:opacity-60 transition-opacity duration-700"></div>
          
          {/* Thin Gold rings */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-8px] rounded-[45%_55%_70%_30%/40%_50%_60%_50%] border-[1.5px] border-[#c5a059]/30 border-dashed pointer-events-none"
          />

          <img 
            src="/gabi.webp" 
            alt="Gabriela" 
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src.endsWith('.webp')) target.src = '/gabi.jpg';
            }}
            className="w-full h-full object-cover blob-shape relative z-10 shadow-2xl border-[3px] border-[#FDFBF7]"
          />
        </div>

        {/* Logo (Aumentada) */}
        <motion.img 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          src="/logo_gabi.png" 
          alt="Gabriela Nail & Beauty" 
          className="w-[320px] sm:w-[420px] md:w-[460px] h-auto mb-8 drop-shadow-md relative z-10" 
        />

        {/* Animated & Interactive Text */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 mb-8 max-w-[320px] sm:max-w-[380px] relative z-10"
        >
          {words.map((word, i) => (
            <motion.span 
              key={i} 
              variants={wordVariants} 
              whileHover={{ scale: 1.15, color: '#c5a059', y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="inline-block text-[10px] sm:text-[11px] tracking-[0.25em] text-[#6b625b] uppercase font-semibold cursor-pointer"
            >
              {word}
            </motion.span>
          ))}
        </motion.div>

        {/* Monograma - Bottom */}
        <motion.img 
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
          src="/monograma-gs_1.png" 
          alt="Monograma" 
          className="w-20 h-20 sm:w-24 sm:h-24 mt-4 relative z-10 object-contain" 
        />

      </motion.div>
    </motion.div>
  );
};
