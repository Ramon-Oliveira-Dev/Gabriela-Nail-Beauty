import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { CatalogContentMap, ExperienceGalleryItem } from '../types';
import { Check, Image as ImageIcon, Plus, Trash2, User, Camera, Upload } from 'lucide-react';

const ImageUploader = ({ value, onChange, placeholder = 'URL ou selecione do dispositivo...' }: { value: string; onChange: (url: string) => void; placeholder?: string }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        onChange(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-mono focus:outline-none focus:border-[#9C8259]"
      />
      <label className="px-3.5 py-2.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F3ECE4] border border-[#EAE2D7] text-[#54463E] text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95">
        <Upload className="w-3.5 h-3.5 text-[#8C6B4F]" />
        <span>Arquivo</span>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>
      {value && (
        <div className="w-10 h-10 rounded-xl border border-[#EAE2D7] overflow-hidden shrink-0 bg-stone-100 shadow-2xs">
          <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e)=>{(e.target as any).src='/aplicacao_1.webp'}} />
        </div>
      )}
    </div>
  );
};

export const CatalogContentAdminView: React.FC = () => {
  const { catalogContent, setCatalogContent } = useStore();
  const [activeTab, setActiveTab] = useState<'experiencia' | 'sobreMim'>('experiencia');
  
  // Local editable state synchronized with catalogContent
  const [content, setContent] = useState<CatalogContentMap>(JSON.parse(JSON.stringify(catalogContent)));
  const [successToast, setSuccessToast] = useState(false);

  // Sync state when catalogContent changes externally
  React.useEffect(() => {
    setContent(JSON.parse(JSON.stringify(catalogContent)));
  }, [catalogContent]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogContent(content);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);
  };

  const currentTabLabel = {
    experiencia: 'Viva Esta Experiência',
    sobreMim: 'Sobre Mim'
  }[activeTab];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="bg-[#FAF6F2] border border-[#EADDCF] p-5 sm:p-6 rounded-3xl shadow-2xs">
        <span className="text-[#8C6B4F] text-[10px] uppercase tracking-[0.2em] font-bold mb-1.5 block">Gerenciamento de Conteúdo</span>
        <h3 className="font-serif text-2xl sm:text-3xl text-[#201510] font-bold mb-2">Edição de Catálogo & Páginas</h3>
        <p className="text-sm text-[#6B5B48]">
          Personalize textos, fotos da galeria de atendimento e biografia do perfil público em tempo real.
        </p>

        {/* Abas de Navegação das Páginas */}
        <div className="grid grid-cols-2 gap-3 mt-5 max-w-md">
          {[
            { id: 'experiencia', label: 'Viva Esta Experiência (Galeria)', icon: Camera },
            { id: 'sobreMim', label: 'Sobre Mim (Perfil & Bio)', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                  isSel
                    ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                    : 'bg-white text-[#54463E] border-[#E2D6CB] hover:bg-[#FAF6F2]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSel ? 'text-[#C5A88E]' : 'text-[#8C6B4F]'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seção 1: Viva Esta Experiência (Galeria) */}
        {activeTab === 'experiencia' && (() => {
          const expData = content.experiencia || { title: '', subtitle: '', images: [] };

          return (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-4">
                <h4 className="font-serif text-lg font-bold text-[#2B2520] border-b border-[#F0E8DF] pb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#8C6B4F]" />
                  <span>Cabeçalho da Galeria (Viva Esta Experiência)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Título da Seção</label>
                    <input
                      type="text"
                      value={expData.title || ''}
                      onChange={e => setContent({ ...content, experiencia: { ...expData, title: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Subtítulo</label>
                    <input
                      type="text"
                      value={expData.subtitle || ''}
                      onChange={e => setContent({ ...content, experiencia: { ...expData, subtitle: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0E8DF] pb-3">
                  <h4 className="font-serif text-lg font-bold text-[#2B2520] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#8C6B4F]" />
                    <span>Fotos da Galeria ({expData.images?.length || 0})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const newImg: ExperienceGalleryItem = { id: Math.random().toString(36).substring(2,9), url: '/gallery/nail_art_1.jpg', caption: 'Nova foto' };
                      setContent({ ...content, experiencia: { ...expData, images: [...(expData.images || []), newImg] } });
                    }}
                    className="text-xs bg-[#201510] text-white font-bold px-3.5 py-2 rounded-xl hover:bg-[#38261E] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Foto</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(expData.images || []).map((img, idx) => (
                    <div key={img.id || idx} className="p-4 rounded-2xl border border-[#EADDCF] bg-[#FAF6F2]/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#8A7458]">Foto #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const imgs = expData.images.filter((_, i) => i !== idx);
                            setContent({ ...content, experiencia: { ...expData, images: imgs } });
                          }}
                          className="text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-[#8A7458] font-bold mb-1">Imagem da Galeria</label>
                        <ImageUploader 
                          value={img.url} 
                          onChange={url => {
                            const imgs = [...expData.images];
                            imgs[idx] = { ...imgs[idx], url };
                            setContent({ ...content, experiencia: { ...expData, images: imgs } });
                          }} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-[#8A7458] font-bold mb-1">Legenda / Descrição</label>
                        <input
                          type="text"
                          value={img.caption}
                          onChange={e => {
                            const imgs = [...expData.images];
                            imgs[idx] = { ...imgs[idx], caption: e.target.value };
                            setContent({ ...content, experiencia: { ...expData, images: imgs } });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Seção 3: Sobre Mim */}
        {activeTab === 'sobreMim' && (() => {
          const aboutData = content.sobreMim || { name: '', title: '', subtitle: '', photoUrl: '', bioParagraphs: [], stats: [] };

          return (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-4">
                <h4 className="font-serif text-lg font-bold text-[#2B2520] border-b border-[#F0E8DF] pb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#8C6B4F]" />
                  <span>Perfil & Informações (Sobre Mim)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Nome da Profissional</label>
                    <input
                      type="text"
                      value={aboutData.name || ''}
                      onChange={e => setContent({ ...content, sobreMim: { ...aboutData, name: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Cargo / Especialidade</label>
                    <input
                      type="text"
                      value={aboutData.title || ''}
                      onChange={e => setContent({ ...content, sobreMim: { ...aboutData, title: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Subtítulo / Slogan</label>
                    <input
                      type="text"
                      value={aboutData.subtitle || ''}
                      onChange={e => setContent({ ...content, sobreMim: { ...aboutData, subtitle: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Foto de Perfil</label>
                    <ImageUploader 
                      value={aboutData.photoUrl || ''} 
                      onChange={url => setContent({ ...content, sobreMim: { ...aboutData, photoUrl: url } })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Parágrafos da Biografia</label>
                  <div className="space-y-3">
                    {(aboutData.bioParagraphs || []).map((p, pIdx) => (
                      <div key={pIdx} className="flex gap-2">
                        <textarea
                          rows={2}
                          value={p}
                          onChange={e => {
                            const paragraphs = [...aboutData.bioParagraphs];
                            paragraphs[pIdx] = e.target.value;
                            setContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: paragraphs } });
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-light"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const paragraphs = aboutData.bioParagraphs.filter((_, i) => i !== pIdx);
                            setContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: paragraphs } });
                          }}
                          className="text-rose-700 hover:bg-rose-50 p-2 rounded-xl transition-colors cursor-pointer self-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: [...(aboutData.bioParagraphs || []), 'Novo parágrafo de biografia...'] } });
                      }}
                      className="text-xs font-bold text-[#8C6B4F] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Parágrafo</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Estatísticas (Destaques)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(aboutData.stats || []).map((st, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-xl border border-[#EADDCF] bg-[#FAF6F2]/60 space-y-2">
                        <div>
                          <label className="block text-[9px] uppercase text-[#8A7458] font-bold">Valor (ex: 5+)</label>
                          <input
                            type="text"
                            value={st.value}
                            onChange={e => {
                              const stats = [...aboutData.stats];
                              stats[sIdx] = { ...stats[sIdx], value: e.target.value };
                              setContent({ ...content, sobreMim: { ...aboutData, stats } });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-[#EAE2D7] bg-white text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase text-[#8A7458] font-bold">Rótulo (ex: Anos)</label>
                          <input
                            type="text"
                            value={st.label}
                            onChange={e => {
                              const stats = [...aboutData.stats];
                              stats[sIdx] = { ...stats[sIdx], label: e.target.value };
                              setContent({ ...content, sobreMim: { ...aboutData, stats } });
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-[#EAE2D7] bg-white text-xs font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Botão de Salvar Geral */}
        <div className="bg-white rounded-3xl p-5 border border-[#EFE7DC] shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#2B2520]">Salvar alterações de catálogo</p>
            <p className="text-[11px] text-[#76685F]">As modificações serão aplicadas instantaneamente para todas as clientes.</p>
          </div>
          <button
            type="submit"
            className="py-4 px-8 rounded-2xl bg-[#1C1713] text-[#F7F1E8] text-[11px] font-bold tracking-[0.16em] uppercase hover:bg-[#332B23] transition-colors cursor-pointer shadow-xs flex items-center gap-2"
          >
            {successToast ? (
              <>
                <Check className="w-4 h-4 text-[#25D366]" />
                <span>CATÁLOGO ATUALIZADO COM SUCESSO!</span>
              </>
            ) : (
              <span>SALVAR ALTERAÇÕES</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
