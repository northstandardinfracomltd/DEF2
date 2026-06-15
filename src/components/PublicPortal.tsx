import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  HelpCircle,
  FileText,
  Clock,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Camera,
  Layers,
  UploadCloud,
  FileSignature,
  DollarSign,
  Play,
  Square,
  LogOut,
  Map,
  Eye,
  Sliders,
  CheckSquare,
  X,
  Zap,
  Calendar,
  Printer
} from 'lucide-react';
import { CompanyInfo, Member, SupportTicket, Defibrillateur, Variable, Client, PointageLog, StockRecord } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import GmaoCorrectionForm from './GmaoCorrectionForm';

// Helper functions for French date <-> ISO date picker compatibility
const getIsoDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  return dateStr;
};

const getFrenchDate = (isoDate: string) => {
  if (!isoDate) return "";
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

const formatToNormalCase = (str: string) => {
  if (!str) return "";
  const trimmed = str.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const truncateTourTitle = (title: string) => {
  if (!title) return "";
  return title.length > 15 ? title.substring(0, 15) + "..." : title;
};

interface PublicPortalProps {
  companyInfo: CompanyInfo;
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  defibrillateurs: Defibrillateur[];
  onUpdateDefib: (updated: Defibrillateur) => void;
  variables: Variable[];
  clients: Client[];
  onAddTicket: (ticket: Omit<SupportTicket, 'id' | 'date' | 'status'>) => string;
  onClose: () => void;
  onOpenClientPortal?: (client: Client) => void;
  stocks?: StockRecord[];
}

// Receipt expense type
interface Expense {
  id: string;
  techName: string;
  title: string;
  amountTtc: number;
  amountHt: number;
  amountTva: number;
  dateStr: string;
  photoUrl?: string;
}

// Generated report log type
interface GeneratedReport {
  id: string;
  date: string;
  techName: string;
  defibId: string;
  defibIdentifiant: string;
  title: string;
  siteMission: string;
  photoUrl?: string;
  defibSnapshot?: Defibrillateur;
}

export default function PublicPortal({
  companyInfo,
  members,
  onUpdateMembers,
  defibrillateurs,
  onUpdateDefib,
  variables,
  clients,
  onAddTicket,
  onClose,
  onOpenClientPortal,
  stocks = []
}: PublicPortalProps) {
  // Screens: 'landing' | 'signalement' | 'mainteneur' | 'success-ticket'
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'signalement' | 'mainteneur' | 'success-ticket'>('landing');

  // Report Form full-width overlay state
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false);

  // Accordion collapse/expand states for the 9 sections of the report form
  const [openSection1, setOpenSection1] = useState(true);
  const [openSection2, setOpenSection2] = useState(false);
  const [openSection3, setOpenSection3] = useState(false);
  const [openSection4, setOpenSection4] = useState(false);
  const [openSection5, setOpenSection5] = useState(false);
  const [openSection6, setOpenSection6] = useState(false);
  const [openSection7, setOpenSection7] = useState(false);
  const [openSection8, setOpenSection8] = useState(false);
  const [openSection9, setOpenSection9] = useState(false);

  // New ticket state
  const [ticketForm, setTicketForm] = useState({
    identifiant: '',
    objet: 'Défibrillateur utilisé' as SupportTicket['objet'],
    message: '',
    email: '',
    phone: ''
  });
  const [createdTicketId, setCreatedTicketId] = useState('');

  // PIN authentication state
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState('');

  // Inline expanded logins
  const [activeInlineLogin, setActiveInlineLogin] = useState<'tech' | 'client' | null>(null);
  const [inlineTechPin, setInlineTechPin] = useState('');
  const [inlineTechError, setInlineTechError] = useState('');
  const [inlineClientKey, setInlineClientKey] = useState('');
  const [inlineClientError, setInlineClientError] = useState('');

  const [isInlineReportOpen, setIsInlineReportOpen] = useState(false);
  const [inlineReportSuccess, setInlineReportSuccess] = useState(false);

  const handleInlineTechLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineTechError('');
    const trimmedPin = inlineTechPin.trim();
    if (!trimmedPin) {
      setInlineTechError('Veuillez saisir votre code PIN.');
      return;
    }
    const matched = members.find(m => m.pin === trimmedPin);
    if (matched) {
      setAuthenticatedUser(matched);
      localStorage.setItem('defib_active_tech_session', JSON.stringify(matched));
      setInlineTechPin('');
      setActiveInlineLogin(null);
    } else {
      setInlineTechError('Code PIN invalide.');
    }
  };

  const handleInlineClientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineClientError('');
    const trimmedKey = inlineClientKey.trim().toUpperCase();
    if (!trimmedKey) {
      setInlineClientError("Veuillez saisir votre clé d'accès.");
      return;
    }
    const matched = clients.find(
      (c) => c.accessKey && c.accessKey.trim().toUpperCase() === trimmedKey
    );
    if (matched) {
      setInlineClientKey('');
      setActiveInlineLogin(null);
      onOpenClientPortal?.(matched);
    } else {
      setInlineClientError("Clé d'accès invalide.");
    }
  };

  // Local storage logged in technician session
  const [authenticatedUser, setAuthenticatedUser] = useState<Member | null>(() => {
    const saved = localStorage.getItem('defib_active_tech_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Active tab inside Technician Webapp
  type WebappTab = 'interventions' | 'rapports' | 'temps' | 'frais' | 'localisation';
  const [activeTab, setActiveTab] = useState<WebappTab>('interventions');

  // Selected tour ID for mobile view
  const [selectedTourId, setSelectedTourId] = useState<string>('');

  // Selected tour ID and passage num for currently opening GMAO report overlay
  const [reportActiveTourId, setReportActiveTourId] = useState<string>('');
  const [reportActivePassageNum, setReportActivePassageNum] = useState<number | null>(null);

  // Navigation scrolling state and ref for fades
  const navRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 5);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    handleNavScroll();
    window.addEventListener('resize', handleNavScroll);
    return () => window.removeEventListener('resize', handleNavScroll);
  }, [activeTab]);

  // Real-time dynamic clock tracking
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tournées/Interventions Dummy State
  const [tours, setTours] = useState(() => {
    // Try to load and translate from defib_fsm_tours
    try {
      const mainToursRaw = localStorage.getItem('defib_fsm_tours');
      const activeTechRaw = localStorage.getItem('defib_active_tech_session');
      let activeTech: Member | null = null;
      if (activeTechRaw) {
        try { activeTech = JSON.parse(activeTechRaw); } catch {}
      }
      const activeTechName = activeTech ? activeTech.name : '';

      if (mainToursRaw) {
        const mainTours = JSON.parse(mainToursRaw);
        if (Array.isArray(mainTours) && mainTours.length > 0) {
          // Filter by active technician if logged in
          const matchedFsmTours = mainTours.filter((mt: any) => {
            if (!activeTechName) return true;
            return mt.techName && mt.techName.toLowerCase().trim() === activeTechName.toLowerCase().trim();
          });

          if (matchedFsmTours.length > 0) {
            return matchedFsmTours.map((mt: any, index: number) => {
              const tryFormatDateToFrench = (dateStr: string) => {
                if (!dateStr) return "";
                const parts = dateStr.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                  return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return dateStr;
              };

              return {
                id: mt.id || `fsm-tour-${index}`,
                title: mt.title || 'Tournée',
                startDate: tryFormatDateToFrench(mt.startDate),
                status: mt.status || 'À faire',
                techName: mt.techName || '',
                passages: (mt.missions || []).map((m: any, idx: number) => {
                  const defib = defibrillateurs.find((d: any) => 
                    d.identifiant === m.defibIdentifiant || 
                    d.id === m.defibIdentifiant ||
                    (m.clientName && m.clientName.includes(d.identifiant))
                  );
                  let model = 'Défibrillateur standard';
                  let address = m.clientName || 'Adresse non spécifiée';
                  if (defib) {
                    const modelVar = variables.find((v: any) => v.id === defib.modeleId);
                    if (modelVar) {
                      model = modelVar.marque ? `${modelVar.marque} ${modelVar.nom}` : modelVar.nom;
                    }
                    const addrParts = [defib.numVoie, defib.cp, defib.ville].filter(Boolean);
                    if (addrParts.length > 0) {
                      address = addrParts.join(', ');
                    }
                  }
                  return {
                    num: idx + 1,
                    id: m.id || `df-p-${idx}`,
                    identifiant: m.defibIdentifiant || defib?.identifiant || '',
                    model,
                    address,
                    status: m.status || 'À faire',
                    reason: m.reason || 'Visite technique',
                    requiredParts: m.requiredParts || []
                  };
                })
              };
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing defib_fsm_tours in technician portal state init:', e);
    }

    // Fallback to local storage defib_mobile_tours2, or hardcoded default ones
    const saved = localStorage.getItem('defib_mobile_tours2');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'tour-1',
        title: 'Tournée Nantes Hyper-Centre',
        startDate: '03-06-2026',
        passages: [
          { num: 1, id: 'df-p1', identifiant: 'PAR-101', model: 'HeartStart HS1', address: 'Place du Commerce, Nantes', status: 'À faire', reason: 'Remplacement batterie', requiredParts: ['Batterie Lithium HS1 (4 ans)'] },
          { num: 2, id: 'df-p2', identifiant: 'PAR-102', model: 'ZOLL AED Plus', address: '12 Rue de Budapest, Nantes', status: 'Effectué', reason: 'Remplacement électrodes CPR-D-padz', requiredParts: ['Paire d’électrodes CPR-D'] },
          { num: 3, id: 'df-p3', identifiant: 'PAR-103', model: 'Lifepak CR2', address: '44 Rue de Strasbourg, Nantes', status: 'À faire', reason: 'Contrôle annuel & Nettoyage', requiredParts: ['Kit de nettoyage standard'] }
        ]
      },
      {
        id: 'tour-2',
        title: 'Tournée Agglomération Ouest',
        startDate: '04-06-2026',
        passages: [
          { num: 1, id: 'df-p4', identifiant: 'PAR-104', model: 'Defibrillator FRx', address: '18 Rue de la Paix, Sautron', status: 'À faire', reason: 'Changement batterie & électrodes', requiredParts: ['Batterie FRx', 'Cartouche Électrodes SMART II'] },
          { num: 2, id: 'df-p5', identifiant: 'PAR-105', model: 'BeneHeart C1A', address: 'Avenue de l\'Atlantique, Saint-Herblain', status: 'À faire', reason: 'Visite préventive annuelle', requiredParts: ['Aucune pièce requise'] }
        ]
      }
    ];
  });

  // Persist tour state changes and sync to general FSM tours
  const saveTours = (updated: typeof tours) => {
    setTours(updated);
    localStorage.setItem('defib_mobile_tours2', JSON.stringify(updated));

    // Also sync back to defib_fsm_tours
    try {
      const mainToursRaw = localStorage.getItem('defib_fsm_tours');
      if (mainToursRaw) {
        const mainTours = JSON.parse(mainToursRaw);
        const updatedMainTours = mainTours.map((mt: any) => {
          // Find if there is a matching tour in updated mobile tours
          const matchedMobileTour = updated.find(t => t.id === mt.id || t.title === mt.title);
          if (matchedMobileTour) {
            // Update the status of each mission
            const updatedMissions = (mt.missions || []).map((m: any, idx: number) => {
              const matchedPassage = matchedMobileTour.passages.find((p: any) => p.num === idx + 1 || p.identifiant === m.defibIdentifiant);
              if (matchedPassage) {
                return { ...m, status: matchedPassage.status };
              }
              return m;
            });
            // Check if any mission is still to be done to update overall status
            const hasTodo = updatedMissions.some((m: any) => m.status === 'À faire' || m.status === 'En cours');
            const newStatus = hasTodo ? 'En cours' : 'Terminé';

            return {
              ...mt,
              status: matchedMobileTour.status === 'Terminé' ? 'Terminé' : newStatus,
              missions: updatedMissions
            };
          }
          return mt;
        });
        localStorage.setItem('defib_fsm_tours', JSON.stringify(updatedMainTours));
      }
    } catch (e) {
      console.error('Error syncing back to defib_fsm_tours:', e);
    }
  };

  const getSortedTours = () => {
    const parseTourDate = (dateStr: string) => {
      if (!dateStr) return 0;
      const clean = dateStr.replace(/\//g, '-');
      const parts = clean.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return new Date(y, m, d).getTime();
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return new Date(y, m, d).getTime();
        }
      }
      return 0;
    };
    return [...tours].sort((a, b) => parseTourDate(b.startDate) - parseTourDate(a.startDate));
  };

  // Dynamic sync of tours from main defib_fsm_tours on login, defibrillateurs change or mount
  useEffect(() => {
    try {
      const mainToursRaw = localStorage.getItem('defib_fsm_tours');
      const activeTechName = authenticatedUser ? authenticatedUser.name : '';

      if (mainToursRaw) {
        const mainTours = JSON.parse(mainToursRaw);
        if (Array.isArray(mainTours)) {
          // Filter by active technician if logged in
          const matchedFsmTours = mainTours.filter((mt: any) => {
            if (!activeTechName) return true;
            return mt.techName && mt.techName.toLowerCase().trim() === activeTechName.toLowerCase().trim();
          });

          if (matchedFsmTours.length > 0) {
            const mapped = matchedFsmTours.map((mt: any, index: number) => {
              const tryFormatDateToFrench = (dateStr: string) => {
                if (!dateStr) return "";
                const parts = dateStr.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                  return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                return dateStr;
              };

              return {
                id: mt.id || `fsm-tour-${index}`,
                title: mt.title || 'Tournée',
                startDate: tryFormatDateToFrench(mt.startDate),
                status: mt.status || 'À faire',
                techName: mt.techName || '',
                passages: (mt.missions || []).map((m: any, idx: number) => {
                  const defib = defibrillateurs.find((d: any) => 
                    d.identifiant === m.defibIdentifiant || 
                    d.id === m.defibIdentifiant ||
                    (m.clientName && m.clientName.includes(d.identifiant))
                  );
                  let model = 'Défibrillateur standard';
                  let address = m.clientName || 'Adresse non spécifiée';
                  if (defib) {
                    const modelVar = variables.find((v: any) => v.id === defib.modeleId);
                    if (modelVar) {
                      model = modelVar.marque ? `${modelVar.marque} ${modelVar.nom}` : modelVar.nom;
                    }
                    const addrParts = [defib.numVoie, defib.cp, defib.ville].filter(Boolean);
                    if (addrParts.length > 0) {
                      address = addrParts.join(', ');
                    }
                  }
                  return {
                    num: idx + 1,
                    id: m.id || `df-p-${idx}`,
                    identifiant: m.defibIdentifiant || defib?.identifiant || '',
                    model,
                    address,
                    status: m.status || 'À faire',
                    reason: m.reason || 'Visite technique',
                    requiredParts: m.requiredParts || []
                  };
                })
              };
            });

            setTours(mapped);
          } else {
            setTours([]);
          }
        }
      }
    } catch (e) {
      console.error('Error syncing FSM tours inside useEffect:', e);
    }
  }, [authenticatedUser, defibrillateurs]);

  // Switch/Toggle status of a passage
  const togglePassageStatus = (tourId: string, passageNum: number) => {
    const updated = tours.map(t => {
      if (t.id === tourId) {
        return {
          ...t,
          passages: t.passages.map(p => {
            if (p.num === passageNum) {
              const newStatus = p.status === 'À faire' ? 'Effectué' : 'À faire';
              return { ...p, status: newStatus };
            }
            return p;
          })
        };
      }
      return t;
    });
    saveTours(updated);
  };

  // PDF Report state variables
  const [selectedDefibId, setSelectedDefibId] = useState('');
  const [selectedDefibData, setSelectedDefibData] = useState<Defibrillateur | null>(null);
  const [isLotScannerOpen, setIsLotScannerOpen] = useState(false);
  const [isSerieScannerOpen, setIsSerieScannerOpen] = useState(false);
  const [isLotAScannerOpen, setIsLotAScannerOpen] = useState(false);
  const [isLotPScannerOpen, setIsLotPScannerOpen] = useState(false);
  const [isLotBatScannerOpen, setIsLotBatScannerOpen] = useState(false);

  // Custom Maintenance Fields for Tab 2
  const [receiptTitle, setReceiptTitle] = useState('RAPPORT TECHNIQUE DÉFIBRILLATEUR');
  const [missionSite, setMissionSite] = useState<'DÉPLACEMENT' | 'ATELIER SAV'>('DÉPLACEMENT');
  const [horodateInput, setHorodateInput] = useState('');
  const [techPhotoUrl, setTechPhotoUrl] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Generated Reports Historical Feed list from LocalStorage
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(() => {
    const saved = localStorage.getItem('defib_generated_reports');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'rep-1',
        date: '02-06-2026 14:15',
        techName: 'Thierry Martin',
        defibId: 'df_1',
        defibIdentifiant: 'PAR-101',
        title: 'CONSTAT DE MAINTENANCE DÉFIBRILLATEUR',
        siteMission: 'DÉPLACEMENT',
        photoUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=100&auto=format&fit=crop'
      }
    ];
  });

  const saveReports = (updated: GeneratedReport[]) => {
    setGeneratedReports(updated);
    localStorage.setItem('defib_generated_reports', JSON.stringify(updated));
  };

  const [printingReport, setPrintingReport] = useState<GeneratedReport | null>(null);

  const handleDownloadReport = (report: any) => {
    const snapshot = report.defibSnapshot || defibrillateurs.find(d => d.id === report.defibId || d.identifiant === report.defibIdentifiant) || {};
    
    // Resolve CompanyInfo
    const compLogo = companyInfo.logo || '';
    const compName = companyInfo.name || 'Défibeo Solutions';
    const compEmail = companyInfo.email || '';
    const compPhone = companyInfo.phone || '';
    const compWebsite = companyInfo.website || '';

    // Resolving Client Name
    const clientFound = clients.find(c => c.id === snapshot.clientId);
    const clientName = clientFound ? clientFound.denomination : (snapshot.nomPrenomSite || 'Non rattaché');

    // Resolving Model names from Variable list
    const defibModel = variables.find(v => v.id === snapshot.modeleId);
    const defibModelName = defibModel ? `${defibModel.marque} ${defibModel.nom}` : (snapshot.modeleId || 'Non spécifié');

    const coffretModel = variables.find(v => v.id === snapshot.modeleCoffretId);
    const coffretModelName = coffretModel ? `${coffretModel.marque} ${coffretModel.nom}` : (snapshot.modeleCoffretId || 'Non spécifié');

    const electrodeAModel = variables.find(v => v.id === snapshot.modeleElectrodeAId);
    const electrodeAModelName = electrodeAModel ? `${electrodeAModel.marque} ${electrodeAModel.nom}` : (snapshot.modeleElectrodeAId || 'Non spécifié');

    const electrodePModel = variables.find(v => v.id === snapshot.modeleElectrodePId);
    const electrodePModelName = electrodePModel ? `${electrodePModel.marque} ${electrodePModel.nom}` : (snapshot.modeleElectrodePId || 'Non spécifié');

    const batterieModel = variables.find(v => v.id === snapshot.modeleBatterieId);
    const batterieModelName = batterieModel ? `${batterieModel.marque} ${batterieModel.nom}` : (snapshot.modeleBatterieId || 'Non spécifié');

    // Helper to resolve stock pieces
    const getStockPieceLabel = (stockId: string) => {
      if (!stockId) return '-';
      const stockItem = stocks.find((s: any) => s.id === stockId);
      if (!stockItem) return stockId;
      const variableItem = variables.find((v: any) => v.id === stockItem.denominationPieceId);
      if (!variableItem) return `Pièce (${stockItem.denominationPieceId})`;
      return `${variableItem.nom} (${variableItem.marque})`;
    };

    const selElectrodeA = getStockPieceLabel(report.selectionElectrodeARemplacee);
    const selElectrodeP = getStockPieceLabel(report.selectionElectrodePRemplacee);
    const selBatterie = getStockPieceLabel(report.selectionBatterieRemplacee);
    const selKitSecours = getStockPieceLabel(report.selectionKitSecoursRemplace);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || '-'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          @font-face {
            font-family: "Civilprom";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }

          @font-face {
            font-family: "DefibeoMain";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: "DefibeoMain", "Civilprom", "Inter", sans-serif !important;
            background-color: #f1f5f9;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          @media print {
            body {
              background-color: #ffffff !important;
              padding: 8mm !important;
              margin: 0 !important;
              width: 210mm;
              height: 297mm;
            }
            .no-print {
              display: none !important;
            }
            #print-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: 100% !important;
              min-height: auto !important;
            }
          }

          #print-container {
            width: 194mm;
            min-height: 275mm;
            background-color: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border-radius: 16px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .pdf-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 10px;
            width: 100%;
          }

          .pdf-card {
            border: 2px solid oklch(0.44 0.16 324.65);
            border-radius: 14px;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pdf-card-header {
            background-color: oklch(0.44 0.16 324.65);
            color: #ffffff;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            padding: 9px 6px;
            text-transform: uppercase;
            letter-spacing: -0.01em;
            font-family: "DefibeoMain", "Civilprom", "Inter", sans-serif !important;
          }

          .pdf-card-body {
            padding: 12px;
            font-size: 16px;
            font-family: "DefibeoMain", "Civilprom", "Inter", sans-serif !important;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 6px;
            flex: 1;
            color: #0f172a;
          }

          .pdf-line {
            color: #0f172a;
            line-height: 1.35;
            font-size: 16px;
            text-align: left;
          }

          .pdf-bold {
            font-weight: bold;
            color: #000000;
          }
        </style>
      </head>
      <body class="bg-white">
        
        <div id="print-container">
          <!-- Big Entête with background color and text Titre du document -->
          <div style="background-color: oklch(0.44 0.16 324.65); padding: 14px; border-radius: 12px; margin-bottom: 12px; text-align: center; color: #ffffff; font-family: 'DefibeoMain', 'Civilprom', 'Inter', sans-serif; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.01em;">
            ${report.title || 'RAPPORT D’INTERVENTION GMAO'}
          </div>

          <!-- The exactly 3 columns 3 rows grid -->
          <div class="pdf-grid">
            
            <!-- SECTION 1 -->
            <div class="pdf-card">
              <div class="pdf-card-header">1 — COORDONNÉES DU MAINTENEUR</div>
              <div class="pdf-card-body" style="align-items: center; justify-content: center; text-align: center; gap: 4px;">
                ${compLogo ? `<img src="${compLogo}" style="max-height: 52px; max-width: 100%; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ''}
                <div class="pdf-line pdf-bold" style="font-size: 17px; margin-bottom: 4px; text-transform: uppercase;">${compName}</div>
                <div class="pdf-line" style="font-size: 14px;">Email : <span class="pdf-bold">${compEmail}</span></div>
                <div class="pdf-line" style="font-size: 14px;">Tél : <span class="pdf-bold">${compPhone}</span></div>
                <div class="pdf-line" style="font-size: 14px; margin-top: 2px;"><a href="https://${compWebsite}" target="_blank" style="color: #4f46e5; text-decoration: underline; font-weight: bold;">${compWebsite}</a></div>
              </div>
            </div>

            <!-- SECTION 2 -->
            <div class="pdf-card">
              <div class="pdf-card-header">2 — INFOS DÉFIBRILLATEUR</div>
              <div class="pdf-card-body">
                <div class="pdf-line">Client : <span class="pdf-bold">${clientName}</span></div>
                <div class="pdf-line">Contact : <span class="pdf-bold">${snapshot.nomPrenomSite || '-'}</span></div>
                <div class="pdf-line">Téléphone du contact : <span class="pdf-bold">${snapshot.telephoneSite || '-'}</span></div>
                <div class="pdf-line">Email du contact : <span class="pdf-bold">${snapshot.emailSite || '-'}</span></div>
                <div class="pdf-line">Contrat : <span class="pdf-bold">${snapshot.contrat || 'Non'}</span></div>
                ${snapshot.contrat === 'Oui' ? `<div class="pdf-line">Catégorie de contrat : <span class="pdf-bold">${snapshot.nomContrat || '-'}</span></div>` : ''}
              </div>
            </div>

            <!-- SECTION 3 -->
            <div class="pdf-card">
              <div class="pdf-card-header">3 — COFFRET OU ARMOIRE</div>
              <div class="pdf-card-body">
                <div class="pdf-line">Modèle : <span class="pdf-bold">${coffretModelName}</span></div>
                <div class="pdf-line">N° Lot : <span class="pdf-bold">${snapshot.numeroLotCoffret || '-'}</span></div>
                <div class="pdf-line">Signalétique : <span class="pdf-bold" style="color: ${report.signaletiqueConforme === 'Oui' ? '#059669' : '#dc2626'};">${report.signaletiqueConforme || 'Non'}</span></div>
                <div class="pdf-line">Alarme : <span class="pdf-bold">${report.alarme || 'Non'}</span></div>
                <div class="pdf-line">Connectée : <span class="pdf-bold">${report.armoireConnectee || 'Non'}</span></div>
                <div class="pdf-line">Handicap : <span class="pdf-bold">${report.dispositifHandicap || 'Non'}</span></div>
              </div>
            </div>

            <!-- SECTION 4 -->
            <div class="pdf-card">
              <div class="pdf-card-header">4 — VÉRIFICATIONS USAGE</div>
              <div class="pdf-card-body" style="gap: 3px; font-size: 15px;">
                <div class="pdf-line" style="font-size: 15px;">Accessibilité Usagers : <span class="pdf-bold">${report.techAccessibiliteConforme === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Poignée & État Touches : <span class="pdf-bold">${report.techEtatFonctionnelConforme === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Voyant : <span class="pdf-bold" style="color: ${report.techVoyantConforme === 'Oui' ? '#059669' : '#dc2626'};">${report.techVoyantConforme === 'Oui' ? 'Vert' : 'Rouge'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Message Numérique : <span class="pdf-bold">${report.techMessageNumeroConforme === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Guides Vocaux : <span class="pdf-bold">${report.techGuidesVocauxConformes === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Nettoyage : <span class="pdf-bold">${report.techNettoyage === 'Oui' ? 'Effectué' : 'Non effectué'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Branchement Électrodes : <span class="pdf-bold">${report.techBranchementElectrodesConforme === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Délivrance Choc : <span class="pdf-bold">${report.techDelivranceChocConforme === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Test Valeur Énergie Joules (A) : <span class="pdf-bold">${report.techResultatJoulesElectrodeA ? report.techResultatJoulesElectrodeA + ' J' : '-'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Test Valeur Énergie Joules (P) : <span class="pdf-bold">${report.techResultatJoulesElectrodeA2 ? report.techResultatJoulesElectrodeA2 + ' J' : '-'}</span></div>
              </div>
            </div>

            <!-- SECTION 5 -->
            <div class="pdf-card">
              <div class="pdf-card-header">5 — ÉLECTRODES ADULTES</div>
              <div class="pdf-card-body">
                <div class="pdf-line">Modèle : <span class="pdf-bold">${electrodeAModelName}</span></div>
                <div class="pdf-line">N° Lot / Série : <span class="pdf-bold">${snapshot.lotElectrodeA || '-'}</span></div>
                <div class="pdf-line">Date Péremption : <span class="pdf-bold" style="color: ${snapshot.situationElectrodeA === 'Rouge' ? '#dc2626' : 'inherit'};">${snapshot.peremptionElectrodeA || '-'}</span></div>
                <div class="pdf-line">Secours (Pér.) : <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeA || '-'}</span></div>
                <div class="pdf-line">État / Santé : <span class="pdf-bold" style="color: ${report.electrodeAConformeSante === 'Oui' ? '#059669' : '#dc2626'};">${report.electrodeAConformeSante === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px; font-size: 15px;">
                  Électrode remplacée (Adulte A). : <br/><span class="pdf-bold" style="color: #4f46e5;">${selElectrodeA}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 6 -->
            <div class="pdf-card">
              <div class="pdf-card-header">6 — ÉLECTRODES PÉDIATRIQUES</div>
              <div class="pdf-card-body">
                <div class="pdf-line">Modèle : <span class="pdf-bold">${electrodePModelName}</span></div>
                <div class="pdf-line">N° Lot / Série : <span class="pdf-bold">${snapshot.lotElectrodeP || '-'}</span></div>
                <div class="pdf-line">Date Péremption : <span class="pdf-bold" style="color: ${snapshot.situationElectrodeP === 'Rouge' ? '#dc2626' : 'inherit'};">${snapshot.peremptionElectrodeP || '-'}</span></div>
                <div class="pdf-line">Secours (Pér.) : <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeP || '-'}</span></div>
                <div class="pdf-line">État / Santé : <span class="pdf-bold" style="color: ${report.electrodePConformeSante === 'Oui' ? '#059669' : '#dc2626'};">${report.electrodePConformeSante === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px; font-size: 15px;">
                  Électrode remplacée (Pédiatrique P). : <br/><span class="pdf-bold" style="color: #4f46e5;">${selElectrodeP}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 7 -->
            <div class="pdf-card">
              <div class="pdf-card-header">7 — BATTERIE B</div>
              <div class="pdf-card-body">
                <div class="pdf-line">Modèle : <span class="pdf-bold">${batterieModelName}</span></div>
                <div class="pdf-line">N° Lot / Série : <span class="pdf-bold">${snapshot.lotBatterie || '-'}</span></div>
                <div class="pdf-line">Date Péremption : <span class="pdf-bold" style="color: ${snapshot.situationBatterie === 'Rouge' ? '#dc2626' : 'inherit'};">${snapshot.peremptionBatterie || '-'}</span></div>
                <div class="pdf-line">Capacité Restante : <span class="pdf-bold" style="color: ${parseInt(snapshot.pourcentageBatterie) < 20 ? '#dc2626' : '#059669'};">${snapshot.pourcentageBatterie ? snapshot.pourcentageBatterie + '%' : '-'}</span></div>
                <div class="pdf-line">État / Santé : <span class="pdf-bold" style="color: ${report.batterieConformeSante === 'Oui' ? '#059669' : '#dc2626'};">${report.batterieConformeSante === 'Oui' ? 'Conforme' : 'Non conforme'}</span></div>
                <div class="pdf-line" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px; font-size: 15px;">
                  Batterie remplacée. : <br/><span class="pdf-bold" style="color: #4f46e5;">${selBatterie}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 8 -->
            <div class="pdf-card">
              <div class="pdf-card-header">8 — KIT DE SECOURS</div>
              <div class="pdf-card-body" style="gap: 3px; font-size: 15px;">
                <div class="pdf-line" style="font-size: 15px;">Trousse de secours : <span class="pdf-bold" style="color: ${report.kitTrousseSecoursPresent === 'Oui' ? '#059669' : '#dc2626'};">${report.kitTrousseSecoursPresent === 'Oui' ? 'Présente' : 'Absente'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Ciseaux présents : <span class="pdf-bold">${report.kitCiseauxPresents === 'Oui' ? 'Oui' : 'Non'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Masque présent : <span class="pdf-bold">${report.kitMasquePresent === 'Oui' ? 'Oui' : 'Non'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Serviettes présentes : <span class="pdf-bold">${report.kitServiettesPresentes === 'Oui' ? 'Oui' : 'Non'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Paires de gants présents : <span class="pdf-bold">${report.kitGantsPresents === 'Oui' ? 'Oui' : 'Non'}</span></div>
                <div class="pdf-line" style="font-size: 15px;">Rasoir : <span class="pdf-bold">${report.kitRasoirPresent === 'Oui' ? 'Oui' : 'Non'}</span></div>
                <div class="pdf-line" style="border-top: 1px dashed #cbd5e1; padding-top: 5px; margin-top: 4px; font-size: 15px;">
                  Kit de secours remplacé. : <br/><span class="pdf-bold" style="color: #4f46e5;">${selKitSecours}</span>
                </div>
              </div>
            </div>

            <!-- SECTION 9 -->
            <div class="pdf-card">
              <div class="pdf-card-header">9 — DIAGNOSTIC & CLÔTURE</div>
              <div class="pdf-card-body" style="justify-content: space-between; gap: 4px;">
                <div>
                  <div class="pdf-line">
                    Conformité Globale : <span class="pdf-bold" style="color: ${snapshot.conforme === 'Oui' || report.conforme === 'Oui' ? '#059669' : '#dc2626'}; font-size: 17px;">${snapshot.conforme === 'Oui' || report.conforme === 'Oui' ? 'CONFORME' : 'NON CONFORME'}</span>
                  </div>
                </div>
                
                <!-- Photography -->
                <div style="display: flex; flex-direction: column; justify-content: flex-start; gap: 3px;">
                  <div style="font-size: 11px; font-weight: bold; color: #4b5563; text-transform: uppercase;">PHOTO DE PHOTOGRAPHIE :</div>
                  ${report.photoUrl ? `
                    <div style="border: 1.5px solid #dadada; border-radius: 8px; overflow: hidden; background: #fafafa; display: flex; justify-content: center; align-items: center; max-height: 80px;">
                      <img src="${report.photoUrl}" style="max-height: 80px; max-width: 100%; object-fit: contain;" alt="Preuve" referrerPolicy="no-referrer" />
                    </div>
                  ` : `
                    <div style="border: 1.5px dashed #cbd5e1; border-radius: 8px; font-size: 12px; color: #94a3b8; font-style: italic; display: flex; justify-content: center; align-items: center; min-height: 35px; background: #fafafa; text-align: center;">
                      Aucune photo
                    </div>
                  `}
                </div>

                <!-- Signature -->
                <div style="display: flex; flex-direction: column; justify-content: flex-start; gap: 3px;">
                  <div style="font-size: 11px; font-weight: bold; color: #4b5563; text-transform: uppercase;">SIGNATURE TECHNICIEN :</div>
                  ${report.techSignature ? `
                    <div style="border: 1.5px solid #dadada; border-radius: 8px; padding: 2px; background: #ffffff; text-align: center; display: flex; justify-content: center; align-items: center; max-height: 60px;">
                      <img src="${report.techSignature}" style="max-height: 55px; max-width: 100%; object-fit: contain;" alt="Signature" />
                    </div>
                  ` : `
                    <div style="border: 1.5px dashed #cbd5e1; border-radius: 8px; font-size: 12px; color: #94a3b8; font-style: italic; display: flex; justify-content: center; align-items: center; min-height: 35px; background: #fafafa;">
                      Non signée
                    </div>
                  `}
                </div>
              </div>
            </div>

          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // TIME WORK tracking state variables
  const [pointages, setPointages] = useState<PointageLog[]>(() => {
    const saved = localStorage.getItem('defib_pointages_history');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'pt-1',
        techName: 'Technicien Ouest',
        startDate: '02-06-2026',
        startTime: '08:00',
        endDate: '02-06-2026',
        endTime: '12:00',
        durationSeconds: 14400,
        isOngoing: false
      }
    ];
  });

  const savePointages = (updated: PointageLog[]) => {
    setPointages(updated);
    localStorage.setItem('defib_pointages_history', JSON.stringify(updated));
  };

  // Track ticker in seconds for active stopwatch
  const [ongoingSeconds, setOngoingSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const activePointage = pointages.find(p => p.isOngoing && p.techName === authenticatedUser?.name);
    if (activePointage) {
      // Calculate parsed start time difference
      interval = setInterval(() => {
        setOngoingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setOngoingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [pointages, authenticatedUser]);

  // Expenses state variables
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('defib_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'exp-1',
        techName: 'Thierry Martin',
        title: 'Abonnement Parking Nantes',
        amountTtc: 18.20,
        amountHt: 15.17,
        amountTva: 3.03,
        dateStr: '2026-06-02',
        photoUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&auto=format&fit=crop'
      }
    ];
  });

  const saveExpenses = (updated: Expense[]) => {
    setExpenses(updated);
    localStorage.setItem('defib_expenses', JSON.stringify(updated));
  };

  // New expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseTtc, setExpenseTtc] = useState('');
  const [expenseHt, setExpenseHt] = useState('');
  const [expenseTva, setExpenseTva] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expensePhotoUrl, setExpensePhotoUrl] = useState('');
  const expensePhotoInputRef = useRef<HTMLInputElement>(null);

  // Localisation form states for the connected technician
  const [techLocationLink, setTechLocationLink] = useState('');
  const [techStartAddress, setTechStartAddress] = useState('');
  const [routeOptimization, setRouteOptimization] = useState('Aller au plus proche d\'abord');

  // Autopopulate technician location details on login / select tab
  useEffect(() => {
    if (authenticatedUser) {
      const liveMember = members.find(m => m.name === authenticatedUser.name);
      if (liveMember) {
        setTechLocationLink(liveMember.locationLink || '');
      }
      
      // Load stored starting address if any
      const savedStart = localStorage.getItem(`defib_tech_start_address_${authenticatedUser.name}`);
      const savedOpt = localStorage.getItem(`defib_tech_optimization_${authenticatedUser.name}`);
      if (savedStart) setTechStartAddress(savedStart);
      if (savedOpt) setRouteOptimization(savedOpt);
    }
  }, [authenticatedUser, activeTab, members]);

  // Handle DAE lookup selection
  const handleDefibLookupChange = (daeId: string) => {
    setSelectedDefibId(daeId);
    const found = defibrillateurs.find(df => df.id === daeId);
    if (found) {
      // Cloned deep fields to form
      setSelectedDefibData({ ...found });

      // Build initial timestamp for Horodate
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setHorodateInput(`${d}-${m}-${y} ${h}:${min}:${s}`);
    } else {
      setSelectedDefibData(null);
    }
  };

  // Auto tax calculations helper
  const handleTtcChange = (val: string) => {
    setExpenseTtc(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const calculatedTva = num * 0.20;
      const calculatedHt = num - calculatedTva;
      setExpenseHt(calculatedHt.toFixed(2));
      setExpenseTva(calculatedTva.toFixed(2));
    } else {
      setExpenseHt('');
      setExpenseTva('');
    }
  };

  const handleHtChange = (val: string) => {
    setExpenseHt(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      const ttcNum = num / 0.80;
      const tvaNum = ttcNum * 0.20;
      setExpenseTtc(ttcNum.toFixed(2));
      setExpenseTva(tvaNum.toFixed(2));
    } else {
      setExpenseTtc('');
      setExpenseTva('');
    }
  };

  // File Picker Base64 helper
  const triggerPhotoRead = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // PIN code handling refs
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Screen resets
  useEffect(() => {
    if (currentScreen === 'mainteneur') {
      setPinDigits(['', '', '', '']);
      setPinError('');
      // focus
      setTimeout(() => pinRefs[0].current?.focus(), 150);
    }
  }, [currentScreen]);

  // PIN changes
  const handlePinDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = cleanVal;
    setPinDigits(newDigits);
    setPinError('');

    if (cleanVal !== '' && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinBackspace = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pinDigits[index] === '' && index > 0) {
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinDialClick = (num: number) => {
    const emptyIdx = pinDigits.findIndex(d => d === '');
    if (emptyIdx !== -1) {
      const newDigits = [...pinDigits];
      newDigits[emptyIdx] = num.toString();
      setPinDigits(newDigits);
      setPinError('');
      if (emptyIdx < 3) {
        pinRefs[emptyIdx + 1].current?.focus();
      }
    }
  };

  const handlePinClear = () => {
    setPinDigits(['', '', '', '']);
    setPinError('');
    pinRefs[0].current?.focus();
  };

  // Evaluate PIN on change completeness
  useEffect(() => {
    const pinStr = pinDigits.join('');
    if (pinStr.length === 4) {
      const matched = members.find(m => m.pin === pinStr);
      if (matched) {
        setPinError('');
        setAuthenticatedUser(matched);
        localStorage.setItem('defib_active_tech_session', JSON.stringify(matched));
        
        // Auto toast feedback
        setTimeout(() => {
          setCurrentScreen('landing');
        }, 800);
      } else {
        setPinError('Code PIN invalide. Accès refusé.');
        setTimeout(() => {
          setPinDigits(['', '', '', '']);
          pinRefs[0].current?.focus();
        }, 1200);
      }
    }
  }, [pinDigits]);

  const handleLogout = () => {
    setAuthenticatedUser(null);
    localStorage.removeItem('defib_active_tech_session');
    setCurrentScreen('landing');
    setActiveTab('interventions');
    if (onClose) {
      onClose();
    }
  };

  // SUBMITS & ENREGISTREMENTS

  // Submit Signalement incident from public
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.identifiant || !ticketForm.message || !ticketForm.email) {
      alert("Veuillez remplir tous les champs obligatoires (*) pour envoyer l'incident.");
      return;
    }

    const ticketId = onAddTicket({
      identifiant: ticketForm.identifiant,
      objet: ticketForm.objet,
      message: ticketForm.message,
      email: ticketForm.email,
      phone: ticketForm.phone
    });

    setCreatedTicketId(ticketId);
    setCurrentScreen('success-ticket');
    setTicketForm({
      identifiant: '',
      objet: 'Défibrillateur utilisé',
      message: '',
      email: '',
      phone: ''
    });
  };

  const handleInlineTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.identifiant || !ticketForm.message || !ticketForm.email) {
      alert("Veuillez remplir tous les champs obligatoires (*) pour envoyer l'incident.");
      return;
    }

    const ticketId = onAddTicket({
      identifiant: ticketForm.identifiant,
      objet: ticketForm.objet,
      message: ticketForm.message,
      email: ticketForm.email,
      phone: ticketForm.phone
    });

    setCreatedTicketId(ticketId);
    setInlineReportSuccess(true);
    setTicketForm({
      identifiant: '',
      objet: 'Défibrillateur utilisé',
      message: '',
      email: '',
      phone: ''
    });
  };

  // Save/Generate PDF Report (Tab 2)
  const handleSavePdfReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDefibData) {
      alert('Veuillez sélectionner un défibrillateur dans le menu déroulant lookup.');
      return;
    }

    // 1. Durably update main defibrillator record inside global state
    onUpdateDefib(selectedDefibData);

    // 2. Generate a neat printed report block record
    const rId = 'REP-' + Date.now();
    const newReportRecord: GeneratedReport = {
      id: rId,
      date: horodateInput || new Date().toLocaleString('fr-FR'),
      techName: authenticatedUser?.name || 'Technicien connecté',
      defibId: selectedDefibData.id,
      defibIdentifiant: selectedDefibData.identifiant,
      title: receiptTitle,
      siteMission: missionSite,
      photoUrl: techPhotoUrl || undefined,
      defibSnapshot: { ...selectedDefibData }
    };

    saveReports([newReportRecord, ...generatedReports]);

    alert(`Le rapport "${receiptTitle}" a été enregistré avec succès et rattaché avec l'historique du défibrillateur ${selectedDefibData.identifiant}. Les données du matériel central ont été mises à jour !`);

    // Reset lookup state
    setSelectedDefibId('');
    setSelectedDefibData(null);
    setTechPhotoUrl('');
  };

  // Submit WORK TIME Pointage (Tab 3)
  const handleTogglePointage = () => {
    const now = new Date();
    const activeIdx = pointages.findIndex(p => p.isOngoing && p.techName === authenticatedUser?.name);

    if (activeIdx !== -1) {
      // Ending ongoingPointage
      const activePointage = pointages[activeIdx];
      
      const parts = activePointage.startTime.split(':');
      const startObj = new Date();
      startObj.setHours(parseInt(parts[0]), parseInt(parts[1]), 0);
      
      const diffSeconds = Math.max(1, Math.round((now.getTime() - startObj.getTime()) / 1000));

      const updated = [...pointages];
      updated[activeIdx] = {
        ...activePointage,
        endDate: now.toLocaleDateString('fr-FR'),
        endTime: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
        durationSeconds: diffSeconds,
        isOngoing: false
      };
      
      savePointages(updated);
      alert('Pointage arrêté ! Période enregistrée dans votre historique.');
    } else {
      // Starting new Pointage
      const newLog: PointageLog = {
        id: 'pt-' + Date.now(),
        techName: authenticatedUser?.name || 'Technicien connecté',
        startDate: now.toLocaleDateString('fr-FR'),
        startTime: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
        isOngoing: true
      };
      
      savePointages([newLog, ...pointages]);
      alert('Période de travail commencée. Le chronomètre est lancé ! Keep safe.');
    }
  };

  const handleEditPointage = (id: string, newStart: string, newEnd: string, comment?: string, newStartDate?: string) => {
    const updated = pointages.map(p => {
      if (p.id === id) {
        // Calculate raw estimated parsed minutes
        const sParts = newStart.split(':').map(Number);
        const eParts = newEnd.split(':').map(Number);
        const durationMin = Math.max(1, (eParts[0] * 60 + eParts[1]) - (sParts[0] * 60 + sParts[1]));

        return {
          ...p,
          startDate: newStartDate !== undefined ? newStartDate : p.startDate,
          startTime: newStart,
          endTime: newEnd,
          durationSeconds: durationMin * 60,
          comment: comment !== undefined ? comment : p.comment
        };
      }
      return p;
    });
    savePointages(updated);
  };

  const handleDeletePointage = (id: string) => {
    savePointages(pointages.filter(p => p.id !== id));
  };

  // Submit EXPENSE Receipt (Tab 4)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseTtc) {
      alert("Veuillez remplir au minimum l'Objet et le Total TTC. (€).");
      return;
    }

    const newExpense: Expense = {
      id: 'exp-' + Date.now(),
      techName: authenticatedUser?.name || 'Technicien connecté',
      title: expenseTitle.trim(),
      amountTtc: parseFloat(expenseTtc) || 0,
      amountHt: parseFloat(expenseHt) || 0,
      amountTva: parseFloat(expenseTva) || 0,
      dateStr: expenseDate,
      photoUrl: expensePhotoUrl || undefined
    };

    saveExpenses([newExpense, ...expenses]);

    // Reset expense ticket forms
    setExpenseTitle('');
    setExpenseTtc('');
    setExpenseHt('');
    setExpenseTva('');
    setExpensePhotoUrl('');
    alert('Frais de ticket de caisse soumis avec succès !');
  };

  const handleDeleteExpense = (id: string) => {
    saveExpenses(expenses.filter(e => e.id !== id));
  };

  // Save Location configurations (Tab 5)
  const handleSaveLocalisation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedUser) return;

    // 1. Update matching member in parent Central state database
    const updatedMembers = members.map(m => {
      if (m.name === authenticatedUser.name) {
        return {
          ...m,
          locationLink: techLocationLink
        };
      }
      return m;
    });

    onUpdateMembers(updatedMembers);

    // 2. Persist starting address & optimized route to local storage
    localStorage.setItem(`defib_tech_start_address_${authenticatedUser.name}`, techStartAddress);
    localStorage.setItem(`defib_tech_optimization_${authenticatedUser.name}`, routeOptimization);

    alert(`Vos préférences géographiques ont été enregistrées avec succès et le lien de live tracking a été envoyé vers le pupitre principal d'administration !`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-0 text-slate-800 selection:bg-indigo-600/30 font-sans" id="public-portal-envelope">

      {/* Main Responsive Portal Container (Standalone App Layout) */}
      <div className="w-full max-w-[480px] min-h-screen bg-white relative flex flex-col" id="smartphone-shell">

        {/* ----------------- IF TECHNICIAN IS LOGGED IN STATE ----------------- */}
        {authenticatedUser ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white relative" id="authenticated-console-layout">

            {/* FULL WIDTH SPECIAL REPORT FORM OVERLAY */}
            {isReportOverlayOpen && (
              <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col overflow-y-auto px-2 py-2 sm:p-4 animate-slideUp text-black" id="report-form-overlay">
                <GmaoCorrectionForm
                  isNew={true}
                  clients={clients}
                  variables={variables}
                  defibrillateurs={defibrillateurs}
                  initialDefibId={selectedDefibId}
                  stocks={stocks}
                  onCancel={() => {
                    setIsReportOverlayOpen(false);
                    setSelectedDefibId('');
                    setSelectedDefibData(null);
                    setReportActiveTourId('');
                    setReportActivePassageNum(null);
                  }}
                  onSave={(updatedReport) => {
                    const reportId = 'REP-' + Date.now();
                    const submission = {
                      ...updatedReport,
                      id: reportId,
                      techName: authenticatedUser?.name || 'Technicien connecté',
                      date: updatedReport.date || new Date().toLocaleString('fr-FR'),
                    };
                    
                    saveReports([submission, ...generatedReports]);
                    onUpdateDefib(updatedReport.defibSnapshot);
                    
                    // Automatically transition corresponding passage status to "Effectué"
                    if (reportActiveTourId && reportActivePassageNum !== null) {
                      const updated = tours.map(t => {
                        if (t.id === reportActiveTourId) {
                          return {
                            ...t,
                            passages: t.passages.map(p => {
                              if (p.num === reportActivePassageNum) {
                                return { ...p, status: 'Effectué' };
                              }
                              return p;
                            })
                          };
                        }
                        return t;
                      });
                      saveTours(updated);
                    }

                    alert(`Le rapport "${submission.title}" a été enregistré avec succès, rattaché et l'état du matériel a été mis à jour !`);
                    setIsReportOverlayOpen(false);
                    setSelectedDefibId('');
                    setSelectedDefibData(null);
                    setReportActiveTourId('');
                    setReportActivePassageNum(null);
                  }}
                />

                <div className="hidden">
                  {/* Overlay header container */}
                <header className="px-4 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center border border-emerald-500/20">
                      <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider font-mono">RAPPORT D'INTERVENTION COMPLET</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportOverlayOpen(false);
                      setSelectedDefibId('');
                      setSelectedDefibData(null);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Fermer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </header>

                {/* Content form - complete 9 sections structured exactly like the principal software */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar bg-slate-50">
                  
                  {/* SEARCH LOOKUP COMPONENT */}
                  <div className="bg-white p-3.5 border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block font-mono">
                      🔍 ÉQUIPEMENT DE LA BASE PRINCIPALE (RECHERCHE RAPIDE)
                    </label>
                    <select
                      value={selectedDefibId}
                      onChange={(e) => handleDefibLookupChange(e.target.value)}
                      className="w-full px-2.5 py-2.5 bg-slate-55 border border-slate-220 rounded-xl text-xs text-slate-800 font-bold cursor-pointer focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="">-- Choisir un DAE ou Saisir Libre --</option>
                      {defibrillateurs.map(df => (
                        <option key={df.id} value={df.id}>
                          {df.identifiant} - {df.numeroSerie} ({df.nomPrenomSite || 'Sans site'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-sans">
                      Lien direct : Toute confirmation mettra à jour en temps réel l'ensemble de la base de données.
                    </p>
                  </div>

                  {selectedDefibData ? (
                    <form onSubmit={handleSavePdfReport} className="space-y-4 pb-12">
                      
                      {/* RAPPORT CONFIGURATION */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block font-mono">
                          📋 CONFIGURATION DU DOCUMENT PDF
                        </span>

                        {/* Title select */}
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Intitulé du Document *</label>
                          <select
                            value={receiptTitle}
                            onChange={(e) => setReceiptTitle(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 text-xs font-black rounded-lg text-slate-800 cursor-pointer"
                          >
                            <option value="RAPPORT TECHNIQUE DÉFIBRILLATEUR">RAPPORT TECHNIQUE DÉFIBRILLATEUR</option>
                            <option value="CONSTAT DE MAINTENANCE DÉFIBRILLATEUR">CONSTAT DE MAINTENANCE DÉFIBRILLATEUR</option>
                            <option value="RI RAPPORT INTERVENTION">RI RAPPORT INTERVENTION</option>
                            <option value="RAPPORT DISTANCIEL">RAPPORT DISTANCIEL</option>
                            <option value="BON PRÊT DÉFIBRILLATEUR">BON PRÊT DÉFIBRILLATEUR</option>
                            <option value="BON REPRISE DÉFIBRILLATEUR">BON REPRISE DÉFIBRILLATEUR</option>
                            <option value="MISE EN SERVICE DÉFIBRILLATEUR">MISE EN SERVICE DÉFIBRILLATEUR</option>
                          </select>
                        </div>

                        {/* Technician (Locked) */}
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Technicien Auteur</label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={authenticatedUser?.name || 'Technicien connecté'}
                            className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-indigo-600 rounded-lg cursor-not-allowed"
                          />
                        </div>

                        {/* Horodate manual entry */}
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-bold text-slate-500 uppercase block font-mono">Date et Heure d'Intervention</label>
                          <input
                            type="text"
                            value={horodateInput}
                            onChange={(e) => setHorodateInput(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 text-xs font-mono text-slate-805 rounded-lg"
                          />
                        </div>

                        {/* Mission site and Photo Capture */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Nature Mission *</label>
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => setMissionSite('DÉPLACEMENT')}
                                className={`py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer border text-center transition-all ${
                                  missionSite === 'DÉPLACEMENT'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-305 shadow-xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                📍 Déplacement
                              </button>
                              <button
                                type="button"
                                onClick={() => setMissionSite('ATELIER SAV')}
                                className={`py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer border text-center transition-all ${
                                  missionSite === 'ATELIER SAV'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-305 shadow-xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                ⚙️ Atelier SAV
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-bold text-slate-500 uppercase block">Cliché terrain</label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 font-bold cursor-pointer transition-colors shrink-0 flex items-center justify-center animate-pulse"
                                title="Prendre Photo"
                              >
                                <Camera className="w-4 h-4 text-emerald-500" />
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                ref={photoInputRef}
                                onChange={(e) => triggerPhotoRead(e, setTechPhotoUrl)}
                                className="hidden"
                              />
                              {techPhotoUrl ? (
                                <div className="relative w-10 h-10 border border-slate-200 rounded overflow-hidden shadow-xs shrink-0">
                                  <img src={techPhotoUrl} className="w-full h-full object-cover" alt="Cliché Preview" />
                                  <button
                                    type="button"
                                    onClick={() => setTechPhotoUrl('')}
                                    className="absolute inset-0 bg-red-600/90 font-black text-[8px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white uppercase"
                                  >
                                    Suppr.
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[8px] text-slate-500 font-mono italic">No photo</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* THE 9 CONCURRENT SECTIONS OF PRINCIPAL REGISTER FORM COMPOSITION */}
                      <div className="space-y-2">
                        
                        {/* SECTION 1: DAE DESCRIPTION AND MODEL */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection1(!openSection1)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-650 font-mono font-bold">
                              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                              Section 1: Appareil Défibrillateur
                            </span>
                            <span className="text-slate-500">{openSection1 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection1 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Identifiant unique *</label>
                                  <input
                                    type="text"
                                    required
                                    value={selectedDefibData.identifiant || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, identifiant: e.target.value.toUpperCase() })}
                                    className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded font-bold font-mono text-xs focus:ring-0 focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Numéro de Série *</label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      required
                                      value={selectedDefibData.numeroSerie || ''}
                                      onChange={(e) => setSelectedDefibData({ ...selectedDefibData, numeroSerie: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded font-mono text-xs focus:ring-0 focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setIsSerieScannerOpen(true)}
                                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                    >
                                      Scan
                                    </button>
                                  </div>
                                  {isSerieScannerOpen && (
                                    <BarcodeScannerModal
                                      isOpen={isSerieScannerOpen}
                                      onClose={() => setIsSerieScannerOpen(false)}
                                      onScanSuccess={(scannedText) => {
                                        if (selectedDefibData) {
                                          setSelectedDefibData({ ...selectedDefibData, numeroSerie: scannedText });
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Modèle de Défibrillateur *</label>
                                <select
                                  value={selectedDefibData.modeleId || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, modeleId: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                  required
                                >
                                  <option value="">-- Sélectionner un modèle --</option>
                                  {variables.filter(v => v.category === 'Modèle Défibrillateur').map(v => (
                                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 2: CLIENT INFO & CONTRACT DETAILS */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection2(!openSection2)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <User className="w-3.5 h-3.5 text-indigo-600" />
                              Section 2: Client & Contrat souscrit
                            </span>
                            <span className="text-slate-500">{openSection2 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection2 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Client rattaché *</label>
                                <select
                                  value={selectedDefibData.clientId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = clients.find(c => c.id === val);
                                    if (matched) {
                                      setSelectedDefibData({
                                        ...selectedDefibData,
                                        clientId: val,
                                        nomPrenomSite: matched.nomPrenomSite || '',
                                        telephoneSite: matched.telephoneSite || '',
                                        emailSite: matched.emailSite || '',
                                        contrat: matched.contrat || 'Non',
                                        nomContrat: matched.nomContrat || '',
                                        referenceContrat: matched.referenceContrat || '',
                                        debutContrat: matched.debutContrat || '',
                                        finContrat: matched.finContrat || ''
                                      });
                                    } else {
                                      setSelectedDefibData({ ...selectedDefibData, clientId: val });
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                  required
                                >
                                  <option value="">Sélectionner un client...</option>
                                  {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.denomination} ({c.siret})</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Nom Site / Responsable</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.nomPrenomSite || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, nomPrenomSite: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Téléphone Site</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.telephoneSite || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, telephoneSite: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Email Responsable</label>
                                <input
                                  type="text"
                                  value={selectedDefibData.emailSite || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, emailSite: e.target.value })}
                                  className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                />
                              </div>

                              <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Contrat Associé ?</label>
                                  <select
                                    value={selectedDefibData.contrat || 'Non'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, contrat: e.target.value as any })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  >
                                    <option value="Oui">Oui (Contrat actif)</option>
                                    <option value="Non">Non</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Référence Contrat</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.referenceContrat || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, referenceContrat: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] font-mono focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 3: CABINET HOUSING / COFFRET */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection3(!openSection3)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <Plus className="w-3.5 h-3.5 text-indigo-600" />
                              Section 3: Coffret de Protection
                            </span>
                            <span className="text-slate-500">{openSection3 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection3 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Modèle de Coffret / Boîtier</label>
                                <select
                                  value={selectedDefibData.modeleCoffretId || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, modeleCoffretId: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs focus:border-indigo-500"
                                >
                                  <option value="">Sélectionner un modèle...</option>
                                  {variables.filter(v => v.category === 'Modèle Coffret').map(v => (
                                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Numéro Lot Boîtier</label>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    value={selectedDefibData.numeroLotCoffret || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, numeroLotCoffret: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.3px] font-mono focus:border-indigo-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setIsLotScannerOpen(true)}
                                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0"
                                  >
                                    Scan
                                  </button>
                                </div>
                                {isLotScannerOpen && (
                                  <BarcodeScannerModal
                                    isOpen={isLotScannerOpen}
                                    onClose={() => setIsLotScannerOpen(false)}
                                    onScanSuccess={(scannedText) => {
                                      if (selectedDefibData) {
                                        setSelectedDefibData({ ...selectedDefibData, numeroLotCoffret: scannedText });
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 4: LOCATION AND GEOLOC DETAILS */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection4(!openSection4)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              Section 4: Accès & Géolocalisation
                            </span>
                            <span className="text-slate-500">{openSection4 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection4 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">N° & Rue</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.numVoie || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, numVoie: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Ville</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.ville || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, ville: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Code Postal</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.cp || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, cp: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Région</label>
                                  <input
                                    type="text"
                                    value={selectedDefibData.region || 'Île-de-France'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, region: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-emerald-600 uppercase font-mono">Latitude GPS *</label>
                                  <input
                                    type="text"
                                    required
                                    value={selectedDefibData.latitude || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, latitude: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-emerald-600 rounded font-mono text-[9px] font-bold focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-emerald-600 uppercase font-mono">Longitude GPS *</label>
                                  <input
                                    type="text"
                                    required
                                    value={selectedDefibData.longitude || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, longitude: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-emerald-600 rounded font-mono text-[9px] font-bold focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[9px]">
                                <span className="font-bold text-slate-500 uppercase">Ouverture H24 / J7</span>
                                <input
                                  type="checkbox"
                                  checked={selectedDefibData.acces247 || false}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, acces247: e.target.checked })}
                                  className="rounded bg-white border-slate-200 text-indigo-650 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 5: MISE EN SERVICE & CYCLE DATES */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection5(!openSection5)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              Section 5: Dates clés de Cycle & Validité
                            </span>
                            <span className="text-slate-500">{openSection5 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection5 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px] font-mono">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase font-sans">Mise en Service</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.miseEnService || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, miseEnService: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase font-sans">Fin de Garantie</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.finGarantie || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, finGarantie: e.target.value })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 6: ADULT ELECTRODE PADS */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection6(!openSection6)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              Section 6: Électrode Adulte & Mixte
                            </span>
                            <span className="text-slate-500">{openSection6 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection6 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Modèle d'électrode Adulte</label>
                                <select
                                  value={selectedDefibData.modeleElectrodeAId || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, modeleElectrodeAId: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                >
                                  <option value="">Sélectionner un modèle...</option>
                                  {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Numéro de LOT (A)</label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={selectedDefibData.lotElectrodeA || ''}
                                      onChange={(e) => setSelectedDefibData({ ...selectedDefibData, lotElectrodeA: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setIsLotAScannerOpen(true)}
                                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                    >
                                      Scan
                                    </button>
                                  </div>
                                  {isLotAScannerOpen && (
                                    <BarcodeScannerModal
                                      isOpen={isLotAScannerOpen}
                                      onClose={() => setIsLotAScannerOpen(false)}
                                      onScanSuccess={(scannedText) => {
                                        if (selectedDefibData) {
                                          setSelectedDefibData({ ...selectedDefibData, lotElectrodeA: scannedText });
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Situation Couleur (A)</label>
                                  <select
                                    value={selectedDefibData.situationElectrodeA || 'Vert'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, situationElectrodeA: e.target.value as any })}
                                    className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded text-[9px] cursor-pointer focus:border-indigo-500"
                                  >
                                    <option value="Vert">🟢 Conforme (Vert)</option>
                                    <option value="Orange">🟡 Rechange Recommandée</option>
                                    <option value="Rouge">🔴 Hors validité (Rouge)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 font-mono">
                                <div className="space-y-0.5">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">Date d'Insertion</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.insertionElectrodeA || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, insertionElectrodeA: e.target.value })}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">Péremption Pad (A) *</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.peremptionElectrodeA || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, peremptionElectrodeA: e.target.value })}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-805 rounded text-[8.5px] border-emerald-500/30 focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 7: CHILD ELECTRODE PADS */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection7(!openSection7)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              Section 7: Électrode Pédiatrique & Secours
                            </span>
                            <span className="text-slate-500">{openSection7 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection7 && (
                            <div className="p-3 border-t border-slate-200 space-y-3 bg-slate-50/40 text-[10px]">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Modèle Électrode Pédiatrique</label>
                                <select
                                  value={selectedDefibData.modeleElectrodePId || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, modeleElectrodePId: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                >
                                  <option value="">Sélectionner un modèle...</option>
                                  {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Numéro LOT (P)</label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={selectedDefibData.lotElectrodeP || ''}
                                      onChange={(e) => setSelectedDefibData({ ...selectedDefibData, lotElectrodeP: e.target.value })}
                                      className="flex-1 px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setIsLotPScannerOpen(true)}
                                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                    >
                                      Scan
                                    </button>
                                  </div>
                                  {isLotPScannerOpen && (
                                    <BarcodeScannerModal
                                      isOpen={isLotPScannerOpen}
                                      onClose={() => setIsLotPScannerOpen(false)}
                                      onScanSuccess={(scannedText) => {
                                        if (selectedDefibData) {
                                          setSelectedDefibData({ ...selectedDefibData, lotElectrodeP: scannedText });
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Péremption Pad (P) *</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.peremptionElectrodeP || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, peremptionElectrodeP: e.target.value })}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9px] font-mono focus:border-indigo-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 8: ACCUMULATOR / BATTERY SYSTEM */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection8(!openSection8)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <Zap className="w-3.5 h-3.5 text-indigo-600" />
                              Section 8: Accumulateur / Batterie d'Énergie
                            </span>
                            <span className="text-slate-500">{openSection8 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection8 && (
                            <div className="p-3 border-t border-slate-200 space-y-3.5 bg-slate-50/40 text-[10px]">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase">Modèle d'accumulateur</label>
                                <select
                                  value={selectedDefibData.modeleBatterieId || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, modeleBatterieId: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white text-slate-800 border border-slate-200 rounded text-xs cursor-pointer focus:border-indigo-500"
                                >
                                  <option value="">Sélectionner un modèle...</option>
                                  {variables.filter(v => v.category === 'Modèle Batterie').map(v => (
                                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                  <label className="block text-[8px] font-black text-emerald-600 uppercase font-mono">% Charge *</label>
                                  <input
                                    type="number"
                                    maxLength={3}
                                    required
                                    value={selectedDefibData.pourcentageBatterie || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, pourcentageBatterie: e.target.value })}
                                    className="w-full px-2 py-1.5 bg-white border border-emerald-500/30 text-emerald-600 font-black font-mono text-[11px] rounded text-center focus:border-emerald-500"
                                    placeholder="100"
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">LOT Batterie</label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={selectedDefibData.lotBatterie || ''}
                                      onChange={(e) => setSelectedDefibData({ ...selectedDefibData, lotBatterie: e.target.value })}
                                      className="flex-1 px-2 py-1.5 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] font-mono focus:border-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setIsLotBatScannerOpen(true)}
                                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 rounded text-[10px] font-black cursor-pointer transition-all shrink-0 font-sans"
                                    >
                                      Scan
                                    </button>
                                  </div>
                                  {isLotBatScannerOpen && (
                                    <BarcodeScannerModal
                                      isOpen={isLotBatScannerOpen}
                                      onClose={() => setIsLotBatScannerOpen(false)}
                                      onScanSuccess={(scannedText) => {
                                        if (selectedDefibData) {
                                          setSelectedDefibData({ ...selectedDefibData, lotBatterie: scannedText });
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 font-mono">
                                <div className="space-y-0.5">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">Péremption Batterie *</label>
                                  <input
                                    type="date"
                                    value={selectedDefibData.peremptionBatterie || ''}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, peremptionBatterie: e.target.value })}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[7.5px] font-bold text-slate-500 uppercase font-sans">État de santé</label>
                                  <select
                                    value={selectedDefibData.situationBatterie || 'Vert'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, situationBatterie: e.target.value as any })}
                                    className="w-full px-1.5 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[8.5px] focus:border-indigo-500"
                                  >
                                    <option value="Vert">🟢 Conforme (Vert)</option>
                                    <option value="Orange">🟡 Basse tension</option>
                                    <option value="Rouge">🔴 Remplacement</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* SECTION 9: GENERAL CONFORMITY & ARCHIVE */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => setOpenSection9(!openSection9)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all"
                          >
                            <span className="flex items-center gap-1.5 text-indigo-655 font-mono font-bold">
                              <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                              Section 9: Catégories & Conformité Globale
                            </span>
                            <span className="text-slate-500">{openSection9 ? '▲' : '▼'}</span>
                          </button>
                          
                          {openSection9 && (
                            <div className="p-3 border-t border-slate-200 space-y-3.5 bg-slate-50/40 text-[10px]">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[8px] font-bold text-amber-600 uppercase font-mono">Conforme *</label>
                                  <select
                                    value={selectedDefibData.conforme || 'Oui'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, conforme: e.target.value as any })}
                                    className="w-full px-2 py-1 bg-white text-slate-800 border border-slate-200 rounded text-[9.5px] focus:border-indigo-500"
                                  >
                                    <option value="Oui">Oui (Conforme)</option>
                                    <option value="Non">Non (Non conforme)</option>
                                  </select>
                                </div>
                                <div className="space-y-1 font-sans">
                                  <label className="block text-[8px] font-bold text-slate-500 uppercase">Archivé pour Historique</label>
                                  <select
                                    value={selectedDefibData.archive || 'Non'}
                                    onChange={(e) => setSelectedDefibData({ ...selectedDefibData, archive: e.target.value as any })}
                                    className="w-full px-2 py-1 bg-white border border-slate-200 text-slate-800 rounded text-[9.5px] focus:border-indigo-500"
                                  >
                                    <option value="Oui">Oui (Archivé)</option>
                                    <option value="Non">Non (Actif)</option>
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase col-span-2">Notes et observations techniques</label>
                                <textarea
                                  rows={2}
                                  value={selectedDefibData.commentaire || ''}
                                  onChange={(e) => setSelectedDefibData({ ...selectedDefibData, commentaire: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 text-slate-800 text-[10px] rounded leading-tight focus:border-indigo-500"
                                  placeholder="Entrez vos remarques de maintenance..."
                                />
                              </div>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* SUBMIT ACTION BUTTONS */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg cursor-pointer transition-colors border border-emerald-500 flex items-center justify-center gap-1.5 uppercase tracking-wider"
                        >
                          <Check className="w-4 h-4" />
                          Sauvegarder et Valider le Rapport
                        </button>
                      </div>

                    </form>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-[10px] uppercase border border-dashed border-slate-200 rounded-2xl font-mono leading-relaxed bg-slate-50">
                      Veuillez charger un DAE ci-dessus pour charger l'intégralité du formulaire de rapport.
                    </div>
                  )}

                </div>
              </div>
            </div>
            )}

            {/* Top Bar Navigation for Mobile - requested Header style: 
                TOUT EN HAUT À GAUCHE: Le nom de l'entreprise
                À DROITE: Le Prénom/Nom de l'utilisateur */}
            <header 
              className="px-5 pb-3.5 pt-8 flex flex-col gap-2.5 shrink-0 select-none text-white"
              style={{ backgroundColor: '#5d1f74', borderBottom: 'none' }}
            >
              {/* Ligne 1 : Nom de l'entreprise - centré */}
              <div className="flex items-center justify-center text-center pt-2">
                <div style={{ color: '#ffffff', paddingTop: '10px' }} className="font-gochi text-2xl text-center tracking-wide">
                  {companyInfo.name.length > 25 ? companyInfo.name.substring(0, 25) + "..." : companyInfo.name}
                </div>
              </div>

              {/* Ligne 2 : Technicien et Quitter - 50% / 50% */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <span 
                  style={{ 
                    fontSize: '16px', 
                    padding: '10px', 
                    background: 'transparent', 
                    border: '1px solid #ffffff2b', 
                    color: '#fff',
                    borderRadius: '9999px',
                    textAlign: 'center',
                    width: '50%',
                    fontWeight: 'bold'
                  }} 
                  className="truncate"
                >
                  {authenticatedUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    fontSize: '16px',
                    padding: '10px',
                    background: '#ffffff1a',
                    border: '1px solid #ffffff2b',
                    color: '#fff',
                    borderRadius: '9999px',
                    width: '50%',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                  className="hover:bg-[#ffffff2a] transition-all text-center"
                >
                  Quitter
                </button>
              </div>
            </header>

            {/* TAB SELECTOR: Horizontal capsule switch toggle layout with dynamic fades */}
            <nav className="py-0 px-0 relative shrink-0" id="nav-tabs" style={{ backgroundColor: '#5d1f74' }}>
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#5d1f74] to-transparent pointer-events-none z-10" />
              )}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#5d1f74] to-transparent pointer-events-none z-10" />
              )}
              
              <div 
                ref={navRef}
                onScroll={handleNavScroll}
                className="flex p-2.5 gap-3.5 shrink-0 overflow-x-auto no-scrollbar scroll-smooth min-w-full"
                style={{ backgroundColor: '#5d1f74' }}
              >
                <button
                  onClick={() => setActiveTab('interventions')}
                  style={activeTab === 'interventions' ? {
                    backgroundColor: 'rgb(254, 78, 187)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'none',
                  } : {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Interventions</span>
                </button>

                <button
                  onClick={() => setActiveTab('rapports')}
                  style={activeTab === 'rapports' ? {
                    backgroundColor: 'rgb(254, 78, 187)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'none',
                  } : {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Rapports</span>
                </button>

                <button
                  onClick={() => setActiveTab('temps')}
                  style={activeTab === 'temps' ? {
                    backgroundColor: 'rgb(254, 78, 187)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'none',
                  } : {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Temps</span>
                </button>

                <button
                  onClick={() => setActiveTab('frais')}
                  style={activeTab === 'frais' ? {
                    backgroundColor: 'rgb(254, 78, 187)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'none',
                  } : {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Frais</span>
                </button>

                <button
                  onClick={() => setActiveTab('localisation')}
                  style={activeTab === 'localisation' ? {
                    backgroundColor: 'rgb(254, 78, 187)',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    boxShadow: 'none',
                  } : {
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  className="px-5 py-2.5 rounded-[12px] flex items-center justify-center transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Localisation</span>
                </button>
              </div>
            </nav>

            {/* Scrollable Contents Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar" id="tab-content-area">
              
              {/* ----------------- TAB 1: INTERVENTIONS ----------------- */}
              {activeTab === 'interventions' && (
                <div className="space-y-4 pb-16 animate-fadeIn" id="tab-interventions-screen">
                  {/* Select native dropdown system for choosing active tour - sorted by date newest first */}
                  <div className="px-1 select-none">
                    <select
                      value={selectedTourId}
                      onChange={(e) => setSelectedTourId(e.target.value)}
                      className="w-full bg-white text-black cursor-pointer appearance-none transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none text-center"
                      style={{
                        border: '1px solid rgb(201, 190, 205)',
                        borderRadius: '14px',
                        padding: '14px 20px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        boxShadow: 'none',
                        outline: 'none',
                        textAlign: 'center',
                        textAlignLast: 'center'
                      }}
                    >
                      <option value="" disabled>Sélectionnez une tournée</option>
                      {getSortedTours().map((t) => (
                        <option key={t.id} value={t.id}>
                          {truncateTourTitle(t.title)} - {t.startDate} {t.status === 'Terminé' ? ' (Terminé)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* List of stacked tournées */}
                  {selectedTourId && getSortedTours().filter(t => t.id === selectedTourId).map((t) => (
                    <div key={t.id} className="space-y-3">

                      {/* Stacked Passage records list */}
                      <div className="space-y-3" id={`tour-passages-${t.id}`}>
                        {t.passages.map((p) => {
                          const isCompleted = p.status === 'Effectué';
                          return (
                            <div 
                              key={p.num} 
                              className="bg-white p-5 space-y-4" 
                              style={{ border: '1px solid rgb(201, 190, 205)', borderRadius: '14px', boxShadow: 'none' }} 
                              id={`passage-card-${p.num}`}
                            >
                              {/* Toggle Status Check above passage number, aligned to the left */}
                              <div className="flex justify-start w-full">
                                <button
                                  type="button"
                                  onClick={() => togglePassageStatus(t.id, p.num)}
                                  className="flex items-center gap-2 cursor-pointer focus:outline-hidden"
                                  style={{ fontSize: '16px' }}
                                >
                                  <span 
                                    className="rounded-full flex items-center justify-center transition-all bg-white"
                                    style={{
                                      border: isCompleted ? '2.5px solid #fe4eba' : '2.5px solid #cbd5e1',
                                      width: '22px',
                                      height: '22px',
                                      minWidth: '22px',
                                      minHeight: '22px',
                                      backgroundColor: '#ffffff'
                                    }}
                                  >
                                    {isCompleted && (
                                      <span className="rounded-full bg-[#fe4eba]" style={{ width: '10px', height: '10px' }} />
                                    )}
                                  </span>
                                  <span className="font-semibold text-black">
                                    {isCompleted ? 'Effectué' : 'À faire'}
                                  </span>
                                </button>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  {/* Rond rose avec le numéro du passage */}
                                  <div 
                                    className="flex items-center justify-center font-bold text-white rounded-full shrink-0"
                                    style={{
                                      backgroundColor: '#fe4eba',
                                      width: '28px',
                                      height: '28px',
                                      fontSize: '14px',
                                    }}
                                  >
                                    {p.num}
                                  </div>
                                  
                                  {/* Identifiant du défibrillateur dans une gelule alignée à gauche et pas en full width */}
                                  <span style={{
                                    color: '#ffffff',
                                    backgroundColor: '#5d1f74',
                                    padding: '8px 16px',
                                    borderRadius: '9999px',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    display: 'inline-block'
                                  }}>
                                    {p.identifiant}
                                  </span>
                                </div>

                                {/* Textes de la div en font color black */}
                                <div className="space-y-1.5" style={{ fontSize: '16px', color: '#000000', fontFamily: 'var(--font-sans), sans-serif' }}>
                                  <p style={{ color: '#000000' }}>
                                    Modèle : <span className="font-semibold" style={{ color: '#000000' }}>{p.model}</span>
                                  </p>
                                  <p style={{ color: '#000000' }}>
                                    Adresse : <span className="font-semibold" style={{ color: '#000000' }}>{p.address}</span>
                                  </p>
                                  {p.reason && p.reason.trim() !== '' && (
                                    <p style={{ color: '#000000' }}>
                                      Motif : <span className="font-semibold" style={{ color: '#000000' }}>{p.reason}</span>
                                    </p>
                                  )}
                                  {p.requiredParts && p.requiredParts.length > 0 && p.requiredParts.some(part => part && part.trim() !== 'Aucune pièce' && part.trim() !== 'Aucune pièce requise' && part.trim() !== 'Aucune' && part.trim() !== '') && (
                                    <p style={{ color: '#000000' }}>
                                      Pièce(s) : <span className="font-semibold" style={{ color: '#000000' }}>{p.requiredParts.join(', ')}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  disabled={isCompleted}
                                  onClick={() => alert(`Lancement du GPS vers local : ${p.address}`)}
                                  style={{
                                    backgroundColor: isCompleted ? '#e2e8f0' : '#000000',
                                    color: isCompleted ? '#94a3b8' : '#fff',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    borderRadius: '12px',
                                    padding: '11px 20px',
                                    border: 'none',
                                    boxShadow: 'none',
                                    cursor: isCompleted ? 'not-allowed' : 'pointer',
                                    flex: 1
                                  }}
                                  className={isCompleted ? "opacity-60 transition-all font-bold" : "hover:opacity-90 active:scale-[0.99] transition-all font-bold"}
                                >
                                  Y aller
                                </button>
                                
                                <button
                                  type="button"
                                  disabled={isCompleted}
                                  onClick={() => {
                                    const matched = defibrillateurs.find(df => df.identifiant === p.identifiant) || defibrillateurs[0];
                                    if (matched) {
                                      handleDefibLookupChange(matched.id);
                                      // Pre-fill fields for nicer wizard UX!
                                      setReceiptTitle('Rapport technique défibrillateur');
                                      setMissionSite('DÉPLACEMENT');
                                      setReportActiveTourId(t.id);
                                      setReportActivePassageNum(p.num);
                                      setIsReportOverlayOpen(true);
                                    } else {
                                      alert(`Aucun matériel central disponible.`);
                                    }
                                  }}
                                  style={{
                                    backgroundColor: isCompleted ? '#e2e8f0' : '#3556ec',
                                    color: isCompleted ? '#94a3b8' : '#fff',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    borderRadius: '12px',
                                    padding: '11px 20px',
                                    border: 'none',
                                    boxShadow: isCompleted ? 'none' : 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                                    cursor: isCompleted ? 'not-allowed' : 'pointer',
                                    flex: 1
                                  }}
                                  className={isCompleted ? "opacity-60 transition-all font-bold" : "hover:opacity-90 active:scale-[0.99] transition-all font-bold"}
                                >
                                  Rapport
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Terminer la tournée button in Red */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={t.status === 'Terminé'}
                          onClick={() => {
                            // update tours state
                            const updatedTours = tours.map(item => {
                              if (item.id === t.id) {
                                  return { ...item, status: 'Terminé' };
                              }
                              return item;
                            });
                            setTours(updatedTours);
                            localStorage.setItem('defib_mobile_tours2', JSON.stringify(updatedTours));

                            // Sync status to "Effectué" / "Terminé" in 'defib_fsm_tours'
                            try {
                              const mainToursRaw = localStorage.getItem('defib_fsm_tours');
                              if (mainToursRaw) {
                                const mainTours = JSON.parse(mainToursRaw);
                                const updatedMainTours = mainTours.map((mt: any) => {
                                  if (mt.title === t.title || (mt.title && mt.title && mt.title.toLowerCase().trim() === t.title.toLowerCase().trim())) {
                                    return { ...mt, status: 'Effectué' };
                                  }
                                  return mt;
                                });
                                localStorage.setItem('defib_fsm_tours', JSON.stringify(updatedMainTours));
                              }
                            } catch (e) {
                              console.error(e);
                            }
                            
                            alert("La tournée a bien été marquée comme terminée !");
                          }}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '14px 20px',
                            border: 'none',
                            boxShadow: t.status === 'Terminé' ? 'none' : 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, inset 0 6px 12px #ffffff1f',
                            cursor: t.status === 'Terminé' ? 'not-allowed' : 'pointer',
                            width: '100%',
                            opacity: t.status === 'Terminé' ? 0.55 : 1
                          }}
                          className={`${t.status === 'Terminé' ? '' : 'hover:bg-red-700 active:scale-[0.99]'} transition-all flex items-center justify-center gap-2`}
                        >
                          Terminer la tournée
                        </button>
                      </div>

                    </div>
                  ))}

                </div>
              )}

              {/* ----------------- TAB 2: RAPPORTS PDF ----------------- */}
              {activeTab === 'rapports' && (
                <div className="space-y-4 pb-16 animate-fadeIn" id="tab-rapports-screen">

                  <div className="space-y-4">
                    {generatedReports.map(rep => {
                      const snapshot = rep.defibSnapshot || defibrillateurs.find(d => d.id === rep.defibId || d.identifiant === rep.defibIdentifiant) || {};
                      const clientFound = clients.find(c => c.id === snapshot.clientId);
                      const clientName = clientFound ? clientFound.denomination : (snapshot.nomPrenomSite || 'Non rattaché');

                      return (
                        <div key={rep.id} className="p-5 bg-white rounded-[14px] space-y-4" style={{ border: '1px solid rgb(201, 190, 205)', boxShadow: 'none' }} id={`report-card-${rep.id}`}>
                          
                          {/* Gelule Date en premier */}
                          <div className="flex items-center justify-center pb-1">
                            <span style={{
                              color: '#ffffff',
                              backgroundColor: '#5d1f74',
                              padding: '10px 20px',
                              margin: 'auto',
                              borderRadius: '9999px',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              display: 'block',
                              width: '100%',
                              textAlign: 'center'
                            }}>
                              {rep.date}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5" style={{ fontSize: '16px', color: '#000000', fontFamily: 'var(--font-sans), sans-serif' }}>
                            <p style={{ color: '#000000' }}>Document : <span className="font-semibold" style={{ color: '#000000' }}>{formatToNormalCase(rep.title || 'Rapport de maintenance')}</span></p>
                            <p style={{ color: '#000000' }}>Défibrillateur : <span className="font-semibold" style={{ color: '#000000' }}>{rep.defibIdentifiant}</span></p>
                            <p style={{ color: '#000000' }}>Technicien : <span className="font-semibold" style={{ color: '#000000' }}>{rep.techName}</span></p>
                            <p style={{ color: '#000000' }}>Client : <span className="font-semibold" style={{ color: '#000000' }}>{formatToNormalCase(clientName)}</span></p>
                          </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadReport(rep)}
                          style={{
                            backgroundColor: '#3556ec',
                            color: '#fff',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '12px 20px',
                            border: 'none',
                            boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                          className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          Télécharger PDF
                        </button>
                      </div>
                    ); })}
                  </div>
                </div>
              )}

              {/* ----------------- TAB 3: TEMPS ----------------- */}
              {activeTab === 'temps' && (
                <div className="space-y-6 pb-16 animate-fadeIn" id="tab-temps-screen">
                  
                  <style>{`
                    #tab-temps-screen input[type="date"]::-webkit-calendar-picker-indicator,
                    #tab-temps-screen input[type="time"]::-webkit-calendar-picker-indicator {
                      display: none !important;
                      -webkit-appearance: none !important;
                      background: none !important;
                      width: 0 !important;
                      height: 0 !important;
                      margin: 0 !important;
                    }
                  `}</style>
                  
                  {/* Digital Clock Section */}
                  <div style={{ backgroundColor: '#000000' }} className="p-5 rounded-2xl text-center space-y-2">
                    <span style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-sans), sans-serif' }} className="font-normal block !text-white">Date et heure.</span>
                    <div style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-sans), sans-serif' }} className="font-bold !text-white">
                      {currentTime.toLocaleTimeString('fr-FR')}
                    </div>
                    <div style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-sans), sans-serif' }} className="font-bold !text-white">
                      {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  {/* Period control and tracker */}
                  {(() => {
                    const activePointage = pointages.find(p => p.isOngoing && p.techName === authenticatedUser?.name);
                    const isTracking = !!activePointage;

                    // Compute current tracker stopwatch formats
                    const formatStopwatch = (totalSec: number) => {
                      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
                      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
                      const s = String(totalSec % 60).padStart(2, '0');
                      return `${h}:${m}:${s}`;
                    };

                    return (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={handleTogglePointage}
                          style={{
                            backgroundColor: isTracking ? '#dc2626' : '#3556ec',
                            color: '#fff',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '14px 20px',
                            border: 'none',
                            boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                          className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          {isTracking ? (
                            <span>Terminer le pointage</span>
                          ) : (
                            <span>Démarrer la période</span>
                          )}
                        </button>

                        {isTracking && (
                          <div style={{ backgroundColor: '#f5ceff', color: '#651c78' }} className="p-4 rounded-xl text-center space-y-1.5">
                            <span style={{ fontSize: '16px', color: '#651c78', fontFamily: 'var(--font-sans), sans-serif' }} className="font-semibold block">Calcul du temps de travail.</span>
                            <div style={{ fontSize: '24px', color: '#651c78', fontFamily: 'var(--font-sans), sans-serif' }} className="font-bold">
                              {formatStopwatch(ongoingSeconds)}
                            </div>
                            <p style={{ fontSize: '16px', color: '#651c78', fontFamily: 'var(--font-sans), sans-serif' }} className="font-semibold">Débuté à {activePointage?.startTime}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Pointages registered historical log list */}
                  <div className="space-y-3">

                    <div className="space-y-4">
                      {pointages.filter(p => p.techName === authenticatedUser?.name && !p.isOngoing).map(p => (
                        <div key={p.id} className="p-5 bg-white rounded-[14px] space-y-4" style={{ border: '1px solid rgb(201, 190, 205)', boxShadow: 'none' }} id={`pointage-card-${p.id}`}>
                          
                          <div className="flex items-center justify-center pb-1">
                            <span style={{
                              color: '#ffffff',
                              backgroundColor: '#5d1f74',
                              padding: '10px 20px',
                              margin: 'auto',
                              borderRadius: '9999px',
                              fontWeight: 'bold',
                              fontSize: '16px',
                              display: 'block',
                              width: '100%',
                              textAlign: 'center'
                            }}>
                              Pointage de {Math.round((p.durationSeconds || 0) / 60)} min ({((p.durationSeconds || 0) / 3600).toFixed(2)} h)
                            </span>
                          </div>

                          {/* Editable fields for past Pointages */}
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Date.</label>
                              <input
                                type="date"
                                value={getIsoDate(p.startDate)}
                                style={{ fontSize: '16px', padding: '12px', borderRadius: '13px', border: '1px solid rgb(201, 190, 205)', outline: 'none' }}
                                className="w-full bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                onChange={(e) => handleEditPointage(p.id, p.startTime, p.endTime || '12:00', p.comment, getFrenchDate(e.target.value))}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Début.</label>
                                <input
                                  type="time"
                                  value={p.startTime}
                                  style={{ fontSize: '16px', padding: '12px', borderRadius: '13px', border: '1px solid rgb(201, 190, 205)', outline: 'none' }}
                                  className="w-full bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                  onChange={(e) => handleEditPointage(p.id, e.target.value, p.endTime || '12:00', p.comment, p.startDate)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Clôture.</label>
                                <input
                                  type="time"
                                  value={p.endTime || ''}
                                  style={{ fontSize: '16px', padding: '12px', borderRadius: '13px', border: '1px solid rgb(201, 190, 205)', outline: 'none' }}
                                  className="w-full bg-white text-slate-800 text-center font-sans focus:border-indigo-500"
                                  onChange={(e) => handleEditPointage(p.id, p.startTime, e.target.value, p.comment, p.startDate)}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Commentaire pour la période.</label>
                              <input
                                type="text"
                                maxLength={50}
                                placeholder="Entrez un commentaire."
                                value={p.comment || ''}
                                style={{ fontSize: '16px', padding: '12px', borderRadius: '13px', border: '1px solid rgb(201, 190, 205)', outline: 'none' }}
                                className="w-full bg-white focus:border-indigo-500"
                                onChange={(e) => handleEditPointage(p.id, p.startTime, p.endTime || '12:00', e.target.value, p.startDate)}
                              />
                            </div>
                            
                            <div className="flex items-center gap-3 pt-1 w-full">
                              <button
                                type="button"
                                onClick={() => handleDeletePointage(p.id)}
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: '#ffffff',
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  borderRadius: '12px',
                                  padding: '12px 18px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  width: '50%'
                                }}
                                className="hover:opacity-90 transition-all font-bold"
                              >
                                Supprimer
                              </button>
                              <button
                                type="button"
                                onClick={() => alert("Pointage enregistré avec succès !")}
                                style={{
                                  backgroundColor: '#000000',
                                  color: '#ffffff',
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  borderRadius: '12px',
                                  padding: '12px 18px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  width: '50%'
                                }}
                                className="hover:opacity-90 transition-all font-bold"
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ----------------- TAB 4: FRAIS ----------------- */}
              {activeTab === 'frais' && (
                <div className="space-y-6 pb-16 animate-fadeIn" id="tab-frais-screen">
                  
                  <style>{`
                    #tab-frais-screen input,
                    #tab-frais-screen label,
                    #tab-frais-screen input::placeholder {
                      font-family: var(--font-sans), "Civilprom", "DefibeoMain", sans-serif !important;
                    }
                  `}</style>
                  
                  {/* Ticket addition Form */}
                  <form onSubmit={handleSaveExpense} className="space-y-5 bg-white p-0 rounded-2xl" id="auth-main-card" style={{ border: 'none', padding: '0px', boxShadow: 'none' }}>
                    
                    <div className="space-y-4">
                      
                      {/* Title */}
                      <div className="space-y-1.5">
                        <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Objet</label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={expenseTitle}
                          onChange={(e) => setExpenseTitle(e.target.value)}
                          placeholder="Entrez une raison."
                          style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                          className="w-full bg-white focus:border-indigo-500"
                        />
                      </div>

                      {/* Amounts Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Total TTC. (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={expenseTtc}
                            onChange={(e) => handleTtcChange(e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                            className="w-full bg-white text-black font-bold focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Total HT. (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseHt}
                            onChange={(e) => handleHtChange(e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                            className="w-full bg-white text-black focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Total TVA. (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseTva}
                            onChange={(e) => setExpenseTva(e.target.value)}
                            placeholder="0.00"
                            style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                            className="w-full bg-white text-black focus:border-indigo-500"
                          />
                        </div>

                        {/* Date */}
                        <div className="space-y-1.5">
                          <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Date du paiement.</label>
                          <input
                            type="text"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            placeholder={new Date().toISOString().split('T')[0]}
                            style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                            className="w-full bg-white focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Photo select */}
                      <div className="space-y-1.5">
                        <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Photographie ou fichier.</label>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => expensePhotoInputRef.current?.click()}
                            style={{
                              backgroundColor: '#000000',
                              color: '#fff',
                              fontSize: '18px',
                              fontWeight: 'bold',
                              borderRadius: '12px',
                              padding: '9px 18px',
                              border: 'none',
                              boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                              cursor: 'pointer',
                            }}
                            className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                          >
                            <span>Sélectionner</span>
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            ref={expensePhotoInputRef}
                            onChange={(e) => triggerPhotoRead(e, setExpensePhotoUrl)}
                            className="hidden"
                          />
                          {expensePhotoUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<iframe src="${expensePhotoUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                  }
                                }}
                                style={{
                                  backgroundColor: '#000000',
                                  color: '#fff',
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  borderRadius: '12px',
                                  padding: '9px 18px',
                                  border: 'none',
                                  boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                                  cursor: 'pointer',
                                }}
                                className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                              >
                                Aperçu
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpensePhotoUrl('')}
                                style={{
                                  backgroundColor: '#dc2626',
                                  color: '#fff',
                                  fontSize: '18px',
                                  fontWeight: 'bold',
                                  borderRadius: '12px',
                                  padding: '9px 18px',
                                  border: 'none',
                                  boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                                  cursor: 'pointer',
                                }}
                                className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center font-bold"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>

                    <button
                      type="submit"
                      disabled={!expensePhotoUrl}
                      style={{
                        backgroundColor: expensePhotoUrl ? '#3556ec' : '#94a3b8',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        border: 'none',
                        boxShadow: expensePhotoUrl ? 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f' : 'none',
                        cursor: expensePhotoUrl ? 'pointer' : 'not-allowed',
                        width: '100%',
                        opacity: expensePhotoUrl ? 1 : 0.6
                      }}
                      className={`${expensePhotoUrl ? 'hover:opacity-90 active:scale-[0.99]' : ''} transition-all flex items-center justify-center font-bold`}
                    >
                      <span>Enregistrer</span>
                    </button>

                  </form>

                </div>
              )}

              {/* ----------------- TAB 5: LOCALISATION ----------------- */}
              {activeTab === 'localisation' && (
                <div className="space-y-6 pb-16 animate-fadeIn" id="tab-localisation-screen">
                  
                  <form
                    onSubmit={handleSaveLocalisation}
                    className="space-y-5"
                    style={{ border: 'none', padding: '0', background: 'transparent', boxShadow: 'none' }}
                    id="auth-main-card"
                  >
                    
                    <div className="space-y-4">
                      
                      {/* Live map link */}
                      <div className="space-y-1.5">
                        <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Lien de partage de localisation Google Maps. *</label>
                        <input
                          type="text"
                          required
                          value={techLocationLink}
                          onChange={(e) => setTechLocationLink(e.target.value)}
                          placeholder="Collez le lien Google Maps"
                          style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                          className="w-full bg-white focus:border-indigo-500 font-sans"
                        />
                      </div>
 
                      {/* Starting address */}
                      <div className="space-y-1.5">
                        <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Adresse de départ ou de retour. *</label>
                        <input
                          type="text"
                          required
                          value={techStartAddress}
                          onChange={(e) => setTechStartAddress(e.target.value)}
                          placeholder="Ex: 1 Rue Exemple, 12345, France"
                          style={{ fontSize: '16px', padding: '14px', borderRadius: '13px', border: '1px solid #dedede', outline: 'none' }}
                          className="w-full bg-white focus:border-indigo-500"
                        />
                      </div>
 
                      {/* Route Optimization selector */}
                      <div className="space-y-1.5">
                        <label style={{ fontSize: '16px' }} className="block font-bold text-black select-none">Stratégie des déplacements. *</label>
                        <select
                          value={routeOptimization}
                          onChange={(e) => setRouteOptimization(e.target.value)}
                          style={{
                            fontSize: '16px',
                            padding: '14px',
                            borderRadius: '13px',
                            border: '1px solid #dedede',
                            outline: 'none',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                          className="w-full bg-white font-semibold cursor-pointer focus:border-indigo-500"
                        >
                          <option value="Aller au plus proche d'abord">Se rendre d'abord au plus proche.</option>
                          <option value="Aller au plus loin d'abord">Se rendre d'abord au plus éloigné.</option>
                        </select>
                      </div>
 
                    </div>
 
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#3556ec',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        padding: '14px 20px',
                        border: 'none',
                        boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                      className="hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Enregistrer</span>
                    </button>
 
                  </form>

                </div>
              )}

            </div>

          </div>
        ) : (
          /* ----------------- IF TECHNICIAN IS NOT LOGGED IN STATE (PUBLIC VIEWPORTS) ----------------- */
          <div className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar" id="public-unauthenticated-layout">
            
            {/* Main Content screens wrapper */}
            <main className="flex-1 px-4 py-8 flex flex-col justify-center relative">
              
              {/* LANDING SCREEN */}
              {currentScreen === 'landing' && (
                <div className="space-y-8 text-center animate-fadeIn" id="landing-screen">
                  <div className="space-y-4 pt-10">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase pt-6">
                      {companyInfo.name || 'Défibeo Solutions'}
                    </h1>
                    <div className="space-y-1">
                      <h2 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">
                        Rallier le portail
                      </h2>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed max-w-xs mx-auto">
                    Signalez un incident sur un défibrillateur DAE de proximité ou retournez à la page de connexion de l'administration.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    
                    {/* BUTTON 1: SIGNALEMENT */}
                    <div
                      className={`w-full bg-slate-50 border p-5 rounded-2xl text-left transition-all duration-200 relative ${
                        isInlineReportOpen
                          ? 'border-indigo-500 bg-white ring-1 ring-indigo-500/10 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-100/80 hover:border-indigo-500/35 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isInlineReportOpen) {
                          setIsInlineReportOpen(true);
                          setInlineReportSuccess(false);
                        }
                      }}
                      id="card-portal-report"
                    >
                      <div className="space-y-0.5 select-none">
                        <div className="text-[12px] font-black text-slate-800 uppercase tracking-tight flex justify-between items-center">
                          <span>Signalement Incident</span>
                          {isInlineReportOpen && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsInlineReportOpen(false);
                                setInlineReportSuccess(false);
                              }}
                              className="text-[9px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent uppercase tracking-wider font-sans"
                            >
                              Réduire
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal font-sans">Boîtier DAE vandalisé, utilisé ou voyant rouge suspect.</p>
                      </div>

                      {isInlineReportOpen && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5" onClick={(e) => e.stopPropagation()}>
                          {inlineReportSuccess ? (
                            <div className="py-2 text-center space-y-2">
                              <p className="text-emerald-600 font-extrabold text-xs animate-fadeIn uppercase tracking-wider">
                                Message envoyé avec succès
                              </p>
                              <p className="text-[10px] text-slate-555 leading-relaxed">
                                Merci pour votre signalement citoyen !
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsInlineReportOpen(false);
                                  setInlineReportSuccess(false);
                                }}
                                className="mt-1 px-3 py-1 bg-slate-100 hover:bg-slate-205 text-slate-700 font-extrabold text-[9px] rounded-lg cursor-pointer border border-slate-200 transition-colors uppercase tracking-wider"
                              >
                                Fermer
                              </button>
                            </div>
                          ) : (
                            <form onSubmit={handleInlineTicketSubmit} className="space-y-3 font-sans text-slate-700 text-[10px]">
                              
                              <div className="space-y-3">
                                
                                {/* ID DAE */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">Identifiant du DAE incidenté *</label>
                                  <input
                                    type="text"
                                    required
                                    value={ticketForm.identifiant}
                                    onChange={(e) => setTicketForm({ ...ticketForm, identifiant: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 font-bold uppercase focus:bg-white focus:outline-hidden"
                                    placeholder="Ex: PAR-102"
                                  />
                                </div>

                                {/* Objet */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">Objet du Ticket *</label>
                                  <select
                                    value={ticketForm.objet}
                                    onChange={(e) => setTicketForm({ ...ticketForm, objet: e.target.value as any })}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-205 rounded-lg text-[11px] text-slate-800 cursor-pointer focus:bg-white focus:outline-hidden"
                                  >
                                    <option value="Défibrillateur utilisé">Défibrillateur utilisé</option>
                                    <option value="Défibrillateur endommagé">Défibrillateur endommagé</option>
                                    <option value="Défibrillateur hors service">Défibrillateur hors service</option>
                                    <option value="Autre">Autre</option>
                                  </select>
                                </div>

                                {/* Email */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">Votre Email pour suivi *</label>
                                  <input
                                    type="email"
                                    required
                                    value={ticketForm.email}
                                    onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-900 focus:bg-white focus:outline-hidden"
                                    placeholder="dupont@gmail.com"
                                  />
                                </div>

                                {/* Message */}
                                <div className="space-y-0.5">
                                  <label className="text-[8.5px] font-extrabold text-slate-500 uppercase">Message & Constat visuel *</label>
                                  <textarea
                                    required
                                    rows={3}
                                    value={ticketForm.message}
                                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-202 rounded-lg text-[11px] text-slate-900 leading-normal focus:bg-white focus:outline-hidden"
                                    placeholder="Ex: Le voyant clignote rouge ou le coffret ..."
                                  />
                                </div>

                              </div>

                              <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsInlineReportOpen(false);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Annuler
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 shadow-xs border border-indigo-500"
                                >
                                  Envoyer le Signalement
                                </button>
                              </div>

                            </form>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="pt-2">
                    <a
                      href={companyInfo.website ? (companyInfo.website.startsWith('http') ? companyInfo.website : `https://${companyInfo.website}`) : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200 shadow-xs"
                      id="btn-return-to-site"
                      onClick={(e) => {
                        if (!companyInfo.website) {
                          e.preventDefault();
                          onClose();
                        }
                      }}
                    >
                      Retour au site
                    </a>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-[10px] text-slate-400">
                      Une solution du logiciel <a href="https://defibeo.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">Défibeo</a>
                    </p>
                  </div>

                </div>
              )}

              {/* SUCCESS FORM */}
              {currentScreen === 'success-ticket' && (
                <div className="bg-white border border-slate-200 p-6 rounded-2.5xl text-center space-y-4 animate-scaleUp shadow-lg">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-250 rounded-full mx-auto flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-black text-slate-900 uppercase">Alerte Transmise !</h2>
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-indigo-700 font-bold border border-slate-205">
                      ID TICKET : {createdTicketId}
                    </span>
                    <p className="text-[10px] text-slate-600 leading-normal pt-2">
                      Nos techniciens d'assistance ont reçu votre rapport d'incident sur le terminal {ticketForm.identifiant}. Merci pour votre vigilance citoyenne !
                    </p>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('landing')}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 font-bold text-[10px] rounded-lg cursor-pointer text-slate-800 border border-slate-250 transition-colors"
                  >
                    Retourner à l'Accueil
                  </button>
                </div>
              )}

              {/* PIN MAINTENANCE CODE SCREEN */}
              {currentScreen === 'mainteneur' && (
                <div className="bg-white border border-slate-200 p-5 rounded-2.5xl space-y-4 max-w-sm mx-auto animate-scaleUp shadow-xl" id="mainteneur-screen">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentScreen('landing')}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight">Accès Déverrouillage</h2>
                      <p className="text-[10px] text-slate-500 font-sans">Saisissez votre code PIN individuel à 4 chiffres</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Visual PIN Inputs */}
                    <div className="flex justify-center gap-2">
                      {pinDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={pinRefs[index]}
                          type="password"
                          maxLength={1}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => handlePinDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinBackspace(index, e)}
                          className="w-10 h-12 text-center text-xl font-mono font-bold text-indigo-600 bg-slate-50 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                        />
                      ))}
                    </div>

                    {pinError && (
                      <div className="p-2 bg-rose-50 text-rose-800 border border-rose-150 rounded-lg text-center text-[9px] font-bold">
                        {pinError}
                      </div>
                    )}

                    {/* Fast Keypad dial */}
                    <div className="grid grid-cols-3 gap-2 max-w-[210px] mx-auto pt-1" id="fast-keypad">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handlePinDialClick(num)}
                          className="h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[13px] font-bold cursor-pointer transition-colors flex items-center justify-center text-slate-800 active:bg-slate-300"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handlePinClear}
                        className="h-10 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg text-[8px] font-bold text-rose-700 uppercase tracking-widest cursor-pointer flex items-center justify-center active:bg-rose-200"
                      >
                        Effacer
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinDialClick(0)}
                        className="h-10 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[13px] font-bold cursor-pointer flex items-center justify-center text-slate-800 active:bg-slate-300"
                      >
                        0
                      </button>
                      <div className="text-slate-400 text-[8px] flex items-center justify-center font-mono uppercase font-black tracking-wide select-none">
                        SÉCURISÉ
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </main>

            {/* Public footer omitted */}

          </div>
        )}

        {printingReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-9999 overflow-y-auto p-4 flex flex-col items-center animate-fadeIn print:bg-white print:p-0 print:absolute print:inset-0" id="print-overlay">
            
            {/* Dynamic styles injected just for standard print layouts */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                header, footer, nav, button, .no-print {
                  display: none !important;
                }
                body, html, #root {
                  background-color: white !important;
                  color: black !important;
                }
                #print-page-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
            `}} />

            {/* Top control bar */}
            <div className="w-full max-w-4xl bg-slate-800 text-white rounded-t-xl p-3 flex justify-between items-center shadow-lg border-b border-slate-700 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider font-mono">Aperçu avant Impression du Rapport (Prêt pour Impression / PDF)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors uppercase tracking-wider shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer ce Rapport</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingReport(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Centered structured printable A4 Content */}
            <div 
              id="print-page-sheet"
              className="w-full max-w-4xl bg-white text-slate-850 p-8 md:p-12 shadow-2xl rounded-b-xl space-y-6 font-sans text-xs border-x border-b border-slate-200 min-h-[1100px]"
            >
              {/* Document Header block */}
              <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-5 h-5 text-rose-600 fill-rose-50" />
                    <span className="text-sm font-black uppercase tracking-tight text-slate-950">{companyInfo.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wide">{companyInfo.website} | Tél : {companyInfo.phone}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{companyInfo.email}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">DOCUMENT OFFICIEL</span>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">{printingReport.title}</h2>
                  <p className="text-[10px] font-mono text-slate-500">RÉFÉRENCE : <span className="font-bold text-slate-800">{printingReport.id}</span></p>
                </div>
              </div>

              {/* Intervention metadata banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 font-sans text-[10.5px]">
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">📅 HORODATE INTERVENTION</span>
                  <p className="font-bold text-slate-850 mt-0.5">{printingReport.date}</p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">👤 REPRÉSENTANT TECHNIQUE</span>
                  <p className="font-bold text-slate-850 mt-0.5">{printingReport.techName}</p>
                </div>
                <div>
                  <span className="text-[8px] font-black text-indigo-700 uppercase tracking-wider block font-mono">📍 TYPE DE SITE / TOURNÉE</span>
                  <p className="font-bold text-slate-850 mt-0.5">{printingReport.siteMission}</p>
                </div>
              </div>

              {(() => {
                const snapshot = printingReport.defibSnapshot || defibrillateurs.find(d => d.id === printingReport.defibId || d.identifiant === printingReport.defibIdentifiant) || defibrillateurs[0];
                if (!snapshot) return <p className="text-slate-400 text-center font-mono py-12">Détails d'équipements non-disponibles pour ce matériel.</p>;
                
                const clientObj = clients.find(c => c.id === snapshot.clientId);
                const defMod = variables.find(v => v.id === snapshot.modeleId);
                const cofMod = variables.find(v => v.id === snapshot.modeleCoffretId);
                const elAMod = variables.find(v => v.id === snapshot.modeleElectrodeAId);
                const elPMod = variables.find(v => v.id === snapshot.modeleElectrodePId);
                const batMod = variables.find(v => v.id === snapshot.modeleBatterieId);

                return (
                  <div className="space-y-6">
                    
                    {/* 1. SECTION MATÉRIEL */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1 flex items-center justify-between">
                        <span>1. SECTION SYSTÈME DÉFIBRILLATEUR</span>
                        <span className="text-[9px] font-mono font-bold text-slate-500">ID CENTRAL : {snapshot.identifiant}</span>
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Identifiant court</span>
                          <span className="font-bold text-slate-850">{snapshot.identifiant}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Numéro de Série</span>
                          <span className="font-bold text-slate-850">{snapshot.numeroSerie}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Désignation / Marque</span>
                          <span className="font-bold text-slate-850">{defMod ? defMod.nom : snapshot.modeleId}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Constructeur</span>
                          <span className="font-bold text-slate-850">{defMod ? defMod.marque : '-'}</span>
                        </div>
                      </div>
                      {snapshot.commentaire && (
                        <div className="bg-slate-50 p-2.5 rounded-lg text-slate-700 italic leading-relaxed">
                          Note technique relative à l'unité : {snapshot.commentaire}
                        </div>
                      )}
                    </div>

                    {/* 2. SECTION CLIENT */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        2. EXPLOITANT & SITE DESIGNATION
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Client exploitant</span>
                          <span className="font-bold text-slate-850">{clientObj ? clientObj.denomination : 'Non rattaché'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Responsable Local</span>
                          <span className="font-bold text-slate-850">{snapshot.nomPrenomSite || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Téléphone direct</span>
                          <span className="font-bold text-slate-850">{snapshot.telephoneSite || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Courriel de Liaison</span>
                          <span className="font-bold text-slate-850 break-all">{snapshot.emailSite || '-'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Régime contractuel</span>
                          <span className="font-bold text-slate-850">{snapshot.contrat === 'Oui' ? '✓ SOUS CONTRAT' : 'HORS CONTRAT'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Abonnement</span>
                          <span className="font-bold text-slate-850">{snapshot.nomContrat || '-'}</span>
                        </div>
                        <div className="bg-slate-55 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Référence Administrative</span>
                          <span className="font-bold text-slate-850 font-mono">{snapshot.referenceContrat || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. COFFRET */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        3. COFFRET MURAL ET ALARMES
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Modèle Coffret mural</span>
                          <span className="font-bold text-slate-850">{cofMod ? cofMod.nom : snapshot.modeleCoffretId}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Numéro de Lot mural</span>
                          <span className="font-bold text-slate-850">{snapshot.numeroLotCoffret || '-'}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Remarques audit coffret</span>
                          <span className="font-bold text-slate-850">{snapshot.commentaireCoffret || 'Examen visuel approuvé'}</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. ACCÈS */}
                    <div className="space-y-2">
                      <h3 className="text-[11px] font-black text-slate-900 uppercase border-b border-slate-300 pb-1">
                        4. CONDITIONS D'ACCÈS DU PUBLIC & GPS
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50 p-3 rounded-lg lg:col-span-2">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Adresse physique rattachée</span>
                          <span className="font-bold text-slate-950 font-sans">{snapshot.numVoie}, {snapshot.cp} {snapshot.ville}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <span className="text-[8px] text-slate-500 font-mono uppercase block">Coordonnées cartographiques (Lat/Lng)</span>
                          <span className="font-bold text-indigo-800 font-mono">{snapshot.latitude}, {snapshot.longitude}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center text-[9px] font-mono">
                        <div className={`p-1.5 rounded-lg border font-bold ${snapshot.acces247 ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          OUVERT 24H/7J : {snapshot.acces247 ? 'OUI' : 'NON'}
                        </div>
                        <div className={`p-1.5 rounded-lg border font-bold ${snapshot.accesSemaine ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          ACCÈS SEMAINE : {snapshot.accesSemaine ? 'OUI' : 'NON'}
                        </div>
                        <div className={`p-1.5 rounded-lg border font-bold ${snapshot.accesWeekend ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          ACCÈS WEEKEND : {snapshot.accesWeekend ? 'OUI' : 'NON'}
                        </div>
                        <div className={`p-1.5 rounded-lg border font-bold ${snapshot.exterieur ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          BORNE EXTÉRIEURE : {snapshot.exterieur ? 'OUI' : 'NON'}
                        </div>
                      </div>
                    </div>

                    {/* 5, 6, 7 & 8: CONSUMABLES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Cartouches electrodes */}
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                        <h4 className="text-[9px] font-extrabold text-slate-800 uppercase font-mono border-b border-slate-200 pb-1 block">🔍 ÉLECTRODES & ÉPUISEMENT PADS</h4>
                        
                        <div className="space-y-2">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">JEU D'ÉLECTRODES ADULTE</span>
                            <p className="font-bold text-slate-850 mt-0.5">{elAMod ? elAMod.nom : snapshot.modeleElectrodeAId}</p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>LOT : <span className="font-bold text-slate-700">{snapshot.lotElectrodeA || '-'}</span></div>
                              <div>PÉREMPTION : <span className={`font-bold ${snapshot.situationElectrodeA === 'Rouge' ? 'text-rose-600' : 'text-emerald-700'}`}>{snapshot.peremptionElectrodeA || '-'}</span></div>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">JEU PÉDIATRIQUE (ENFANTS)</span>
                            <p className="font-bold text-slate-850 mt-0.5">{elPMod ? elPMod.nom : snapshot.modeleElectrodePId || 'Non spécifié / Absent'}</p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>LOT : <span className="font-bold text-slate-700">{snapshot.lotElectrodeP || '-'}</span></div>
                              <div>PÉREMPTION : <span className={`font-bold ${snapshot.situationElectrodeP === 'Rouge' ? 'text-rose-600' : 'text-emerald-700'}`}>{snapshot.peremptionElectrodeP || '-'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Batteries */}
                      <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/60">
                        <h4 className="text-[9px] font-extrabold text-slate-800 uppercase font-mono border-b border-slate-200 pb-1 block">🔌 CELLULE ALIMENTATION / PILES</h4>
                        
                        <div className="space-y-2">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px]">
                            <span className="text-[7.5px] font-black text-slate-500 uppercase font-mono block">BLOC BATTERIE PRINCIPAL</span>
                            <p className="font-bold text-slate-850">{batMod ? batMod.nom : snapshot.modeleBatterieId}</p>
                            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 font-mono mt-1.5 pt-1.5 border-t border-slate-100">
                              <div>LOT BLOC : <span className="font-bold text-slate-700">{snapshot.lotBatterie || '-'}</span></div>
                              <div>ÉCHÉANCE : <span className={`font-bold ${snapshot.situationBatterie === 'Rouge' ? 'text-rose-600' : 'text-emerald-700'}`}>{snapshot.peremptionBatterie || '-'}</span></div>
                            </div>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-[10px]">
                            <div>
                              <span className="text-[7.5px] text-slate-500 font-mono block uppercase font-bold">Capacité nominale auditée</span>
                              <span className="text-xs font-black text-slate-850 font-mono">{snapshot.pourcentageBatterie}%</span>
                            </div>
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-250">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  parseInt(snapshot.pourcentageBatterie) < 25 
                                    ? 'bg-rose-500' 
                                    : parseInt(snapshot.pourcentageBatterie) < 60 
                                    ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${snapshot.pourcentageBatterie}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Overall audit conclusion and conformite */}
                    <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50 shadow-xs">
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black text-indigo-750 uppercase tracking-widest block font-mono">DÉCISION DE CONFORMITÉ FINALE</span>
                        <p className="text-[10px] text-slate-600">L'appareil de secours a été audité sur l'ensemble de ses 9 étapes de conformité.</p>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                        <span className={`px-4 py-2 rounded-lg border flex items-center gap-2 uppercase tracking-wide font-black ${
                          snapshot.conforme === 'Oui' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs' 
                            : 'bg-rose-55 text-rose-700 border-rose-250'
                        }`}>
                          {snapshot.conforme === 'Oui' ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>OPÉRATIONNEL (CONFORME)</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                              <span>HORS SERVICE (NON CONFORME)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Technical Signature section */}
                    <div className="pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-[11px] font-mono text-slate-600">
                      <div className="space-y-1">
                        <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">🗓️ GARANTIES DU REPRÉSENTANT</span>
                        <p>Fabrication d'origine : <span className="font-bold text-slate-700">{snapshot.fabrication || '-'}</span></p>
                        <p>Échéance Garantie : <span className="font-bold text-slate-700">{snapshot.finGarantie || '-'}</span></p>
                        <p>Visite de Contrôle Actuelle : <span className="font-bold text-indigo-700">{snapshot.derniereMaintenance || '-'}</span></p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">✍️ SIGNATURE REPRÉSENTANT & CACHET</span>
                        <div className="pt-2 h-14 flex items-center justify-end">
                          {printingReport.photoUrl ? (
                            <div className="border border-slate-200 rounded overflow-hidden h-full max-w-[120px] bg-white p-0.5 shadow-xs">
                              <img src={printingReport.photoUrl} className="h-full w-auto object-contain mx-auto" alt="Preuve d'intervention" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="h-full w-32 border border-slate-200 bg-white rounded flex items-center justify-center font-mono text-[8px] uppercase tracking-wider text-slate-400 border-dashed">
                              Visuel Non Fourni
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-slate-800 text-[10px] mt-2 font-mono uppercase">{printingReport.techName}</p>
                        <p className="text-[8px] text-slate-500 font-bold font-sans">Agent Technique Certifié</p>
                      </div>
                    </div>

                  </div>
                );
              })()}
              
              {/* Return footer */}
              <div className="border-t border-slate-200 pt-4 text-center text-[9px] text-slate-400 font-mono no-print">
                <p className="uppercase tracking-wider">Ce constat de conformité de l'appareil de secours fait foi de l'évaluation physique réalisée.</p>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
