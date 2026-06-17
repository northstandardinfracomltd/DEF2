import React, { useState, useRef, useEffect } from 'react';
import { CompanyInfo, Member, SupportTicket, Defibrillateur, Variable, Client, StockRecord } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { REGIONS_FRANCAISES } from '../utils';

interface GmaoCorrectionFormProps {
  report?: any;
  isNew?: boolean;
  onSave: (updatedReport: any) => void;
  onCancel: () => void;
  clients: Client[];
  variables: Variable[];
  defibrillateurs: Defibrillateur[];
  initialDefibId?: string;
  stocks?: StockRecord[];
  members?: Member[];
}

const DEFAULT_DEFIB: Defibrillateur = {
  id: '',
  identifiant: '',
  numeroSerie: '',
  commentaire: '',
  modeleId: '',
  clientId: '',
  nomPrenomSite: '',
  telephoneSite: '',
  emailSite: '',
  contrat: 'Non',
  nomContrat: '',
  referenceContrat: '',
  debutContrat: '',
  finContrat: '',
  modeleCoffretId: '',
  numeroLotCoffret: '',
  commentaireCoffret: '',
  numVoie: '',
  ville: '',
  cp: '',
  region: 'Île-de-France',
  pays: 'France',
  latitude: '48.8566',
  longitude: '2.3522',
  commentaireAdresse: '',
  acces247: false,
  accesSemaine: false,
  accesWeekend: false,
  exterieur: false,
  finGarantie: '',
  fabrication: '',
  miseEnService: '',
  derniereMaintenance: '',
  sortieFabricant: '',
  modeleElectrodeAId: '',
  lotElectrodeA: '',
  insertionElectrodeA: '',
  peremptionElectrodeA: '',
  livraisonElectrodeA: '',
  situationElectrodeA: 'Vert',
  commentaireElectrodeA: '',
  peremptionSecoursElectrodeA: '',
  modeleElectrodePId: '',
  lotElectrodeP: '',
  insertionElectrodeP: '',
  peremptionElectrodeP: '',
  livraisonElectrodeP: '',
  situationElectrodeP: 'Vert',
  commentaireElectrodeP: '',
  peremptionSecoursElectrodeP: '',
  modeleBatterieId: '',
  lotBatterie: '',
  insertionBatterie: '',
  peremptionBatterie: '',
  livraisonBatterie: '',
  situationBatterie: 'Vert',
  pourcentageBatterie: '100',
  commentaireBatterie: '',
  loue: 'Non',
  prete: 'Non',
  stocke: 'Non',
  archive: 'Non',
  conforme: 'Oui',
  sousTraitance: 'Non',
  fsmAutorise: 'Non',
  victimeSurvie: 'Non',
  victimeSansSurvie: 'Non',
  ageVictime: '',
  commentaireCampagneRappel: '',
  rappelMensuelAuto: 'Non'
};

const rowActionButtonStyle: React.CSSProperties = {
  backgroundColor: '#000',
  color: '#fff',
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
  fontSize: '18px',
  padding: '9px 19px',
};

const registerButtonStyle: React.CSSProperties = {
  ...rowActionButton18Style,
  backgroundColor: 'rgb(53, 86, 236)',
  color: '#ffffff',
  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
};

// Custom Radio Component with exact design styling (representing white gap, rose border and pink dot)
function FormRadio({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center cursor-pointer gap-2 select-none justify-start text-left"
      style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}
    >
      <span 
        className="rounded-full flex items-center justify-center transition-all bg-white"
        style={{
          border: checked ? '2.5px solid #fe4eba' : '2.5px solid #cbd5e1',
          width: '20px',
          height: '20px',
          minWidth: '20px',
          minHeight: '20px',
          backgroundColor: '#ffffff'
        }}
      >
        {checked && (
          <span className="rounded-full bg-[#fe4eba]" style={{ width: '9px', height: '9px' }} />
        )}
      </span>
      <span className="text-[15px] font-semibold text-black">{label}</span>
    </button>
  );
}

