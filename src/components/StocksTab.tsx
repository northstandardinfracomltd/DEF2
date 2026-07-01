import React, { useState, useMemo, useEffect } from 'react';
import { Variable, StockRecord, Defibrillateur, StockMovement, DistributedStockLocation, CommercialDoc, AchatFournisseur, StockTraceability } from '../types';
import HelpBubble from './HelpBubble';

const CODE39_MAP: Record<string, string> = {
  '0': '101001101101',
  '1': '110100101011',
  '2': '101100101011',
  '3': '110110010101',
  '4': '101001101011',
  '5': '110100110101',
  '6': '101100110101',
  '7': '101001011011',
  '8': '110100101101',
  '9': '101100101101',
  'A': '110101001011',
  'B': '101101001011',
  'C': '110110100101',
  'D': '101011001011',
  'E': '110101100101',
  'F': '101101100101',
  'G': '101010011011',
  'H': '110101001101',
  'I': '101101001101',
  'J': '101011001101',
  'K': '110101010011',
  'L': '101101010011',
  'M': '110110101001',
  'N': '101011010011',
  'O': '110101101001',
  'P': '101101101001',
  'Q': '101010110011',
  'R': '110101011001',
  'S': '101101011001',
  'T': '101011011001',
  'U': '110010101011',
  'V': '100110101011',
  'W': '110011010101',
  'X': '100101101011',
  'Y': '110010110101',
  'Z': '100111010101',
  '-': '100101011101',
  '.': '110010101101',
  ' ': '100110101101',
  '*': '100101101101',
  '$': '100100100101',
  '/': '100100101001',
  '+': '100101001001',
  '%': '101001001001'
};

function generateBarcodeSVGString(text: string): string {
  const cleanText = '*' + text.toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '-') + '*';
  let binaryString = '';
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    binaryString += CODE39_MAP[char] || CODE39_MAP['-'];
    binaryString += '0';
  }

  const barWidth = 1.5;
  const barcodeHeight = 30;
  const textHeight = 15;
  const totalHeight = barcodeHeight + textHeight;
  const totalWidth = binaryString.length * barWidth;
  
  let rects = '';
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === '1') {
      rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barcodeHeight}" fill="black" />`;
    }
  }
  
  const textElement = `<text x="${totalWidth / 2}" y="${barcodeHeight + 12}" font-family="'DefibeoMain', 'Civilprom', sans-serif" font-size="10" text-anchor="middle" fill="black">${text}</text>`;
  
  return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">${rects}${textElement}</svg>`;
}

