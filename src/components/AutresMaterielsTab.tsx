import React, { useState, useMemo } from 'react';
import { OtherEquipment, Client } from '../types';
import { Plus, Search, Trash2, Edit } from 'lucide-react';
import { generateRandomShortCode } from '../utils';

interface AutresMaterielsTabProps {
  otherEquipments: OtherEquipment[];
  saveOtherEquipments: (items: OtherEquipment[]) => void;
  clients: Client[];
  fsmTours?: any[];
  onUpdateFsmTours?: (updated: any[]) => void;
  setActiveTab?: (tab: any) => void;
  members?: any[];
  defibrillateurs?: any[];
}

// Custom Pink Radio Component
const CustomPinkRadio = ({ value, currentValue, onChange, label }: { value: string, currentValue: string, onChange: (v: string) => void, label: string }) => {
  const isChecked = value === currentValue;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className="inline-flex items-center cursor-pointer gap-2 select-none"
      style={{ fontSize: '16px', color: '#000' }}
    >
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white ${isChecked ? 'border-[#fe4eba]' : 'border-slate-300'}`}>
        {isChecked && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
      </span>
      {label}
    </button>
  );
};

function getMaintenanceDotColor(prochaineMaintenanceStr: string): string {
  if (!prochaineMaintenanceStr) return '#94a3b8'; // GRIS
  
  const nextMaintenance = new Date(prochaineMaintenanceStr);
  if (isNaN(nextMaintenance.getTime())) return '#94a3b8'; // GRIS
  
  const today = new Date();
  today.setHours(0,0,0,0);
  nextMaintenance.setHours(0,0,0,0);
  
  const diffTime = nextMaintenance.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return '#ef4444'; // ROUGE (expirée)
  }
  
  const diffMonths = diffDays / 30.4375; // average days in a month
  
  if (diffMonths <= 3) {
    return '#f97316'; // ORANGE (sous 3 mois)
  } else if (diffMonths <= 6) {
    return '#3b82f6'; // BLEU (entre sous 3 à 6 mois)
  } else {
    return '#94a3b8'; // GRIS (vide ou plus de 6 mois)
  }
}

export default function AutresMaterielsTab({
  otherEquipments,
  saveOtherEquipments,
  clients,
  fsmTours = [],
  onUpdateFsmTours,
  setActiveTab,
  members = [],
  defibrillateurs = [],
}: AutresMaterielsTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTourDropdownOpen, setIsTourDropdownOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherEquipment | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');

  // Form Fields State
  const [clientId, setClientId] = useState('');
  const [nomPrenomSite, setNomPrenomSite] = useState('');
  const [telephoneSite, setTelephoneSite] = useState('');
  const [emailSite, setEmailSite] = useState('');
  const [contrat, setContrat] = useState<'Oui' | 'Non'>('Non');
  const [nomContrat, setNomContrat] = useState('');
  const [referenceContrat, setReferenceContrat] = useState('');
  const [debutContrat, setDebutContrat] = useState('');
  const [finContrat, setFinContrat] = useState('');

  const [numeroVoie, setNumeroVoie] = useState('');
  const [ville, setVille] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [region, setRegion] = useState('');
  const [pays, setPays] = useState('France');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [aideAcces, setAideAcces] = useState('');
  const [accesPermanent, setAccesPermanent] = useState<'Oui' | 'Non'>('Oui');
  const [accesJoursOuvres, setAccesJoursOuvres] = useState<'Oui' | 'Non'>('Oui');
  const [accesWeekend, setAccesWeekend] = useState<'Oui' | 'Non'>('Non');
  const [installeExterieur, setInstalleExterieur] = useState<'Oui' | 'Non'>('Non');

  const [expirationGarantie, setExpirationGarantie] = useState('');
  const [fabrication, setFabrication] = useState('');
  const [miseEnService, setMiseEnService] = useState('');
  const [derniereMaintenance, setDerniereMaintenance] = useState('');
  const [sortieUsine, setSortieUsine] = useState('');
  const [prochaineMaintenance, setProchaineMaintenance] = useState('');

  const handleDerniereMaintenanceChange = (val: string) => {
    setDerniereMaintenance(val);
    if (val) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        date.setMonth(date.getMonth() + 12);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        setProchaineMaintenance(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  const [categorie, setCategorie] = useState('Extincteur');
  const [identifiant, setIdentifiant] = useState('');
  const [tournee, setTournee] = useState('Centre');

  // Specific variables per category
  const [specifiques, setSpecifiques] = useState<Record<string, any>>({});

  // Client Search in dropdown
  const [clientSearchText, setClientSearchText] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Map client denomination
  // Moved clientMap lookup declaration up or we already have it.
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  // Filter clients for dropdown
  const filteredClientsForDropdown = useMemo(() => {
    if (!clientSearchText) return clients;
    
    // Check if what is typed is exactly the label of the currently selected client.
    // If so, and the user re-focuses or clicks, show all clients so they can change easily.
    const chosen = clientId ? clientMap.get(clientId) : null;
    const selectedLabel = chosen ? `${chosen.denomination} (${chosen.siret || chosen.id})` : null;
    if (clientSearchText === selectedLabel) {
      return clients;
    }

    const lower = clientSearchText.toLowerCase();
    return clients.filter(c => 
      c.denomination.toLowerCase().includes(lower) ||
      c.id.toLowerCase().includes(lower) ||
      (c.siret || '').toLowerCase().includes(lower)
    );
  }, [clients, clientSearchText, clientId, clientMap]);

  // Autopopulate client data
  const handleClientSelect = (clId: string) => {
    setClientId(clId);
    const chosen = clientMap.get(clId);
    if (chosen) {
      setNomPrenomSite(chosen.nomPrenomSite || '');
      setTelephoneSite(chosen.telephoneSite || chosen.phone || '');
      setEmailSite(chosen.emailSite || chosen.email || '');
      setContrat(chosen.contrat || 'Non');
      setNomContrat(chosen.nomContrat || '');
      setReferenceContrat(chosen.referenceContrat || '');
      setDebutContrat(chosen.debutContrat || '');
      setFinContrat(chosen.finContrat || '');
      
      const labelStr = `${chosen.denomination} (${chosen.siret || chosen.id})`;
      setClientSearchText(labelStr);
    } else {
      setClientSearchText('');
    }
    setIsClientDropdownOpen(false);
  };

  // Re-roll random identifiant button helper
  const reRollIdentifiant = () => {
    const existingIds = [
      ...(defibrillateurs || []).map((d: any) => d.identifiant),
      ...otherEquipments.map((o: any) => o.identifiant)
    ].filter(Boolean);
    setIdentifiant(generateRandomShortCode(existingIds));
  };

  // Open Form for Create
  const handleOpenNewForm = () => {
    setEditingItem(null);
    setClientId('');
    setNomPrenomSite('');
    setTelephoneSite('');
    setEmailSite('');
    setContrat('Non');
    setNomContrat('');
    setReferenceContrat('');
    setDebutContrat('');
    setFinContrat('');
    setNumeroVoie('');
    setVille('');
    setCodePostal('');
    setRegion('');
    setPays('France');
    setLatitude('');
    setLongitude('');
    setAideAcces('');
    setAccesPermanent('Oui');
    setAccesJoursOuvres('Oui');
    setAccesWeekend('Non');
    setInstalleExterieur('Non');
    setExpirationGarantie('');
    setFabrication('');
    setMiseEnService('');
    setDerniereMaintenance('');
    setSortieUsine('');
    setProchaineMaintenance('');
    setCategorie('Extincteur');
    
    // Generate unique short code clashing neither with other equipments nor with defibrillateurs
    const existingIds = [
      ...defibrillateurs.map((d: any) => d.identifiant),
      ...otherEquipments.map((o: any) => o.identifiant)
    ].filter(Boolean);
    setIdentifiant(generateRandomShortCode(existingIds));

    setTournee('Centre');
    setSpecifiques({});
    setClientSearchText('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditForm = (item: OtherEquipment) => {
    setEditingItem(item);
    setClientId(item.clientId);
    setNomPrenomSite(item.nomPrenomSite);
    setTelephoneSite(item.telephoneSite);
    setEmailSite(item.emailSite);
    setContrat(item.contrat);
    setNomContrat(item.nomContrat);
    setReferenceContrat(item.referenceContrat);
    setDebutContrat(item.debutContrat);
    setFinContrat(item.finContrat);
    setNumeroVoie(item.numeroVoie);
    setVille(item.ville);
    setCodePostal(item.codePostal);
    setRegion(item.region || '');
    setPays(item.pays || 'France');
    setLatitude(item.latitude || '');
    setLongitude(item.longitude || '');
    setAideAcces(item.aideAcces || '');
    setAccesPermanent(item.accesPermanent || 'Oui');
    setAccesJoursOuvres(item.accesJoursOuvres || 'Oui');
    setAccesWeekend(item.accesWeekend || 'Non');
    setInstalleExterieur(item.installeExterieur || 'Non');
    setExpirationGarantie(item.expirationGarantie || '');
    setFabrication(item.fabrication || '');
    setMiseEnService(item.miseEnService || '');
    setDerniereMaintenance(item.derniereMaintenance || '');
    setSortieUsine(item.sortieUsine || '');
    setProchaineMaintenance(item.prochaineMaintenance || '');
    setCategorie(item.categorie);

    // Fallback/load identifiant
    if (!item.identifiant) {
      const existingIds = [
        ...defibrillateurs.map((d: any) => d.identifiant),
        ...otherEquipments.map((o: any) => o.identifiant)
      ].filter(Boolean);
      item.identifiant = generateRandomShortCode(existingIds);
    }
    setIdentifiant(item.identifiant);

    setTournee(item.tournee || 'Centre');
    setSpecifiques(item.specifiques || {});
    
    const cl = clientMap.get(item.clientId);
    const clientLabel = cl ? `${cl.denomination} (${cl.siret || cl.id})` : '';
    setClientSearchText(clientLabel);
    setIsFormOpen(true);
  };

  // Delete Action
  const handleDeleteItem = (id: string) => {
    const updated = otherEquipments.filter(item => item.id !== id);
    saveOtherEquipments(updated);
  };

  // Submit Action
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const itemData: OtherEquipment = {
      id: editingItem ? editingItem.id : 'oe_' + Date.now(),
      identifiant,
      clientId,
      nomPrenomSite,
      telephoneSite,
      emailSite,
      contrat,
      nomContrat,
      referenceContrat,
      debutContrat,
      finContrat,
      numeroVoie,
      ville,
      codePostal,
      region,
      pays,
      latitude,
      longitude,
      aideAcces,
      accesPermanent,
      accesJoursOuvres,
      accesWeekend,
      installeExterieur,
      expirationGarantie,
      fabrication,
      miseEnService,
      derniereMaintenance,
      sortieUsine,
      prochaineMaintenance,
      categorie,
      tournee,
      specifiques,
    };

    let updatedList: OtherEquipment[];
    if (editingItem) {
      updatedList = otherEquipments.map(item => item.id === editingItem.id ? itemData : item);
    } else {
      updatedList = [...otherEquipments, itemData];
    }

    saveOtherEquipments(updatedList);
    setIsFormOpen(false);
  };

  // Update specific values
  const handleSpecifiqueChange = (key: string, val: any) => {
    setSpecifiques(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const executeNouvelleTournee = () => {
    if (!onUpdateFsmTours) return;
    const missions = selectedIds.map((id, index) => {
      const item = otherEquipments.find(e => e.id === id);
      const client = clients.find(c => c.id === item?.clientId);
      const clientName = client ? client.denomination : (item?.nomPrenomSite || 'Nom du Site');
      return {
        id: 'fsm-m-auto-' + Date.now() + '-' + index,
        clientName,
        defibIdentifiant: item?.identifiant || item?.categorie || 'Autre Matériel',
        equipmentType: item?.categorie || 'Autre Matériel',
        reason: 'Maintenance Autre matériel',
        requiredParts: [],
        status: 'À faire',
        priority: 'Normale',
        time: '14:00'
      };
    });

    const newTour = {
      id: 'fsm-tour-auto-' + Date.now(),
      title: "Nouvelle tournée sans titre",
      techName: members.find((m: any) => m.role === 'Maintenance Terrain' || m.role?.toLowerCase().includes('tech'))?.name || members[0]?.name || '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'Brouillon',
      missions
    };

    onUpdateFsmTours([...fsmTours, newTour]);
    setSelectedIds([]);
    setIsTourDropdownOpen(false);
    setSelectedDraftId(null);

    if (setActiveTab) {
      setActiveTab('fsm');
    }
  };

  const executeAddTournee = (targetTourId: string) => {
    if (!onUpdateFsmTours) return;
    const targetTour = fsmTours.find(t => t.id === targetTourId);
    if (!targetTour) return;

    const updated = fsmTours.map(t => {
      if (t.id === targetTourId) {
        const addedMissions = selectedIds.map((id, index) => {
          const item = otherEquipments.find(e => e.id === id);
          const client = clients.find(c => c.id === item?.clientId);
          const clientName = client ? client.denomination : (item?.nomPrenomSite || 'Nom du Site');
          return {
            id: 'fsm-m-auto-' + Date.now() + '-' + index,
            clientName,
            defibIdentifiant: item?.identifiant || item?.categorie || 'Autre Matériel',
            equipmentType: item?.categorie || 'Autre Matériel',
            reason: 'Maintenance Autre matériel',
            requiredParts: [],
            status: 'À faire',
            priority: 'Normale',
            time: '14:00'
          };
        });
        return {
          ...t,
          missions: [...t.missions, ...addedMissions]
        };
      }
      return t;
    });

    onUpdateFsmTours(updated);

    setSelectedIds([]);
    setIsTourDropdownOpen(false);
    setSelectedDraftId(null);

    if (setActiveTab) {
      setActiveTab('fsm');
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return otherEquipments.filter(item => {
      // 1. Category Filter
      const matchesCategory = categoryFilter === 'Tous' || item.categorie === categoryFilter;
      if (!matchesCategory) return false;

      // 2. Search Query Filter
      if (!searchQuery) return true;
      const lower = searchQuery.toLowerCase();
      const clName = clientMap.get(item.clientId)?.denomination || '';
      return (
        item.categorie.toLowerCase().includes(lower) ||
        (item.identifiant || '').toLowerCase().includes(lower) ||
        clName.toLowerCase().includes(lower) ||
        item.ville.toLowerCase().includes(lower) ||
        (item.tournee || '').toLowerCase().includes(lower)
      );
    });
  }, [otherEquipments, searchQuery, categoryFilter, clientMap]);

  // Color mappings for Category badge
  const getCategorieBadgeStyle = (cat: string) => {
    switch(cat) {
      case 'Extincteur':
        return { backgroundColor: '#e0f2fe', color: '#0369a1' }; // Blue
      case "Boucle d'induction magnétique portable (BIMP)":
        return { backgroundColor: '#fae8ff', color: '#a21caf' }; // Purple
      case 'Purificateur d’air':
        return { backgroundColor: '#ecfdf5', color: '#047857' }; // Green
      case 'Signalisation':
        return { backgroundColor: '#fef3c7', color: '#b45309' }; // Amber
      case 'Éclairage de secours':
        return { backgroundColor: '#fff1f2', color: '#e11d48' }; // Rose
      case 'Systèmes hydrants':
        return { backgroundColor: '#e0f2fe', color: '#2563eb' }; // Dark Blue
      case 'Détecteur de fumée':
        return { backgroundColor: '#ffedd5', color: '#ea580c' }; // Orange
      case 'Détection incendie (SSI)':
        return { backgroundColor: '#f3e8ff', color: '#7e22ce' }; // Violet
      case 'Désenfumage':
        return { backgroundColor: '#f1f5f9', color: '#334155' }; // Slate
      default:
        return { backgroundColor: '#f8fafc', color: '#64748b' };
    }
  };

  // Color mappings for Tournée
  const getTourneeBadgeClass = (tour: string) => {
    switch(tour) {
      case 'Nord': return 'bg-blue-100 text-blue-800';
      case 'Sud': return 'bg-orange-100 text-orange-800';
      case 'Est': return 'bg-purple-100 text-purple-800';
      case 'Ouest': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
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

  const customButtonStyle: React.CSSProperties = {
    backgroundColor: '#000000',
    color: '#ffffff',
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
  };

  const rowActionButton18Style: React.CSSProperties = {
    ...rowActionButtonStyle,
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontSize: '18px',
    padding: '9px 19px',
  };

  return (
    <div className="w-full font-sans select-text pb-12" id="autres-materiels-tab-container">
      {!isFormOpen ? (
        <>
          {/* Top action block & Search metrics */}
          <div 
            className="bg-white space-y-4"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold tracking-tight font-gochi" style={{ color: '#000000', cursor: 'default' }}>Autres Matériels</h2>
              </div>

              {/* Both search and buttons are placed directly next to the title */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Field recherche (Search input) with size reduced */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    id="search-materiels-input"
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    id="btn-refresh-page"
                    style={customButtonStyle}
                  >
                    Actualiser
                  </button>
                  <button
                    onClick={handleOpenNewForm}
                    id="btn-add-materiel"
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
          </div>

          {/* Filters Pills Row */}
          <div 
            className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" 
            id="autres-materiels-category-pills"
            style={{ maxWidth: '98%', margin: '0 auto' }}
          >
            {(['Tous', 'Extincteur', "Boucle d'induction magnétique portable (BIMP)", 'Purificateur d’air', 'Signalisation', 'Éclairage de secours', 'Systèmes hydrants', 'Détecteur de fumée', 'Détection incendie (SSI)', 'Désenfumage'] as const).map((filterOpt) => {
              let count = 0;
              if (filterOpt === 'Tous') {
                count = otherEquipments.length;
              } else {
                count = otherEquipments.filter(s => s.categorie === filterOpt).length;
              }
              
              const isActive = categoryFilter === filterOpt;
              return (
                <button
                  key={filterOpt}
                  type="button"
                  onClick={() => setCategoryFilter(filterOpt)}
                  style={{
                    borderRadius: '1000px',
                    padding: '8px 16px',
                    fontSize: '18px',
                    fontWeight: 100,
                    cursor: 'pointer',
                    fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                    backgroundColor: isActive ? '#fe4eba' : '#ffffff',
                    color: isActive ? '#ffffff' : '#000000',
                    border: isActive ? '1px solid #fe4eba' : '1px solid rgb(218, 218, 218)',
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="transition-all"
                >
                  {filterOpt} ({count})
                </button>
              );
            })}
          </div>

          {/* Dynamic bulk Action Bar at the top of the table if at least one record checked */}
          {selectedIds.length > 0 && (
            <div 
              className="p-4 flex items-center justify-between gap-4 animate-fadeIn" 
              id="bulk-actions-status-bar"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgb(231, 231, 231)',
                borderRadius: '16px',
                maxWidth: '98%',
                margin: '16px auto',
              }}
            >
              <div className="flex items-center gap-2">
                <span 
                  className="w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold font-sans shrink-0"
                  style={{ backgroundColor: '#fe4eba' }}
                >
                  {selectedIds.length}
                </span>
                <span 
                  className="font-sans"
                  style={{ fontSize: '18px', color: '#000000', fontWeight: '100', cursor: 'default' }}
                >
                  Sélectionné(s)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Action Tournee Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTourDropdownOpen(!isTourDropdownOpen);
                    }}
                    style={rowActionButton18Style}
                    className="cursor-pointer"
                  >
                    <span>Tournée</span>
                  </button>
                  {isTourDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-1 w-72 bg-white rounded-lg z-50 py-2.5 font-sans animate-fadeIn text-left"
                      style={{ 
                        fontSize: '18px',
                        border: '1px solid rgb(218 218 218)',
                        boxShadow: 'none',
                        color: '#000000',
                      }}
                    >
                      <div className="px-3 pb-2 bg-transparent text-center">
                        <button
                          type="button"
                          onClick={() => {
                            executeNouvelleTournee();
                          }}
                          style={{
                            ...rowActionButton18Style,
                            width: '100%',
                          }}
                          className="w-full text-center transition-colors cursor-pointer"
                        >
                          Nouvelle Tournée
                        </button>
                      </div>

                      {selectedDraftId && (
                        <div className="px-3 pb-2 bg-transparent text-center">
                          <button
                            type="button"
                            onClick={() => {
                              executeAddTournee(selectedDraftId);
                            }}
                            style={{
                              ...rowActionButton18Style,
                              width: '100%',
                              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset',
                              background: 'rgb(53, 86, 236)'
                            }}
                            className="w-full text-center transition-colors cursor-pointer"
                          >
                            Confirmer l'action
                          </button>
                        </div>
                      )}
                      
                      {(() => {
                        const drafts = (fsmTours || []).filter(t => (t.status || 'Brouillon') === 'Brouillon');
                        if (drafts.length === 0) {
                          return (
                            <div className="px-4 py-2 text-black font-sans text-center font-normal" style={{ fontSize: '15px' }}>
                              Aucune tournée en brouillon
                            </div>
                          );
                        }
                        return drafts.map(t => {
                          const isSelected = selectedDraftId === t.id;
                          const tourTitle = t.title || 'Nouvelle Tournée';
                          const displayTitle = tourTitle.length > 25 ? tourTitle.substring(0, 25) + '(...)' : tourTitle;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedDraftId(isSelected ? null : t.id);
                              }}
                              className="w-full text-left px-4 py-2 font-semibold truncate cursor-pointer border-0 bg-transparent hover:bg-transparent"
                              style={{ 
                                fontSize: '16px',
                                color: isSelected ? 'rgb(254, 78, 186)' : '#000000',
                                textDecoration: isSelected ? 'underline' : 'none'
                              }}
                            >
                              {displayTitle}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Table Records Sheet */}
          <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans border-collapse text-xs" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                <thead>
                  <tr className="bg-transparent">
                    <th className="px-4 py-3.5 w-12 text-center select-none" style={{ cursor: 'default' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const isAllSelected = filteredList.length > 0 && selectedIds.length === filteredList.length;
                          if (isAllSelected) {
                            setSelectedIds([]);
                          } else {
                            setSelectedIds(filteredList.map(item => item.id));
                          }
                        }}
                        id="select-all-radio-checkbox"
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-[#fe4eba]/20 cursor-pointer mx-auto ${
                          (filteredList.length > 0 && selectedIds.length === filteredList.length)
                            ? 'border-[#fe4eba] bg-transparent'
                            : 'border-slate-400 bg-white hover:border-[#fe4eba]'
                        }`}
                        style={{ borderWidth: '2.5px' }}
                        role="checkbox"
                        aria-checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                      >
                        {(filteredList.length > 0 && selectedIds.length === filteredList.length) && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba] transition-all scale-100" />
                        )}
                      </button>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Catégorie.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Identifiant.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Client.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Localisation.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Expir. garantie.</th>
                    <th className="px-5 py-3.5 whitespace-nowrap" style={thStyle}>Pro. visite.</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap" style={thStyle}>Tournée.</th>
                    <th className="px-5 py-3.5 text-right w-32 whitespace-nowrap" style={thStyle}>Actions.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 font-sans" style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                        Aucun résultat.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item) => {
                      const clientData = clientMap.get(item.clientId);
                      const isRowChecked = selectedIds.includes(item.id);
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleOpenEditForm(item)}
                          className="group hover:bg-[#ffecf8] transition-all cursor-pointer"
                        >
                          {/* Checkbox column */}
                          <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleSelectRow(item.id, e)}
                              id={`radio-checkbox-row-${item.id}`}
                              className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-[#fe4eba]/20 cursor-pointer mx-auto ${
                                isRowChecked
                                  ? 'border-[#fe4eba] bg-transparent'
                                  : 'border-slate-400 bg-white hover:border-[#fe4eba]'
                              }`}
                              style={{ borderWidth: '2.5px' }}
                              role="checkbox"
                              aria-checked={isRowChecked}
                            >
                              {isRowChecked && (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba] transition-all scale-100" />
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-4 font-sans whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            <div className="flex flex-col items-start gap-1">
                              <span 
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '1000px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid rgb(231, 231, 231)',
                                  color: '#000000',
                                  fontSize: '16px',
                                  fontWeight: 100,
                                  padding: '4px 12px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span 
                                  className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" 
                                  style={{ backgroundColor: getMaintenanceDotColor(item.prochaineMaintenance) }}
                                />
                                {item.categorie}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 select-all whitespace-nowrap text-xs" style={{ fontSize: '15px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                            {item.identifiant || '—'}
                          </td>
                          <td className="px-5 py-4 font-sans whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            {clientData ? clientData.denomination : ''}
                          </td>
                          <td className="px-5 py-4 font-sans whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            {item.ville}{item.codePostal ? ` (${item.codePostal})` : ''}
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-500" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            {item.expirationGarantie || '—'}
                          </td>
                          <td className="px-5 py-4 font-sans" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            {item.prochaineMaintenance || '—'}
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                            <span 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '1000px',
                                backgroundColor: '#ffffff',
                                border: '1px solid rgb(231, 231, 231)',
                                color: '#000000',
                                fontSize: '16px',
                                fontWeight: 100,
                                padding: '4px 12px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.tournee || 'Centre'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEditForm(item)}
                              style={rowActionButton18Style}
                              className="transition-colors cursor-pointer"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteItem(item.id);
                              }}
                              style={rowActionButton18Style}
                              className="transition-colors cursor-pointer"
                            >
                              Supprimer
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

          <div style={{ fontSize: '18px', color: '#000000', fontWeight: 'bold', cursor: 'default' }} className="p-4 font-sans text-left" id="autres-materiels-total-summary">
            Total matériels (Tous): {otherEquipments.length}.
          </div>
        </>
      ) : (
        /* FORM VIEW */
        <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="materiel-form-overlay">
          {/* Header */}
          <div 
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
            style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px' }}
            id="materiel-form-header-box"
          >
            <div>
              <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000000', cursor: 'default' }}>
                {editingItem ? 'Modification Matériel' : 'Nouveau Matériel'}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                id="btn-close-materiel-modal"
                style={rowActionButton18Style}
                className="transition-colors cursor-pointer"
              >
                <span>Fermer</span>
              </button>

              <button
                type="submit"
                form="materiel-core-form"
                id="btn-submit-materiel-form"
                style={{
                  ...rowActionButton18Style,
                  backgroundColor: 'rgb(53, 86, 236)',
                  color: '#ffffff',
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                }}
                className="transition-all cursor-pointer border-0"
              >
                Enregistrer
              </button>
            </div>
          </div>

          <div
            className="w-full animate-fadeIn mt-6"
            style={{ marginTop: '24px' }}
            id="materiel-form-box"
          >
            <style>{`
              #materiel-core-form input:not([type="radio"]):not([type="checkbox"]),
              #materiel-core-form select,
              #materiel-core-form textarea {
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
              #materiel-core-form input:not([type="radio"]):not([type="checkbox"]):hover,
              #materiel-core-form input:not([type="radio"]):not([type="checkbox"]):focus,
              #materiel-core-form select:hover,
              #materiel-core-form select:focus,
              #materiel-core-form textarea:hover,
              #materiel-core-form textarea:focus {
                outline: 2.5px solid #fa53d5 !important;
                outline-offset: 2px !important;
                transition: all 0s !important;
              }
              #materiel-core-form input:not([type="radio"]):not([type="checkbox"])::placeholder,
              #materiel-core-form textarea::placeholder {
                color: #000000 !important;
                opacity: 1 !important;
                font-weight: 100 !important;
                font-family: "DefibeoMain", "Civilprom", sans-serif !important;
              }
              #materiel-core-form input:disabled,
              #materiel-core-form select:disabled,
              #materiel-core-form textarea:disabled {
                color: #000000 !important;
                -webkit-text-fill-color: #000000 !important;
                background-color: #f1f5f9 !important;
                opacity: 0.95 !important;
                font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                cursor: not-allowed !important;
              }
              #materiel-core-form input:disabled:hover,
              #materiel-core-form input:disabled:focus,
              #materiel-core-form select:disabled:hover,
              #materiel-core-form select:disabled:focus,
              #materiel-core-form textarea:disabled:hover,
              #materiel-core-form textarea:disabled:focus {
                outline: none !important;
              }
              #materiel-core-form select {
                appearance: none !important;
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                background-image: none !important;
              }
              #materiel-core-form select option {
                color: #000000 !important;
                background: #ffffff !important;
                font-family: "DefibeoMain", "Civilprom", sans-serif !important;
              }
              #materiel-core-form input[type="date"]::-webkit-calendar-picker-indicator {
                display: none !important;
                -webkit-appearance: none !important;
                background: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              #materiel-core-form label,
              #materiel-core-form .section-title-label,
              #materiel-core-form span.block.uppercase {
                letter-spacing: normal !important;
                text-transform: none !important;
                font-size: 16px !important;
                color: #000000 !important;
                font-weight: 600 !important;
              }
            `}</style>
            
            <form onSubmit={handleFormSubmit} id="materiel-core-form">
              <div className="space-y-0" style={{ maxWidth: '98%', margin: 'auto' }}>
              
              {/* SECTION 1 - CLIENT */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderRadius: '18px 18px 0px 0px',
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
                    1 — Client
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Client Select Dropdown */}
                  <div className="space-y-1 relative" id="client-select-lookup-container">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Sélection du client.</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={clientSearchText}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        onChange={(e) => {
                          setClientSearchText(e.target.value);
                          setIsClientDropdownOpen(true);
                          if (clientId) {
                            setClientId('');
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setIsClientDropdownOpen(false), 250);
                        }}
                        placeholder="Rechercher un client."
                        className="w-full bg-white border border-slate-200 rounded p-2 text-xs"
                        style={{
                          fontSize: '15.5px'
                        }}
                      />
                      {clientSearchText && !clientId && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setClientSearchText('');
                            setClientId('');
                            setIsClientDropdownOpen(true);
                          }}
                          className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    {isClientDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg mt-1 shadow-lg divide-y divide-slate-100">
                        {filteredClientsForDropdown.length === 0 ? (
                          <div className="p-3 text-slate-500 font-sans text-xs">Aucun client trouvé</div>
                        ) : (
                          filteredClientsForDropdown.map(c => {
                            const labelStr = `${c.denomination} (${c.siret || c.id})`;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={() => {
                                  handleClientSelect(c.id);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-[#ffecf8] transition-colors font-semibold border-0 cursor-pointer"
                              >
                                {labelStr}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nom et prenom */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Contact.</label>
                    <input
                      type="text"
                      value={nomPrenomSite}
                      onChange={(e) => setNomPrenomSite(e.target.value)}
                      placeholder="Entrez un nom et prénom."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Telephone portable */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Téléphone du contact.</label>
                    <input
                      type="text"
                      value={telephoneSite}
                      onChange={(e) => setTelephoneSite(e.target.value)}
                      placeholder="Entrez un numéro."
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Email du contact.</label>
                    <input
                      type="email"
                      value={emailSite}
                      onChange={(e) => setEmailSite(e.target.value)}
                      placeholder="Entrez un email."
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Contrat en cours */}
                  <div className="space-y-1 md:w-1/3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Contrat en cours.</label>
                    <div className="flex items-center space-x-4 py-1">
                      <CustomPinkRadio
                        value="Oui"
                        currentValue={contrat}
                        onChange={(val) => setContrat(val as 'Oui' | 'Non')}
                        label="Oui"
                      />
                      <CustomPinkRadio
                        value="Non"
                        currentValue={contrat}
                        onChange={(val) => setContrat(val as 'Oui' | 'Non')}
                        label="Non"
                      />
                    </div>
                  </div>

                  {/* Titre du contrat */}
                  <div className="space-y-1 flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Titre du contrat.</label>
                    <input
                      type="text"
                      value={nomContrat}
                      onChange={(e) => setNomContrat(e.target.value)}
                      placeholder=""
                      disabled={contrat === 'Non'}
                    />
                  </div>

                  {/* Reference contrat */}
                  <div className="space-y-1 flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Référence du contrat.</label>
                    <input
                      type="text"
                      value={referenceContrat}
                      onChange={(e) => setReferenceContrat(e.target.value)}
                      placeholder=""
                      disabled={contrat === 'Non'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Début contrat */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Début du contrat.</label>
                    <input
                      type="date"
                      value={debutContrat}
                      onChange={(e) => setDebutContrat(e.target.value)}
                      disabled={contrat === 'Non'}
                    />
                  </div>

                  {/* Fin contrat */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Expiration du contrat.</label>
                    <input
                      type="date"
                      value={finContrat}
                      onChange={(e) => setFinContrat(e.target.value)}
                      disabled={contrat === 'Non'}
                    />
                  </div>
                </div>

              </div>

              {/* SECTION 2 - LOCALISATION */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderTop: 'none',
                  borderRadius: '0px',
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
                    2 — Localisation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Numéro et voie */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Numéro et voie.</label>
                    <input
                      type="text"
                      value={numeroVoie}
                      onChange={(e) => setNumeroVoie(e.target.value)}
                      placeholder="Entrez un numéro et une rue."
                    />
                  </div>

                  {/* Ville */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Ville.</label>
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      placeholder="Entrez une ville."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Code postal */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Code postal.</label>
                    <input
                      type="text"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                      placeholder="Entrez un code postal."
                    />
                  </div>

                  {/* Région */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Région.</label>
                    <select value={region} onChange={(e) => setRegion(e.target.value)}>
                      <option value="">Sélectionner une région...</option>
                      <option value="Île-de-France">Île-de-France</option>
                      <option value="Provence-Alpes-Côte d'Azur">Provence-Alpes-Côte d'Azur</option>
                      <option value="Auvergne-Rhône-Alpes">Auvergne-Rhône-Alpes</option>
                      <option value="Nouvelle-Aquitaine">Nouvelle-Aquitaine</option>
                      <option value="Occitanie">Occitanie</option>
                      <option value="Hauts-de-France">Hauts-de-France</option>
                      <option value="Grand Est">Grand Est</option>
                      <option value="Pays de la Loire">Pays de la Loire</option>
                      <option value="Bretagne">Bretagne</option>
                      <option value="Normandie">Normandie</option>
                      <option value="Bourgogne-Franche-Comté">Bourgogne-Franche-Comté</option>
                      <option value="Centre-Val de Loire">Centre-Val de Loire</option>
                      <option value="Corse">Corse</option>
                    </select>
                  </div>

                  {/* Pays */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Pays.</label>
                    <select
                      value={pays}
                      onChange={(e) => setPays(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-semibold"
                    >
                      <option value="France">France</option>
                      <option value="Espagne">Espagne</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Suisse">Suisse</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Belgique">Belgique</option>
                      <option value="Allemagne">Allemagne</option>
                      <option value="Pays-Bas">Pays-Bas</option>
                      <option value="Royaume-Uni">Royaume-Uni</option>
                      <option value="Irlande">Irlande</option>
                      <option value="Suède">Suède</option>
                      <option value="Pologne">Pologne</option>
                      <option value="Tchéquie">Tchéquie</option>
                      <option value="Autriche">Autriche</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Latitude */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Latitude.</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder=""
                    />
                  </div>

                  {/* Longitude */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Longitude.</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder=""
                    />
                  </div>
                </div>

                {/* Aide d'accès */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Aide d’accès.</label>
                  <textarea
                    value={aideAcces}
                    onChange={(e) => setAideAcces(e.target.value)}
                    placeholder="Entrez un commentaire."
                    rows={2}
                  />
                </div>

                {/* Localisation radio switches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Accès permanent.</label>
                    <div className="flex space-x-3">
                      <CustomPinkRadio value="Oui" currentValue={accesPermanent} onChange={(v) => setAccesPermanent(v as any)} label="Oui" />
                      <CustomPinkRadio value="Non" currentValue={accesPermanent} onChange={(v) => setAccesPermanent(v as any)} label="Non" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Accès jours ouvrés.</label>
                    <div className="flex space-x-3">
                      <CustomPinkRadio value="Oui" currentValue={accesJoursOuvres} onChange={(v) => setAccesJoursOuvres(v as any)} label="Oui" />
                      <CustomPinkRadio value="Non" currentValue={accesJoursOuvres} onChange={(v) => setAccesJoursOuvres(v as any)} label="Non" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Accès week-end.</label>
                    <div className="flex space-x-3">
                      <CustomPinkRadio value="Oui" currentValue={accesWeekend} onChange={(v) => setAccesWeekend(v as any)} label="Oui" />
                      <CustomPinkRadio value="Non" currentValue={accesWeekend} onChange={(v) => setAccesWeekend(v as any)} label="Non" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Installé en extérieur.</label>
                    <div className="flex space-x-3">
                      <CustomPinkRadio value="Oui" currentValue={installeExterieur} onChange={(v) => setInstalleExterieur(v as any)} label="Oui" />
                      <CustomPinkRadio value="Non" currentValue={installeExterieur} onChange={(v) => setInstalleExterieur(v as any)} label="Non" />
                    </div>
                  </div>
                </div>

              </div>

              {/* SECTION 3 - DATES */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderTop: 'none',
                  borderRadius: '0px',
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
                    3 — Dates
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Expiration de garantie.</label>
                    <input type="date" value={expirationGarantie} onChange={(e) => setExpirationGarantie(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Date de fabrication.</label>
                    <input type="date" value={fabrication} onChange={(e) => setFabrication(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Mise en service.</label>
                    <input type="date" value={miseEnService} onChange={(e) => setMiseEnService(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Dernière maintenance.</label>
                    <input type="date" value={derniereMaintenance} onChange={(e) => handleDerniereMaintenanceChange(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Sortie d'usine.</label>
                    <input type="date" value={sortieUsine} onChange={(e) => setSortieUsine(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Prochaine maintenance.</label>
                    <input type="date" value={prochaineMaintenance} onChange={(e) => setProchaineMaintenance(e.target.value)} />
                  </div>
                </div>

              </div>

              {/* SECTION 4 - CATÉGORIE D'ÉQUIPEMENT */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderTop: 'none',
                  borderRadius: '0px',
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
                    4 — Catégorie et identifiant
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sélection de Catégorie */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Sélection d'une catégorie *</label>
                    <select 
                      value={categorie} 
                      onChange={(e) => {
                        setCategorie(e.target.value);
                        setSpecifiques({}); // Reset fields on category switch
                      }}
                    >
                      <option value="Extincteur">Extincteur</option>
                      <option value="Boucle d'induction magnétique portable (BIMP)">Boucle d'induction magnétique portable (BIMP)</option>
                      <option value="Purificateur d’air">Purificateur d’air</option>
                      <option value="Signalisation">Signalisation</option>
                      <option value="Éclairage de secours">Éclairage de secours</option>
                      <option value="Systèmes hydrants">Systèmes hydrants</option>
                      <option value="Détecteur de fumée">Détecteur de fumée</option>
                      <option value="Détection incendie (SSI)">Détection incendie (SSI)</option>
                      <option value="Désenfumage">Désenfumage</option>
                    </select>
                  </div>

                  {/* Identifiant */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Identifiant unique.</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        value={identifiant} 
                        readOnly 
                        className="bg-slate-50 border border-slate-200 text-slate-600 font-mono font-semibold cursor-not-allowed flex-1 rounded p-2 focus:outline-none"
                        style={{
                          fontSize: '15.5px'
                        }}
                      />
                      {!editingItem && (
                        <button
                          type="button"
                          onClick={reRollIdentifiant}
                          title="Générer un code aléatoire libre"
                          style={rowActionButton18Style}
                          className="shrink-0 font-sans"
                        >
                          Générer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* SECTION 5 - CHAMPS SPÉCIFIQUES PROFESSIONNELS DYNAMIQUES */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderTop: 'none',
                  borderRadius: '0px 0px 18px 18px',
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
                    5 — Caractéristiques techniques : {categorie}
                  </span>
                </div>

                <div className="pt-2">
                  
                  {/* 1. EXTINCTEUR */}
                  {categorie === 'Extincteur' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Sélectionner le type d'agent extincteur</label>
                          <select 
                            value={specifiques.agentExtincteur || 'Eau pulvérisée'} 
                            onChange={(e) => handleSpecifiqueChange('agentExtincteur', e.target.value)}
                          >
                            <option value="Eau pulvérisée">Eau pulvérisée</option>
                            <option value="CO2">CO2</option>
                            <option value="Poudre">Poudre</option>
                            <option value="Mousse">Mousse</option>
                            <option value="Unique">Unique</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Indiquer la capacité de l'appareil</label>
                          <input 
                            type="text" 
                            value={specifiques.capacite || ''} 
                            placeholder="Ex: 6 Litres ou 2 kg" 
                            onChange={(e) => handleSpecifiqueChange('capacite', e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Vérifier la pression ou la masse</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Conforme" currentValue={specifiques.pressionConforme || 'Conforme'} onChange={(v) => handleSpecifiqueChange('pressionConforme', v)} label="Conforme" />
                            <CustomPinkRadio value="Non conforme" currentValue={specifiques.pressionConforme || 'Conforme'} onChange={(v) => handleSpecifiqueChange('pressionConforme', v)} label="Non conforme" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Contrôler la présence du plomb et de la goupille</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Présents / Intacts" currentValue={specifiques.plombGoupille || 'Présents / Intacts'} onChange={(v) => handleSpecifiqueChange('plombGoupille', v)} label="Présents" />
                            <CustomPinkRadio value="Absents / Brisés" currentValue={specifiques.plombGoupille || 'Présents / Intacts'} onChange={(v) => handleSpecifiqueChange('plombGoupille', v)} label="Absents" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. BIMP */}
                  {categorie === "Boucle d'induction magnétique portable (BIMP)" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Vérifier le niveau de charge de la batterie</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Correct" currentValue={specifiques.chargeBatterie || 'Correct'} onChange={(v) => handleSpecifiqueChange('chargeBatterie', v)} label="Correct" />
                            <CustomPinkRadio value="Insuffisant" currentValue={specifiques.chargeBatterie || 'Correct'} onChange={(v) => handleSpecifiqueChange('chargeBatterie', v)} label="Insuffisant" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Valider la qualité du test audio</label>
                          <select 
                            value={specifiques.testAudio || 'Excellente'} 
                            onChange={(e) => handleSpecifiqueChange('testAudio', e.target.value)}
                          >
                            <option value="Excellente">Excellente</option>
                            <option value="Distorsion légère">Distorsion légère</option>
                            <option value="Grésillements importants">Grésillements importants</option>
                            <option value="Aucun son">Aucun son</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Inspecter l'état de la connectique et du micro</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Bon état" currentValue={specifiques.connectiqueMicro || 'Bon état'} onChange={(v) => handleSpecifiqueChange('connectiqueMicro', v)} label="Bon état" />
                            <CustomPinkRadio value="Dégradé / À remplacer" currentValue={specifiques.connectiqueMicro || 'Bon état'} onChange={(v) => handleSpecifiqueChange('connectiqueMicro', v)} label="Dégradé / À remplacer" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Confirmer la présence du pictogramme obligatoire</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Oui" currentValue={specifiques.pictogramme || 'Oui'} onChange={(v) => handleSpecifiqueChange('pictogramme', v)} label="Oui" />
                            <CustomPinkRadio value="Non" currentValue={specifiques.pictogramme || 'Oui'} onChange={(v) => handleSpecifiqueChange('pictogramme', v)} label="Non" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. PURIFICATEUR D'AIR */}
                  {categorie === 'Purificateur d’air' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Spécifier le type de filtre à remplacer</label>
                          <select 
                            value={specifiques.filtreRemplacer || 'Aucun'} 
                            onChange={(e) => handleSpecifiqueChange('filtreRemplacer', e.target.value)}
                          >
                            <option value="Aucun">Aucun</option>
                            <option value="Pré-filtre">Pré-filtre</option>
                            <option value="HEPA H13">HEPA H13</option>
                            <option value="HEPA H14">HEPA H14</option>
                            <option value="Charbon actif">Charbon actif</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Saisir le pourcentage d'usure des filtres</label>
                          <input 
                            type="text" 
                            value={specifiques.usureFiltre || ''} 
                            placeholder="Ex: 45%" 
                            onChange={(e) => handleSpecifiqueChange('usureFiltre', e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Tester le changement de vitesse du flux d'air</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Fonctionnel" currentValue={specifiques.fluxAir || 'Fonctionnel'} onChange={(v) => handleSpecifiqueChange('fluxAir', v)} label="Fonctionnel" />
                            <CustomPinkRadio value="Défectueux" currentValue={specifiques.fluxAir || 'Fonctionnel'} onChange={(v) => handleSpecifiqueChange('fluxAir', v)} label="Défectueux" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Vérifier l'état de propreté des capteurs</label>
                          <select 
                            value={specifiques.propreteCapteurs || 'Propre'} 
                            onChange={(e) => handleSpecifiqueChange('propreteCapteurs', e.target.value)}
                          >
                            <option value="Propre">Propre</option>
                            <option value="Encrassé">Encrassé</option>
                            <option value="À nettoyer d'urgence">À nettoyer d'urgence</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. SIGNALISATION */}
                  {categorie === 'Signalisation' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Identifier la nature du panneau</label>
                          <select 
                            value={specifiques.naturePanneau || 'Évacuation'} 
                            onChange={(e) => handleSpecifiqueChange('naturePanneau', e.target.value)}
                          >
                            <option value="Évacuation">Évacuation</option>
                            <option value="Danger / Interdiction">Danger / Interdiction</option>
                            <option value="Moyens de secours">Moyens de secours</option>
                            <option value="Sécurité incendie">Sécurité incendie</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Confirmer la parfaite visibilité du panneau</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Visible" currentValue={specifiques.visibilite || 'Visible'} onChange={(v) => handleSpecifiqueChange('visibilite', v)} label="Visible" />
                            <CustomPinkRadio value="Masqué / Obstacle" currentValue={specifiques.visibilite || 'Visible'} onChange={(v) => handleSpecifiqueChange('visibilite', v)} label="Masqué / Obstacle" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Vérifier la solidité de la fixation</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Correcte" currentValue={specifiques.solidiateFixation || 'Correcte'} onChange={(v) => handleSpecifiqueChange('solidiateFixation', v)} label="Correcte" />
                            <CustomPinkRadio value="Instable / À refaire" currentValue={specifiques.solidiateFixation || 'Correcte'} onChange={(v) => handleSpecifiqueChange('solidiateFixation', v)} label="Instable / À refaire" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Valider la cohérence du fléchage d'évacuation</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Cohérent" currentValue={specifiques.coherenceFleche || 'Cohérent'} onChange={(v) => handleSpecifiqueChange('coherenceFleche', v)} label="Cohérent" />
                            <CustomPinkRadio value="Incorrect" currentValue={specifiques.coherenceFleche || 'Cohérent'} onChange={(v) => handleSpecifiqueChange('coherenceFleche', v)} label="Incorrect" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. ÉCLAIRAGE DE SECOURS */}
                  {categorie === 'Éclairage de secours' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label>Déterminer le type de bloc autonome</label>
                          <select 
                            value={specifiques.blocType || 'BAES Évacuation'} 
                            onChange={(e) => handleSpecifiqueChange('blocType', e.target.value)}
                          >
                            <option value="BAES Évacuation">BAES Évacuation</option>
                            <option value="BAES Ambiance">BAES Ambiance</option>
                            <option value="BAEH Habitation">BAEH Habitation</option>
                            <option value="Bloc bi-fonction">Bloc bi-fonction</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Préciser la technologie du bloc</label>
                          <select 
                            value={specifiques.techBloc || 'SATI (Auto-testable)'} 
                            onChange={(e) => handleSpecifiqueChange('techBloc', e.target.value)}
                          >
                            <option value="SATI (Auto-testable)">SATI (Auto-testable)</option>
                            <option value="Standard (Télécommandable)">Standard (Télécommandable)</option>
                            <option value="Connecté sans fil">Connecté sans fil</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Indiquer la durée d'autonomie constatée</label>
                          <input 
                            type="text" 
                            value={specifiques.durreAutonomie || ''} 
                            placeholder="Ex: 1 heure 15 minutes" 
                            onChange={(e) => handleSpecifiqueChange('durreAutonomie', e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Valider le test de commutation automatique</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Réussi" currentValue={specifiques.testCommutation || 'Réussi'} onChange={(v) => handleSpecifiqueChange('testCommutation', v)} label="Réussi" />
                            <CustomPinkRadio value="Échoué" currentValue={specifiques.testCommutation || 'Réussi'} onChange={(v) => handleSpecifiqueChange('testCommutation', v)} label="Échoué" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Vérifier l'état des ampoules ou des LED</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Opérationnelles" currentValue={specifiques.etatAmpoule || 'Opérationnelles'} onChange={(v) => handleSpecifiqueChange('etatAmpoule', v)} label="Opérationnelles" />
                            <CustomPinkRadio value="Défectueuses" currentValue={specifiques.etatAmpoule || 'Opérationnelles'} onChange={(v) => handleSpecifiqueChange('etatAmpoule', v)} label="Défectueuses" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. SYSTÈMES HYDRANTS */}
                  {categorie === 'Systèmes hydrants' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label>Sélectionner le type d'appareil hydrant</label>
                          <select 
                            value={specifiques.typeHydrant || 'RIA DN25'} 
                            onChange={(e) => handleSpecifiqueChange('typeHydrant', e.target.value)}
                          >
                            <option value="RIA DN25">RIA DN25</option>
                            <option value="RIA DN33">RIA DN33</option>
                            <option value="Poteau d'incendie">Poteau d'incendie</option>
                            <option value="Bouche d'incendie">Bouche d'incendie</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Pression hydrostatique mesurée (bars)</label>
                          <input 
                            type="text" 
                            value={specifiques.pressionEau || ''} 
                            placeholder="Ex: 3.5 bars" 
                            onChange={(e) => handleSpecifiqueChange('pressionEau', e.target.value)} 
                          />
                        </div>

                        <div className="space-y-1">
                          <label>Débit d'eau obtenu (L/min)</label>
                          <input 
                            type="text" 
                            value={specifiques.debitEau || ''} 
                            placeholder="Ex: 150 L/min" 
                            onChange={(e) => handleSpecifiqueChange('debitEau', e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Contrôler l'état visuel du tuyau et de la lance</label>
                          <select 
                            value={specifiques.etatTuyau || 'Parfait état'} 
                            onChange={(e) => handleSpecifiqueChange('etatTuyau', e.target.value)}
                          >
                            <option value="Parfait état">Parfait état</option>
                            <option value="Légère usure sans fuite">Légère usure sans fuite</option>
                            <option value="Craquelé / À remplacer">Craquelé / À remplacer</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Confirmer l'accessibilité permanente de la zone</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Dégagée" currentValue={specifiques.accessibilite || 'Dégagée'} onChange={(v) => handleSpecifiqueChange('accessibilite', v)} label="Dégagée" />
                            <CustomPinkRadio value="Encombrée" currentValue={specifiques.accessibilite || 'Dégagée'} onChange={(v) => handleSpecifiqueChange('accessibilite', v)} label="Encombrée" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. DÉTECTEUR DE FUMÉE */}
                  {categorie === 'Détecteur de fumée' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Renseigner la date limite de remplacement</label>
                          <input 
                            type="text" 
                            value={specifiques.remplacementMax || ''} 
                            placeholder="Ex: Décembre 2031" 
                            onChange={(e) => handleSpecifiqueChange('remplacementMax', e.target.value)} 
                          />
                        </div>

                        <div className="space-y-1">
                          <label>Valider le test de déclenchement à l'aérosol</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Positif" currentValue={specifiques.declenchementAerosol || 'Positif'} onChange={(v) => handleSpecifiqueChange('declenchementAerosol', v)} label="Positif" />
                            <CustomPinkRadio value="Négatif" currentValue={specifiques.declenchementAerosol || 'Positif'} onChange={(v) => handleSpecifiqueChange('declenchementAerosol', v)} label="Négatif" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Vérifier l'absence de signal de pile faible</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Aucun signal" currentValue={specifiques.testPileFaible || 'Aucun signal'} onChange={(v) => handleSpecifiqueChange('testPileFaible', v)} label="Aucun signal" />
                            <CustomPinkRadio value="Signal actif / Alerte" currentValue={specifiques.testPileFaible || 'Aucun signal'} onChange={(v) => handleSpecifiqueChange('testPileFaible', v)} label="Signal actif" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Contrôler l'empoussièrement de la chambre de mesure</label>
                          <select 
                            value={specifiques.propreteChambre || 'Propre'} 
                            onChange={(e) => handleSpecifiqueChange('propreteChambre', e.target.value)}
                          >
                            <option value="Propre">Propre</option>
                            <option value="Faiblement empoussiérée">Faiblement empoussiérée</option>
                            <option value="Très encrassée / À nettoyer">Très encrassée / À nettoyer</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 8. DETECTION INCENDIE (SSI) */}
                  {categorie === 'Détection incendie (SSI)' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label>Sélectionner le type de centrale inspectée</label>
                          <select 
                            value={specifiques.stextContent || 'ECS (Détection)'} 
                            onChange={(e) => handleSpecifiqueChange('stextContent', e.target.value)}
                          >
                            <option value="ECS (Détection)">ECS (Détection)</option>
                            <option value="CMSI (Mise en sécurité)">CMSI (Mise en sécurité)</option>
                            <option value="SMSI (Système intégré)">SMSI (Système intégré)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>Noter la tension des batteries de secours</label>
                          <input 
                            type="text" 
                            value={specifiques.tensionBat || ''} 
                            placeholder="Ex: 24.2 Volts" 
                            onChange={(e) => handleSpecifiqueChange('tensionBat', e.target.value)} 
                          />
                        </div>

                        <div className="space-y-1">
                          <label>Nombre de défauts présents à l'historique</label>
                          <input 
                            type="text" 
                            value={specifiques.historiqueDefauts || ''} 
                            placeholder="Ex: 0 défaut" 
                            onChange={(e) => handleSpecifiqueChange('historiqueDefauts', e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Vérifier l'absence de voyant de dérangement</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Aucun défaut" currentValue={specifiques.absenceVoyant || 'Aucun défaut'} onChange={(v) => handleSpecifiqueChange('absenceVoyant', v)} label="Aucun défaut" />
                            <CustomPinkRadio value="Dérangement présent" currentValue={specifiques.absenceVoyant || 'Aucun défaut'} onChange={(v) => handleSpecifiqueChange('absenceVoyant', v)} label="Dérangement présent" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Valider le test de transmission de l'alarme</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Transmis" currentValue={specifiques.transmissionAlarme || 'Transmis'} onChange={(v) => handleSpecifiqueChange('transmissionAlarme', v)} label="Transmis" />
                            <CustomPinkRadio value="Non transmis / Échec" currentValue={specifiques.transmissionAlarme || 'Transmis'} onChange={(v) => handleSpecifiqueChange('transmissionAlarme', v)} label="Échec" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 9. DÉSENFUMAGE */}
                  {categorie === 'Désenfumage' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Identifier le mode de télécommande</label>
                          <select 
                            value={specifiques.telecommande || 'Pneumatique (CO2)'} 
                            onChange={(e) => handleSpecifiqueChange('telecommande', e.target.value)}
                          >
                            <option value="Pneumatique (CO2)">Pneumatique (CO2)</option>
                            <option value="Électrique (24V/48V)">Électrique (24V/48V)</option>
                            <option value="Mécanique (Câble)">Mécanique (Câble)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label>État des cartouches de gaz ou des fusibles</label>
                          <select 
                            value={specifiques.cartouchesGaz || 'Intactes'} 
                            onChange={(e) => handleSpecifiqueChange('cartouchesGaz', e.target.value)}
                          >
                            <option value="Intactes">Intactes</option>
                            <option value="Percées / À remplacer">Percées / À remplacer</option>
                            <option value="Non applicable">Non applicable</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Confirmer l'ouverture complète de l'exutoire</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Ouverture totale" currentValue={specifiques.exutoireOuverture || 'Ouverture totale'} onChange={(v) => handleSpecifiqueChange('exutoireOuverture', v)} label="Ouverture totale" />
                            <CustomPinkRadio value="Ouverture partielle / Blocage" currentValue={specifiques.exutoireOuverture || 'Ouverture totale'} onChange={(v) => handleSpecifiqueChange('exutoireOuverture', v)} label="Ouverture partielle" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label>Valider la facilité de réarmement du système</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Réarmé avec succès" currentValue={specifiques.rearmement || 'Réarmé avec succès'} onChange={(v) => handleSpecifiqueChange('rearmement', v)} label="Réussi" />
                            <CustomPinkRadio value="Blocage au réarmement" currentValue={specifiques.rearmement || 'Réarmé avec succès'} onChange={(v) => handleSpecifiqueChange('rearmement', v)} label="Blocage" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label>Inspecter l'état des câbles et des poulies de liaison</label>
                          <div className="flex space-x-4 py-1">
                            <CustomPinkRadio value="Bon état" currentValue={specifiques.etatPoulies || 'Bon état'} onChange={(v) => handleSpecifiqueChange('etatPoulies', v)} label="Bon état" />
                            <CustomPinkRadio value="Usure prononcée / À remplacer" currentValue={specifiques.etatPoulies || 'Bon état'} onChange={(v) => handleSpecifiqueChange('etatPoulies', v)} label="Usure prononcée" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commentaire (One line - Always present in tech Section 5) */}
                  <div className="space-y-1 mt-4 pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">Commentaire de visite technique (Une seule ligne).</label>
                    <input
                      type="text"
                      value={specifiques.commentaire || ''}
                      placeholder="Commentaire de terrain (RAS, etc.)"
                      onChange={(e) => handleSpecifiqueChange('commentaire', e.target.value)}
                    />
                  </div>

                </div>
              </div>

              </div>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
