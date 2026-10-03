import React, { useState, useEffect, useRef } from 'react';
import { Service, ComplementaryService, ServiceCategory } from '../types';
import { useStore } from '../StoreContext';
import { 
  formatDuration, 
  formatCurrencyFromDigits, 
  formatNumberToCurrencyString, 
  parseCurrencyStringToNumber 
} from '../utils';
import { X, Upload, Trash2, Image as ImageIcon, Sparkles, Check, Plus, Edit2, Settings2, FolderPlus } from 'lucide-react';

interface AdminServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Omit<Service, 'id'>, existingId?: string) => Promise<boolean | void> | boolean | void;
  serviceToEdit?: Service | null;
}

interface ComplementImageManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

const ComplementImageManager: React.FC<ComplementImageManagerProps> = ({
  images,
  onChange,
}) => {
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange([...images, compressedDataUrl]);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    if (customUrl.trim()) {
      onChange([...images, customUrl.trim()]);
      setCustomUrl('');
      setIsUrlMode(false);
    }
  };

  const handleRemoveImage = (idxToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div className="p-3 bg-[#FAF6F2]/90 rounded-xl border border-[#EADDCF] space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-wider font-semibold text-[#8C6B4F] flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-[#8C6B4F]" />
          Fotos do Procedimento ({images.length})
        </label>
        <span className="text-[10.5px] text-[#76685F]">Opcional</span>
      </div>

      {/* Preview das Fotos da Galeria */}
      <div className="flex flex-wrap gap-2.5">
        {images.map((url, idx) => (
          <div
            key={idx}
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#D9CCC1] shadow-2xs group bg-white"
          >
            <img
              src={url}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(idx)}
              className="absolute top-1 right-1 w-5 h-5 bg-white/95 backdrop-blur-xs rounded-full flex items-center justify-center text-red-500 shadow-2xs hover:bg-red-50 hover:text-red-600 transition-colors z-10 cursor-pointer"
              title="Remover Foto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            {idx === 0 && (
              <div className="absolute bottom-0 inset-x-0 bg-[#8C6B4F]/90 text-white text-[8px] text-center font-bold py-0.5">
                Capa
              </div>
            )}
          </div>
        ))}

        {images.length === 0 && (
          <div className="w-16 h-16 rounded-lg border border-dashed border-[#D9CCC1] bg-white flex flex-col items-center justify-center text-stone-400">
            <ImageIcon className="w-5 h-5 mb-0.5 text-stone-300" />
            <span className="text-[8.5px] font-medium text-center">Sem foto</span>
          </div>
        )}
      </div>

      {/* Botões de Ação para Imagem */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D9CCC1] text-[#201510] text-[11px] font-semibold hover:bg-stone-50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
        >
          <Upload className="w-3 h-3 text-[#8C6B4F]" />
          Adicionar
        </button>

        <button
          type="button"
          onClick={() => setIsUrlMode(!isUrlMode)}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D9CCC1] text-stone-600 text-[11px] font-medium hover:bg-stone-50 transition-colors cursor-pointer"
        >
          Link (URL)
        </button>

        {images.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium hover:bg-red-100 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
          {error}
        </p>
      )}

      {/* Inserir URL manual */}
      {isUrlMode && (
        <div className="flex gap-2 pt-1">
          <input
            type="url"
            placeholder="https://exemplo.com/foto-nailart.jpg"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:border-[#8C6B4F]"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 rounded-lg bg-[#201510] text-white text-xs font-semibold hover:bg-[#3d2a20] transition-colors cursor-pointer"
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
};

export const AdminServiceModal: React.FC<AdminServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serviceToEdit,
}) => {
  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('aplicacao');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(80);
  const [displayPrice, setDisplayPrice] = useState('80,00');
  const [description, setDescription] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Estados para gerenciamento de categorias do menu da cliente
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryLabel, setEditCategoryLabel] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');

  const [complementsList, setComplementsList] = useState<ComplementaryService[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name || '');
      setCategory(serviceToEdit.category || (categories[0]?.id || 'outros'));
      setDurationMinutes(serviceToEdit.durationMinutes || 60);
      setPrice(serviceToEdit.price || 0);
      setDisplayPrice(formatNumberToCurrencyString(serviceToEdit.price || 0));
      setDescription(serviceToEdit.description || '');
      
      const editImages = serviceToEdit.images?.length 
        ? serviceToEdit.images 
        : (serviceToEdit.imageUrl ? [serviceToEdit.imageUrl] : []);
      setImagesList(editImages);
      
      const genuineComplements = (serviceToEdit.complements || [])
        .filter(c => c && typeof c.name === 'string' && c.name.trim().length > 0)
        .map(c => ({
          ...c,
          id: c.id ? String(c.id) : `complement-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }));
      setComplementsList(genuineComplements);
      
      setCustomUrlInput('');
    } else {
      setName('');
      setCategory(categories[0]?.id || 'aplicacao');
      setDurationMinutes(60);
      setPrice(80);
      setDisplayPrice('80,00');
      setDescription('');
      setImagesList([]);
      setComplementsList([]);
      setCustomUrlInput('');
    }
    setUploadError(null);
    setIsUrlMode(false);
    setIsManagingCategories(false);
    setIsAddingCategory(false);
    setEditingCategoryId(null);
  }, [serviceToEdit, isOpen, categories]);

  if (!isOpen) return null;

  // Processa upload de imagem local
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setImagesList(prev => [...prev, compressedDataUrl]);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setImagesList(prev => [...prev, customUrlInput.trim()]);
      setIsUrlMode(false);
      setCustomUrlInput('');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagesList(prev => prev.filter((_, idx) => idx !== indexToRemove));
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
    if (!name.trim()) {
      alert('Por favor, informe o nome do procedimento.');
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
        images: Array.isArray(c.images) ? c.images : []
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
          imageUrl: imagesList[0] || undefined,
          images: imagesList,
          complements: cleanComplements,
        },
        serviceToEdit?.id
      );

      // Só fecha a janela após sucesso confirmado (res !== false)
      if (res !== false) {
        onClose();
      }
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

          {/* Categoria do Serviço com Opção de Adicionar, Editar e Remover */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-stone-600">
                Categoria para o Menu da Cliente
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(prev => !prev);
                    setIsManagingCategories(false);
                    setNewCategoryLabel('');
                    setNewCategoryDescription('');
                  }}
                  className="text-[11px] font-semibold text-[#8C6B4F] hover:text-[#201510] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Categoria</span>
                </button>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsManagingCategories(prev => !prev);
                    setIsAddingCategory(false);
                  }}
                  className="text-[11px] font-semibold text-[#76685F] hover:text-[#201510] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{isManagingCategories ? 'Fechar Gestão' : 'Gerenciar'}</span>
                </button>
              </div>
            </div>

            {/* Formulário Inline: Adicionar Nova Categoria */}
            {isAddingCategory && (
              <div className="p-3.5 rounded-2xl bg-[#FAF5F0] border border-[#EADBCC] space-y-2.5 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#201510] flex items-center gap-1.5">
                    <FolderPlus className="w-3.5 h-3.5 text-[#8C6B4F]" />
                    Criar Nova Categoria para o Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    value={newCategoryLabel}
                    onChange={(e) => setNewCategoryLabel(e.target.value)}
                    placeholder="Nome da categoria (ex: Spa dos Pés, Blindagem...)"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Descrição breve no menu da cliente (opcional)"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-800 text-xs focus:outline-none focus:border-[#8C6B4F]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCategoryLabel.trim()) return;
                      const customId = `cat-${Date.now()}`;
                      addCategory({
                        id: customId,
                        label: newCategoryLabel.trim(),
                        description: newCategoryDescription.trim() || undefined,
                      });
                      setCategory(customId);
                      setNewCategoryLabel('');
                      setNewCategoryDescription('');
                      setIsAddingCategory(false);
                    }}
                    className="px-3.5 py-1 rounded-lg bg-[#201510] text-white text-xs font-semibold hover:bg-[#38261E] flex items-center gap-1 shadow-2xs"
                  >
                    <Check className="w-3 h-3 text-[#C5A88E]" />
                    <span>Adicionar Categoria</span>
                  </button>
                </div>
              </div>
            )}

            {/* Painel Inline: Gerenciar / Editar / Remover Categorias Existentes */}
            {isManagingCategories && (
              <div className="p-3.5 rounded-2xl bg-[#FAF6F2] border border-[#E8DDD2] space-y-2 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DC]">
                  <span className="text-xs font-bold text-[#201510]">
                    Editar ou Excluir Categorias do Menu ({categories.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManagingCategories(false)}
                    className="text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isEditing = editingCategoryId === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className="p-2 rounded-xl bg-white border border-stone-200/90 flex flex-col gap-1.5"
                      >
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={editCategoryLabel}
                              onChange={(e) => setEditCategoryLabel(e.target.value)}
                              placeholder="Nome da categoria"
                              className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C6B4F]"
                            />
                            <input
                              type="text"
                              value={editCategoryDescription}
                              onChange={(e) => setEditCategoryDescription(e.target.value)}
                              placeholder="Descrição breve (opcional)"
                              className="w-full px-2.5 py-1 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-[#8C6B4F]"
                            />
                            <div className="flex justify-end gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="px-2 py-0.5 text-[11px] font-medium text-stone-500 hover:bg-stone-100 rounded-md"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editCategoryLabel.trim()) return;
                                  updateCategory(cat.id, {
                                    label: editCategoryLabel.trim(),
                                    description: editCategoryDescription.trim() || undefined,
                                  });
                                  setEditingCategoryId(null);
                                }}
                                className="px-2.5 py-0.5 text-[11px] font-semibold bg-[#201510] text-white rounded-md flex items-center gap-1 shadow-2xs"
                              >
                                <Check className="w-3 h-3 text-[#C5A88E]" />
                                <span>Salvar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-stone-800 block truncate">
                                {cat.label}
                              </span>
                              {cat.description && (
                                <span className="text-[10px] text-stone-500 block truncate">
                                  {cat.description}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditCategoryLabel(cat.label);
                                  setEditCategoryDescription(cat.description || '');
                                }}
                                title="Editar nome e descrição desta categoria"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-500 hover:text-[#201510] hover:bg-stone-100 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (categories.length <= 1) {
                                    alert('É necessário manter pelo menos uma categoria cadastrada.');
                                    return;
                                  }
                                  if (window.confirm(`Tem certeza que deseja remover a categoria "${cat.label}"? Os procedimentos vinculados a ela serão reorganizados.`)) {
                                    deleteCategory(cat.id);
                                    if (category === cat.id) {
                                      const remaining = categories.filter(c => c.id !== cat.id);
                                      setCategory(remaining[0]?.id || 'outros');
                                    }
                                  }
                                }}
                                title="Excluir categoria"
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista de Seleção de Categorias */}
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    category === cat.id
                      ? 'bg-[#201510] text-white border-[#201510] shadow-xs'
                      : 'bg-[#FAF6F2] text-stone-700 border-[#E8DDD2] hover:bg-stone-100'
                  }`}
                >
                  {cat.label}
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

          {/* SEÇÃO DE IMAGEM: UPLOAD, PRESET OU REMOÇÃO */}
          <div className="p-4 rounded-2xl bg-[#FAF6F2] border border-[#EADDCF] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider font-bold text-[#201510] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#8C6B4F]" />
                Fotos do Serviço ({imagesList.length})
              </label>
            </div>

            {/* Preview da Galeria */}
            <div className="flex flex-wrap gap-3 mb-2">
              {imagesList.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#D9CCC1] shadow-xs group">
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors z-10"
                    title="Remover Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                     <div className="absolute bottom-0 inset-x-0 bg-[#8C6B4F]/90 text-white text-[9px] text-center font-bold py-0.5">
                       Capa
                     </div>
                  )}
                </div>
              ))}
              
              {imagesList.length === 0 && (
                <div className="w-20 h-20 rounded-xl border border-[#D9CCC1] bg-white flex flex-col items-center justify-center text-stone-400">
                  <ImageIcon className="w-6 h-6 mb-1 text-stone-300" />
                  <span className="text-[9px] font-medium leading-tight text-center">Sem foto</span>
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-xs text-[#6E5D53]">
                Você pode adicionar várias imagens. A primeira será usada como capa.
              </p>

              {/* Botões de Ação para Imagem */}
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-[#D9CCC1] text-[#201510] text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#8C6B4F]" />
                  Adicionar
                </button>

                <button
                  type="button"
                  onClick={() => setIsUrlMode(!isUrlMode)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#D9CCC1] text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
                >
                  Link (URL)
                </button>
                
                {imagesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImagesList([])}
                    className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {uploadError}
              </p>
            )}

            {/* Inserir URL manual */}
            {isUrlMode && (
              <div className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto-unha.jpg"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:border-[#8C6B4F]"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-1.5 rounded-xl bg-[#201510] text-white text-xs font-semibold"
                >
                  Adicionar
                </button>
              </div>
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
                    
                    <ComplementImageManager
                      images={comp.images || []}
                      onChange={(newImages) => handleUpdateComplement(comp.id, 'images', newImages)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

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