const downloadBarcodeSVG = (text: string) => {
  const svgContent = generateBarcodeSVGString(text);
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `barcode_${text}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
  achatsFournisseurs?: AchatFournisseur[];
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
  achatsFournisseurs = [],
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

  // Traçabilité States
  const [traceabilityEnabled, setTraceabilityEnabled] = useState<boolean>(false);
  const [traceabilities, setTraceabilities] = useState<StockTraceability[]>([]);
  
  // Nouveau Inventaire Form States
  const [showTraceabilityForm, setShowTraceabilityForm] = useState<boolean>(false);
  const [selectedMovementId, setSelectedMovementId] = useState<string>('');
  const [lotOrSerial, setLotOrSerial] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [situation, setSituation] = useState<'Disponible' | 'Utilisé' | 'Indisponible' | 'Signalé manquant'>('Disponible');

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
    } else if (newMvType === 'Réapprovisionnement fournisseur') {
      if (achatsFournisseurs.length > 0) {
        setNewMvEmplacement(achatsFournisseurs[0].reference);
      } else {
        setNewMvEmplacement('');
      }
    } else {
      setNewMvEmplacement('');
    }
  }, [newMvType, distributedStocks, variables, stocks, achatsFournisseurs]);

  const handleAddMovementInline = () => {
    if (newMvVolume <= 0) {
      alert("Le volume doit être supérieur à 0");
      return;
    }
    if (!newMvDate) {
      alert("La date est requise");
      return;
    }
    if (newMvType === 'Réapprovisionnement fournisseur' && !newMvEmplacement) {
      alert("Veuillez sélectionner un achat fournisseur (référence BL) ou en configurer un au préalable dans l'onglet des achats.");
      return;
    }
    if (newMvType === 'Distribution' && !newMvEmplacement) {
      alert("Veuillez sélectionner un emplacement.");
      return;
    }
    const newMv: StockMovement = {
      id: 'mv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: newMvType,
      volume: Number(newMvVolume),
      date: newMvDate,
      statut: newMvStatut,
      bonCommande: '',
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

  const handleAddTraceabilityInline = () => {
    if (!selectedMovementId) {
      alert("Veuillez sélectionner un mouvement.");
      return;
    }
    if (!lotOrSerial.trim()) {
      alert("Le numéro de lot ou série est requis.");
      return;
    }

    const matchedMv = mouvements.find(mv => mv.id === selectedMovementId);
    let initialLocation = 'Centrale';
    if (matchedMv) {
      if (matchedMv.type === 'Réapprovisionnement fournisseur') {
        initialLocation = 'Centrale';
      } else if (matchedMv.emplacement) {
        if (matchedMv.emplacement.includes(' : ')) {
          initialLocation = matchedMv.emplacement.split(' : ')[1];
        } else {
          initialLocation = matchedMv.emplacement;
        }
      }
    }

    const newTrace: StockTraceability = {
      id: 'tr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      movementId: selectedMovementId,
      lotOrSerial: lotOrSerial.trim(),
      expirationDate: expirationDate || undefined,
      volume: 1,
      situation: situation,
      emplacement: initialLocation
    };
    setTraceabilities([...traceabilities, newTrace]);
    
    // Reset form states
    setSelectedMovementId('');
    setLotOrSerial('');
    setExpirationDate('');
    setSituation('Disponible');
    setShowTraceabilityForm(false);
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

    // Check if the UGS is unique
    const formattedUgs = (newUgs || '').trim();
    if (formattedUgs) {
      const isUgsAlreadyUsed = stocks.some(s => s.ugs && s.ugs.trim().toLowerCase() === formattedUgs.toLowerCase() && s.id !== editingStockId);
      if (isUgsAlreadyUsed) {
        alert(`Erreur : L'UGS "${formattedUgs}" est déjà associé à un autre stock. L'UGS doit être unique.`);
        return;
      }
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
            ugs: newUgs || '0001',
            traceabilityEnabled: traceabilityEnabled,
            traceabilities: traceabilities
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
        ugs: newUgs || '0001',
        traceabilityEnabled: traceabilityEnabled,
        traceabilities: traceabilities
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
    setTraceabilityEnabled(false);
    setTraceabilities([]);
    setSelectedMovementId('');
    setLotOrSerial('');
    setExpirationDate('');
    setSituation('Disponible');
    setShowTraceabilityForm(false);
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
      setTraceabilityEnabled(false);
      setTraceabilities([]);
      setSelectedMovementId('');
      setLotOrSerial('');
      setExpirationDate('');
      setSituation('Disponible');
      setShowTraceabilityForm(false);
      
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
      (st.ugs && st.ugs.toLowerCase().includes(query)) ||
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

          <HelpBubble 
            cacheKey="help_dismissed_stocks" 
            text="Le compartiment de la centrale des stocks vous permet de créer et gérer des pièces et services tous emplacements confondus. Retrouvez ensuite dans l’onglet des stocks distribués la répartition des pièces et services pour chaque emplacement. Pour rappel, un seul emplacement peut être dédié à un technicien par exemple, comme un véhicule ; il est aussi possible de gérer des emplacements de type entrepôt afin de savoir où est placé chaque élément." 
          />

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
                    <th className="px-4 py-3.5 text-center" style={thStyle}>Inv. traça. actif.</th>
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
                      <td colSpan={10} className="py-16 text-center font-sans lg:py-24 text-sm bg-white" style={{ color: '#000000', fontWeight: 100, fontSize: '16px' }}>
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
                          <td className="px-4 py-5 whitespace-nowrap font-sans text-xs font-bold text-slate-800 uppercase tracking-wide" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontSize: '15px' }}>
                            {st.ugs || '0001'}
                          </td>
                          <td className="px-4 py-5 whitespace-nowrap">
                            <span className="font-sans font-semibold text-[#000000] text-sm">{rawName}</span>
                          </td>
                          <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {st.traceabilityEnabled ? 'Oui' : 'Non'}
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
                                style={rowActionButtonStyle}
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
                                  setTraceabilityEnabled(st.traceabilityEnabled ?? false);
                                  setTraceabilities(st.traceabilities ?? []);
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
                {editingStockId ? 'MODIFICATION STOCK DE LA CENTRALE' : 'NOUVEAU STOCK DE LA CENTRALE'}
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
                style={{
                  ...rowActionButton18Style,
                  borderRadius: '13px',
                }}
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
              <div className="md:col-span-4 bg-white grid grid-cols-1 md:grid-cols-3 gap-5 pt-5">
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
              <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
              <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-1">
                <div className="flex bg-white mb-2 select-none">
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
                    Prévoyance
                  </span>
                </div>
                <div 
                  style={{
                    color: 'rgb(143 51 151)',
                    backgroundColor: 'rgb(253 229 255)',
                    border: 'none',
                    fontSize: '16px'
                  }}
                  className="p-4 rounded-xl mb-4 font-sans font-semibold"
                >
                  Nous estimons votre besoin de trésorerie à <strong className="font-extrabold">{((Number(newValAchat) || 0) * (prevoianceData.totalToOrder || 0)).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>€, pour l'achat des stocks requis aux actions de maintenances.
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
              <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
              <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-1">
                <div className="flex justify-between items-center bg-white mb-2 select-none">
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMvForm(!showMvForm)}
                      style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        padding: '10px 20px',
                        fontSize: '18px',
                        borderRadius: '13px',
                      }}
                      className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0 text-white"
                    >
                      Nouveau mouvement
                    </button>
                    <button
                      type="submit"
                      form="equipement-stock-form"
                      style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        padding: '10px 20px',
                        fontSize: '18px',
                        borderRadius: '13px',
                      }}
                      className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0 text-white"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>

                {/* Sub-form to add a new movement inline */}
                {showMvForm && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 gap-4 flex flex-col font-sans mb-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-transparent">
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
                        ) : newMvType === 'Réapprovisionnement fournisseur' ? (
                          <>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Provenance *</label>
                            {achatsFournisseurs.length === 0 ? (
                              <div className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded p-2 text-[10px] font-sans italic" style={{ minHeight: '36px', display: 'flex', alignItems: 'center' }}>
                                Aucun achat fournisseur enregistré.
                              </div>
                            ) : (
                              <select
                                value={newMvEmplacement}
                                onChange={(e) => setNewMvEmplacement(e.target.value)}
                                className="w-full bg-white text-black p-2 rounded border border-slate-200"
                                style={{ minHeight: '36px' }}
                                required
                              >
                                <option value="" disabled hidden>Sélectionnez un achat (BL)</option>
                                {achatsFournisseurs.map(achat => {
                                  const labelVal = `${achat.reference} - ${achat.supplierName || 'Fournisseur'}`;
                                  return (
                                    <option key={achat.id} value={achat.reference}>
                                      {labelVal}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
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

                    <div className="flex justify-end gap-3 bg-transparent mt-2">
                      <button
                        type="button"
                        onClick={() => setShowMvForm(false)}
                        style={{
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          padding: '10px 20px',
                          fontSize: '18px',
                          borderRadius: '13px',
                        }}
                        className="font-sans font-bold active:scale-95 transition-all text-white cursor-pointer border-0"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleAddMovementInline}
                        style={{
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          padding: '10px 20px',
                          fontSize: '18px',
                          borderRadius: '13px',
                        }}
                        className="font-sans font-bold active:scale-95 transition-all text-white cursor-pointer border-0 shadow-xs"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}

                {/* Table of movements report */}
                {mouvements.length > 0 && (
                  <div 
                    className="overflow-x-auto border rounded-xl mt-2 bg-white" 
                    style={{ borderColor: 'oklch(0.88 0 0)', borderWidth: '1px' }}
                  >
                    <table className="w-full text-left font-sans border-collapse text-xs">
                      <thead>
                        <tr className="bg-white" style={{ borderBottom: '1px solid oklch(0.88 0 0)' }}>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Indicateur.</th>
                          <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Circulation.</th>
                          <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Raccordement.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Volume.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Suivi du colis.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Date.</th>
                          <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Situation.</th>
                          <th className="px-3 py-3 text-right font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Action.</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {mouvements.map((mv, index) => {
                          return (
                            <tr 
                              key={mv.id} 
                              className="hover:bg-slate-50 transition-all font-sans bg-white text-black" 
                              style={{ borderBottom: index === mouvements.length - 1 ? 'none' : '1px solid oklch(0.88 0 0)' }}
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
                                {mv.type}
                              </td>
                              {/* Provenance / Destination / Raccordement */}
                              <td 
                                className="px-3 py-2 bg-white font-medium text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.emplacement || '-'}
                              </td>
                              {/* Volume */}
                              <td 
                                className="px-3 py-2 text-center bg-white font-semibold text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.volume}
                              </td>
                              {/* Suivi Colis (trackingLink) */}
                              <td className="px-3 py-2 text-center bg-white text-black min-w-[140px]">
                                <input
                                  type="text"
                                  value={mv.trackingLink || ''}
                                  disabled={mv.isCanceled || mv.type === 'Annulation'}
                                  onChange={(e) => handleUpdateMovementTrackingLink(mv.id, e.target.value)}
                                  placeholder="Lien de suivi"
                                  className="w-full bg-white text-black border px-3 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed font-sans"
                                  style={{ 
                                    height: '44px', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    outline: 'none',
                                    border: '1px solid #cbd5e1'
                                  }}
                                />
                              </td>
                              {/* Date */}
                              <td 
                                className="px-3 py-2 text-center bg-white font-medium text-black"
                                style={{ fontSize: '16px', whiteSpace: 'nowrap', color: '#000000', cursor: 'default' }}
                              >
                                {mv.date ? new Date(mv.date).toLocaleDateString('fr-FR') : '-'}
                              </td>
                              {/* Statut - dropdown enabled inline */}
                              <td className="px-3 py-2 text-center whitespace-nowrap bg-white">
                                <select
                                  value={mv.statut}
                                  disabled={mv.isCanceled || mv.type === 'Annulation'}
                                  onChange={(e) => handleUpdateMovementStatus(mv.id, e.target.value as any)}
                                  className="mx-auto bg-white text-black px-3 border min-w-[110px] disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed font-sans"
                                  style={{ 
                                    height: '44px', 
                                    fontSize: '12px', 
                                    borderRadius: '6px', 
                                    outline: 'none',
                                    border: '1px solid #cbd5e1'
                                  }}
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
                                  style={{
                                    backgroundColor: (mv.isCanceled || mv.type === 'Annulation') ? '#e2e8f0' : '#000000',
                                    color: (mv.isCanceled || mv.type === 'Annulation') ? '#94a3b8' : '#ffffff',
                                    padding: '8px 16px',
                                    fontSize: '16px',
                                    borderRadius: '13px',
                                    cursor: (mv.isCanceled || mv.type === 'Annulation') ? 'not-allowed' : 'pointer',
                                  }}
                                  className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0"
                                >
                                  Annuler
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section Inventaire de traçabilité */}
              {traceabilityEnabled && (
                <>
                  <div className="md:col-span-4 mt-2" style={{ borderTop: '1px solid rgb(218, 218, 218)', margin: '0 -20px' }} />
                  <div className="md:col-span-4 pt-5 mt-2 bg-white flex flex-col gap-1">
                    <div className="flex justify-between items-center bg-white mb-2 select-none">
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
                        Inventaire de traçabilité
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTraceabilityForm(!showTraceabilityForm)}
                          style={{
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            padding: '10px 20px',
                            fontSize: '18px',
                            borderRadius: '13px',
                          }}
                          className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0 text-white"
                        >
                          Nouveau inventaire
                        </button>
                      </div>
                    </div>

                    {/* Form Nouveau Inventaire */}
                    {showTraceabilityForm && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 gap-4 flex flex-col font-sans mb-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-transparent">
                          {/* Sélection du mouvement */}
                          <div className="flex flex-col gap-1 bg-transparent">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sélection du mouvement *</label>
                            <select
                              value={selectedMovementId}
                              onChange={(e) => setSelectedMovementId(e.target.value)}
                              className="w-full bg-white text-black p-2 rounded border border-slate-200"
                              style={{ minHeight: '36px' }}
                              required
                            >
                              <option value="" disabled hidden>Sélectionnez un mouvement</option>
                              <option value="Autre">Autre (Aucun mouvement)</option>
                              {mouvements.filter(mv => mv.type !== 'Annulation').map(mv => (
                                <option key={mv.id} value={mv.id}>
                                  {mv.date} - {mv.type} (Vol: {mv.volume})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Numéro de lot ou série */}
                          <div className="flex flex-col gap-1 bg-transparent">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Numéro de lot ou série *</label>
                            <input
                              type="text"
                              value={lotOrSerial}
                              onChange={(e) => setLotOrSerial(e.target.value)}
                              placeholder="Lot / Série"
                              className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                              style={{ minHeight: '36px' }}
                              required
                            />
                          </div>

                          {/* Date de péremption */}
                          <div className="flex flex-col gap-1 bg-transparent">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date de péremption</label>
                            <input
                              type="date"
                              value={expirationDate}
                              onChange={(e) => setExpirationDate(e.target.value)}
                              className="w-full bg-white p-2 border border-slate-200 rounded text-black font-semibold text-xs"
                              style={{ minHeight: '36px' }}
                            />
                          </div>

                          {/* Volume */}
                          <div className="flex flex-col gap-1 bg-transparent">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume *</label>
                            <input
                              type="number"
                              value={1}
                              disabled
                              readOnly
                              className="w-full bg-slate-100 p-2 border border-slate-200 rounded text-slate-500 font-semibold text-xs cursor-not-allowed"
                              style={{ minHeight: '36px' }}
                            />
                          </div>

                          {/* Situation */}
                          <div className="flex flex-col gap-1 bg-transparent">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Situation *</label>
                            <select
                              value={situation}
                              onChange={(e) => setSituation(e.target.value as any)}
                              className="w-full bg-white text-black p-2 rounded border border-slate-200"
                              style={{ minHeight: '36px' }}
                              required
                            >
                              <option value="Disponible">Disponible</option>
                              <option value="Utilisé">Utilisé</option>
                              <option value="Indisponible">Indisponible</option>
                              <option value="Signalé manquant">Signalé manquant</option>
                            </select>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 bg-transparent mt-2">
                          <button
                            type="button"
                            onClick={() => setShowTraceabilityForm(false)}
                            style={{
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              padding: '10px 20px',
                              fontSize: '18px',
                              borderRadius: '13px',
                            }}
                            className="font-sans font-bold active:scale-95 transition-all text-white cursor-pointer border-0"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={handleAddTraceabilityInline}
                            style={{
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              padding: '10px 20px',
                              fontSize: '18px',
                              borderRadius: '13px',
                            }}
                            className="font-sans font-bold active:scale-95 transition-all text-white cursor-pointer border-0 shadow-xs"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Table des Traçabilités */}
                    {traceabilities.length > 0 && (
                      <div 
                        className="overflow-x-auto border rounded-xl mt-2 bg-white" 
                        style={{ borderColor: 'oklch(0.88 0 0)', borderWidth: '1px' }}
                      >
                        <table className="w-full text-left font-sans border-collapse text-xs">
                          <thead>
                            <tr className="bg-white" style={{ borderBottom: '1px solid oklch(0.88 0 0)' }}>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Barre-code.</th>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Emplacement.</th>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Mouvement.</th>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Numéro de lot ou série.</th>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Date de péremption.</th>
                              <th className="px-3 py-3 text-center font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Volume.</th>
                              <th className="px-3 py-3 font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Situation.</th>
                              <th className="px-3 py-3 text-right font-semibold text-black font-sans" style={{ fontSize: '16px', color: '#000000', whiteSpace: 'nowrap' }}>Action.</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {traceabilities.map((trace, idx) => {
                              const ALL_LOCATIONS = [
                                'Centrale',
                                'Entrepôt A', 'Entrepôt B', 'Entrepôt C', 'Entrepôt D', 'Entrepôt E',
                                'Entrepôt F', 'Entrepôt G', 'Entrepôt H', 'Entrepôt I', 'Entrepôt J',
                                'Véhicule A', 'Véhicule B', 'Véhicule C', 'Véhicule D', 'Véhicule E',
                                'Véhicule F', 'Véhicule G', 'Véhicule H', 'Véhicule I', 'Véhicule J'
                              ];
                              const matchedMv = mouvements.find(mv => mv.id === trace.movementId);
                              let locationText = 'Centrale';
                              if (trace.emplacement) {
                                locationText = trace.emplacement;
                              } else if (matchedMv) {
                                if (matchedMv.type === 'Réapprovisionnement fournisseur') {
                                  locationText = 'Centrale';
                                } else if ((matchedMv.type === 'Distribution' || matchedMv.type === 'Rapatriement') && matchedMv.emplacement) {
                                  if (matchedMv.emplacement.includes(' : ')) {
                                    locationText = matchedMv.emplacement.split(' : ')[1];
                                  } else {
                                    locationText = matchedMv.emplacement;
                                  }
                                } else if (matchedMv.emplacement) {
                                  if (matchedMv.emplacement.includes(' : ')) {
                                    locationText = matchedMv.emplacement.split(' : ')[1];
                                  } else {
                                    locationText = matchedMv.emplacement;
                                  }
                                }
                              }

                              return (
                                <tr 
                                  key={trace.id} 
                                  className="hover:bg-slate-50 transition-all font-sans bg-white text-black" 
                                  style={{ borderBottom: idx === traceabilities.length - 1 ? 'none' : '1px solid oklch(0.88 0 0)' }}
                                >
                                  {/* Code-barres */}
                                  <td className="px-3 py-2 bg-white">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="inline-block"
                                        dangerouslySetInnerHTML={{ __html: generateBarcodeSVGString(trace.lotOrSerial) }} 
                                      />
                                      <button
                                        type="button"
                                        onClick={() => downloadBarcodeSVG(trace.lotOrSerial)}
                                        style={{
                                          backgroundColor: '#000000',
                                          color: '#ffffff',
                                          padding: '10px 20px',
                                          fontSize: '18px',
                                          borderRadius: '13px',
                                        }}
                                        className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0"
                                        title="Imprimer / Télécharger"
                                      >
                                        Imprimer
                                      </button>
                                    </div>
                                  </td>

                                  {/* Emplacement */}
                                  <td className="px-3 py-2 bg-white">
                                    <select
                                      value={trace.emplacement || locationText}
                                      onChange={(e) => {
                                        const updated = [...traceabilities];
                                        updated[idx].emplacement = e.target.value;
                                        setTraceabilities(updated);
                                      }}
                                      className="bg-white text-black p-1 border border-slate-300 rounded font-sans font-semibold"
                                      style={{ fontSize: '18px', border: '1px solid #cbd5e1', minWidth: '130px' }}
                                    >
                                      {ALL_LOCATIONS.map(loc => (
                                        <option key={loc} value={loc}>
                                          {loc}
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Mouvement */}
                                  <td className="px-3 py-2 bg-white">
                                    <select
                                      value={trace.movementId}
                                      onChange={(e) => {
                                        const updated = [...traceabilities];
                                        updated[idx].movementId = e.target.value;
                                        setTraceabilities(updated);
                                      }}
                                      className="w-full bg-white text-black p-1 border border-slate-300 rounded font-sans text-xs"
                                      style={{ minHeight: '30px' }}
                                    >
                                      <option value="" disabled hidden>Sélectionnez un mouvement</option>
                                      <option value="Autre">Autre (Aucun mouvement)</option>
                                      {mouvements.filter(mv => mv.type !== 'Annulation').map(mv => (
                                        <option key={mv.id} value={mv.id}>
                                          {mv.date} - {mv.type} (Vol: {mv.volume})
                                        </option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* Numéro de lot ou série */}
                                  <td className="px-3 py-2 bg-white">
                                    <input
                                      type="text"
                                      value={trace.lotOrSerial}
                                      onChange={(e) => {
                                        const updated = [...traceabilities];
                                        updated[idx].lotOrSerial = e.target.value;
                                        setTraceabilities(updated);
                                      }}
                                      className="w-full bg-white text-black p-1 border border-slate-300 rounded font-semibold text-xs font-mono"
                                      style={{ minHeight: '30px' }}
                                    />
                                  </td>

                                  {/* Date de péremption */}
                                  <td className="px-3 py-2 bg-white">
                                    <input
                                      type="date"
                                      value={trace.expirationDate || ''}
                                      onChange={(e) => {
                                        const updated = [...traceabilities];
                                        updated[idx].expirationDate = e.target.value || undefined;
                                        setTraceabilities(updated);
                                      }}
                                      className="w-full bg-white text-black p-1 border border-slate-300 rounded font-sans text-xs"
                                      style={{ minHeight: '30px' }}
                                    />
                                  </td>

                                  {/* Volume */}
                                  <td className="px-3 py-2 bg-white text-center">
                                    <input
                                      type="number"
                                      value={trace.volume}
                                      disabled
                                      className="w-16 bg-slate-100 text-slate-500 p-1 border border-slate-300 rounded font-sans text-xs text-center cursor-not-allowed"
                                      style={{ minHeight: '30px' }}
                                    />
                                  </td>

                                  {/* Situation */}
                                  <td className="px-3 py-2 bg-white">
                                    <select
                                      value={trace.situation}
                                      onChange={(e) => {
                                        const updated = [...traceabilities];
                                        updated[idx].situation = e.target.value as any;
                                        setTraceabilities(updated);
                                      }}
                                      className="w-full bg-white text-black p-1 border border-slate-300 rounded font-sans text-xs"
                                      style={{ minHeight: '30px' }}
                                    >
                                      <option value="Disponible">Disponible</option>
                                      <option value="Utilisé">Utilisé</option>
                                      <option value="Indisponible">Indisponible</option>
                                      <option value="Signalé manquant">Signalé manquant</option>
                                    </select>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-3 py-2 text-right bg-white">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTraceabilities(traceabilities.filter((_, i) => i !== idx));
                                      }}
                                      style={{
                                        backgroundColor: '#000000',
                                        color: '#ffffff',
                                        padding: '10px 20px',
                                        fontSize: '18px',
                                        borderRadius: '13px',
                                      }}
                                      className="font-sans font-bold active:scale-95 transition-all cursor-pointer border-0"
                                    >
                                      Supprimer
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

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

              {/* Activer la traçabilité des pièces. */}
              <div className="md:col-span-4 bg-white flex flex-col gap-2 mt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider stocks-label-style">
                  Activer la traçabilité des pièces.
                </span>
                <div className="flex gap-4 mt-1 bg-transparent">
                  <button
                    type="button"
                    onClick={() => setTraceabilityEnabled(true)}
                    className="flex items-center gap-2 font-sans font-bold cursor-pointer select-none border-0 bg-transparent text-black"
                    style={{ fontSize: '18px' }}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white ${traceabilityEnabled === true ? 'border-[#fe4eba]' : 'border-slate-300'}`}>
                      {traceabilityEnabled === true && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                    </span>
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => setTraceabilityEnabled(false)}
                    className="flex items-center gap-2 font-sans font-bold cursor-pointer select-none border-0 bg-transparent text-black"
                    style={{ fontSize: '18px' }}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white ${traceabilityEnabled === false ? 'border-[#fe4eba]' : 'border-slate-300'}`}>
                      {traceabilityEnabled === false && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                    </span>
                    Non
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>
      )}

    </div>
  );
}
