import React, { useState } from 'react';
import { useStore } from '../StoreContext';
import { CatalogContentMap, ExperienceGalleryItem } from '../types';
import { Check, Image as ImageIcon, Plus, Trash2, User, Camera, Upload } from 'lucide-react';

const compressImage = (file: File): Promise<{ base64: string; error?: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = Math.round(img.width);
        let height = Math.round(img.height);
        const maxWidth = 900;
        const maxHeight = 900;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: '', error: 'Não foi possível processar esta foto. Use uma imagem JPG ou PNG.' });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);

        if (compressedDataUrl.length > 350000) {
          const maxW2 = 700;
          const maxH2 = 700;
          width = Math.round(img.width);
          height = Math.round(img.height);
          if (width > height) {
            if (width > maxW2) {
              height = Math.round(height * (maxW2 / width));
              width = maxW2;
            }
          } else {
            if (height > maxH2) {
              width = Math.round(width * (maxH2 / height));
              height = maxH2;
            }
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);

          if (compressedDataUrl.length > 350000) {
            resolve({ base64: '', error: 'Foto muito pesada. Escolha uma imagem menor.' });
            return;
          }
        }

        resolve({ base64: compressedDataUrl });
      };
      img.onerror = () => {
        resolve({ base64: '', error: 'Não foi possível processar esta foto. Use uma imagem JPG ou PNG.' });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ base64: '', error: 'Não foi possível processar esta foto. Use uma imagem JPG ou PNG.' });
    };
    reader.readAsDataURL(file);
  });
};

const ImageUploader = ({ value, onChange, placeholder = 'URL ou selecione do dispositivo...' }: { value: string; onChange: (url: string) => void; placeholder?: string }) => {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    const res = await compressImage(file);
    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.base64) {
      onChange(res.base64);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-3 items-center">
        <label className="px-3.5 py-2.5 rounded-xl bg-[#FAF6F2] hover:bg-[#F3ECE4] border border-[#EAE2D7] text-[#54463E] text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95">
          <Upload className="w-3.5 h-3.5 text-[#8C6B4F]" />
          <span>{value ? 'Substituir Foto' : 'Selecionar Arquivo'}</span>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {value ? (
          <div className="w-12 h-12 rounded-xl border border-[#EAE2D7] overflow-hidden shrink-0 bg-stone-100 shadow-2xs relative">
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-cover" 
              onError={(e)=>{
                const target = e.target as HTMLElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.fallback-box')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-box w-full h-full bg-stone-200 flex items-center justify-center text-[9px] text-stone-600 text-center p-0.5 font-medium';
                  fallback.innerText = 'Foto indisponível';
                  parent.appendChild(fallback);
                }
              }} 
            />
          </div>
        ) : (
          <span className="text-[11px] text-stone-500 italic">Nenhuma foto escolhida</span>
        )}
      </div>
      {value && <p className="text-xs text-[#6E5D53] italic">Foto pronta. Clique em Salvar alterações para gravar.</p>}
      {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}
    </div>
  );
};

