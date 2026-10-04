import React, { useState, useEffect, useRef } from 'react';
import { Service, ComplementaryService, ServiceCategory } from '../types';
import { useStore } from '../StoreContext';
import { 
  formatDuration, 
  formatCurrencyFromDigits, 
  formatNumberToCurrencyString, 
  parseCurrencyStringToNumber 
} from '../utils';
import { X, Upload, Trash2, Image as ImageIcon, Sparkles, Check, Plus, Edit2, Settings2 } from 'lucide-react';

interface AdminServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Omit<Service, 'id'>, existingId?: string) => Promise<boolean | void> | boolean | void;
  serviceToEdit?: Service | null;
}

export const AdminServiceModal: React.FC<AdminServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceToEdit,
}) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('aplicacao');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(80);
  const [displayPrice, setDisplayPrice] = useState('80,00');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Estados para gerenciamento de categorias do menu da cliente no botão Gerenciar
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryLabel, setEditCategoryLabel] = useState('');

  const [complementsList, setComplementsList] = useState<ComplementaryService[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = true;

    if (serviceToEdit) {
      setName(serviceToEdit.name || '');
      setCategory(serviceToEdit.category || (categoriesRef.current[0]?.id || 'outros'));
      setDurationMinutes(serviceToEdit.durationMinutes || 60);
      setPrice(serviceToEdit.price || 0);
      setDisplayPrice(formatNumberToCurrencyString(serviceToEdit.price || 0));
      setDescription(serviceToEdit.description || '');
      
      const imgValue = serviceToEdit.imageUrl || serviceToEdit.images?.[0] || '';
      setImage(imgValue || '');
      
      const genuineComplements = (serviceToEdit.complements || [])
        .filter(c => c && typeof c.name === 'string' && c.name.trim().length > 0)
        .map(c => ({
          ...c,
          id: c.id ? String(c.id) : `complement-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }));
      setComplementsList(genuineComplements);
    } else {
      setName('');
      setCategory(categoriesRef.current[0]?.id || 'aplicacao');
      setDurationMinutes(60);
      setPrice(80);
      setDisplayPrice('80,00');
      setDescription('');
      setImage('');
      setComplementsList([]);
    }
    setUploadError(null);
    setSaveError(null);

    if (!wasOpen) {
      setIsManagingCategories(false);
      setConfirmDeleteId(null);
      setNewCategoryLabel('');
      setEditingCategoryId(null);
    }
  }, [serviceToEdit?.id, isOpen]);

  if (!isOpen) return null;

  // Processa upload de 1 imagem local para o serviço com compressão automática e suporte amplo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      setUploadError('Fotos no formato HEIC precisam ser convertidas para JPG antes do envio.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isLikelyImage = 
      (file.type && file.type.toLowerCase().startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|bmp|jfif|svg|pjpeg|pjp)$/i.test(file.name) ||
      file.size > 0;

    if (!isLikelyImage) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    setSaveError(null);
    const reader = new FileReader();

    reader.onerror = () => {
      setUploadError('Não foi possível processar esta foto. Use uma imagem JPG ou PNG.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setUploadError('Não foi possível processar esta foto. Use uma imagem JPG ou PNG.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const img = new Image();
      img.onerror = () => {
        setUploadError('Não foi possível processar esta foto. Use uma imagem JPG ou PNG.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      img.onload = () => {
        try {
          const compressToCanvas = (maxDim: number, quality: number) => {
            const canvas = document.createElement('canvas');
            let width = Math.max(1, img.width || 800);
            let height = Math.max(1, img.height || 800);

            if (width > height) {
              if (width > maxDim) {
                height = Math.round(height * (maxDim / width));
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round(width * (maxDim / height));
                height = maxDim;
              }
            }

            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toDataURL('image/jpeg', quality);
          };

          let compressedDataUrl = compressToCanvas(800, 0.82);

          if (!compressedDataUrl) {
            setUploadError('Não foi possível processar esta foto. Use uma imagem JPG ou PNG.');
            return;
          }

          if (compressedDataUrl.length > 1000000) {
            const smallerDataUrl = compressToCanvas(600, 0.7);
            if (smallerDataUrl && smallerDataUrl.length <= 1000000) {
              compressedDataUrl = smallerDataUrl;
            } else {
              setUploadError('Foto muito pesada (mesmo após redução). Escolha uma imagem menor.');
              return;
            }
          }

          setImage(compressedDataUrl);
        } catch {
          setUploadError('Não foi possível processar esta foto. Use uma imagem JPG ou PNG.');
        } finally {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryLabel.trim();
    if (!trimmed) return;
    const customId = `cat-${Date.now()}`;
    const res = await addCategory({
      id: customId,
      label: trimmed,
    });
    if (!res.success) {
      alert(res.error || 'Erro ao adicionar categoria');
      return;
    }
    setCategory(customId);
    setNewCategoryLabel('');
  };

  const handleAddComplement = () => {
    const newComplement: ComplementaryService = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      durationMinutes: 15,
      images: []
    };
    setComplementsList([...complementsList, newComplement]);
  };

  const handleUpdateComplement = (id: string, field: keyof ComplementaryService, value: any) => {
    setComplementsList(prev => prev.map(comp => 
      comp.id === id ? { ...comp, [field]: value } : comp
    ));
  };

  const handleRemoveComplement = (id: string) => {
    setComplementsList(prev => prev.filter(comp => comp.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!name.trim()) {
      setSaveError('Por favor, informe o nome do procedimento.');
      return;
    }

    const cleanComplements = complementsList
      .filter(c => c && typeof c.name === 'string' && c.name.trim().length > 0)
      .map(c => ({
        id: c.id || `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: c.name.trim(),
        description: (c.description || '').trim(),
        price: Number(c.price) || 0,
        durationMinutes: Number(c.durationMinutes) || 15,
        images: []
      }));

    setIsSaving(true);
    try {
      const res = await onSave(
        {
          name: name.trim(),
          category,
          durationMinutes: Number(durationMinutes),
          price: Number(price),
          description: description.trim(),
          imageUrl: image || '',
          images: image ? [image] : [],
          complements: cleanComplements,
        },
        serviceToEdit?.id
      );

      // Só fecha a janela após sucesso confirmado (res !== false)
      if (res !== false) {
        onClose();
      } else {
        setSaveError('Não foi possível salvar o procedimento. Tente novamente.');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao salvar procedimento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-[#FAF6F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-[#E5D7CA] flex items-center justify-center text-[#8C6B4F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#201510]">
                {serviceToEdit ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h3>
              <p className="text-xs text-[#76685F]">
                {serviceToEdit ? 'Atualize os dados, valores e foto do serviço' : 'Cadastre um novo serviço com imagem e duração'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* Nome do Serviço */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600 mb-1.5">
              Nome do Procedimento *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alongamento em Fibra de Vidro"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm focus:outline-none focus:border-[#8C6B4F]"
            />
          </div>

          {/* Categoria do Serviço com Opção de Adicionar, Editar e Remover no botão Gerenciar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600">
                Categoria para o Menu da Cliente
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsManagingCategories(prev => !prev);
                  setNewCategoryLabel('');
                  setEditingCategoryId(null);
                  setConfirmDeleteId(null);
                }}
                className={`text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  isManagingCategories 
                    ? 'bg-[#201510] text-white border-[#201510]' 
                    : 'text-[#8C6B4F] bg-[#FAF6F2] hover:bg-[#F2EAE1] hover:text-[#201510] border-[#E8DDD2]'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{isManagingCategories ? 'Fechar Gestão' : 'Gerenciar Categorias'}</span>
              </button>
            </div>

            {/* Painel Inline: Gerenciar, Adicionar e Remover Categorias */}
            {isManagingCategories && (
              <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#E8DDD2] space-y-3 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#EFE7DC]">
                  <span className="text-xs font-bold text-[#201510] flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5 text-[#8C6B4F]" />
                    Gestão de Categorias ({categories.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManagingCategories(false)}
                    className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Adicionar Nova Categoria no Gerenciar */}
                <div className="space-y-1">
                  <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-[#8C6B4F]">
                    Criar Nova Categoria
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      placeholder="Nome da categoria (ex: Banho de Gel, Spa dos Pés...)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryLabel.trim()}
                      className="px-3 py-1.5 rounded-xl bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C5A88E]" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Categorias com Remover e Editar */}
                <div className="space-y-1 pt-1">
                  <label className="block text-[10.5px] uppercase tracking-wider font-semibold text-[#8C6B4F]">
                    Categorias Existentes (Remover / Editar)
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const isEditing = editingCategoryId === cat.id;
                      const isSelectedForThis = category === cat.id;
                      return (
                        <div
                          key={cat.id}
                          className={`p-2 rounded-xl bg-white border flex items-center justify-between gap-2 ${
                            isSelectedForThis ? 'border-[#8C6B4F] ring-1 ring-[#8C6B4F]/20' : 'border-stone-200/90'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editCategoryLabel}
                                onChange={(e) => setEditCategoryLabel(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (editCategoryLabel.trim()) {
                                      const res = await updateCategory(cat.id, { label: editCategoryLabel.trim() });
                                      if (!res.success) {
                                        alert(res.error || 'Erro ao atualizar categoria');
                                        return;
                                      }
                                      setEditingCategoryId(null);
                                    }
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C6B4F]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!editCategoryLabel.trim()) return;
                                  const res = await updateCategory(cat.id, { label: editCategoryLabel.trim() });
                                  if (!res.success) {
                                    alert(res.error || 'Erro ao atualizar categoria');
                                    return;
                                  }
                                  setEditingCategoryId(null);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-[#201510] text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Check className="w-3 h-3 text-[#C5A88E]" />
                                <span>Salvar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div 
                                className="min-w-0 flex-1 flex items-center gap-2 cursor-pointer"
                                onClick={() => setCategory(cat.id)}
                              >
                                <span className="text-xs font-semibold text-stone-800 truncate">
                                  {cat.label}
                                </span>
                                {isSelectedForThis && (
                                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#FAF4ED] text-[#8C6B4F] border border-[#EADDCE] font-semibold shrink-0">
                                    Selecionada
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditCategoryLabel(cat.label);
                                  }}
                                  title="Editar nome da categoria"
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-500 hover:text-[#201510] hover:bg-stone-100 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirmDeleteId === cat.id) {
                                      const res = await deleteCategory(cat.id);
                                      if (!res.success) {
                                        setSaveError(res.error || 'Erro ao remover categoria');
                                        setConfirmDeleteId(null);
                                        return;
                                      }
                                      if (category === cat.id) {
                                        const remaining = categories.filter(c => c.id !== cat.id);
                                        setCategory(remaining[0]?.id || 'outros');
                                      }
                                      setConfirmDeleteId(null);
                                    } else {
                                      setConfirmDeleteId(cat.id);
                                    }
                                  }}
                                  title={confirmDeleteId === cat.id ? "Confirmar exclusão" : "Excluir categoria"}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                    confirmDeleteId === cat.id 
                                      ? 'bg-red-500 text-white hover:bg-red-600' 
                                      : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                  }`}
                                >
                                  {confirmDeleteId === cat.id ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                                {confirmDeleteId === cat.id && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Seleção de Categorias para o Procedimento */}
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    category === cat.id
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-stone-700 border-[#E8DDD2] hover:bg-stone-100'
                  }`}
                >
                  {category === cat.id && <Check className="w-3 h-3 text-[#C5A88E]" />}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duração e Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600 mb-1.5">
                Duração (Minutos)
              </label>
              <input
                type="number"
                min="15"
                step="5"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm focus:outline-none focus:border-[#8C6B4F]"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[30, 45, 60, 75, 90, 120].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                      durationMinutes === mins
                        ? 'bg-[#8C6B4F] text-white'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {formatDuration(mins)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600 mb-1.5">
                Valor (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-stone-400 text-sm font-semibold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={displayPrice}
                  onChange={(e) => {
                    const formatted = formatCurrencyFromDigits(e.target.value);
                    setDisplayPrice(formatted);
                    setPrice(parseCurrencyStringToNumber(formatted));
                  }}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-sm font-bold focus:outline-none focus:border-[#8C6B4F]"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Ex: 80,00 ou 1.250,00</p>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600 mb-1.5">
              Descrição & Detalhes do Procedimento (Exibido para a cliente)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a técnica, materiais utilizados ou benefícios para a cliente..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F] leading-relaxed"
            />
          </div>

          {/* SEÇÃO DE IMAGEM DO SERVIÇO: SOMENTE 1 FOTO */}
          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EADDCF] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider font-bold text-[#201510] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#8C6B4F]" />
                Foto do Procedimento
              </label>
              <span className="text-[11px] text-[#76685F]">{image ? '1 foto selecionada' : 'Sem foto'}</span>
            </div>

            <div className="flex items-center gap-4">
              {image ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#D9CCC1] shadow-xs group bg-white shrink-0">
                  <img
                    src={image}
                    alt="Foto do procedimento"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as any).src = '/logo_gabi_header.png'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center text-red-500 shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-10 cursor-pointer"
                    title="Remover Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl border border-dashed border-[#D9CCC1] bg-white flex flex-col items-center justify-center text-stone-400 shrink-0">
                  <ImageIcon className="w-6 h-6 mb-1 text-stone-300" />
                  <span className="text-[9.5px] font-medium leading-tight text-center">Sem foto</span>
                </div>
              )}

              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs text-[#6E5D53]">
                  {image 
                    ? 'Foto pronta. Clique em Salvar Alterações para gravar.' 
                    : 'Selecione 1 foto do seu dispositivo para ilustrar este serviço (Máx: 1MB).'}
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#D9CCC1] text-[#201510] text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8C6B4F]" />
                    <span>{image ? 'Alterar Foto' : 'Adicionar Foto'}</span>
                  </button>

                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {uploadError}
              </p>
            )}
          </div>

          {/* Serviços Complementares */}
          <div className="bg-[#FAF6F2] p-4 sm:p-5 rounded-2xl border border-[#E8DDD2] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#201510] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#8C6B4F]" />
                  Serviços Complementares
                </h3>
                <p className="text-xs text-[#76685F] mt-0.5">Adicione opções extras (ex: Nail Art, Francesinha)</p>
              </div>
              <button
                type="button"
                onClick={handleAddComplement}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#8C6B4F] text-[#8C6B4F] text-xs font-semibold hover:bg-[#8C6B4F] hover:text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </button>
            </div>

            {complementsList.length > 0 && (
              <div className="space-y-4 pt-2">
                {complementsList.map((comp, compIdx) => (
                  <div key={comp.id ? `${comp.id}-${compIdx}` : `comp-${compIdx}`} className="p-3 bg-white border border-stone-200 rounded-xl space-y-3 relative group">
                    <button
                      type="button"
                      onClick={() => handleRemoveComplement(comp.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#8C6B4F] uppercase tracking-wider mb-1">
                          Título
                        </label>
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => handleUpdateComplement(comp.id, 'name', e.target.value)}
                          placeholder="Ex: Nail Art"
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#8C6B4F]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#8C6B4F] uppercase tracking-wider mb-1">
                            Preço (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-stone-400 text-xs font-semibold">R$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumberToCurrencyString(comp.price)}
                              onChange={(e) => {
                                const num = parseCurrencyStringToNumber(formatCurrencyFromDigits(e.target.value));
                                handleUpdateComplement(comp.id, 'price', num);
                              }}
                              placeholder="0,00"
                              className="w-full pl-8 pr-2 py-2 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:border-[#8C6B4F]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#8C6B4F] uppercase tracking-wider mb-1">
                            Duração (min)
                          </label>
                          <input
                            type="number"
                            step="5"
                            value={comp.durationMinutes}
                            onChange={(e) => handleUpdateComplement(comp.id, 'durationMinutes', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#8C6B4F]"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8C6B4F] uppercase tracking-wider mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={comp.description}
                        onChange={(e) => handleUpdateComplement(comp.id, 'description', e.target.value)}
                        placeholder="Descreva o procedimento complementar..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#8C6B4F] resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              {saveError}
            </p>
          )}

          {/* Botões do Rodapé */}
          <div className="pt-2 flex justify-end gap-2.5 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-full text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm flex items-center gap-2 ${
                isSaving ? 'bg-stone-500 cursor-not-allowed' : 'bg-[#201510] hover:bg-[#3d2a20] cursor-pointer'
              }`}
            >
              {isSaving && <Sparkles className="w-3.5 h-3.5 animate-spin text-[#C5A88E]" />}
              <span>{isSaving ? 'Salvando no Supabase...' : (serviceToEdit ? 'Salvar Alterações' : 'Cadastrar Procedimento')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
