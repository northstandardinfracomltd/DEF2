import React, { useState, useEffect, useRef } from 'react';
import { fetchCollectionFromFirestore, saveCollectionToFirestore, setTenantId as setFirebaseTenantId, getRegisteredTenants } from './firebase';
import { Client, Variable, Defibrillateur, SupportTicket, Member, CompanyInfo, PointageLog, StockRecord, CommercialDoc, CommercialDocItem, GedDocument, Memo, OtherEquipment, PointageAutoVigilance, DistributedStockLocation, AchatFournisseur } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_VARIABLES,
  INITIAL_DEFIBRILLATEURS,
  generateRandomPin,
  formatDateToFR,
  computeProchaineMaintenance,
} from './utils';
import {
  triggerEmail4Signalement,
  triggerEmail5AvisageFSM,
  triggerEmail7CrmReply,
  triggerEmail8NouvelleTourneeTech,
  triggerEmail6RapportIntervention
} from './utils/emailService';

import DefibTab from './components/DefibTab';
import AutresMaterielsTab from './components/AutresMaterielsTab';
import ClientTab from './components/ClientTab';
import VariableTab from './components/VariableTab';
import SettingsModal from './components/SettingsModal';
import StatsModal from './components/StatsModal';
import PublicPortal from './components/PublicPortal';
import ClientPortal from './components/ClientPortal';
import Login from './components/Login';
import StocksTab from './components/StocksTab';
import StocksDistribuesTab from './components/StocksDistribuesTab';
import GedTab from './components/GedTab';
import AchatsFournisseursTab from './components/AchatsFournisseursTab';
import TicketsCaisseTab from './components/TicketsCaisseTab';
import TempsTab from './components/TempsTab';
import LocalisationsTab from './components/LocalisationsTab';
import SatisfactionTab from './components/SatisfactionTab';
import GmaoCorrectionForm from './components/GmaoCorrectionForm';
import ImportExportTab from './components/ImportExportTab';
import SatisfactionFormPage from './components/SatisfactionFormPage';

