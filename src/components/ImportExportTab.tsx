import React, { useState, useEffect } from 'react';

export interface ImportExportRecord {
  id: string;
  date: string;
  type: 'Importation.' | 'Exportation.';
  categorie: 'Défibrillateurs.' | 'Clients.' | 'Stocks.' | 'Temps.';
  format: 'Google Sheets.';
  googleSheetsLink?: string;
}

const INITIAL_RECORDS: ImportExportRecord[] = [
  {
    id: 'rec_1',
    date: '2026-06-10',
    type: 'Importation.',
    categorie: 'Clients.',
    format: 'Google Sheets.',
    googleSheetsLink: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUYptlbs74OgvE2upms/edit',
  },
  {
    id: 'rec_2',
    date: '2026-06-11',
    type: 'Exportation.',
    categorie: 'Défibrillateurs.',
    format: 'Google Sheets.',
    googleSheetsLink: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUYptlbs74OgvE2upms/edit',
  },
  {
    id: 'rec_3',
    date: '2026-06-12',
    type: 'Importation.',
    categorie: 'Stocks.',
    format: 'Google Sheets.',
    googleSheetsLink: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUYptlbs74OgvE2upms/edit',
  }
];

export default function ImportExportTab({ tenantId }: { tenantId: string }) {
  const [records, setRecords] = useState<ImportExportRecord[]>(() => {
    const key = `defib_import_export_records_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        return parsed.map((r) => ({
          ...r,
          format: 'Google Sheets.'
        }));
      } catch (e) {
        return tenantId === 'demo' ? INITIAL_RECORDS : [];
      }
    }
    return tenantId === 'demo' ? INITIAL_RECORDS : [];
  });

  const [search, setSearch] = useState('');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Form visibility
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<'Importation.' | 'Exportation.'>('Importation.');
  const [formCategorie, setFormCategorie] = useState<'Défibrillateurs.' | 'Clients.' | 'Stocks.' | 'Temps.'>('Défibrillateurs.');
  const [formFormat] = useState<'Google Sheets.'>('Google Sheets.');
  const [googleSheetsLink, setGoogleSheetsLink] = useState('');

  // Toast / Info message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const key = `defib_import_export_records_${tenantId}`;
    localStorage.setItem(key, JSON.stringify(records));
  }, [records, tenantId]);

  useEffect(() => {
    const key = `defib_import_export_records_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        setRecords(parsed.map((r) => ({
          ...r,
          format: 'Google Sheets.'
        })));
      } catch (e) {
        setRecords(tenantId === 'demo' ? INITIAL_RECORDS : []);
      }
    } else {
      setRecords(tenantId === 'demo' ? INITIAL_RECORDS : []);
    }
    setSearch('');
    setShowForm(false);
  }, [tenantId]);

  // Clean filters
  const filteredRecords = records.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.date.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term) ||
      r.categorie.toLowerCase().includes(term) ||
      r.format.toLowerCase().includes(term)
    );
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const newRecord: ImportExportRecord = {
      id: 'rec_' + Date.now(),
      date: formDate,
      type: formType,
      categorie: formCategorie,
      format: formFormat,
      googleSheetsLink: formType === 'Importation.' ? googleSheetsLink : '',
    };

    setRecords((prev) => [newRecord, ...prev]);
    setShowForm(false);
    triggerToast('Nouveau transfert enregistré avec succès !');

    // Reset fields to today and defaults
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType('Importation.');
    setFormCategorie('Défibrillateurs.');
    setGoogleSheetsLink('');
  };

  const handleDelete = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Harmonized styles for consistency
  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000',
    cursor: 'default',
    fontSize: '16px',
  };

  const roundedButtonStyle: React.CSSProperties = {
    backgroundColor: '#000000',
    color: '#ffffff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '10px',
    fontSize: '16px',
    padding: '11px 22px',
    fontWeight: '100',
    transition: 'all 0s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
  };

  const roundedButton18Style: React.CSSProperties = {
    ...roundedButtonStyle,
    fontSize: '18px',
    padding: '9px 19px',
  };

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

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 text-black font-sans pb-12" id="import-export-tab-container-harmonized">
      <style>{`
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]),
        #import-export-tab-container-harmonized select {
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
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
        #import-export-tab-container-harmonized input.search-input-field {
          font-size: 18px !important;
        }
        #import-export-tab-container-harmonized input.search-input-field::placeholder {
          font-size: 18px !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          font-weight: 100 !important;
        }
        #import-export-tab-container-harmonized select {
          background-image: none !important;
        }
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled),
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled),
        #import-export-tab-container-harmonized select:hover:not(:disabled),
        #import-export-tab-container-harmonized select:focus:not(:disabled) {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }

        /* Hide raw date picker icon indicator */
        #import-export-tab-container-harmonized input[type="date"]::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        #import-export-tab-container-harmonized input[type="date"] {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
      `}</style>

      {/* Success indicator toast */}
      {toastMessage && (
        <div 
          className="fixed bottom-6 right-6 z-[200] bg-black text-white px-5 py-3.5 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-2 animate-scaleUp font-sans"
          style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
        >
          <span className="text-pink-400 font-bold">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container - Full page width */}
      <div className="w-full flex flex-col space-y-6">
        
        {/* Harmonized Header - only visible when not filling creation form */}
        {!showForm && (
          <div 
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            style={{
              border: '1px solid #dadada',
              borderTop: 'none',
              borderRadius: '0px 0px 18px 18px',
              maxWidth: '98%',
              margin: 'auto',
              padding: '20px',
              backgroundColor: '#ffffff',
              width: '100%'
            }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-black font-gochi cursor-default" style={{ cursor: 'default' }}>Importer Exporter</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input block */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher."
                  className="w-full sm:w-[220px] search-input-field"
                  style={searchInputStyle}
                  onMouseEnter={() => setIsSearchHovered(true)}
                  onMouseLeave={() => setIsSearchHovered(false)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </div>

              {/* Nouveau Button */}
              <button
                onClick={() => setShowForm(true)}
                style={{
                  ...roundedButton18Style,
                  backgroundColor: 'rgb(53, 86, 236)',
                  color: '#ffffff',
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                }}
                className="transition-all cursor-pointer"
              >
                <span>Nouveau</span>
              </button>
            </div>
          </div>
        )}

        {/* 🛠️ Matches DefibTab's Form Structure when form is open 🛠️ */}
        {showForm && (
          <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="import-export-form-overlay">
            
            {/* Form Header */}
            <div 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
              style={{ 
                border: '1px solid #dadada', 
                borderTop: 'none', 
                borderRadius: '0px 0px 18px 18px', 
                maxWidth: '98%', 
                margin: 'auto', 
                padding: '20px' 
              }}
              id="import-export-form-header-box"
            >
              <div>
                <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000000', cursor: 'default' }}>
                  Nouveau Transfert
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={roundedButton18Style}
                  className="transition-colors cursor-pointer"
                >
                  <span>Fermer</span>
                </button>

                <button
                  type="submit"
                  form="import-export-creation-form"
                  style={{
                    ...roundedButton18Style,
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

            {/* Form Body Box with top margin spacing */}
            <div 
              className="w-full animate-fadeIn mt-6"
              style={{ marginTop: '24px' }}
              id="import-export-form-box"
            >
              <form 
                onSubmit={handleCreate} 
                id="import-export-creation-form"
                style={{ maxWidth: '98%', margin: 'auto' }}
              >
                <div 
                  className="bg-white p-5 relative space-y-3"
                  style={{
                    border: '1px solid rgb(218, 218, 218)',
                    borderRadius: '18px',
                  }}
                >
                  <div className="mb-2 bg-transparent">
                    <span 
                      className="text-white px-3 py-1 text-[13px] inline-block font-sans"
                      style={{
                        backgroundColor: 'oklch(0.44 0.16 324.65)',
                        borderRadius: '1000px',
                        cursor: 'default',
                        fontWeight: 100,
                        textTransform: 'none',
                      }}
                    >
                      1 — Paramètres du transfert
                    </span>
                  </div>

                  {/* Form grid matches fields requested */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Date field */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-date" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Date.
                      </label>
                      <input
                        type="date"
                        id="form-ie-date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                        disabled
                        required
                      />
                    </div>

                    {/* Type select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-type" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Type de transfert.
                      </label>
                      <select
                        id="form-ie-type"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as 'Importation.' | 'Exportation.')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black cursor-pointer"
                      >
                        <option value="Importation.">Importation.</option>
                        <option value="Exportation.">Exportation.</option>
                      </select>
                    </div>

                    {/* Catégorie select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-cat" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Compartiment de données.
                      </label>
                      <select
                        id="form-ie-cat"
                        value={formCategorie}
                        onChange={(e) => setFormCategorie(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black cursor-pointer"
                      >
                        <option value="Défibrillateurs.">Défibrillateurs.</option>
                        <option value="Clients.">Clients.</option>
                        <option value="Stocks.">Stocks.</option>
                        <option value="Temps.">Temps.</option>
                      </select>
                    </div>

                    {/* Format disabled/CSV-only select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-fmt" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Format.
                      </label>
                      <select
                        id="form-ie-fmt"
                        value={formFormat}
                        disabled
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                      >
                        <option value="Google Sheets.">Google Sheets.</option>
                      </select>
                    </div>

                    {formType === 'Importation.' && (
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="form-ie-link" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                          Lien Google Sheets.
                        </label>
                        <input
                          type="text"
                          id="form-ie-link"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={googleSheetsLink}
                          onChange={(e) => setGoogleSheetsLink(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black"
                          required
                        />
                      </div>
                    )}

                  </div>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* REPORT / List of Transfers - full width - only visible when not filling creation form */}
        {!showForm && (
          <div 
            className="bg-white overflow-hidden mt-6 rounded-none animate-fadeIn"
            style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}
            id="import-export-report-container"
          >
            {filteredRecords.length === 0 ? (
              <div className="p-16 text-center font-sans lg:py-24" id="no-records-view">
                <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                  Aucun résultat.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table 
                  className="w-full text-left font-sans border-collapse text-xs" 
                  id="records-table" 
                  style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}
                >
                  <thead>
                    <tr className="bg-transparent">
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Horodatage</th>
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Circulation.</th>
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Compartiment.</th>
                      <th className="px-4 py-3.5 w-[15%]" style={thStyle}>Format.</th>
                      <th className="px-4 py-3.5 text-right w-[15%]" style={thStyle}>Actions.</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-705 text-xs text-black">
                    {filteredRecords.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-[#ffecf8] transition-all cursor-default"
                      >
                        {/* Date column (exactly mimicking text styling from DefibTab) */}
                        <td 
                          className="px-4 py-5 font-sans whitespace-nowrap"
                          style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
                        >
                          {formatDateToDDMMYYYY(r.date)}
                        </td>

                        {/* Type badge column without color dot */}
                        <td className="px-4 py-5 font-sans whitespace-nowrap text-left">
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              border: '1px solid rgb(231, 231, 231)',
                              borderRadius: '1000px',
                              padding: '4px 12px',
                              backgroundColor: '#ffffff'
                            }} 
                            className="whitespace-nowrap"
                          >
                            <span style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                              {r.type}
                            </span>
                          </div>
                        </td>

                        {/* Catégorie column */}
                        <td 
                          className="px-4 py-5 font-sans whitespace-nowrap"
                          style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
                        >
                          {r.categorie}
                        </td>

                        {/* Format column without color dot */}
                        <td className="px-4 py-5 font-sans whitespace-nowrap text-left">
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              border: '1px solid rgb(231, 231, 231)',
                              borderRadius: '1000px',
                              padding: '4px 12px',
                              backgroundColor: '#ffffff'
                            }} 
                            className="whitespace-nowrap"
                          >
                            <span style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                              {r.format}
                            </span>
                          </div>
                        </td>

                        {/* Consulter & Supprimer buttons */}
                        <td className="px-4 py-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={r.googleSheetsLink || 'https://docs.google.com/spreadsheets/'}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={roundedButton18Style}
                              className="transition-all text-white bg-black rounded"
                            >
                              <span>Consulter</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              style={roundedButton18Style}
                              className="transition-all text-white bg-black rounded cursor-pointer"
                            >
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

