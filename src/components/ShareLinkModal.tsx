import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, Share2, Instagram, QrCode, Download, ExternalLink, Send } from 'lucide-react';
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
  const [copiedBio, setCopiedBio] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen) return null;

  // Determina a URL pública oficial e atualizada para as clientes
  const clientUrl = getPublicClientUrl(publicUrl);
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=15&format=png&data=${encodeURIComponent(clientUrl)}`;

  const defaultMessage = `Olá! ✨ Agende seu momento exclusivo na *Gabriela Santos - Nail & Beauty* de forma rápida e prática pelo nosso aplicativo online:\n\n💅 Procedimentos de Alongamento, Manutenção, Esmaltação em Gel e Cuidados Especiais.\n\n📲 Acesse e agende seu horário:\n👉 ${clientUrl}`;

  const bioText = `💅 Gabriela Santos | Nail & Beauty\n✨ Agende seu horário online:\n👇 ${clientUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyBio = () => {
    navigator.clipboard.writeText(bioText);
    setCopiedBio(true);
    setTimeout(() => setCopiedBio(false), 2500);
  };

  const handleOpenLink = () => {
    window.open(clientUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendWhatsapp = () => {
    const encoded = encodeURIComponent(defaultMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
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
        // Se o usuário cancelar ou falhar, abre no WhatsApp
      }
    } else {
      handleSendWhatsapp();
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

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

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
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors"
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
              Compartilhe com suas clientes para agendamentos online
            </p>
          </div>
        </div>

        {/* Caixa do Link */}
        <div className="bg-[#FAF6F2] p-3.5 rounded-2xl border border-[#EDE4DC] space-y-2">
          <label className="text-[10px] uppercase font-bold tracking-wider text-[#8C6B4F] block">
            Link de Agendamento Oficial
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

        {/* Botões de Ação Rápida */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSendWhatsapp}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>

            {hasNativeShare ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-[#201510] hover:bg-[#3D2C24] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#C5A88E]" />
                <span>Compartilhar Geral</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenLink}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border border-stone-200"
              >
                <ExternalLink className="w-4 h-4 text-stone-600" />
                <span>Abrir e Testar</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopyBio}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer border border-stone-200/70"
              title="Copiar texto formatado para a Bio do Instagram"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>{copiedBio ? 'Copiado!' : 'Bio Insta'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-medium transition-colors cursor-pointer border ${
                showQrCode 
                  ? 'bg-[#201510] text-white border-[#201510]' 
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200/70'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-[#C5A88E]" />
              <span>{showQrCode ? 'Ocultar QR' : 'Ver QR Code'}</span>
            </button>

            {hasNativeShare ? (
              <button
                type="button"
                onClick={handleOpenLink}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer border border-stone-200/70"
                title="Abrir a tela da cliente para testar"
              >
                <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
                <span>Testar Link</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] sm:text-xs font-medium transition-colors cursor-pointer border border-stone-200/70"
                title="Copiar link"
              >
                <Copy className="w-3.5 h-3.5 text-stone-600" />
                <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Exibição do QR Code */}
        {showQrCode && (
          <div className="p-4 bg-[#FAF6F2] rounded-2xl border border-[#E8DDD2] text-center space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-medium text-[#201510]">
              <span className="font-semibold">QR Code de Agendamento</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Atualizado & Ativo
              </span>
            </div>
            
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-center">
              <img 
                src={qrCodeImageUrl}
                alt="QR Code de Agendamento Gabriela Nail & Beauty"
                className="w-full h-full object-contain"
              />
            </div>
            
            <p className="text-[11px] text-[#6B5A51]">
              Aponte a câmera do celular ou imprima para colocar no balcão e cartões de visita.
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