export const CatalogContentAdminView: React.FC = () => {
  const { catalogContent, setCatalogContent } = useStore();
  const [activeTab, setActiveTab] = useState<'experiencia' | 'sobreMim'>('experiencia');
  
  // Local editable state synchronized with catalogContent
  const [content, setContent] = useState<CatalogContentMap>(JSON.parse(JSON.stringify(catalogContent)));
  const [successToast, setSuccessToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Sync state when catalogContent changes externally, only if not dirty
  React.useEffect(() => {
    if (!isDirty) {
      setContent(JSON.parse(JSON.stringify(catalogContent)));
    }
  }, [catalogContent, isDirty]);

  const updateContent = (newContent: CatalogContentMap) => {
    setContent(newContent);
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const res = await setCatalogContent(content);
    if (res && res.success) {
      setSuccessToast(true);
      setIsDirty(false);
      setTimeout(() => setSuccessToast(false), 3500);
    } else {
      setSaveError(res?.error || 'Erro ao salvar catálogo.');
    }
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
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold">
            {saveError}
          </div>
        )}

        {/* Seção 1: Viva Esta Experiência (Galeria) */}
        {activeTab === 'experiencia' && (() => {
          const expData = content.experiencia || { title: '', subtitle: '', images: [] };
          const imagesList = expData.images || [];

          return (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EFE7DC] shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#F0E8DF] pb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-serif text-lg font-bold text-[#2B2520] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#8C6B4F]" />
                      <span>Fotos da Galeria ({imagesList.length}/12)</span>
                    </h4>
                    {imagesList.length >= 12 && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Limite de 12 fotos
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={imagesList.length >= 12}
                    onClick={() => {
                      if (imagesList.length >= 12) return;
                      const newImages = [...imagesList, { id: Date.now().toString(), url: '', caption: '' }];
                      updateContent({ ...content, experiencia: { ...expData, images: newImages } });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs ${
                      imagesList.length >= 12
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : 'bg-[#201510] text-white hover:bg-[#38261E] cursor-pointer'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-[#C5A88E]" />
                    <span>Adicionar Foto</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imagesList.map((img, idx) => (
                    <div key={img.id || idx} className="p-4 rounded-2xl border border-[#EADDCF] bg-[#FAF6F2]/40 relative space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#8C6B4F] tracking-wider">
                          FOTO #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = imagesList.filter((_, i) => i !== idx);
                            updateContent({ ...content, experiencia: { ...expData, images: newImages } });
                          }}
                          className="w-7 h-7 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold">Imagem da Galeria</label>
                        <div className="flex gap-3 items-center">
                          <label className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FAF6F2] border border-[#EAE2D7] text-[#54463E] text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-[#8C6B4F]" />
                            <span>{img.url ? 'Substituir Foto' : 'Selecionar Arquivo'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadErrors(prev => ({ ...prev, [img.id]: '' }));
                                const res = await compressImage(file);
                                if (res.error) {
                                  setUploadErrors(prev => ({ ...prev, [img.id]: res.error }));
                                } else if (res.base64) {
                                  const newImages = [...imagesList];
                                  newImages[idx] = { ...img, url: res.base64 };
                                  updateContent({ ...content, experiencia: { ...expData, images: newImages } });
                                }
                                e.target.value = '';
                              }} 
                              className="hidden" 
                            />
                          </label>
                          {img.url ? (
                            <div className="space-y-1">
                              <div className="w-12 h-12 rounded-xl border border-[#EAE2D7] overflow-hidden shrink-0 bg-stone-100 shadow-2xs relative">
                                <img 
                                  src={img.url} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover" 
                                  onError={(e)=>{
                                    const target = e.target as HTMLElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.fallback-box')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'fallback-box w-full h-full bg-stone-200 flex items-center justify-center text-[9px] text-stone-600 text-center p-0.5 font-medium';
                                      fallback.innerText = 'Foto indisponível';
                                      parent.appendChild(fallback);
                                    }
                                  }} 
                                />
                              </div>
                              <p className="text-xs text-[#6E5D53] italic">Foto pronta. Clique em Salvar alterações para gravar.</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-500 italic">Nenhuma foto escolhida</span>
                          )}
                        </div>
                        {uploadErrors[img.id] && (
                          <p className="text-xs text-red-600 mt-1 font-medium">{uploadErrors[img.id]}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold">Legenda / Descrição</label>
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={e => {
                            const newImages = [...imagesList];
                            newImages[idx] = { ...img, caption: e.target.value };
                            updateContent({ ...content, experiencia: { ...expData, images: newImages } });
                          }}
                          placeholder="Ex: Nosso espaço aconchegante..."
                          className="w-full px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold focus:outline-none focus:border-[#9C8259]"
                        />
                      </div>
                    </div>
                  ))}

                  {imagesList.length === 0 && (
                    <div className="col-span-full text-center py-10 bg-[#FAF6F2]/40 rounded-2xl border border-dashed border-[#D9CCC1]">
                      <p className="text-xs text-stone-500 mb-3">Nenhuma foto na galeria cadastrada.</p>
                      <button
                        type="button"
                        onClick={() => {
                          updateContent({ ...content, experiencia: { ...expData, images: [{ id: '1', url: '', caption: '' }] } });
                        }}
                        className="px-4 py-2 rounded-xl bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] transition-colors cursor-pointer"
                      >
                        Adicionar Primeira Foto
                      </button>
                    </div>
                  )}
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
                      onChange={e => updateContent({ ...content, sobreMim: { ...aboutData, name: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Cargo / Especialidade</label>
                    <input
                      type="text"
                      value={aboutData.title || ''}
                      onChange={e => updateContent({ ...content, sobreMim: { ...aboutData, title: e.target.value } })}
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
                      onChange={e => updateContent({ ...content, sobreMim: { ...aboutData, subtitle: e.target.value } })}
                      className="w-full px-4 py-3 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A7458] font-bold mb-1.5">Foto de Perfil</label>
                    <ImageUploader 
                      value={aboutData.photoUrl || ''} 
                      onChange={url => updateContent({ ...content, sobreMim: { ...aboutData, photoUrl: url } })} 
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
                            updateContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: paragraphs } });
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#EAE2D7] bg-white text-[#2B2520] text-xs font-light"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const paragraphs = aboutData.bioParagraphs.filter((_, i) => i !== pIdx);
                            updateContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: paragraphs } });
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
                        updateContent({ ...content, sobreMim: { ...aboutData, bioParagraphs: [...(aboutData.bioParagraphs || []), 'Novo parágrafo de biografia...'] } });
                      }}
                      className="text-xs font-bold text-[#8C6B4F] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Parágrafo</span>
                    </button>
                  </div>
                </div>


              </div>
            </div>
          );
        })()}

        {/* Botão de Salvar Geral */}
        <div className="bg-white rounded-3xl p-5 border border-[#EFE7DC] shadow-sm space-y-4">
          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold">
              {saveError}
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
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
        </div>
      </form>
    </div>
  );
};
