import React, { useState, useMemo } from 'react';
import { Variable, VariableCategory } from '../types';
import { Plus, Search, Trash2, Edit2, X, Sliders, Box, Image as ImageIcon, Sparkles } from 'lucide-react';

interface VariableTabProps {
  variables: Variable[];
  onAddVariable: (variable: Omit<Variable, 'id'>) => void;
  onUpdateVariable: (variable: Variable) => void;
  onDeleteVariable: (id: string) => void;
}

// Visual presets of premium defibrillator photos to select instantly
const IMAGE_PRESETS = [
  {
    name: 'Bleu Médical Hospital',
    url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    name: 'Jaune Fluo Sauvetage',
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    name: 'Rouge Secourisme Urgence',
    url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=120&h=120&q=80',
  },
  {
    name: 'Mallette Pro Orange',
    url: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=120&h=120&q=80',
  },
];

const CATEGORIES: VariableCategory[] = [
  'Modèle Défibrillateur',
  'Modèle Coffret',
  'Modèle Électrode',
  'Modèle Batterie',
  'Modèle Contrat',
];

export default function VariableTab({
  variables,
  onAddVariable,
  onUpdateVariable,
  onDeleteVariable,
}: VariableTabProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Tous');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);

  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputStyle: React.CSSProperties = {
    border: '1px solid #dedede',
    borderRadius: '13px',
    padding: '9px 19px',
    fontSize: '18px',
    fontWeight: '100',
    color: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    outline: (isSearchHovered || isSearchFocused) ? '2.5px solid #fa53d5' : 'none',
    outlineOffset: (isSearchHovered || isSearchFocused) ? '2px' : '0px',
    transition: 'all 0s',
  };

  const customButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '12px',
    fontSize: '18px',
    padding: '9px 19px',
    fontWeight: '100',
    transition: 'all 0s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
  };

  const rowActionButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '10px',
    fontSize: '16px',
    padding: '8px 16px',
    fontWeight: '100',
    transition: 'all 0s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
  };

  const rowActionButton18Style: React.CSSProperties = {
    ...rowActionButtonStyle,
    fontSize: '18px',
    padding: '9px 19px',
  };

  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
  };

  // Form State
  const [category, setCategory] = useState<VariableCategory | ''>('');
  const [nom, setNom] = useState('');
  const [marque, setMarque] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  // Filtering variables
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      const matchSearch =
        (v.nom || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.marque || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.description || '').toLowerCase().includes(search.toLowerCase());
      
      const matchCategory = filterCategory === 'Tous' || v.category === filterCategory;

      return matchSearch && matchCategory;
    });
  }, [variables, search, filterCategory]);

  const openAddModal = () => {
    setEditingVariable(null);
    setCategory('');
    setNom('');
    setMarque('Standard');
    setDescription('');
    setImageUrl('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (v: Variable) => {
    setEditingVariable(v);
    setCategory(v.category);
    setNom(v.nom);
    setMarque(v.marque || 'Standard');
    setDescription(v.description);
    setImageUrl(v.imageUrl || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('La catégorie est requise.');
      return;
    }
    if (!nom.trim()) {
      setError('Le titre de la variable est requis.');
      return;
    }

    const payload = {
      category: category as VariableCategory,
      nom: nom.trim(),
      marque: marque.trim() || 'Standard',
      description: description.trim(),
      imageUrl: category === 'Modèle Défibrillateur' ? imageUrl.trim() : undefined,
    };

    if (editingVariable) {
      onUpdateVariable({
        id: editingVariable.id,
        ...payload,
      });
    } else {
      onAddVariable(payload);
    }

    setIsModalOpen(false);
  };

  if (isModalOpen) {
    return (
      <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="variable-form-overlay">
        {/* Form Header */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
          style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px' }}
          id="variable-form-header-box"
        >
          <div>
            <h3 className="text-2xl font-bold font-gochi" id="variable-modal-title" style={{ color: '#000000', cursor: 'default' }}>
              {editingVariable ? 'Modification Variable' : 'Nouvelle Variable'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              id="btn-close-variable-modal"
              style={rowActionButton18Style}
              className="transition-colors cursor-pointer"
            >
              Fermer
            </button>

            <button
              type="submit"
              form="variable-form"
              id="btn-submit-variable-form"
              style={{
                ...rowActionButton18Style,
                backgroundColor: 'rgb(53, 86, 236)',
                color: '#ffffff',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
              }}
              className="transition-all cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* Form Box */}
        <div
          className="w-full animate-fadeIn mt-6"
          style={{ marginTop: '24px' }}
          id="variable-form-box"
        >
          <style>{`
             #variable-form input:not([type="radio"]):not([type="checkbox"]),
             #variable-form select,
             #variable-form textarea {
               padding: 12px !important;
               border: 1px solid #dedede !important;
               border-radius: 13px !important;
               font-size: 16px !important;
               font-weight: 100 !important;
               background: #ffffff !important;
               color: #000000 !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
               box-sizing: border-box !important;
               outline: none !important;
               transition: all 0s !important;
               width: 100% !important;
             }
             #variable-form input:not([type="radio"]):not([type="checkbox"]):hover,
             #variable-form input:not([type="radio"]):not([type="checkbox"]):focus,
             #variable-form select:hover,
             #variable-form select:focus,
             #variable-form textarea:hover,
             #variable-form textarea:focus {
               outline: 2.5px solid #fa53d5 !important;
               outline-offset: 2px !important;
               transition: all 0s !important;
             }
             #variable-form input:not([type="radio"]):not([type="checkbox"])::placeholder,
             #variable-form textarea::placeholder {
               color: #8c8c8c !important;
               opacity: 1 !important;
               font-weight: 100 !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
             }
             #variable-form select {
               appearance: none !important;
               -webkit-appearance: none !important;
               -moz-appearance: none !important;
               background-image: none !important;
             }
             #variable-form select option {
               color: #000000 !important;
               background: #ffffff !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
             }
             #variable-form label {
               letter-spacing: normal !important;
               text-transform: none !important;
               font-size: 16px !important;
               color: #000000 !important;
               font-weight: 600 !important;
             }
          `}</style>
          
          <form onSubmit={handleSubmit} id="variable-form" className="space-y-6">
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-sans mb-4"
                id="variable-form-error"
                style={{ maxWidth: '98%', margin: 'auto' }}
              >
                {error}
              </div>
            )}

            <div className="space-y-6" style={{ maxWidth: '98%', margin: 'auto' }}>
              <div 
                className="bg-white p-5 space-y-4"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderRadius: '18px',
                }}
              >
                {/* Sélection Catégorie */}
                <div className="space-y-1">
                  <label htmlFor="select-variable-category" className="block text-[11px] font-bold text-slate-500 uppercase">
                    Catégorie.
                  </label>
                  <select
                    id="select-variable-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VariableCategory)}
                  >
                    <option value="" disabled hidden>Sélectionnez une catégorie.</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Titre de la variable */}
                <div className="space-y-1">
                  <label htmlFor="input-variable-nom" className="block text-[11px] font-bold text-slate-500 uppercase">
                    Titre de la variable.
                  </label>
                  <input
                    type="text"
                    id="input-variable-nom"
                    value={nom}
                    onChange={(e) => {
                      const filtered = e.target.value.replace(/[^a-zA-Z0-9\s-àâäéèêëîïôöùûüçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒÆ]/g, '');
                      setNom(filtered);
                    }}
                    placeholder="Ex: Batterie ProPlus MédicalDupont."
                    required
                  />
                </div>

                {/* Optional Line Source de l'image (No sub-div, simple list flow) */}
                {category === 'Modèle Défibrillateur' && (
                  <div className="space-y-1">
                    <label htmlFor="input-variable-image" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Lien source de l'image.
                    </label>
                    <input
                      type="url"
                      id="input-variable-image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                )}

                {/* Commentaire sur la variable */}
                <div className="space-y-1">
                  <label htmlFor="input-variable-desc" className="block text-[11px] font-bold text-slate-500 uppercase">
                    Commentaire sur la variable.
                  </label>
                  <textarea
                    id="input-variable-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Entrez un commentaire."
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="variable-tab-container">
      {/* Upper Action Block & Search metrics */}
      <div 
        className="bg-white space-y-4"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" id="variable-tab-title" style={{ color: '#000000', cursor: 'default' }}>Variables</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white">
            {/* Field recherche (Search input) */}
            <div className="relative w-full sm:w-64 bg-white">
              <input
                type="text"
                id="search-variable-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Recherche."
                className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                style={searchInputStyle}
                onMouseEnter={() => setIsSearchHovered(true)}
                onMouseLeave={() => setIsSearchHovered(false)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>

            <button
              onClick={openAddModal}
              id="btn-add-variable"
              className="font-sans"
              style={{
                ...customButtonStyle,
                backgroundColor: 'rgb(53, 86, 236)',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
              }}
            >
              Nouveau
            </button>
          </div>
        </div>
      </div>

      {/* Filters Pills Row - placed outside the header block, exactly like FSM and Stocks */}
      <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="variables-category-pills">
        {['Tous', ...CATEGORIES].map((cat) => {
          const isSelected = filterCategory === cat;
          let count = 0;
          if (cat === 'Tous') {
            count = variables.length;
          } else {
            count = variables.filter(v => v.category === cat).length;
          }
          
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              style={{
                borderRadius: '1000px',
                padding: '10px 20px',
                fontSize: '15px',
                fontWeight: 100,
                cursor: 'pointer',
                fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                backgroundColor: isSelected ? '#fa53d5' : '#ffffff',
                color: isSelected ? '#ffffff' : '#000000',
                border: isSelected ? '1px solid #fa53d5' : '1px solid rgb(218, 218, 218)',
                transition: 'all 0.15s ease'
              }}
              className="transition-all"
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Table Records Sheet */}
      <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
        <div className="overflow-x-auto">
          {filteredVariables.length === 0 ? (
            <div className="p-16 text-center font-sans lg:py-24" id="no-variables-view">
              <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>Aucun résultat</p>
            </div>
          ) : (
            <table className="w-full text-left font-sans border-collapse text-xs" id="variables-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
              <thead>
                <tr className="bg-transparent border-b border-slate-100">
                  <th className="px-4 py-3.5 w-28 text-left" style={thStyle}>Miniature.</th>
                  <th className="px-4 py-3.5 text-left" style={thStyle}>Titre de la variable.</th>
                  <th className="px-4 py-3.5 text-left" style={thStyle}>Catégorie.</th>
                  <th className="px-4 py-3.5 text-left w-12" style={thStyle}>Action.</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-xs">
                {filteredVariables.map((v) => (
                  <tr
                    key={v.id}
                    id={`variable-row-${v.id}`}
                    onClick={() => openEditModal(v)}
                    className="group hover:bg-[#ffecf8] transition-all cursor-pointer"
                  >
                    {/* Visual box column */}
                    <td className="px-4 py-5 font-sans text-left" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                      {v.category === 'Modèle Défibrillateur' && v.imageUrl ? (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative shadow-xs">
                          <img
                            src={v.imageUrl}
                            alt={v.nom}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200" />
                      )}
                    </td>

                    {/* Nom de l'équipement */}
                    <td className="px-4 py-5 font-sans text-left" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                      <div className="font-semibold text-slate-950">
                        {v.nom}
                      </div>
                    </td>

                    {/* Catégorie technique */}
                    <td className="px-4 py-5 font-sans text-left">
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          borderRadius: '1000px',
                          backgroundColor: '#ffffff',
                          border: '1px solid rgb(231, 231, 231)',
                          color: '#000000',
                          fontSize: '16px',
                          fontWeight: 100,
                          padding: '4px 12px',
                        }}
                      >
                        {v.category}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-5 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          id={`btn-edit-variable-${v.id}`}
                          style={rowActionButton18Style}
                          className="cursor-pointer"
                        >
                          Modifier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