import {
  Heart,
  Settings,
  Wrench,
  Activity,
  FolderSync,
  Ticket,
  ClipboardList,
  Flame,
  FileSpreadsheet,
  MapPin,
  ThumbsUp,
  Inbox,
  AlertOctagon,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  FileCheck,
  FilePlus,
  UserCheck,
  Search,
  Filter,
  Trash2,
  Lock,
  Clock,
  User,
  Edit,
  Save,
  Check,
  Send,
  X,
  Printer,
  FileText,
  Plus,
  PlusCircle,
  Calendar,
  Layers,
  LogOut,
  Download,
  Eye,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';

export type AppTab = 
  | 'defibrillateurs'
  | 'autres-materiels'
  | 'clients'
  | 'variables'
  | 'fsm'
  | 'gmao'
  | 'crm'
  | 'devis'
  | 'stocks'
  | 'stocks-distribues'
  | 'achats-fournisseurs'
  | 'ged'
  | 'tickets'
  | 'temps'
  | 'localisations'
  | 'satisfaction'
  | 'statistiques'
  | 'parametres'
  | 'import-export';

const INITIAL_OTHER_EQUIPMENTS: OtherEquipment[] = [
  {
    id: 'oe_1',
    identifiant: 'EXT-D18-001',
    clientId: 'c1',
    nomPrenomSite: 'Jean Dupont',
    telephoneSite: '06 12 34 56 78',
    emailSite: 'jean.dupont@secourspro.com',
    contrat: 'Oui',
    nomContrat: 'Contrat Maintenance Extincteurs',
    referenceContrat: 'CTR-EXT-7729',
    debutContrat: '2026-01-01',
    finContrat: '2028-12-31',
    numeroVoie: '12 Rue de la Paix',
    ville: 'Paris',
    codePostal: '75001',
    region: 'Île-de-France',
    pays: 'France',
    latitude: '48.869',
    longitude: '2.332',
    aideAcces: 'Code digicode 4829',
    accesPermanent: 'Non',
    accesJoursOuvres: 'Oui',
    accesWeekend: 'Non',
    installeExterieur: 'Non',
    expirationGarantie: '2029-06-30',
    fabrication: '2025-10-15',
    miseEnService: '2026-01-15',
    derniereMaintenance: '2026-05-15',
    sortieUsine: '2025-11-01',
    prochaineMaintenance: '2027-05-15',
    categorie: 'Extincteur',
    tournee: 'Nord',
    specifiques: {
      agentExtincteur: 'Eau pulvérisée',
      capacite: '6 Litres',
      pressionConforme: 'Conforme',
      plombGoupille: 'Présents / Intacts',
      commentaire: 'Vérification annuelle effectuée RAS.'
    }
  },
  {
    id: 'oe_2',
    identifiant: 'DET-D18-002',
    clientId: 'c2',
    nomPrenomSite: 'Pierre Martin',
    telephoneSite: '07 98 76 54 32',
    emailSite: 'pierre.martin@clinique-erdre.fr',
    contrat: 'Oui',
    nomContrat: 'Contrat Sécurité Incendie',
    referenceContrat: 'CTR-INC-1220',
    debutContrat: '2025-06-15',
    finContrat: '2027-06-14',
    numeroVoie: '105 Route de Paris',
    ville: 'Nantes',
    codePostal: '44000',
    region: 'Pays de la Loire',
    pays: 'France',
    latitude: '47.218',
    longitude: '-1.553',
    aideAcces: 'Entrée principale de la clinique',
    accesPermanent: 'Oui',
    accesJoursOuvres: 'Oui',
    accesWeekend: 'Oui',
    installeExterieur: 'Non',
    expirationGarantie: '2030-12-31',
    fabrication: '2024-12-01',
    miseEnService: '2025-01-10',
    derniereMaintenance: '2026-01-10',
    sortieUsine: '2024-12-10',
    prochaineMaintenance: '2027-01-10',
    categorie: 'Détecteur de fumée',
    tournee: 'Ouest',
    specifiques: {
      remplacementMax: 'Décembre 2034',
      declenchementAerosol: 'Positif',
      testPileFaible: 'Aucun signal',
      propreteChambre: 'Propre',
      commentaire: 'Détecteur de fumée autonome en parfait état de marche.'
    }
  }
];

export default function App() {
  // Database States (declared at top of component to be in scope for handlers)
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Authentication & Session States
  const [tenantId, setTenantIdState] = useState<string>(() => {
    return localStorage.getItem('defib_tenant_id') || 'demo';
  });

  useEffect(() => {
    if (tenantId === 'demo') {
      localStorage.setItem('defib_short_env_id', 'D18');
    } else {
      getRegisteredTenants().then(tenants => {
        const found = tenants.find(t => t.id === tenantId);
        if (found && found.shortEnvId) {
          localStorage.setItem('defib_short_env_id', found.shortEnvId);
        } else {
          localStorage.setItem('defib_short_env_id', 'D18');
        }
      }).catch(err => {
        console.error('Error fetching shortEnvId on startup/change:', err);
      });
    }
  }, [tenantId]);

  const loadedTenantIdRef = useRef<string>('');

  const [isSatisfactionFormPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      return path.includes('/satisfaction') || hash.includes('/satisfaction') || hash.includes('#satisfaction');
    }
    return false;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('defib_admin_logged_in') === 'true');
  const [loggedUser, setLoggedUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('defib_admin_logged_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showEnvLoading, setShowEnvLoading] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1000;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLoginSuccess = (email: string, name: string, activeTenantId?: string, loggedInRole?: string) => {
    const tenantToSet = activeTenantId || 'demo';
    setTenantIdState(tenantToSet);
    setFirebaseTenantId(tenantToSet);
    localStorage.setItem('defib_tenant_id', tenantToSet);

    setIsLoggedIn(true);
    const user = { email, name };
    setLoggedUser(user);
    localStorage.setItem('defib_admin_logged_in', 'true');
    localStorage.setItem('defib_admin_logged_user', JSON.stringify(user));

    const roleToSet = loggedInRole || 'admin';
    localStorage.setItem('defib_logged_user_role', roleToSet);
    setActiveTab('defibrillateurs');

    const emailLower = email.trim().toLowerCase();
    const matchedClient = clients.find(c => c.email && c.email.trim().toLowerCase() === emailLower);

    // Active environment loading screen for admin login (not technician and not client)
    if (emailLower !== 'tech.ouest@defibeo.com' && roleToSet !== 'technicien' && !matchedClient && emailLower !== 'client@demo.com') {
      setShowEnvLoading(true);
      setTimeout(() => {
        // Force an auto-reload to guarantee complete clean memory state and avoid loading dummy data
        window.location.reload();
      }, 1500);
      return;
    }

    if (emailLower === 'tech.ouest@defibeo.com' || roleToSet === 'technicien') {
      const techSession = {
        name: name || 'Technicien',
        role: 'Maintenance Terrain',
        email: emailLower,
        status: 'Actif',
        lastActive: 'En ligne',
        pin: 'xxxx'
      };
      localStorage.setItem('defib_active_tech_session', JSON.stringify(techSession));
      setIsPublicPortalOpen(true);
    } else if (matchedClient) {
      setIsClientPortalOpen(true);
      setActivePortalClient(matchedClient);
    } else if (emailLower === 'client@demo.com') {
      setIsClientPortalOpen(true);
      const spoClient = clients.find(c => c.id === 'c1') || {
        id: 'c1',
        denomination: 'Secours Pro Ouest',
        siret: '12345678901234',
        email: 'contact@secours-ouest.fr',
        phone: '+33 6 12 34 56 78',
        accessKey: 'ABCDE12345',
        nomPrenomSite: 'Jean-Marc DUPONT',
        telephoneSite: '+33 6 12 34 56 78',
        emailSite: 'jm.dupont@secours-ouest.fr',
        contrat: 'Oui',
        nomContrat: 'Abonnement Maintenance Premium',
        referenceContrat: 'REF-2026-SPO',
        debutContrat: '2026-01-01',
        finContrat: '2029-12-31'
      };
      setActivePortalClient(spoClient);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedUser(null);
    setTenantIdState('demo');
    setFirebaseTenantId('demo');
    localStorage.setItem('defib_tenant_id', 'demo');
    localStorage.removeItem('defib_admin_logged_in');
    localStorage.removeItem('defib_admin_logged_user');
    localStorage.removeItem('defib_logged_user_role');
    localStorage.removeItem('defib_active_tech_session');
    setIsPublicPortalOpen(false);
    setIsClientPortalOpen(false);
    setActivePortalClient(null);
  };

  // Auto-route on initial mount or updates if already logged in as Technician or Client
  useEffect(() => {
    if (isLoggedIn && loggedUser) {
      const role = localStorage.getItem('defib_logged_user_role');
      if (loggedUser.email === 'tech.ouest@defibeo.com' || role === 'technicien') {
        setIsPublicPortalOpen(true);
        const techSession = {
          name: loggedUser.name || 'Technicien',
          role: 'Maintenance Terrain',
          email: loggedUser.email,
          status: 'Actif',
          lastActive: 'En ligne',
          pin: 'xxxx'
        };
        if (!localStorage.getItem('defib_active_tech_session')) {
          localStorage.setItem('defib_active_tech_session', JSON.stringify(techSession));
        }
      } else {
        const loggedEmailLower = loggedUser.email.trim().toLowerCase();
        const matchedClient = clients.find(c => c.email && c.email.trim().toLowerCase() === loggedEmailLower);
        if (matchedClient) {
          setIsClientPortalOpen(true);
          setActivePortalClient(matchedClient);
        } else if (loggedEmailLower === 'client@demo.com') {
          setIsClientPortalOpen(true);
          if (!activePortalClient && clients.length > 0) {
            const spoClient = clients.find(c => c.id === 'c1');
            if (spoClient) {
              setActivePortalClient(spoClient);
            }
          }
        }
      }
    }
  }, [isLoggedIn, loggedUser, clients]);

  // Automatic logout after 1 hour of inactivity for all session types (admin, client, technician)
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 3600000); // 1 hour = 3600000 ms
    };

    // Listen to user activity events
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize the inactivity timer
    resetTimer();

    // Attach listeners to document and window
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLoggedIn]);

  // Device Clock
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tab Routing
  const [activeTab, setActiveTab ] = useState<AppTab>('defibrillateurs');
  const [distributedStocksSearchQuery, setDistributedStocksSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isPublicPortalOpen, setIsPublicPortalOpen] = useState(false);
  const [isClientPortalOpen, setIsClientPortalOpen ] = useState(false);
  const [activePortalClient, setActivePortalClient] = useState<Client | null>(null);
  const [showStockForm, setShowStockForm] = useState(false);

  // Ticket UI filters and states
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'Tous' | 'Nouveau' | 'En cours' | 'Résolu'>('Tous');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [repliesDraft, setRepliesDraft] = useState<Record<string, string>>({});

  // Database States
  const [variables, setVariables] = useState<Variable[]>([]);
  const [defibrillateurs, setDefibrillateurs] = useState<Defibrillateur[]>([]);
  const [otherEquipments, setOtherEquipments] = useState<OtherEquipment[]>([]);
  const [pointagesAutoVigilance, setPointagesAutoVigilance] = useState<PointageAutoVigilance[]>([]);
  const [enableOtherEquipments, setEnableOtherEquipments] = useState<string>(() => {
    return localStorage.getItem('defib_enable_other_equipments') || 'Non';
  });
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [fsmOpenPieceDropdownId, setFsmOpenPieceDropdownId] = useState<string | null>(null);
  const [fsmPieceSearch, setFsmPieceSearch] = useState('');
  const [fsmSearchQuery, setFsmSearchQuery] = useState('');
  const [gmaoSearchQuery, setGmaoSearchQuery] = useState('');
  const [fsmDateFilter, setFsmDateFilter] = useState<string>('Tous');
  const [fsmTourDrafts, setFsmTourDrafts] = useState<Record<string, any>>({});
  const [savingTourIds, setSavingTourIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const key = `defib_${tenantId}_stocks`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setStocks(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultStocks: StockRecord[] = tenantId === 'demo' ? [
        {
          id: 'st_1',
          denominationPieceId: 'v_el_1',
          quantite: 45,
          livraisonDate: '2026-04-12',
          reapprovisionnementDate: '2026-06-15',
          valeurAchat: 45.00,
          marge: 44.00,
          prixVenteHt: 89.00,
          stockage: 'Entrepôt A'
        },
        {
          id: 'st_2',
          denominationPieceId: 'v_el_p_1',
          quantite: 12,
          livraisonDate: '2026-03-22',
          reapprovisionnementDate: '2026-07-01',
          valeurAchat: 60.00,
          marge: 59.00,
          prixVenteHt: 119.00,
          stockage: 'Entrepôt B'
        },
        {
          id: 'st_3',
          denominationPieceId: 'v_bat_1',
          quantite: 18,
          livraisonDate: '2026-01-10',
          reapprovisionnementDate: '2026-06-30',
          valeurAchat: 110.00,
          marge: 89.00,
          prixVenteHt: 199.00,
          stockage: 'Véhicule A'
        },
        {
          id: 'st_4',
          denominationPieceId: 'v_def_2',
          quantite: 3,
          livraisonDate: '2026-05-02',
          reapprovisionnementDate: '2026-08-15',
          valeurAchat: 1200.50,
          marge: 450.00,
          prixVenteHt: 1650.50,
          stockage: 'Entrepôt A'
        },
        {
          id: 'st_srv_1',
          denominationPieceId: 'v_srv_1',
          quantite: 9991, // Virtual large quantity for services
          livraisonDate: '2026-01-01',
          reapprovisionnementDate: '2026-06-01',
          valeurAchat: 0,
          marge: 150.00,
          prixVenteHt: 150.00,
          stockage: 'Siège'
        },
        {
          id: 'st_srv_2',
          denominationPieceId: 'v_srv_2',
          quantite: 9992,
          livraisonDate: '2026-01-01',
          reapprovisionnementDate: '2026-06-01',
          valeurAchat: 0,
          marge: 120.00,
          prixVenteHt: 120.00,
          stockage: 'Siège'
        }
      ] : [];
      setStocks(defaultStocks);
      localStorage.setItem(key, JSON.stringify(defaultStocks));
    }
  }, [activeTab, tenantId]);

  const [distributedStocks, setDistributedStocks] = useState<DistributedStockLocation[]>([]);

  useEffect(() => {
    const key = `defib_${tenantId}_distributed_stocks`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setDistributedStocks(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultDistrib: DistributedStockLocation[] = tenantId === 'demo' ? [
        {
          id: 'ds_1',
          denominationPieceId: 'v_el_1',
          locationName: 'Entrepôt A',
          volumeDisponible: 15,
          volumeReserve: 5,
          volumeEntrant: 2,
        },
        {
          id: 'ds_2',
          denominationPieceId: 'v_el_p_1',
          locationName: 'Véhicule A',
          volumeDisponible: 8,
          volumeReserve: 2,
          volumeEntrant: 0,
        },
        {
          id: 'ds_3',
          denominationPieceId: 'v_bat_1',
          locationName: 'Véhicule B',
          volumeDisponible: 5,
          volumeReserve: 1,
          volumeEntrant: 3,
        }
      ] : [];
      setDistributedStocks(defaultDistrib);
      localStorage.setItem(key, JSON.stringify(defaultDistrib));
    }
  }, [activeTab, tenantId]);

  const saveStocks = (updated: StockRecord[]) => {
    setStocks(updated);
    localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(updated));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('stocks', updated);
    }
  };

  const saveDistributedStocks = (updated: DistributedStockLocation[]) => {
    setDistributedStocks(updated);
    localStorage.setItem(`defib_${tenantId}_distributed_stocks`, JSON.stringify(updated));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('distributed_stocks', updated);
    }
  };
  
  // Custom states added for Public Portal & CRM Incident Ticketing
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Défibeo Solutions",
    logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&auto=format&fit=crop",
    website: "29382302.defibeo.com",
    email: "contact@defibeo-solutions.com",
    phone: "+33 1 47 20 00 01"
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [savedMemosMap, setSavedMemosMap] = useState<Record<string, boolean>>({});
  const [activeUser, setActiveUser] = useState<Member | null>(null);
  const [pointages, setPointages] = useState<PointageLog[]>([]);
  const [commercialDocs, setCommercialDocs] = useState<CommercialDoc[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isDocFormOpen, setIsDocFormOpen] = useState(false);

  const [docType, setDocType] = useState<'Devis' | 'Facture' | 'Proforma'>('Devis');
  const [docRef, setDocRef] = useState('');
  const [docClientId, setDocClientId] = useState('');
  const [docDateStr, setDocDateStr] = useState('');
  const [docStatus, setDocStatus] = useState<'Brouillon' | 'Terminé' | 'Accepté' | 'Refusé' | 'Annulé' | 'Supprimé'>('Brouillon');
  const [docItems, setDocItems] = useState<CommercialDocItem[]>([]);
  const [docCommentaire, setDocCommentaire] = useState('');
  const [docAssignedMemberName, setDocAssignedMemberName] = useState('');
  const [docHasBonCommande, setDocHasBonCommande] = useState(false);
  const [docBonCommandeReference, setDocBonCommandeReference] = useState('');
  const [docBonCommandeLivraison, setDocBonCommandeLivraison] = useState<'Intervention d\'un technicien' | 'Transporteur'>('Transporteur');
  const [docBonCommandeSituation, setDocBonCommandeSituation] = useState<'Ouvert' | 'Envoyé Terminé' | 'Envoyé Logistique' | 'Terminé'>('Ouvert');

  const [selectedDocPieceId, setSelectedDocPieceId] = useState('');
  const [customDocPiecePrice, setCustomDocPiecePrice] = useState(0);
  const [customDocPieceQty, setCustomDocPieceQty] = useState(1);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'Tous' | 'Devis' | 'Facture'>('Tous');

  const [customerReviews, setCustomerReviews] = useState<any[]>([]);

  const [achatsFournisseurs, setAchatsFournisseurs] = useState<AchatFournisseur[]>([]);

  const saveAchatsFournisseurs = (updated: AchatFournisseur[]) => {
    setAchatsFournisseurs(updated);
    localStorage.setItem(`defib_${tenantId}_achats_fournisseurs`, JSON.stringify(updated));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('achats_fournisseurs', updated);
    }
  };

  const [gedDocs, setGedDocs] = useState<GedDocument[]>([]);
  const [isGedFormOpen, setIsGedFormOpen] = useState(false);
  const [gedTitle, setGedTitle] = useState('');
  const [gedCategory, setGedCategory] = useState<'Manuel de conformité' | "Fiche de visite d'audit" | 'Autre'>('Manuel de conformité');
  const [gedFileName, setGedFileName] = useState('');
  const [selectedGedFile, setSelectedGedFile] = useState<File | null>(null);


  useEffect(() => {
    const key = `defib_${tenantId}_customer_reviews`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setCustomerReviews(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultReviews = tenantId === 'demo' ? [
        {
          id: 'rev-1',
          clientName: 'Secours Pro Ouest (Jean-Marc DUPONT)',
          comment: "Excellent travail ! Le technicien Thierry a été très soigné et a remplacé les piles rapidement en expliquant le fonctionnement du boîtier thermique.",
          label: 'Excellent'
        },
        {
          id: 'rev-2',
          clientName: 'Espace Vert Bordeaux (Marc VIGNAL)',
          comment: "L'intervention s'est déroulée à l'heure convenue. Explications claires et professionnalisme au rendez-vous. Matériel de rechange disponible immédiatement.",
          label: 'Parfait'
        },
        {
          id: 'rev-3',
          clientName: 'Gymnase Jean Bouin (Stéphanie LEFEVRE)',
          comment: "Remplacement de l'appareil effectué comme prévu. Cependant, l'un des autocollants signalétiques était légèrement corné.",
          label: 'Moyen'
        },
        {
          id: 'rev-4',
          clientName: 'Hôtel Splendid Nantes',
          comment: "Le technicien a oublié de nous laisser le document papier de visite, bien que nous l'ayons reçu par e-mail peu après.",
          label: 'Décevant'
        },
        {
          id: 'rev-5',
          clientName: 'Camping des Pins',
          comment: "Délai de passage non respecté deux fois de suite, aucune notification de retard reçue. Nous attendons un geste commercial.",
          label: 'Médiocre'
        }
      ] : [];
      setCustomerReviews(defaultReviews);
      localStorage.setItem(key, JSON.stringify(defaultReviews));
    }
  }, [isPublicPortalOpen, activeTab, tenantId]);

  const saveReviews = (updated: any[]) => {
    setCustomerReviews(updated);
    localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(updated));
  };

  const [editingPointageId, setEditingPointageId] = useState<string | null>(null);
  const [editPointageForm, setEditPointageForm] = useState<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  } | null>(null);

  // Reload pointages from localStorage when portal closes or tab changes
  useEffect(() => {
    const key = `defib_${tenantId}_pointages_history`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setPointages(JSON.parse(saved));
    } else {
      setPointages([]);
    }
  }, [isPublicPortalOpen, activeTab, tenantId]);

  // Load expenses/tickets from localStorage when portal closes or tab changes
  const [expenses, setExpenses] = useState<any[]>([]);
  useEffect(() => {
    const key = `defib_${tenantId}_expenses`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultExpenses = tenantId === 'demo' ? [
        {
          id: 'exp-1',
          techName: 'Thierry Martin',
          title: 'Abonnement Parking Nantes',
          amountTtc: 18.20,
          amountHt: 15.17,
          amountTva: 3.03,
          dateStr: '2026-06-02',
          photoUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&auto=format&fit=crop'
        },
        {
          id: 'exp-2',
          techName: 'Marc VIGNAL',
          title: 'Achat consommables - Électrodes Lot A3',
          amountTtc: 220.00,
          amountHt: 183.33,
          amountTva: 36.67,
          dateStr: '2026-06-03',
          photoUrl: ''
        },
        {
          id: 'exp-3',
          techName: 'Thierry LEFEBVRE',
          title: 'Batteries Spécifiques Type B2 (x2)',
          amountTtc: 2550.00,
          amountHt: 2125.00,
          amountTva: 425.00,
          dateStr: '2026-06-01',
          photoUrl: ''
        }
      ] : [];
      setExpenses(defaultExpenses);
      localStorage.setItem(key, JSON.stringify(defaultExpenses));
    }
  }, [isPublicPortalOpen, activeTab, tenantId]);

  // Sync and manage technician generated reports in main GMAO tab
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editReportForm, setEditReportForm] = useState<{
    title: string;
    techName: string;
    defibIdentifiant: string;
    siteMission: string;
  } | null>(null);

  useEffect(() => {
    const key = `defib_${tenantId}_generated_reports`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setGeneratedReports(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultReports = tenantId === 'demo' ? [
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
      ] : [];
      setGeneratedReports(defaultReports);
      localStorage.setItem(key, JSON.stringify(defaultReports));
    }
  }, [isPublicPortalOpen, activeTab, tenantId]);

  const saveReports = (updated: any[]) => {
    setGeneratedReports(updated);
    try {
      localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage quota exceeded in saveReports:", e);
    }
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('generatedReports', updated);
    }
  };

  const [fsmTours, setFsmTours] = useState<any[]>([]);

  useEffect(() => {
    const key = `defib_${tenantId}_fsm_tours`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setFsmTours(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultTours = tenantId === 'demo' ? [
        {
          id: 'fsm-tour-1',
          title: 'Tournée Nantes Hyper-Centre',
          techName: 'Thierry LEFEBVRE',
          startDate: '2026-06-08',
          status: 'À faire',
          missions: [
            {
              id: 'fsm-m-1',
              clientName: 'Jean-Marc DUPONT (SPO-891)',
              defibIdentifiant: 'PAR-101',
              reason: 'Remplacement B',
              requiredParts: ['Batterie Lithium 5 ans'],
              status: 'À faire',
              priority: 'Haute',
              time: '14:00'
            },
            {
              id: 'fsm-m-2',
              clientName: 'Espace Vert Nantes (EVB-411)',
              defibIdentifiant: 'PAR-102',
              reason: 'Remplacer B & A',
              requiredParts: ['Batterie Lithium 5 ans', 'Électrodes Adultes'],
              status: 'Effectué',
              priority: 'Normale',
              time: '16:30'
            }
          ]
        },
        {
          id: 'fsm-tour-2',
          title: 'Tournée Agglomération Ouest',
          techName: 'Marc VIGNAL',
          startDate: '2026-06-09',
          status: 'En cours',
          missions: [
            {
              id: 'fsm-m-3',
              clientName: 'Gymnase Jean Bouin (GJB-330)',
              defibIdentifiant: 'PAR-105',
              reason: 'Mise en service',
              requiredParts: ['Signalétique DAE Normative', 'Boîtier Mural Chauffant Aivia'],
              status: 'En cours',
              priority: 'Normale',
              time: '09:30'
            }
          ]
        }
      ] : [];
      setFsmTours(defaultTours);
      localStorage.setItem(key, JSON.stringify(defaultTours));
    }
  }, [isPublicPortalOpen, activeTab, tenantId]);

  const saveFsmTours = (updated: any[]) => {
    setFsmTours(updated);
    localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(updated));
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('fsmTours', updated);
    }
  };

  const addFsmTour = () => {
    const newId = 'fsm-tour-' + Date.now();
    const defaultTech = members.find(m => m.role === 'Maintenance Terrain' || m.role?.toLowerCase().includes('tech'))?.name || members[0]?.name || '';
    setFsmTourDrafts(prev => ({
      ...prev,
      [newId]: {
        title: 'Nouvelle Tournée',
        techName: defaultTech
      }
    }));
    const newTour = {
      id: newId,
      title: 'Nouvelle Tournée',
      techName: defaultTech,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Brouillon',
      missions: []
    };
    saveFsmTours([newTour, ...fsmTours]);
  };

  const deleteFsmTour = (tourId: string) => {
    const tour = fsmTours.find(t => t.id === tourId);
    if (tour && tour.missions) {
      let updatedStocks = stocks.map(st => ({
        ...st,
        quantite: Number(st.quantite) || 0,
        quantiteReservee: Number(st.quantiteReservee) || 0
      }));
      let mutated = false;
      tour.missions.forEach((mission: any) => {
        if (mission.requiredParts && mission.requiredParts.length > 0) {
          mission.requiredParts.forEach((partName: string) => {
            const idx = updatedStocks.findIndex(st => {
              const vObj = variables.find(v => v.id === st.denominationPieceId);
              return vObj && vObj.nom === partName && st.quantiteReservee > 0;
            });
            const idxToUse = idx !== -1 ? idx : updatedStocks.findIndex(st => {
              const vObj = variables.find(v => v.id === st.denominationPieceId);
              return vObj && vObj.nom === partName;
            });
            if (idxToUse !== -1) {
              const item = updatedStocks[idxToUse];
              updatedStocks[idxToUse] = {
                ...item,
                quantite: item.quantite + 1,
                quantiteReservee: Math.max(0, item.quantiteReservee - 1)
              };
              mutated = true;
            }
          });
        }
      });
      if (mutated) {
        saveStocks(updatedStocks);
      }
    }
    saveFsmTours(fsmTours.filter(t => t.id !== tourId));
  };

  const updateFsmTour = (tourId: string, fields: any) => {
    const existingTour = fsmTours.find(t => t.id === tourId);
    const oldStatus = existingTour?.status || 'Brouillon';
    const newStatus = fields.status || oldStatus;

    saveFsmTours(fsmTours.map(t => t.id === tourId ? { ...t, ...fields } : t));

    if (newStatus === 'À faire' && oldStatus !== 'À faire' && existingTour) {
      const companyName = companyInfo.name || 'Défibeo Suite';
      const companyEmail = companyInfo.email || '';
      
      const tourTitle = fields.title !== undefined ? fields.title : (existingTour.title || '');
      const techName = fields.techName !== undefined ? fields.techName : (existingTour.techName || '');
      const startDate = fields.startDate !== undefined ? fields.startDate : (existingTour.startDate || '');
      
      let formattedDate = startDate;
      if (startDate && startDate.includes('-')) {
        const parts = startDate.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Email 5: AVISAGE FSM DESTINÉ AUX CLIENTS
      try {
        const toursMissions = existingTour.missions || [];
        let updatedClientsList = [...clients];
        let hasUpdatedClient = false;

        toursMissions.forEach((m: any) => {
          const defibId = m.defibIdentifiant;
          const defib = defibrillateurs.find(df => df.identifiant === defibId);
          if (defib) {
            const index = updatedClientsList.findIndex(c => c.id === defib.clientId);
            if (index !== -1) {
              const matchedClient = updatedClientsList[index];
              const clientEmail = defib.emailSite || matchedClient.email || matchedClient.emailSite;
              if (clientEmail && clientEmail.trim()) {
                const pin = matchedClient.signaturePin || generateRandomPin();
                const newPins = [...(matchedClient.signaturePins || [])];
                if (!newPins.some(p => p.code.toUpperCase() === pin.toUpperCase())) {
                  newPins.push({
                    code: pin,
                    createdAt: new Date().toISOString(),
                    status: 'émis'
                  });
                }
                updatedClientsList[index] = {
                  ...matchedClient,
                  signaturePin: pin,
                  signaturePins: newPins
                };
                hasUpdatedClient = true;

                triggerEmail5AvisageFSM(
                  clientEmail.trim(),
                  defibId,
                  companyName,
                  companyEmail,
                  formattedDate || 'prochainement',
                  pin
                ).catch(e => console.error("Error sending Email 5:", e));
              }
            }
          }
        });

        if (hasUpdatedClient) {
          saveClients(updatedClientsList);
        }
      } catch (err5) {
        console.error("Error triggering Email 5 sequence:", err5);
      }

      // Email 8: NOUVELLE TOURNÉE POUR LE TECHNICIEN
      try {
        const matchingTech = members.find(m => m.name === techName);
        const techEmail = matchingTech?.email;
        if (techEmail && techEmail.trim()) {
          triggerEmail8NouvelleTourneeTech(
            techEmail.trim(),
            tourTitle || 'Tournée d’interventions',
            formattedDate || 'prochainement',
            companyName,
            companyEmail
          ).catch(e => console.error("Error sending Email 8:", e));
        }
      } catch (err8) {
        console.error("Error triggering Email 8:", err8);
      }
    }
  };

  const addFsmMission = (tourId: string) => {
    const newMission = {
      id: 'fsm-m-' + Date.now(),
      clientName: 'Nouveau Site Client',
      defibIdentifiant: 'PAR-101',
      reason: 'Maintenance',
      requiredParts: [],
      status: 'À faire',
      priority: 'Normale',
      time: '14:00'
    };
    saveFsmTours(fsmTours.map(t => {
      if (t.id === tourId) {
        return { ...t, missions: [...t.missions, newMission] };
      }
      return t;
    }));
  };

  const deleteFsmMission = (tourId: string, missionId: string) => {
    const tour = fsmTours.find(t => t.id === tourId);
    const mission = tour?.missions.find((m: any) => m.id === missionId);
    if (mission && mission.requiredParts && mission.requiredParts.length > 0) {
      let updatedStocks = stocks.map(st => ({
        ...st,
        quantite: Number(st.quantite) || 0,
        quantiteReservee: Number(st.quantiteReservee) || 0
      }));
      let mutated = false;
      mission.requiredParts.forEach((partName: string) => {
        const idx = updatedStocks.findIndex(st => {
          const vObj = variables.find(v => v.id === st.denominationPieceId);
          return vObj && vObj.nom === partName && st.quantiteReservee > 0;
        });
        const idxToUse = idx !== -1 ? idx : updatedStocks.findIndex(st => {
          const vObj = variables.find(v => v.id === st.denominationPieceId);
          return vObj && vObj.nom === partName;
        });
        if (idxToUse !== -1) {
          const item = updatedStocks[idxToUse];
          updatedStocks[idxToUse] = {
            ...item,
            quantite: item.quantite + 1,
            quantiteReservee: Math.max(0, item.quantiteReservee - 1)
          };
          mutated = true;
        }
      });
      if (mutated) {
        saveStocks(updatedStocks);
      }
    }

    saveFsmTours(fsmTours.map(t => {
      if (t.id === tourId) {
        return { ...t, missions: t.missions.filter(m => m.id !== missionId) };
      }
      return t;
    }));
  };

  const changeFsmMissionParts = (tourId: string, missionId: string, oldParts: string[], newParts: string[]) => {
    const added = newParts.filter(p => !oldParts.includes(p));
    const removed = oldParts.filter(p => !newParts.includes(p));

    let updatedStocks = stocks.map(st => ({
      ...st,
      quantite: Number(st.quantite) || 0,
      quantiteReservee: Number(st.quantiteReservee) || 0
    }));
    let stocksMutated = false;

    added.forEach(partName => {
      const stockIdx = updatedStocks.findIndex(st => {
        const vObj = variables.find(v => v.id === st.denominationPieceId);
        return vObj && vObj.nom === partName && st.quantite > 0;
      });

      const idxToUse = stockIdx !== -1 ? stockIdx : updatedStocks.findIndex(st => {
        const vObj = variables.find(v => v.id === st.denominationPieceId);
        return vObj && vObj.nom === partName;
      });

      if (idxToUse !== -1) {
        const item = updatedStocks[idxToUse];
        updatedStocks[idxToUse] = {
          ...item,
          quantite: Math.max(0, item.quantite - 1),
          quantiteReservee: item.quantiteReservee + 1
        };
        stocksMutated = true;
      }
    });

    removed.forEach(partName => {
      const stockIdx = updatedStocks.findIndex(st => {
        const vObj = variables.find(v => v.id === st.denominationPieceId);
        return vObj && vObj.nom === partName && st.quantiteReservee > 0;
      });

      const idxToUse = stockIdx !== -1 ? stockIdx : updatedStocks.findIndex(st => {
        const vObj = variables.find(v => v.id === st.denominationPieceId);
        return vObj && vObj.nom === partName;
      });

      if (idxToUse !== -1) {
        const item = updatedStocks[idxToUse];
        updatedStocks[idxToUse] = {
          ...item,
          quantite: item.quantite + 1,
          quantiteReservee: Math.max(0, item.quantiteReservee - 1)
        };
        stocksMutated = true;
      }
    });

    if (stocksMutated) {
      saveStocks(updatedStocks);
    }
    updateFsmMission(tourId, missionId, { requiredParts: newParts });
  };

  const updateFsmMission = (tourId: string, missionId: string, fields: any) => {
    saveFsmTours(fsmTours.map(t => {
      if (t.id === tourId) {
        return {
          ...t,
          missions: t.missions.map(m => m.id === missionId ? { ...m, ...fields } : m)
        };
      }
      return t;
    }));
  };

  const handleDownloadReport = (report: any) => {
    const snapshot = report.defibSnapshot || {};

    if (snapshot.categorie && snapshot.categorie !== 'Défibrillateur') {
      const clientFound = clients.find(c => c.id === snapshot.clientId);
      const clientName = clientFound ? clientFound.denomination : (snapshot.nomPrenomSite || 'Non rattaché');

      // Filter out typical top-level keys to get custom equipment properties!
      const topLevelKeys = [
        'id', 'clientId', 'nomPrenomSite', 'telephoneSite', 'emailSite', 'contrat', 'nomContrat', 'referenceContrat',
        'debutContrat', 'finContrat', 'pays', 'codePostal', 'cp', 'ville', 'adresseComplexe', 'identifiant',
        'codeNfc', 'statutGmao', 'categorie', 'conforme', 'miseEnServiceDate', 'miseEnService', 'commentaireGmao'
      ];
      
      const customProperties = Object.entries(snapshot).filter(([k, v]) => {
        return !topLevelKeys.includes(k) && v !== undefined && v !== null && v !== '' && typeof v !== 'object';
      });

      const compLogo = companyInfo.logo || '';
      const compName = companyInfo.name || 'Défibeo Solutions';
      const compEmail = companyInfo.email || '';
      const compPhone = companyInfo.phone || '';
      const compWebsite = companyInfo.website || '';

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || '-'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
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
              font-family: "Gochi";
              src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            * {
              box-sizing: border-box;
              font-family: "Civilprom", "Inter", sans-serif !important;
              font-weight: 100 !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              font-family: "Civilprom", "Inter", sans-serif !important;
              background-color: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #print-container {
              width: 210mm;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .pdf-page {
              position: relative;
              width: 210mm;
              height: 297mm;
              padding: 20mm 15mm;
              box-sizing: border-box;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 15px;
              page-break-after: always;
              break-after: page;
            }
            .pdf-header {
              font-family: "Gochi", cursive !important;
              font-size: 32px;
              font-weight: normal !important;
              text-align: center;
              color: #000000;
              margin-top: -10px;
              margin-bottom: 4px;
            }
            .pdf-grid {
              display: flex;
              flex-direction: column;
              gap: 12px;
              width: 100%;
            }
            .pdf-card {
              border: 1px solid rgb(201, 190, 205);
              border-radius: 14px;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pdf-card-header {
              padding: 10px 14px 2px 14px;
              font-size: 18px;
              color: #000000;
            }
            .pdf-card-body {
              padding: 8px 14px 12px 14px;
              font-size: 16px;
              display: flex;
              flex-direction: column;
              gap: 4px;
              color: #000000;
            }
            .pdf-line {
              color: #000000;
              line-height: 1.35;
              font-size: 16px;
            }
            .pdf-label {
              color: rgb(138, 138, 138);
            }
            .pdf-bold {
              color: #000000;
            }
            .pdf-footer {
              position: absolute;
              bottom: 15mm;
              right: 15mm;
              font-size: 11px;
              color: #000000;
            }
          </style>
        </head>
        <body class="bg-white">
          <div id="print-container">
            <div class="pdf-page">
              <div class="pdf-header">
                ${report.title ? report.title : `Rapport d’intervention - ${snapshot.categorie}`}
              </div>
              
              <div style="font-family: 'Civilprom', sans-serif !important; font-size: 18px; text-align: center; color: #000000; margin-bottom: 8px; line-height: 1.4;">
                Conservez et archivez consciencieusement ce certificat technique GMAO pour vos obligations d'entretien.
              </div>

              <div class="pdf-grid">
                <!-- SECTION 1 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">1 — Coordonnées du mainteneur.</div>
                  <div class="pdf-card-body" style="align-items: flex-start; justify-content: flex-start; text-align: left; gap: 4px;">
                    ${compLogo ? `<img src="${compLogo}" style="max-height: 40px; max-width: 300px; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ''}
                    <div class="pdf-line pdf-bold" style="font-size: 16px; margin-bottom: 2px;">${compName}</div>
                    <div class="pdf-line"><span class="pdf-label">Email :</span> <span class="pdf-bold">${compEmail || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Tél :</span> <span class="pdf-bold">${compPhone || ''}</span></div>
                    <div class="pdf-line" style="margin-top: 2px;"><a href="https://${compWebsite}" target="_blank" style="color: #2563eb; text-decoration: underline;">${compWebsite}</a></div>
                  </div>
                </div>

                <!-- SECTION 2 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">2 — Infos client & contrat.</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Contact sur place :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Sous contrat :</span> <span class="pdf-bold">${snapshot.contrat || 'Non'}</span></div>
                    ${snapshot.contrat === 'Oui' ? `
                      <div class="pdf-line"><span class="pdf-label">Nom du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ''}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Référence contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ''}</span></div>
                    ` : ''}
                  </div>
                </div>

                <!-- SECTION 3 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">3 — Spécifications du matériel (${snapshot.categorie}).</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Catégorie :</span> <span class="pdf-bold">${snapshot.categorie || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Identifiant unique :</span> <span class="pdf-bold">${snapshot.identifiant || ''}</span></div>
                    ${snapshot.codeNfc ? `<div class="pdf-line"><span class="pdf-label">Code NFC :</span> <span class="pdf-bold">${snapshot.codeNfc}</span></div>` : ''}
                    <div class="pdf-line"><span class="pdf-label">Statut GMAO :</span> <span class="pdf-bold">${snapshot.statutGmao || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Mise en service :</span> <span class="pdf-bold">${snapshot.miseEnServiceDate || snapshot.miseEnService || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Conformité générale :</span> <span class="pdf-bold ${snapshot.conforme === 'Non' ? 'text-rose-600 font-bold' : 'text-emerald-600'}">${snapshot.conforme || 'Oui'}</span></div>
                  </div>
                </div>
              </div>
              <div class="pdf-footer">Page 1 / 2</div>
            </div>

            <!-- PAGE 2 -->
            <div class="pdf-page">
              <div class="pdf-grid">
                <!-- CUSTOM SECTION / CHECKPOINTS -->
                ${customProperties.length > 0 ? `
                  <div class="pdf-card">
                    <div class="pdf-card-header">4 — Paramètres spécifiques & Vérifications.</div>
                    <div class="pdf-card-body">
                      ${customProperties.map(([key, val]) => `
                        <div class="pdf-line"><span class="pdf-label" style="text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}:</span> <span class="pdf-bold">${val}</span></div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- ACTIONS, NOTES & CAPTURE EVIDENCE -->
                <div class="pdf-card">
                  <div class="pdf-card-header">5 — Clôture de l'intervention.</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Technicien intervenant :</span> <span class="pdf-bold">${report.techName || 'Administrateur'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Date d’intervention :</span> <span class="pdf-bold">${report.date || '-'}</span></div>
                    ${report.endTimeStamp ? `<div class="pdf-line"><span class="pdf-label">Heure de fin :</span> <span class="pdf-bold">${report.endTimeStamp}</span></div>` : ''}
                    <div class="pdf-line" style="margin-bottom: 4px;">
                      <span class="pdf-label">Commentaire / Remarques :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireGmao || snapshot.commentaire || 'Aucun commentaire.'}</span>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%; padding-top: 8px; margin-top: 4px;">
                      <!-- Photo -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Photographie terrain.</div>
                        ${report.photoUrl ? `
                          <div style="border: none; border-radius: 4px; overflow: hidden; background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 120px; max-width: 200px;">
                            <img src="${report.photoUrl}" style="max-height: 120px; max-width: 200px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                          </div>
                        ` : '<div style="font-size: 15px; color: #a1a1a1; font-style: italic;">Aucune photographie</div>'}
                      </div>

                      <!-- Signature Technicien -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                        ${report.techSignature ? `
                          <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                            <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                          </div>
                        ` : `
                          <div style="font-size: 15px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `}
                      </div>

                      <!-- Signature Client -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                        ${report.clientPinCode ? `
                          <div style="font-size: 11px; margin-bottom: 2px;">
                            <span class="pdf-label" style="font-size:11px; color:#555;">Code validation:</span> 
                            <span class="pdf-bold" style="font-size:11px; font-family: monospace !important; font-weight: bold !important; color:#000;">${report.clientPinCode}</span>
                          </div>
                        ` : ''}
                        ${clientFound && clientFound.clientSignatureImage ? `
                          <div style="background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; gap: 2px;">
                            <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                            <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">Signé électroniquement</div>
                          </div>
                        ` : `
                          ${report.clientPinCode ? `
                            <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">
                              Signé électroniquement par PIN (${report.clientPinCode})
                            </div>
                          ` : `
                            <div style="font-size: 13px; color: #a1a1a1; font-style: italic;">
                              Non signée
                            </div>
                          `}
                        `}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pdf-footer">Page 2 / 2</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${snapshot.identifiant || report.defibIdentifiant || 'intervention'}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

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

    const electrodeASecoursModel = variables.find(v => v.id === snapshot.modeleElectrodeASecoursId);
    const electrodeASecoursModelName = electrodeASecoursModel ? `${electrodeASecoursModel.marque} ${electrodeASecoursModel.nom}` : '';

    const electrodePModel = variables.find(v => v.id === snapshot.modeleElectrodePId);
    const electrodePModelName = electrodePModel ? `${electrodePModel.marque} ${electrodePModel.nom}` : (snapshot.modeleElectrodePId || 'Non spécifié');

    const electrodePSecoursModel = variables.find(v => v.id === snapshot.modeleElectrodePSecoursId);
    const electrodePSecoursModelName = electrodePSecoursModel ? `${electrodePSecoursModel.marque} ${electrodePSecoursModel.nom}` : '';

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

    // Helper to resolve service label
    const getServiceLabel = (serviceId: string) => {
      if (!serviceId) return '';
      const stockItem = stocks.find((s: any) => s.id === serviceId);
      if (stockItem) {
        const variable = variables.find((v: any) => v.id === stockItem.denominationPieceId);
        return variable ? `${variable.nom} (${variable.marque})` : 'Service';
      }
      const variable = variables.find((v: any) => v.id === serviceId);
      if (variable) {
        return `${variable.nom} (${variable.marque})`;
      }
      return serviceId;
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
            font-family: "Gochi";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }

          * {
            box-sizing: border-box;
            font-family: "Civilprom", "Inter", sans-serif !important;
            font-weight: 100 !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            font-family: "Civilprom", "Inter", sans-serif !important;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #print-container {
            width: 210mm;
            margin: 0 auto;
            background-color: #ffffff;
          }

          .pdf-page {
            position: relative;
            width: 210mm;
            height: 297mm;
            padding: 20mm 15mm;
            box-sizing: border-box;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 15px;
            page-break-after: always;
            break-after: page;
          }

          .pdf-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          .pdf-header {
            font-family: "Gochi", cursive !important;
            font-size: 32px;
            font-weight: normal !important;
            text-align: center;
            color: #000000;
            margin-top: -10px;
            margin-bottom: 4px;
            padding: 0;
            border: none;
          }

          .pdf-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }

          .pdf-card {
            border: 1px solid rgb(201, 190, 205);
            border-radius: 14px;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pdf-card-header {
            background-color: transparent;
            color: #000000;
            border-bottom: none;
            font-size: 18px;
            font-weight: 100 !important;
            text-align: left;
            padding: 10px 14px 2px 14px;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-card-body {
            padding: 8px 14px 12px 14px;
            font-size: 16px;
            font-family: "Civilprom", sans-serif !important;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
            color: #000000;
          }

          .pdf-line {
            color: #000000;
            line-height: 1.35;
            font-size: 16px;
            text-align: left;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-label {
            color: rgb(138, 138, 138);
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-bold {
            font-weight: 100 !important;
            color: #000000;
            font-family: "Civilprom", sans-serif !important;
          }

          .pdf-footer {
            position: absolute;
            bottom: 15mm;
            right: 15mm;
            font-size: 11px;
            color: #000000;
            font-family: "Civilprom", sans-serif;
            font-weight: 100 !important;
          }
        </style>
      </head>
      <body class="bg-white">
        
        <div id="print-container">

          <!-- PAGE 1 -->
          <div class="pdf-page">
            <div class="pdf-header">
              ${report.title ? report.title : 'Rapport d’intervention GMAO'}
            </div>

            <div style="font-family: 'Civilprom', sans-serif !important; font-size: 18px; text-align: center; color: #000000; margin-bottom: 8px; line-height: 1.4;">
              Utilisez ce lien pour vous connecter à l’accès client, envoyer une demande ou signaler un problème&nbsp;: 
              <a href="https://defibeo.deroesch.com/" target="_blank" style="color: #2563eb; text-decoration: underline;">https://defibeo.deroesch.com/</a>
              <br />
              Nous vous recommandons de conserver et archiver le présent document.
            </div>

            <div class="pdf-grid">
              <!-- SECTION 1 -->
              <div class="pdf-card">
                <div class="pdf-card-header">1 — Coordonnées du mainteneur.</div>
                <div class="pdf-card-body" style="align-items: flex-start; justify-content: flex-start; text-align: left; gap: 4px;">
                  ${compLogo ? `<img src="${compLogo}" style="max-height: 40px; max-width: 300px; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ''}
                  <div class="pdf-line pdf-bold" style="font-size: 16px; margin-bottom: 2px;">${compName}</div>
                  <div class="pdf-line"><span class="pdf-label">Email :</span> <span class="pdf-bold">${compEmail || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Tél :</span> <span class="pdf-bold">${compPhone || ''}</span></div>
                  <div class="pdf-line" style="margin-top: 2px;"><a href="https://${compWebsite}" target="_blank" style="color: #2563eb; text-decoration: underline;">${compWebsite}</a></div>
                </div>
              </div>

              <!-- SECTION 2 -->
              <div class="pdf-card">
                <div class="pdf-card-header">2 — Infos défibrillateur.</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Contact :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Identifiant :</span> <span class="pdf-bold">${snapshot.identifiant || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Série :</span> <span class="pdf-bold">${snapshot.numeroSerie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Modèle :</span> <span class="pdf-bold">${snapshot.modeleId ? defibModelName : ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Contrat :</span> <span class="pdf-bold">${snapshot.contrat || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Référence du contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Catégorie du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Facture :</span> <span class="pdf-bold">${report.emettreFactureBrouillon || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Service facturé :</span> <span class="pdf-bold">${report.serviceEmettreId ? getServiceLabel(report.serviceEmettreId) : ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Voie :</span> <span class="pdf-bold">${snapshot.numVoie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Ville :</span> <span class="pdf-bold">${snapshot.ville || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Code Postal :</span> <span class="pdf-bold">${snapshot.cp || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Région :</span> <span class="pdf-bold">${snapshot.region || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Pays :</span> <span class="pdf-bold">${snapshot.pays || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Latitude GPS :</span> <span class="pdf-bold">${snapshot.latitude || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Longitude GPS :</span> <span class="pdf-bold">${snapshot.longitude || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Fabrication :</span> <span class="pdf-bold">${snapshot.fabrication || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Mise en service :</span> <span class="pdf-bold">${snapshot.miseEnService || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Fin de garantie :</span> <span class="pdf-bold">${snapshot.finGarantie || ''}</span></div>
                </div>
              </div>

              <!-- SECTION 3 -->
              <div class="pdf-card">
                <div class="pdf-card-header">3 — Coffret ou armoire.</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle de boîtier :</span> <span class="pdf-bold">${coffretModelName || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot de boîtier :</span> <span class="pdf-bold">${snapshot.numeroLotCoffret || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Équipé d’une alarme :</span> <span class="pdf-bold">${report.equipeAlarme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Alarme fonctionnelle :</span> <span class="pdf-bold">${report.alarme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Dispositif d’armoire connectée :</span> <span class="pdf-bold">${report.armoireConnectee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Dispositif handicap :</span> <span class="pdf-bold">${report.dispositifHandicap || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Signalétique conforme :</span> <span class="pdf-bold">${report.signaletiqueConforme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant le boîtier :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireCoffret || ''}</span></div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 1 / 3</div>
          </div>

          <!-- PAGE 2 -->
          <div class="pdf-page">
            <div class="pdf-grid">
              <!-- SECTION 4 -->
              <div class="pdf-card">
                <div class="pdf-card-header">4 — Vérifications techniques.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  <div class="pdf-line"><span class="pdf-label">Conforme à mon arrivée :</span> <span class="pdf-bold">${report.techConformeArrivee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire sur l’état à mon arrivée :</span> <span class="pdf-bold">${report.techCommentaireArrivee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-rose-700">Nettoyage :</span> <span class="pdf-bold">${report.techNettoyage || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Voyant conforme :</span> <span class="pdf-bold">${report.techVoyantConforme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Équipé d’un message numérique :</span> <span class="pdf-bold">${report.techEquipeMessageNumerique || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Message numérique conforme :</span> <span class="pdf-bold">${report.techMessageNumeroConforme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Guides vocaux conformes :</span> <span class="pdf-bold">${report.techGuidesVocauxConformes || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Branchement conforme des électrodes :</span> <span class="pdf-bold">${report.techBranchementElectrodesConforme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Délivrance du choc conforme :</span> <span class="pdf-bold">${report.techDelivranceChocConforme || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Résultat du test en joules de l’électrode A :</span> <span class="pdf-bold">${report.techResultatJoulesElectrodeA ? report.techResultatJoulesElectrodeA + ' J' : ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Résultat du test en joules de l’électrode P :</span> <span class="pdf-bold">${report.techResultatJoulesElectrodeA2 ? report.techResultatJoulesElectrodeA2 + ' J' : ''}</span></div>
                </div>
              </div>

              <!-- SECTION 5 -->
              <div class="pdf-card">
                <div class="pdf-card-header">5 — Électrode adulte (A).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode A :</span> <span class="pdf-bold">${electrodeAModelName || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot A :</span> <span class="pdf-bold">${snapshot.lotElectrodeA || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Insertion :</span> <span class="pdf-bold">${snapshot.insertionElectrodeA || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeA || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Modèle électrode secours :</span> <span class="pdf-bold">${electrodeASecoursModelName || 'Aucun'}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodeASecours || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeA || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode A remplacée :</span> <span class="pdf-bold">${report.electrodeARemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Électrode A conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodeAConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeA || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode A :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeA || ''}</span></div>
                </div>
              </div>

              <!-- SECTION 6 -->
              <div class="pdf-card">
                <div class="pdf-card-header">6 — Électrode pédiatrique (P).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode P :</span> <span class="pdf-bold">${electrodePModelName || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot P :</span> <span class="pdf-bold">${snapshot.lotElectrodeP || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeP || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Modèle électrode secours :</span> <span class="pdf-bold">${electrodePSecoursModelName || 'Aucun'}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodePSecours || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeP || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode P remplacée :</span> <span class="pdf-bold">${report.electrodePRemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Électrode P conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodePConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeP || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode P :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeP || ''}</span></div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 2 / 3</div>
          </div>

          <!-- PAGE 3 -->
          <div class="pdf-page">
            <div class="pdf-grid">
              <!-- SECTION 7 -->
              <div class="pdf-card">
                <div class="pdf-card-header">7 — Batterie (B).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle de batterie :</span> <span class="pdf-bold">${batterieModelName || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Pourcentage de charge :</span> <span class="pdf-bold">${snapshot.pourcentageBatterie ? snapshot.pourcentageBatterie + '%' : ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Lot B :</span> <span class="pdf-bold">${snapshot.lotBatterie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionBatterie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Batterie remplacée :</span> <span class="pdf-bold">${report.batterieRemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Batterie conforme et fonctionnelle :</span> <span class="pdf-bold">${report.batterieConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de la batterie :</span> <span class="pdf-bold">${selBatterie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant la batterie :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireBatterie || ''}</span></div>
                </div>
              </div>

              <!-- SECTION 8 -->
              <div class="pdf-card">
                <div class="pdf-card-header">8 — Vérifications du kit de secours.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  <div class="pdf-line"><span class="pdf-label">Trousse de secours présente :</span> <span class="pdf-bold">${report.kitTrousseSecoursPresent || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Kit de secours remplacé ou ajouté :</span> <span class="pdf-bold">${report.kitSecoursRemplaceOuAjoute || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection d’un kit de secours :</span> <span class="pdf-bold">${selKitSecours || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Ciseaux présents :</span> <span class="pdf-bold">${report.kitCiseauxPresents || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Masque présent :</span> <span class="pdf-bold">${report.kitMasquePresent || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption du masque :</span> <span class="pdf-bold">${report.kitPeremptionMasque || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Serviettes présentes :</span> <span class="pdf-bold">${report.kitServiettesPresentes || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label text-blue-800">Péremption des serviettes :</span> <span class="pdf-bold">${report.kitPeremptionServiettes || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Paires de gants présents :</span> <span class="pdf-bold">${report.kitGantsPresents || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Rasoir :</span> <span class="pdf-bold">${report.kitRasoirPresent || ''}</span></div>
                </div>
              </div>

              <!-- SECTION 9 -->
              <div class="pdf-card">
                <div class="pdf-card-header">9 — Diagnostic et clôture.</div>
                <div class="pdf-card-body" style="display: flex; flex-direction: column; gap: 6px;">
                  <div class="pdf-line">
                    <span class="pdf-label">Défibrillateur conforme et prêt à l’usage :</span> <span class="pdf-bold">${snapshot.conforme === 'Oui' || report.conforme === 'Oui' ? 'Oui' : 'Non'}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Technicien :</span> <span class="pdf-bold">${report.techName || '-'}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Fichier de données récupéré :</span> <span class="pdf-bold">${report.fichierDonneesRecupere || ''}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Horodatage début d’intervention :</span> <span class="pdf-bold">${report.date || '-'}</span>
                  </div>
                  <div class="pdf-line">
                    <span class="pdf-label">Horodatage fin d’intervention :</span> <span class="pdf-bold">${report.endTimeStamp || '-'}</span>
                  </div>
                  <div class="pdf-line" style="margin-bottom: 4px;">
                    <span class="pdf-label">Commentaire :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaire || report.defibSnapshot?.commentaire || '-'}</span>
                  </div>
                  
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%; padding-top: 8px; margin-top: 4px;">
                    <!-- Photography -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Photographie du défibrillateur.</div>
                      ${report.photoUrl ? `
                        <div style="border: none; border-radius: 4px; overflow: hidden; background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 120px; max-width: 200px;">
                          <img src="${report.photoUrl}" style="max-height: 120px; max-width: 200px; object-fit: contain;" alt="Preuve" referrerPolicy="no-referrer" />
                        </div>
                      ` : ''}
                    </div>

                    <!-- Signature Technicien -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                      ${report.techSignature ? `
                        <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                          <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                        </div>
                      ` : `
                        <div style="font-size: 16px; color: #000000; font-style: italic;">
                          Non signée
                        </div>
                      `}
                    </div>

                    <!-- Signature Client -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                      ${report.clientPinCode ? `
                        <div style="font-size: 11px; margin-bottom: 2px;">
                          <span class="pdf-label" style="font-size:11px; color:#555;">Code validation:</span> 
                          <span class="pdf-bold" style="font-size:11px; font-family: monospace !important; font-weight: bold !important; color:#000;">${report.clientPinCode}</span>
                        </div>
                      ` : ''}
                      ${clientFound && clientFound.clientSignatureImage ? `
                        <div style="background: #ffffff; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; gap: 2px;">
                          <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                          <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">Signé électroniquement</div>
                        </div>
                      ` : `
                        ${report.clientPinCode ? `
                          <div style="font-size: 10px; color: #1e293b; font-style: italic; font-weight: bold !important;">
                            Signé électroniquement par PIN (${report.clientPinCode})
                          </div>
                        ` : `
                          <div style="font-size: 13px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `}
                      `}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pdf-footer">Page 3 / 3</div>
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
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${snapshot.identifiant || report.defibIdentifiant || 'intervention'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCorrectReport = (id: string, updatedFields: Partial<any>) => {
    const updated = generatedReports.map(rep => rep.id === id ? { ...rep, ...updatedFields } : rep);
    saveReports(updated);
  };

  const saveExpenses = (updated: any[]) => {
    setExpenses(updated);
    try {
      localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded in saveExpenses:', e);
    }
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('expenses', updated);
    }
  };

  const savePointages = (updated: PointageLog[]) => {
    setPointages(updated);
    try {
      localStorage.setItem(`defib_${tenantId}_pointages_history`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded in savePointages:', e);
    }
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('pointages', updated);
    }
  };

  const handleDeletePointage = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette ligne de pointage ?')) {
      const updated = pointages.filter(p => p.id !== id);
      savePointages(updated);
      if (editingPointageId === id) {
        setEditingPointageId(null);
        setEditPointageForm(null);
      }
    }
  };

  const handleEditPointageValue = (
    id: string,
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string
  ) => {
    const updated = pointages.map(p => {
      if (p.id === id) {
        let durationSeconds = p.durationSeconds;
        let finalEndDate = endDate || p.endDate || startDate;
        try {
          if (startDate && startTime && finalEndDate && endTime) {
            const startStr = `${startDate}T${startTime}:00`;
            const endStr = `${finalEndDate}T${endTime}:00`;
            const startMs = Date.parse(startStr);
            const endMs = Date.parse(endStr);
            if (!isNaN(startMs) && !isNaN(endMs)) {
              durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
            }
          }
        } catch (err) {}
        return {
          ...p,
          startDate,
          startTime,
          endDate: finalEndDate,
          endTime,
          durationSeconds,
          isOngoing: false
        };
      }
      return p;
    });
    savePointages(updated);
  };

  // Load from Firebase on startup, fallback to LocalStorage/Seed Defaults
  useEffect(() => {
    async function loadFirebaseAndSeed() {
      try {
        setIsFirebaseLoaded(false);
        loadedTenantIdRef.current = '';
        console.log('Synchronisant la base Firestore...');
        const [
          fClients, fVariables, fDefibrillateurs, fCompanyInfo, fMembers,
          fTickets, fDocs, fGed, fStocks, fReviews, fPointages, fExpenses,
          fReports, fTours, fMemos, fOtherEquipments, fPointagesAutoVigilance,
          fDistributedStocks, fAchatsFournisseurs
        ] = await Promise.all([
          fetchCollectionFromFirestore<Client[]>('clients'),
          fetchCollectionFromFirestore<Variable[]>('variables'),
          fetchCollectionFromFirestore<Defibrillateur[]>('defibrillateurs'),
          fetchCollectionFromFirestore<CompanyInfo>('companyInfo'),
          fetchCollectionFromFirestore<Member[]>('members'),
          fetchCollectionFromFirestore<SupportTicket[]>('tickets'),
          fetchCollectionFromFirestore<CommercialDoc[]>('commercialDocs'),
          fetchCollectionFromFirestore<GedDocument[]>('gedDocs'),
          fetchCollectionFromFirestore<StockRecord[]>('stocks'),
          fetchCollectionFromFirestore<any[]>('customerReviews'),
          fetchCollectionFromFirestore<PointageLog[]>('pointages'),
          fetchCollectionFromFirestore<any[]>('expenses'),
          fetchCollectionFromFirestore<any[]>('generatedReports'),
          fetchCollectionFromFirestore<any[]>('fsmTours'),
          fetchCollectionFromFirestore<Memo[]>('memos'),
          fetchCollectionFromFirestore<OtherEquipment[]>('otherEquipments'),
          fetchCollectionFromFirestore<PointageAutoVigilance[]>('pointagesAutoVigilance'),
          fetchCollectionFromFirestore<DistributedStockLocation[]>('distributed_stocks'),
          fetchCollectionFromFirestore<AchatFournisseur[]>('achats_fournisseurs')
        ]);

        // Helper block to query local storage fallback safely when firestore responds with null/error
        const getFallback = <T,>(keySuffix: string, defaultVal: T): T => {
          const saved = localStorage.getItem(`defib_${tenantId}_${keySuffix}`);
          if (saved) {
            try {
              return JSON.parse(saved) as T;
            } catch (e) {
              console.warn(`Error parsing localStorage for ${keySuffix}:`, e);
            }
          }
          return defaultVal;
        };

        // Handlers to apply state or write if empty
        let baseClients: Client[] = [];
        if (fClients !== null) {
          baseClients = fClients;
        } else {
          baseClients = getFallback<Client[]>('clients', tenantId === 'demo' ? INITIAL_CLIENTS : []);
        }

        let clientsChanged = false;
        const sanitizedClients = baseClients.map(c => {
          if (!c.signaturePin || !c.signaturePin.trim()) {
            clientsChanged = true;
            return { ...c, signaturePin: generateRandomPin() };
          }
          return c;
        });

        setClients(sanitizedClients);
        localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(sanitizedClients));
        if (fClients !== null && clientsChanged) {
          await saveCollectionToFirestore('clients', sanitizedClients);
        }

        let baseVariables: Variable[] = [];
        if (fVariables !== null) {
          // If this is a custom tenant and they have exactly the template's custom list initialized previously,
          // instantly clean it up to keep their private workspace clean of seed choices
          if (tenantId !== 'demo' && (fVariables.length === 11 || fVariables.length === 13 || fVariables.length === INITIAL_VARIABLES.length) && fVariables[0]?.id === 'v_def_1') {
            baseVariables = [];
          } else {
            baseVariables = fVariables;
          }
        } else {
          baseVariables = getFallback<Variable[]>('variables', tenantId === 'demo' ? INITIAL_VARIABLES : []);
        }
        setVariables(baseVariables);
        localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(baseVariables));

        let baseDefibrillateurs: Defibrillateur[] = [];
        if (fDefibrillateurs !== null) {
          baseDefibrillateurs = fDefibrillateurs;
        } else {
          baseDefibrillateurs = getFallback<Defibrillateur[]>('defibrillateurs', tenantId === 'demo' ? INITIAL_DEFIBRILLATEURS : []);
        }
        setDefibrillateurs(baseDefibrillateurs);
        localStorage.setItem(`defib_${tenantId}_defibrillateurs`, JSON.stringify(baseDefibrillateurs));

        let baseCompanyInfo: CompanyInfo;
        if (fCompanyInfo !== null) {
          baseCompanyInfo = fCompanyInfo;
        } else {
          const defaultInfo = {
            name: tenantId === 'demo' ? "Défibeo Solutions" : "Mon Cabinet",
            logo: tenantId === 'demo' ? "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&auto=format&fit=crop" : "",
            website: tenantId === 'demo' ? "29382302.defibeo.com" : "",
            email: tenantId === 'demo' ? "contact@defibeo-solutions.com" : "",
            phone: tenantId === 'demo' ? "+33 1 47 20 00 01" : ""
          };
          baseCompanyInfo = getFallback<CompanyInfo>('company_info', defaultInfo);
        }
        setCompanyInfo(baseCompanyInfo);
        localStorage.setItem(`defib_${tenantId}_company_info`, JSON.stringify(baseCompanyInfo));

        let baseMembers: Member[] = [];
        if (fMembers !== null) {
          baseMembers = fMembers;
        } else {
          const defaultMembers: Member[] = [
            { name: 'Ronan Roesch', role: 'Propriétaire / Admin', email: 'roesch.ronan@gmail.com', status: 'Actif', lastActive: 'En ligne', pin: '1234' },
            { 
              name: 'Technicien Ouest', 
              role: 'Maintenance Terrain', 
              email: 'tech.ouest@defibeo.com', 
              status: 'Actif', 
              lastActive: 'Il y a 10 min', 
              pin: '4321',
              competences: [
                "Installation et maintenance défibrillateur",
                "Installation et maintenance extincteur",
                "Installation et maintenance BIMP"
              ]
            },
            { name: 'Secrétariat Clientèle', role: 'Support & Contrats', email: 'support@defibeo.com', status: 'Inactif', lastActive: 'Hier', pin: '0000' },
          ];
          baseMembers = getFallback<Member[]>('members', defaultMembers);
        }
        setMembers(baseMembers);
        localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(baseMembers));

        let baseTickets: SupportTicket[] = [];
        if (fTickets !== null) {
          baseTickets = fTickets;
        } else {
          const defaultTickets: SupportTicket[] = tenantId === 'demo' ? [
            { id: '#128394', identifiant: 'PAR-102', objet: 'Défibrillateur utilisé', message: 'Nous avons déployé notre DAE hier soir lors du malaise d\'un client à l\'accueil. L\'appareil nous a bien guidé, mais le lot d\'électrodes est maintenant à remplacer.', email: 'securite@hotel-paris.com', phone: '01 42 27 00 12', date: '02/06/2026', status: 'Nouveau' },
            { id: '#495729', identifiant: 'NTS-203', objet: 'Défibrillateur hors service', message: 'Le boîtier extérieur émet un bip sonore continu et le voyant rouge clignote. Le diagnostic affiche Battery Low.', email: 'mairie@nantes-mairie.fr', phone: '02 40 12 34 56', date: '28/05/2026', status: 'En cours' },
            { id: '#889403', identifiant: 'TLS-401', objet: 'Autre', message: 'Demande d\'ajout d\'un kit de signalétique murale DAE pour notre nouveau garage souterrain.', email: 'logistique@tls-corporate.com', phone: '05 61 77 88 99', date: '25/05/2026', status: 'Résolu' }
          ] : [];
          baseTickets = getFallback<SupportTicket[]>('support_tickets', defaultTickets);
        }
        setTickets(baseTickets);
        localStorage.setItem(`defib_${tenantId}_support_tickets`, JSON.stringify(baseTickets));

        let baseDocs: CommercialDoc[] = [];
        if (fDocs !== null) {
          baseDocs = fDocs;
        } else {
          const defaultDocs: CommercialDoc[] = tenantId === 'demo' ? [
            { id: 'doc-1', ref: 'DEV-2026-0419', type: 'Devis', clientId: 'c1', clientDenomination: 'Secours Pro Ouest', items: [{ variableId: 'v_el_1', nomPiece: 'Électrodes Adultes SMART II (Philips)', prixVenteHt: 89, quantite: 6 }, { variableId: 'v_bat_1', nomPiece: 'Batterie Lithium-Manganèse FRx', prixVenteHt: 199, quantite: 1 }], totalHt: 733, status: 'Brouillon', dateStr: '2026-04-19' },
            { id: 'doc-2', ref: 'PRO-2026-0038', type: 'Proforma', clientId: 'c2', clientDenomination: "Clinique de l'Erdre", items: [{ variableId: 'v_cof_2', nomPiece: 'Aivia 200 (Extérieur, chauffé, alarmé)', prixVenteHt: 640, quantite: 1 }], totalHt: 640, status: 'Accepté', dateStr: '2026-05-15' }
          ] : [];
          baseDocs = getFallback<CommercialDoc[]>('commercial_docs', defaultDocs);
        }
        setCommercialDocs(baseDocs);
        localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(baseDocs));

        let baseGed: GedDocument[] = [];
        if (fGed !== null) {
          baseGed = fGed;
        } else {
          const defaultGed = tenantId === 'demo' ? [
            { id: 'ged-1', title: 'Notice d\'utilisation Lifeline AED', category: 'Manuel de conformité', fileName: 'Notice_Utilisation_Lifeline_AED.pdf', fileSize: '4.2 Mo', dateStr: '2026-02-12', fileUrl: 'https://v6.defibtech.com/sites/default/files/2021-02/Lifeline_AED_User_Manual_French_0.pdf' },
            { id: 'ged-2', title: 'Réglementation Nationale Code de la Santé', category: 'Manuel de conformité', fileName: 'Reglementation_Nationale_Code_Sante.pdf', fileSize: '1.1 Mo', dateStr: '2026-01-01', fileUrl: 'https://www.legifrance.gouv.fr/' },
            { id: 'ged-3', title: 'PV Maintenance Bordeaux - EVB-411', category: "Fiche de visite d'audit", fileName: 'PV_Maintenance_Bordeaux_EVB-411.pdf', fileSize: '890 Ko', dateStr: '2026-06-06', fileUrl: 'https://www.defibtech.com/' },
            { id: 'ged-4', title: 'Fiche Technique Mise en Service Nantes', category: "Fiche de visite d'audit", fileName: 'Fiche_Technique_Mise_Service_Nantes.pdf', fileSize: '3.1 Mo', dateStr: '2026-06-04', fileUrl: 'https://www.defibtech.com/' }
          ] : [];
          baseGed = getFallback<GedDocument[]>('ged_docs', defaultGed);
        }
        setGedDocs(baseGed);
        localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(baseGed));

        let baseStocks: StockRecord[] = [];
        if (fStocks !== null) {
          baseStocks = fStocks;
        } else {
          const defaultStocks = tenantId === 'demo' ? [
            { id: 'st_1', denominationPieceId: 'v_el_1', quantite: 45, livraisonDate: '2026-04-12', reapprovisionnementDate: '2026-06-15', valeurAchat: 45, marge: 44, prixVenteHt: 89, stockage: 'Entrepôt A' },
            { id: 'st_2', denominationPieceId: 'v_bat_1', quantite: 28, livraisonDate: '2026-05-18', reapprovisionnementDate: '2026-06-30', valeurAchat: 95, marge: 104, prixVenteHt: 199, stockage: 'Entrepôt A' },
            { id: 'st_3', denominationPieceId: 'v_cof_1', quantite: 12, livraisonDate: '2026-05-20', reapprovisionnementDate: '2026-07-05', valeurAchat: 140, marge: 145, prixVenteHt: 285, stockage: 'Entrepôt B' },
            { id: 'st_4', denominationPieceId: 'v_cof_2', quantite: 8, livraisonDate: '2026-05-22', reapprovisionnementDate: '2026-07-10', valeurAchat: 310, marge: 330, prixVenteHt: 640, stockage: 'Entrepôt B' },
            { id: 'st_srv_1', denominationPieceId: 'v_srv_1', quantite: 9991, livraisonDate: '2026-01-01', reapprovisionnementDate: '2026-06-01', valeurAchat: 0, marge: 150, prixVenteHt: 150, stockage: 'Siège' },
            { id: 'st_srv_2', denominationPieceId: 'v_srv_2', quantite: 9992, livraisonDate: '2026-01-01', reapprovisionnementDate: '2026-06-01', valeurAchat: 0, marge: 120, prixVenteHt: 120, stockage: 'Siège' }
          ] : [];
          baseStocks = getFallback<StockRecord[]>('stocks', defaultStocks);
        }
        setStocks(baseStocks);
        localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(baseStocks));

        let baseDistrib: DistributedStockLocation[] = [];
        if (fDistributedStocks !== null) {
          baseDistrib = fDistributedStocks;
        } else {
          const defaultDistrib = tenantId === 'demo' ? [
            { id: 'ds_1', denominationPieceId: 'v_el_1', locationName: 'Entrepôt A' as const, volumeDisponible: 15, volumeReserve: 5, volumeEntrant: 2 },
            { id: 'ds_2', denominationPieceId: 'v_el_p_1', locationName: 'Véhicule A' as const, volumeDisponible: 8, volumeReserve: 2, volumeEntrant: 0 },
            { id: 'ds_3', denominationPieceId: 'v_bat_1', locationName: 'Véhicule B' as const, volumeDisponible: 5, volumeReserve: 1, volumeEntrant: 3 }
          ] : [];
          baseDistrib = getFallback<DistributedStockLocation[]>('distributed_stocks', defaultDistrib);
        }
        setDistributedStocks(baseDistrib);
        localStorage.setItem(`defib_${tenantId}_distributed_stocks`, JSON.stringify(baseDistrib));

        let baseReviews: any[] = [];
        if (fReviews !== null) {
          baseReviews = fReviews;
        } else {
          const defaultReviews = tenantId === 'demo' ? [
            { id: 'rev-1', clientName: 'Secours Pro Ouest (Jean-Marc DUPONT)', comment: "Excellent travail ! Le technicien Thierry a été très soigné et a remplacé les piles rapidement en expliquant le fonctionnement du boîtier thermique.", label: 'Excellent' },
            { id: 'rev-2', clientName: 'Espace Vert Bordeaux (Marc VIGNAL)', comment: "L'intervention s'est déroulée à l'heure convenue. Explications claires et professionnalisme au rendez-vous. Matériel de rechange disponible immédiatement.", label: 'Parfait' },
            { id: 'rev-3', clientName: 'Gymnase Jean Bouin (Stéphanie LEFEVRE)', comment: "Remplacement de l'appareil effectué comme prévu. Cependant, l'un des autocollants signalétiques était légèrement corné.", label: 'Moyen' },
            { id: 'rev-4', clientName: 'Hôtel Splendid Nantes', comment: "Le technicien a oublié de nous laisser le document papier de visite, bien que nous l'ayons reçu par e-mail peu après.", label: 'Décevant' },
            { id: 'rev-5', clientName: 'Camping des Pins', comment: "Délai de passage non respecté deux fois de suite, aucune notification de retard reçue. Nous attendons un geste commercial.", label: 'Médiocre' }
          ] : [];
          baseReviews = getFallback<any[]>('customer_reviews', defaultReviews);
        }
        setCustomerReviews(baseReviews);
        localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(baseReviews));

        let basePointages: PointageLog[] = [];
        if (fPointages !== null) {
          basePointages = fPointages;
        } else {
          basePointages = getFallback<PointageLog[]>('pointages_history', []);
        }
        setPointages(basePointages);
        localStorage.setItem(`defib_${tenantId}_pointages_history`, JSON.stringify(basePointages));

        let baseExpenses: any[] = [];
        if (fExpenses !== null) {
          baseExpenses = fExpenses;
        } else {
          const defaultExpenses = tenantId === 'demo' ? [
            { id: 'exp-1', techName: 'Thierry Martin', title: 'Abonnement Parking Nantes', amountTtc: 18.20, amountHt: 15.17, amountTva: 3.03, dateStr: '2026-06-02', photoUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&auto=format&fit=crop' },
            { id: 'exp-2', techName: 'Marc VIGNAL', title: 'Achat consommables - Électrodes Lot A3', amountTtc: 220.00, amountHt: 183.33, amountTva: 36.67, dateStr: '2026-06-03', photoUrl: '' },
            { id: 'exp-3', techName: 'Thierry LEFEBVRE', title: 'Batteries Spécifiques Type B2 (x2)', amountTtc: 2550.00, amountHt: 2125.00, amountTva: 425.00, dateStr: '2026-06-01', photoUrl: '' }
          ] : [];
          baseExpenses = getFallback<any[]>('expenses', defaultExpenses);
        }
        setExpenses(baseExpenses);
        localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(baseExpenses));

        let baseReports: any[] = [];
        if (fReports !== null) {
          baseReports = fReports;
        } else {
          const defaultReports = tenantId === 'demo' ? [
            { id: 'rep-1', date: '02-06-2026 14:15', techName: 'Thierry Martin', defibId: 'df_1', defibIdentifiant: 'PAR-101', title: 'CONSTAT DE MAINTENANCE DÉFIBRILLATEUR', siteMission: 'DÉPLACEMENT', photoUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=100&auto=format&fit=crop' }
          ] : [];
          baseReports = getFallback<any[]>('generated_reports', defaultReports);
        }
        setGeneratedReports(baseReports);
        localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(baseReports));

        let baseTours: any[] = [];
        if (fTours !== null) {
          baseTours = fTours;
        } else {
          const defaultTours = tenantId === 'demo' ? [
            {
              id: 'fsm-tour-1',
              title: 'Tournée Nantes Hyper-Centre',
              techName: 'Thierry LEFEBVRE',
              startDate: '2026-06-08',
              status: 'À faire',
              missions: [
                { id: 'fsm-m-1', clientName: 'Jean-Marc DUPONT (SPO-891)', defibIdentifiant: 'PAR-101', reason: 'Remplacement B', requiredParts: ['Batterie Lithium 5 ans'], status: 'À faire', priority: 'Haute', time: '14:00' }
              ]
            }
          ] : [];
          baseTours = getFallback<any[]>('fsm_tours', defaultTours);
        }
        setFsmTours(baseTours);
        localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(baseTours));

        let baseMemos: Memo[] = [];
        if (fMemos !== null) {
          baseMemos = fMemos;
        } else {
          baseMemos = getFallback<Memo[]>('memos', []);
        }
        setMemos(baseMemos);
        localStorage.setItem(`defib_${tenantId}_memos`, JSON.stringify(baseMemos));

        let baseOtherEquip: OtherEquipment[] = [];
        if (fOtherEquipments !== null) {
          baseOtherEquip = fOtherEquipments;
        } else {
          baseOtherEquip = getFallback<OtherEquipment[]>('other_equipments', tenantId === 'demo' ? INITIAL_OTHER_EQUIPMENTS : []);
        }
        setOtherEquipments(baseOtherEquip);
        localStorage.setItem(`defib_${tenantId}_other_equipments`, JSON.stringify(baseOtherEquip));

        let basePointagesAuto: PointageAutoVigilance[] = [];
        if (fPointagesAutoVigilance !== null) {
          basePointagesAuto = fPointagesAutoVigilance;
        } else {
          basePointagesAuto = getFallback<PointageAutoVigilance[]>('pointages_auto_vigilance', []);
        }
        setPointagesAutoVigilance(basePointagesAuto);
        localStorage.setItem(`defib_${tenantId}_pointages_auto_vigilance`, JSON.stringify(basePointagesAuto));

        let baseAchats: AchatFournisseur[] = [];
        if (fAchatsFournisseurs !== null) {
          baseAchats = fAchatsFournisseurs;
        } else {
          baseAchats = getFallback<AchatFournisseur[]>('achats_fournisseurs', []);
        }
        setAchatsFournisseurs(baseAchats);
        localStorage.setItem(`defib_${tenantId}_achats_fournisseurs`, JSON.stringify(baseAchats));

        setIsFirebaseLoaded(true);
        loadedTenantIdRef.current = tenantId;
      } catch (err) {
        console.error('Firestore loading failed, falling back to offline localStorage:', err);
        // Fallback loading from local storage
        const savedClients = localStorage.getItem(`defib_${tenantId}_clients`);
        let offlineClients: Client[] = [];
        if (savedClients) {
          offlineClients = JSON.parse(savedClients);
        } else {
          offlineClients = tenantId === 'demo' ? INITIAL_CLIENTS : [];
        }
        let offlineChanged = false;
        const sanitizedOffline = offlineClients.map(c => {
          if (!c.signaturePin || !c.signaturePin.trim()) {
            offlineChanged = true;
            return { ...c, signaturePin: generateRandomPin() };
          }
          return c;
        });
        setClients(sanitizedOffline);
        if (offlineChanged) {
          localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(sanitizedOffline));
        }

        const savedVariables = localStorage.getItem(`defib_${tenantId}_variables`);
        if (savedVariables) setVariables(JSON.parse(savedVariables));
        else setVariables(tenantId === 'demo' ? INITIAL_VARIABLES : []);

        const savedDefibs = localStorage.getItem(`defib_${tenantId}_defibrillateurs`);
        if (savedDefibs) setDefibrillateurs(JSON.parse(savedDefibs));
        else setDefibrillateurs(tenantId === 'demo' ? INITIAL_DEFIBRILLATEURS : []);

        const savedCompanyInfo = localStorage.getItem(`defib_${tenantId}_company_info`);
        if (savedCompanyInfo) setCompanyInfo(JSON.parse(savedCompanyInfo));

        const savedMembers = localStorage.getItem(`defib_${tenantId}_members`);
        if (savedMembers) setMembers(JSON.parse(savedMembers));

        const savedTickets = localStorage.getItem(`defib_${tenantId}_support_tickets`);
        if (savedTickets) setTickets(JSON.parse(savedTickets));

        const savedMemos = localStorage.getItem(`defib_${tenantId}_memos`);
        if (savedMemos) setMemos(JSON.parse(savedMemos));

        const savedCommercialDocs = localStorage.getItem(`defib_${tenantId}_commercial_docs`);
        if (savedCommercialDocs) setCommercialDocs(JSON.parse(savedCommercialDocs));

        const savedGedDocs = localStorage.getItem(`defib_${tenantId}_ged_docs`);
        if (savedGedDocs) setGedDocs(JSON.parse(savedGedDocs));

        const savedStocks = localStorage.getItem(`defib_${tenantId}_stocks`);
        if (savedStocks) setStocks(JSON.parse(savedStocks));

        const savedReports = localStorage.getItem(`defib_${tenantId}_generated_reports`);
        if (savedReports) setGeneratedReports(JSON.parse(savedReports));

        const savedFsmTours = localStorage.getItem(`defib_${tenantId}_fsm_tours`);
        if (savedFsmTours) setFsmTours(JSON.parse(savedFsmTours));

        const savedExpenses = localStorage.getItem(`defib_${tenantId}_expenses`);
        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

        const savedOtherEquipments = localStorage.getItem(`defib_${tenantId}_other_equipments`);
        if (savedOtherEquipments) setOtherEquipments(JSON.parse(savedOtherEquipments));
        else setOtherEquipments(tenantId === 'demo' ? INITIAL_OTHER_EQUIPMENTS : []);

        const savedPointagesHistory = localStorage.getItem(`defib_${tenantId}_pointages_history`);
        if (savedPointagesHistory) setPointages(JSON.parse(savedPointagesHistory));

        const savedPointagesAutoVigilance = localStorage.getItem(`defib_${tenantId}_pointages_auto_vigilance`);
        if (savedPointagesAutoVigilance) setPointagesAutoVigilance(JSON.parse(savedPointagesAutoVigilance));
        else setPointagesAutoVigilance([]);

        const savedAchatsFournisseurs = localStorage.getItem(`defib_${tenantId}_achats_fournisseurs`);
        if (savedAchatsFournisseurs) setAchatsFournisseurs(JSON.parse(savedAchatsFournisseurs));
        else setAchatsFournisseurs([]);

        setIsFirebaseLoaded(true);
        loadedTenantIdRef.current = tenantId;
      }
    }
    loadFirebaseAndSeed();
  }, [tenantId]);

  // Save state changes back to Firebase
  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('clients', clients);
      localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(clients));
    }
  }, [clients, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('variables', variables);
      localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(variables));
    }
  }, [variables, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('defibrillateurs', defibrillateurs);
      localStorage.setItem(`defib_${tenantId}_defibrillateurs`, JSON.stringify(defibrillateurs));
    }
  }, [defibrillateurs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('stocks', stocks);
      localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(stocks));
    }
  }, [stocks, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('companyInfo', companyInfo);
      localStorage.setItem(`defib_${tenantId}_company_info`, JSON.stringify(companyInfo));
    }
  }, [companyInfo, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('members', members);
      localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(members));
    }
  }, [members, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('tickets', tickets);
      localStorage.setItem(`defib_${tenantId}_support_tickets`, JSON.stringify(tickets));
    }
  }, [tickets, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('pointages', pointages);
      localStorage.setItem(`defib_${tenantId}_pointages_history`, JSON.stringify(pointages));
    }
  }, [pointages, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('pointagesAutoVigilance', pointagesAutoVigilance);
      localStorage.setItem(`defib_${tenantId}_pointages_auto_vigilance`, JSON.stringify(pointagesAutoVigilance));
    }
  }, [pointagesAutoVigilance, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('commercialDocs', commercialDocs);
      localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(commercialDocs));
    }
  }, [commercialDocs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('customerReviews', customerReviews);
      localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(customerReviews));
    }
  }, [customerReviews, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('gedDocs', gedDocs);
      try {
        localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(gedDocs));
      } catch (e) {
        console.warn('Storage quota exceeded for gedDocs:', e);
      }
    }
  }, [gedDocs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('expenses', expenses);
      try {
        localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(expenses));
      } catch (e) {
        console.warn('Storage quota exceeded for expenses:', e);
      }
    }
  }, [expenses, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('generatedReports', generatedReports);
      try {
        localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(generatedReports));
      } catch (e) {
        console.warn('Storage quota exceeded for generatedReports:', e);
      }
    }
  }, [generatedReports, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('fsmTours', fsmTours);
      try {
        localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(fsmTours));
      } catch (e) {
        console.warn('Storage quota exceeded for fsmTours:', e);
      }
    }
  }, [fsmTours, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('memos', memos);
      try {
        localStorage.setItem(`defib_${tenantId}_memos`, JSON.stringify(memos));
      } catch (e) {
        console.warn('Storage quota exceeded for memos:', e);
      }
    }
  }, [memos, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('otherEquipments', otherEquipments);
      try {
        localStorage.setItem(`defib_${tenantId}_other_equipments`, JSON.stringify(otherEquipments));
      } catch (e) {
        console.warn('Storage quota exceeded for otherEquipments:', e);
      }
    }
  }, [otherEquipments, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('achats_fournisseurs', achatsFournisseurs);
      try {
        localStorage.setItem(`defib_${tenantId}_achats_fournisseurs`, JSON.stringify(achatsFournisseurs));
      } catch (e) {
        console.warn('Storage quota exceeded for achatsFournisseurs:', e);
      }
    }
  }, [achatsFournisseurs, isFirebaseLoaded, tenantId]);

  const saveGedDocs = (newGed: GedDocument[]) => {
    setGedDocs(newGed);
    localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(newGed));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('gedDocs', newGed);
    }
  };


  const saveCommercialDocs = (newDocs: CommercialDoc[]) => {
    setCommercialDocs(newDocs);
    localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(newDocs));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('commercialDocs', newDocs);
    }
  };

  const getSellingPriceForVariable = (varId: string): number => {
    const matchedStock = stocks.find(s => s.denominationPieceId === varId);
    return matchedStock ? matchedStock.prixVenteHt : 45.00;
  };

  useEffect(() => {
    if (!editingDocId && isDocFormOpen) {
      const prefix = docType === 'Devis' ? 'DEV' : docType === 'Facture' ? 'FACT' : 'PRO';
      const year = '2026';
      const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      let maxNum = 0;
      for (const doc of commercialDocs) {
        if (doc.type === docType && doc.ref) {
          const match = doc.ref.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
      const nextNum = maxNum + 1;
      const generatedRef = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
      setDocRef(generatedRef);
    }
  }, [docType, isDocFormOpen, editingDocId, commercialDocs]);

  const handleDownloadDoc = (doc: CommercialDoc) => {
    const totalTva = doc.totalHt * 0.20;
    const totalTtc = doc.totalHt * 1.20;
    
    const formatDateStr = (dateStr: string) => {
      if (!dateStr) return '';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const itemsHtml = doc.items.map((item, idx) => {
      const isLast = idx === doc.items.length - 1;
      return `
        <tr style="${isLast ? '' : 'border-bottom: 1px solid #dcdcdc;'}">
          <td style="padding: 12px 8px;">${item.nomPiece}</td>
          <td style="padding: 12px 8px; text-align: right;">${item.prixVenteHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</td>
          <td style="padding: 12px 8px; text-align: center;">${item.quantite}</td>
          <td style="padding: 12px 8px; text-align: right;">${(item.prixVenteHt * item.quantite).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</td>
        </tr>
      `;
    }).join('');

    const clientObj = clients.find(c => c.id === doc.clientId) || clients.find(c => c.denomination === doc.clientDenomination);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${doc.type} ${doc.ref}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @font-face {
            font-family: "Gochi";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "Civilprom";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          
          @page {
            size: auto;
            margin: 0;
          }
          
          body, select, input, textarea, div, p, span, h1, h2, h3, h4, table, tr, th, td, a {
            font-family: "Civilprom", sans-serif !important;
            font-weight: 100 !important;
            color: #000000 !important;
            letter-spacing: normal !important;
            text-transform: none !important;
            font-size: 16px !important;
          }
          
          .text-large {
            font-size: 18px !important;
          }
          
          h1.doc-title {
            font-family: "Gochi" !important;
            font-size: 55px !important;
            font-weight: normal !important;
            line-height: 1 !important;
          }
          
          .blue-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            font-weight: 100 !important;
          }
          
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; margin: 1.6cm 1.6cm 1.6cm 1.6cm !important; }
            .max-w-3xl { border: none !important; box-shadow: none !important; max-width: 100% !important; width: 100% !important; padding: 0 !important; }
          }
        </style>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </head>
      <body class="bg-white text-black p-8">
        <div class="max-w-3xl mx-auto p-4 md:p-8" style="background-color: #ffffff; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box;">
          
          <!-- HAUT DE PAGE / COORDONNEES -->
          <div class="flex justify-between items-start pb-4">
            <div>
              ${companyInfo.logo ? `<img src="${companyInfo.logo}" style="max-width: 300px; max-height: 100px; object-fit: contain; margin-bottom: 12px; display: block;" referrerPolicy="no-referrer" />` : ''}
              <span class="text-large" style="display: block; margin-bottom: 4px;">${companyInfo.name}</span>
              <div>${companyInfo.email}</div>
              <div>${companyInfo.phone}</div>
              <div style="margin-top: 2px;"><a href="https://${companyInfo.website}" target="_blank" class="blue-link">${companyInfo.website}</a></div>
            </div>
            <div style="text-align: right;">
              <div>${formatDateStr(doc.dateStr)}</div>
            </div>
          </div>

          <!-- TITRE DU DOCUMENT / INFOS CLIENT -->
          <div class="grid grid-cols-2 gap-6" style="margin-top: 20px;">
            <div>
              <h1 class="doc-title">${doc.type === 'Devis' ? 'DEVIS' : 'FACTURE'}</h1>
              <p style="margin: 4px 0 0 0;">Référence : ${doc.ref}</p>
              <p style="margin: 4px 0 0 0;">Commentaire : ${doc.commentaire || ''}</p>
            </div>
            <div style="border: 1px solid #dcdcdc; padding: 16px; border-radius: 12px; background-color: #ffffff;">
              <div style="margin-bottom: 6px;">Client.</div>
              <div style="font-size: 24px !important; font-weight: bold !important; margin-bottom: 6px; line-height: 1.2 !important;">${clientObj ? clientObj.denomination : doc.clientDenomination}</div>
              ${clientObj ? `
                ${clientObj.nomPrenomSite ? `<div style="margin-bottom: 2px;">Contact. ${clientObj.nomPrenomSite}</div>` : ''}
                ${clientObj.siret ? `<div style="margin-bottom: 2px;">Numéro fiscal. ${clientObj.siret}</div>` : ''}
                ${clientObj.email ? `<div style="margin-bottom: 2px;">Email. ${clientObj.email}</div>` : ''}
                ${clientObj.phone ? `<div style="margin-bottom: 2px;">Téléphone. ${clientObj.phone}</div>` : ''}
              ` : ''}
            </div>
          </div>

          <!-- TABLEAU DES PRESTATIONS / PIECES -->
          <div style="border: 1px solid #dcdcdc; border-radius: 12px; overflow: hidden; margin-top: 20px; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid #dcdcdc;">
                  <th style="padding: 10px 8px; font-weight: 100 !important;">Description.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: right;">Prix unitaire.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: center;">Volume.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: right;">Total ligne.</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- SECTION DE COMMODITES DES CALCULS (TOTALS) -->
          <div style="display: flex; justify-content: flex-end; padding-top: 16px;">
            <div style="width: 256px; border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Total HT.</span>
                <span>${doc.totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Total TVA (20%).</span>
                <span>${totalTva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
              <div style="display: flex; justify-content: space-between;" class="text-large">
                <span>Total TTC.</span>
                <span>${totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
            </div>
          </div>

          <!-- MENTIONS LEGALES ET CONDITIONS -->
          ${companyInfo.mentionsLegalesFactures || companyInfo.conditionsLegalesLink ? `
            <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
              ${companyInfo.mentionsLegalesFactures ? `<div style="font-size: 15px !important;">Mentions légales : ${companyInfo.mentionsLegalesFactures}</div>` : ''}
              ${companyInfo.conditionsLegalesLink ? `<div style="font-xs !important;">Conditions légales : <a href="${companyInfo.conditionsLegalesLink}" target="_blank" class="blue-link">${companyInfo.conditionsLegalesLink}</a></div>` : ''}
            </div>
          ` : ''}

        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.type.toLowerCase()}-${doc.ref}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBonCommande = (doc: CommercialDoc) => {
    if (!doc.hasBonCommande) {
      alert("Cette pièce comptable ne possède pas de Bon de commande. Veuillez modifier la pièce pour cocher 'Bon de commande: Oui'.");
      return;
    }

    const totalTva = doc.totalHt * 0.20;
    const totalTtc = doc.totalHt * 1.20;
    
    const formatDateStr = (dateStr: string) => {
      if (!dateStr) return '';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    const itemsHtml = doc.items.map((item, idx) => {
      const isLast = idx === doc.items.length - 1;
      return `
        <tr style="${isLast ? '' : 'border-bottom: 1px solid #dcdcdc;'}">
          <td style="padding: 12px 8px;">${item.nomPiece}</td>
          <td style="padding: 12px 8px; text-align: right;">${item.prixVenteHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</td>
          <td style="padding: 12px 8px; text-align: center;">${item.quantite}</td>
          <td style="padding: 12px 8px; text-align: right;">${(item.prixVenteHt * item.quantite).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</td>
        </tr>
      `;
    }).join('');

    const clientObj = clients.find(c => c.id === doc.clientId) || clients.find(c => c.denomination === doc.clientDenomination);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Bon de commande ${doc.bonCommandeReference || 'Sans réf'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @font-face {
            font-family: "Gochi";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/gochi.otf") format("opentype");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: "Civilprom";
            src: url("https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf") format("opentype");
            font-weight: 100 900;
            font-style: normal;
            font-display: swap;
          }
          
          @page {
            size: auto;
            margin: 0;
          }
          
          body, select, input, textarea, div, p, span, h1, h2, h3, h4, table, tr, th, td, a {
            font-family: "Civilprom", sans-serif !important;
            font-weight: 100 !important;
            color: #000000 !important;
            letter-spacing: normal !important;
            text-transform: none !important;
            font-size: 16px !important;
          }
          
          .text-large {
            font-size: 18px !important;
          }
          
          h1.doc-title {
            font-family: "Gochi" !important;
            font-size: 55px !important;
            font-weight: normal !important;
            line-height: 1 !important;
          }
          
          .blue-link {
            color: #2563eb !important;
            text-decoration: underline !important;
            font-weight: 100 !important;
          }
          
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; margin: 1.6cm 1.6cm 1.6cm 1.6cm !important; }
            .max-w-3xl { border: none !important; box-shadow: none !important; max-width: 100% !important; width: 100% !important; padding: 0 !important; }
          }
        </style>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </head>
      <body class="bg-white text-black p-8">
        <div class="max-w-3xl mx-auto p-4 md:p-8" style="background-color: #ffffff; display: flex; flex-direction: column; gap: 24px; box-sizing: border-box;">
          
          <!-- HAUT DE PAGE / COORDONNEES -->
          <div class="flex justify-between items-start pb-4">
            <div>
              ${companyInfo.logo ? `<img src="${companyInfo.logo}" style="max-width: 300px; max-height: 100px; object-fit: contain; margin-bottom: 12px; display: block;" referrerPolicy="no-referrer" />` : ''}
              <span class="text-large" style="display: block; margin-bottom: 4px;">${companyInfo.name}</span>
              <div>${companyInfo.email}</div>
              <div>${companyInfo.phone}</div>
              <div style="margin-top: 2px;"><a href="https://${companyInfo.website}" target="_blank" class="blue-link">${companyInfo.website}</a></div>
            </div>
            <div style="text-align: right;">
              <div>${formatDateStr(doc.dateStr)}</div>
            </div>
          </div>

          <!-- TITRE DU DOCUMENT / INFOS CLIENT -->
          <div class="grid grid-cols-2 gap-6" style="margin-top: 20px;">
            <div>
              <h1 class="doc-title">BON DE COMMANDE</h1>
              <p style="margin: 4px 0 0 0;">Référence BC : ${doc.bonCommandeReference || '-'}</p>
              <p style="margin: 4px 0 0 0;">Livraison : ${doc.bonCommandeLivraison || '-'}</p>
              <p style="margin: 4px 0 0 0;">Situation : ${doc.bonCommandeSituation || '-'}</p>
              <p style="margin: 4px 0 0 0;">Commentaire : ${doc.commentaire || ''}</p>
            </div>
            <div style="border: 1px solid #dcdcdc; padding: 16px; border-radius: 12px; background-color: #ffffff;">
              <div style="margin-bottom: 6px;">Client.</div>
              <div style="font-size: 24px !important; font-weight: bold !important; margin-bottom: 6px; line-height: 1.2 !important;">${clientObj ? clientObj.denomination : doc.clientDenomination}</div>
              ${clientObj ? `
                ${clientObj.nomPrenomSite ? `<div style="margin-bottom: 2px;">Contact. ${clientObj.nomPrenomSite}</div>` : ''}
                ${clientObj.siret ? `<div style="margin-bottom: 2px;">Numéro fiscal. ${clientObj.siret}</div>` : ''}
                ${clientObj.email ? `<div style="margin-bottom: 2px;">Email. ${clientObj.email}</div>` : ''}
                ${clientObj.phone ? `<div style="margin-bottom: 2px;">Téléphone. ${clientObj.phone}</div>` : ''}
              ` : ''}
            </div>
          </div>

          <!-- TABLEAU DES PRESTATIONS / PIECES -->
          <div style="border: 1px solid #dcdcdc; border-radius: 12px; overflow: hidden; margin-top: 20px; background-color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid #dcdcdc;">
                  <th style="padding: 10px 8px; font-weight: 100 !important;">Description.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: right;">Prix unitaire.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: center;">Volume.</th>
                  <th style="padding: 10px 8px; font-weight: 100 !important; text-align: right;">Total ligne.</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- SECTION DE COMMODITES DES CALCULS (TOTALS) -->
          <div style="display: flex; justify-content: flex-end; padding-top: 16px;">
            <div style="width: 256px; border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Total HT.</span>
                <span>${doc.totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Total TVA (20%).</span>
                <span>${totalTva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
              <div style="display: flex; justify-content: space-between;" class="text-large">
                <span>Total TTC.</span>
                <span>${totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€</span>
              </div>
            </div>
          </div>

          <!-- MENTIONS LEGALES ET CONDITIONS -->
          ${companyInfo.mentionsLegalesFactures || companyInfo.conditionsLegalesLink ? `
            <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
              ${companyInfo.mentionsLegalesFactures ? `<div style="font-size: 15px !important;">Mentions légales : ${companyInfo.mentionsLegalesFactures}</div>` : ''}
              ${companyInfo.conditionsLegalesLink ? `<div style="font-xs !important;">Conditions légales : <a href="${companyInfo.conditionsLegalesLink}" target="_blank" class="blue-link">${companyInfo.conditionsLegalesLink}</a></div>` : ''}
            </div>
          ` : ''}

        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bon-de-commande-${doc.bonCommandeReference || 'sans-ref'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTransformDoc = (doc: CommercialDoc) => {
    const targetType = doc.type === 'Devis' ? 'Facture' : 'Devis';
    const prefix = targetType === 'Devis' ? 'DEV' : targetType === 'Facture' ? 'FACT' : 'PRO';
    const year = '2026';
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
    let maxNum = 0;
    for (const d of commercialDocs) {
      if (d.type === targetType && d.ref) {
        const match = d.ref.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    const nextNum = maxNum + 1;
    const generatedRef = `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;

    const newDoc: CommercialDoc = {
      ...doc,
      id: 'doc-' + Date.now(),
      ref: generatedRef,
      type: targetType,
      status: 'Brouillon',
      dateStr: new Date().toISOString().substring(0, 10),
    };

    saveCommercialDocs([newDoc, ...commercialDocs]);
    alert(`${doc.type === 'Devis' ? 'Le devis' : 'La facture'} ${doc.ref} a été transformé(e) avec succès en ${targetType === 'Devis' ? 'devis' : 'facture'} (réf: ${generatedRef}, situation: Brouillon).`);
  };

  const startEditDoc = (doc: CommercialDoc) => {
    setEditingDocId(doc.id);
    setDocType(doc.type);
    setDocRef(doc.ref);
    setDocClientId(doc.clientId);
    setDocDateStr(doc.dateStr);
    setDocStatus(doc.status);
    setDocItems(doc.items);
    setDocCommentaire(doc.commentaire || '');
    setDocAssignedMemberName(doc.assignedMemberName || '');
    setDocHasBonCommande(!!doc.hasBonCommande);
    setDocBonCommandeReference(doc.bonCommandeReference || '');
    setDocBonCommandeLivraison(doc.bonCommandeLivraison || 'Transporteur');
    setDocBonCommandeSituation(doc.bonCommandeSituation || 'Ouvert');
    setIsDocFormOpen(true);
  };

  const startNewDoc = () => {
    setEditingDocId(null);
    setDocType('Devis');
    setDocClientId(clients[0]?.id || '');
    setDocDateStr(new Date().toISOString().substring(0, 10));
    setDocStatus('Brouillon');
    setDocItems([]);
    setDocCommentaire('');
    setDocAssignedMemberName('');
    setDocHasBonCommande(false);
    setDocBonCommandeReference('');
    setDocBonCommandeLivraison('Transporteur');
    setDocBonCommandeSituation('Ouvert');
    setIsDocFormOpen(true);
  };

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const activeClient = clients.find(c => c.id === docClientId);
    if (!activeClient) {
      alert("Veuillez sélectionner un client.");
      return;
    }

    if (docItems.length === 0) {
      alert("Veuillez ajouter au moins une pièce ou une ligne au document.");
      return;
    }

    const calculatedTotalHt = docItems.reduce((acc, item) => acc + (item.prixVenteHt * item.quantite), 0);

    let finalBcRef = docBonCommandeReference;
    if (docHasBonCommande && !finalBcRef) {
      const prefix = 'BL';
      const year = '2026';
      const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
      let maxNum = 0;
      for (const d of commercialDocs) {
        if (d.bonCommandeReference) {
          const match = d.bonCommandeReference.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
      finalBcRef = `${prefix}-${year}-${maxNum + 1}`;
    }

    if (editingDocId) {
      const updatedDocs = commercialDocs.map(d => d.id === editingDocId ? {
        ...d,
        ref: docRef,
        type: docType,
        clientId: docClientId,
        clientDenomination: activeClient.denomination,
        items: docItems,
        totalHt: calculatedTotalHt,
        status: docStatus,
        dateStr: docDateStr,
        commentaire: docCommentaire,
        assignedMemberName: docAssignedMemberName || undefined,
        hasBonCommande: docHasBonCommande,
        bonCommandeReference: docHasBonCommande ? finalBcRef : undefined,
        bonCommandeLivraison: docHasBonCommande ? docBonCommandeLivraison : undefined,
        bonCommandeSituation: docHasBonCommande ? docBonCommandeSituation : undefined
      } : d);
      saveCommercialDocs(updatedDocs);
    } else {
      const newDoc: CommercialDoc = {
        id: 'doc-' + Date.now(),
        ref: docRef,
        type: docType,
        clientId: docClientId,
        clientDenomination: activeClient.denomination,
        items: docItems,
        totalHt: calculatedTotalHt,
        status: docStatus,
        dateStr: docDateStr,
        commentaire: docCommentaire,
        assignedMemberName: docAssignedMemberName || undefined,
        hasBonCommande: docHasBonCommande,
        bonCommandeReference: docHasBonCommande ? finalBcRef : undefined,
        bonCommandeLivraison: docHasBonCommande ? docBonCommandeLivraison : undefined,
        bonCommandeSituation: docHasBonCommande ? docBonCommandeSituation : undefined
      };
      saveCommercialDocs([newDoc, ...commercialDocs]);
    }

    setIsDocFormOpen(false);
    setEditingDocId(null);
  };

  const handleAddLineItem = () => {
    if (!selectedDocPieceId) return;
    const foundVar = variables.find(v => v.id === selectedDocPieceId);
    if (!foundVar) return;
    
    const newItem: CommercialDocItem = {
      variableId: selectedDocPieceId,
      nomPiece: `${foundVar.nom} (${foundVar.marque})`,
      prixVenteHt: customDocPiecePrice,
      quantite: customDocPieceQty
    };

    setDocItems([...docItems, newItem]);
    // Reset item input
    setSelectedDocPieceId('');
    setCustomDocPiecePrice(0);
    setCustomDocPieceQty(1);
  };

  const startNewGed = () => {
    setGedTitle('');
    setGedCategory('Manuel de conformité');
    setGedFileName('');
    setSelectedGedFile(null);
    setIsGedFormOpen(true);
  };

  const handleSaveGed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gedTitle.trim()) {
      alert('Veuillez renseigner un titre pour le document.');
      return;
    }

    let finalSize = '1.2 Mo';
    if (selectedGedFile) {
      const bytes = selectedGedFile.size;
      const k = 1024;
      const dm = 1;
      const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      finalSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    } else {
      // simulate standard size below 10 Mo
      const sizes = ['1.2 Mo', '2.5 Mo', '850 Ko', '3.8 Mo', '5.1 Mo', '1.7 Mo'];
      finalSize = sizes[Math.floor(Math.random() * sizes.length)];
    }

    let finalFileName = gedFileName.trim();
    if (!finalFileName) {
      finalFileName = gedTitle.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';
    }

    const newDoc: GedDocument = {
      id: 'ged-' + Date.now(),
      title: gedTitle,
      category: gedCategory,
      fileName: finalFileName,
      fileSize: finalSize,
      dateStr: new Date().toISOString().substring(0, 10)
    };

    saveGedDocs([newDoc, ...gedDocs]);
    setIsGedFormOpen(false);
    setSelectedGedFile(null);
  };

  const handleDeleteGed = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce document ?')) {
      const updated = gedDocs.filter(d => d.id !== id);
      saveGedDocs(updated);
    }
  };

  const handleConsultGed = (doc: GedDocument) => {
    if (doc.fileContent) {
      const link = document.createElement('a');
      link.href = doc.fileContent;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      window.open('https://civilprom.s3.eu-north-1.amazonaws.com/Civilprom1.otf', '_blank');
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce ticket de caisse ?')) {
      const updated = expenses.filter(e => e.id !== id);
      saveExpenses(updated);
    }
  };


  // Save changes to LocalStorage whenever state updates
  const saveClients = (newClients: Client[]) => {
    const sanitized = newClients.map(c => {
      if (!c.signaturePin || !c.signaturePin.trim()) {
        return { ...c, signaturePin: generateRandomPin() };
      }
      return c;
    });
    setClients(sanitized);
    localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(sanitized));
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('clients', sanitized);
    }
  };

  const saveVariables = (newVariables: Variable[]) => {
    setVariables(newVariables);
    localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(newVariables));
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('variables', newVariables);
    }
  };

  const saveDefibs = (newDefibs: Defibrillateur[]) => {
    setDefibrillateurs(newDefibs);
    localStorage.setItem(`defib_${tenantId}_defibrillateurs`, JSON.stringify(newDefibs));
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('defibrillateurs', newDefibs);
    }
  };

  const saveOtherEquipments = (newItems: OtherEquipment[]) => {
    setOtherEquipments(newItems);
    localStorage.setItem(`defib_${tenantId}_other_equipments`, JSON.stringify(newItems));
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('otherEquipments', newItems);
    }
  };

  // Ticket Operations
  const handleAddTicket = (ticketData: Omit<SupportTicket, 'id' | 'date' | 'status'>) => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `#${randomNum}`;
    const newTicket: SupportTicket = {
      id: ticketId,
      ...ticketData,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      status: 'Nouveau'
    };
    const updated = [newTicket, ...tickets];
    setTickets(updated);
    localStorage.setItem('defib_support_tickets', JSON.stringify(updated));

    // Email 4: NOUVEAU SIGNALEMENT FORMULAIRE PUBLIQUE
    try {
      triggerEmail4Signalement(
        ticketData.identifiant || 'Inconnu',
        companyInfo.name || 'Défibeo Suite',
        companyInfo.email || ''
      ).catch(e => console.error("Error triggering Email 4:", e));
    } catch (err) {
      console.error("Error sending signalement email:", err);
    }

    return ticketId;
  };

  const handleUpdateTicketStatus = (id: string, newStatus: SupportTicket['status']) => {
    const updated = tickets.map(t => t.id === id ? { ...t, status: newStatus } : t);
    setTickets(updated);
    localStorage.setItem('defib_support_tickets', JSON.stringify(updated));
  };

  const handleDeleteTicket = (id: string) => {
    const updated = tickets.filter(t => t.id !== id);
    setTickets(updated);
    localStorage.setItem('defib_support_tickets', JSON.stringify(updated));
  };

  const handleUpdateMemoText = (id: string, text: string) => {
    const updated = memos.map(m => m.id === id ? { ...m, text } : m);
    setMemos(updated);
  };

  const handleDeleteMemo = (id: string) => {
    const updated = memos.filter(m => m.id !== id);
    setMemos(updated);
  };

  const handleReplyToTicket = (id: string, responseText: string) => {
    const ticketObj = tickets.find(t => t.id === id);
    const updated = tickets.map(t => t.id === id ? { ...t, reponse: responseText } : t);
    setTickets(updated);
    localStorage.setItem('defib_support_tickets', JSON.stringify(updated));

    // Email 7: RÉPONSE ENVOYÉE DEPUIS LE CRM POUR LE CLIENT
    if (ticketObj && ticketObj.email && ticketObj.email.trim()) {
      try {
        triggerEmail7CrmReply(
          ticketObj.email.trim(),
          responseText,
          companyInfo.name || 'Défibeo Suite',
          companyInfo.email || ''
        ).catch(e => console.error("Error triggering Email 7:", e));
      } catch (err7) {
        console.error("Error sending CRM reply email:", err7);
      }
    }
  };

  // Company and Members Settings Sync
  const handleUpdateCompanyInfo = (info: CompanyInfo) => {
    setCompanyInfo(info);
    localStorage.setItem('defib_company_info', JSON.stringify(info));
  };

  const handleUpdateMembers = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    localStorage.setItem('defib_members', JSON.stringify(updatedMembers));
  };

  // CLIENT CRUD HANDLERS
  const handleAddClient = (clientData: Omit<Client, 'id'>) => {
    const newClient: Client = {
      id: 'c_' + Date.now(),
      ...clientData,
    };
    saveClients([...clients, newClient]);
  };

  const handleUpdateClient = (updated: Client) => {
    saveClients(clients.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteClient = (id: string) => {
    // Check if any defibrillator is using this client
    const linked = defibrillateurs.some((d) => d.clientId === id);
    if (linked) {
      alert(
        "Impossible de supprimer ce client : certains défibrillateurs y sont actuellement rattachés. Veuillez réaffecter ces appareils à un autre client au préalable."
      );
      return;
    }
    saveClients(clients.filter((c) => c.id !== id));
  };

  // VARIABLE CRUD HANDLERS
  const handleAddVariable = (variableData: Omit<Variable, 'id'>) => {
    const newVar: Variable = {
      id: 'v_' + Date.now(),
      ...variableData,
    };
    saveVariables([...variables, newVar]);
  };

  const handleUpdateVariable = (updated: Variable) => {
    saveVariables(variables.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleDeleteVariable = (id: string) => {
    // Check if linked to defibrillateurs inside selected model IDs
    const linked = defibrillateurs.some((d) => 
      d.modeleId === id || 
      d.modeleCoffretId === id ||
      d.modeleElectrodeAId === id ||
      d.modeleElectrodePId === id ||
      d.modeleBatterieId === id
    );
    if (linked) {
      alert(
        "Impossible de supprimer cette variable : elle est référencée sur un ou plusieurs défibrillateurs actifs. Veuillez désaffecter cet équipement avant de poursuivre."
      );
      return;
    }
    saveVariables(variables.filter((v) => v.id !== id));
  };

  // DEFIBRILLATEUR CRUD HANDLERS
  const handleAddDefib = (defibData: Omit<Defibrillateur, 'id'>) => {
    const newDefib: Defibrillateur = {
      id: 'df_' + Date.now(),
      ...defibData,
    };
    saveDefibs([...defibrillateurs, newDefib]);
  };

  const handleUpdateDefib = (updated: Defibrillateur) => {
    const exists = defibrillateurs.some((df) => {
      const idMatch = !!(df.id && updated.id && df.id === updated.id);
      const identifiantMatch = !!(df.identifiant && updated.identifiant && df.identifiant.toUpperCase() === updated.identifiant.toUpperCase());
      return idMatch || identifiantMatch;
    });

    if (exists) {
      saveDefibs(defibrillateurs.map((df) => {
        const isMatch = !!((df.id && updated.id && df.id === updated.id) ||
                        (df.identifiant && updated.identifiant && df.identifiant.toUpperCase() === updated.identifiant.toUpperCase()));
        return isMatch ? { ...df, ...updated, id: df.id } : df;
      }));
    } else {
      const newDefib = { ...updated, id: updated.id || 'df_' + Date.now() };
      saveDefibs([...defibrillateurs, newDefib]);
    }
  };

  const handleDeleteDefib = (id: string) => {
    saveDefibs(defibrillateurs.filter((df) => df.id !== id));
  };

  const handleBulkDeleteDefib = (ids: string[]) => {
    saveDefibs(defibrillateurs.filter((df) => !ids.includes(df.id)));
  };

  const handleBulkEditDefib = (ids: string[], updates: Partial<Omit<Defibrillateur, 'id'>>) => {
    const updatedList = defibrillateurs.map((df) => {
      if (ids.includes(df.id)) {
        return { ...df, ...updates };
      }
      return df;
    });
    saveDefibs(updatedList);
  };

  if (isLoggedIn && (loggedUser?.email === 'tech.ouest@defibeo.com' || localStorage.getItem('defib_logged_user_role') === 'technicien')) {
    return (
      <PublicPortal
        companyInfo={companyInfo}
        members={members}
        onUpdateMembers={handleUpdateMembers}
        defibrillateurs={defibrillateurs}
        onUpdateDefib={handleUpdateDefib}
        variables={variables}
        clients={clients}
        stocks={stocks}
        onUpdateStocks={saveStocks}
        distributedStocks={distributedStocks}
        onUpdateDistributedStocks={saveDistributedStocks}
        fsmTours={fsmTours}
        onUpdateFsmTours={saveFsmTours}
        otherEquipments={otherEquipments}
        onUpdateOtherEquipments={saveOtherEquipments}
        generatedReports={generatedReports}
        onUpdateGeneratedReports={saveReports}
        pointages={pointages}
        onUpdatePointages={savePointages}
        expenses={expenses}
        onUpdateExpenses={saveExpenses}
        commercialDocs={commercialDocs}
        onUpdateCommercialDocs={saveCommercialDocs}
        onAddTicket={handleAddTicket}
        onClose={handleLogout}
        onOpenClientPortal={(client) => {
          setActivePortalClient(client);
          setIsClientPortalOpen(true);
          setIsPublicPortalOpen(false);
        }}
      />
    );
  }

  if (isLoggedIn && loggedUser?.email === 'client@demo.com') {
    return (
      <ClientPortal
        clients={clients}
        defibrillateurs={defibrillateurs}
        otherEquipments={otherEquipments}
        commercialDocs={commercialDocs}
        variables={variables}
        onClose={handleLogout}
        onLogout={handleLogout}
        initialClient={activePortalClient || clients.find(c => c.id === 'c1')}
        companyInfo={companyInfo}
        generatedReports={generatedReports}
        onUpdateClient={(updated) => saveClients(clients.map(c => c.id === updated.id ? updated : c))}
        stocks={stocks}
        pointagesAutoVigilance={pointagesAutoVigilance}
        onAddPointageAutoVigilance={(newPt) => setPointagesAutoVigilance(prev => [newPt, ...prev])}
      />
    );
  }

  if (isSatisfactionFormPage) {
    return <SatisfactionFormPage />;
  }

  if (isClientPortalOpen) {
    return (
      <ClientPortal
        clients={clients}
        defibrillateurs={defibrillateurs}
        otherEquipments={otherEquipments}
        commercialDocs={commercialDocs}
        variables={variables}
        onClose={() => {
          const role = localStorage.getItem('defib_logged_user_role');
          if (role === 'client' || role === 'technicien') {
            handleLogout();
          } else {
            setIsClientPortalOpen(false);
            setActivePortalClient(null);
          }
        }}
        onLogout={handleLogout}
        initialClient={activePortalClient}
        companyInfo={companyInfo}
        generatedReports={generatedReports}
        onUpdateClient={(updated) => saveClients(clients.map(c => c.id === updated.id ? updated : c))}
        stocks={stocks}
        pointagesAutoVigilance={pointagesAutoVigilance}
        onAddPointageAutoVigilance={(newPt) => setPointagesAutoVigilance(prev => [newPt, ...prev])}
      />
    );
  }

  if (isPublicPortalOpen) {
    return (
      <PublicPortal
        companyInfo={companyInfo}
        members={members}
        onUpdateMembers={handleUpdateMembers}
        defibrillateurs={defibrillateurs}
        onUpdateDefib={handleUpdateDefib}
        variables={variables}
        clients={clients}
        stocks={stocks}
        onUpdateStocks={saveStocks}
        distributedStocks={distributedStocks}
        onUpdateDistributedStocks={saveDistributedStocks}
        fsmTours={fsmTours}
        onUpdateFsmTours={saveFsmTours}
        otherEquipments={otherEquipments}
        onUpdateOtherEquipments={saveOtherEquipments}
        generatedReports={generatedReports}
        onUpdateGeneratedReports={saveReports}
        pointages={pointages}
        onUpdatePointages={savePointages}
        expenses={expenses}
        onUpdateExpenses={saveExpenses}
        commercialDocs={commercialDocs}
        onUpdateCommercialDocs={saveCommercialDocs}
        onAddTicket={handleAddTicket}
        onClose={() => {
          const role = localStorage.getItem('defib_logged_user_role');
          if (role === 'technicien' || role === 'client') {
            handleLogout();
          } else {
            setIsPublicPortalOpen(false);
          }
        }}
        onOpenClientPortal={(client) => {
          setActivePortalClient(client);
          setIsClientPortalOpen(true);
          setIsPublicPortalOpen(false);
        }}
      />
    );
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (windowWidth < 1000) {
    return (
      <div 
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center text-center font-sans p-6" 
        style={{ 
          background: 'radial-gradient(#7e2e86, #36093a)',
          color: '#ffffff'
        }}
        id="resolution-warning-overlay"
      >
        <div className="flex flex-col items-center gap-4 max-w-lg">
          <span className="text-white text-[18px] font-sans font-medium leading-relaxed">
            Le logiciel doit-être utilisé depuis un ordinateur d'au moins 1000 pixels de large.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" id="app-root-container">
      {(showEnvLoading || !isFirebaseLoaded) && (
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center text-center font-sans gap-4" 
          style={{ 
            background: 'radial-gradient(#7e2e86, #36093a)',
            fontSize: '18px',
            color: '#ffffff'
          }}
          id="env-loading-overlay"
        >
          <span className="text-white text-[18px] font-sans text-center">Chargement de votre environnement...</span>
        </div>
      )}
      {/* LEFT SIDE BAR PANE */}
      <aside 
        className="w-64 text-slate-100 flex flex-col h-screen sticky top-0 shrink-0 shadow-xl z-30" 
        style={{ 
          background: 'linear-gradient(#7e2e86, #36093a)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }} 
        id="app-sidebar"
      >
        {/* Brand Header */}
        <div 
          className="py-1 px-4" 
          style={{ 
            background: 'rgb(255 255 255 / 5%)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)' 
          }}
        >
          <div className="flex justify-center items-center">
            <img 
              src="https://datacenter64000pau.s3.eu-north-1.amazonaws.com/Defibeo_2026_Logo2.svg" 
              alt="Défibeo Logo" 
              style={{ width: '155px' }}
              className="h-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
          {[
            { id: 'defibrillateurs', label: 'Défibrillateurs', icon: Heart },
            ...(enableOtherEquipments === "Oui" ? [{ id: 'autres-materiels', label: 'Autres matériels', icon: Layers }] : []),
            { id: 'clients', label: 'Clients', icon: User },
            { id: 'fsm', label: 'FSM', icon: Flame },
            { id: 'gmao', label: 'GMAO', icon: Wrench },
            { id: 'stocks', label: 'Centrale des stocks', icon: Inbox },
            { id: 'stocks-distribues', label: 'Stocks distribués', icon: Layers },
            { id: 'achats-fournisseurs', label: 'Achats fournisseurs', icon: ShoppingBag },
            { id: 'devis', label: 'Devis & Factures', icon: FileSpreadsheet },
            { id: 'crm', label: 'CRM', icon: FolderSync },
            { id: 'ged', label: 'GED', icon: ClipboardList },
            { id: 'temps', label: 'Temps', icon: Clock },
            { id: 'localisations', label: 'Localisations', icon: MapPin },
            { id: 'tickets', label: 'Tickets Caisse', icon: Ticket },
            { id: 'variables', label: 'Variables', icon: Layers },
            { id: 'import-export', label: 'Importer Exporter', icon: Download },
            { id: 'satisfaction', label: 'Satisfaction', icon: ThumbsUp },
            { id: 'statistiques', label: 'Statistiques', icon: TrendingUp },
          ].map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AppTab)}
                id={`tab-selector-${tab.id}`}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all focus:outline-hidden cursor-pointer text-left border-0 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-white hover:bg-white/8 hover:text-white'
                }`}
                style={activeTab === tab.id ? {
                  boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #3556ec, inset 0 6px 12px #ffffff1f',
                  background: '#3556ec',
                  fontSize: '18px',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  fontWeight: 'bold',
                  fontFamily: "DefibeoMain, Civilprom, sans-serif"
                } : {
                  fontSize: '18px',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  fontWeight: 'bold'
                }}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sticky bottom Parametres button inside pane (full-width) */}
        <div 
          className="p-3" 
          style={{ 
            background: 'rgb(255 255 255 / 5%)', 
            borderTop: '1px solid rgba(255, 255, 255, 0.15)' 
          }}
        >
          <button
            onClick={() => setActiveTab('parametres')}
            id="sidebar-btn-settings"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all border-0 cursor-pointer text-white hover:brightness-110 active:scale-[0.98]"
            style={{
              boxShadow: activeTab === 'parametres'
                ? 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 10px 15px -3px rgba(53, 86, 236, 0.4), inset 0 6px 12px #ffffff1f'
                : 'inset 0 1px 1px #fff3, 0 1px 2px #08080822, 0 2px 4px #0808080a',
              background: '#3556ec',
              fontSize: '18px',
              textTransform: 'none',
              letterSpacing: 'normal',
              fontWeight: 'bold',
              fontFamily: "DefibeoMain, Civilprom, sans-serif"
            }}
          >
            <span>Paramètres</span>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE CONTAINER */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-[#f6f6f6]">
        {/* Dashboard Workspace Viewports wrapper */}
        <main className="flex-1 w-full" id="main-content">
          {/* Sub-component Active tab wrapper */}
          <section className={`${activeTab === 'parametres' ? 'bg-white' : 'pb-16'} p-0`} id="active-tab-content-wrapper">
          {activeTab === 'defibrillateurs' && (
            <DefibTab
              defibrillateurs={defibrillateurs}
              clients={clients}
              variables={variables}
              onAddDefib={handleAddDefib}
              onUpdateDefib={handleUpdateDefib}
              onDeleteDefib={handleDeleteDefib}
              onBulkDelete={handleBulkDeleteDefib}
              onBulkEdit={handleBulkEditDefib}
              fsmTours={fsmTours}
              onUpdateFsmTours={saveFsmTours}
              setActiveTab={setActiveTab}
              onShowGmaoReports={(identifiant) => {
                setActiveTab('gmao');
                setGmaoSearchQuery(identifiant);
              }}
              companyInfo={companyInfo}
              members={members}
            />
          )}

          {activeTab === 'autres-materiels' && (
            <AutresMaterielsTab
              otherEquipments={otherEquipments}
              saveOtherEquipments={saveOtherEquipments}
              clients={clients}
              fsmTours={fsmTours}
              onUpdateFsmTours={saveFsmTours}
              setActiveTab={setActiveTab}
              members={members}
              defibrillateurs={defibrillateurs}
            />
          )}

          {activeTab === 'clients' && (
            <ClientTab
              clients={clients}
              defibrillateurs={defibrillateurs}
              variables={variables}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              companyInfo={companyInfo}
            />
          )}

          {activeTab === 'variables' && (
            <VariableTab
              variables={variables}
              onAddVariable={handleAddVariable}
              onUpdateVariable={handleUpdateVariable}
              onDeleteVariable={handleDeleteVariable}
            />
          )}

          {/* ======================================= */}
          {/* FSM (Field Service Management) MODULE */}
          {/* ======================================= */}
          {/* ======================================= */}
          {/* FSM (Field Service Management) MODULE */}
          {/* ======================================= */}
          {activeTab === 'fsm' && (() => {
            const AVAILABLE_PARTS = [
              "Électrodes Adultes",
              "Électrodes Pédiatriques",
              "Batterie Lithium 5 ans",
              "Batterie Lithium 2 ans",
              "Kit d'Intervention standard",
              "Boîtier Mural Chauffant Aivia",
              "Signalétique DAE Normative"
            ];

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

            const blueButtonStyle: React.CSSProperties = {
              ...customButtonStyle,
              backgroundColor: 'rgb(53, 86, 236)',
              boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
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

            const uniqueDates = Array.from(new Set(fsmTours.map((t: any) => t.startDate).filter(Boolean))).sort() as string[];
            const activeDateFilter = fsmDateFilter === 'Tous' ? (uniqueDates[0] || 'Tous') : fsmDateFilter;

            const filteredTours = fsmTours.filter((tour) => {
              if (activeDateFilter !== 'Tous' && tour.startDate !== activeDateFilter) {
                return false;
              }
              const query = fsmSearchQuery.toLowerCase().trim();
              if (!query) return true;
              const titleMatch = (tour.title || '').toLowerCase().includes(query);
              const techMatch = (tour.techName || '').toLowerCase().includes(query);
              return titleMatch || techMatch;
            });

            return (
              <div className="space-y-6 animate-fadeIn" id="fsm-tab-container">
                <style>{`
                  #fsm-tab-container input:not([type="radio"]):not([type="checkbox"]):not(#search-fsm-input),
                  #fsm-tab-container select,
                  #fsm-tab-container textarea {
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
                  #fsm-tab-container input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-fsm-input),
                  #fsm-tab-container input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-fsm-input),
                  #fsm-tab-container select:hover:not(:disabled),
                  #fsm-tab-container select:focus:not(:disabled),
                  #fsm-tab-container textarea:hover:not(:disabled),
                  #fsm-tab-container textarea:focus:not(:disabled),
                  #fsm-tab-container #search-fsm-input:hover,
                  #fsm-tab-container #search-fsm-input:focus {
                    outline: 2.5px solid #fa53d5 !important;
                    outline-offset: 2px !important;
                    transition: all 0s !important;
                  }
                  #fsm-tab-container select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: none !important;
                  }
                  #fsm-tab-container select option {
                    color: #000000 !important;
                    background: #ffffff !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #fsm-tab-container input[type="date"]::-webkit-calendar-picker-indicator {
                    display: none !important;
                    -webkit-appearance: none !important;
                    background: none !important;
                    width: 0 !important;
                    height: 0 !important;
                  }
                  #fsm-tab-container label,
                  #fsm-tab-container .fsm-label-style {
                    letter-spacing: normal !important;
                    text-transform: none !important;
                    font-size: 16px !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #fsm-tab-container select.padding-with-dot {
                    padding-left: 27px !important;
                  }
                  #fsm-tab-container input:disabled,
                  #fsm-tab-container select:disabled {
                    background-color: #f1f5f9 !important;
                    color: #555555 !important;
                    cursor: not-allowed !important;
                    opacity: 0.82 !important;
                  }
                `}</style>

                {/* Upper Action Block & Search metrics */}
                <div 
                  className="bg-white space-y-4"
                  style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight font-gochi" style={{ color: '#000000', cursor: 'default' }} id="fsm-tab-title">FSM</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Field recherche (Search input) */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          id="search-fsm-input"
                          value={fsmSearchQuery}
                          onChange={(e) => setFsmSearchQuery(e.target.value)}
                          placeholder="Recherche."
                          className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                          style={{
                            border: '1px solid #dedede',
                            borderRadius: '13px',
                            padding: '9px 19px',
                            fontSize: '18px',
                            fontWeight: '100',
                            color: '#000000',
                            backgroundColor: '#ffffff',
                            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                            outline: 'none',
                            transition: 'all 0s',
                          }}

                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => window.location.reload()}
                          id="btn-refresh-fsm"
                          style={customButtonStyle}
                        >
                          Actualiser
                        </button>
                        <button
                          onClick={addFsmTour}
                          id="btn-add-tour"
                          style={blueButtonStyle}
                        >
                          Nouvelle tournée
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <datalist id="fsm-techs-list">
                  {members
                    .filter(m => {
                      const roleLower = (m.role || '').toLowerCase();
                      return roleLower.includes('tech') || roleLower.includes('maintenance') || roleLower.includes('terrain');
                    })
                    .map(m => m.name)
                    .map((name, idx) => (
                      <option key={idx} value={name} />
                    ))}
                </datalist>

                <datalist id="fsm-clients-list">
                  {clients.map(c => c.name).map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>

                <datalist id="fsm-defibs-list">
                  {defibrillateurs.map(d => d.identifiant).map((ident, idx) => (
                    <option key={idx} value={ident} />
                  ))}
                </datalist>

                {fsmTours.length > 0 && (() => {
                  const formatFrenchDate = (dateStr: string): string => {
                    if (!dateStr) return '';
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      const d = parseInt(parts[2], 10);
                      const m = parseInt(parts[1], 10);
                      const y = parts[0];
                      const months = [
                        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                      ];
                      const monthName = months[m - 1] || '';
                      return `${d} ${monthName} ${y}`;
                    }
                    return dateStr;
                  };

                  return (
                    <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="fsm-dates-pills">
                      {uniqueDates.map(dateStr => (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => setFsmDateFilter(dateStr)}
                          style={{
                            borderRadius: '1000px',
                            padding: '10px 20px',
                            fontSize: '15px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                            backgroundColor: activeDateFilter === dateStr ? '#fa53d5' : '#ffffff',
                            color: activeDateFilter === dateStr ? '#ffffff' : '#000000',
                            border: activeDateFilter === dateStr ? '1px solid #fa53d5' : '1px solid rgb(218, 218, 218)',
                            transition: 'all 0.15s ease'
                          }}
                          className="transition-all"
                        >
                          Tournée(s) {formatFrenchDate(dateStr)}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {fsmTours.length === 0 ? (
                  <div className="p-16 text-center font-sans lg:py-24" id="no-fsm-view">
                    <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>Aucun résultat.</p>
                  </div>
                ) : filteredTours.length === 0 ? (
                  <div className="p-16 text-center font-sans lg:py-24" id="fsm-no-results-view">
                    <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>Aucune tournée ne correspond à votre recherche</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {filteredTours.map((t) => {
                      const draft = fsmTourDrafts[t.id] || {};
                      const tourTitle = draft.title !== undefined ? draft.title : (t.title || '');
                      const tourTechName = draft.techName !== undefined ? draft.techName : (t.techName || '');
                      const tourStartDate = draft.startDate !== undefined ? draft.startDate : (t.startDate || '');
                      const tourStatus = draft.status !== undefined ? draft.status : (t.status || 'Brouillon');
                      const tourVehicule = draft.vehicule !== undefined ? draft.vehicule : (t.vehicule || 'Aucun');

                      return (
                        <div key={t.id} className="bg-white relative space-y-6 animate-fadeIn" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px', maxWidth: '98%', margin: '24px auto', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                          {/* THE INTERCALAIRE TOUR HEADER */}
                          <div className="bg-white px-5 py-5 flex flex-col gap-4 font-sans" style={{ borderBottom: '1px solid rgb(218, 218, 218)', borderRadius: '17px 17px 0px 0px', backgroundColor: '#ffffff' }}>
                            {/* Row 1: Titre de la tournée + Action Buttons */}
                            <div className="flex flex-col md:flex-row md:items-end gap-3 w-full">
                              <div className="flex-1">
                                <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Titre de la tournée.</label>
                                <input
                                  type="text"
                                  value={tourTitle}
                                  onChange={(e) => {
                                    setFsmTourDrafts(prev => ({
                                      ...prev,
                                      [t.id]: {
                                        ...(prev[t.id] || {}),
                                        title: e.target.value
                                      }
                                    }));
                                  }}
                                style={{
                                  border: '1px solid #dedede',
                                  borderRadius: '13px',
                                  padding: '12px',
                                  fontSize: '16px',
                                  fontWeight: '100',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  width: '100%'
                                }}
                                className="font-sans focus:outline-none"
                                placeholder="Entrez un titre."
                              />
                            </div>

                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                              {/* Supprimer button */}
                              <button
                                type="button"
                                onClick={() => deleteFsmTour(t.id)}
                                style={{
                                  ...rowActionButtonStyle,
                                  padding: '12px 24px',
                                  borderRadius: '13px',
                                  fontSize: '18px',
                                  fontWeight: '100',
                                  height: '50px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%'
                                }}
                                className="cursor-pointer md:w-auto flex-1 md:flex-initial"
                              >
                                Supprimer
                              </button>

                              {/* Enregistrer button */}
                              <button
                                type="button"
                                disabled={!!savingTourIds[t.id]}
                                onClick={() => {
                                  if (savingTourIds[t.id]) return;

                                  const draftVal = fsmTourDrafts[t.id] || {};
                                  const finalTitle = draftVal.title !== undefined ? draftVal.title : (t.title || '');
                                  const finalTech = draftVal.techName !== undefined ? draftVal.techName : (t.techName || '');

                                  if (!finalTitle.trim()) {
                                    alert("Le titre de la tournée est requis.");
                                    return;
                                  }
                                  if (!finalTech || finalTech === "Sélectionner un technicien." || finalTech.trim() === '') {
                                    alert("Veuillez sélectionner un technicien.");
                                    return;
                                  }

                                  // Disable button and lower opacity
                                  setSavingTourIds(prev => ({ ...prev, [t.id]: true }));

                                  // Apply draft changes
                                  if (fsmTourDrafts[t.id]) {
                                    updateFsmTour(t.id, fsmTourDrafts[t.id]);
                                    if (fsmTourDrafts[t.id].startDate) {
                                      setFsmDateFilter(fsmTourDrafts[t.id].startDate);
                                    }
                                    setFsmTourDrafts(prev => {
                                      const copy = { ...prev };
                                      delete copy[t.id];
                                      return copy;
                                    });
                                  } else {
                                    saveFsmTours([...fsmTours]);
                                  }
                                  alert("La tournée a été enregistrée avec succès !");

                                  // Re-enable after 3 seconds
                                  setTimeout(() => {
                                    setSavingTourIds(prev => {
                                      const copy = { ...prev };
                                      delete copy[t.id];
                                      return copy;
                                    });
                                  }, 3000);
                                }}
                                style={{
                                  ...blueButtonStyle,
                                  padding: '12px 24px',
                                  borderRadius: '13px',
                                  fontSize: '18px',
                                  fontWeight: '100',
                                  height: '50px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '100%',
                                  opacity: savingTourIds[t.id] ? 0.7 : 1,
                                  pointerEvents: savingTourIds[t.id] ? 'none' : 'auto'
                                }}
                                className={`${savingTourIds[t.id] ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} md:w-auto flex-1 md:flex-initial`}
                              >
                                Enregistrer
                              </button>
                            </div>
                          </div>

                          {/* Indication of missions and estimated travel duration */}
                          {(() => {
                            const mLength = t.missions ? t.missions.length : 0;
                            const daysEstimate = Math.ceil(mLength / 6);
                            return (
                              <div 
                                style={{
                                  color: '#3b5bf0',
                                  backgroundColor: '#e7ebff',
                                  border: 'none',
                                  cursor: 'default'
                                }}
                                className="font-semibold text-sm px-4 py-3 rounded-xl flex items-center gap-2.5 mx-0.5"
                              >
                                <span>
                                  La tournée comporte <strong className="font-extrabold">{mLength} {mLength > 1 ? 'missions' : 'mission'}</strong>, nous estimons à <strong className="font-extrabold">{daysEstimate} {daysEstimate > 1 ? 'jours' : 'jour'}</strong> la durée du déplacement.
                                </span>
                              </div>
                            );
                          })()}

                          {/* Row 2: Technicien, Véhicule, Date, Situation */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                            {/* Technicien */}
                            <div className="w-full">
                              <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Technicien.</label>
                              <select
                                value={tourTechName}
                                onChange={(e) => {
                                  setFsmTourDrafts(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...(prev[t.id] || {}),
                                      techName: e.target.value
                                    }
                                  }));
                                }}
                                style={{
                                  border: '1px solid #dedede',
                                  borderRadius: '13px',
                                  padding: '12px',
                                  fontSize: '16px',
                                  fontWeight: '100',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  width: '100%'
                                }}
                                className="font-sans cursor-pointer focus:outline-none"
                              >
                                {(!tourTechName || tourTechName.trim() === '') && (
                                  <option value="">Sélectionner un technicien.</option>
                                )}
                                {(() => {
                                  const techOptions = Array.from(new Set([
                                    ...members.filter(m => {
                                      const roleLower = (m.role || '').toLowerCase();
                                      return roleLower.includes('tech') || roleLower.includes('maintenance') || roleLower.includes('terrain');
                                    }).map(m => m.name),
                                    tourTechName
                                  ].filter(Boolean).filter(name => name.trim() !== '')));
                                  return techOptions.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>

                            {/* Véhicule */}
                            <div className="w-full">
                              <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Véhicule.</label>
                              <select
                                value={tourVehicule}
                                onChange={(e) => {
                                  setFsmTourDrafts(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...(prev[t.id] || {}),
                                      vehicule: e.target.value
                                    }
                                  }));
                                }}
                                style={{
                                  border: '1px solid #dedede',
                                  borderRadius: '13px',
                                  padding: '12px',
                                  fontSize: '16px',
                                  fontWeight: '100',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  width: '100%'
                                }}
                                className="font-sans cursor-pointer focus:outline-none"
                              >
                                {['Aucun', 'Véhicule A', 'Véhicule B', 'Véhicule C', 'Véhicule D', 'Véhicule E', 'Véhicule F'].map((veh) => (
                                  <option key={veh} value={veh}>
                                    {veh}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Date */}
                            <div className="w-full">
                              <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Date période.</label>
                              <input
                                type="date"
                                value={tourStartDate}
                                onChange={(e) => {
                                  setFsmTourDrafts(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...(prev[t.id] || {}),
                                      startDate: e.target.value
                                    }
                                  }));
                                }}
                                style={{
                                  border: '1px solid #dedede',
                                  borderRadius: '13px',
                                  padding: '12px',
                                  fontSize: '16px',
                                  fontWeight: '100',
                                  color: '#000000',
                                  backgroundColor: '#ffffff',
                                  width: '100%'
                                }}
                                className="font-sans cursor-pointer focus:outline-none"
                              />
                            </div>

                            {/* Situation. */}
                            <div className="w-full">
                              <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Situation.</label>
                              <div className="relative flex items-center">
                                <div 
                                  style={{
                                    position: 'absolute',
                                    left: '11px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: 
                                      tourStatus === 'Brouillon' ? '#94a3b8' : 
                                      tourStatus === 'À faire' ? '#3b82f6' :  
                                      tourStatus === 'En cours' ? '#ef4444' :  
                                      tourStatus === 'Effectué' ? '#22c55e' :  
                                      '#94a3b8',
                                    zIndex: 10,
                                    pointerEvents: 'none'
                                  }}
                                />
                                <select
                                  value={tourStatus}
                                  onChange={(e) => {
                                    setFsmTourDrafts(prev => ({
                                      ...prev,
                                      [t.id]: {
                                        ...(prev[t.id] || {}),
                                        status: e.target.value
                                      }
                                    }));
                                  }}
                                  style={{
                                    border: '1px solid #dedede',
                                    borderRadius: '13px',
                                    paddingLeft: '34px',
                                    paddingRight: '12px',
                                    paddingTop: '12px',
                                    paddingBottom: '12px',
                                    fontSize: '16px',
                                    fontWeight: '100',
                                    backgroundColor: '#ffffff',
                                    color: '#000000',
                                    width: '100%'
                                  }}
                                  className="font-sans padding-with-dot cursor-pointer focus:outline-none"
                                >
                                  <option value="Brouillon">Brouillon</option>
                                  <option value="À faire">À faire</option>
                                  <option value="En cours">En cours</option>
                                  <option value="Effectué">Effectué</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Technician skills line */}
                          {(() => {
                            const selectedMember = members.find(m => m.name === tourTechName);
                            const comps = selectedMember?.competences || [];
                            const compsStr = comps.length > 0 ? comps.join(', ') : 'Aucune';
                            return (
                              <div className="px-5 pb-1 text-sm text-slate-700 font-sans -mt-3">
                                <span className="font-semibold text-slate-900">Compétences : </span>
                                <span className="italic text-slate-600">{compsStr}</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* TOUR MISSIONS LIST */}
                        <div className="p-4 space-y-4">
                          {t.missions.length === 0 ? (
                            <div className="py-6 text-center font-sans bg-white rounded-xl border border-slate-205" style={{ color: '#000000', fontSize: '16px', border: 'none' }}>
                              Aucune mission.
                            </div>
                          ) : (
                            <div className="space-y-4 bg-white">
                              {t.missions.map((m: any, idx: number) => {
                                const calculatedDate = (() => {
                                  if (!tourStartDate) return '';
                                  const d = new Date(tourStartDate);
                                  if (isNaN(d.getTime())) return tourStartDate;
                                  const daysToAdd = Math.floor(idx / 6);
                                  d.setDate(d.getDate() + daysToAdd);
                                  return d.toISOString().split('T')[0];
                                })();
                                const estimatedDateValue = m.estimatedDate || calculatedDate;
                                return (
                                  <div key={m.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-3xs transition-shadow space-y-4 font-sans">
                                      {/* Ligne 1: Numéro de passage */}
                                      <div className="flex flex-wrap items-center gap-2 bg-white pb-0.5">
                                        <div
                                          style={{
                                            backgroundColor: '#fa53d5',
                                            color: '#ffffff',
                                            fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                            fontWeight: 610,
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px'
                                          }}
                                        >
                                          {idx + 1}
                                        </div>
                                        <span
                                          style={{
                                            backgroundColor: 'rgb(77, 21, 83)',
                                            color: 'rgb(255, 255, 255)',
                                            borderRadius: '1000px',
                                            padding: '4px 12px',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            border: 'none'
                                          }}
                                        >
                                          {m.equipmentType || (() => {
                                            const isDefib = defibrillateurs.some((d: any) => d.identifiant === m.defibIdentifiant);
                                            if (isDefib) return 'Défibrillateur';
                                            const other = otherEquipments.find((o: any) => o.identifiant === m.defibIdentifiant);
                                            if (other) return other.categorie;
                                            return m.reason?.toLowerCase().includes('autre') ? 'Autre matériel' : 'Défibrillateur';
                                          })()}
                                        </span>

                                        {(() => {
                                          const matchedDefib = defibrillateurs.find((d: any) => d.identifiant === m.defibIdentifiant);
                                          if (!matchedDefib) return null;
                                          
                                          const renderCapsule = (label: string, rawVal: string, colorClasses: string) => {
                                            if (!rawVal || rawVal.trim() === '' || rawVal.trim() === '-') return null;
                                            const formatted = formatDateToFR(rawVal);
                                            if (!formatted || formatted === '-') return null;
                                            return (
                                              <span key={label} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-sans border font-medium ${colorClasses}`}>
                                                <span className="font-extrabold mr-1">{label}</span>
                                                {formatted}
                                              </span>
                                            );
                                          };

                                          const nextMaint = computeProchaineMaintenance(matchedDefib.derniereMaintenance);

                                          return (
                                            <div className="flex flex-wrap gap-1 md:gap-1.5 ml-1 md:ml-2 items-center">
                                              {renderCapsule('Péremption A.', matchedDefib.peremptionElectrodeA, 'bg-rose-50 text-rose-700 border-rose-200')}
                                              {renderCapsule('Péremption A.S.', matchedDefib.peremptionSecoursElectrodeA || '', 'bg-rose-50 text-rose-700 border-rose-200')}
                                              {renderCapsule('Péremption P.', matchedDefib.peremptionElectrodeP, 'bg-purple-50 text-purple-700 border-purple-200')}
                                              {renderCapsule('Péremption P.S.', matchedDefib.peremptionSecoursElectrodeP || '', 'bg-purple-50 text-purple-700 border-purple-200')}
                                              {renderCapsule('Péremption B.', matchedDefib.peremptionBatterie, 'bg-amber-50 text-amber-700 border-amber-250')}
                                              {renderCapsule('Expiration G.', matchedDefib.finGarantie, 'bg-blue-50 text-blue-700 border-blue-200')}
                                              {renderCapsule('Prochaine V.', nextMaint, 'bg-emerald-50 text-emerald-700 border-emerald-250')}
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Ligne 2: Site., Identifiant., Raison., Date estimée., Créneau estimé., Situation. */}
                                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 w-full bg-white">
                                        {/* Site. (toujours disabled) */}
                                        <div className="space-y-0.5 bg-white">
                                          <label className="block mb-1 fsm-label-style">Site.</label>
                                          <input
                                            type="text"
                                            value={m.clientName || ""}
                                            disabled={true}
                                            className="w-full font-sans cursor-not-allowed"
                                            placeholder="Nom du Site"
                                          />
                                        </div>

                                        {/* Identifiant. (toujours disabled) */}
                                        <div className="space-y-0.5 bg-white">
                                          <label className="block mb-1 fsm-label-style">Identifiant.</label>
                                          <input
                                            type="text"
                                            value={m.defibIdentifiant || ""}
                                            disabled={true}
                                            className="w-full font-mono cursor-not-allowed"
                                            placeholder="ID Défib"
                                          />
                                        </div>

                                        {/* Raison. */}
                                        <div className="space-y-0.5 bg-white">
                                          <label className="block mb-1 fsm-label-style">Raison.</label>
                                          <select
                                            value={m.reason}
                                            onChange={(e) => updateFsmMission(t.id, m.id, { reason: e.target.value })}
                                            className="w-full font-sans focus:outline-none cursor-pointer"
                                          >
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Mise en service">Mise en service</option>
                                            <option value="Installation">Installation</option>
                                            <option value="Pose">Pose</option>
                                            <option value="Formation">Formation</option>
                                            <option value="Installation et formation">Installation et formation</option>
                                            <option value="Remplacement B">Remplacement B</option>
                                            <option value="Remplacer B & A">Remplacer B & A</option>
                                            <option value="Remplacer A & P">Remplacer A & P</option>
                                            <option value="Remplacer B & P">Remplacer B & P</option>
                                            <option value="Remplacement A">Remplacement A</option>
                                            <option value="Remplacement P">Remplacement P</option>
                                            <option value="Remplacement">Remplacement</option>
                                            <option value="Diagnostic">Diagnostic</option>
                                            <option value="Non renseigné">Non renseigné</option>
                                          </select>
                                        </div>

                                        {/* Date estimée. */}
                                        <div className="space-y-0.5 bg-white">
                                          <label className="block mb-1 fsm-label-style">Date estimée.</label>
                                          <input
                                            type="date"
                                            value={estimatedDateValue}
                                            onChange={(e) => updateFsmMission(t.id, m.id, { estimatedDate: e.target.value })}
                                            className="w-full font-sans cursor-pointer focus:outline-none"
                                            style={{
                                              border: '1px solid #dedede',
                                              borderRadius: '13px',
                                              padding: '12px',
                                              fontSize: '16px',
                                              fontWeight: '100',
                                              color: '#000000',
                                              backgroundColor: '#ffffff'
                                            }}
                                          />
                                        </div>

                                        {/* Créneau estimé. */}
                                        <div className="space-y-0.5 bg-white">
                                          <label className="block mb-1 fsm-label-style">Créneau estimé.</label>
                                          <select
                                            value={m.estimatedSlot || ''}
                                            onChange={(e) => updateFsmMission(t.id, m.id, { estimatedSlot: e.target.value })}
                                            className="w-full font-sans focus:outline-none cursor-pointer"
                                            style={{
                                              border: '1px solid #dedede',
                                              borderRadius: '13px',
                                              padding: '12px',
                                              fontSize: '16px',
                                              fontWeight: '100',
                                              color: '#000000',
                                              backgroundColor: '#ffffff'
                                            }}
                                          >
                                            <option value="">-- Non défini --</option>
                                            <option value="8:00am">8:00am</option>
                                            <option value="8:30am">8:30am</option>
                                            <option value="9:00am">9:00am</option>
                                            <option value="9:30am">9:30am</option>
                                            <option value="10:00am">10:00am</option>
                                            <option value="10:30am">10:30am</option>
                                            <option value="11:00am">11:00am</option>
                                            <option value="11:30am">11:30am</option>
                                            <option value="12:00pm">12:00pm</option>
                                            <option value="12:30pm">12:30pm</option>
                                            <option value="13:00pm">13:00pm</option>
                                            <option value="13:30pm">13:30pm</option>
                                            <option value="14:00pm">14:00pm</option>
                                            <option value="14:30pm">14:30pm</option>
                                            <option value="15:00pm">15:00pm</option>
                                            <option value="15:30pm">15:30pm</option>
                                            <option value="16:00pm">16:00pm</option>
                                            <option value="16:30pm">16:30pm</option>
                                            <option value="17:00pm">17:00pm</option>
                                            <option value="17:30pm">17:30pm</option>
                                            <option value="18:00pm">18:00pm</option>
                                            <option value="18:30pm">18:30pm</option>
                                            <option value="19:00pm">19:00pm</option>
                                          </select>
                                        </div>

                                        {/* Situation. */}
                                        <div className="space-y-0.5 font-sans relative bg-white">
                                          <label className="block mb-1 fsm-label-style">Situation.</label>
                                          <div className="relative flex items-center bg-white">
                                            <div 
                                              style={{
                                                position: 'absolute',
                                                left: '14px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: 
                                                  (m.status || 'À faire') === 'Brouillon' ? '#94a3b8' : 
                                                  (m.status || 'À faire') === 'À faire' ? '#3b82f6' :  
                                                  (m.status || 'À faire') === 'En cours' ? '#ef4444' :  
                                                  (m.status || 'À faire') === 'Effectué' ? '#22c55e' :  
                                                  '#3b82f6',
                                                zIndex: 10,
                                                pointerEvents: 'none'
                                              }}
                                            />
                                            <select
                                              value={m.status || 'À faire'}
                                              onChange={(e) => updateFsmMission(t.id, m.id, { status: e.target.value })}
                                              style={{
                                                paddingLeft: '34px',
                                                paddingRight: '12px',
                                                paddingTop: '12px',
                                                paddingBottom: '12px',
                                                width: '100%'
                                              }}
                                              className="w-full font-sans focus:outline-none cursor-pointer font-semibold padding-with-dot"
                                            >
                                              <option value="À faire">À faire</option>
                                              <option value="Effectué">Effectué</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>

                                  {/* Lookup field for required components with stock items selector */}
                                  {(() => {
                                    const stockItems = (distributedStocks || [])
                                      .filter(ds => {
                                        const vObj = variables.find(v => v.id === ds.denominationPieceId);
                                        return vObj ? vObj.category !== 'Modèle Service' : true;
                                      })
                                      .map(ds => {
                                        const vObj = variables.find(v => v.id === ds.denominationPieceId);
                                        const name = vObj ? vObj.nom : `Pièce indéfinie`;
                                        const matchedStock = stocks.find(s => s.id === ds.stockId || s.denominationPieceId === ds.denominationPieceId);
                                        const ugs = matchedStock?.ugs || '';
                                        const ugsString = ugs ? ` - UGS: ${ugs}` : '';
                                        return {
                                          id: ds.id,
                                          name: name,
                                          locationName: ds.locationName,
                                          volumeDisponible: ds.volumeDisponible,
                                          label: `${name} (${ds.locationName} - Qté dispo: ${ds.volumeDisponible}${ugsString})`
                                        };
                                      });

                                    return (
                                      <div className="pt-2 space-y-2.5 relative font-sans w-full bg-white">
                                        <div className="flex justify-between items-center bg-white">
                                          <span className="fsm-label-style bg-white" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>
                                            Pièces requises.
                                          </span>
                                        </div>

                                        {/* SELECTED PIECES BADGES */}
                                        {m.requiredParts.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 min-h-[24px] items-center bg-white">
                                            {m.requiredParts.map((part: string) => (
                                              <span
                                                key={part}
                                                onClick={() => {
                                                  const updatedParts = m.requiredParts.filter((p: string) => p !== part);
                                                  changeFsmMissionParts(t.id, m.id, m.requiredParts, updatedParts);
                                                }}
                                                style={{
                                                  fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                                }}
                                                className="cursor-pointer inline-flex items-center rounded-full bg-white border border-slate-200 text-slate-800 text-[15px] px-3.5 py-1.5 font-medium hover:bg-red-800 hover:border-red-800 hover:text-white transition-all duration-150 select-none"
                                                title="Cliquez pour supprimer"
                                              >
                                                {part} (x1)
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        {/* NATIVE SYSTEM DROPDOWN SELECTOR */}
                                        <div className="relative bg-white">
                                          <select
                                            value=""
                                            onChange={(e) => {
                                              const selectedVal = e.target.value;
                                              if (selectedVal && !m.requiredParts.includes(selectedVal)) {
                                                const updatedParts = [...m.requiredParts, selectedVal];
                                                changeFsmMissionParts(t.id, m.id, m.requiredParts, updatedParts);
                                              }
                                              e.target.value = ""; // Reset
                                            }}
                                            style={{
                                              border: '1px solid #dedede',
                                              borderRadius: '13px',
                                              padding: '12px',
                                              fontSize: '15px',
                                              fontWeight: '100',
                                              color: '#000000',
                                              backgroundColor: '#ffffff',
                                              width: '100%',
                                              cursor: 'pointer',
                                              fontFamily: "'DefibeoMain', 'Civilprom', sans-serif"
                                            }}
                                            className="font-sans focus:outline-none justify-start cursor-pointer"
                                          >
                                            <option value="" disabled>Sélection d'une pièce du stock.</option>
                                            {stockItems.map(item => (
                                              <option key={item.id} value={item.name}>
                                                {item.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Full-width Supprimer button */}
                                  <div className="pt-2 bg-white">
                                    <button
                                      type="button"
                                      onClick={() => deleteFsmMission(t.id, m.id)}
                                      style={{
                                        ...rowActionButtonStyle,
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: '10px 16px',
                                        fontSize: '18px'
                                      }}
                                      className="cursor-pointer"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======================================= */}
          {/* GMAO MODULE */}
          {/* ======================================= */}
          {activeTab === 'gmao' && (() => {
            if (editingReportId) {
              const repToEdit = generatedReports.find(r => r.id === editingReportId);
              if (repToEdit) {
                return (
                  <GmaoCorrectionForm
                    report={repToEdit}
                    onSave={(updatedReport) => {
                      const updatedReports = generatedReports.map(r => r.id === editingReportId ? updatedReport : r);
                      saveReports(updatedReports);
                      if (updatedReport.defibSnapshot) {
                        handleUpdateDefib(updatedReport.defibSnapshot);
                      }
                      
                      // Match and validate the client signature pin if present
                      if (updatedReport.clientPinCode && updatedReport.defibSnapshot?.clientId) {
                        const targetClientId = updatedReport.defibSnapshot.clientId;
                        const typedPin = updatedReport.clientPinCode.trim().toUpperCase();
                        
                        const updatedClients = clients.map(cl => {
                          if (cl.id === targetClientId) {
                            const originalPins = cl.signaturePins || [];
                            const matchIndex = originalPins.findIndex(p => p.code.toUpperCase() === typedPin);
                            let newPins = [...originalPins];
                            if (matchIndex !== -1) {
                              newPins[matchIndex] = {
                                ...newPins[matchIndex],
                                status: 'validé',
                                validatedAt: new Date().toISOString(),
                                reportTitle: updatedReport.title || 'Rapport d\'Intervention'
                              };
                            } else {
                              // If there wasn't an emitted pin match but format was valid, record it as a custom validated pin!
                              newPins.push({
                                code: typedPin,
                                createdAt: new Date().toISOString(),
                                status: 'validé',
                                validatedAt: new Date().toISOString(),
                                reportTitle: updatedReport.title || 'Rapport d\'Intervention'
                              });
                            }
                            return {
                              ...cl,
                              signaturePins: newPins
                            };
                          }
                          return cl;
                        });
                        saveClients(updatedClients);
                      }

                      setEditingReportId(null);
                      setEditReportForm(null);
                    }}
                    onCancel={() => {
                      setEditingReportId(null);
                      setEditReportForm(null);
                    }}
                    clients={clients}
                    variables={variables}
                    defibrillateurs={defibrillateurs}
                    stocks={stocks}
                    members={members}
                  />
                );
              }
            }

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

            const thStyle: React.CSSProperties = {
              fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
              fontWeight: 100,
              letterSpacing: 'normal',
              textTransform: 'none',
              color: '#000000',
              cursor: 'default',
            };

            const filteredReports = generatedReports.filter((rep) => {
              const query = gmaoSearchQuery.toLowerCase().trim();
              if (!query) return true;
              
              const titleMatch = (rep.title || '').toLowerCase().includes(query);
              const identifiantMatch = (rep.defibIdentifiant || '').toLowerCase().includes(query);
              const serieMatch = (rep.defibSnapshot?.numeroSerie || '').toLowerCase().includes(query);
              const techMatch = (rep.techName || '').toLowerCase().includes(query);
              
              return titleMatch || identifiantMatch || serieMatch || techMatch;
            });

            return (
              <div className="space-y-6 animate-fadeIn" id="gmao-tab-container">
                <style>{`
                  #gmao-tab-container input:not([type="radio"]):not([type="checkbox"]):not(#search-gmao-input),
                  #gmao-tab-container select,
                  #gmao-tab-container textarea {
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
                  #gmao-tab-container input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-gmao-input),
                  #gmao-tab-container input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-gmao-input),
                  #gmao-tab-container select:hover:not(:disabled),
                  #gmao-tab-container select:focus:not(:disabled),
                  #gmao-tab-container textarea:hover:not(:disabled),
                  #gmao-tab-container textarea:focus:not(:disabled),
                  #gmao-tab-container #search-gmao-input:hover,
                  #gmao-tab-container #search-gmao-input:focus {
                    outline: 2.5px solid #fa53d5 !important;
                    outline-offset: 2px !important;
                    transition: all 0s !important;
                  }
                  #gmao-tab-container select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: none !important;
                  }
                  #gmao-tab-container select option {
                    color: #000000 !important;
                    background: #ffffff !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #gmao-tab-container input[type="date"]::-webkit-calendar-picker-indicator {
                    display: none !important;
                    -webkit-appearance: none !important;
                    background: none !important;
                    width: 0 !important;
                    height: 0 !important;
                  }
                  #gmao-tab-container label,
                  #gmao-tab-container .gmao-label-style {
                    letter-spacing: normal !important;
                    text-transform: none !important;
                    font-size: 16px !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #gmao-tab-container select.padding-with-dot {
                    padding-left: 27px !important;
                  }
                  #gmao-tab-container input:disabled,
                  #gmao-tab-container select:disabled {
                    background-color: #f1f5f9 !important;
                    color: #555555 !important;
                    cursor: not-allowed !important;
                    opacity: 0.82 !important;
                  }
                `}</style>

                {/* Upper Action Block & Search metrics */}
                <div 
                  className="bg-white space-y-4"
                  style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight font-gochi" style={{ color: '#000000', cursor: 'default' }} id="gmao-tab-title">GMAO</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Field recherche (Search input) */}
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          id="search-gmao-input"
                          value={gmaoSearchQuery}
                          onChange={(e) => setGmaoSearchQuery(e.target.value)}
                          placeholder="Recherche."
                          className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                          style={{
                            border: '1px solid #dedede',
                            borderRadius: '13px',
                            padding: '9px 19px',
                            fontSize: '18px',
                            fontWeight: '100',
                            color: '#000000',
                            backgroundColor: '#ffffff',
                            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                            outline: 'none',
                            transition: 'all 0s',
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => window.location.reload()}
                          id="btn-refresh-gmao"
                          style={customButtonStyle}
                        >
                          Actualiser
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Table Records Sheet */}
                <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
                  <div className="overflow-x-auto">
                    {filteredReports.length === 0 ? (
                      <div className="p-16 text-center font-sans lg:py-24" id="no-gmao-view">
                        <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                          {gmaoSearchQuery ? "Aucun rapport ne correspond à votre recherche" : "Aucun résultat."}
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left font-sans border-collapse text-xs" id="gmao-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                        <thead>
                          <tr className="bg-transparent">
                            <th className="px-4 py-3.5 w-10 text-center" style={thStyle}></th>
                            <th className="px-4 py-3.5" style={thStyle}>Horodatage.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Série.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Identifiant.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Technicien.</th>
                            <th className="px-4 py-3.5 text-right w-12" style={thStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700 text-xs">
                          {filteredReports.map((rep) => {
                            const isConforme = (rep.defibSnapshot?.conforme || 'Oui') === 'Oui';

                            return (
                              <tr key={rep.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                                {/* Conforme Status Dot Banner column */}
                                <td className="px-4 py-5 text-center w-10" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  <span 
                                    className={`inline-block w-2.5 h-2.5 rounded-full ${isConforme ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                    title={isConforme ? "Conforme" : "Non conforme"}
                                  />
                                </td>

                                {/* Date / Horodatage */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  {rep.date}
                                </td>

                                {/* Série */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  <div 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      border: '1px solid rgb(231, 231, 231)',
                                      borderRadius: '1000px',
                                      padding: '4px 12px',
                                      backgroundColor: '#ffffff',
                                      fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                                    }} 
                                    className="whitespace-nowrap font-medium"
                                  >
                                    {rep.defibSnapshot?.numeroSerie || '-'}
                                  </div>
                                </td>

                                {/* Identifiant */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  <div 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      border: '1px solid rgb(231, 231, 231)',
                                      borderRadius: '1000px',
                                      padding: '4px 12px',
                                      backgroundColor: '#ffffff',
                                      fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                                    }} 
                                    className="whitespace-nowrap font-medium"
                                  >
                                    {rep.defibIdentifiant}
                                  </div>
                                </td>

                                {/* Technicien */}
                                <td className="px-4 py-5" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  <div className="font-medium text-slate-800" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                    {rep.techName}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="inline-flex gap-2">
                                    <button
                                      type="button"
                                      disabled={rep.validated}
                                      onClick={() => setEditingReportId(rep.id)}
                                      style={{
                                        ...rowActionButtonStyle,
                                        opacity: rep.validated ? 0.35 : 1,
                                        cursor: rep.validated ? 'not-allowed' : 'pointer',
                                        backgroundColor: rep.validated ? '#cbd5e1' : '#000000',
                                        color: rep.validated ? '#64748b' : '#ffffff',
                                      }}
                                      className={`${rep.validated ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'}`}
                                    >
                                      Corriger
                                    </button>
                                    <button
                                      type="button"
                                      disabled={rep.validated}
                                      onClick={() => {
                                        const updatedReports = generatedReports.map(r => r.id === rep.id ? { ...r, validated: true } : r);
                                        saveReports(updatedReports);

                                        // Update the main equipment database and send validation email to the client
                                        const snap = rep.defibSnapshot;
                                        if (snap) {
                                          const uuid = snap.id || rep.defibId;
                                          const ident = snap.identifiant || rep.defibIdentifiant;

                                          const isDefib = defibrillateurs.some(df => df.id === uuid || df.identifiant === ident);
                                          if (isDefib) {
                                            const updatedList = defibrillateurs.map(df => {
                                              if (df.id === uuid || df.identifiant === ident) {
                                                return {
                                                  ...snap,
                                                  derniereMaintenance: snap.derniereMaintenance || new Date().toISOString().split('T')[0]
                                                };
                                              }
                                              return df;
                                            });
                                            saveDefibs(updatedList);
                                          } else {
                                            const isOther = otherEquipments.some(o => o.id === uuid || o.identifiant === ident);
                                            if (isOther) {
                                              const updatedList = otherEquipments.map(o => {
                                                if (o.id === uuid || o.identifiant === ident) {
                                                  return snap;
                                                }
                                                return o;
                                              });
                                              saveOtherEquipments(updatedList);
                                            }
                                          }

                                          // Trigger Email 6: RAPPORT DE MAINTENANCE AU CLIENT
                                          try {
                                            const matchingClient = clients?.find((c: any) => c.id === snap.clientId);
                                            const clientEmail = snap.emailSite || matchingClient?.email || matchingClient?.emailSite;
                                            if (clientEmail && clientEmail.trim()) {
                                              triggerEmail6RapportIntervention(
                                                clientEmail.trim(),
                                                snap.identifiant || rep.defibIdentifiant || '',
                                                rep.date || new Date().toLocaleString('fr-FR'),
                                                companyInfo.name || 'Défibeo Suite',
                                                companyInfo.email || ''
                                              ).catch(e => console.error("Error triggering Email 6 during GMAO validation:", e));
                                            }
                                          } catch (err6) {
                                            console.error("Error sending validation email during GMAO validation:", err6);
                                          }
                                        }

                                        alert("Le rapport d'intervention a été validé avec succès ! L'état de l'équipement a été mis à jour et un e-mail avec le rapport a été envoyé au client.");
                                      }}
                                      style={{
                                        ...rowActionButtonStyle,
                                        backgroundColor: rep.validated ? '#f1f5f9' : '#10b981',
                                        color: rep.validated ? '#94a3b8' : '#ffffff',
                                        borderColor: rep.validated ? '#e2e8f0' : 'transparent',
                                        borderWidth: rep.validated ? '1px' : '0px',
                                        borderStyle: rep.validated ? 'solid' : 'none',
                                        cursor: rep.validated ? 'not-allowed' : 'pointer',
                                      }}
                                      className={`${rep.validated ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer hover:bg-emerald-600'}`}
                                    >
                                      {rep.validated ? '✓ Validé' : 'Valider'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadReport(rep)}
                                      style={rowActionButtonStyle}
                                      className="cursor-pointer"
                                    >
                                      Télécharger
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======================================= */}
          {/* CRM / SUPPORT TICKETS MODULE */}
          {/* ======================================= */}
          {activeTab === 'crm' && (() => {
            const filtTickets = tickets.filter(t => {
              const matchesStatus = ticketStatusFilter === 'Tous' || t.status === ticketStatusFilter;
              const searchLower = ticketSearch.toLowerCase();
              return matchesStatus && (
                t.id.toLowerCase().includes(searchLower) ||
                t.identifiant.toLowerCase().includes(searchLower) ||
                t.email.toLowerCase().includes(searchLower) ||
                t.message.toLowerCase().includes(searchLower) ||
                t.objet.toLowerCase().includes(searchLower)
              );
            });

            const countNew = tickets.filter(t => t.status === 'Nouveau').length;
            const countProgress = tickets.filter(t => t.status === 'En cours').length;
            const countResolved = tickets.filter(t => t.status === 'Résolu').length;

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

            const thStyle: React.CSSProperties = {
              fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
              fontWeight: 100,
              letterSpacing: 'normal',
              textTransform: 'none',
              color: '#000000',
              cursor: 'default',
            };

            return (
              <div className="space-y-6 animate-fadeIn" id="crm-tab-container">
                <style>{`
                  #crm-tab-container input:not([type="radio"]):not([type="checkbox"]):not(#search-crm-input),
                  #crm-tab-container select,
                  #crm-tab-container textarea {
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
                  #crm-tab-container input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-crm-input),
                  #crm-tab-container input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-crm-input),
                  #crm-tab-container select:hover:not(:disabled),
                  #crm-tab-container select:focus:not(:disabled),
                  #crm-tab-container textarea:hover:not(:disabled),
                  #crm-tab-container textarea:focus:not(:disabled),
                  #crm-tab-container #search-crm-input:hover,
                  #crm-tab-container #search-crm-input:focus {
                    outline: 2.5px solid #fa53d5 !important;
                    outline-offset: 2px !important;
                    transition: all 0s !important;
                  }
                  #crm-tab-container select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: none !important;
                  }
                  #crm-tab-container select option {
                    color: #000000 !important;
                    background: #ffffff !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #crm-tab-container input[type="date"]::-webkit-calendar-picker-indicator {
                    display: none !important;
                    -webkit-appearance: none !important;
                    background: none !important;
                    width: 0 !important;
                    height: 0 !important;
                  }
                  #crm-tab-container label,
                  #crm-tab-container .crm-label-style {
                    letter-spacing: normal !important;
                    text-transform: none !important;
                    font-size: 16px !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #crm-tab-container select.padding-with-dot {
                    padding-left: 27px !important;
                  }
                  #crm-tab-container input:disabled,
                  #crm-tab-container select:disabled {
                    background-color: #f1f5f9 !important;
                    color: #555555 !important;
                    cursor: not-allowed !important;
                    opacity: 0.82 !important;
                  }
                `}</style>

                {/* Upper Action Block & Search metrics */}
                <div 
                  className="bg-white space-y-4"
                  style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight font-gochi" style={{ color: '#000000', cursor: 'default' }} id="crm-tab-title">CRM</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Field recherche (Search input) */}
                      <div className="relative w-full sm:w-80">
                        <input
                          type="text"
                          id="search-crm-input"
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          placeholder="Recherche."
                          className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                          style={{
                            border: '1px solid #dedede',
                            borderRadius: '13px',
                            padding: '9px 19px',
                            fontSize: '18px',
                            fontWeight: '100',
                            color: '#000000',
                            backgroundColor: '#ffffff',
                            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                            outline: 'none',
                            transition: 'all 0s',
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            const hasEmptyMemo = memos.some(m => !m.text || m.text.trim() === '');
                            if (memos.length >= 15 || hasEmptyMemo) {
                              return;
                            }
                            const newMemo: Memo = {
                              id: 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                              text: '',
                              createdAt: Date.now()
                            };
                            setMemos([newMemo, ...memos]);
                          }}
                          disabled={memos.length >= 15 || memos.some(m => !m.text || m.text.trim() === '')}
                          id="btn-new-memo"
                          style={{
                            ...customButtonStyle,
                            backgroundColor: (memos.length >= 15 || memos.some(m => !m.text || m.text.trim() === '')) ? '#cbd5e1' : '#2563eb',
                            color: '#ffffff',
                            cursor: (memos.length >= 15 || memos.some(m => !m.text || m.text.trim() === '')) ? 'not-allowed' : 'pointer',
                            opacity: (memos.length >= 15 || memos.some(m => !m.text || m.text.trim() === '')) ? 0.75 : 1
                          }}
                        >
                          {memos.length >= 15 ? 'Mémos max (15)' : memos.some(m => !m.text || m.text.trim() === '') ? 'Mémo vide existant' : 'Nouveau mémo'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memos List Container (Post-its Row) */}
                <div className="px-4 pt-5 pb-2 max-w-[98%] mx-auto" id="crm-memos-section">
                  <div className="flex flex-row overflow-x-auto gap-4 pb-4 select-none scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                    {memos.length === 0 ? (
                      <div 
                        className="w-full h-[120px] flex flex-col items-center justify-center border border-dashed rounded-[18px]"
                        style={{
                          borderColor: '#dadada',
                          backgroundColor: 'transparent'
                        }}
                      >
                        <p className="font-sans font-light" style={{ color: '#000000', fontSize: '18px' }}>
                          Aucun mémo.
                        </p>
                      </div>
                    ) : (
                      memos.map((memo) => (
                        <div
                          key={memo.id}
                          style={{
                            width: '300px',
                            height: '300px',
                            minWidth: '300px',
                            backgroundColor: 'rgb(255 255 255)',
                            border: '1px solid rgb(218 218 218)',
                            borderRadius: '16px',
                            boxShadow: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '10px',
                          }}
                          className="transition-transform duration-200"
                        >
                          <div className="flex-1 flex flex-col pt-1">
                            <textarea
                              value={memo.text}
                              onChange={(e) => handleUpdateMemoText(memo.id, e.target.value.slice(0, 220))}
                              placeholder="Entrez un mémo."
                              maxLength={220}
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'transparent',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontSize: '16px',
                                fontWeight: 'normal',
                                color: '#0f172a',
                                fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                lineHeight: '1.5',
                              }}
                              className="placeholder-slate-400"
                            />
                          </div>

                          <div className="flex gap-2" style={{ marginTop: '12px', width: '100%' }}>
                            <button
                              onClick={() => {
                                setSavedMemosMap(prev => ({ ...prev, [memo.id]: true }));
                                setTimeout(() => {
                                  setSavedMemosMap(prev => ({ ...prev, [memo.id]: false }));
                                }, 3000);
                              }}
                              disabled={!!savedMemosMap[memo.id]}
                              style={{
                                flex: 1,
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                fontSize: '18px',
                                fontWeight: 'normal',
                                fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                border: 'none',
                                cursor: savedMemosMap[memo.id] ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                opacity: savedMemosMap[memo.id] ? 0.7 : 1,
                              }}
                              className={savedMemosMap[memo.id] ? "" : "hover:bg-zinc-800 transition-colors"}
                            >
                              {savedMemosMap[memo.id] ? 'Enregistré' : 'Enregistrer'}
                            </button>
                            <button
                              onClick={() => handleDeleteMemo(memo.id)}
                              style={{
                                flex: 1,
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                fontSize: '18px',
                                fontWeight: 'normal',
                                fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'center',
                              }}
                              className="hover:bg-red-700 transition-colors"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Filters Pills Row */}
                <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="crm-status-pills">
                  {(['Tous', 'Nouveau', 'En cours', 'Résolu'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      type="button"
                      onClick={() => setTicketStatusFilter(filterOpt)}
                      style={{
                        borderRadius: '1000px',
                        padding: '10px 20px',
                        fontSize: '15px',
                        fontWeight: 100,
                        cursor: 'pointer',
                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                        backgroundColor: ticketStatusFilter === filterOpt ? '#fa53d5' : '#ffffff',
                        color: ticketStatusFilter === filterOpt ? '#ffffff' : '#000000',
                        border: ticketStatusFilter === filterOpt ? '1px solid #fa53d5' : '1px solid rgb(218, 218, 218)',
                        transition: 'all 0.15s ease'
                      }}
                      className="transition-all"
                    >
                      {filterOpt}
                      {filterOpt === 'Tous' && ` (${tickets.length})`}
                      {filterOpt === 'Nouveau' && ` (${countNew})`}
                      {filterOpt === 'En cours' && ` (${countProgress})`}
                      {filterOpt === 'Résolu' && ` (${countResolved})`}
                    </button>
                  ))}
                </div>

                {/* Main Table Records Sheet */}
                <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
                  <div className="overflow-x-auto">
                    {filtTickets.length === 0 ? (
                      <div className="p-16 text-center font-sans lg:py-24" id="no-crm-view">
                        <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                          Aucun résultat.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left font-sans border-collapse text-xs" id="crm-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                        <thead>
                          <tr className="bg-transparent">
                            <th className="px-4 py-3.5" style={thStyle}>Ticket ID.</th>
                            <th className="px-4 py-3.5" style={thStyle}>DAE Réf.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Objet & Type.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Déclarant / Contact.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Date.</th>
                            <th className="px-4 py-3.5 text-center w-40" style={thStyle}>Statut.</th>
                            <th className="px-4 py-3.5 text-right w-12" style={thStyle}>Actions.</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-705 text-xs">
                          {filtTickets.map((t) => {
                            const isExpanded = expandedTicketId === t.id;

                            return (
                              <React.Fragment key={t.id}>
                                <tr className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                                  {/* Ticket ID */}
                                  <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                    {t.id}
                                  </td>

                                  {/* DAE Réf */}
                                  <td className="px-4 py-5 text-left whitespace-nowrap">
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
                                        padding: '6px 18px',
                                        whiteSpace: 'nowrap',
                                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                                      }}
                                    >
                                      {t.identifiant}
                                    </span>
                                  </td>

                                  {/* Objet & Type */}
                                  <td className="px-4 py-5 text-left">
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
                                        padding: '6px 18px',
                                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                                      }}
                                    >
                                      {t.objet}
                                    </span>
                                  </td>

                                  {/* Déclarant / Contact */}
                                  <td className="px-4 py-5" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                    <div style={{ color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>{t.email}</div>
                                    {t.phone && <div style={{ fontSize: '16px', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', color: '#000000' }} className="mt-0.5">Tél : {t.phone}</div>}
                                  </td>

                                  {/* Date */}
                                  <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                    {t.date}
                                  </td>

                                  {/* Statut */}
                                  <td className="px-4 py-5 text-center whitespace-nowrap">
                                    <select
                                      value={t.status}
                                      onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value as SupportTicket['status'])}
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
                                        padding: '6px 24px 6px 18px',
                                        fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                        outline: 'none',
                                      }}
                                      className="cursor-pointer focus:outline-none"
                                    >
                                      <option value="Nouveau">Nouveau</option>
                                      <option value="En cours">En cours</option>
                                      <option value="Résolu">Résolu</option>
                                    </select>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <div className="inline-flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                                        style={rowActionButtonStyle}
                                        className="cursor-pointer"
                                      >
                                        {isExpanded ? 'Réduire' : 'Détails'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm("Voulez-vous supprimer ce ticket de support ?")) {
                                            handleDeleteTicket(t.id);
                                          }
                                        }}
                                        style={rowActionButtonStyle}
                                        className="cursor-pointer"
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded detailed reply dashboard */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="px-6 py-6 bg-slate-50/70 border-t border-b border-slate-200/55">
                                      <div className="space-y-5 max-w-4xl ml-4 font-sans">
                                        <div className="space-y-2">
                                          <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '16px' }}>
                                            Demande ou signalement.
                                          </span>
                                          <div style={{ fontSize: '16px', lineHeight: '1.6', borderRadius: '12px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }} className="bg-white p-4 border border-slate-200">
                                            "{t.message}"
                                          </div>
                                        </div>

                                        {/* Reply section */}
                                         {!t.reponse && (
                                           <div className="space-y-2">
                                             <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '16px' }} className="block">
                                               Votre message de réponse.
                                             </span>
                                             <div className="flex flex-col sm:flex-row gap-3">
                                               <textarea
                                                 value={repliesDraft[t.id] || ''}
                                                 onChange={(e) => setRepliesDraft({ ...repliesDraft, [t.id]: e.target.value })}
                                                 placeholder="Saisissez votre réponse ici..."
                                                 style={{
                                                   border: '1px solid #dedede',
                                                   borderRadius: '10px',
                                                   padding: '10px 14px',
                                                   fontSize: '14px',
                                                   fontWeight: '100',
                                                   color: '#000000',
                                                   backgroundColor: '#ffffff',
                                                   minHeight: '80px',
                                                   fontFamily: '"DefibeoMain", "Civilprom", sans-serif'
                                                 }}
                                                 className="flex-1 font-sans focus:outline-none"
                                               />
                                               <button
                                                 onClick={() => {
                                                   const typed = repliesDraft[t.id]?.trim();
                                                   if (!typed) return;
                                                   handleReplyToTicket(t.id, typed);
                                                   setRepliesDraft({ ...repliesDraft, [t.id]: '' });
                                                 }}
                                                 style={rowActionButtonStyle}
                                                 className="cursor-pointer self-start sm:self-end h-11"
                                               >
                                                 Envoyer
                                               </button>
                                             </div>
                                           </div>
                                         )}
                                         {/* Published replies */}
                                        {t.reponse && (
                                          <div className="space-y-2 pt-2">
                                            <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '16px' }} className="block">
                                              Réponsée envoyée.
                                            </span>
                                            <div style={{ fontSize: '16px', lineHeight: '1.6', borderRadius: '12px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }} className="bg-white p-4 border border-slate-200">
                                              {t.reponse}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======================================= */}
          {/* DEVIS & PROFORMA MODULE */}
          {/* ======================================= */}
          {activeTab === 'devis' && (() => {
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
              fontSize: '15px',
              padding: '8px 16px',
              fontWeight: '100',
              transition: 'all 0s ease-in-out',
            };

            const thStyle: React.CSSProperties = {
              fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
              fontWeight: 100,
              letterSpacing: 'normal',
              textTransform: 'none',
              color: '#000000',
              cursor: 'default',
            };

            const itemValueStyle: React.CSSProperties = {
              fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
              fontSize: '16px',
              color: '#000000',
              fontWeight: 100,
            };

            const filtDocs = commercialDocs.filter((doc) => {
              const matchType = docTypeFilter === 'Tous' || doc.type === docTypeFilter;
              const query = docSearchQuery.trim().toLowerCase();
              const matchSearch =
                !query ||
                doc.ref.toLowerCase().includes(query) ||
                doc.clientDenomination.toLowerCase().includes(query) ||
                doc.items.some((item) => item.nomPiece.toLowerCase().includes(query));
              return matchType && matchSearch;
            });

            return (
              <div className="space-y-6 animate-fadeIn" id="devis-tab-container-harmonized">
                <style>{`
                  #devis-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):not(#search-devis-input),
                  #devis-tab-container-harmonized select,
                  #devis-tab-container-harmonized textarea {
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
                  #devis-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled):not(#search-devis-input),
                  #devis-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled):not(#search-devis-input),
                  #devis-tab-container-harmonized select:hover:not(:disabled),
                  #devis-tab-container-harmonized select:focus:not(:disabled),
                  #devis-tab-container-harmonized textarea:hover:not(:disabled),
                  #devis-tab-container-harmonized textarea:focus:not(:disabled),
                  #devis-tab-container-harmonized #search-devis-input:hover,
                  #devis-tab-container-harmonized #search-devis-input:focus {
                    outline: 2.5px solid #fa53d5 !important;
                    outline-offset: 2px !important;
                    transition: all 0s !important;
                  }
                  #devis-tab-container-harmonized select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: none !important;
                  }
                  #devis-tab-container-harmonized select option {
                    color: #000000 !important;
                    background: #ffffff !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #devis-tab-container-harmonized input[type="date"]::-webkit-calendar-picker-indicator {
                    display: none !important;
                    -webkit-appearance: none !important;
                    background: none !important;
                    width: 0 !important;
                    height: 0 !important;
                  }
                  #devis-tab-container-harmonized label,
                  #devis-tab-container-harmonized .devis-label-style {
                    letter-spacing: normal !important;
                    text-transform: none !important;
                    font-size: 16px !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                    font-family: "DefibeoMain", "Civilprom", sans-serif !important;
                  }
                  #devis-tab-container-harmonized input:disabled,
                  #devis-tab-container-harmonized select:disabled {
                    background-color: #f1f5f9 !important;
                    color: #555555 !important;
                    cursor: not-allowed !important;
                    opacity: 0.82 !important;
                  }
                `}</style>

                {!isDocFormOpen ? (
                  <>
                    {/* Dashboard List Header */}
                    <div 
                      className="bg-white space-y-4"
                      style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap bg-white">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight font-gochi bg-white" style={{ color: '#000000', cursor: 'default' }} id="devis-tab-title">Devis & Factures</h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 bg-white">
                          {/* Field recherche (Search input) */}
                          <div className="relative w-full sm:w-80 bg-white">
                            <input
                              type="text"
                              id="search-devis-input"
                              value={docSearchQuery}
                              onChange={(e) => setDocSearchQuery(e.target.value)}
                              placeholder="Recherche."
                              className="w-full text-black placeholder-[#747474] placeholder:font-light outline-none"
                              style={{
                                border: '1px solid #dedede',
                                borderRadius: '13px',
                                padding: '9px 19px',
                                fontSize: '18px',
                                fontWeight: '100',
                                color: '#000000',
                                backgroundColor: '#ffffff',
                                fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                                outline: 'none',
                                transition: 'all 0s',
                              }}
                            />
                          </div>

                          <button 
                            onClick={startNewDoc}
                            style={customButtonStyle}
                            className="font-sans"
                          >
                            Nouveau
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filters Pills Row */}
                    <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="devis-type-pills">
                      {(['Tous', 'Devis', 'Facture'] as const).map((filterOpt) => {
                        let count = 0;
                        if (filterOpt === 'Tous') {
                          count = commercialDocs.length;
                        } else {
                          count = commercialDocs.filter(d => d.type === filterOpt).length;
                        }
                        
                        return (
                          <button
                            key={filterOpt}
                            type="button"
                            onClick={() => setDocTypeFilter(filterOpt)}
                            style={{
                              borderRadius: '1000px',
                              padding: '10px 20px',
                              fontSize: '15px',
                              fontWeight: 100,
                              cursor: 'pointer',
                              fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                              backgroundColor: docTypeFilter === filterOpt ? '#fa53d5' : '#ffffff',
                              color: docTypeFilter === filterOpt ? '#ffffff' : '#000000',
                              border: docTypeFilter === filterOpt ? '1px solid #fa53d5' : '1px solid rgb(218, 218, 218)',
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

                    {/* Main Table Records Sheet */}
                    <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
                      <div className="overflow-x-auto">
                        {filtDocs.length === 0 ? (
                          <div className="p-16 text-center font-sans lg:py-24" id="no-devis-view bg-white">
                            <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>
                              Aucun résultat.
                            </p>
                          </div>
                        ) : (
                          <table className="w-full text-left font-sans border-collapse text-xs" id="devis-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                            <thead>
                              <tr className="bg-transparent">
                                <th className="px-4 py-3.5" style={thStyle}>Référence.</th>
                                <th className="px-4 py-3.5" style={thStyle}>Client.</th>
                                <th className="px-4 py-3.5" style={thStyle}>Objet ou commentaire.</th>
                                <th className="px-4 py-3.5" style={thStyle}>Total HT.</th>
                                <th className="px-4 py-3.5" style={thStyle}>Date.</th>
                                <th className="px-4 py-3.5 text-center w-28" style={thStyle}>Situation.</th>
                                <th className="px-4 py-3.5 text-right w-12" style={thStyle}>Actions.</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-705 text-xs">
                              {filtDocs.map((doc) => {
                                const clientName = doc.clientDenomination || '';
                                const clientDisplay = clientName.length > 20 ? clientName.substring(0, 20) + '(...)' : clientName;
                                const rowActionButton18Style: React.CSSProperties = {
                                  ...rowActionButtonStyle,
                                  fontSize: '18px',
                                  padding: '9px 19px',
                                };

                                return (
                                  <tr key={doc.id} className="group hover:bg-[#ffecf8] transition-all cursor-pointer">
                                    {/* Référence */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.ref}
                                    </td>

                                    {/* Client */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {clientDisplay}
                                    </td>

                                    {/* Objet ou commentaire */}
                                    <td className="px-4 py-5 max-w-sm truncate" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.commentaire || '-'}
                                    </td>

                                    {/* Total HT */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                    </td>

                                    {/* Date */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.dateStr}
                                    </td>

                                    {/* Situation */}
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
                                        {doc.status}
                                      </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-5 text-right whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                                      <div className="inline-flex gap-2 bg-transparent">
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadDoc(doc)}
                                          style={rowActionButton18Style}
                                          className="cursor-pointer font-sans"
                                        >
                                          Télécharger
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadBonCommande(doc)}
                                          style={{
                                            ...rowActionButton18Style,
                                            backgroundColor: doc.hasBonCommande ? 'rgba(236, 72, 153, 0.1)' : undefined,
                                            color: doc.hasBonCommande ? '#ec4899' : undefined
                                          }}
                                          className="cursor-pointer font-sans"
                                          title={doc.hasBonCommande ? `Bon de commande: ${doc.bonCommandeReference}` : 'Aucun bon de commande pour cette pièce'}
                                        >
                                          Bon de commande
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleTransformDoc(doc)}
                                          style={rowActionButton18Style}
                                          className="cursor-pointer font-sans"
                                        >
                                          Transformer
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => startEditDoc(doc)}
                                          style={rowActionButton18Style}
                                          className="cursor-pointer font-sans"
                                        >
                                          Modifier
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Dynamic Form block */
                  <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="devis-form-overlay">
                    
                    {/* Header Box styled exactly like DefibTab Form Header */}
                    <div 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                      style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', width: '98%', maxWidth: '98%', margin: 'auto', padding: '20px' }}
                      id="devis-form-header-box"
                    >
                      <div>
                        <h3 className="text-2xl font-bold font-gochi" id="devis-form-modal-title" style={{ color: '#000', cursor: 'default' }}>
                          {editingDocId ? 'Modification pièce comptable' : 'Nouvelle pièce comptable'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocFormOpen(false);
                            setEditingDocId(null);
                          }}
                          id="btn-close-devis-modal"
                          style={{
                            ...rowActionButtonStyle,
                            fontSize: '18px',
                            padding: '9px 19px',
                          }}
                          className="transition-colors cursor-pointer font-sans"
                        >
                          <span>Annuler</span>
                        </button>

                        <button
                          type="submit"
                          form="devis-document-form"
                          id="btn-submit-devis-form"
                          style={{
                            ...rowActionButtonStyle,
                            fontSize: '18px',
                            padding: '9px 19px',
                            backgroundColor: 'rgb(53, 86, 236)',
                            color: '#ffffff',
                            boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                          }}
                          className="transition-all cursor-pointer font-sans"
                        >
                          <span>Enregistrer</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ height: '16px' }} className="bg-transparent" />

                    <form 
                      id="devis-document-form"
                      onSubmit={handleSaveDoc} 
                      className="space-y-6 bg-white p-5 border-none"
                      style={{
                        border: '1px solid rgb(218, 218, 218)',
                        borderRadius: '18px',
                        width: '98%',
                        maxWidth: '98%',
                        margin: 'auto'
                      }}
                    >
                      {/* Form fields Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white">
                        
                        {/* Membre attribué. */}
                        <div className="flex flex-col gap-1 bg-white col-span-1 md:col-span-3">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Membre attribué.</label>
                          <select
                            value={docAssignedMemberName}
                            onChange={(e) => setDocAssignedMemberName(e.target.value)}
                            className="focus:outline-none"
                          >
                            <option value="">Aucun membre attribué (Suivi libre)</option>
                            {members
                              .filter(m => !(m.role === 'Technicien' || m.role === 'Maintenance Terrain' || m.role?.toLowerCase().includes('tech')))
                              .map(m => (
                                <option key={m.name} value={m.name}>
                                  {m.name} ({m.role})
                                </option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Document Type select */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Type.</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as 'Devis' | 'Facture' | 'Proforma')}
                            className="focus:outline-none"
                            required
                          >
                            <option value="Devis">Devis</option>
                            <option value="Facture">Facture</option>
                          </select>
                        </div>

                        {/* Reference (Auto generated or editable) */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Référence.</label>
                          <input
                            type="text"
                            value={docRef}
                            disabled
                            className="focus:outline-none"
                            required
                          />
                        </div>

                        {/* Client Select */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Client.</label>
                          <select
                            value={docClientId}
                            onChange={(e) => setDocClientId(e.target.value)}
                            className="focus:outline-none"
                            required
                          >
                            <option value="">Sélection du client.</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.denomination}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Date */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Émission.</label>
                          <input
                            type="date"
                            value={docDateStr}
                            disabled
                            className="focus:outline-none"
                            required
                          />
                        </div>

                        {/* Status selection */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Situation.</label>
                          <select
                            value={docStatus}
                            onChange={(e) => setDocStatus(e.target.value as any)}
                            placeholder="QQQQ"
                            className="focus:outline-none"
                            required
                          >
                            <option value="Brouillon">Brouillon</option>
                            <option value="Terminé">Terminé</option>
                            <option value="Accepté">Accepté</option>
                            <option value="Refusé">Refusé</option>
                            <option value="Annulé">Annulé</option>
                            <option value="Supprimé">Supprimé</option>
                          </select>
                        </div>

                        {/* Objet ou commentaire */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Objet ou commentaire.</label>
                          <input
                            type="text"
                            value={docCommentaire}
                            onChange={(e) => setDocCommentaire(e.target.value)}
                            placeholder="Entrez un commentaire."
                            className="focus:outline-none w-full animate-fadeIn"
                          />
                        </div>

                      </div>

                      {/* Add spare parts (Lookup in variables) Container */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-transparent space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-transparent">
                          
                          {/* Lookup Piece */}
                          <div className="flex flex-col gap-1 bg-transparent md:col-span-5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">Pièce ou service.</label>
                            <select
                              value={selectedDocPieceId}
                              onChange={(e) => {
                                const vId = e.target.value;
                                setSelectedDocPieceId(vId);
                                const price = getSellingPriceForVariable(vId);
                                setCustomDocPiecePrice(price);
                              }}
                              className="focus:outline-none w-full"
                            >
                              <option value="">Sélection d'une pièce ou service.</option>
                              {variables.map(v => {
                                const matchedStock = stocks.find(s => s.denominationPieceId === v.id);
                                const ugs = matchedStock?.ugs || '';
                                const ugsStr = ugs ? ` [UGS: ${ugs}]` : '';
                                const marqueStr = v.marque && v.marque !== 'Standard' ? ` (${v.marque})` : '';
                                return (
                                  <option key={v.id} value={v.id}>
                                    {v.identifiant ? `[${v.identifiant}] ` : ''}[{v.category}] {v.nom}{marqueStr}{ugsStr}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Selling price */}
                          <div className="flex flex-col gap-1 bg-transparent md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">Tarif de vente. (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={customDocPiecePrice}
                              onChange={(e) => setCustomDocPiecePrice(parseFloat(e.target.value) || 0)}
                              className="focus:outline-none w-full"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="flex flex-col gap-1 bg-transparent md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">Quantité.</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="1"
                              value={customDocPieceQty || ''}
                              onChange={(e) => setCustomDocPieceQty(parseInt(e.target.value) || 0)}
                              className="focus:outline-none w-full"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={handleAddLineItem}
                              style={customButtonStyle}
                              className="font-sans w-full"
                            >
                              Ajouter
                            </button>
                          </div>

                        </div>

                        {/* Added items list */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {docItems.length === 0 ? (
                            <div style={itemValueStyle} className="p-6 text-center bg-white">
                              Aucune ligne ajoutée.
                            </div>
                          ) : (
                            <table className="w-full text-left text-xs border-collapse font-sans bg-white">
                              <thead>
                                <tr className="bg-transparent">
                                  <th className="px-4 py-3" style={thStyle}>Pièce.</th>
                                  <th className="px-4 py-3 text-right" style={thStyle}>Unité HT. (€)</th>
                                  <th className="px-4 py-3 text-center w-24" style={thStyle}>Volume.</th>
                                  <th className="px-4 py-3 text-right w-32" style={thStyle}>Total HT. (€)</th>
                                  <th className="px-4 py-3 text-right w-24" style={thStyle}>Action.</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                                {docItems.map((item, idx) => (
                                  <tr key={idx} className="bg-white font-sans">
                                    <td className="px-4 py-3.5" style={itemValueStyle}>{item.nomPiece}</td>
                                    <td className="px-4 py-3.5 text-right" style={itemValueStyle}>{item.prixVenteHt.toFixed(2)}€</td>
                                    <td className="px-4 py-3.5 text-center" style={itemValueStyle}>{item.quantite}</td>
                                    <td className="px-4 py-3.5 text-right" style={itemValueStyle}>
                                      {(item.prixVenteHt * item.quantite).toFixed(2)}€
                                    </td>
                                    <td className="px-4 py-3 text-right bg-white">
                                      <button
                                        type="button"
                                        onClick={() => setDocItems(docItems.filter((_, i) => i !== idx))}
                                        style={{
                                          ...rowActionButtonStyle,
                                          fontSize: '18px',
                                          padding: '9px 19px',
                                        }}
                                        className="cursor-pointer font-sans"
                                      >
                                        Supprimer
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Calculated values summary */}
                        {docItems.length > 0 && (
                          <div className="flex justify-end pr-1 pt-2 bg-transparent">
                            <div className="w-80 border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                              <div className="flex justify-between items-center bg-white">
                                <span style={itemValueStyle}>Total HT. (€)</span>
                                <span style={itemValueStyle}>
                                  {docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0).toFixed(2)}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white">
                                <span style={itemValueStyle}>Total TVA. (€)</span>
                                <span style={itemValueStyle}>
                                  {(docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0) * 0.2).toFixed(2)}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white">
                                <span style={{ ...itemValueStyle, fontWeight: 'bold' }}>Total TTC. (€)</span>
                                <span style={{ ...itemValueStyle, fontWeight: 'bold' }}>
                                  {(docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0) * 1.2).toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Section Bon de commande */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-transparent space-y-4 mt-6">
                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider devis-label-style">
                          Bon de commande
                        </h4>
                        
                        <div className="flex flex-col gap-2 bg-transparent">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">
                            Créer un bon de commande ?
                          </span>
                          <div className="flex items-center gap-6 mt-1 bg-transparent">
                            <label className="flex items-center gap-2 text-xs font-sans text-slate-800 cursor-pointer bg-transparent">
                              <input
                                type="radio"
                                name="hasBonCommande"
                                checked={docHasBonCommande === true}
                                onChange={() => {
                                  setDocHasBonCommande(true);
                                  if (!docBonCommandeReference) {
                                    const nextRef = (editingDocId && commercialDocs.find(d => d.id === editingDocId)?.bonCommandeReference) || "";
                                    if (nextRef) {
                                      setDocBonCommandeReference(nextRef);
                                    } else {
                                      const prefix = 'BL';
                                      const year = '2026';
                                      const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
                                      let maxNum = 0;
                                      for (const d of commercialDocs) {
                                        if (d.bonCommandeReference) {
                                          const match = d.bonCommandeReference.match(pattern);
                                          if (match) {
                                            const num = parseInt(match[1], 10);
                                            if (num > maxNum) {
                                              maxNum = num;
                                            }
                                          }
                                        }
                                      }
                                      setDocBonCommandeReference(`${prefix}-${year}-${maxNum + 1}`);
                                    }
                                  }
                                }}
                                className="w-4 h-4 accent-pink-500"
                              />
                              Oui
                            </label>
                            
                            <label className="flex items-center gap-2 text-xs font-sans text-slate-800 cursor-pointer bg-transparent">
                              <input
                                type="radio"
                                name="hasBonCommande"
                                checked={docHasBonCommande === false}
                                onChange={() => setDocHasBonCommande(false)}
                                className="w-4 h-4 accent-pink-500"
                              />
                              Non
                            </label>
                          </div>
                        </div>

                        {docHasBonCommande && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-slate-100 bg-transparent animate-fadeIn">
                            {/* Référence */}
                            <div className="flex flex-col gap-1 bg-white">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Référence BC.</label>
                              <input
                                type="text"
                                value={docBonCommandeReference}
                                disabled
                                className="focus:outline-none bg-slate-50 font-mono text-xs cursor-not-allowed"
                                placeholder="Générée automatiquement..."
                              />
                            </div>

                            {/* Livraison Radio buttons */}
                            <div className="flex flex-col gap-1 bg-white">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Livraison.</label>
                              <div className="flex items-center gap-4 mt-2 bg-transparent">
                                <label className="flex items-center gap-1.5 text-xs font-sans text-slate-800 cursor-pointer bg-transparent">
                                  <input
                                    type="radio"
                                    name="bcLivraison"
                                    checked={docBonCommandeLivraison === 'Intervention d\'un technicien'}
                                    onChange={() => setDocBonCommandeLivraison('Intervention d\'un technicien')}
                                    className="w-3.5 h-3.5 accent-pink-500"
                                  />
                                  Intervention d’un technicien
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-sans text-slate-800 cursor-pointer bg-transparent">
                                  <input
                                    type="radio"
                                    name="bcLivraison"
                                    checked={docBonCommandeLivraison === 'Transporteur'}
                                    onChange={() => setDocBonCommandeLivraison('Transporteur')}
                                    className="w-3.5 h-3.5 accent-pink-500"
                                  />
                                  Transporteur
                                </label>
                              </div>
                            </div>

                            {/* Situation */}
                            <div className="flex flex-col gap-1 bg-white">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">Situation.</label>
                              <select
                                value={docBonCommandeSituation}
                                onChange={(e) => setDocBonCommandeSituation(e.target.value as any)}
                                className="focus:outline-none"
                                required
                              >
                                <option value="Ouvert">Ouvert</option>
                                <option value="Envoyé Terminé">Envoyé Terminé</option>
                                <option value="Envoyé Logistique">Envoyé Logistique</option>
                                <option value="Terminé">Terminé</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                    </form>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======================================= */}
          {/* STOCKS MODULE */}
          {/* ======================================= */}
          {activeTab === 'stocks' && (
            <StocksTab
              stocks={stocks}
              variables={variables}
              defibrillateurs={defibrillateurs}
              saveStocks={saveStocks}
              showStockForm={showStockForm}
              setShowStockForm={setShowStockForm}
              distributedStocks={distributedStocks}
              onNavigateToDistributedStocks={(ugs) => {
                setDistributedStocksSearchQuery(ugs);
                setActiveTab('stocks-distribues');
              }}
              stockSearchQuery={stockSearchQuery}
              setStockSearchQuery={setStockSearchQuery}
              commercialDocs={commercialDocs}
            />
          )}

          {/* ======================================= */}
          {/* STOCKS DISTRIBUÉS MODULE */}
          {/* ======================================= */}
          {activeTab === 'stocks-distribues' && (
            <StocksDistribuesTab
              distributedStocks={distributedStocks}
              saveDistributedStocks={saveDistributedStocks}
              stocks={stocks}
              variables={variables}
              fsmTours={fsmTours}
              searchQuery={distributedStocksSearchQuery}
              setSearchQuery={setDistributedStocksSearchQuery}
              onNavigateToCentraleStocks={(ugs) => {
                setStockSearchQuery(ugs);
                setActiveTab('stocks');
              }}
            />
          )}

          {/* ======================================= */}
          {/* ACHATS FOURNISSEURS MODULE */}
          {/* ======================================= */}
          {activeTab === 'achats-fournisseurs' && (
            <AchatsFournisseursTab
              achatsFournisseurs={achatsFournisseurs}
              saveAchatsFournisseurs={saveAchatsFournisseurs}
              variables={variables}
            />
          )}

          {/* ======================================= */}
          {/* GED (DOCUMENT MANAGEMENT) MODULE */}
          {/* ======================================= */}
          {activeTab === 'ged' && (
            <GedTab
              gedDocs={gedDocs}
              saveGedDocs={saveGedDocs}
              isGedFormOpen={isGedFormOpen}
              setIsGedFormOpen={setIsGedFormOpen}
              handleConsultGed={handleConsultGed}
            />
          )}

          {/* ======================================= */}
          {/* TICKETS CAISSE MODULE */}
          {/* ======================================= */}
          {activeTab === 'tickets' && (
            <TicketsCaisseTab
              expenses={expenses}
              members={members}
              onUpdateExpenses={saveExpenses}
            />
          )}

          {activeTab === 'temps' && (
            <TempsTab
              pointages={pointages}
              onUpdatePointages={(updated) => savePointages(updated)}
            />
          )}

          {/* ======================================= */}
          {/* LOCALISATIONS MODULE */}
          {/* ======================================= */}
          {activeTab === 'localisations' && (
            <LocalisationsTab members={members} />
          )}

          {/* ======================================= */}
          {/* SATISFACTION (CSAT) MODULE */}
          {/* ======================================= */}
          {activeTab === 'satisfaction' && (
            <SatisfactionTab
              customerReviews={customerReviews}
              onUpdateReviews={(updated) => saveReviews(updated)}
            />
          )}

          {activeTab === 'statistiques' && (
            <StatsModal
              isPage={true}
              isOpen={true}
              onClose={() => {}}
              defibrillateurs={defibrillateurs}
              clients={clients}
              variables={variables}
              stocks={stocks}
              pointages={pointages}
              customerReviews={customerReviews}
              fsmTours={fsmTours}
            />
          )}

          {activeTab === 'parametres' && (
            <SettingsModal
              isPage={true}
              isOpen={true}
              onClose={() => {}}
              companyInfo={companyInfo}
              onUpdateCompanyInfo={handleUpdateCompanyInfo}
              members={members}
              onUpdateMembers={handleUpdateMembers}
              onOpenPublicPortal={() => {
                setIsPublicPortalOpen(true);
              }}
              onOpenClientPortal={() => {
                setIsClientPortalOpen(true);
              }}
              onLogout={handleLogout}
              currentUser={loggedUser}
              enableOtherEquipments={enableOtherEquipments}
              onUpdateOtherEquipments={setEnableOtherEquipments}
              otherEquipments={otherEquipments}
              onClearOtherEquipments={() => saveOtherEquipments([])}
            />
          )}

          {activeTab === 'import-export' && (
            <ImportExportTab 
              tenantId={tenantId}
              isFirebaseLoaded={isFirebaseLoaded}
              defibrillateurs={defibrillateurs}
              clients={clients}
              stocks={stocks}
              pointages={pointages}
              variables={variables}
              saveDefibs={saveDefibs}
              saveClients={saveClients}
              saveStocks={saveStocks}
            />
          )}

        </section>
      </main>
      </div>

      {/* Global popups block settings / membres */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        companyInfo={companyInfo}
        onUpdateCompanyInfo={handleUpdateCompanyInfo}
        members={members}
        onUpdateMembers={handleUpdateMembers}
        onOpenPublicPortal={() => {
          setIsPublicPortalOpen(true);
          setIsSettingsOpen(false);
        }}
        onOpenClientPortal={() => {
          setIsClientPortalOpen(true);
          setIsSettingsOpen(false);
        }}
        onLogout={handleLogout}
        currentUser={loggedUser}
        enableOtherEquipments={enableOtherEquipments}
        onUpdateOtherEquipments={setEnableOtherEquipments}
        otherEquipments={otherEquipments}
        onClearOtherEquipments={() => saveOtherEquipments([])}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        defibrillateurs={defibrillateurs}
        clients={clients}
        variables={variables}
        stocks={stocks}
        pointages={pointages}
        customerReviews={customerReviews}
        fsmTours={fsmTours}
      />

    </div>
  );
}
