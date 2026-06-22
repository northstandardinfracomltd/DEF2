import React, { useState, useMemo } from 'react';
import { Variable, StockRecord, DistributedStockLocation } from '../types';

interface StocksDistribuesTabProps {
  distributedStocks: DistributedStockLocation[];
  saveDistributedStocks: (updated: DistributedStockLocation[]) => void;
  stocks: StockRecord[];
  variables: Variable[];
  fsmTours?: any[];
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onNavigateToCentraleStocks?: (ugs: string) => void;
}

export default function StocksDistribuesTab({
  distributedStocks = [],
  saveDistributedStocks,
  stocks = [],
  variables = [],
  fsmTours = [],
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  onNavigateToCentraleStocks,
}: StocksDistribuesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states - now maps to a StockRecord (Centrale des stocks) instead of raw variable
  const [selectedStockId, setSelectedStockId] = useState('');
  const [locationName, setLocationName] = useState<'Entrepôt A' | 'Entrepôt B' | 'Entrepôt C' | 'Véhicule A' | 'Véhicule B' | 'Véhicule C'>('Entrepôt A');
  const [volumeDisponible, setVolumeDisponible] = useState<number>(0);
  const [volumeReserve, setVolumeReserve] = useState<number>(0);
  const [volumeEntrant, setVolumeEntrant] = useState<number>(0);

  // Search/filter states
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  const [locationFilter, setLocationFilter] = useState<string>('Tous');

  // Search input state highlights
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load selected stock movements from Centrale des stocks
  const selectedPieceMovements = useMemo(() => {
    if (!selectedStockId) return [];
    const mainStockItem = stocks.find(s => s.id === selectedStockId);
    return mainStockItem?.mouvements || [];
  }, [selectedStockId, stocks]);

  // Dynamically calculate outgoing volumes and impacted defibrillators from active tours
  const getPieceOutgoingStats = useMemo(() => {
    return (denomPieceId: string) => {
      const stats = {
        week1: { vol: 0, defibs: [] as string[] },
        week2: { vol: 0, defibs: [] as string[] },
        next30: { vol: 0, defibs: [] as string[] }
      };

      if (!denomPieceId) return stats;

      const vObj = variables.find(v => v.id === denomPieceId);
      if (!vObj) return stats;

      const pieceNameLower = vObj.nom.toLowerCase().trim();

      const getDaysDiff = (dateStr: string) => {
        if (!dateStr) return 999;
        const base = new Date();
        base.setHours(0,0,0,0);
        const target = new Date(dateStr);
        target.setHours(0,0,0,0);
        const diffTime = target.getTime() - base.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      };

      const activeToursList = (fsmTours || []).filter(t => 
        t.status === 'Brouillon' || t.status === 'À faire' || t.status === 'En cours'
      );

      activeToursList.forEach(tour => {
        const diffDays = getDaysDiff(tour.startDate);
        const missions = tour.missions || tour.passages || [];
        
        missions.forEach((m: any) => {
          const parts = m.requiredParts || [];
          const matchCount = parts.filter((p: string) => p && p.toLowerCase().trim() === pieceNameLower).length;
          
          if (matchCount > 0) {
            const defibId = m.defibIdentifiant || m.identifiant || 'Inconnu';
            
            if (diffDays <= 7) {
              stats.week1.vol += matchCount;
              if (!stats.week1.defibs.includes(defibId)) {
                stats.week1.defibs.push(defibId);
              }
            } else if (diffDays > 7 && diffDays <= 14) {
              stats.week2.vol += matchCount;
              if (!stats.week2.defibs.includes(defibId)) {
                stats.week2.defibs.push(defibId);
              }
            }
            
            if (diffDays > 7 && diffDays <= 30) {
              stats.next30.vol += matchCount;
              if (!stats.next30.defibs.includes(defibId)) {
                stats.next30.defibs.push(defibId);
              }
            }
          }
        });
      });

      return stats;
    };
  }, [fsmTours, variables]);

  const outgoingStats = useMemo(() => {
    const matchedStock = stocks.find(s => s.id === selectedStockId);
    if (!matchedStock) return { week1: { vol: 0, defibs: [] }, week2: { vol: 0, defibs: [] }, next30: { vol: 0, defibs: [] } };
    return getPieceOutgoingStats(matchedStock.denominationPieceId);
  }, [getPieceOutgoingStats, selectedStockId, stocks]);

  const handleOpenNewForm = () => {
    setEditingId(null);
    setSelectedStockId('');
    setLocationName('Entrepôt A');
    setVolumeDisponible(0);
    setVolumeReserve(0);
    setVolumeEntrant(0);
    setShowForm(true);
  };

  const handleEditClick = (item: DistributedStockLocation) => {
    setEditingId(item.id);
    const linkedStockId = item.stockId || stocks.find(s => s.denominationPieceId === item.denominationPieceId)?.id || '';
    setSelectedStockId(linkedStockId);
    setLocationName(item.locationName);
    setVolumeDisponible(item.volumeDisponible);
    setVolumeReserve(item.volumeReserve);
    setVolumeEntrant(item.volumeEntrant);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette affectation de stock distribué ?')) {
      const updated = distributedStocks.filter(x => x.id !== id);
      saveDistributedStocks(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) return;

    const matchedStock = stocks.find(s => s.id === selectedStockId);
    if (!matchedStock) return;

    if (editingId) {
      const updated = distributedStocks.map(it => {
        if (it.id === editingId) {
          return {
            ...it,
            denominationPieceId: matchedStock.denominationPieceId,
            stockId: matchedStock.id,
            locationName,
            volumeDisponible: Number(volumeDisponible) || 0,
            volumeReserve: Number(volumeReserve) || 0,
            volumeEntrant: Number(volumeEntrant) || 0
          };
        }
        return it;
      });
      saveDistributedStocks(updated);
    } else {
      const newItem: DistributedStockLocation = {
        id: 'ds_' + Date.now(),
        denominationPieceId: matchedStock.denominationPieceId,
        stockId: matchedStock.id,
        locationName,
        volumeDisponible: Number(volumeDisponible) || 0,
        volumeReserve: Number(volumeReserve) || 0,
        volumeEntrant: Number(volumeEntrant) || 0
      };
      saveDistributedStocks([newItem, ...distributedStocks]);
    }

    // Reset
    setShowForm(false);
    setEditingId(null);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return distributedStocks.filter(item => {
      // Find matching Stock Central Record to check UGS too
      const matchedStock = stocks.find(s => s.id === item.stockId || s.denominationPieceId === item.denominationPieceId);
      const ugsVal = matchedStock?.ugs || '';
      
      const vObj = variables.find(v => v.id === item.denominationPieceId);
      const pieceName = vObj ? vObj.nom.toLowerCase() : '';
      const cat = vObj ? vObj.category.toLowerCase() : '';
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = 
        pieceName.includes(query) || 
        cat.includes(query) || 
        ugsVal.toLowerCase().includes(query);
        
      const matchesLoc = locationFilter === 'Tous' || item.locationName === locationFilter;
      return matchesSearch && matchesLoc;
    });
  }, [distributedStocks, variables, stocks, searchQuery, locationFilter]);

  // Compute counts map for filter pills
  const countMap = useMemo(() => {
    const map: Record<string, number> = {
      'Tous': distributedStocks.length,
      'Entrepôt A': 0,
      'Entrepôt B': 0,
      'Entrepôt C': 0,
      'Véhicule A': 0,
      'Véhicule B': 0,
      'Véhicule C': 0
    };
    distributedStocks.forEach(ds => {
      if (map[ds.locationName] !== undefined) {
        map[ds.locationName]++;
      }
    });
    return map;
  }, [distributedStocks]);

  // Styling constants designed exactly like StocksTab
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
    whiteSpace: 'nowrap',
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

  return (
    <div className="space-y-6 animate-fadeIn" id="stocks-distribues-tab-container-harmonized">
      <style>{`
        #stocks-distribues-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):not(#search-distributed-input),
        #stocks-distribues-tab-container-harmonized select,
        #stocks-distribues-tab-container-harmonized textarea {
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
        #stocks-distribues-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-distributed-input),
        #stocks-distribues-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-distributed-input),
        #stocks-distribues-tab-container-harmonized select:hover:not(:disabled),
        #stocks-distribues-tab-container-harmonized select:focus:not(:disabled),
        #stocks-distribues-tab-container-harmonized textarea:hover:not(:disabled),
        #stocks-distribues-tab-container-harmonized textarea:focus:not(:disabled),
        #stocks-distribues-tab-container-harmonized #search-distributed-input:hover,
        #stocks-distribues-tab-container-harmonized #search-distributed-input:focus {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }
        #stocks-distribues-tab-container-harmonized select {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          background-image: none !important;
        }
        #stocks-distribues-tab-container-harmonized select option {
          color: #000000 !important;
          background: #ffffff !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #stocks-distribues-tab-container-harmonized input[type="date"]::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        #stocks-distribues-tab-container-harmonized label {
          letter-spacing: normal !important;
          text-transform: none !important;
          font-size: 16px !important;
          color: #000000 !important;
          font-weight: 600 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
        }
        #stocks-distribues-tab-container-harmonized input:disabled,
        #stocks-distribues-tab-container-harmonized select:disabled {
          background-color: #f1f5f9 !important;
          color: #555555 !important;
          cursor: not-allowed !important;
          opacity: 0.82 !important;
        }
      `}</style>

      {!showForm ? (
        <>
          {/* Header Section */}
          <div 
            className="bg-white space-y-4"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" style={{ color: '#000000', cursor: 'default' }} id="stocks-distribues-tab-title">Stocks distribués</h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-white">
                {/* Field recherche (Search input) */}
                <div className="relative w-full sm:w-80 bg-white">
                  <input
                    type="text"
                    id="search-distributed-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                  type="button"
                  onClick={handleOpenNewForm}
                  style={customButtonStyle}
                  className="font-sans"
                >
                  Nouveau
                </button>
              </div>
            </div>
          </div>

          {/* Filters Pills Row - identical style to Centrale des stocks */}
          <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="stocks-distributed-storage-pills">
            {['Tous', 'Entrepôt A', 'Entrepôt B', 'Entrepôt C', 'Véhicule A', 'Véhicule B', 'Véhicule C'].map((loc) => {
              const count = countMap[loc] || 0;
              const isSelected = locationFilter === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocationFilter(loc)}
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
                  {loc} ({count})
                </button>
              );
            })}
          </div>

          {/* Distributed Stock Table List - identical to Centrale des stocks table */}
          <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans border-collapse text-xs" id="stocks-distribues-record-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                <thead>
                  <tr className="bg-transparent">
                    <th className="px-4 py-3.5" style={thStyle}>UGS</th>
                    <th className="px-4 py-3.5" style={thStyle}>Pièce ou service.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Emplacement</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté disponible.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté réservée.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté entrante.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Sortant Sem.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Sortant Sem. Pro.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Sortant 7 à 30 jours.</th>
                    <th className="px-4 py-3.5 text-right w-24" style={thStyle}>Actions.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center font-sans lg:py-24 text-sm bg-white" style={{ color: '#000000', fontWeight: 100, fontSize: '16px' }}>
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const matchedStock = stocks.find(s => s.id === item.stockId || s.denominationPieceId === item.denominationPieceId);
                      const ugsCode = matchedStock?.ugs || '';
                      
                      const vObj = variables.find(v => v.id === item.denominationPieceId);
                      const pieceName = vObj ? vObj.nom : 'Dénomination inconnue';
                      const pieceCat = vObj ? vObj.category : '-';

                      const rowStats = getPieceOutgoingStats(item.denominationPieceId);

                      return (
                        <tr key={item.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                          {/* UGS */}
                          <td className="px-4 py-5 whitespace-nowrap font-sans text-slate-800" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontSize: '16px', color: '#000000', cursor: 'default' }}>
                            {ugsCode || '-'}
                          </td>
                          {/* Pièce ou service */}
                          <td className="px-4 py-5 whitespace-nowrap font-sans text-black" style={{ fontSize: '16px', color: '#000000', cursor: 'default', whiteSpace: 'nowrap' }}>
                            <span className="font-semibold">{pieceName}</span> <span className="text-black font-normal">({pieceCat})</span>
                          </td>
                          {/* Emplacement */}
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
                              {item.locationName}
                            </span>
                          </td>
                          {/* Qté disponible */}
                          <td className="px-4 py-5 text-center whitespace-nowrap font-semibold" style={{ fontSize: '15px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {item.volumeDisponible}
                          </td>
                          {/* Qté réservée */}
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {item.volumeReserve}
                          </td>
                          {/* Qté entrante */}
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {item.volumeEntrant}
                          </td>
                          {/* Sortant Sem */}
                          <td className="px-4 py-5 text-center whitespace-nowrap font-semibold" style={{ fontSize: '15px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {rowStats.week1.vol}
                          </td>
                          {/* Sortant Sem Pro */}
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {rowStats.week2.vol}
                          </td>
                          {/* Sortant 7 à 30 jours */}
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', cursor: 'default' }}>
                            {rowStats.next30.vol}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-5 text-right whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2 bg-transparent">
                              <button
                                type="button"
                                onClick={() => onNavigateToCentraleStocks?.(ugsCode)}
                                style={{
                                  ...rowActionButtonStyle,
                                  backgroundColor: '#000000',
                                  color: '#ffffff',
                                }}
                                className="cursor-pointer font-sans"
                              >
                                Centrale
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditClick(item)}
                                style={rowActionButtonStyle}
                                className="cursor-pointer font-sans"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                disabled={item.volumeDisponible !== 0}
                                onClick={() => handleDelete(item.id)}
                                style={{
                                  ...rowActionButtonStyle,
                                  opacity: item.volumeDisponible !== 0 ? 0.35 : 1,
                                  cursor: item.volumeDisponible !== 0 ? 'not-allowed' : 'pointer'
                                }}
                                className="font-sans"
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
        /* Form mode styled exactly like main form overlay in StocksTab */
        <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="stocks-distributed-form-overlay">
          
          {/* Header Box styled exactly like DefibTab Form Header */}
          <div 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', width: '98%', maxWidth: '98%', margin: 'auto', padding: '20px' }}
            id="distributed-form-header-box"
          >
            <div>
              <h3 className="text-2xl font-bold font-gochi" id="distributed-form-title" style={{ color: '#000', cursor: 'default' }}>
                {editingId ? "Modification Stock Distribué" : "Nouveau Stock Distribué"}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                style={rowActionButton18Style}
                className="transition-colors cursor-pointer"
              >
                <span>Annuler</span>
              </button>

              <button
                type="submit"
                form="distributed-stock-form"
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
            id="distributed-stock-form"
            onSubmit={handleSubmit} 
            className="space-y-6 bg-white p-5 border-none"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderRadius: '18px',
              width: '98%',
              maxWidth: '98%',
              margin: 'auto'
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white font-sans text-sm">
              
              {/* Section Propriétés Capsule */}
              <div className="flex bg-white md:col-span-4 select-none mb-1">
                <span 
                  className="inline-flex items-center px-4 py-1.5 rounded-full font-semibold font-sans"
                  style={{
                    color: '#fff',
                    backgroundColor: '#5f1f66',
                    fontSize: '16px',
                    border: 'none',
                    textTransform: 'none',
                    letterSpacing: 'normal'
                  }}
                >
                  Propriétés
                </span>
              </div>

              {/* Piece Selection - looks up Centrale des stocks records */}
              <div className="flex flex-col gap-1 bg-white md:col-span-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Équipement de la centrale des stocks *</label>
                <select
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  disabled={!!selectedStockId}
                  className="w-full bg-white text-black cursor-pointer"
                  required
                >
                  <option value="" disabled hidden>Sélectionnez un item de la centrale des stocks</option>
                  {stocks.map(st => {
                    const vObj = variables.find(v => v.id === st.denominationPieceId);
                    const pieceName = vObj ? vObj.nom : 'Dénomination inconnue';
                    const pieceCat = vObj ? vObj.category : '';
                    const ugsLabel = st.ugs ? ` [UGS: ${st.ugs}]` : '';
                    return (
                      <option key={st.id} value={st.id}>
                        {pieceName} ({pieceCat}){ugsLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Section Emplacement */}
              <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
              <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-4">
                <div className="flex bg-white select-none">
                  <span 
                    className="inline-flex items-center px-4 py-1.5 rounded-full font-semibold font-sans"
                    style={{
                      color: '#fff',
                      backgroundColor: '#5f1f66',
                      fontSize: '16px',
                      border: 'none',
                      textTransform: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    Emplacement
                  </span>
                </div>

                <div className="flex flex-col gap-1 bg-white">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emplacement de stockage *</label>
                  <select
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value as any)}
                    className="w-full bg-white text-black cursor-pointer"
                    required
                  >
                    <option value="Entrepôt A">Entrepôt A</option>
                    <option value="Entrepôt B">Entrepôt B</option>
                    <option value="Entrepôt C">Entrepôt C</option>
                    <option value="Véhicule A">Véhicule A</option>
                    <option value="Véhicule B">Véhicule B</option>
                    <option value="Véhicule C">Véhicule C</option>
                  </select>
                </div>
              </div>

              {/* Section Volumes */}
              <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
              <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-4">
                <div className="flex bg-white select-none">
                  <span 
                    className="inline-flex items-center px-4 py-1.5 rounded-full font-semibold font-sans"
                    style={{
                      color: '#fff',
                      backgroundColor: '#5f1f66',
                      fontSize: '16px',
                      border: 'none',
                      textTransform: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    Volumes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white">
                  {/* Volume Disponible */}
                  <div className="flex flex-col gap-1 bg-white md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume disponible *</label>
                    <input
                      type="number"
                      min="0"
                      value={volumeDisponible}
                      onChange={(e) => setVolumeDisponible(Number(e.target.value))}
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Volume Réserve */}
                  <div className="flex flex-col gap-1 bg-white md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume réservé *</label>
                    <input
                      type="number"
                      value={volumeReserve}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  {/* Volume Entrant */}
                  <div className="flex flex-col gap-1 bg-white md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume entrant *</label>
                    <input
                      type="number"
                      value={volumeEntrant}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  {/* Total indicator (calculated) */}
                  <div className="flex flex-col gap-1 bg-white md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Volume total</label>
                    <input
                      type="number"
                      value={volumeDisponible + volumeReserve}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                {/* Section 2: Projections volumes sortants directly under volumes as fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white mt-1">
                  {/* Sortant cette semaine */}
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sortant cette semaine.</label>
                    <input
                      type="number"
                      value={outgoingStats.week1.vol}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  {/* Sortant semaine prochaine */}
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sortant semaine prochaine.</label>
                    <input
                      type="number"
                      value={outgoingStats.week2.vol}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>

                  {/* Sortant 7 à 30 jours */}
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sortant 7 à 30 jours.</label>
                    <input
                      type="number"
                      value={outgoingStats.next30.vol}
                      disabled
                      readOnly
                      className="focus:outline-none w-full font-sans cursor-not-allowed bg-slate-100 text-slate-700 p-2 border border-slate-200 rounded"
                    />
                  </div>
                </div>

              </div>

              {/* Section Mouvements */}
              <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
              <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-4">
                <div className="flex bg-white select-none">
                  <span 
                    className="inline-flex items-center px-4 py-1.5 rounded-full font-semibold font-sans"
                    style={{
                      color: '#fff',
                      backgroundColor: '#5f1f66',
                      fontSize: '16px',
                      border: 'none',
                      textTransform: 'none',
                      letterSpacing: 'normal'
                    }}
                  >
                    Mouvements
                  </span>
                </div>

                {selectedPieceMovements.length > 0 && (
                  <div 
                    className="overflow-x-auto border rounded-xl mt-2 bg-white" 
                    style={{ borderColor: 'oklch(0.88 0 0)', borderWidth: '1px' }}
                  >
                    <table className="w-full text-left font-sans border-collapse text-xs">
                      <thead>
                        <tr className="bg-white" style={{ borderBottom: '1px solid oklch(0.88 0 0)' }}>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Indicateur.</th>
                          <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Circulation.</th>
                          <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Raccordement.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Volume.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Suivi du colis.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Date.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap', cursor: 'default' }}>Situation.</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {selectedPieceMovements.map((mv, index) => {
                          return (
                            <tr 
                              key={mv.id} 
                              className="hover:bg-slate-50 transition-all font-sans bg-white text-black" 
                              style={{ borderBottom: index === selectedPieceMovements.length - 1 ? 'none' : '1px solid oklch(0.88 0 0)' }}
                            >
                              {/* Indicator (Pink text with 18px arrow) */}
                              <td className="px-3 py-2 whitespace-nowrap bg-white text-center" style={{ cursor: 'default' }}>
                                <span 
                                  className="inline-flex items-center justify-center font-bold font-sans"
                                  style={{ 
                                    color: '#fa53d5',
                                    fontSize: '18px',
                                    lineHeight: '1',
                                    cursor: 'default'
                                  }}
                                >
                                  {mv.type === 'Réapprovisionnement fournisseur' ? '↓' : 
                                   mv.type === 'Distribution' ? '→' : 
                                   mv.type === 'Annulation' ? '↑' : '←'}
                                </span>
                              </td>
                              {/* Type / Circulation */}
                              <td 
                                className="px-3 py-2 bg-white font-medium text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.type || ''}
                              </td>
                              {/* Raccordement */}
                              <td 
                                className="px-3 py-2 bg-white font-medium text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.emplacement || ''}
                              </td>
                              {/* Volume */}
                              <td 
                                className="px-3 py-2 text-center bg-white font-semibold text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.volume !== undefined && mv.volume !== null ? mv.volume : ''}
                              </td>
                              {/* Suivi du colis */}
                              <td className="px-3 py-2 text-center bg-white text-black font-semibold" style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}>
                                {mv.trackingLink ? (
                                  <a
                                    href={mv.trackingLink.startsWith('http') ? mv.trackingLink : `https://${mv.trackingLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#fa53d5] hover:underline font-bold font-sans"
                                    style={{ cursor: 'pointer' }}
                                    title="Suivre le colis"
                                  >
                                    Ouvrir le lien
                                  </a>
                                ) : (
                                  ''
                                )}
                              </td>
                              {/* Date */}
                              <td 
                                className="px-3 py-2 text-center bg-white font-medium text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.date ? new Date(mv.date).toLocaleDateString('fr-FR') : ''}
                              </td>
                              {/* Situation */}
                              <td className="px-3 py-2 text-center bg-white font-medium text-black" style={{ fontSize: '16px', cursor: 'default' }}>
                                {mv.statut || ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
