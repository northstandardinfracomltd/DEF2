import React, { useState, useMemo, useEffect } from 'react';
import { Variable, StockRecord, Defibrillateur, StockMovement, DistributedStockLocation, CommercialDoc } from '../types';

interface StocksTabProps {
  stocks: StockRecord[];
  variables: Variable[];
  defibrillateurs: Defibrillateur[];
  saveStocks: (updated: StockRecord[]) => void;
  showStockForm: boolean;
  setShowStockForm: (show: boolean) => void;
  distributedStocks?: DistributedStockLocation[];
  onNavigateToDistributedStocks?: (ugs: string) => void;
  stockSearchQuery?: string;
  setStockSearchQuery?: (q: string) => void;
  commercialDocs?: CommercialDoc[];
}

export default function StocksTab({
  stocks,
  variables,
  defibrillateurs = [],
  saveStocks,
  showStockForm,
  setShowStockForm,
  distributedStocks = [],
  onNavigateToDistributedStocks,
  stockSearchQuery: externalStockSearchQuery,
  setStockSearchQuery: externalSetStockSearchQuery,
  commercialDocs = [],
}: StocksTabProps) {
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newDenomStr, setNewDenomStr] = useState('');
  const [newQty, setNewQty] = useState<number>(0);
  const [newQtyReservee, setNewQtyReservee] = useState<number>(0);

  const availableBcs = useMemo(() => {
    if (!commercialDocs || commercialDocs.length === 0) return [];
    const bcs = commercialDocs
      .filter(doc => doc.hasBonCommande && doc.bonCommandeReference && doc.bonCommandeReference.trim() !== '')
      .map(doc => doc.bonCommandeReference!.trim());
    return Array.from(new Set(bcs));
  }, [commercialDocs]);

  // Stock Movement States
  const [mouvements, setMouvements] = useState<StockMovement[]>([]);
  const [newMvType, setNewMvType] = useState<'Réapprovisionnement fournisseur' | 'Distribution' | 'Rapatriement'>('Distribution');
  const [newMvVolume, setNewMvVolume] = useState<number>(1);
  const [newMvDate, setNewMvDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newMvStatut, setNewMvStatut] = useState<'Préparation' | 'Expédié' | 'Terminé' | 'Annulé'>('Préparation');
  const [newMvBonCommande, setNewMvBonCommande] = useState<string>('');
  const [newMvTrackingLink, setNewMvTrackingLink] = useState<string>('');
  const [newMvEmplacement, setNewMvEmplacement] = useState<string>('');
  const [showMvForm, setShowMvForm] = useState<boolean>(false);
  const [newUgs, setNewUgs] = useState<string>('');

  useEffect(() => {
    if (newMvType === 'Distribution' || newMvType === 'Rapatriement') {
      if (distributedStocks.length > 0) {
        const ds = distributedStocks[0];
        const matchedVar = variables.find(v => v.id === ds.denominationPieceId);
        const itemName = matchedVar ? matchedVar.nom : 'Pièce';
        const matchedStock = stocks.find(s => s.id === ds.stockId || s.denominationPieceId === ds.denominationPieceId);
        const ugsCode = matchedStock ? matchedStock.ugs : 'N/A';
        setNewMvEmplacement(`${itemName} ${ugsCode} : ${ds.locationName}`);
      } else {
        setNewMvEmplacement('');
      }
    } else {
      setNewMvEmplacement('');
    }
  }, [newMvType, distributedStocks, variables, stocks]);

  const handleAddMovementInline = () => {
    if (newMvVolume <= 0) {
      alert("Le volume doit être supérieur à 0");
      return;
    }
    if (!newMvDate) {
      alert("La date est requise");
      return;
    }
    const newMv: StockMovement = {
      id: 'mv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: newMvType,
      volume: Number(newMvVolume),
      date: newMvDate,
      statut: newMvStatut,
      bonCommande: newMvBonCommande,
      trackingLink: newMvTrackingLink,
      emplacement: newMvEmplacement
    };
    setMouvements([...mouvements, newMv]);
    setNewMvVolume(1);
    setNewMvBonCommande('');
    setNewMvTrackingLink('');
    setNewMvEmplacement('');
    setShowMvForm(false);
  };

  const handleUpdateMovementStatus = (mvId: string, status: 'Préparation' | 'Expédié' | 'Terminé' | 'Annulé') => {
    const updated = mouvements.map((m) => {
      if (m.id === mvId) {
        return { ...m, statut: status };
      }
      return m;
    });
    setMouvements(updated);
  };

  const handleUpdateMovementTrackingLink = (mvId: string, link: string) => {
    const updated = mouvements.map((m) => {
      if (m.id === mvId) {
        return { ...m, trackingLink: link };
      }
      return m;
    });
    setMouvements(updated);
  };

  const handleUpdateMovementBonCommande = (mvId: string, bc: string) => {
    const updated = mouvements.map((m) => {
      if (m.id === mvId) {
        return { ...m, bonCommande: bc };
      }
      return m;
    });
    setMouvements(updated);
  };

  const handleCancelMovement = (mvId: string) => {
    const clickedMv = mouvements.find(m => m.id === mvId);
    if (!clickedMv) return;

    // Mark cliked row as canceled (and its status also updated to Annulé visually, as the user says "disable toutes actions possible")
    const updatedMouvements = mouvements.map((m) => {
      if (m.id === mvId) {
        return { ...m, isCanceled: true, statut: 'Annulé' as const };
      }
      return m;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Generate a brand new movement line
    const annulationMv: StockMovement = {
      id: 'mv_ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'Annulation',
      volume: clickedMv.volume,
      date: todayStr,
      statut: 'Préparation',
      bonCommande: '',
      trackingLink: '',
      emplacement: 'Centrale',
      isCanceled: true // Canceled / disabled by definition since it's an Annulation row
    };

    setMouvements([...updatedMouvements, annulationMv]);
  };

  const handleRemoveMovement = (mvId: string) => {
    setMouvements(mouvements.filter(m => m.id !== mvId));
  };

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
  const [localStockSearchQuery, setLocalStockSearchQuery] = useState('');
  const stockSearchQuery = externalStockSearchQuery !== undefined ? externalStockSearchQuery : localStockSearchQuery;
  const setStockSearchQuery = externalSetStockSearchQuery !== undefined ? externalSetStockSearchQuery : setLocalStockSearchQuery;
  const [stockStorageFilter, setStockStorageFilter] = useState<'Tous' | 'ReqPrev2M' | 'ReqPrev2to6M'>('Tous');
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

    const finalLivDate = newLivDate;
    const finalReapDate = newReapDate;
    const finalStorage = newStorage || 'Entrepôt A';

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
            stockage: finalStorage,
            besoinProjete2Mois: prevoianceData.bis2M,
            besoinProjete2a6Mois: prevoianceData.bis2to6M,
            totalACommander: prevoianceData.totalToOrder,
            commentaire: newCommentaire,
            mouvements: mouvements,
            ugs: newUgs || '0001'
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
        stockage: finalStorage,
        besoinProjete2Mois: prevoianceData.bis2M,
        besoinProjete2a6Mois: prevoianceData.bis2to6M,
        totalACommander: prevoianceData.totalToOrder,
        commentaire: newCommentaire,
        mouvements: mouvements,
        ugs: newUgs || '0001'
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
    setNewStorage('Entrepôt A');
    setNewCommentaire('');
    setNewUgs('');
    setMouvements([]);
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
      setNewStorage('Entrepôt A');
      setNewCommentaire('');
      setMouvements([]);
      
      // Auto-generate UGS
      const numbers = stocks
        .map(s => parseInt(s.ugs || '', 10))
        .filter(n => !isNaN(n));
      const max = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextUgsVal = String(max + 1).padStart(4, '0');
      setNewUgs(nextUgsVal);

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
    }
    
    const query = stockSearchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      modelNom.includes(query) ||
      modelMarque.includes(query) ||
      modelCat.includes(query) ||
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
                <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" style={{ color: '#000000', cursor: 'default' }} id="stocks-tab-title">Centrale des stocks</h2>
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
              { value: 'ReqPrev2M', label: 'Besoin 2 mois' },
              { value: 'ReqPrev2to6M', label: 'Besoin 2 à 6 mois' }
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
                    <th className="px-4 py-3.5" style={thStyle}>UGS</th>
                    <th className="px-4 py-3.5" style={thStyle}>Pièce ou service.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté disponible.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Qté réservée.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Besoin 2 mois.</th>
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Besoin 2 à 6 mois.</th>
                    <th className="px-4 py-3.5 text-right" style={thStyle}>Tarif fournisseur.</th>
                    <th className="px-4 py-3.5 text-right" style={thStyle}>Tarif de vente HT.</th>
                    <th className="px-4 py-3.5 text-right w-24" style={thStyle}>Actions.</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center font-sans lg:py-24 text-sm bg-white" style={{ color: '#000000', fontWeight: 100, fontSize: '16px' }}>
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((st) => {
                      const vObj = variables.find(v => v.id === st.denominationPieceId);
                      const rawName = vObj ? vObj.nom : 'Modèle inconnu';
                      
                      const prev = getPrevoianceForVariable(st.denominationPieceId, st.quantite);
                      const besoin2M = st.besoinProjete2Mois !== undefined ? Math.max(st.besoinProjete2Mois, prev.bis2M) : prev.bis2M;
                      const besoin2to6M = st.besoinProjete2a6Mois !== undefined ? Math.max(st.besoinProjete2a6Mois, prev.bis2to6M) : prev.bis2to6M;

                      return (
                        <tr key={st.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                          <td className="px-4 py-5 whitespace-nowrap font-mono text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {st.ugs || '0001'}
                          </td>
                          <td className="px-4 py-5 whitespace-nowrap">
                            <span className="font-sans font-semibold text-[#000000] text-sm">{rawName}</span>
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.quantite}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.quantiteReservee ?? 0}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap font-sans font-bold text-slate-900" style={{ fontSize: '14px' }}>
                            {besoin2M}
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap font-sans font-bold text-slate-700" style={{ fontSize: '14px' }}>
                            {besoin2to6M}
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {(st.valeurAchat ?? 0).toFixed(2)} €
                          </td>
                          <td className="px-4 py-5 text-right font-black whitespace-nowrap" style={{ fontSize: '16px', fontWeight: 105, color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {(st.prixVenteHt ?? 0).toFixed(2)} €
                          </td>
                          <td className="px-4 py-5 text-right whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-2 bg-transparent">
                              <button
                                type="button"
                                onClick={() => {
                                  onNavigateToDistributedStocks?.(st.ugs || '');
                                }}
                                style={{
                                  ...rowActionButtonStyle,
                                  backgroundColor: '#fa53d5',
                                  color: '#fff',
                                }}
                                className="cursor-pointer font-sans"
                              >
                                Distribution
                              </button>
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
                                  setMouvements(st.mouvements || []);
                                  setNewUgs(st.ugs || '');
                                  setShowStockForm(true);
                                }}
                                style={rowActionButtonStyle}
                                className="cursor-pointer font-sans"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                disabled={st.quantite > 0}
                                onClick={() => {
                                  if (st.quantite > 0) return;
                                  if (confirm('Retirer cet article du stock ?')) {
                                    saveStocks(stocks.filter(s => s.id !== st.id));
                                  }
                                }}
                                style={{
                                  ...rowActionButtonStyle,
                                  opacity: st.quantite > 0 ? 0.35 : 1,
                                  cursor: st.quantite > 0 ? 'not-allowed' : 'pointer'
                                }}
                                className="font-sans"
                                title={st.quantite > 0 ? "Impossible de supprimer un stock dont la quantité disponible n'est pas à 0" : "Supprimer"}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white font-sans">
              
              {/* Section Propriétés Capsule */}
              <div className="flex bg-white md:col-span-4 select-none mb-1">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-widest font-sans">
                  Propriétés
                </span>
              </div>

              {/* Lookup Dénomination variable - 3/4 Width on Row */}
              <div className="flex flex-col gap-1 bg-white md:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">Pièce ou service *</label>
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

              {/* UGS Reference Code - 1/4 Width on Row */}
              <div className="flex flex-col gap-1 bg-white md:col-span-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">UGS *</label>
                <input
                  type="text"
                  value={newUgs}
                  onChange={(e) => setNewUgs(e.target.value)}
                  placeholder="Ex: 0001"
                  className="focus:outline-none w-full font-sans"
                  style={{ minHeight: '38px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  required
                />
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

              {/* Pricing section - 3 elegant columns spanning full row width */}
              <div className="md:col-span-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-slate-100 pt-5">
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
                <div className="flex bg-white mb-2 select-none">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-[#edf2f7] text-[#2d3748] border border-[#cbd5e0] uppercase tracking-wider font-sans">
                    Prévoyance
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded text-xs text-slate-600 mb-2 font-sans">
                  Nous estimons votre besoin de trésorerie à <span className="font-bold text-slate-900">{((Number(newValAchat) || 0) * (prevoianceData.totalToOrder || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>€, pour l'achat des stocks requis aux actions de maintenances.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white">
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

              {/* Section Mouvements */}
              <div className="md:col-span-4 border-t border-slate-200 pt-5 mt-2 bg-white flex flex-col gap-1">
                <div className="flex justify-between items-center bg-white mb-2 select-none">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-[#edf2f7] text-[#2d3748] border border-[#cbd5e0] uppercase tracking-wider font-sans">
                    Mouvements
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMvForm(!showMvForm)}
                      style={{
                        backgroundColor: '#3556ec',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        padding: '6px 14px',
                        fontSize: '12px'
                      }}
                      className="font-sans font-bold rounded-lg flex items-center gap-1 active:scale-95 transition-all text-white cursor-pointer border-0"
                    >
                      + Nouveau mouvement
                    </button>
                    <button
                      type="submit"
                      form="equipement-stock-form"
                      style={{
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        padding: '6px 14px',
                        fontSize: '12px'
                      }}
                      className="font-sans font-bold rounded-lg flex items-center gap-1 active:scale-95 transition-all text-white cursor-pointer border-0"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>

                {/* Sub-form to add a new movement inline */}
                {showMvForm && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 gap-4 flex flex-col font-sans mb-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 bg-transparent">
                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type du mouvement *</label>
                        <select
                          value={newMvType}
                          onChange={(e) => setNewMvType(e.target.value as any)}
                          className="w-full bg-white text-black p-2 rounded border border-slate-200"
                          style={{ minHeight: '36px' }}
                        >
                          <option value="Réapprovisionnement fournisseur">Réapprovisionnement fournisseur</option>
                          <option value="Distribution">Distribution</option>
                        </select>
                      </div>

                      {/* Lookup / conditional input depending on type */}
                      <div className="flex flex-col gap-1 bg-transparent">
                        {newMvType === 'Distribution' ? (
                          <>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Envoyer à *</label>
                            <select
                              value={newMvEmplacement}
                              onChange={(e) => setNewMvEmplacement(e.target.value)}
                              className="w-full bg-white text-black p-2 rounded border border-slate-200"
                              style={{ minHeight: '36px' }}
                              required
                            >
                              <option value="" disabled hidden>Sélectionnez un emplacement</option>
                              {distributedStocks.map(ds => {
                                const matchedVar = variables.find(v => v.id === ds.denominationPieceId);
                                const itemName = matchedVar ? matchedVar.nom : 'Pièce';
                                const matchedStock = stocks.find(s => s.id === ds.stockId || s.denominationPieceId === ds.denominationPieceId);
                                const ugsCode = matchedStock ? matchedStock.ugs : 'N/A';
                                const labelVal = `${itemName} ${ugsCode} : ${ds.locationName}`;
                                return (
                                  <option key={ds.id} value={labelVal}>
                                    {labelVal}
                                  </option>
                                );
                              })}
                            </select>
                          </>
                        ) : newMvType === 'Rapatriement' ? (
                          <>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Retour de *</label>
                            <select
                              value={newMvEmplacement}
                              onChange={(e) => setNewMvEmplacement(e.target.value)}
                              className="w-full bg-slate-100 text-slate-600 p-2 rounded border border-slate-200 cursor-not-allowed"
                              style={{ minHeight: '36px' }}
                              disabled
                            >
                              <option value="" disabled hidden>Pas d'emplacement</option>
                              {distributedStocks.map(ds => {
                                const matchedVar = variables.find(v => v.id === ds.denominationPieceId);
                                const itemName = matchedVar ? matchedVar.nom : 'Pièce';
                                const matchedStock = stocks.find(s => s.id === ds.stockId || s.denominationPieceId === ds.denominationPieceId);
                                const ugsCode = matchedStock ? matchedStock.ugs : 'N/A';
                                const labelVal = `${itemName} ${ugsCode} : ${ds.locationName}`;
                                return (
                                  <option key={ds.id} value={labelVal}>
                                    {labelVal}
                                  </option>
                                );
                              })}
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Provenance *</label>
                            <input
                              type="text"
                              value={newMvEmplacement}
                              onChange={(e) => setNewMvEmplacement(e.target.value)}
                              placeholder="Fournisseur"
                              className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs font-mono"
                              style={{ minHeight: '36px' }}
                              required
                            />
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume *</label>
                        <input
                          type="number"
                          min="1"
                          value={newMvVolume}
                          onChange={(e) => setNewMvVolume(Number(e.target.value))}
                          className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                          style={{ minHeight: '36px' }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date *</label>
                        <input
                          type="date"
                          value={newMvDate}
                          onChange={(e) => setNewMvDate(e.target.value)}
                          className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                          style={{ minHeight: '36px' }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bon commande</label>
                        {availableBcs.length === 0 ? (
                          <div className="w-full bg-slate-55 text-slate-450 border border-slate-200 rounded p-2 text-[10px] font-sans italic" style={{ minHeight: '36px' }}>
                            Aucun BC trouvé dans Factures & Devis.
                          </div>
                        ) : (
                          <select
                            value={newMvBonCommande}
                            onChange={(e) => setNewMvBonCommande(e.target.value)}
                            className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                            style={{ minHeight: '36px' }}
                          >
                            <option value="">Sélectionner un BC...</option>
                            {commercialDocs
                              .filter(doc => doc.hasBonCommande && doc.bonCommandeReference && doc.bonCommandeReference.trim() !== '')
                              .map(doc => (
                                <option key={doc.id} value={doc.bonCommandeReference}>
                                  {doc.bonCommandeReference} - {doc.clientDenomination} ({doc.type} {doc.ref})
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suivi colis</label>
                        <input
                          type="text"
                          placeholder="Lien de suivi"
                          value={newMvTrackingLink}
                          onChange={(e) => setNewMvTrackingLink(e.target.value)}
                          className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                          style={{ minHeight: '36px' }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 bg-transparent">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statut *</label>
                        <select
                          value={newMvStatut}
                          onChange={(e) => setNewMvStatut(e.target.value as any)}
                          className="w-full bg-white text-black p-2 rounded border border-slate-200"
                          style={{ minHeight: '36px' }}
                        >
                          <option value="Préparation">Préparation</option>
                          <option value="Expédié">Expédié</option>
                          <option value="Terminé">Terminé</option>
                          <option value="Annulé">Annulé</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 bg-transparent text-xs">
                      <button
                        type="button"
                        onClick={() => setShowMvForm(false)}
                        className="bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg hover:bg-slate-300 font-semibold border-0 cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMovementInline}
                        className="bg-indigo-600 text-white py-1.5 px-4 rounded-lg hover:bg-indigo-700 font-semibold border-0 cursor-pointer shadow-xs"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                {/* Table of movements report */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl mt-2 bg-white">
                  <table className="w-full text-left font-sans border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="px-3 py-2 font-semibold">Indicateur</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Provenance / Destination</th>
                        <th className="px-3 py-2 text-center font-semibold">Volume</th>
                        <th className="px-3 py-2 text-center font-semibold">Bon commande</th>
                        <th className="px-3 py-2 text-center font-semibold">Suivi Colis</th>
                        <th className="px-3 py-2 text-center font-semibold">Date</th>
                        <th className="px-3 py-2 text-center font-semibold">Statut</th>
                        <th className="px-3 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {mouvements.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400">
                            Aucun mouvement enregistré pour cette pièce.
                          </td>
                        </tr>
                      ) : (
                        mouvements.map((mv) => {
                          return (
                            <tr key={mv.id} className="hover:bg-slate-50 transition-all font-sans bg-white text-black">
                              {/* Indicator */}
                              <td className="px-3 py-2 whitespace-nowrap bg-white text-black">
                                <span className="inline-flex items-center gap-1.5 font-bold bg-white text-black">
                                  {mv.type === 'Réapprovisionnement fournisseur' ? (
                                    <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs border border-amber-200 inline-flex items-center gap-1">
                                      ↓ Réappro. Fourn.
                                    </span>
                                  ) : mv.type === 'Distribution' ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs border border-emerald-200 inline-flex items-center gap-1">
                                      → Cent. vers Empl.
                                    </span>
                                  ) : mv.type === 'Annulation' ? (
                                    <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-xs border border-rose-200 inline-flex items-center gap-1 font-bold">
                                      ↑ Annulation
                                    </span>
                                  ) : (
                                    <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md text-xs border border-blue-200 inline-flex items-center gap-1">
                                      ← Empl. vers Cent.
                                    </span>
                                  )}
                                </span>
                              </td>
                              {/* Type */}
                              <td className="px-3 py-2 whitespace-nowrap text-slate-800 font-medium bg-white">
                                {mv.type}
                              </td>
                              {/* Provenance / Destination */}
                              <td className="px-3 py-2 text-slate-700 bg-white font-medium">
                                {mv.emplacement || '-'}
                              </td>
                              {/* Volume */}
                              <td className="px-3 py-2 text-center font-semibold text-slate-900 bg-white">
                                {mv.volume}
                              </td>
                              {/* Bon commande */}
                              <td className="px-3 py-2 text-center bg-white text-black min-w-[150px]">
                                {availableBcs.length === 0 ? (
                                  <input
                                    type="text"
                                    value={mv.bonCommande || ''}
                                    disabled
                                    placeholder="Aucun BC"
                                    className="w-full text-xs text-slate-400 border border-slate-200 rounded px-2 py-1 bg-slate-50 cursor-not-allowed"
                                    style={{ height: '28px' }}
                                  />
                                ) : (
                                  <select
                                    value={mv.bonCommande || ''}
                                    disabled={mv.isCanceled || mv.type === 'Annulation'}
                                    onChange={(e) => handleUpdateMovementBonCommande(mv.id, e.target.value)}
                                    className="w-full text-xs text-black border border-slate-200 rounded px-1 py-0.5 bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed font-medium"
                                    style={{ height: '28px' }}
                                  >
                                    <option value="">Aucun BC...</option>
                                    {commercialDocs
                                      .filter(doc => doc.hasBonCommande && doc.bonCommandeReference && doc.bonCommandeReference.trim() !== '')
                                      .map(doc => (
                                        <option key={doc.id} value={doc.bonCommandeReference}>
                                          {doc.bonCommandeReference} ({doc.clientDenomination.length > 15 ? doc.clientDenomination.substring(0, 15) + '...' : doc.clientDenomination})
                                        </option>
                                      ))
                                    }
                                  </select>
                                )}
                              </td>
                              {/* Suivi Colis (trackingLink) */}
                              <td className="px-3 py-2 text-center bg-white text-black min-w-[140px]">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={mv.trackingLink || ''}
                                    disabled={mv.isCanceled || mv.type === 'Annulation'}
                                    onChange={(e) => handleUpdateMovementTrackingLink(mv.id, e.target.value)}
                                    placeholder="Lien de suivi"
                                    className="w-full text-xs text-black border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    style={{ height: '28px' }}
                                  />
                                  {mv.trackingLink && (mv.trackingLink.startsWith('http') || mv.trackingLink.startsWith('www')) && (
                                    <a
                                      href={mv.trackingLink.startsWith('http') ? mv.trackingLink : `https://${mv.trackingLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold px-1.5 py-1 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100 flex items-center justify-center cursor-pointer font-sans"
                                      title="Suivre le colis"
                                      style={{ height: '28px', width: '28px' }}
                                    >
                                      ↗
                                    </a>
                                  )}
                                </div>
                              </td>
                              {/* Date */}
                              <td className="px-3 py-2 text-center text-slate-500 bg-white">
                                {mv.date ? new Date(mv.date).toLocaleDateString('fr-FR') : '-'}
                              </td>
                              {/* Statut - dropdown enabled inline */}
                              <td className="px-3 py-2 text-center whitespace-nowrap bg-white">
                                <select
                                  value={mv.statut}
                                  disabled={mv.isCanceled || mv.type === 'Annulation'}
                                  onChange={(e) => handleUpdateMovementStatus(mv.id, e.target.value as any)}
                                  className="mx-auto text-xs bg-white text-black p-1 border border-slate-200 rounded min-w-[110px] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  style={{ minHeight: '28px', fontSize: '11px' }}
                                >
                                  <option value="Préparation">Préparation</option>
                                  <option value="Expédié">Expédié</option>
                                  <option value="Terminé">Terminé</option>
                                  <option value="Annulé">Annulé</option>
                                </select>
                              </td>
                              {/* Delete/Cancel option */}
                              <td className="px-3 py-2 text-right bg-white">
                                <button
                                  type="button"
                                  disabled={mv.isCanceled || mv.type === 'Annulation'}
                                  onClick={() => handleCancelMovement(mv.id)}
                                  className="text-red-500 hover:text-red-700 disabled:text-slate-300 disabled:cursor-not-allowed text-[11px] font-semibold border-0 bg-transparent cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
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
