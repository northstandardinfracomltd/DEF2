import React, { useState, useMemo } from 'react';
import { Variable, StockRecord, Defibrillateur } from '../types';

interface StocksTabProps {
  stocks: StockRecord[];
  variables: Variable[];
  defibrillateurs: Defibrillateur[];
  saveStocks: (updated: StockRecord[]) => void;
  showStockForm: boolean;
  setShowStockForm: (show: boolean) => void;
}

export default function StocksTab({
  stocks,
  variables,
  defibrillateurs = [],
  saveStocks,
  showStockForm,
  setShowStockForm,
}: StocksTabProps) {
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newDenomStr, setNewDenomStr] = useState('');
  const [newQty, setNewQty] = useState<number>(0);
  const [newQtyReservee, setNewQtyReservee] = useState<number>(0);

  React.useEffect(() => {
    const available = variables.filter(v => !stocks.some(s => s.denominationPieceId === v.id && s.id !== editingStockId));
    const isCurrentValid = available.some(v => v.id === newDenomStr);
    if (!isCurrentValid && available.length > 0) {
      setNewDenomStr(available[0].id);
    }
  }, [variables.length, stocks.length, editingStockId, newDenomStr]);
  
  const [newLivDate, setNewLivDate] = useState<string>('');
  const [newReapDate, setNewReapDate] = useState<string>('');
  const [newValAchat, setNewValAchat] = useState<string>('');
  const [newMarge, setNewMarge] = useState<string>('');
  const [newPrixHt, setNewPrixHt] = useState<string>('');
  const [newStorage, setNewStorage] = useState<string>('');
  const [newCommentaire, setNewCommentaire] = useState<string>('');

  // Search & Filter State
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockStorageFilter, setStockStorageFilter] = useState<'Tous' | 'Entrepôt A' | 'Entrepôt B' | 'Véhicule A' | 'Véhicule B' | 'Véhicule C' | 'Non approprié' | 'ReqPrev2M' | 'ReqPrev2to6M'>('Tous');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Helper to dynamically calculate prevoiance for any variable id
  const getPrevoianceForVariable = useMemo(() => {
    return (denomId: string, qty: number) => {
      if (!denomId) return { bis2M: 0, bis2to6M: 0, totalToOrder: 0 };

      const today = new Date();
      const twoMonthsFromNow = new Date();
      twoMonthsFromNow.setMonth(today.getMonth() + 2);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);

      let bis2M = 0;
      let bis2to6M = 0;

      defibrillateurs.forEach(df => {
        // 1. Modèle: défibrillateur
        if (df.modeleId === denomId && df.finGarantie) {
          const gDate = new Date(df.finGarantie);
          if (!isNaN(gDate.getTime())) {
            if (gDate <= twoMonthsFromNow) {
              bis2M++;
            } else if (gDate > twoMonthsFromNow && gDate <= sixMonthsFromNow) {
              bis2to6M++;
            }
          }
        }

        // 2. Modèle : Électrode Adulte ou Mixte
        if (df.modeleElectrodeAId === denomId && df.peremptionElectrodeA) {
          const aDate = new Date(df.peremptionElectrodeA);
          if (!isNaN(aDate.getTime())) {
            if (aDate <= twoMonthsFromNow) {
              bis2M++;
            } else if (aDate > twoMonthsFromNow && aDate <= sixMonthsFromNow) {
              bis2to6M++;
            }
          }
        }

        // 3. Modèle : Électrode Secours
        if (df.modeleElectrodeASecoursId === denomId && df.peremptionSecoursElectrodeA) {
          const sDate = new Date(df.peremptionSecoursElectrodeA);
          if (!isNaN(sDate.getTime())) {
            if (sDate <= twoMonthsFromNow) {
              bis2M++;
            } else if (sDate > twoMonthsFromNow && sDate <= sixMonthsFromNow) {
              bis2to6M++;
            }
          }
        }

        // 4. Modèle : Électrode Pédiatrique
        if (df.modeleElectrodePId === denomId && df.peremptionElectrodeP) {
          const pDate = new Date(df.peremptionElectrodeP);
          if (!isNaN(pDate.getTime())) {
            if (pDate <= twoMonthsFromNow) {
              pDate.setHours(0,0,0,0);
              bis2M++;
            } else if (pDate > twoMonthsFromNow && pDate <= sixMonthsFromNow) {
              bis2to6M++;
            }
          }
        }

        // 5. Modèle : Batterie
        if (df.modeleBatterieId === denomId && df.peremptionBatterie) {
          const bDate = new Date(df.peremptionBatterie);
          if (!isNaN(bDate.getTime())) {
            if (bDate <= twoMonthsFromNow) {
              bis2M++;
            } else if (bDate > twoMonthsFromNow && bDate <= sixMonthsFromNow) {
              bis2to6M++;
            }
          }
        }
      });

      const totalToOrder = Math.max(0, (bis2M + bis2to6M) - qty);

      return {
        bis2M,
        bis2to6M,
        totalToOrder
      };
    };
  }, [defibrillateurs]);

  // Dynamic Prévoyance Calculation
  const prevoianceData = useMemo(() => {
    return getPrevoianceForVariable(newDenomStr, Number(newQty));
  }, [newDenomStr, getPrevoianceForVariable, newQty]);

  // Help auto-fill pricing fields
  const handleAchatChange = (valStr: string) => {
    setNewValAchat(valStr);
    const ach = parseFloat(valStr) || 0;
    const pri = parseFloat(newPrixHt) || 0;
    const mar = parseFloat(newMarge) || 0;
    
    if (pri > 0) {
      setNewMarge((pri - ach).toFixed(2));
    } else if (mar > 0) {
      setNewPrixHt((ach + mar).toFixed(2));
    } else {
      setNewPrixHt(valStr);
    }
  };

  const handleMargeChange = (valStr: string) => {
    setNewMarge(valStr);
    const ach = parseFloat(newValAchat) || 0;
    const mar = parseFloat(valStr) || 0;
    setNewPrixHt((ach + mar).toFixed(2));
  };

  const handlePrixChange = (valStr: string) => {
    setNewPrixHt(valStr);
    const ach = parseFloat(newValAchat) || 0;
    const pri = parseFloat(valStr) || 0;
    setNewMarge((pri - ach).toFixed(2));
  };

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDenomStr) return;

    // Check if this variable is already used by another stock record
    const isAlreadyUsed = stocks.some(s => s.denominationPieceId === newDenomStr && s.id !== editingStockId);
    if (isAlreadyUsed) {
      alert("Erreur : La variable sélectionnée est déjà utilisée pour un autre stock. Une variable ne peut être configurée qu'une seule fois dans les stocks.");
      return;
    }

    const finalLivDate = newStorage === 'Non approprié' ? '' : newLivDate;
    const finalReapDate = newStorage === 'Non approprié' ? '' : newReapDate;

    if (editingStockId) {
      const updated = stocks.map(st => {
        if (st.id === editingStockId) {
          return {
            ...st,
            denominationPieceId: newDenomStr,
            quantite: Number(newQty),
            quantiteReservee: Number(newQtyReservee),
            livraisonDate: finalLivDate,
            reapprovisionnementDate: finalReapDate,
            valeurAchat: Number(newValAchat) || 0,
            marge: Number(newMarge) || 0,
            prixVenteHt: Number(newPrixHt) || 0,
            stockage: newStorage,
            besoinProjete2Mois: prevoianceData.bis2M,
            besoinProjete2a6Mois: prevoianceData.bis2to6M,
            totalACommander: prevoianceData.totalToOrder,
            commentaire: newCommentaire
          };
        }
        return st;
      });
      saveStocks(updated);
      setEditingStockId(null);
    } else {
      const newItem: StockRecord = {
        id: 'st_' + Date.now(),
        denominationPieceId: newDenomStr,
        quantite: Number(newQty),
        quantiteReservee: Number(newQtyReservee),
        livraisonDate: finalLivDate,
        reapprovisionnementDate: finalReapDate,
        valeurAchat: Number(newValAchat) || 0,
        marge: Number(newMarge) || 0,
        prixVenteHt: Number(newPrixHt) || 0,
        stockage: newStorage,
        besoinProjete2Mois: prevoianceData.bis2M,
        besoinProjete2a6Mois: prevoianceData.bis2to6M,
        totalACommander: prevoianceData.totalToOrder,
        commentaire: newCommentaire
      };
      saveStocks([newItem, ...stocks]);
    }
    
    // Reset
    setNewQty(0);
    setNewQtyReservee(0);
    setNewLivDate('');
    setNewReapDate('');
    setNewValAchat('');
    setNewMarge('');
    setNewPrixHt('');
    setNewStorage('');
    setNewCommentaire('');
    setShowStockForm(false);
  };

  const handleOpenNewForm = () => {
    if (showStockForm) {
      setShowStockForm(false);
      setEditingStockId(null);
    } else {
      setEditingStockId(null);
      const available = variables.filter(v => !stocks.some(s => s.denominationPieceId === v.id));
      setNewDenomStr(available[0]?.id || '');
      setNewQty(0);
      setNewQtyReservee(0);
      setNewLivDate('');
      setNewReapDate('');
      setNewValAchat('');
      setNewMarge('');
      setNewPrixHt('');
      setNewStorage('');
      setNewCommentaire('');
      setShowStockForm(true);
    }
  };

  // Harmonized styling constants
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

  const rowActionButton18Style: React.CSSProperties = {
    ...rowActionButtonStyle,
  };

  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
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

  const tagColors: Record<string, string> = {
    'Entrepôt A': 'bg-amber-100 text-amber-900 border-amber-300',
    'Entrepôt B': 'bg-orange-100 text-orange-950 border-orange-300',
    'Véhicule A': 'bg-teal-100 text-teal-900 border-teal-300',
    'Véhicule B': 'bg-cyan-100 text-cyan-900 border-cyan-300',
    'Véhicule C': 'bg-indigo-100 text-indigo-900 border-indigo-300',
  };

  const filteredStocks = stocks.filter((st) => {
    const vObj = variables.find(v => v.id === st.denominationPieceId);
    const modelNom = vObj ? vObj.nom.toLowerCase() : '';
    const modelMarque = vObj ? vObj.marque.toLowerCase() : '';
    const modelCat = vObj ? vObj.category.toLowerCase() : '';
    
    let matchesStorage = false;
    if (stockStorageFilter === 'Tous') {
      matchesStorage = true;
    } else if (stockStorageFilter === 'ReqPrev2M') {
      const prev = getPrevoianceForVariable(st.denominationPieceId, st.quantite);
      const val = st.besoinProjete2Mois !== undefined ? Math.max(st.besoinProjete2Mois, prev.bis2M) : prev.bis2M;
      matchesStorage = val >= 1;
    } else if (stockStorageFilter === 'ReqPrev2to6M') {
      const prev = getPrevoianceForVariable(st.denominationPieceId, st.quantite);
      const val = st.besoinProjete2a6Mois !== undefined ? Math.max(st.besoinProjete2a6Mois, prev.bis2to6M) : prev.bis2to6M;
      matchesStorage = val >= 1;
    } else {
      matchesStorage = st.stockage === stockStorageFilter;
    }
    
    const query = stockSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      modelNom.includes(query) ||
      modelMarque.includes(query) ||
      modelCat.includes(query) ||
      st.stockage.toLowerCase().includes(query) ||
      (st.livraisonDate && st.livraisonDate.toLowerCase().includes(query)) ||
      (st.reapprovisionnementDate && st.reapprovisionnementDate.toLowerCase().includes(query));
      
    return matchesStorage && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn" id="stocks-tab-container-harmonized">
      <style>{`
        #stocks-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):not(#search-stock-input),
        #stocks-tab-container-harmonized select,
        #stocks-tab-container-harmonized textarea {
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
        }
        #stocks-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-stock-input),
        #stocks-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-stock-input),
        #stocks-tab-container-harmonized select:hover:not(:disabled),
        #stocks-tab-container-harmonized select:focus:not(:disabled),
        #stocks-tab-container-harmonized textarea:hover:not(:disabled),
        #stocks-tab-container-harmonized textarea:focus:not(:disabled),
        #stocks-tab-container-harmonized #search-stock-input:hover,
        #stocks-tab-container-harmonized #search-stock-input:focus {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }
        #stocks-tab-container-harmonized select {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          background-image: none !important;
        }
        #stocks-tab-container-harmonized select option {
          color: #000000 !important;
          background: #ffffff !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #stocks-tab-container-harmonized input[type="date"]::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        #stocks-tab-container-harmonized label,
        #stocks-tab-container-harmonized .stocks-label-style {
          letter-spacing: normal !important;
          text-transform: none !important;
          font-size: 16px !important;
          color: #000000 !important;
          font-weight: 600 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #stocks-tab-container-harmonized input:disabled,
        #stocks-tab-container-harmonized select:disabled {
          background-color: #f1f5f9 !important;
          color: #555555 !important;
          cursor: not-allowed !important;
          opacity: 0.82 !important;
        }
      `}</style>
      
      {!showStockForm ? (
        <>
          {/* Header Section */}
          <div 
            className="bg-white space-y-4"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" style={{ color: '#000000', cursor: 'default' }} id="stocks-tab-title">Stocks</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-white">
                {/* Field recherche (Search input) */}
                <div className="relative w-full sm:w-80 bg-white">
                  <input
                    type="text"
                    id="search-stock-input"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
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
                  onClick={handleOpenNewForm}
                  style={customButtonStyle}
                  className="font-sans"
                >
                  Nouveau
                </button>
              </div>
            </div>
          </div>

          {/* Filters Pills Row */}
          <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="stocks-storage-pills">
            {[
              { value: 'Tous', label: 'Tous' },
              { value: 'Entrepôt A', label: 'Entrepôt A' },
              { value: 'Entrepôt B', label: 'Entrepôt B' },
              { value: 'Véhicule A', label: 'Véhicule A' },
              { value: 'Véhicule B', label: 'Véhicule B' },
              { value: 'Véhicule C', label: 'Véhicule C' },
              { value: 'Non approprié', label: 'Non approprié' },
              { value: 'ReqPrev2M', label: 'Réapprovisionnement requis prévoyance 2 mois' },
              { value: 'ReqPrev2to6M', label: 'Réapprovisionnement requis prévoyance 2 à 6 mois' }
            ].map((opt) => {
              let count = 0;
              if (opt.value === 'Tous') {
                count = stocks.length;
              } else if (opt.value === 'ReqPrev2M') {
                count = stocks.filter(s => {
                  const prev = getPrevoianceForVariable(s.denominationPieceId, s.quantite);
                  const val = s.besoinProjete2Mois !== undefined ? Math.max(s.besoinProjete2Mois, prev.bis2M) : prev.bis2M;
                  return val >= 1;
                }).length;
              } else if (opt.value === 'ReqPrev2to6M') {
                count = stocks.filter(s => {
                  const prev = getPrevoianceForVariable(s.denominationPieceId, s.quantite);
                  const val = s.besoinProjete2a6Mois !== undefined ? Math.max(s.besoinProjete2a6Mois, prev.bis2to6M) : prev.bis2to6M;
                  return val >= 1;
                }).length;
              } else {
                count = stocks.filter(s => s.stockage === opt.value).length;
              }
              
              const isSelected = stockStorageFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStockStorageFilter(opt.value as any)}
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
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="transition-all"
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Stock Table List */}
          <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans border-collapse text-xs" id="stocks-record-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                <thead>
                  <tr className="bg-transparent">
                    <th className="px-4 py-3.5" style={thStyle}>Pièce ou service.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté disponible.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté réservée.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté totale.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Entrant.</th>
                    <th className="px-4 py-3.5 text-right" style={thStyle}>Tarif fournisseur.</th>
                    <th className="px-4 py-3.5 text-right" style={thStyle}>Marge.</th>
                    <th className="px-4 py-3.5 text-right" style={thStyle}>Tarif de vente HT.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Stockage.</th>
                    <th className="px-4 py-3.5 text-right w-24" style={thStyle}>Actions.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center font-sans lg:py-24 text-sm bg-white" style={{ color: '#000000', fontWeight: 100, fontSize: '16px' }}>
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((st) => {
                      const vObj = variables.find(v => v.id === st.denominationPieceId);
                      const rawName = vObj ? vObj.nom : 'Modèle inconnu';
                      const displayName = rawName.length > 20 ? rawName.slice(0, 20) + '(...)' : rawName;

                      return (
                        <tr key={st.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                          <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {displayName}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.quantite}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.quantiteReservee ?? 0}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.quantite + (st.quantiteReservee ?? 0)}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.livraisonDate ? st.livraisonDate : '-'}
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {(st.valeurAchat ?? 0).toFixed(2)} €
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {(st.marge ?? 0).toFixed(2)} €
                          </td>
                          <td className="px-4 py-5 text-right font-black whitespace-nowrap" style={{ fontSize: '16px', fontWeight: 105, color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {(st.prixVenteHt ?? 0).toFixed(2)} €
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap">
                            <span 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '1000px',
                                backgroundColor: '#ffffff',
                                border: '1px solid rgb(231, 231, 231)',
                                color: '#000000',
                                fontSize: '15px',
                                fontWeight: 100,
                                padding: '6px 18px',
                                whiteSpace: 'nowrap',
                                fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                              }}
                            >
                              {st.stockage}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2 bg-transparent">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStockId(st.id);
                                  setNewDenomStr(st.denominationPieceId);
                                  setNewQty(st.quantite);
                                  setNewQtyReservee(st.quantiteReservee ?? 0);
                                  setNewLivDate(st.livraisonDate || '');
                                  setNewReapDate(st.reapprovisionnementDate || '');
                                  setNewValAchat((st.valeurAchat ?? 0).toString());
                                  setNewMarge((st.marge ?? 0).toString());
                                  setNewPrixHt((st.prixVenteHt ?? 0).toString());
                                  setNewStorage(st.stockage);
                                  setNewCommentaire(st.commentaire || '');
                                  setShowStockForm(true);
                                }}
                                style={rowActionButtonStyle}
                                className="cursor-pointer font-sans"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Retirer cet article du stock ?')) {
                                    saveStocks(stocks.filter(s => s.id !== st.id));
                                  }
                                }}
                                style={rowActionButtonStyle}
                                className="cursor-pointer font-sans"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* New Stock Item Form / Overlay Mode */
        <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="stocks-form-overlay">
          
          {/* Header Box styled exactly like DefibTab Form Header */}
          <div 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', width: '98%', maxWidth: '98%', margin: 'auto', padding: '20px' }}
            id="stocks-form-header-box"
          >
            <div>
              <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000', cursor: 'default' }}>
                {editingStockId ? 'Modification Stock' : 'Nouveau Stock'}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStockForm(false);
                  setEditingStockId(null);
                }}
                id="btn-close-stock-modal"
                style={rowActionButton18Style}
                className="transition-colors cursor-pointer"
              >
                <span>Annuler</span>
              </button>

              <button
                type="submit"
                form="equipement-stock-form"
                id="btn-submit-stock-form"
                style={{
                  ...rowActionButton18Style,
                  backgroundColor: 'rgb(53, 86, 236)',
                  color: '#ffffff',
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                }}
                className="transition-all cursor-pointer"
              >
                <span>Enregistrer</span>
              </button>
            </div>
          </div>

          {/* Elegant height spacing block to separate header box and form perfectly */}
          <div style={{ height: '16px' }} className="bg-transparent" />

          <form 
            id="equipement-stock-form"
            onSubmit={handleAddStockSubmit} 
            className="space-y-6 bg-white p-5 border-none"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderRadius: '18px',
              width: '98%',
              maxWidth: '98%',
              margin: 'auto'
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white">
              
              {/* Lookup Dénomination variable - Full Width on 1st Row */}
              <div className="flex flex-col gap-1 bg-white md:col-span-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Pièce ou service.</label>
                <select
                  value={newDenomStr}
                  onChange={(e) => setNewDenomStr(e.target.value)}
                  className="focus:outline-none w-full cursor-pointer font-sans"
                  required
                >
                  <option value="" disabled hidden>Sélectionnez une pièce ou service.</option>
                  {variables.map(v => {
                    const isAlreadyUsed = stocks.some(s => s.denominationPieceId === v.id && s.id !== editingStockId);
                    if (isAlreadyUsed) return null;
                    return (
                      <option key={v.id} value={v.id}>
                        {v.identifiant ? `[${v.identifiant}] ` : ''}{v.nom} ({v.category})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantities Row */}
              <div className="md:col-span-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Quantité disponible.</label>
                  <input
                    type="number"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="focus:outline-none w-full font-sans"
                    required
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Quantité réservée.</label>
                  <input
                    type="number"
                    min="0"
                    value={newQtyReservee}
                    onChange={(e) => setNewQtyReservee(Number(e.target.value))}
                    className="focus:outline-none w-full font-sans"
                    required
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Quantité totale.</label>
                  <input
                    type="number"
                    value={Number(newQty) + Number(newQtyReservee)}
                    disabled
                    readOnly
                    className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Storage and Dates Row */}
              <div className="md:col-span-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Stockage Location */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Stockage.</label>
                  <select
                    value={newStorage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewStorage(val);
                      if (val === 'Non approprié') {
                        setNewLivDate('');
                        setNewReapDate('');
                      }
                    }}
                    className="focus:outline-none w-full cursor-pointer font-sans"
                    required
                  >
                    <option value="" disabled hidden>Sélectionnez un stockage.</option>
                    <option value="Entrepôt A">Entrepôt A</option>
                    <option value="Entrepôt B">Entrepôt B</option>
                    <option value="Véhicule A">Véhicule A</option>
                    <option value="Véhicule B">Véhicule B</option>
                    <option value="Véhicule C">Véhicule C</option>
                    <option value="Non approprié">Non approprié</option>
                  </select>
                </div>

                {/* Livraison Date */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Livraison.</label>
                  <input
                    type="date"
                    value={newLivDate}
                    onChange={(e) => setNewLivDate(e.target.value)}
                    disabled={newStorage === 'Non approprié'}
                    className={`focus:outline-none w-full font-sans ${newStorage === 'Non approprié' ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
                    placeholder="jj/mm.aaaa"
                  />
                </div>

                {/* Réappro Date */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Réapprovisionnement.</label>
                  <input
                    type="date"
                    value={newReapDate}
                    onChange={(e) => setNewReapDate(e.target.value)}
                    disabled={newStorage === 'Non approprié'}
                    className={`focus:outline-none w-full font-sans ${newStorage === 'Non approprié' ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
                    placeholder="jj/mm.aaaa"
                  />
                </div>
              </div>

              {/* Pricing section - 3 elegant columns spanning full row width */}
              <div className="md:col-span-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Valeur Achat */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Tarif fournisseur. (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newValAchat}
                    onChange={(e) => handleAchatChange(e.target.value)}
                    className="focus:outline-none w-full font-sans"
                    required
                    placeholder="0.00"
                  />
                </div>

                {/* Marge */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Marge. (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMarge}
                    onChange={(e) => handleMargeChange(e.target.value)}
                    className="focus:outline-none w-full font-sans"
                    required
                    placeholder="0.00"
                  />
                </div>

                {/* Prix de vente HT */}
                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Tarif de vente. (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrixHt}
                    onChange={(e) => handlePrixChange(e.target.value)}
                    className="focus:outline-none w-full font-sans text-black"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Section Prévoyance. */}
              <div className="md:col-span-4 border-t border-slate-200 pt-5 mt-2 bg-white flex flex-col gap-1">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2" style={{ color: '#000000', cursor: 'default' }}>Prévoyance.</h4>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded text-xs text-slate-600 mb-2 font-sans">
                  Nous estimons votre besoin de trésorerie à <span className="font-bold text-slate-900">{((Number(newValAchat) || 0) * (prevoianceData.totalToOrder || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>€, pour l'achat des stocks requis aux actions de maintenances.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Besoin projeté à 2 mois.</label>
                    <input
                      type="number"
                      value={prevoianceData.bis2M}
                      disabled
                      readOnly
                      placeholder="0"
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Besoin projeté entre 2 à 6 mois.</label>
                    <input
                      type="number"
                      value={prevoianceData.bis2to6M}
                      disabled
                      readOnly
                      placeholder="0"
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Total à commander.</label>
                    <input
                      type="number"
                      value={prevoianceData.totalToOrder}
                      disabled
                      readOnly
                      placeholder="0"
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Commentaire. */}
              <div className="md:col-span-4 bg-white flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Commentaire.</label>
                <input
                  type="text"
                  value={newCommentaire}
                  onChange={(e) => setNewCommentaire(e.target.value)}
                  placeholder="Entrez votre commentaire..."
                  className="focus:outline-none w-full font-sans p-2 border border-slate-200 rounded text-xs bg-white text-slate-700"
                />
              </div>

            </div>
          </form>
        </div>
      )}

    </div>
  );
}
