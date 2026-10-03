import React, { useState } from 'react';
import { X, Copy, Check, Share2, QrCode, Download, ExternalLink } from 'lucide-react';
import { useDeviceBackButton } from '../hooks/useDeviceBackButton';
import { getPublicClientUrl } from '../utils';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl?: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  publicUrl
}) => {
  useDeviceBackButton(isOpen, onClose);

  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen) return null;

  const clientUrl = getPublicClientUrl(publicUrl);
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=15&format=png&data=${encodeURIComponent(clientUrl)}`;

  const defaultMessage = `Olá! ✨ Agende seu momento exclusivo na *Gabriela Santos - Nail & Beauty* de forma rápida e prática pelo nosso aplicativo online:\n\n💅 Procedimentos de Alongamento, Manutenção, Esmaltação em Gel e Cuidados Especiais.\n\n📲 Acesse e agende seu horário:\n👉 ${clientUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenExternalPWA = () => {
    window.open(clientUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Gabriela Santos - Nail & Beauty',
          text: defaultMessage,
          url: clientUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQrCode = async () => {
    try {
      const response = await fetch(qrCodeImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-gabriela-santos-nail-beauty.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(qrCodeImageUrl, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-100 space-y-5 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FAF6F2] border border-[#E8DDD2] text-[#8C6B4F] flex items-center justify-center shadow-2xs">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#201510]">
              Link para Clientes
            </h3>
            <p className="text-xs text-[#6B5A51]">
              Compartilhe com suas clientes e acesse o app externo
            </p>
          </div>
        </div>

        {/* Caixa do Link */}
        <div className="bg-[#FAF6F2] p-3.5 rounded-2xl border border-[#EDE4DC] space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F] block">
            Link de Agendamento Oficial (Modo PWA)
          </label>
          <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-stone-200 text-xs text-[#201510] font-mono break-all select-all">
            <span className="flex-1 truncate">{clientUrl}</span>
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#201510] text-white hover:bg-[#3D2C24]'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Botões Principais Requisitados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Botão Compartilhar Link */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#201510] hover:bg-[#3D2C24] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#C5A88E]" />
            <span>Compartilhar</span>
          </button>

          {/* Botão Ver QR Code */}
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border ${
              showQrCode 
                ? 'bg-[#201510] text-white border-[#201510]' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
            }`}
          >
            <QrCode className="w-4 h-4 text-[#C5A88E]" />
            <span>{showQrCode ? 'Ocultar QR' : 'QR Code'}</span>
          </button>

          {/* Botão Direcionar ao App PWA Externo */}
          <button
            type="button"
            onClick={handleOpenExternalPWA}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            title="Abrir o aplicativo no modo PWA externo"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir App PWA</span>
          </button>
        </div>

        {/* Exibição do QR Code */}
        {showQrCode && (
          <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-[#E8DDD2] text-center space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-medium text-[#201510]">
              <span className="font-semibold">QR Code de Agendamento PWA</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Ativo
              </span>
            </div>
            
            <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-center">
              <img 
                src={qrCodeImageUrl}
                alt="QR Code de Agendamento Gabriela Nail & Beauty"
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-[11px] text-[#6B5A51]">
              Aponte a câmera para abrir o aplicativo no celular em modo PWA.
            </p>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQrCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201510] hover:bg-[#3D2C24] text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Imagem</span>
              </button>
              <button
                type="button"
                onClick={() => window.open(qrCodeImageUrl, '_blank')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Imagem</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