export default function GmaoCorrectionForm({
  report,
  isNew = false,
  onSave,
  onCancel,
  clients,
  variables,
  defibrillateurs,
  initialDefibId,
  stocks = [],
  members = []
}: GmaoCorrectionFormProps) {

  const availableMembers = React.useMemo<Member[]>(() => {
    let list: Member[] = [];
    if (members && members.length > 0) {
      list = members;
    } else {
      try {
        const keys = Object.keys(localStorage);
        const membersKey = keys.find(k => k.startsWith('defib_') && k.endsWith('_members'));
        if (membersKey) {
          const saved = localStorage.getItem(membersKey);
          if (saved) list = JSON.parse(saved);
        }
      } catch (e) {}
    }
    if (!list || list.length === 0) {
      list = [
        { name: 'Ronan Roesch', role: 'Propriétaire / Admin', email: 'roesch.ronan@gmail.com', status: 'Actif', lastActive: 'En ligne', pin: '1234' },
        { name: 'Technicien Ouest', role: 'Maintenance Terrain', email: 'tech.ouest@defibeo.com', status: 'Actif', lastActive: 'Il y a 10 min', pin: '4321' },
        { name: 'Secrétariat Clientèle', role: 'Support & Contrats', email: 'support@defibeo.com', status: 'Inactif', lastActive: 'Hier', pin: '0000' },
      ];
    }
    return list.filter(m => {
      const roleLower = (m.role || '').toLowerCase();
      return (
        roleLower.includes('tech') ||
        roleLower.includes('maintenance') ||
        roleLower.includes('terrain')
      );
    });
  }, [members]);

  // Auto-determination of selected DAE
  const [selectedDefibId, setSelectedDefibId] = useState(() => {
    return report?.defibId || initialDefibId || '';
  });

  const origDefib = defibrillateurs.find(
    d => d.id === selectedDefibId || d.identifiant === selectedDefibId
  );

  // Snapshot initialization
  const [snapshot, setSnapshot] = useState<Defibrillateur>(() => {
    return {
      ...DEFAULT_DEFIB,
      ...(origDefib ? origDefib : {}),
      ...(report?.defibSnapshot ? report.defibSnapshot : {})
    };
  });

  // Report fields
  const [reportTitle, setReportTitle] = useState(report?.title || 'RAPPORT TECHNIQUE DÉFIBRILLATEUR');
  const [techName, setTechName] = useState(() => {
    if (report?.techName) return report.techName;
    try {
      const activeTechRaw = localStorage.getItem('defib_active_tech_session');
      if (activeTechRaw) {
        const activeTech = JSON.parse(activeTechRaw);
        if (activeTech && activeTech.name) return activeTech.name;
      }
    } catch (e) {}
    return 'Technicien connecté';
  });
  const [interventionDate, setInterventionDate] = useState(report?.date || '');
  const [missionSite, setMissionSite] = useState<'DÉPLACEMENT' | 'ATELIER SAV'>(
    report?.siteMission === 'ATELIER SAV' ? 'ATELIER SAV' : 'DÉPLACEMENT'
  );
  const [photoUrl, setPhotoUrl] = useState(report?.photoUrl || '');
  const [errorText, setErrorText] = useState('');

  // S3 Alarme & Armoire
  const [alarme, setAlarme] = useState<'Oui' | 'Non'>(report?.alarme || 'Non');
  const [armoireConnectee, setArmoireConnectee] = useState<'Oui' | 'Non'>(report?.armoireConnectee || 'Non');
  const [dispositifHandicap, setDispositifHandicap] = useState<'Oui' | 'Non'>(report?.dispositifHandicap || 'Non');
  const [signaletiqueConforme, setSignaletiqueConforme] = useState<'Oui' | 'Non'>(report?.signaletiqueConforme || 'Non');

  // S6 Electrode A
  const [electrodeARemplacee, setElectrodeARemplacee] = useState<'Oui' | 'Non'>(report?.electrodeARemplacee || 'Non');
  const [selectionElectrodeARemplacee, setSelectionElectrodeARemplacee] = useState<string>(report?.selectionElectrodeARemplacee || '');
  const [electrodeAConformeSante, setElectrodeAConformeSante] = useState<'Oui' | 'Non'>(report?.electrodeAConformeSante || 'Oui');

  // S7 Electrode P
  const [electrodePRemplacee, setElectrodePRemplacee] = useState<'Oui' | 'Non'>(report?.electrodePRemplacee || 'Non');
  const [selectionElectrodePRemplacee, setSelectionElectrodePRemplacee] = useState<string>(report?.selectionElectrodePRemplacee || '');
  const [electrodePConformeSante, setElectrodePConformeSante] = useState<'Oui' | 'Non'>(report?.electrodePConformeSante || 'Oui');

  // S8 Batterie
  const [batterieRemplacee, setBatterieRemplacee] = useState<'Oui' | 'Non'>(report?.batterieRemplacee || 'Non');
  const [selectionBatterieRemplacee, setSelectionBatterieRemplacee] = useState<string>(report?.selectionBatterieRemplacee || '');
  const [batterieConformeSante, setBatterieConformeSante] = useState<'Oui' | 'Non'>(
    report?.batterieConformeSante || (snapshot?.situationBatterie === 'Vert' ? 'Oui' : 'Non') || 'Oui'
  );

  // S9 Vérifications techniques
  const [techAccessibiliteConforme, setTechAccessibiliteConforme] = useState<'Oui' | 'Non'>(report?.techAccessibiliteConforme || 'Oui');
  const [techEtatFonctionnelConforme, setTechEtatFonctionnelConforme] = useState<'Oui' | 'Non'>(report?.techEtatFonctionnelConforme || 'Oui');
  const [techVoyantConforme, setTechVoyantConforme] = useState<'Oui' | 'Non'>(report?.techVoyantConforme || 'Oui');
  const [techMessageNumeroConforme, setTechMessageNumeroConforme] = useState<'Oui' | 'Non'>(report?.techMessageNumeroConforme || 'Oui');
  const [techGuidesVocauxConformes, setTechGuidesVocauxConformes] = useState<'Oui' | 'Non'>(report?.techGuidesVocauxConformes || 'Oui');
  const [techNettoyage, setTechNettoyage] = useState<'Oui' | 'Non'>(report?.techNettoyage || 'Oui');
  const [techBranchementElectrodesConforme, setTechBranchementElectrodesConforme] = useState<'Oui' | 'Non'>(report?.techBranchementElectrodesConforme || 'Oui');
  const [techDelivranceChocConforme, setTechDelivranceChocConforme] = useState<'Oui' | 'Non'>(report?.techDelivranceChocConforme || 'Oui');
  const [techResultatJoulesElectrodeA, setTechResultatJoulesElectrodeA] = useState<string>(report?.techResultatJoulesElectrodeA || '');
  const [techResultatJoulesElectrodeA2, setTechResultatJoulesElectrodeA2] = useState<string>(report?.techResultatJoulesElectrodeA2 || '');

  // S10 (n) Vérifications kit de secours
  const [kitTrousseSecoursPresent, setKitTrousseSecoursPresent] = useState<'Oui' | 'Non'>(report?.kitTrousseSecoursPresent || 'Oui');
  const [kitCiseauxPresents, setKitCiseauxPresents] = useState<'Oui' | 'Non'>(report?.kitCiseauxPresents || 'Oui');
  const [kitMasquePresent, setKitMasquePresent] = useState<'Oui' | 'Non'>(report?.kitMasquePresent || 'Oui');
  const [kitServiettesPresentes, setKitServiettesPresentes] = useState<'Oui' | 'Non'>(report?.kitServiettesPresentes || 'Oui');
  const [kitGantsPresents, setKitGantsPresents] = useState<'Oui' | 'Non'>(report?.kitGantsPresents || 'Oui');
  const [kitRasoirPresent, setKitRasoirPresent] = useState<'Oui' | 'Non'>(report?.kitRasoirPresent || 'Oui');
  const [kitSecoursRemplaceOuAjoute, setKitSecoursRemplaceOuAjoute] = useState<'Oui' | 'Non'>(report?.kitSecoursRemplaceOuAjoute || 'Non');
  const [selectionKitSecoursRemplace, setSelectionKitSecoursRemplace] = useState<string>(report?.selectionKitSecoursRemplace || '');
  
  // S11 add-on
  const [fichierDonneesRecupere, setFichierDonneesRecupere] = useState<'Oui' | 'Non'>(report?.fichierDonneesRecupere || 'Non');
  
  const [emettreFactureBrouillon, setEmettreFactureBrouillon] = useState<'Oui' | 'Non'>(report?.emettreFactureBrouillon || 'Non');
  const [serviceEmettreId, setServiceEmettreId] = useState<string>(report?.serviceEmettreId || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isLotScannerOpen, setIsLotScannerOpen] = useState(false);
  const [isSerieScannerOpen, setIsSerieScannerOpen] = useState(false);
  const [isLotAScannerOpen, setIsLotAScannerOpen] = useState(false);
  const [isLotPScannerOpen, setIsLotPScannerOpen] = useState(false);
  const [isLotBatScannerOpen, setIsLotBatScannerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [techSignature, setTechSignature] = useState(report?.techSignature || '');
  const [endTimeStamp, setEndTimeStamp] = useState(report?.endTimeStamp || '');
  const isDrawing = useRef(false);

  useEffect(() => {
    // If we have an existing signature and the canvas is mounted, draw it on the canvas
    if (techSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = techSignature;
      }
    }
  }, [techSignature]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const pos = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventCoords(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setTechSignature(dataUrl);
      
      // Auto-populate Horodatage de fin if empty/not completed
      const nowStr = new Date().toLocaleString('fr-FR');
      setEndTimeStamp(nowStr);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTechSignature('');
  };

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale coordinates accurately if bounding rectangle differs from actual design resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Sync snapshot when searched lookup Changes
  const handleDefibLookupChange = (defibId: string) => {
    setSelectedDefibId(defibId);
    const defib = defibrillateurs.find(d => d.id === defibId);
    if (defib) {
      setSnapshot({
        ...DEFAULT_DEFIB,
        ...defib
      });
    } else {
      setSnapshot(DEFAULT_DEFIB);
    }
  };

  const handleSnapshotChange = (key: keyof Defibrillateur, value: any) => {
    setSnapshot(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 500; // max width/height
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality is perfect and very small
            setPhotoUrl(compressedBase64);
          } else {
            setPhotoUrl(base64Str);
          }
        };
        img.onerror = () => {
          setPhotoUrl(base64Str);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!snapshot.identifiant.trim()) {
      setErrorText("L'identifiant unique du défibrillateur est obligatoire.");
      return;
    }
    if (!snapshot.numeroSerie.trim()) {
      setErrorText("Le numéro de série du défibrillateur est obligatoire.");
      return;
    }
    if (!snapshot.clientId) {
      setErrorText("Veuillez associer un client à l'appareil.");
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const maintDate = interventionDate || todayStr;

    const finalSnapshot = {
      ...snapshot,
      derniereMaintenance: maintDate,
      situationBatterie: (batterieConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge',
      situationElectrodeA: (electrodeAConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge',
      situationElectrodeP: (electrodePConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge'
    };

    // Auto-update replacement parts details in the defibrillator snap on submit
    if (electrodeARemplacee === 'Oui' && selectionElectrodeARemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodeARemplacee);
      if (st) {
        finalSnapshot.modeleElectrodeAId = st.denominationPieceId;
        finalSnapshot.lotElectrodeA = st.id;
        finalSnapshot.insertionElectrodeA = maintDate;
        finalSnapshot.situationElectrodeA = 'Vert';
      }
    }

    if (electrodePRemplacee === 'Oui' && selectionElectrodePRemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodePRemplacee);
      if (st) {
        finalSnapshot.modeleElectrodePId = st.denominationPieceId;
        finalSnapshot.lotElectrodeP = st.id;
        finalSnapshot.insertionElectrodeP = maintDate;
        finalSnapshot.situationElectrodeP = 'Vert';
      }
    }

    if (batterieRemplacee === 'Oui' && selectionBatterieRemplacee) {
      const st = stocks?.find(s => s.id === selectionBatterieRemplacee);
      if (st) {
        finalSnapshot.modeleBatterieId = st.denominationPieceId;
        finalSnapshot.lotBatterie = st.id;
        finalSnapshot.insertionBatterie = maintDate;
        finalSnapshot.pourcentageBatterie = '100';
        finalSnapshot.situationBatterie = 'Vert';
      }
    }

    const savedReportPayload = {
      ...report,
      title: reportTitle,
      techName: techName,
      date: interventionDate || new Date().toLocaleString('fr-FR'),
      defibId: finalSnapshot.id || selectedDefibId,
      defibIdentifiant: finalSnapshot.identifiant.toUpperCase(),
      siteMission: missionSite,
      photoUrl: photoUrl || undefined,
      defibSnapshot: finalSnapshot,
      techSignature: techSignature,
      endTimeStamp: endTimeStamp,
      
      // Section 3 additions
      alarme,
      armoireConnectee,
      dispositifHandicap,
      signaletiqueConforme,

      // Section 6 additions
      electrodeARemplacee,
      selectionElectrodeARemplacee,
      electrodeAConformeSante,

      // Section 7 additions
      electrodePRemplacee,
      selectionElectrodePRemplacee,
      electrodePConformeSante,

      // Section 8 additions
      batterieRemplacee,
      selectionBatterieRemplacee,
      batterieConformeSante,

      // Section 9 : Vérifications techniques
      techAccessibiliteConforme,
      techEtatFonctionnelConforme,
      techVoyantConforme,
      techMessageNumeroConforme,
      techGuidesVocauxConformes,
      techNettoyage,
      techBranchementElectrodesConforme,
      techDelivranceChocConforme,
      techResultatJoulesElectrodeA,
      techResultatJoulesElectrodeA2,

      // n : Vérifications du kit de secours
      kitTrousseSecoursPresent,
      kitCiseauxPresents,
      kitMasquePresent,
      kitServiettesPresentes,
      kitGantsPresents,
      kitRasoirPresent,
      kitSecoursRemplaceOuAjoute,
      selectionKitSecoursRemplace,

      // Section 11 additions
      fichierDonneesRecupere,
      
      // Draft invoice integration
      emettreFactureBrouillon,
      serviceEmettreId
    };

    setIsSaving(true);
    setTimeout(() => {
      onSave(savedReportPayload);
      setIsSaving(false);
    }, 3000);
  };

  return (
    <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto text-black" id="gmao-correction-layout">
      {/* Header section identical in looks to Defibrillateurs with limited width */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '100%', margin: 'auto', padding: '20px' }}
        id="defib-form-header-box"
      >
        <div>
          <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000000', cursor: 'default' }}>
            {isNew || !report ? 'Nouveau Rapport' : 'Correction Document'}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            id="btn-close-gmao-modal"
            style={rowActionButton18Style}
            className="transition-colors cursor-pointer font-sans"
          >
            Fermer
          </button>

          <button
            type="submit"
            disabled={isSaving}
            form="gmao-correction-form"
            id="btn-submit-gmao-form"
            style={{ ...registerButtonStyle, opacity: isSaving ? 0.7 : 1 }}
            className="transition-colors cursor-pointer font-sans"
          >
            {isSaving ? 'Enregistrement de l\'intervention...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {errorText && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium" style={{ maxWidth: '100%', margin: 'auto' }} id="correction-error">
          {errorText}
        </div>
      )}

      {/* Main core form */}
      <form onSubmit={handleSubmit} id="gmao-correction-form" className="space-y-6">
        <style>{`
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]),
          #gmao-correction-form select,
          #gmao-correction-form textarea {
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
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]):hover,
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]):focus,
          #gmao-correction-form select:hover,
          #gmao-correction-form select:focus,
          #gmao-correction-form textarea:hover,
          #gmao-correction-form textarea:focus {
            outline: 2.5px solid #fa53d5 !important;
            outline-offset: 2px !important;
            transition: all 0s !important;
          }
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"])::placeholder,
          #gmao-correction-form textarea::placeholder {
            color: #000000 !important;
            opacity: 1 !important;
            font-weight: 100 !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          }
          #gmao-correction-form input:disabled,
          #gmao-correction-form select:disabled,
          #gmao-correction-form textarea:disabled {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            background-color: #f1f5f9 !important;
            opacity: 0.95 !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
            cursor: not-allowed !important;
          }
          #gmao-correction-form input:disabled:hover,
          #gmao-correction-form input:disabled:focus,
          #gmao-correction-form select:disabled:hover,
          #gmao-correction-form select:disabled:focus,
          #gmao-correction-form textarea:disabled:hover,
          #gmao-correction-form textarea:disabled:focus {
            outline: none !important;
          }
          #gmao-correction-form select {
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            background-image: none !important;
          }
          #gmao-correction-form select option {
            color: #000000 !important;
            background: #ffffff !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          }
          #gmao-correction-form input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            -webkit-appearance: none !important;
            background: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          #gmao-correction-form label,
          #gmao-correction-form .section-title-label,
          #gmao-correction-form span.block.uppercase {
            letter-spacing: normal !important;
            text-transform: none !important;
            font-size: 16px !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          #gmao-correction-form input[type="radio"] {
            appearance: none !important;
            -webkit-appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 50% !important;
            background-color: #ffffff !important;
            outline: none !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
            margin-right: 6px !important;
          }
          #gmao-correction-form input[type="radio"]:hover {
            border-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="radio"]:checked {
            border-color: oklch(0.44 0.16 324.65) !important;
            background-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="radio"]:checked::after {
            content: "" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 8px !important;
            height: 8px !important;
            background-color: #ffffff !important;
            border-radius: 50% !important;
            display: block !important;
          }
          #gmao-correction-form input[type="checkbox"] {
            appearance: none !important;
            -webkit-appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 4px !important;
            background-color: #ffffff !important;
            outline: none !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
            margin-right: 6px !important;
          }
          #gmao-correction-form input[type="checkbox"]:hover {
            border-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="checkbox"]:checked {
            border-color: oklch(0.44 0.16 324.65) !important;
            background-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="checkbox"]:checked::after {
            content: "✓" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            display: block !important;
          }
        `}</style>
        
        {/* Stacked Layout: Sections layered one on top of the other, identical to DefibTab.tsx */}
        <div className="space-y-0" style={{ maxWidth: '100%', margin: '12px auto 0px' }}>
          
          {/* Section 0 - Document Configuration & Lookup */}
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
                0 — Configuration
              </span>
            </div>

            {/* If New mode, represent lookup select input first */}
            {isNew && (
              <div className="space-y-1 pb-3 border-b border-slate-100">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Sélectionner un équipement.
                </label>
                <select
                  value={selectedDefibId}
                  onChange={(e) => handleDefibLookupChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="">-- Choisir un DAE ou Saisir Libre --</option>
                  {defibrillateurs.map(df => (
                    <option key={df.id} value={df.id}>
                      {df.identifiant} - {df.numeroSerie} ({df.nomPrenomSite || 'Sans site'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Document Title */}
              <div className="space-y-1">
                <label htmlFor="select-cert-title" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Titre du document.
                </label>
                <select
                  id="select-cert-title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection d’un titre.</option>
                  <option value="RAPPORT TECHNIQUE DÉFIBRILLATEUR">RAPPORT TECHNIQUE DÉFIBRILLATEUR</option>
                  <option value="CONSTAT DE MAINTENANCE DÉFIBRILLATEUR">CONSTAT DE MAINTENANCE DÉFIBRILLATEUR</option>
                  <option value="RI RAPPORT INTERVENTION">RI RAPPORT INTERVENTION</option>
                  <option value="RAPPORT DISTANCIEL">RAPPORT DISTANCIEL</option>
                  <option value="BON PRÊT DÉFIBRILLATEUR">BON PRÊT DÉFIBRILLATEUR</option>
                  <option value="BON REPRISE DÉFIBRILLATEUR">BON REPRISE DÉFIBRILLATEUR</option>
                  <option value="MISE EN SERVICE DÉFIBRILLATEUR">MISE EN SERVICE DÉFIBRILLATEUR</option>
                </select>
              </div>

              {/* Redacteur */}
              <div className="space-y-1">
                <label htmlFor="input-tech-name" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Technicien.
                </label>
                <select
                  id="input-tech-name"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection du technicien.</option>
                  {availableMembers.map((m) => (
                    <option key={m.id || m.name} value={m.name}>
                      {m.name} {m.role ? `(${m.role})` : ''}
                    </option>
                  ))}
                  {techName && !availableMembers.some((m) => m.name === techName) && (
                    <option value={techName}>{techName}</option>
                  )}
                </select>
              </div>

              {/* Intervention Date */}
              <div className="space-y-1">
                <label htmlFor="input-interv-date" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Horodatage entrant.
                </label>
                <input
                  type="text"
                  id="input-interv-date"
                  disabled
                  value={interventionDate}
                  onChange={(e) => setInterventionDate(e.target.value)}
                  placeholder="Ex: 02-06-2026 14:15"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Mission Site */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Site de la mission.
                </label>
                <div className="flex gap-6 items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMissionSite('DÉPLACEMENT')}
                    className="inline-flex items-center cursor-pointer gap-2 select-none"
                    style={{ fontSize: '16px', color: '#000000', fontWeight: 'normal' }}
                  >
                    <span 
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        missionSite === 'DÉPLACEMENT' ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'
                      }`}
                      style={{ borderWidth: '2.5px' }}
                    >
                      {missionSite === 'DÉPLACEMENT' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />
                      )}
                    </span>
                    Déplacement.
                  </button>

                  <button
                    type="button"
                    onClick={() => setMissionSite('ATELIER SAV')}
                    className="inline-flex items-center cursor-pointer gap-2 select-none"
                    style={{ fontSize: '16px', color: '#000000', fontWeight: 'normal' }}
                  >
                    <span 
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        missionSite === 'ATELIER SAV' ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'
                      }`}
                      style={{ borderWidth: '2.5px' }}
                    >
                      {missionSite === 'ATELIER SAV' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />
                      )}
                    </span>
                    Atelier.
                  </button>
                </div>
              </div>

              {/* Photo Cliché */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Photographie du défibrillateur.
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={rowActionButton18Style}
                    className="transition-colors cursor-pointer font-sans"
                  >
                    Photographier
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {photoUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        style={{
                          ...rowActionButton18Style,
                          backgroundColor: '#ef4444',
                        }}
                        className="transition-colors cursor-pointer font-sans hover:bg-red-600"
                      >
                        Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (photoUrl) window.open(photoUrl, '_blank');
                        }}
                        style={{
                          ...rowActionButton18Style,
                          backgroundColor: 'rgb(53, 86, 236)',
                        }}
                        className="transition-colors cursor-pointer font-sans hover:bg-blue-700"
                      >
                        Aperçu
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 - Appareil Défibrillateur Raccordé */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                1 — Identification
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-identifiant" className="block text-[11px] font-bold text-black uppercase">
                  Identifiant.
                </label>
                <input
                  type="text"
                  id="snap-identifiant"
                  disabled
                  value={snapshot.identifiant || ''}
                  onChange={(e) => handleSnapshotChange('identifiant', e.target.value.toUpperCase())}
                  placeholder="Entrez un identifiant."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-numeroSerie" className="block text-[11px] font-bold text-black uppercase">
                  Série.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-numeroSerie"
                    required
                    value={snapshot.numeroSerie || ''}
                    onChange={(e) => handleSnapshotChange('numeroSerie', e.target.value)}
                    placeholder="Entrez un numéro de série."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSerieScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isSerieScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isSerieScannerOpen}
                    onClose={() => setIsSerieScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('numeroSerie', scannedText);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleId" className="block text-[11px] font-bold text-black uppercase">
                Modèle de défibrillateur.
              </label>
              <select
                id="snap-modeleId"
                value={snapshot.modeleId || ''}
                onChange={(e) => handleSnapshotChange('modeleId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                required
              >
                <option value="">Sélection d’un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Défibrillateur').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2 - Client & Contrat */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                2 — Client
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-clientId" className="block text-[11px] font-bold text-black uppercase">
                Client.
              </label>
              <select
                id="snap-clientId"
                value={snapshot.clientId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = clients.find(c => c.id === val);
                  if (matched) {
                    setSnapshot(prev => ({
                      ...prev,
                      clientId: val,
                      nomPrenomSite: matched.nomPrenomSite || '',
                      telephoneSite: matched.telephoneSite || '',
                      emailSite: matched.emailSite || '',
                      contrat: matched.contrat || 'Non',
                      nomContrat: matched.nomContrat || '',
                      referenceContrat: matched.referenceContrat || '',
                      debutContrat: matched.debutContrat || '',
                      finContrat: matched.finContrat || ''
                    }));
                  } else {
                    handleSnapshotChange('clientId', val);
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                required
              >
                <option value="">Sélection d’un client.</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.denomination} ({c.siret})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-nomPrenomSite" className="block text-[11px] font-bold text-black uppercase">
                  Contact.
                </label>
                <input
                  type="text"
                  id="snap-nomPrenomSite"
                  value={snapshot.nomPrenomSite || ''}
                  onChange={(e) => handleSnapshotChange('nomPrenomSite', e.target.value)}
                  placeholder="Entrez un nom et prénom."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-telephoneSite" className="block text-[11px] font-bold text-black uppercase">
                  Téléphone du contact.
                </label>
                <input
                  type="text"
                  id="snap-telephoneSite"
                  value={snapshot.telephoneSite || ''}
                  onChange={(e) => handleSnapshotChange('telephoneSite', e.target.value)}
                  placeholder="Entrez un téléphone."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-emailSite" className="block text-[11px] font-bold text-black uppercase">
                  Email du contact.
                </label>
                <input
                  type="text"
                  id="snap-emailSite"
                  value={snapshot.emailSite || ''}
                  onChange={(e) => handleSnapshotChange('emailSite', e.target.value)}
                  placeholder="Entrez un email."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                />
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-contrat" className="block text-[11px] font-bold text-black uppercase">
                  Contrat.
                </label>
                <select
                  id="snap-contrat"
                  disabled
                  value={snapshot.contrat || 'Non'}
                  onChange={(e) => handleSnapshotChange('contrat', e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                >
                  <option value="">Aucun contrat.</option>
                  <option value="Oui">Oui (Contrat actif)</option>
                  <option value="Non">Aucun contrat.</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-referenceContrat" className="block text-[11px] font-bold text-black uppercase">
                  Référence du contrat.
                </label>
                <input
                  type="text"
                  id="snap-referenceContrat"
                  disabled
                  value={snapshot.referenceContrat || ''}
                  onChange={(e) => handleSnapshotChange('referenceContrat', e.target.value)}
                  placeholder="Aucune référence."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-nomContrat" className="block text-[11px] font-bold text-black uppercase">
                  Catégorie de contrat.
                </label>
                <input
                  type="text"
                  id="snap-nomContrat"
                  disabled
                  value={snapshot.nomContrat || ''}
                  onChange={(e) => handleSnapshotChange('nomContrat', e.target.value)}
                  placeholder="Aucune catégorie de contrat."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-3 mt-2 space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Émettre une facture brouillon.
                </label>
                <div className="flex items-center gap-4 text-xs mt-1">
                  <label className="inline-flex items-center cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="emettreFactureBrouillon"
                      value="Oui"
                      checked={emettreFactureBrouillon === 'Oui'}
                      onChange={() => setEmettreFactureBrouillon('Oui')}
                      className="accent-indigo-600 scale-105"
                    />
                    <span>Oui</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="emettreFactureBrouillon"
                      value="Non"
                      checked={emettreFactureBrouillon === 'Non'}
                      onChange={() => {
                        setEmettreFactureBrouillon('Non');
                        setServiceEmettreId('');
                      }}
                      className="accent-indigo-600 scale-105"
                    />
                    <span>Non</span>
                  </label>
                </div>
              </div>

              {emettreFactureBrouillon === 'Oui' && (
                <div className="space-y-1 animate-fadeIn">
                  <label htmlFor="serviceEmettreId" className="block text-[11px] font-bold text-black uppercase">
                    Sélection d’un service.
                  </label>
                  <select
                    id="serviceEmettreId"
                    value={serviceEmettreId}
                    onChange={(e) => setServiceEmettreId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                    required={emettreFactureBrouillon === 'Oui'}
                  >
                    <option value="">Sélectionner un service...</option>
                     {(() => {
                      const serviceStocks = (stocks || []).filter(st => {
                        const variable = variables.find(v => v.id === st.denominationPieceId);
                        if (!variable) return false;
                        const cat = (variable.category || '').toLowerCase();
                        const nom = (variable.nom || '').toLowerCase();
                        return cat.includes('service') || nom.includes('service');
                      });

                      const serviceVariablesOnly = (variables || []).filter(v => {
                        const cat = (v.category || '').toLowerCase();
                        const nom = (v.nom || '').toLowerCase();
                        const isService = cat.includes('service') || nom.includes('service');
                        if (!isService) return false;
                        return !serviceStocks.some(st => st.denominationPieceId === v.id);
                      });

                      const hasAny = serviceStocks.length > 0 || serviceVariablesOnly.length > 0;
                      
                      if (hasAny) {
                        return (
                          <>
                            {serviceStocks.map(st => {
                              const variable = variables.find(v => v.id === st.denominationPieceId);
                              const label = variable ? `${variable.nom} (${variable.marque})` : 'Service Inconnu';
                              return (
                                <option key={st.id} value={st.id}>
                                  [Stock] {label} — {st.prixVenteHt} € HT (Quantité: {st.quantite})
                                </option>
                              );
                            })}
                            {serviceVariablesOnly.map(v => (
                              <option key={v.id} value={v.id}>
                                [Service] {v.nom} ({v.marque}) — 150 € HT (Virtuel)
                              </option>
                            ))}
                          </>
                        );
                      }

                      // Fallback options when tenant has empty variables/stocks
                      const fallbacks = [
                        { id: 'st_fallback_srv_1', label: 'Maintenance Préventive standard (Défibeo)', price: 150 },
                        { id: 'st_fallback_srv_2', label: 'Mise en service DAE (Défibeo)', price: 120 },
                        { id: 'st_fallback_srv_3', label: 'Audit de conformité (Défibeo)', price: 95 }
                      ];

                      return fallbacks.map(fb => (
                        <option key={fb.id} value={fb.id}>
                          {fb.label} — {fb.price} € HT (Stock: Illimité)
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3 - Coffret */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                3 — Coffret
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-modeleCoffretId" className="block text-[11px] font-bold text-black uppercase">
                  Modèle de boîtier.
                </label>
                <select
                  id="snap-modeleCoffretId"
                  value={snapshot.modeleCoffretId || ''}
                  onChange={(e) => handleSnapshotChange('modeleCoffretId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection d’un modèle de coffret.</option>
                  {variables.filter(v => v.category === 'Modèle Coffret').map(v => (
                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-numeroLotCoffret" className="block text-[11px] font-bold text-black uppercase">
                  Lot de boîtier.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-numeroLotCoffret"
                    value={snapshot.numeroLotCoffret || ''}
                    onChange={(e) => handleSnapshotChange('numeroLotCoffret', e.target.value)}
                    placeholder="Entrez un numéro de lot de boîtier."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotScannerOpen}
                    onClose={() => setIsLotScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('numeroLotCoffret', scannedText);
                    }}
                  />
                )}
              </div>
            </div>

            {/* New additions Section 3 (Alarme, Armoire connected, Dispositif handicap, Signalétique, Commentaire) */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Alarme fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={alarme === 'Oui'} onChange={() => setAlarme('Oui')} />
                  <FormRadio label="Non" checked={alarme === 'Non'} onChange={() => setAlarme('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Dispositif d’armoire connectée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={armoireConnectee === 'Oui'} onChange={() => setArmoireConnectee('Oui')} />
                  <FormRadio label="Non" checked={armoireConnectee === 'Non'} onChange={() => setArmoireConnectee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Dispositif handicap.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={dispositifHandicap === 'Oui'} onChange={() => setDispositifHandicap('Oui')} />
                  <FormRadio label="Non" checked={dispositifHandicap === 'Non'} onChange={() => setDispositifHandicap('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Signalétique conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={signaletiqueConforme === 'Oui'} onChange={() => setSignaletiqueConforme('Oui')} />
                  <FormRadio label="Non" checked={signaletiqueConforme === 'Non'} onChange={() => setSignaletiqueConforme('Non')} />
                </div>
              </div>
            </div>

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireCoffret" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant le boîtier.
              </label>
              <textarea
                id="snap-commentaireCoffret"
                value={snapshot.commentaireCoffret || ''}
                onChange={(e) => handleSnapshotChange('commentaireCoffret', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                rows={2}
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 4 - Accès */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                4 — Accès
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-numVoie" className="block text-[11px] font-bold text-black uppercase">
                  Voie.
                </label>
                <input
                  type="text"
                  id="snap-numVoie"
                  value={snapshot.numVoie || ''}
                  onChange={(e) => handleSnapshotChange('numVoie', e.target.value)}
                  placeholder="Entrez un numéro et une rue."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-ville" className="block text-[11px] font-bold text-black uppercase">
                  Ville.
                </label>
                <input
                  type="text"
                  id="snap-ville"
                  value={snapshot.ville || ''}
                  onChange={(e) => handleSnapshotChange('ville', e.target.value)}
                  placeholder="Entrez une ville."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-cp" className="block text-[11px] font-bold text-black uppercase">
                  Code postal.
                </label>
                <input
                  type="text"
                  id="snap-cp"
                  value={snapshot.cp || ''}
                  onChange={(e) => handleSnapshotChange('cp', e.target.value)}
                  placeholder="Entrez un code postal."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-region" className="block text-[11px] font-bold text-black uppercase">
                  Région.
                </label>
                <select
                  id="snap-region"
                  value={snapshot.region || ''}
                  onChange={(e) => handleSnapshotChange('region', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 cursor-pointer"
                >
                  <option value="">Sélectionnez une région.</option>
                  {REGIONS_FRANCAISES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-pays" className="block text-[11px] font-bold text-black uppercase">
                  Pays.
                </label>
                <select
                  id="snap-pays"
                  value={snapshot.pays || ''}
                  onChange={(e) => handleSnapshotChange('pays', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 cursor-pointer"
                >
                  <option value="">Sélectionnez un pays.</option>
                  {['France', 'Espagne', 'Portugal', 'Suisse', 'Belgique', 'Luxembourg', 'Monaco', 'Switzerland', 'United Kingdom', 'Deutschland', 'Nederland'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-latitude" className="block text-[11px] font-bold text-black uppercase">
                  Latitude GPS.
                </label>
                <input
                  type="text"
                  id="snap-latitude"
                  disabled
                  value={snapshot.latitude || ''}
                  onChange={(e) => handleSnapshotChange('latitude', e.target.value)}
                  placeholder="Entrez une coordonnée."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-mono text-xs cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-longitude" className="block text-[11px] font-bold text-black uppercase">
                  Longitude GPS.
                </label>
                <input
                  type="text"
                  id="snap-longitude"
                  disabled
                  value={snapshot.longitude || ''}
                  onChange={(e) => handleSnapshotChange('longitude', e.target.value)}
                  placeholder="Entrez une coordonnée."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-mono text-xs cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 5 - Dates */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                5 — Dates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-fabrication" className="block text-[11px] font-bold text-black uppercase">
                  Fabrication.
                </label>
                <input
                  type="date"
                  id="snap-fabrication"
                  value={snapshot.fabrication || ''}
                  onChange={(e) => handleSnapshotChange('fabrication', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-miseEnService" className="block text-[11px] font-bold text-black uppercase">
                  Mise en service.
                </label>
                <input
                  type="date"
                  id="snap-miseEnService"
                  value={snapshot.miseEnService || ''}
                  onChange={(e) => handleSnapshotChange('miseEnService', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-finGarantie" className="block text-[11px] font-bold text-black uppercase">
                  Fin de garantie.
                </label>
                <input
                  type="date"
                  id="snap-finGarantie"
                  value={snapshot.finGarantie || ''}
                  onChange={(e) => handleSnapshotChange('finGarantie', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 6 - Électrode Adulte */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                6 — Électrode Adulte (A)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleElectrodeAId" className="block text-[11px] font-bold text-black uppercase">
                Modèle d’électrode A.
              </label>
              <select
                id="snap-modeleElectrodeAId"
                value={snapshot.modeleElectrodeAId || ''}
                onChange={(e) => handleSnapshotChange('modeleElectrodeAId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs cursor-pointer"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-lotElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                Lot A.
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  id="snap-lotElectrodeA"
                  value={snapshot.lotElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('lotElectrodeA', e.target.value)}
                  placeholder="Entrez une référence."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsLotAScannerOpen(true)}
                  style={rowActionButton18Style}
                  className="shrink-0 transition-colors cursor-pointer font-sans"
                >
                  Scan
                </button>
              </div>
              {isLotAScannerOpen && (
                <BarcodeScannerModal
                  isOpen={isLotAScannerOpen}
                  onClose={() => setIsLotAScannerOpen(false)}
                  onScanSuccess={(scannedText) => {
                    handleSnapshotChange('lotElectrodeA', scannedText);
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-insertionElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Insertion.
                </label>
                <input
                  type="date"
                  id="snap-insertionElectrodeA"
                  value={snapshot.insertionElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('insertionElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-peremptionElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionElectrodeA"
                  value={snapshot.peremptionElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('peremptionElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-peremptionSecoursElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Péremption Secours.
                </label>
                <input
                  type="date"
                  id="snap-peremptionSecoursElectrodeA"
                  value={snapshot.peremptionSecoursElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('peremptionSecoursElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 6 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodeARemplacee === 'Oui'} onChange={() => setElectrodeARemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodeARemplacee === 'Non'} onChange={() => setElectrodeARemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodeAConformeSante === 'Oui'} onChange={() => setElectrodeAConformeSante('Oui')} />
                  <FormRadio label="Non" checked={electrodeAConformeSante === 'Non'} onChange={() => setElectrodeAConformeSante('Non')} />
                </div>
              </div>
            </div>

            {electrodeARemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-a-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode remplacée.
                </label>
                <select
                  id="select-electrode-a-rempc"
                  value={selectionElectrodeARemplacee}
                  onChange={(e) => setSelectionElectrodeARemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, x1, ${st.prixVenteHt} € ht (${st.stockage})`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant l’électrode A.
              </label>
              <input
                type="text"
                id="snap-commentaireElectrodeA"
                value={snapshot.commentaireElectrodeA || ''}
                onChange={(e) => handleSnapshotChange('commentaireElectrodeA', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 7 - Électrode Pédiatrique */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                7 — Électrode Pédiatrique (P)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleElectrodePId" className="block text-[11px] font-bold text-black uppercase">
                Modèle d’électrode P
              </label>
              <select
                id="snap-modeleElectrodePId"
                value={snapshot.modeleElectrodePId || ''}
                onChange={(e) => handleSnapshotChange('modeleElectrodePId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer text-slate-800"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-lotElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Lot P.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-lotElectrodeP"
                    value={snapshot.lotElectrodeP || ''}
                    onChange={(e) => handleSnapshotChange('lotElectrodeP', e.target.value)}
                    placeholder="Entrez une référence."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotPScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotPScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotPScannerOpen}
                    onClose={() => setIsLotPScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('lotElectrodeP', scannedText);
                    }}
                  />
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-peremptionElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionElectrodeP"
                  value={snapshot.peremptionElectrodeP || ''}
                  onChange={(e) => handleSnapshotChange('peremptionElectrodeP', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-peremptionSecoursElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Péremption Secours.
                </label>
                <input
                  type="date"
                  id="snap-peremptionSecoursElectrodeP"
                  value={snapshot.peremptionSecoursElectrodeP || ''}
                  onChange={(e) => handleSnapshotChange('peremptionSecoursElectrodeP', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 7 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode P remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodePRemplacee === 'Oui'} onChange={() => setElectrodePRemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodePRemplacee === 'Non'} onChange={() => setElectrodePRemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodePConformeSante === 'Oui'} onChange={() => setElectrodePConformeSante('Oui')} />
                  <FormRadio label="Non" checked={electrodePConformeSante === 'Non'} onChange={() => setElectrodePConformeSante('Non')} />
                </div>
              </div>
            </div>

            {electrodePRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-p-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode remplacée.
                </label>
                <select
                  id="select-electrode-p-rempc"
                  value={selectionElectrodePRemplacee}
                  onChange={(e) => setSelectionElectrodePRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, x1, ${st.prixVenteHt} € ht (${st.stockage})`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant l’électrode P.
              </label>
              <input
                type="text"
                id="snap-commentaireElectrodeP"
                value={snapshot.commentaireElectrodeP || ''}
                onChange={(e) => handleSnapshotChange('commentaireElectrodeP', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 8 - Batterie */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                8 — Batterie (B)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleBatterieId" className="block text-[11px] font-bold text-black uppercase">
                Modèle de batterie.
              </label>
              <select
                id="snap-modeleBatterieId"
                value={snapshot.modeleBatterieId || ''}
                onChange={(e) => handleSnapshotChange('modeleBatterieId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer text-slate-800"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Batterie').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-pourcentageBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Pourcentage de charge.
                </label>
                <input
                  type="number"
                  id="snap-pourcentageBatterie"
                  max={100}
                  min={0}
                  required
                  value={snapshot.pourcentageBatterie || ''}
                  onChange={(e) => handleSnapshotChange('pourcentageBatterie', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-mono font-bold"
                  placeholder="Entrez un nombre."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-lotBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Lot B.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-lotBatterie"
                    value={snapshot.lotBatterie || ''}
                    onChange={(e) => handleSnapshotChange('lotBatterie', e.target.value)}
                    placeholder="Entrez une référence."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotBatScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotBatScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotBatScannerOpen}
                    onClose={() => setIsLotBatScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('lotBatterie', scannedText);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label htmlFor="snap-peremptionBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionBatterie"
                  value={snapshot.peremptionBatterie || ''}
                  onChange={(e) => handleSnapshotChange('peremptionBatterie', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 8 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Batterie remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={batterieRemplacee === 'Oui'} onChange={() => setBatterieRemplacee('Oui')} />
                  <FormRadio label="Non" checked={batterieRemplacee === 'Non'} onChange={() => setBatterieRemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Batterie conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={batterieConformeSante === 'Oui'} onChange={() => setBatterieConformeSante('Oui')} />
                  <FormRadio label="Non" checked={batterieConformeSante === 'Non'} onChange={() => setBatterieConformeSante('Non')} />
                </div>
              </div>
            </div>

            {batterieRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-batterie-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de la batterie.
                </label>
                <select
                  id="select-batterie-rempc"
                  value={selectionBatterieRemplacee}
                  onChange={(e) => setSelectionBatterieRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner la batterie stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, x1, ${st.prixVenteHt} € ht (${st.stockage})`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireBatterie" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant la batterie.
              </label>
              <input
                type="text"
                id="snap-commentaireBatterie"
                value={snapshot.commentaireBatterie || ''}
                onChange={(e) => handleSnapshotChange('commentaireBatterie', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 9 - Vérifications techniques */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                9 — Vérifications techniques
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              {/* 1. Voyant conforme */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Voyant conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techVoyantConforme === 'Oui'} onChange={() => setTechVoyantConforme('Oui')} />
                  <FormRadio label="Non" checked={techVoyantConforme === 'Non'} onChange={() => setTechVoyantConforme('Non')} />
                </div>
              </div>

              {/* 2. Message numérique conforme */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Message numérique conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techMessageNumeroConforme === 'Oui'} onChange={() => setTechMessageNumeroConforme('Oui')} />
                  <FormRadio label="Non" checked={techMessageNumeroConforme === 'Non'} onChange={() => setTechMessageNumeroConforme('Non')} />
                </div>
              </div>

              {/* 3. Guides vocaux conformes */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Guides vocaux conformes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techGuidesVocauxConformes === 'Oui'} onChange={() => setTechGuidesVocauxConformes('Oui')} />
                  <FormRadio label="Non" checked={techGuidesVocauxConformes === 'Non'} onChange={() => setTechGuidesVocauxConformes('Non')} />
                </div>
              </div>

              {/* 4. Branchement conforme des électrodes */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Branchement conforme des électrodes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techBranchementElectrodesConforme === 'Oui'} onChange={() => setTechBranchementElectrodesConforme('Oui')} />
                  <FormRadio label="Non" checked={techBranchementElectrodesConforme === 'Non'} onChange={() => setTechBranchementElectrodesConforme('Non')} />
                </div>
              </div>

              {/* 5. Délivrance du choc conforme */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Délivrance du choc conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techDelivranceChocConforme === 'Oui'} onChange={() => setTechDelivranceChocConforme('Oui')} />
                  <FormRadio label="Non" checked={techDelivranceChocConforme === 'Non'} onChange={() => setTechDelivranceChocConforme('Non')} />
                </div>
              </div>

              {/* 6. Résultat du test en joules de l’électrode A */}
              <div className="space-y-1 bg-white">
                <label htmlFor="techResultatJoulesElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Résultat du test en joules de l’électrode A.
                </label>
                <input
                  type="number"
                  id="techResultatJoulesElectrodeA"
                  value={techResultatJoulesElectrodeA}
                  onChange={(e) => setTechResultatJoulesElectrodeA(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-805 rounded-lg text-xs font-mono"
                  placeholder="Saisissez un chiffre..."
                />
              </div>

              {/* 7. Résultat du test en joules de l’électrode P */}
              <div className="space-y-1 bg-white">
                <label htmlFor="techResultatJoulesElectrodeA2" className="block text-[11px] font-bold text-black uppercase">
                  Résultat du test en joules de l’électrode P.
                </label>
                <input
                  type="number"
                  id="techResultatJoulesElectrodeA2"
                  value={techResultatJoulesElectrodeA2}
                  onChange={(e) => setTechResultatJoulesElectrodeA2(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-805 rounded-lg text-xs font-mono"
                  placeholder="Saisissez un chiffre..."
                />
              </div>

              {/* 8. Accessibilité conforme */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Accessibilité conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techAccessibiliteConforme === 'Oui'} onChange={() => setTechAccessibiliteConforme('Oui')} />
                  <FormRadio label="Non" checked={techAccessibiliteConforme === 'Non'} onChange={() => setTechAccessibiliteConforme('Non')} />
                </div>
              </div>

              {/* 9. Nettoyage */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Nettoyage.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techNettoyage === 'Oui'} onChange={() => setTechNettoyage('Oui')} />
                  <FormRadio label="Non" checked={techNettoyage === 'Non'} onChange={() => setTechNettoyage('Non')} />
                </div>
              </div>

              {/* 10. État fonctionnel conforme */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  État fonctionnel conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techEtatFonctionnelConforme === 'Oui'} onChange={() => setTechEtatFonctionnelConforme('Oui')} />
                  <FormRadio label="Non" checked={techEtatFonctionnelConforme === 'Non'} onChange={() => setTechEtatFonctionnelConforme('Non')} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 10 - Vérifications du kit de secours */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                10 — Vérifications du kit de secours
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              {/* 1. Trousse de secours présente */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Trousse de secours présente.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitTrousseSecoursPresent === 'Oui'} onChange={() => setKitTrousseSecoursPresent('Oui')} />
                  <FormRadio label="Non" checked={kitTrousseSecoursPresent === 'Non'} onChange={() => setKitTrousseSecoursPresent('Non')} />
                </div>
              </div>

              {/* 2. Kit de secours remplacé ou ajouté */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Kit de secours remplacé ou ajouté.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitSecoursRemplaceOuAjoute === 'Oui'} onChange={() => setKitSecoursRemplaceOuAjoute('Oui')} />
                  <FormRadio label="Non" checked={kitSecoursRemplaceOuAjoute === 'Non'} onChange={() => setKitSecoursRemplaceOuAjoute('Non')} />
                </div>
              </div>
            </div>

            {/* Selection with NO line divider */}
            {kitSecoursRemplaceOuAjoute === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-kit-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection d’un kit de secours.
                </label>
                <select
                  id="select-kit-rempc"
                  value={selectionKitSecoursRemplace}
                  onChange={(e) => setSelectionKitSecoursRemplace(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner le kit de secours stocké...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, x1, ${st.prixVenteHt} € ht (${st.stockage})`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white pt-2">
              {/* 3. Ciseaux présents */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Ciseaux présents.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitCiseauxPresents === 'Oui'} onChange={() => setKitCiseauxPresents('Oui')} />
                  <FormRadio label="Non" checked={kitCiseauxPresents === 'Non'} onChange={() => setKitCiseauxPresents('Non')} />
                </div>
              </div>

              {/* 4. Masque présent */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Masque présent.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitMasquePresent === 'Oui'} onChange={() => setKitMasquePresent('Oui')} />
                  <FormRadio label="Non" checked={kitMasquePresent === 'Non'} onChange={() => setKitMasquePresent('Non')} />
                </div>
              </div>

              {/* 5. Serviettes présentes */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Serviettes présentes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitServiettesPresentes === 'Oui'} onChange={() => setKitServiettesPresentes('Oui')} />
                  <FormRadio label="Non" checked={kitServiettesPresentes === 'Non'} onChange={() => setKitServiettesPresentes('Non')} />
                </div>
              </div>

              {/* 6. Paires de gants présents */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Paires de gants présents.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitGantsPresents === 'Oui'} onChange={() => setKitGantsPresents('Oui')} />
                  <FormRadio label="Non" checked={kitGantsPresents === 'Non'} onChange={() => setKitGantsPresents('Non')} />
                </div>
              </div>

              {/* 7. Rasoir */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Rasoir.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitRasoirPresent === 'Oui'} onChange={() => setKitRasoirPresent('Oui')} />
                  <FormRadio label="Non" checked={kitRasoirPresent === 'Non'} onChange={() => setKitRasoirPresent('Non')} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 11 - Diagnostics et clôture */}
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
                11 — Diagnostics et clôture
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Fichier de données récupéré.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={fichierDonneesRecupere === 'Oui'} 
                    onChange={() => setFichierDonneesRecupere('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={fichierDonneesRecupere === 'Non'} 
                    onChange={() => setFichierDonneesRecupere('Non')} 
                  />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Défibrillateur conforme et prêt à l’usage.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={snapshot.conforme !== 'Non'} 
                    onChange={() => handleSnapshotChange('conforme', 'Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={snapshot.conforme === 'Non'} 
                    onChange={() => handleSnapshotChange('conforme', 'Non')} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Signature du technicien.
                </label>
                <div className="border border-slate-200 rounded-lg p-2 bg-white relative">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-white rounded border border-slate-200 cursor-crosshair touch-none"
                    style={{ height: '120px' }}
                  />
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[16px] text-black font-semibold font-sans">
                      Dessiner votre signature ci-dessus
                    </span>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[16px] text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Effacer
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="end-timestamp" className="block text-[11px] font-bold text-black uppercase">
                  Horodatage de clôture.
                </label>
                <input
                  type="text"
                  id="end-timestamp"
                  value={endTimeStamp}
                  onChange={(e) => setEndTimeStamp(e.target.value)}
                  placeholder="Signez pour appliquer l’horodatage."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-commentaire" className="block text-[11px] font-bold text-black uppercase">
                Commentaire de diagnostic et de clôture.
              </label>
              <textarea
                id="snap-commentaire"
                rows={4}
                value={snapshot.commentaire || ''}
                onChange={(e) => handleSnapshotChange('commentaire', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg leading-relaxed focus:ring-1 focus:ring-indigo-500"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

        </div>

      </form>
    </div>
  );
}
