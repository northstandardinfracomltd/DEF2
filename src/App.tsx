import React, { useState, useEffect, useRef } from 'react';
import { fetchCollectionFromFirestore, saveCollectionToFirestore, setTenantId as setFirebaseTenantId, getRegisteredTenants } from './firebase';
import { t, getLanguage, setLanguage, startDOMTranslation } from './utils/translate';
import { Client, Variable, Defibrillateur, SupportTicket, Member, CompanyInfo, PointageLog, StockRecord, CommercialDoc, CommercialDocItem, GedDocument, Memo, OtherEquipment, PointageAutoVigilance, DistributedStockLocation, AchatFournisseur, AppNotification, VeilleRecord } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_VARIABLES,
  INITIAL_DEFIBRILLATEURS,
  INITIAL_OTHER_EQUIPMENTS,
  INITIAL_TICKETS,
  INITIAL_COMMERCIAL_DOCS,
  INITIAL_GED_DOCS,
  INITIAL_STOCKS,
  INITIAL_DISTRIBUTED_STOCKS,
  INITIAL_REVIEWS,
  INITIAL_EXPENSES,
  INITIAL_VEILLES,
  INITIAL_REPORTS,
  INITIAL_TOURS,
  INITIAL_MEMBERS,
  generateRandomPin,
  formatDateToFR,
  computeProchaineMaintenance,
  getLocationCustomName,
  getCapsuleBgColor,
} from './utils';
import {
  triggerEmail4Signalement,
  triggerEmail5AvisageFSM,
  triggerEmail7CrmReply,
  triggerEmail8NouvelleTourneeTech,
  triggerEmail6RapportIntervention
} from './utils/emailService';
import { getParisTimestamp } from './utils/dateUtils';

import DefibTab from './components/DefibTab';
import HelpBubble from './components/HelpBubble';
import AutresMaterielsTab from './components/AutresMaterielsTab';
import ClientTab from './components/ClientTab';
import VariableTab from './components/VariableTab';
import SettingsModal from './components/SettingsModal';
import StatsModal from './components/StatsModal';
import PublicPortal from './components/PublicPortal';
import ClientPortal from './components/ClientPortal';
import Login from './components/Login';
import MegaAdminDashboard from './components/MegaAdminDashboard';
import StocksTab from './components/StocksTab';
import StocksDistribuesTab from './components/StocksDistribuesTab';
import GedTab from './components/GedTab';
import AchatsFournisseursTab from './components/AchatsFournisseursTab';
import TicketsCaisseTab from './components/TicketsCaisseTab';
import TempsTab from './components/TempsTab';
import LocalisationsTab from './components/LocalisationsTab';
import SatisfactionTab from './components/SatisfactionTab';
import VeillesTab from './components/VeillesTab';
import GmaoCorrectionForm from './components/GmaoCorrectionForm';
import ImportExportTab from './components/ImportExportTab';
import { geocodeAddress, sortMissionsByProximity, scheduleMissions } from './utils/fsmOptimizer';
import SatisfactionFormPage from './components/SatisfactionFormPage';
import NotificationsTab from './components/NotificationsTab';

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
  ShoppingBag,
  Bell
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
  | 'veilles'
  | 'localisations'
  | 'satisfaction'
  | 'statistiques'
  | 'notifications'
  | 'parametres'
  | 'import-export';

function isNotificationOlderThan3Months(ts?: string): boolean {
  if (!ts) return false;
  let date: Date;
  // Parse format "dd/mm/yyyy HH:mm:ss"
  const matches = ts.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (matches) {
    const [_, day, month, year, hour, minute, second] = matches;
    date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  } else {
    const parsed = Date.parse(ts);
    if (isNaN(parsed)) {
      return false; // Can't parse, preserve to be safe
    }
    date = new Date(parsed);
  }
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return date.getTime() < threeMonthsAgo.getTime();
}

export default function App() {
  // Database States (declared at top of component to be in scope for handlers)
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Authentication & Session States
  const [tenantId, setTenantIdState] = useState<string>(() => {
    return localStorage.getItem('defib_tenant_id') || 'demo';
  });

  const [isBlockedByPrez, setIsBlockedByPrez] = useState<boolean>(false);
  const [prezCountdown, setPrezCountdown] = useState<number>(5);
  const [isSubscriptionInactive, setIsSubscriptionInactive] = useState<boolean>(false);
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`defib_${tenantId}_location_names`);
      setLocationNames(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setLocationNames({});
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId === 'demo') {
      localStorage.setItem('defib_short_env_id', 'D18');
      setIsBlockedByPrez(false);
      setIsSubscriptionInactive(false);
      setPaymentUrl('');
    } else {
      getRegisteredTenants().then(tenants => {
        const found = tenants.find(t => t.id === tenantId);
        if (found) {
          if (found.shortEnvId) {
            localStorage.setItem('defib_short_env_id', found.shortEnvId);
          } else {
            localStorage.setItem('defib_short_env_id', 'D18');
          }
          if (found.lang) {
            setLanguage(found.lang);
          }
          const loggedRole = localStorage.getItem('defib_logged_user_role') || '';
          setIsBlockedByPrez(!!found.blockedForPrez && loggedRole !== 'megaadmin');
          setIsSubscriptionInactive(found.subscriptionActive === false);
          setPaymentUrl(found.paymentUrl || '');
        } else {
          localStorage.setItem('defib_short_env_id', 'D18');
          setIsBlockedByPrez(false);
          setIsSubscriptionInactive(false);
          setPaymentUrl('');
        }
      }).catch(err => {
        console.error('Error fetching tenant details on startup/change:', err);
      });
    }
  }, [tenantId]);

  const loadedTenantIdRef = useRef<string>('');
  const loadedDataRef = useRef<Record<string, string>>({});

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
    startDOMTranslation();
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

    // Optimistically set isBlockedByPrez if the environment is blocked
    if (tenantToSet !== 'demo' && roleToSet !== 'megaadmin') {
      getRegisteredTenants().then(tenants => {
        const found = tenants.find(t => t.id === tenantToSet);
        if (found && found.blockedForPrez) {
          setIsBlockedByPrez(true);
        } else {
          setIsBlockedByPrez(false);
        }
      }).catch(() => {});
    } else {
      setIsBlockedByPrez(false);
    }

    if (roleToSet === 'megaadmin') {
      return;
    }

    const emailLower = email.trim().toLowerCase();
    const matchedClient = clients.find(c => c.email && c.email.toLowerCase() === emailLower);

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
    
    // Clear help_dismissed keys from sessionStorage and localStorage on logout
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('help_dismissed')) {
          sessionStorage.removeItem(key);
        }
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('help_dismissed')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error(e);
    }

    setIsPublicPortalOpen(false);
    setIsClientPortalOpen(false);
    setActivePortalClient(null);
  };

  useEffect(() => {
    if (!isBlockedByPrez) {
      setPrezCountdown(5);
      return;
    }

    const interval = setInterval(() => {
      setPrezCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBlockedByPrez]);

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
  const [currentLang, setCurrentLang] = useState(() => getLanguage());
  useEffect(() => {
    const handleLangChange = () => {
      setCurrentLang(getLanguage());
    };
    window.addEventListener('defib_lang_changed', handleLangChange);
    return () => window.removeEventListener('defib_lang_changed', handleLangChange);
  }, []);

  const [activeTab, rawSetActiveTab] = useState<AppTab>(() => {
    try {
      if (localStorage.getItem('open_settings_after_reload') === 'true') {
        return 'parametres';
      }
    } catch (_) {}
    return 'defibrillateurs';
  });
  const setActiveTab = (newTab: AppTab | ((prev: AppTab) => AppTab), bypassBlock = false) => {
    const resolvedTab = typeof newTab === 'function' ? (newTab as Function)(activeTab) : newTab;

    if (!bypassBlock && resolvedTab !== activeTab) {
      const ADMIN_FORM_IDS = [
        'achats-fournisseurs-form',
        'client-form',
        'equipement-stock-form',
        'other-eq-core-form',
        'distributed-stock-form',
        'import-export-creation-form',
        'defibrillateur-core-form',
        'gmao-correction-form',
        'ged-document-form',
        'tickets-caisse-form',
        'materiel-core-form',
        'variable-form',
      ];

      let openForm: HTMLElement | null = null;
      for (const id of ADMIN_FORM_IDS) {
        const el = document.getElementById(id);
        if (el) {
          openForm = el;
          break;
        }
      }

      if (openForm) {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const activeTabContent = document.getElementById('active-tab-content-wrapper') || document.getElementById('main-content') || openForm;
        if (activeTabContent) {
          activeTabContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const formId = openForm.id;
        let submitBtn = document.querySelector(`button[form="${formId}"]`) || openForm.querySelector('button[type="submit"]');

        if (!submitBtn) {
          const allButtons = document.querySelectorAll('button');
          for (const btn of Array.from(allButtons)) {
            const text = btn.innerText || '';
            if (text.includes('Enregistrer') || text.includes('Sauvegarder') || text.includes('Valider')) {
              submitBtn = btn;
              break;
            }
          }
        }

        if (submitBtn) {
          submitBtn.classList.remove('shake-element');
          void (submitBtn as HTMLElement).offsetWidth; // Trigger reflow
          submitBtn.classList.add('shake-element');
          setTimeout(() => {
            submitBtn?.classList.remove('shake-element');
          }, 500);
        }
        return;
      }
    }

    rawSetActiveTab(resolvedTab);
  };
  const [distributedStocksSearchQuery, setDistributedStocksSearchQuery] = useState('');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('open_settings_after_reload') === 'true') {
        localStorage.removeItem('open_settings_after_reload');
      }
    } catch (_) {}
  }, []);
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
  const [gmaoFilter, setGmaoFilter] = useState<'validated' | 'moderation'>('validated');
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

  useEffect(() => {
    if (companyInfo) {
      let updated = false;
      const nextCompanyInfo = { ...companyInfo };

      if (companyInfo.locationNames) {
        setLocationNames(companyInfo.locationNames);
        localStorage.setItem(`defib_${tenantId}_location_names`, JSON.stringify(companyInfo.locationNames));
      } else {
        try {
          const saved = localStorage.getItem(`defib_${tenantId}_location_names`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Object.keys(parsed).length > 0) {
              nextCompanyInfo.locationNames = parsed;
              setLocationNames(parsed);
              updated = true;
            }
          }
        } catch (e) {}
      }

      if (companyInfo.enableAutoEmails) {
        localStorage.setItem(`defib_${tenantId}_enable_auto_emails`, companyInfo.enableAutoEmails);
      } else {
        const saved = localStorage.getItem(`defib_${tenantId}_enable_auto_emails`) as 'Oui' | 'Non' | null;
        if (saved) {
          nextCompanyInfo.enableAutoEmails = saved;
          updated = true;
        }
      }

      if (updated) {
        setCompanyInfo(nextCompanyInfo);
      }
    }
  }, [companyInfo, tenantId]);
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
  const [docCommentaires, setDocCommentaires] = useState('');
  const [docAssignedMemberName, setDocAssignedMemberName] = useState('');
  const [docHasBonCommande, setDocHasBonCommande] = useState(false);
  const [docBonCommandeReference, setDocBonCommandeReference] = useState('');
  const [docBonCommandeLivraison, setDocBonCommandeLivraison] = useState<'Intervention' | 'Transporteur'>('Transporteur');
  const [docBonCommandeSituation, setDocBonCommandeSituation] = useState<'Ouvert' | 'Envoyé Terminé' | 'Envoyé Logistique' | 'Terminé'>('Ouvert');
  const [docBonCommandeEntete, setDocBonCommandeEntete] = useState('');
  const [docCodeTaxe, setDocCodeTaxe] = useState('');
  const [docPayeurId, setDocPayeurId] = useState('');
  const [docClientIdField, setDocClientIdField] = useState('');

  const [selectedDocPieceId, setSelectedDocPieceId] = useState('');
  const [customDocPiecePrice, setCustomDocPiecePrice] = useState(0);
  const [customDocPieceQty, setCustomDocPieceQty] = useState(1);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'Tous' | 'Devis' | 'Facture' | 'Bon de commande'>('Tous');
  const [pennylaneActive, setPennylaneActive] = useState(false);
  const [pennylaneAlertMessage, setPennylaneAlertMessage] = useState<string | null>(null);
  const [pennylaneAlertStyle, setPennylaneAlertStyle] = useState<'success' | 'error'>('error');
  const [dropboxActive, setDropboxActive] = useState(false);
  const [dropboxAccessToken, setDropboxAccessToken] = useState('');
  const [dropboxError, setDropboxError] = useState<string | null>(null);

  const showPennylaneAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setPennylaneAlertMessage(message);
    setPennylaneAlertStyle(type);
    setTimeout(() => {
      setPennylaneAlertMessage(prev => prev === message ? null : prev);
    }, 6000);
  };

  const [customerReviews, setCustomerReviews] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const saveNotifications = (updated: AppNotification[]) => {
    const cleaned = updated.filter(n => !isNotificationOlderThan3Months(n.timestamp));
    setNotifications(cleaned);
    localStorage.setItem(`defib_${tenantId}_notifications`, JSON.stringify(cleaned));
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('notifications', cleaned);
    }
  };

  const addNotification = (category: AppNotification['category'], title: string) => {
    const newNotif: AppNotification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      category,
      title,
      timestamp: getParisTimestamp(),
      situation: 'Nouveau',
    };
    // Fetch latest notifications from current state to prevent stale state issues
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].filter(n => !isNotificationOlderThan3Months(n.timestamp));
      localStorage.setItem(`defib_${tenantId}_notifications`, JSON.stringify(updated));
      if (isFirebaseLoaded && tenantId) {
        saveCollectionToFirestore('notifications', updated);
      }
      return updated;
    });
  };

  const handleUpdateOtherEquipments = (val: string) => {
    setEnableOtherEquipments(val);
    localStorage.setItem('defib_enable_other_equipments', val);
    addNotification('Système', 'Un utilisateur vient de modifier les préférences pour les autres types d’équipements.');
  };

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

  // Load veilles from localStorage when portal closes or tab changes
  const [veilles, setVeilles] = useState<VeilleRecord[]>([]);
  useEffect(() => {
    const key = `defib_${tenantId}_veilles`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setVeilles(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultVeilles = tenantId === 'demo' ? [
        {
          id: 'veille-1',
          commune: 'Nantes',
          volume: 12,
          mainteneurActuel: 'Défibeo SAV',
          prochaineMaintenance: '2026-12-15',
          contactNomPrenom: 'Jean Dupont',
          contactEmail: 'jean.dupont@nantes.fr',
          contactTelephone: '0140000000',
          createdAt: '2026-06-27 10:00:00'
        }
      ] : [];
      setVeilles(defaultVeilles);
      localStorage.setItem(key, JSON.stringify(defaultVeilles));
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

  const optimizeFsmTour = async (
    tourId: string,
    currentToursList: any[] = fsmTours,
    currentMembersList: Member[] = members
  ) => {
    const tour = currentToursList.find(t => t.id === tourId);
    if (!tour) return;

    if (!tour.techName || tour.techName === 'Aucun' || tour.techName.trim() === '') {
      return;
    }

    const tech = currentMembersList.find(m => m.name.trim().toLowerCase() === tour.techName.trim().toLowerCase());
    const hasTechStructured = tech && tech.startAddressLat !== undefined && tech.startAddressLng !== undefined;
    const hasTechString = tech && tech.startAddress && tech.startAddress.trim() !== '';
    if (!tech || (!hasTechStructured && !hasTechString)) {
      return;
    }

    try {
      let startCoord: { lat: number; lng: number } | null = null;
      if (tech.startAddressLat !== undefined && tech.startAddressLng !== undefined) {
        const parsedLat = Number(tech.startAddressLat);
        const parsedLng = Number(tech.startAddressLng);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          startCoord = { lat: parsedLat, lng: parsedLng };
        }
      }
      if (!startCoord && tech.startAddress) {
        startCoord = await geocodeAddress(tech.startAddress);
      }

      if (!startCoord) {
        console.warn("Could not determine starting coordinates for technician:", tech.name);
        return;
      }

      const equipmentCoords: Record<string, { lat: number; lng: number }> = {};
      const equipmentDetails: Record<string, any> = {};

      tour.missions.forEach((m: any) => {
        const defib = defibrillateurs.find(d => d.identifiant === m.defibIdentifiant);
        if (defib) {
          equipmentDetails[m.defibIdentifiant] = defib;
          const lat = parseFloat(defib.latitude);
          const lng = parseFloat(defib.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            equipmentCoords[m.defibIdentifiant] = { lat, lng };
          }
        } else {
          const other = otherEquipments.find(o => o.identifiant === m.defibIdentifiant);
          if (other) {
            equipmentDetails[m.defibIdentifiant] = other;
            const lat = parseFloat(other.latitude);
            const lng = parseFloat(other.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              equipmentCoords[m.defibIdentifiant] = { lat, lng };
            }
          }
        }
      });

      const preference = tech.optimizationPreference || 'proche';
      const sortedMissions = sortMissionsByProximity(tour.missions, startCoord, equipmentCoords, preference as any);

      const scheduledMissions = scheduleMissions(sortedMissions, tour.startDate, equipmentDetails, tech);

      const updatedTours = currentToursList.map(t => {
        if (t.id === tourId) {
          return {
            ...t,
            missions: scheduledMissions,
            calculated: true
          };
        }
        return t;
      });

      setFsmTours(updatedTours);
      localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(updatedTours));
      if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
        saveCollectionToFirestore('fsmTours', updatedTours);
      }
    } catch (err) {
      console.error("Failed to optimize tour:", tourId, err);
    }
  };

  const addFsmTour = () => {
    const newId = 'fsm-tour-' + Date.now();
    const defaultTech = '';
    const assignedVehicle = 'Aucun';
    setFsmTourDrafts(prev => ({
      ...prev,
      [newId]: {
        title: 'Nouvelle Tournée',
        techName: defaultTech,
        vehicule: assignedVehicle
      }
    }));
    const newTour = {
      id: newId,
      title: 'Nouvelle Tournée',
      techName: defaultTech,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Brouillon',
      missions: [],
      vehicule: assignedVehicle,
      calculated: false
    };
    saveFsmTours([newTour, ...fsmTours]);
  };

  const deleteFsmTour = (tourId: string) => {
    const tour = fsmTours.find(t => t.id === tourId);
    if (!tour) return;
    const currentStatus = tour.status || 'Brouillon';
    if (currentStatus === 'À faire' || currentStatus === 'En cours') {
      alert("Impossible de supprimer une tournée dont le statut est À faire ou En cours.");
      return;
    }
    if (tour.missions) {
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

    const techChanged = fields.techName !== undefined && fields.techName !== existingTour?.techName;
    const dateChanged = fields.startDate !== undefined && fields.startDate !== existingTour?.startDate;
    const isCalculatedValue = (techChanged || dateChanged) ? false : (existingTour?.calculated ?? false);

    const updatedTours = fsmTours.map(t => t.id === tourId ? { ...t, ...fields, calculated: isCalculatedValue } : t);
    saveFsmTours(updatedTours);

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

                const estDate = m.estimatedDate || startDate || '';
                let estDateFormatted = estDate;
                if (estDate && estDate.includes('-')) {
                  const parts = estDate.split('-');
                  if (parts.length === 3) {
                    estDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                  }
                }
                const estSlot = m.estimatedSlot || '09:00';

                triggerEmail5AvisageFSM(
                  clientEmail.trim(),
                  defibId,
                  companyName,
                  companyEmail,
                  estDateFormatted || 'prochainement',
                  pin,
                  estSlot
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
        const matchingTech = members.find(m => m.name.trim().toLowerCase() === (techName || '').trim().toLowerCase());
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
    const updatedTours = fsmTours.map(t => {
      if (t.id === tourId) {
        return { ...t, missions: [...t.missions, newMission], calculated: false };
      }
      return t;
    });
    saveFsmTours(updatedTours);
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

    const updatedTours = fsmTours.map(t => {
      if (t.id === tourId) {
        return { ...t, missions: t.missions.filter(m => m.id !== missionId), calculated: false };
      }
      return t;
    });
    saveFsmTours(updatedTours);
  };

  const changeFsmMissionParts = (tourId: string, missionId: string, oldParts: string[], newParts: string[], extraFieldsToUpdate?: any) => {
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
    updateFsmMission(tourId, missionId, { requiredParts: newParts, ...extraFieldsToUpdate });
  };

  const updateFsmMission = (tourId: string, missionId: string, fields: any) => {
    const extraFields: any = {};
    if ('estimatedDate' in fields) {
      extraFields.isManualDate = !!fields.estimatedDate && fields.estimatedDate !== '';
    }
    if ('estimatedSlot' in fields) {
      extraFields.isManualSlot = !!fields.estimatedSlot && fields.estimatedSlot !== '';
    }

    const updatedTours = fsmTours.map(t => {
      if (t.id === tourId) {
        return {
          ...t,
          missions: t.missions.map(m => m.id === missionId ? { ...m, ...fields, ...extraFields } : m)
        };
      }
      return t;
    });

    saveFsmTours(updatedTours);
  };

  const CODE39_MAP: { [key: string]: string } = {
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

  const generateBarcodeSVGString = (text: string): string => {
    const cleanText = '*' + text.toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '-') + '*';
    let binaryString = '';
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      binaryString += CODE39_MAP[char] || CODE39_MAP['-'];
      binaryString += '0';
    }

    const barWidth = 2.0;
    const barcodeHeight = 45;
    const textHeight = 20;
    const totalHeight = barcodeHeight + textHeight;
    const totalWidth = binaryString.length * barWidth;
    
    let rects = '';
    for (let i = 0; i < binaryString.length; i++) {
      if (binaryString[i] === '1') {
        rects += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${barcodeHeight}" fill="black" />`;
      }
    }
    
    const textElement = `<text x="${totalWidth / 2}" y="${barcodeHeight + 16}" font-family="'DefibeoMain', 'Civilprom', sans-serif" font-size="14" text-anchor="middle" fill="black">${text}</text>`;
    
    return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">${rects}${textElement}</svg>`;
  };

  const handleDownloadReport = (report: any) => {
    const snapshot = report.defibSnapshot || {};
    const pdfLogo = companyInfo.logo || '';
    const pdfHeaderImg = companyInfo.pdfHeaderImg || '';
    const pdfPageHeaderText = companyInfo.pdfPageHeaderText || '';
    const pdfPageFooterText = companyInfo.pdfPageFooterText || '';
    const pdfLastPageInfoText = companyInfo.pdfLastPageInfoText || '';
    const hasLastPage = !!pdfLastPageInfoText.trim();

    const compLogo = companyInfo.logo || '';
    const compName = companyInfo.name || 'Défibeo Solutions';
    const compEmail = companyInfo.email || '';
    const compPhone = companyInfo.phone || '';
    const compWebsite = companyInfo.website || '';

    // Unified client lookup
    let clientFound = clients.find(c => c.id === snapshot.clientId);
    if (!clientFound && snapshot.clientId) {
      clientFound = clients.find(c => c.denomination === snapshot.clientId || c.id === snapshot.clientId);
    }
    if (!clientFound && report.clientId) {
      clientFound = clients.find(c => c.id === report.clientId);
    }
    if (!clientFound) {
      const siteEmail = snapshot.emailSite || report.emailSite || "";
      if (siteEmail) {
        clientFound = clients.find(c => c.email && c.email.toLowerCase().trim() === siteEmail.toLowerCase().trim());
      }
    }
    if (!clientFound) {
      const siteNom = snapshot.nomPrenomSite || "";
      if (siteNom) {
        clientFound = clients.find(c => c.denomination === siteNom || c.nomPrenomSite === siteNom);
      }
    }
    const clientName = clientFound ? clientFound.denomination : (snapshot.nomPrenomSite || 'Non rattaché');

    const clientIdField = clientFound?.clientIdField || snapshot.clientIdField || '';
    const payeurId = clientFound?.payeurId || snapshot.payeurId || '';

    // Unified purchase order (bonCommande) lookup
    const matchedMission = (fsmTours || [])
      .flatMap((t: any) => t.missions || [])
      .find((m: any) => m.defibIdentifiant === (snapshot.identifiant || report.defibIdentifiant));
    const bonCommandeId = report.bonCommandeId || matchedMission?.bonCommandeId;
    const bcDoc = bonCommandeId ? (commercialDocs || []).find((doc: any) => doc.id === bonCommandeId) : null;
    const bonCommandeEntete = bcDoc?.bonCommandeEntete || '';

    const renderHeader = () => {
      const showHeaderImg = pdfHeaderImg ? `<img src="${pdfHeaderImg}" style="max-height: 80px; max-width: 100%; object-fit: contain;" alt="Header Illustration" referrerPolicy="no-referrer" />` : '';
      const showHeaderLogo = pdfLogo ? `<img src="${pdfLogo}" style="max-height: 80px; object-fit: contain;" alt="Logo" referrerPolicy="no-referrer" />` : '';
      const showHeaderInfoText = pdfPageHeaderText ? `<div style="font-size: 14px; color: #000000; text-align: left; font-family: 'Civilprom', sans-serif !important;">${pdfPageHeaderText}</div>` : '';
      const showEmail = compEmail ? `<div>${compEmail}</div>` : '';
      const showPhone = compPhone ? `<div>${compPhone}</div>` : '';

      return `
        <div class="pdf-global-header" style="display: flex; flex-direction: row; width: calc(100% - 30mm); margin: 10mm 15mm 15px 15mm; padding-bottom: 10px; font-family: 'Civilprom', 'Inter', sans-serif !important; align-items: flex-start; box-sizing: border-box;">
          <div style="width: 20%; display: flex; align-items: flex-start; justify-content: flex-start; box-sizing: border-box; padding-right: 5px;">
            ${showHeaderLogo}
          </div>
          <div style="width: 50%; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; box-sizing: border-box; padding: 0 5px; gap: 4px;">
            ${showHeaderImg}
            ${showHeaderInfoText}
          </div>
          <div style="width: 30%; display: flex; flex-direction: column; align-items: flex-end; justify-content: flex-start; text-align: right; box-sizing: border-box; padding-left: 5px; font-size: 14px; color: #000000; gap: 2px;">
            <div style="font-weight: bold !important; margin-bottom: 2px;">${compName}</div>
            ${showEmail}
            ${showPhone}
          </div>
        </div>
      `;
    };

    const renderFooter = (pageIndex: number, pagesTotal: number) => `
      <div class="pdf-footer" style="position: absolute; bottom: 15mm; left: 15mm; right: 15mm; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end; font-size: 8px; color: #000000; padding-top: 8px; font-family: 'Civilprom', 'Inter', sans-serif !important; box-sizing: border-box; width: calc(100% - 30mm); border-top: none;">
        <div style="flex: 1; text-align: left; padding-right: 20px; color: #000000; font-size: 8px;">
          <p style="margin: 0; color: #000000; font-size: 8px; text-align: left; font-weight: normal !important; line-height: 1.4;">${pdfPageFooterText || ''}</p>
        </div>
        <div style="font-weight: bold !important; white-space: nowrap; color: #000000; font-size: 8px;">
          Page ${pageIndex} / ${pagesTotal}
        </div>
      </div>
    `;

    if (snapshot.categorie && snapshot.categorie !== 'Défibrillateur') {
      // Filter out typical top-level keys to get custom equipment properties!
      const topLevelKeys = [
        'id', 'clientId', 'nomPrenomSite', 'telephoneSite', 'emailSite', 'contrat', 'nomContrat', 'referenceContrat',
        'debutContrat', 'finContrat', 'pays', 'codePostal', 'cp', 'ville', 'adresseComplexe', 'identifiant',
        'codeNfc', 'statutGmao', 'categorie', 'conforme', 'miseEnServiceDate', 'miseEnService', 'commentaireGmao'
      ];
      
      const customProperties = Object.entries(snapshot).filter(([k, v]) => {
        return !topLevelKeys.includes(k) && v !== undefined && v !== null && v !== '' && typeof v !== 'object';
      });

      const totalPages = hasLastPage ? 3 : 2;
      const docTitle = report.title ? report.title : `Rapport d’intervention - ${snapshot.categorie || ''}`;

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
              padding: 0px;
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
              width: calc(100% - 30mm);
              margin: 0 15mm;
            }
            .pdf-card {
              border: 2px solid #7d2882;
              border-radius: 13px;
              background-color: #fef2ff;
              padding: 0px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .pdf-card-header {
              padding: 10px 14px;
              font-size: 16px;
              background-color: #7C2882;
              color: #ffffff;
              border-bottom: none;
              text-align: center;
              font-weight: bold !important;
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
              color: rgb(159 113 162);
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
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </head>
        <body class="bg-white">
          <div id="print-container">
            <!-- PAGE 1 -->
            <div class="pdf-page">
              ${renderHeader()}

              <div class="pdf-grid">
                <!-- TITLE & BARCODE ROW -->
                <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 10px; box-sizing: border-box;">
                  <div style="flex: 1; text-align: left; padding-right: 15px; box-sizing: border-box;">
                    <h1 style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Civilprom', sans-serif !important;">${docTitle}</h1>
                  </div>
                  <div style="flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center;">
                    ${generateBarcodeSVGString(snapshot.identifiant || report.defibIdentifiant || "EQUIP")}
                  </div>
                </div>

                <!-- SECTION 1 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">1 — Informations générales.</div>
                  <div class="pdf-card-body" style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ''}</span></div>
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Client ID :</span> <span class="pdf-bold">${clientIdField || '—'}</span></div>
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Payeur ID :</span> <span class="pdf-bold">${payeurId || '—'}</span></div>
                    </div>
                    <div class="pdf-line"><span class="pdf-label">Contact sur place :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ''}</span></div>
                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ''}</span></div>
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ''}</span></div>
                    </div>
                    <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Type matériel :</span> <span class="pdf-bold">${snapshot.categorie || 'Autre'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Version du logiciel :</span> <span class="pdf-bold">${snapshot.versionLogiciel || '—'}</span></div>
                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Référence intervention :</span> <span class="pdf-bold">${report.interventionReference || '—'}</span></div>
                      <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Entête :</span> <span class="pdf-bold">${bonCommandeEntete || '—'}</span></div>
                    </div>
                    <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Sous contrat :</span> <span class="pdf-bold">${snapshot.contrat || 'Non'}</span></div>
                    ${snapshot.contrat === 'Oui' ? `
                      <div class="pdf-line"><span class="pdf-label">Nom du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ''}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Référence contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ''}</span></div>
                    ` : ''}
                  </div>
                </div>

                <!-- SECTION 2 -->
                <div class="pdf-card">
                  <div class="pdf-card-header">2 — Spécifications du matériel (${snapshot.categorie}).</div>
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
              ${renderFooter(1, totalPages)}
            </div>

            <!-- PAGE 2 -->
            <div class="pdf-page">
              ${renderHeader()}

              <div class="pdf-grid">
                <!-- CUSTOM SECTION / CHECKPOINTS -->
                ${customProperties.length > 0 ? `
                  <div class="pdf-card">
                    <div class="pdf-card-header">3 — Paramètres spécifiques & Vérifications.</div>
                    <div class="pdf-card-body">
                      ${customProperties.map(([key, val]) => `
                        <div class="pdf-line"><span class="pdf-label" style="text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1')}:</span> <span class="pdf-bold">${val}</span></div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- ACTIONS, NOTES & CAPTURE EVIDENCE -->
                <div class="pdf-card">
                  <div class="pdf-card-header">4 — Clôture de l'intervention.</div>
                  <div class="pdf-card-body">
                    <div class="pdf-line"><span class="pdf-label">Technicien intervenant :</span> <span class="pdf-bold">${report.techName || 'Administrateur'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Date d’intervention :</span> <span class="pdf-bold">${report.date || '-'}</span></div>
                    ${report.endTimeStamp ? `<div class="pdf-line"><span class="pdf-label">Heure de fin :</span> <span class="pdf-bold">${report.endTimeStamp}</span></div>` : ''}
                    <div class="pdf-line" style="margin-bottom: 4px;">
                      <span class="pdf-label">Commentaire / Remarques :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireGmao || snapshot.commentaire || 'Aucun commentaire.'}</span>
                    </div>

                    <div style="display: flex; flex-direction: row; gap: 20px; width: 100%; padding-top: 8px; margin-top: 4px;">
                      <!-- Photos (Up to 3 photos stacked vertically) -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                        <div class="pdf-line" style="font-size: 16px; font-weight: bold !important;">Photographies de l'intervention.</div>
                        
                        ${report.photoUrl ? `
                          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                            <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                              <img src="${report.photoUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                            </div>
                            <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Photographie globale du défibrillateur.</span>
                          </div>
                        ` : ''}

                        ${report.photoArriereUrl ? `
                          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                            <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                              <img src="${report.photoArriereUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo Arrière" referrerPolicy="no-referrer" />
                            </div>
                            <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Photographie arrière / étiquette.</span>
                          </div>
                        ` : ''}

                        ${report.photoResultatTestUrl ? `
                          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                            <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                              <img src="${report.photoResultatTestUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo Résultat Test" referrerPolicy="no-referrer" />
                            </div>
                            <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Résultat du test.</span>
                          </div>
                        ` : ''}

                      </div>

                      <!-- Signature Technicien -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                        ${report.techSignature ? `
                          <div style="background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                            <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                          </div>
                        ` : ''}
                      </div>

                      <!-- Signature Client -->
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                        ${clientFound && clientFound.clientSignatureImage ? `
                          <div style="background: transparent; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; margin-top: 4px;">
                            <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ${renderFooter(2, totalPages)}
            </div>

            ${hasLastPage ? `
              <!-- PAGE 3 -->
              <div class="pdf-page">
                ${renderHeader()}
                <div class="pdf-grid" style="display: flex; flex-direction: column; justify-content: flex-start;">
                  <div class="pdf-card" style="display: flex; flex-direction: column;">
                    <div class="pdf-card-header" style="font-weight: bold !important; margin-bottom: 10px;">
                      Informations complémentaires
                    </div>
                    <div class="pdf-card-body" style="font-size: 15px; color: #000000; white-space: pre-line; line-height: 1.5;">
                      ${pdfLastPageInfoText}
                    </div>
                  </div>
                </div>
                ${renderFooter(3, totalPages)}
              </div>
            ` : ''}

          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      return;
    }

    // Resolving Model names from Variable list
    const defibModel = variables.find(v => v.id === snapshot.modeleId);
    const selectedModelVar = defibModel;

    const isVisibleNumeroAtlasante = selectedModelVar ? (selectedModelVar.visibiliteNumeroAtlasante !== 'Non') : true;
    const isVisibleVersionLogiciel = selectedModelVar ? (selectedModelVar.visibiliteVersionLogiciel !== 'Non') : true;
    const isVisibleFactureBrouillon = selectedModelVar ? (selectedModelVar.visibiliteFactureBrouillon !== 'Non') : true;
    const isVisiblePadPakAdulte = selectedModelVar ? (selectedModelVar.visibilitePadPakAdulte !== 'Non') : true;
    const isVisibleLotPadPakA = selectedModelVar ? (selectedModelVar.visibiliteLotPadPakA !== 'Non') : true;
    const isVisiblePeremptionPadPakA = selectedModelVar ? (selectedModelVar.visibilitePeremptionPadPakA !== 'Non') : true;
    const isVisibleLotP = selectedModelVar ? (selectedModelVar.visibiliteLotP !== 'Non') : true;
    const isVisiblePadPakPediatrique = selectedModelVar ? (selectedModelVar.visibilitePadPakPediatrique !== 'Non') : true;
    const isVisibleLotPadPakP = selectedModelVar ? (selectedModelVar.visibiliteLotPadPakP !== 'Non') : true;
    const isVisiblePeremptionPadPakP = selectedModelVar ? (selectedModelVar.visibilitePeremptionPadPakP !== 'Non') : true;
    const isVisibleFabricationBatterie = selectedModelVar ? (selectedModelVar.visibiliteFabricationBatterie !== 'Non') : true;
    const isVisibleInsertionBatterie = selectedModelVar ? (selectedModelVar.visibiliteInsertionBatterie !== 'Non') : true;
    const isVisiblePeremptionBatterie = selectedModelVar ? (selectedModelVar.visibilitePeremptionBatterie !== 'Non') : true;
    const isVisiblePourcentageBatterie = selectedModelVar ? (selectedModelVar.visibilitePourcentageBatterie !== 'Non') : true;
    const isVisibleGantsPresents = selectedModelVar ? (selectedModelVar.visibiliteGantsPresents !== 'Non') : true;
    const isVisiblePeremptionServiettes = selectedModelVar ? (selectedModelVar.visibilitePeremptionServiettes !== 'Non') : true;
    const isVisibleServiettesPresentes = selectedModelVar ? (selectedModelVar.visibiliteServiettesPresentes !== 'Non') : true;
    const isVisiblePeremptionMasque = selectedModelVar ? (selectedModelVar.visibilitePeremptionMasque !== 'Non') : true;
    const isVisibleMasquePresent = selectedModelVar ? (selectedModelVar.visibiliteMasquePresent !== 'Non') : true;
    const isVisibleCiseauxPresents = selectedModelVar ? (selectedModelVar.visibiliteCiseauxPresents !== 'Non') : true;
    const isVisiblePeremptionTrousse = selectedModelVar ? (selectedModelVar.visibilitePeremptionTrousse !== 'Non') : true;
    const isVisibleRasoir = selectedModelVar ? (selectedModelVar.visibiliteRasoir !== 'Non') : true;
    const isVisibleBranchementElectrodes = selectedModelVar ? (selectedModelVar.visibiliteBranchementElectrodes !== 'Non') : true;
    const isVisibleGuidesVocaux = selectedModelVar ? (selectedModelVar.visibiliteGuidesVocaux !== 'Non') : true;
    const isVisibleMessageNumeriqueConforme = selectedModelVar ? (selectedModelVar.visibiliteMessageNumeriqueConforme !== 'Non') : true;
    const isVisibleEquipeMessageNumerique = selectedModelVar ? (selectedModelVar.visibiliteEquipeMessageNumerique !== 'Non') : true;
    const isVisibleVoyantConforme = selectedModelVar ? (selectedModelVar.visibiliteVoyantConforme !== 'Non') : true;
    const isVisibleNettoyage = selectedModelVar ? (selectedModelVar.visibiliteNettoyage !== 'Non') : true;
    const isVisiblePiecesJointes = selectedModelVar ? (selectedModelVar.visibilitePiecesJointes !== 'Non') : true;

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
    const selElectrodeASecours = getStockPieceLabel(report.selectionElectrodeASecoursRemplacee);
    const selElectrodeP = getStockPieceLabel(report.selectionElectrodePRemplacee);
    const selElectrodePSecours = getStockPieceLabel(report.selectionElectrodePSecoursRemplacee);
    const selBatterie = getStockPieceLabel(report.selectionBatterieRemplacee);
    const selKitSecours = getStockPieceLabel(report.selectionKitSecoursRemplace);

    const totalPages = hasLastPage ? 6 : 5;
    const docTitle = report.title ? report.title : 'Rapport d’intervention GMAO';

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
            padding: 0px;
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
            text-align: left;
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
            width: calc(100% - 30mm);
            margin: 0 15mm;
          }

          .pdf-card {
            border: 2px solid #7d2882;
            border-radius: 13px;
            background-color: #fef2ff;
            padding: 0px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .pdf-card-header {
            background-color: #7C2882;
            color: #ffffff;
            border-bottom: none;
            font-size: 16px;
            font-weight: bold !important;
            text-align: center;
            padding: 10px 14px;
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
            color: rgb(159 113 162);
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
            ${renderHeader()}

            <div class="pdf-grid">
              <!-- TITLE & BARCODE ROW -->
              <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 10px; box-sizing: border-box;">
                <div style="flex: 1; text-align: left; padding-right: 15px; box-sizing: border-box;">
                  <h1 style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Civilprom', sans-serif !important;">${docTitle}</h1>
                </div>
                <div style="flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center;">
                  ${generateBarcodeSVGString(snapshot.identifiant || report.defibIdentifiant || "EQUIP")}
                </div>
              </div>

              <!-- SECTION 1 -->
              <div class="pdf-card">
                <div class="pdf-card-header">1 — Informations générales.</div>
                <div class="pdf-card-body" style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Client ID :</span> <span class="pdf-bold">${clientIdField || '—'}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Payeur ID :</span> <span class="pdf-bold">${payeurId || '—'}</span></div>
                  </div>
                  <div class="pdf-line"><span class="pdf-label">Contact :</span> <span class="pdf-bold">${snapshot.nomPrenomSite || ''}</span></div>
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Téléphone du contact :</span> <span class="pdf-bold">${snapshot.telephoneSite || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Email du contact :</span> <span class="pdf-bold">${snapshot.emailSite || ''}</span></div>
                  </div>
                  <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Type matériel :</span> <span class="pdf-bold">${snapshot.categorie || 'Défibrillateur'}</span></div>
                  ${isVisibleVersionLogiciel ? `<div class="pdf-line"><span class="pdf-label">Version du logiciel :</span> <span class="pdf-bold">${snapshot.versionLogiciel || '—'}</span></div>` : ''}
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Référence intervention :</span> <span class="pdf-bold">${report.interventionReference || '—'}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Entête :</span> <span class="pdf-bold">${bonCommandeEntete || '—'}</span></div>
                  </div>
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Identifiant :</span> <span class="pdf-bold">${snapshot.identifiant || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Série :</span> <span class="pdf-bold">${snapshot.numeroSerie || ''}</span></div>
                  </div>
                  <div class="pdf-line"><span class="pdf-label">Modèle :</span> <span class="pdf-bold">${snapshot.modeleId ? defibModelName : ''}</span></div>
                  <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Contrat :</span> <span class="pdf-bold">${snapshot.contrat || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Référence du contrat :</span> <span class="pdf-bold">${snapshot.referenceContrat || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Catégorie du contrat :</span> <span class="pdf-bold">${snapshot.nomContrat || ''}</span></div>
                  ${isVisibleFactureBrouillon ? `
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Facture :</span> <span class="pdf-bold">${report.emettreFactureBrouillon || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Service facturé :</span> <span class="pdf-bold">${report.serviceEmettreId ? getServiceLabel(report.serviceEmettreId) : ''}</span></div>
                  </div>
                  ` : ''}
                  <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Voie :</span> <span class="pdf-bold">${snapshot.numVoie || ''}</span></div>
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Ville :</span> <span class="pdf-bold">${snapshot.ville || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Code Postal :</span> <span class="pdf-bold">${snapshot.cp || ''}</span></div>
                  </div>
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Région :</span> <span class="pdf-bold">${snapshot.region || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Pays :</span> <span class="pdf-bold">${snapshot.pays || ''}</span></div>
                  </div>
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Latitude GPS :</span> <span class="pdf-bold">${snapshot.latitude || ''}</span></div>
                    <div class="pdf-line" style="flex: 1;"><span class="pdf-label">Longitude GPS :</span> <span class="pdf-bold">${snapshot.longitude || ''}</span></div>
                  </div>
                  <div class="pdf-line" style="margin-top: 10px;"><span class="pdf-label">Fabrication :</span> <span class="pdf-bold">${snapshot.fabrication || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Mise en service :</span> <span class="pdf-bold">${snapshot.miseEnService || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Fin de garantie :</span> <span class="pdf-bold">${snapshot.finGarantie || ''}</span></div>
                </div>
              </div>
            </div>

            ${renderFooter(1, totalPages)}
          </div>

          <!-- PAGE 2 -->
          <div class="pdf-page">
            ${renderHeader()}

            <div class="pdf-grid">
              <!-- SECTION 2 -->
              <div class="pdf-card">
                <div class="pdf-card-header">2 — Coffret.</div>
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

              <!-- SECTION 3 -->
              <div class="pdf-card">
                <div class="pdf-card-header">3 — Vérifications techniques.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  <div class="pdf-line"><span class="pdf-label">Conforme à mon arrivée :</span> <span class="pdf-bold">${report.techConformeArrivee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire sur l’état à mon arrivée :</span> <span class="pdf-bold">${report.techCommentaireArrivee || ''}</span></div>
                  ${isVisibleNettoyage ? `<div class="pdf-line"><span class="pdf-label">Nettoyage :</span> <span class="pdf-bold">${report.techNettoyage || ''}</span></div>` : ''}
                  ${isVisibleVoyantConforme ? `<div class="pdf-line"><span class="pdf-label">Voyant conforme :</span> <span class="pdf-bold">${report.techVoyantConforme || ''}</span></div>` : ''}
                  ${isVisibleEquipeMessageNumerique ? `<div class="pdf-line"><span class="pdf-label">Équipé d’un message numérique :</span> <span class="pdf-bold">${report.techEquipeMessageNumerique || ''}</span></div>` : ''}
                  ${isVisibleEquipeMessageNumerique && isVisibleMessageNumeriqueConforme ? `<div class="pdf-line"><span class="pdf-label">Message numérique conforme :</span> <span class="pdf-bold">${report.techMessageNumeroConforme || ''}</span></div>` : ''}
                  ${isVisibleGuidesVocaux ? `<div class="pdf-line"><span class="pdf-label">Guides vocaux conformes :</span> <span class="pdf-bold">${report.techGuidesVocauxConformes || ''}</span></div>` : ''}
                  ${isVisibleBranchementElectrodes ? `<div class="pdf-line"><span class="pdf-label">Branchement conforme des électrodes :</span> <span class="pdf-bold">${report.techBranchementElectrodesConforme || ''}</span></div>` : ''}
                </div>
              </div>
            </div>

            ${renderFooter(2, totalPages)}
          </div>

          <!-- PAGE 3 -->
          <div class="pdf-page">
            ${renderHeader()}

            <div class="pdf-grid">
              <!-- SECTION 4 -->
              ${isVisiblePadPakAdulte ? `
              <div class="pdf-card">
                <div class="pdf-card-header">4 — Électrode Adulte ou Mixte (A).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode A :</span> <span class="pdf-bold">${electrodeAModelName || ''}</span></div>
                  ${isVisibleLotPadPakA ? `<div class="pdf-line"><span class="pdf-label">Lot A :</span> <span class="pdf-bold">${snapshot.lotElectrodeA || ''}</span></div>` : ''}
                  <div class="pdf-line"><span class="pdf-label">Insertion :</span> <span class="pdf-bold">${snapshot.insertionElectrodeA || ''}</span></div>
                  ${isVisiblePeremptionPadPakA ? `<div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeA || ''}</span></div>` : ''}
                  
                  <div class="pdf-line"><span class="pdf-label">Modèle électrode secours :</span> <span class="pdf-bold">${electrodeASecoursModelName || 'Aucun'}</span></div>
                  ${isVisibleLotPadPakA ? `<div class="pdf-line"><span class="pdf-label">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodeASecours || ''}</span></div>` : ''}
                  ${isVisiblePeremptionPadPakA ? `<div class="pdf-line"><span class="pdf-label">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeA || ''}</span></div>` : ''}
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode A remplacée :</span> <span class="pdf-bold">${report.electrodeARemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeA || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode A Secours remplacée :</span> <span class="pdf-bold">${report.electrodeASecoursRemplacee || 'Non'}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode Secours A remplacée :</span> <span class="pdf-bold">${selElectrodeASecours || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode A conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodeAConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode A :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeA || ''}</span></div>
                </div>
              </div>
              ` : ''}

              <!-- SECTION 5 -->
              ${isVisiblePadPakPediatrique ? `
              <div class="pdf-card">
                <div class="pdf-card-header">5 — Électrode Pédiatrique (P).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle d'électrode P :</span> <span class="pdf-bold">${electrodePModelName || ''}</span></div>
                  ${isVisibleLotPadPakP ? `<div class="pdf-line"><span class="pdf-label">Lot P :</span> <span class="pdf-bold">${snapshot.lotElectrodeP || ''}</span></div>` : ''}
                  ${isVisiblePeremptionPadPakP ? `<div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionElectrodeP || ''}</span></div>` : ''}
                  
                  <div class="pdf-line"><span class="pdf-label">Modèle électrode secours :</span> <span class="pdf-bold">${electrodePSecoursModelName || 'Aucun'}</span></div>
                  ${isVisibleLotPadPakP ? `<div class="pdf-line"><span class="pdf-label">Lot de secours :</span> <span class="pdf-bold">${snapshot.lotElectrodePSecours || ''}</span></div>` : ''}
                  ${isVisiblePeremptionPadPakP ? `<div class="pdf-line"><span class="pdf-label">Péremption de secours :</span> <span class="pdf-bold">${snapshot.peremptionSecoursElectrodeP || ''}</span></div>` : ''}
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode P remplacée :</span> <span class="pdf-bold">${report.electrodePRemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode remplacée :</span> <span class="pdf-bold">${selElectrodeP || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode P Secours remplacée :</span> <span class="pdf-bold">${report.electrodePSecoursRemplacee || 'Non'}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de l'électrode Secours P remplacée :</span> <span class="pdf-bold">${selElectrodePSecours || ''}</span></div>
                  
                  <div class="pdf-line"><span class="pdf-label">Électrode P conforme et fonctionnelle :</span> <span class="pdf-bold">${report.electrodePConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant l’électrode P :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireElectrodeP || ''}</span></div>
                </div>
              </div>
              ` : ''}
            </div>

            ${renderFooter(3, totalPages)}
          </div>

          <!-- PAGE 4 -->
          <div class="pdf-page">
            ${renderHeader()}

            <div class="pdf-grid">
              <!-- SECTION 6 -->
              <div class="pdf-card">
                <div class="pdf-card-header">6 — Batterie (B).</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Modèle de batterie :</span> <span class="pdf-bold">${batterieModelName || ''}</span></div>
                  ${isVisiblePourcentageBatterie ? `<div class="pdf-line"><span class="pdf-label">Pourcentage de charge :</span> <span class="pdf-bold">${snapshot.pourcentageBatterie ? snapshot.pourcentageBatterie + '%' : ''}</span></div>` : ''}
                  ${isVisibleLotP ? `<div class="pdf-line"><span class="pdf-label">Lot B :</span> <span class="pdf-bold">${snapshot.lotBatterie || ''}</span></div>` : ''}
                  ${isVisiblePeremptionBatterie ? `<div class="pdf-line"><span class="pdf-label">Péremption :</span> <span class="pdf-bold">${snapshot.peremptionBatterie || ''}</span></div>` : ''}
                  <div class="pdf-line"><span class="pdf-label">Batterie remplacée :</span> <span class="pdf-bold">${report.batterieRemplacee || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Sélection de la batterie remplacée :</span> <span class="pdf-bold">${selBatterie || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Batterie conforme et fonctionnelle :</span> <span class="pdf-bold">${report.batterieConformeSante || ''}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire concernant la batterie :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireBatterie || ''}</span></div>
                </div>
              </div>

              <!-- SECTION 7 -->
              <div class="pdf-card">
                <div class="pdf-card-header">7 — Vérifications du kit de secours.</div>
                <div class="pdf-card-body" style="gap: 3px;">
                  ${isVisiblePeremptionTrousse ? `
                    <div class="pdf-line"><span class="pdf-label">Trousse de secours présente :</span> <span class="pdf-bold">${report.kitTrousseSecoursPresent || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Kit de secours remplacé ou ajouté :</span> <span class="pdf-bold">${report.kitSecoursRemplaceOuAjoute || ''}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Sélection d’un kit de secours :</span> <span class="pdf-bold">${selKitSecours || ''}</span></div>
                  ` : ''}
                  ${isVisibleCiseauxPresents ? `<div class="pdf-line"><span class="pdf-label">Ciseaux présents :</span> <span class="pdf-bold">${report.kitCiseauxPresents || ''}</span></div>` : ''}
                  ${isVisibleMasquePresent ? `<div class="pdf-line"><span class="pdf-label">Masque présent :</span> <span class="pdf-bold">${report.kitMasquePresent || ''}</span></div>` : ''}
                  ${isVisibleMasquePresent && isVisiblePeremptionMasque ? `<div class="pdf-line"><span class="pdf-label">Péremption du masque :</span> <span class="pdf-bold">${report.kitPeremptionMasque || ''}</span></div>` : ''}
                  ${isVisibleServiettesPresentes ? `<div class="pdf-line"><span class="pdf-label">Serviettes présentes :</span> <span class="pdf-bold">${report.kitServiettesPresentes || ''}</span></div>` : ''}
                  ${isVisibleServiettesPresentes && isVisiblePeremptionServiettes ? `<div class="pdf-line"><span class="pdf-label">Péremption des serviettes :</span> <span class="pdf-bold">${report.kitPeremptionServiettes || ''}</span></div>` : ''}
                  ${isVisibleGantsPresents ? `<div class="pdf-line"><span class="pdf-label">Paires de gants présents :</span> <span class="pdf-bold">${report.kitGantsPresents || ''}</span></div>` : ''}
                  ${isVisibleRasoir ? `<div class="pdf-line"><span class="pdf-label">Rasoir :</span> <span class="pdf-bold">${report.kitRasoirPresent || ''}</span></div>` : ''}
                </div>
              </div>
            </div>

            ${renderFooter(4, totalPages)}
          </div>

          <!-- PAGE 5 -->
          <div class="pdf-page">
            ${renderHeader()}

            <div class="pdf-grid">
              <!-- SECTION 8 -->
              <div class="pdf-card">
                <div class="pdf-card-header">8 — Diagnostic et clôture.</div>
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
                    <!-- Photos (Up to 3 photos stacked vertically) -->
                    ${isVisiblePiecesJointes ? `
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                      <div class="pdf-line" style="font-size: 16px; font-weight: bold !important;">Photographies de l'intervention.</div>
                      
                      ${report.photoUrl ? `
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                          <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                            <img src="${report.photoUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                          </div>
                          <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Photographie globale du défibrillateur.</span>
                        </div>
                      ` : ''}

                      ${report.photoArriereUrl ? `
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                          <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                            <img src="${report.photoArriereUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo Arrière" referrerPolicy="no-referrer" />
                          </div>
                          <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Photographie arrière / étiquette.</span>
                        </div>
                      ` : ''}

                      ${report.photoResultatTestUrl ? `
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                          <div style="border: none; border-radius: 11px; overflow: hidden; background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 100px; max-width: 200px;">
                            <img src="${report.photoResultatTestUrl}" style="max-height: 100px; border-radius: 11px; max-width: 200px; object-fit: contain;" alt="Photo Resultat Test" referrerPolicy="no-referrer" />
                          </div>
                          <span class="pdf-label" style="font-size: 8px; color: #000000; font-family: 'Civilprom', sans-serif !important;">Résultat du test.</span>
                        </div>
                      ` : ''}

                    </div>
                    ` : ''}

                    <!-- Signature Technicien -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature technicien.</div>
                      ${report.techSignature ? `
                        <div style="background: transparent; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                          <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                        </div>
                      ` : ''}
                    </div>

                    <!-- Signature Client -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-size: 16px;">Signature client.</div>
                      ${clientFound && clientFound.clientSignatureImage ? `
                        <div style="background: transparent; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; max-height: 80px; max-width: 150px; margin-top: 4px;">
                          <img src="${clientFound.clientSignatureImage}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature Client" />
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            ${renderFooter(5, totalPages)}
          </div>

          ${hasLastPage ? `
            <!-- PAGE 6 -->
            <div class="pdf-page">
              ${renderHeader()}
              <div class="pdf-grid" style="display: flex; flex-direction: column; justify-content: flex-start;">
                <div class="pdf-card" style="display: flex; flex-direction: column;">
                  <div class="pdf-card-header" style="font-weight: bold !important; margin-bottom: 10px;">
                    Informations complémentaires
                  </div>
                  <div class="pdf-card-body" style="font-size: 15px; color: #000000; white-space: pre-line; line-height: 1.5;">
                    ${pdfLastPageInfoText}
                  </div>
                </div>
              </div>
              ${renderFooter(6, totalPages)}
            </div>
          ` : ''}

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

  const saveVeilles = (updated: VeilleRecord[]) => {
    setVeilles(updated);
    try {
      localStorage.setItem(`defib_${tenantId}_veilles`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded in saveVeilles:', e);
    }
    if (isFirebaseLoaded && tenantId) {
      saveCollectionToFirestore('veilles', updated);
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
      // 1. Instantly load local cache so the app is immediately usable (0ms delay!)
      try {
        const savedClients = localStorage.getItem(`defib_${tenantId}_clients`);
        let offlineClients: Client[] = savedClients ? JSON.parse(savedClients) : INITIAL_CLIENTS;
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
        setVariables(savedVariables ? JSON.parse(savedVariables) : INITIAL_VARIABLES);

        const savedDefibs = localStorage.getItem(`defib_${tenantId}_defibrillateurs`);
        setDefibrillateurs(savedDefibs ? JSON.parse(savedDefibs) : INITIAL_DEFIBRILLATEURS);

        const defaultInfo = {
          name: tenantId === 'demo' ? "Défibeo Solutions" : "Mon Cabinet",
          logo: tenantId === 'demo' ? "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&auto=format&fit=crop" : "",
          website: tenantId === 'demo' ? "29382302.defibeo.com" : "",
          email: tenantId === 'demo' ? "contact@defibeo-solutions.com" : "",
          phone: tenantId === 'demo' ? "+33 1 47 20 00 01" : ""
        };
        const savedCompanyInfo = localStorage.getItem(`defib_${tenantId}_company_info`);
        setCompanyInfo(savedCompanyInfo ? JSON.parse(savedCompanyInfo) : defaultInfo);

        const savedMembers = localStorage.getItem(`defib_${tenantId}_members`);
        setMembers(savedMembers ? JSON.parse(savedMembers) : INITIAL_MEMBERS);

        const savedTickets = localStorage.getItem(`defib_${tenantId}_support_tickets`);
        setTickets(savedTickets ? JSON.parse(savedTickets) : INITIAL_TICKETS);

        const savedMemos = localStorage.getItem(`defib_${tenantId}_memos`);
        setMemos(savedMemos ? JSON.parse(savedMemos) : []);

        const savedCommercialDocs = localStorage.getItem(`defib_${tenantId}_commercial_docs`);
        setCommercialDocs(savedCommercialDocs ? JSON.parse(savedCommercialDocs) : INITIAL_COMMERCIAL_DOCS);

        const savedGedDocs = localStorage.getItem(`defib_${tenantId}_ged_docs`);
        setGedDocs(savedGedDocs ? JSON.parse(savedGedDocs) : INITIAL_GED_DOCS);

        const savedStocks = localStorage.getItem(`defib_${tenantId}_stocks`);
        setStocks(savedStocks ? JSON.parse(savedStocks) : INITIAL_STOCKS);

        const savedDistrib = localStorage.getItem(`defib_${tenantId}_distributed_stocks`);
        setDistributedStocks(savedDistrib ? JSON.parse(savedDistrib) : INITIAL_DISTRIBUTED_STOCKS);

        const savedReviews = localStorage.getItem(`defib_${tenantId}_customer_reviews`);
        setCustomerReviews(savedReviews ? JSON.parse(savedReviews) : INITIAL_REVIEWS);

        const savedReports = localStorage.getItem(`defib_${tenantId}_generated_reports`);
        setGeneratedReports(savedReports ? JSON.parse(savedReports) : INITIAL_REPORTS);

        const savedFsmTours = localStorage.getItem(`defib_${tenantId}_fsm_tours`);
        setFsmTours(savedFsmTours ? JSON.parse(savedFsmTours) : INITIAL_TOURS);

        const savedExpenses = localStorage.getItem(`defib_${tenantId}_expenses`);
        setExpenses(savedExpenses ? JSON.parse(savedExpenses) : INITIAL_EXPENSES);

        const savedOtherEquipments = localStorage.getItem(`defib_${tenantId}_other_equipments`);
        setOtherEquipments(savedOtherEquipments ? JSON.parse(savedOtherEquipments) : INITIAL_OTHER_EQUIPMENTS);

        const savedPointagesHistory = localStorage.getItem(`defib_${tenantId}_pointages_history`);
        setPointages(savedPointagesHistory ? JSON.parse(savedPointagesHistory) : []);

        const savedPointagesAutoVigilance = localStorage.getItem(`defib_${tenantId}_pointages_auto_vigilance`);
        setPointagesAutoVigilance(savedPointagesAutoVigilance ? JSON.parse(savedPointagesAutoVigilance) : []);

        const savedAchatsFournisseurs = localStorage.getItem(`defib_${tenantId}_achats_fournisseurs`);
        setAchatsFournisseurs(savedAchatsFournisseurs ? JSON.parse(savedAchatsFournisseurs) : []);

        const savedVeilles = localStorage.getItem(`defib_${tenantId}_veilles`);
        setVeilles(savedVeilles ? JSON.parse(savedVeilles) : INITIAL_VEILLES);

        const savedNotifications = localStorage.getItem(`defib_${tenantId}_notifications`);
        if (savedNotifications) {
          try {
            const loadedNotifs = JSON.parse(savedNotifications) as AppNotification[];
            const cleanedNotifs = loadedNotifs.filter(n => !isNotificationOlderThan3Months(n.timestamp));
            setNotifications(cleanedNotifs);
          } catch (e) {}
        } else {
          setNotifications([]);
        }

        // Set loaded to true IMMEDIATELY so there is 0ms delay / blocking for the user!
        setIsFirebaseLoaded(true);
        loadedTenantIdRef.current = tenantId;
      } catch (localErr) {
        console.warn("Failed to load instant offline fallback data:", localErr);
      }

      try {
        console.log('Démarrage de la synchronisation Firestore en arrière-plan...');

        // Define a helper to retrieve currently cached data instantly
        const getInstant = <T,>(keySuffix: string, defaultVal: T): T => {
          const saved = localStorage.getItem(`defib_${tenantId}_${keySuffix}`);
          if (saved) {
            try { return JSON.parse(saved) as T; } catch (e) {}
          }
          return defaultVal;
        };

        const fClients = getInstant<Client[]>('clients', INITIAL_CLIENTS);
        const fVariables = getInstant<Variable[]>('variables', INITIAL_VARIABLES);
        const fDefibrillateurs = getInstant<Defibrillateur[]>('defibrillateurs', INITIAL_DEFIBRILLATEURS);
        const fCompanyInfo = getInstant<CompanyInfo>('company_info', null);
        const fMembers = getInstant<Member[]>('members', INITIAL_MEMBERS);
        const fTickets = getInstant<SupportTicket[]>('support_tickets', INITIAL_TICKETS);
        const fDocs = getInstant<CommercialDoc[]>('commercial_docs', INITIAL_COMMERCIAL_DOCS);
        const fGed = getInstant<GedDocument[]>('ged_docs', INITIAL_GED_DOCS);
        const fStocks = getInstant<StockRecord[]>('stocks', INITIAL_STOCKS);
        const fReviews = getInstant<any[]>('customer_reviews', INITIAL_REVIEWS);
        const fPointages = getInstant<PointageLog[]>('pointages_history', []);
        const fExpenses = getInstant<any[]>('expenses', INITIAL_EXPENSES);
        const fReports = getInstant<any[]>('generated_reports', INITIAL_REPORTS);
        const fTours = getInstant<any[]>('fsm_tours', INITIAL_TOURS);
        const fMemos = getInstant<Memo[]>('memos', []);
        const fOtherEquipments = getInstant<OtherEquipment[]>('other_equipments', INITIAL_OTHER_EQUIPMENTS);
        const fPointagesAutoVigilance = getInstant<PointageAutoVigilance[]>('pointages_auto_vigilance', []);
        const fDistributedStocks = getInstant<DistributedStockLocation[]>('distributed_stocks', INITIAL_DISTRIBUTED_STOCKS);
        const fAchatsFournisseurs = getInstant<AchatFournisseur[]>('achats_fournisseurs', []);
        const fNotifications = getInstant<AppNotification[]>('notifications', []);
        const fVeilles = getInstant<VeilleRecord[]>('veilles', INITIAL_VEILLES);

        // Helper for independent background syncing of each collection
        const syncBackground = async <T,>(
          collectionName: string,
          localStorageKeySuffix: string,
          stateSetter: (val: T) => void,
          customTransformer?: (data: T) => T | Promise<T>
        ) => {
          try {
            const data = await fetchCollectionFromFirestore<T>(collectionName, tenantId);
            if (data !== null) {
              let finalData = data;
              if (customTransformer) {
                finalData = await customTransformer(data);
              }
              stateSetter(finalData);
              const strVal = JSON.stringify(finalData);
              localStorage.setItem(`defib_${tenantId}_${localStorageKeySuffix}`, strVal);
              loadedDataRef.current[localStorageKeySuffix] = strVal;
            }
          } catch (err) {
            console.warn(`Background sync failed for ${collectionName}:`, err);
          }
        };

        // Fire all sync tasks completely concurrently and in parallel
        syncBackground<Client[]>('clients', 'clients', setClients, (data) => {
          let changed = false;
          const sanitized = data.map(c => {
            if (!c.signaturePin || !c.signaturePin.trim()) {
              changed = true;
              return { ...c, signaturePin: generateRandomPin() };
            }
            return c;
          });
          if (changed) {
            saveCollectionToFirestore('clients', sanitized);
          }
          return sanitized;
        });

        syncBackground<Variable[]>('variables', 'variables', setVariables);
        syncBackground<Defibrillateur[]>('defibrillateurs', 'defibrillateurs', setDefibrillateurs);
        syncBackground<CompanyInfo>('companyInfo', 'company_info', setCompanyInfo);
        syncBackground<Member[]>('members', 'members', setMembers);
        syncBackground<SupportTicket[]>('tickets', 'support_tickets', setTickets);
        syncBackground<CommercialDoc[]>('commercialDocs', 'commercial_docs', setCommercialDocs);
        syncBackground<GedDocument[]>('gedDocs', 'ged_docs', setGedDocs);
        syncBackground<StockRecord[]>('stocks', 'stocks', setStocks);
        syncBackground<DistributedStockLocation[]>('distributed_stocks', 'distributed_stocks', setDistributedStocks);
        syncBackground<any[]>('customerReviews', 'customer_reviews', setCustomerReviews);
        syncBackground<PointageLog[]>('pointages', 'pointages_history', setPointages);
        syncBackground<any[]>('expenses', 'expenses', setExpenses);
        syncBackground<VeilleRecord[]>('veilles', 'veilles', setVeilles);
        syncBackground<any[]>('generatedReports', 'generated_reports', setGeneratedReports);
        syncBackground<any[]>('fsmTours', 'fsm_tours', setFsmTours);
        syncBackground<Memo[]>('memos', 'memos', setMemos);
        syncBackground<OtherEquipment[]>('otherEquipments', 'other_equipments', setOtherEquipments);
        syncBackground<PointageAutoVigilance[]>('pointagesAutoVigilance', 'pointages_auto_vigilance', setPointagesAutoVigilance);
        syncBackground<AchatFournisseur[]>('achats_fournisseurs', 'achats_fournisseurs', setAchatsFournisseurs);

        syncBackground<AppNotification[]>('notifications', 'notifications', (notifs) => {
          const cleaned = notifs.filter(n => !isNotificationOlderThan3Months(n.timestamp));
          setNotifications(cleaned);
          if (cleaned.length !== notifs.length) {
            saveCollectionToFirestore('notifications', cleaned);
          }
          return cleaned;
        });

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

        let baseClients: Client[] = [];
        if (fClients !== null) {
          baseClients = fClients;
        } else {
          baseClients = getFallback<Client[]>('clients', INITIAL_CLIENTS);
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
          baseVariables = fVariables;
        } else {
          baseVariables = getFallback<Variable[]>('variables', INITIAL_VARIABLES);
        }
        setVariables(baseVariables);
        localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(baseVariables));

        let baseDefibrillateurs: Defibrillateur[] = [];
        if (fDefibrillateurs !== null) {
          baseDefibrillateurs = fDefibrillateurs;
        } else {
          baseDefibrillateurs = getFallback<Defibrillateur[]>('defibrillateurs', INITIAL_DEFIBRILLATEURS);
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
          baseMembers = getFallback<Member[]>('members', INITIAL_MEMBERS);
        }
        setMembers(baseMembers);
        localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(baseMembers));

        let baseTickets: SupportTicket[] = [];
        if (fTickets !== null) {
          baseTickets = fTickets;
        } else {
          baseTickets = getFallback<SupportTicket[]>('support_tickets', INITIAL_TICKETS);
        }
        setTickets(baseTickets);
        localStorage.setItem(`defib_${tenantId}_support_tickets`, JSON.stringify(baseTickets));

        let baseDocs: CommercialDoc[] = [];
        if (fDocs !== null) {
          baseDocs = fDocs;
        } else {
          baseDocs = getFallback<CommercialDoc[]>('commercial_docs', INITIAL_COMMERCIAL_DOCS);
        }
        setCommercialDocs(baseDocs);
        localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(baseDocs));

        let baseGed: GedDocument[] = [];
        if (fGed !== null) {
          baseGed = fGed;
        } else {
          baseGed = getFallback<GedDocument[]>('ged_docs', INITIAL_GED_DOCS);
        }
        setGedDocs(baseGed);
        localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(baseGed));

        let baseStocks: StockRecord[] = [];
        if (fStocks !== null) {
          baseStocks = fStocks;
        } else {
          baseStocks = getFallback<StockRecord[]>('stocks', INITIAL_STOCKS);
        }
        setStocks(baseStocks);
        localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(baseStocks));

        let baseDistrib: DistributedStockLocation[] = [];
        if (fDistributedStocks !== null) {
          baseDistrib = fDistributedStocks;
        } else {
          baseDistrib = getFallback<DistributedStockLocation[]>('distributed_stocks', INITIAL_DISTRIBUTED_STOCKS);
        }
        setDistributedStocks(baseDistrib);
        localStorage.setItem(`defib_${tenantId}_distributed_stocks`, JSON.stringify(baseDistrib));

        let baseReviews: any[] = [];
        if (fReviews !== null) {
          baseReviews = fReviews;
        } else {
          baseReviews = getFallback<any[]>('customer_reviews', INITIAL_REVIEWS);
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
          baseExpenses = getFallback<any[]>('expenses', INITIAL_EXPENSES);
        }
        setExpenses(baseExpenses);
        localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(baseExpenses));

        let baseVeilles: VeilleRecord[] = [];
        if (fVeilles !== null) {
          baseVeilles = fVeilles;
        } else {
          baseVeilles = getFallback<VeilleRecord[]>('veilles', INITIAL_VEILLES);
        }
        setVeilles(baseVeilles);
        localStorage.setItem(`defib_${tenantId}_veilles`, JSON.stringify(baseVeilles));

        let baseReports: any[] = [];
        if (fReports !== null) {
          baseReports = fReports;
        } else {
          baseReports = getFallback<any[]>('generated_reports', INITIAL_REPORTS);
        }
        setGeneratedReports(baseReports);
        localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(baseReports));

        let baseTours: any[] = [];
        if (fTours !== null) {
          baseTours = fTours;
        } else {
          baseTours = getFallback<any[]>('fsm_tours', INITIAL_TOURS);
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
          baseOtherEquip = getFallback<OtherEquipment[]>('other_equipments', INITIAL_OTHER_EQUIPMENTS);
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

        let baseNotifications: AppNotification[] = [];
        if (fNotifications !== null) {
          baseNotifications = fNotifications;
        } else {
          baseNotifications = getFallback<AppNotification[]>('notifications', []);
        }
        const cleanedNotifications = baseNotifications.filter(n => !isNotificationOlderThan3Months(n.timestamp));
        setNotifications(cleanedNotifications);
        localStorage.setItem(`defib_${tenantId}_notifications`, JSON.stringify(cleanedNotifications));
        if (isFirebaseLoaded && tenantId && cleanedNotifications.length !== baseNotifications.length) {
          saveCollectionToFirestore('notifications', cleanedNotifications);
        }

        loadedDataRef.current = {
          clients: JSON.stringify(sanitizedClients),
          variables: JSON.stringify(baseVariables),
          defibrillateurs: JSON.stringify(baseDefibrillateurs),
          stocks: JSON.stringify(baseStocks),
          companyInfo: JSON.stringify(baseCompanyInfo),
          members: JSON.stringify(baseMembers),
          tickets: JSON.stringify(baseTickets),
          pointages: JSON.stringify(basePointages),
          pointagesAutoVigilance: JSON.stringify(basePointagesAuto),
          commercialDocs: JSON.stringify(baseDocs),
          customerReviews: JSON.stringify(baseReviews),
          notifications: JSON.stringify(cleanedNotifications),
          gedDocs: JSON.stringify(baseGed),
          expenses: JSON.stringify(baseExpenses),
          veilles: JSON.stringify(baseVeilles),
          generatedReports: JSON.stringify(baseReports),
          fsmTours: JSON.stringify(baseTours),
          memos: JSON.stringify(baseMemos),
          otherEquipments: JSON.stringify(baseOtherEquip),
          achats_fournisseurs: JSON.stringify(baseAchats),
        };

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
          offlineClients = INITIAL_CLIENTS;
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
        else setVariables(INITIAL_VARIABLES);

        const savedDefibs = localStorage.getItem(`defib_${tenantId}_defibrillateurs`);
        if (savedDefibs) setDefibrillateurs(JSON.parse(savedDefibs));
        else setDefibrillateurs(INITIAL_DEFIBRILLATEURS);

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
        else setOtherEquipments(INITIAL_OTHER_EQUIPMENTS);

        const savedPointagesHistory = localStorage.getItem(`defib_${tenantId}_pointages_history`);
        if (savedPointagesHistory) setPointages(JSON.parse(savedPointagesHistory));

        const savedPointagesAutoVigilance = localStorage.getItem(`defib_${tenantId}_pointages_auto_vigilance`);
        if (savedPointagesAutoVigilance) setPointagesAutoVigilance(JSON.parse(savedPointagesAutoVigilance));
        else setPointagesAutoVigilance([]);

        const savedAchatsFournisseurs = localStorage.getItem(`defib_${tenantId}_achats_fournisseurs`);
        if (savedAchatsFournisseurs) setAchatsFournisseurs(JSON.parse(savedAchatsFournisseurs));
        else setAchatsFournisseurs([]);

        const savedNotifications = localStorage.getItem(`defib_${tenantId}_notifications`);
        if (savedNotifications) {
          try {
            const loadedNotifs = JSON.parse(savedNotifications) as AppNotification[];
            const cleanedNotifs = loadedNotifs.filter(n => !isNotificationOlderThan3Months(n.timestamp));
            setNotifications(cleanedNotifs);
            if (cleanedNotifs.length !== loadedNotifs.length) {
              localStorage.setItem(`defib_${tenantId}_notifications`, JSON.stringify(cleanedNotifs));
            }
          } catch (e) {
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }

        loadedDataRef.current = {
          clients: JSON.stringify(sanitizedOffline),
          variables: savedVariables || JSON.stringify(tenantId === 'demo' ? INITIAL_VARIABLES : []),
          defibrillateurs: savedDefibs || JSON.stringify(tenantId === 'demo' ? INITIAL_DEFIBRILLATEURS : []),
          stocks: savedStocks || '[]',
          companyInfo: savedCompanyInfo || '{}',
          members: savedMembers || '[]',
          tickets: savedTickets || '[]',
          pointages: savedPointagesHistory || '[]',
          pointagesAutoVigilance: savedPointagesAutoVigilance || '[]',
          commercialDocs: savedCommercialDocs || '[]',
          customerReviews: '[]',
          notifications: savedNotifications || '[]',
          gedDocs: savedGedDocs || '[]',
          expenses: savedExpenses || '[]',
          veilles: '[]',
          generatedReports: savedReports || '[]',
          fsmTours: savedFsmTours || '[]',
          memos: savedMemos || '[]',
          otherEquipments: savedOtherEquipments || JSON.stringify(tenantId === 'demo' ? INITIAL_OTHER_EQUIPMENTS : []),
          achats_fournisseurs: savedAchatsFournisseurs || '[]',
        };

        setIsFirebaseLoaded(true);
        loadedTenantIdRef.current = tenantId;
      }
    }
    loadFirebaseAndSeed();
  }, [tenantId]);

  const loadApiConnectors = React.useCallback(() => {
    fetchCollectionFromFirestore<any>('api_connectors', tenantId).then(data => {
      if (data) {
        if (data.pennylaneActive !== undefined) setPennylaneActive(data.pennylaneActive);
        if (data.dropboxActive !== undefined) setDropboxActive(data.dropboxActive);
        if (data.dropboxAccessToken !== undefined) setDropboxAccessToken(data.dropboxAccessToken);
      } else {
        setPennylaneActive(false);
        setDropboxActive(false);
        setDropboxAccessToken('');
      }
    }).catch(err => {
      console.error("Error loading api_connectors:", err);
      setPennylaneActive(false);
      setDropboxActive(false);
      setDropboxAccessToken('');
    });
  }, [tenantId]);

  useEffect(() => {
    loadApiConnectors();
  }, [activeTab, isFirebaseLoaded, loadApiConnectors]);

  // Save state changes back to Firebase
  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(clients);
      if (loadedDataRef.current.clients === str) return;
      saveCollectionToFirestore('clients', clients);
      localStorage.setItem(`defib_${tenantId}_clients`, str);
      loadedDataRef.current.clients = str;
    }
  }, [clients, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(variables);
      if (loadedDataRef.current.variables === str) return;
      saveCollectionToFirestore('variables', variables);
      localStorage.setItem(`defib_${tenantId}_variables`, str);
      loadedDataRef.current.variables = str;
    }
  }, [variables, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(defibrillateurs);
      if (loadedDataRef.current.defibrillateurs === str) return;
      saveCollectionToFirestore('defibrillateurs', defibrillateurs);
      localStorage.setItem(`defib_${tenantId}_defibrillateurs`, str);
      loadedDataRef.current.defibrillateurs = str;
    }
  }, [defibrillateurs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(stocks);
      if (loadedDataRef.current.stocks === str) return;
      saveCollectionToFirestore('stocks', stocks);
      localStorage.setItem(`defib_${tenantId}_stocks`, str);
      loadedDataRef.current.stocks = str;
    }
  }, [stocks, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(companyInfo);
      if (loadedDataRef.current.companyInfo === str) return;
      saveCollectionToFirestore('companyInfo', companyInfo);
      localStorage.setItem(`defib_${tenantId}_company_info`, str);
      loadedDataRef.current.companyInfo = str;
    }
  }, [companyInfo, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(members);
      if (loadedDataRef.current.members === str) return;
      saveCollectionToFirestore('members', members);
      localStorage.setItem(`defib_${tenantId}_members`, str);
      loadedDataRef.current.members = str;
    }
  }, [members, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(tickets);
      if (loadedDataRef.current.tickets === str) return;
      saveCollectionToFirestore('tickets', tickets);
      localStorage.setItem(`defib_${tenantId}_support_tickets`, str);
      loadedDataRef.current.tickets = str;
    }
  }, [tickets, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(pointages);
      if (loadedDataRef.current.pointages === str) return;
      saveCollectionToFirestore('pointages', pointages);
      localStorage.setItem(`defib_${tenantId}_pointages_history`, str);
      loadedDataRef.current.pointages = str;
    }
  }, [pointages, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(pointagesAutoVigilance);
      if (loadedDataRef.current.pointagesAutoVigilance === str) return;
      saveCollectionToFirestore('pointagesAutoVigilance', pointagesAutoVigilance);
      localStorage.setItem(`defib_${tenantId}_pointages_auto_vigilance`, str);
      loadedDataRef.current.pointagesAutoVigilance = str;
    }
  }, [pointagesAutoVigilance, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(commercialDocs);
      if (loadedDataRef.current.commercialDocs === str) return;
      saveCollectionToFirestore('commercialDocs', commercialDocs);
      localStorage.setItem(`defib_${tenantId}_commercial_docs`, str);
      loadedDataRef.current.commercialDocs = str;
    }
  }, [commercialDocs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(customerReviews);
      if (loadedDataRef.current.customerReviews === str) return;
      saveCollectionToFirestore('customerReviews', customerReviews);
      localStorage.setItem(`defib_${tenantId}_customer_reviews`, str);
      loadedDataRef.current.customerReviews = str;
    }
  }, [customerReviews, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(notifications);
      if (loadedDataRef.current.notifications === str) return;
      saveCollectionToFirestore('notifications', notifications);
      localStorage.setItem(`defib_${tenantId}_notifications`, str);
      loadedDataRef.current.notifications = str;
    }
  }, [notifications, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(gedDocs);
      if (loadedDataRef.current.gedDocs === str) return;
      saveCollectionToFirestore('gedDocs', gedDocs);
      try {
        localStorage.setItem(`defib_${tenantId}_ged_docs`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for gedDocs:', e);
      }
      loadedDataRef.current.gedDocs = str;
    }
  }, [gedDocs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(expenses);
      if (loadedDataRef.current.expenses === str) return;
      saveCollectionToFirestore('expenses', expenses);
      try {
        localStorage.setItem(`defib_${tenantId}_expenses`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for expenses:', e);
      }
      loadedDataRef.current.expenses = str;
    }
  }, [expenses, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(veilles);
      if (loadedDataRef.current.veilles === str) return;
      saveCollectionToFirestore('veilles', veilles);
      try {
        localStorage.setItem(`defib_${tenantId}_veilles`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for veilles:', e);
      }
      loadedDataRef.current.veilles = str;
    }
  }, [veilles, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(generatedReports);
      if (loadedDataRef.current.generatedReports === str) return;
      saveCollectionToFirestore('generatedReports', generatedReports);
      try {
        localStorage.setItem(`defib_${tenantId}_generated_reports`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for generatedReports:', e);
      }
      loadedDataRef.current.generatedReports = str;
    }
  }, [generatedReports, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(fsmTours);
      if (loadedDataRef.current.fsmTours === str) return;
      saveCollectionToFirestore('fsmTours', fsmTours);
      try {
        localStorage.setItem(`defib_${tenantId}_fsm_tours`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for fsmTours:', e);
      }
      loadedDataRef.current.fsmTours = str;
    }
  }, [fsmTours, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(memos);
      if (loadedDataRef.current.memos === str) return;
      saveCollectionToFirestore('memos', memos);
      try {
        localStorage.setItem(`defib_${tenantId}_memos`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for memos:', e);
      }
      loadedDataRef.current.memos = str;
    }
  }, [memos, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(otherEquipments);
      if (loadedDataRef.current.otherEquipments === str) return;
      saveCollectionToFirestore('otherEquipments', otherEquipments);
      try {
        localStorage.setItem(`defib_${tenantId}_other_equipments`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for otherEquipments:', e);
      }
      loadedDataRef.current.otherEquipments = str;
    }
  }, [otherEquipments, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      const str = JSON.stringify(achatsFournisseurs);
      if (loadedDataRef.current.achats_fournisseurs === str) return;
      saveCollectionToFirestore('achats_fournisseurs', achatsFournisseurs);
      try {
        localStorage.setItem(`defib_${tenantId}_achats_fournisseurs`, str);
      } catch (e) {
        console.warn('Storage quota exceeded for achatsFournisseurs:', e);
      }
      loadedDataRef.current.achats_fournisseurs = str;
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
      const itemUgs = item.ugs || stocks.find(s => s.denominationPieceId === item.variableId)?.ugs || '—';
      return `
        <tr style="${isLast ? '' : 'border-bottom: 1px solid #dcdcdc;'}">
          <td style="padding: 12px 8px; font-family: monospace;">${itemUgs}</td>
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
              <p style="margin: 4px 0 0 0;">Remarque : ${doc.commentaire || ''}</p>
              <p style="margin: 4px 0 0 0;">Référence du contrat : ${clientObj?.referenceContrat || '-'}</p>
              <p style="margin: 4px 0 0 0;">Numéro de marché : ${clientObj?.numeroMarche || '-'}</p>
              <p style="margin: 4px 0 0 0;">Payeur ID : ${clientObj?.payeurId || '-'}</p>
              <p style="margin: 4px 0 0 0;">Client ID : ${clientObj?.clientIdField || '-'}</p>
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
                  <th style="padding: 10px 8px; font-weight: 100 !important;">UGS.</th>
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
    window.open(url, '_blank');
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
      const itemUgs = item.ugs || stocks.find(s => s.denominationPieceId === item.variableId)?.ugs || '—';
      return `
        <tr style="${isLast ? '' : 'border-bottom: 1px solid #dcdcdc;'}">
          <td style="padding: 12px 8px; font-family: monospace;">${itemUgs}</td>
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
              <p style="margin: 4px 0 0 0;">Remarque : ${doc.commentaire || ''}</p>
              <p style="margin: 4px 0 0 0;">Entête : ${doc.bonCommandeEntete || '-'}</p>
              <p style="margin: 4px 0 0 0;">Référence du contrat : ${clientObj?.referenceContrat || '-'}</p>
              <p style="margin: 4px 0 0 0;">Numéro de marché : ${clientObj?.numeroMarche || '-'}</p>
              <p style="margin: 4px 0 0 0;">Payeur ID : ${clientObj?.payeurId || '-'}</p>
              <p style="margin: 4px 0 0 0;">Client ID : ${clientObj?.clientIdField || '-'}</p>
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
                  <th style="padding: 10px 8px; font-weight: 100 !important;">UGS.</th>
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
    window.open(url, '_blank');
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
    setDocCommentaires(doc.commentaires || '');
    setDocAssignedMemberName(doc.assignedMemberName || '');
    setDocHasBonCommande(!!doc.hasBonCommande);
    setDocBonCommandeReference(doc.bonCommandeReference || '');
    setDocBonCommandeLivraison(doc.bonCommandeLivraison || 'Transporteur');
    setDocBonCommandeSituation(doc.bonCommandeSituation || 'Ouvert');
    setDocBonCommandeEntete(doc.bonCommandeEntete || '');
    setDocCodeTaxe(doc.codeTaxe || '');
    setDocPayeurId(doc.payeurId || '');
    setDocClientIdField(doc.clientIdField || '');
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
    setDocCommentaires('');
    setDocAssignedMemberName('');
    setDocHasBonCommande(false);
    setDocBonCommandeReference('');
    setDocBonCommandeLivraison('Transporteur');
    setDocBonCommandeSituation('Ouvert');
    setDocBonCommandeEntete('');
    setDocCodeTaxe('');
    setDocPayeurId('');
    setDocClientIdField('');
    setIsDocFormOpen(true);
  };

  const triggerPennylaneSync = async (doc: CommercialDoc, silentOnInactive = false) => {
    try {
      const connectors = await fetchCollectionFromFirestore<any>('api_connectors', tenantId);
      if (!connectors || !connectors.pennylaneActive) {
        if (!silentOnInactive) {
          showPennylaneAlert("L'intégration Pennylane n'est pas activée. Veuillez l'activer dans les paramètres (connecteurs).", "error");
        }
        return;
      }

      const { pennylaneSecretToken, pennylaneCompanyToken } = connectors;
      if (!pennylaneSecretToken || !pennylaneSecretToken.trim()) {
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
        return;
      }

      const parseDateToYmd = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const parts = dateStr.split('/');
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      const parseVatRate = (codeTaxe?: string): string => {
        if (!codeTaxe) return "20.0";
        const matched = codeTaxe.match(/(\d+(?:\.\d+)?)/);
        if (matched) {
          return matched[1];
        }
        return "20.0";
      };

      const clientObj = clients.find(c => c.id === doc.clientId);
      const clientIdValue = (doc.clientIdField || clientObj?.clientIdField || '').trim();

      let matchedCustomerId = '';

      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pennylaneSecretToken.trim()}`
      };
      if (pennylaneCompanyToken && pennylaneCompanyToken.trim()) {
        authHeaders['X-Company-Token'] = pennylaneCompanyToken.trim();
      }

      try {
        const listResponse = await fetch(`/api/pennylane/customers`, {
          method: 'GET',
          headers: authHeaders
        });

        if (listResponse.ok) {
          const listData = await listResponse.json();
          const customers = Array.isArray(listData) ? listData : (listData.customers || listData.results || []);

          if (clientIdValue) {
            const match = customers.find((c: any) => 
              String(c.id).trim() === clientIdValue || 
              String(c.external_id).trim() === clientIdValue
            );
            if (match) {
              matchedCustomerId = match.id;
            }
          }

          if (!matchedCustomerId) {
            const denom = (doc.clientDenomination || '').trim().toLowerCase();
            if (denom) {
              const match = customers.find((c: any) => 
                (c.company_name && c.company_name.trim().toLowerCase() === denom) ||
                (c.first_name && c.last_name && `${c.first_name} ${c.last_name}`.trim().toLowerCase() === denom)
              );
              if (match) {
                matchedCustomerId = match.id;
              }
            }
          }
        } else {
          showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
          return;
        }
      } catch (err) {
        console.error("Error searching Pennylane customers:", err);
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
        return;
      }

      if (!matchedCustomerId) {
        try {
          const createCustomerResponse = await fetch(`/api/pennylane/customers`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              customer: {
                customer_type: 'company',
                company_name: doc.clientDenomination || 'Invité Défibeo',
                external_id: clientIdValue || doc.clientId || `client-${Date.now()}`,
                first_name: 'Invité',
                last_name: doc.clientDenomination || 'Défibeo',
                emails: clientObj?.email ? [clientObj.email] : ['guest@defibeo.com'],
                phone: clientObj?.telephone || ''
              }
            })
          });

          if (createCustomerResponse.ok) {
            const createdData = await createCustomerResponse.json();
            const createdCustomer = createdData.customer || createdData;
            if (createdCustomer && createdCustomer.id) {
              matchedCustomerId = createdCustomer.id;
            }
          } else {
            showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
            return;
          }
        } catch (err) {
          console.error("Error creating Pennylane customer:", err);
          showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
          return;
        }
      }

      if (!matchedCustomerId) {
        matchedCustomerId = clientIdValue || "guest";
      }

      const invoicePayload = {
        customer_invoice: {
          invoice_number: doc.ref,
          date: parseDateToYmd(doc.dateStr),
          deadline_date: parseDateToYmd(doc.dateStr),
          customer_id: matchedCustomerId,
          draft: true,
          line_items_attributes: doc.items.map(item => ({
            description: item.nomPiece || 'Pièce',
            quantity: item.quantite || 1,
            unit_price: item.prixVenteHt || 0.0,
            vat_rate: parseVatRate(doc.codeTaxe)
          }))
        }
      };

      const invoiceResponse = await fetch(`/api/pennylane/customer_invoices`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(invoicePayload)
      });

      if (invoiceResponse.ok) {
        showPennylaneAlert(`La facture ${doc.ref} pour ${doc.clientDenomination} a été poussée avec succès sur Pennylane en tant que facture BROUILLON (Draft).`, "success");
      } else {
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
      }
    } catch (error: any) {
      console.error("Pennylane Sync Error:", error);
      showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
    }
  };

  const handlePennylaneGlobalSync = async () => {
    try {
      const connectors = await fetchCollectionFromFirestore<any>('api_connectors', tenantId);
      if (!connectors || !connectors.pennylaneActive) {
        showPennylaneAlert("L'intégration Pennylane n'est pas activée. Veuillez l'activer dans les paramètres (connecteurs).", "error");
        return;
      }

      const { pennylaneSecretToken, pennylaneCompanyToken } = connectors;
      if (!pennylaneSecretToken || !pennylaneSecretToken.trim()) {
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
        return;
      }

      const acceptedInvoices = commercialDocs.filter(
        (doc) => doc.type === 'Facture' && doc.status === 'Accepté'
      );

      if (acceptedInvoices.length === 0) {
        showPennylaneAlert("Aucune facture acceptée à synchroniser.", "error");
        return;
      }

      const parseDateToYmd = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const parts = dateStr.split('/');
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      const parseVatRate = (codeTaxe?: string): string => {
        if (!codeTaxe) return "20.0";
        const matched = codeTaxe.match(/(\d+(?:\.\d+)?)/);
        if (matched) {
          return matched[1];
        }
        return "20.0";
      };

      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pennylaneSecretToken.trim()}`
      };
      if (pennylaneCompanyToken && pennylaneCompanyToken.trim()) {
        authHeaders['X-Company-Token'] = pennylaneCompanyToken.trim();
      }

      let listResponse;
      try {
        listResponse = await fetch(`/api/pennylane/customers`, {
          method: 'GET',
          headers: authHeaders
        });
      } catch (err) {
        console.error("Error fetching Pennylane customers:", err);
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
        return;
      }

      if (!listResponse.ok) {
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
        return;
      }

      const listData = await listResponse.json();
      const customers = Array.isArray(listData) ? listData : (listData.customers || listData.results || []);

      let successCount = 0;
      let hasError = false;

      for (const doc of acceptedInvoices) {
        let matchedCustomerId = '';
        const clientObj = clients.find(c => c.id === doc.clientId);
        const clientIdValue = (doc.clientIdField || clientObj?.clientIdField || '').trim();

        if (clientIdValue) {
          const match = customers.find((c: any) => 
            String(c.id).trim() === clientIdValue || 
            String(c.external_id).trim() === clientIdValue
          );
          if (match) {
            matchedCustomerId = match.id;
          }
        }

        if (!matchedCustomerId) {
          const denom = (doc.clientDenomination || '').trim().toLowerCase();
          if (denom) {
            const match = customers.find((c: any) => 
              (c.company_name && c.company_name.trim().toLowerCase() === denom) ||
              (c.first_name && c.last_name && `${c.first_name} ${c.last_name}`.trim().toLowerCase() === denom)
            );
            if (match) {
              matchedCustomerId = match.id;
            }
          }
        }

        if (!matchedCustomerId) {
          try {
            const createCustomerResponse = await fetch(`/api/pennylane/customers`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                customer: {
                  customer_type: 'company',
                  company_name: doc.clientDenomination || 'Invité Défibeo',
                  external_id: clientIdValue || doc.clientId || `client-${Date.now()}`,
                  first_name: 'Invité',
                  last_name: doc.clientDenomination || 'Défibeo',
                  emails: clientObj?.email ? [clientObj.email] : ['guest@defibeo.com'],
                  phone: clientObj?.telephone || ''
                }
              })
            });

            if (createCustomerResponse.ok) {
              const createdData = await createCustomerResponse.json();
              const createdCustomer = createdData.customer || createdData;
              if (createdCustomer && createdCustomer.id) {
                matchedCustomerId = createdCustomer.id;
                customers.push(createdCustomer);
              }
            } else {
              hasError = true;
              continue;
            }
          } catch (err) {
            console.error("Error creating Pennylane customer:", err);
            hasError = true;
            continue;
          }
        }

        if (!matchedCustomerId) {
          matchedCustomerId = clientIdValue || "guest";
        }

        const invoicePayload = {
          customer_invoice: {
            invoice_number: doc.ref,
            date: parseDateToYmd(doc.dateStr),
            deadline_date: parseDateToYmd(doc.dateStr),
            customer_id: matchedCustomerId,
            draft: true,
            line_items_attributes: doc.items.map(item => ({
              description: item.nomPiece || 'Pièce',
              quantity: item.quantite || 1,
              unit_price: item.prixVenteHt || 0.0,
              vat_rate: parseVatRate(doc.codeTaxe)
            }))
          }
        };

        try {
          const invoiceResponse = await fetch(`/api/pennylane/customer_invoices`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(invoicePayload)
          });

          if (invoiceResponse.ok) {
            successCount++;
          } else {
            console.error("Failed to push invoice:", await invoiceResponse.text());
            hasError = true;
          }
        } catch (err) {
          console.error("Error pushing invoice:", err);
          hasError = true;
        }
      }

      if (hasError) {
        showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
      } else {
        showPennylaneAlert(`Synchronisation réussie ! ${successCount} facture(s) synchronisée(s) sur Pennylane.`, "success");
      }
    } catch (error: any) {
      console.error("Pennylane Sync Error:", error);
      showPennylaneAlert("Impossible de synchroniser avec le compte Pennylane, vérifiez les identifiants.", "error");
    }
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
        commentaires: docCommentaires,
        assignedMemberName: docAssignedMemberName || undefined,
        hasBonCommande: docHasBonCommande,
        bonCommandeReference: docHasBonCommande ? finalBcRef : undefined,
        bonCommandeLivraison: docHasBonCommande ? docBonCommandeLivraison : undefined,
        bonCommandeSituation: docHasBonCommande ? docBonCommandeSituation : undefined,
        bonCommandeEntete: docHasBonCommande ? docBonCommandeEntete : undefined,
        codeTaxe: docCodeTaxe,
        payeurId: docPayeurId,
        clientIdField: docClientIdField
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
        commentaires: docCommentaires,
        assignedMemberName: docAssignedMemberName || undefined,
        hasBonCommande: docHasBonCommande,
        bonCommandeReference: docHasBonCommande ? finalBcRef : undefined,
        bonCommandeLivraison: docHasBonCommande ? docBonCommandeLivraison : undefined,
        bonCommandeSituation: docHasBonCommande ? docBonCommandeSituation : undefined,
        bonCommandeEntete: docHasBonCommande ? docBonCommandeEntete : undefined,
        codeTaxe: docCodeTaxe,
        payeurId: docPayeurId,
        clientIdField: docClientIdField
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
    
    const matchedStock = stocks.find(s => s.denominationPieceId === selectedDocPieceId);
    const ugs = matchedStock?.ugs || '';

    const newItem: CommercialDocItem = {
      variableId: selectedDocPieceId,
      nomPiece: `${foundVar.nom} (${foundVar.marque})`,
      prixVenteHt: customDocPiecePrice,
      quantite: customDocPieceQty,
      ugs: ugs
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
    const infoStr = JSON.stringify(info);
    localStorage.setItem('defib_company_info', infoStr);
    localStorage.setItem(`defib_${tenantId}_company_info`, infoStr);
    loadedDataRef.current.companyInfo = infoStr;
  };

  const handleUpdateMembers = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    localStorage.setItem('defib_members', JSON.stringify(updatedMembers));
    localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(updatedMembers));
    if (isFirebaseLoaded && tenantId && tenantId !== 'demo') {
      saveCollectionToFirestore('members', updatedMembers).catch(console.error);
    }

    let toursMutated = false;
    const nextTours = fsmTours.map(tour => {
      const mem = updatedMembers.find(m => m.name.trim().toLowerCase() === (tour.techName || '').trim().toLowerCase());
      if (mem) {
        const oldMem = members.find(m => m.name.trim().toLowerCase() === mem.name.trim().toLowerCase());
        const addressChanged = 
          mem.startAddress !== oldMem?.startAddress ||
          mem.startAddressLat !== oldMem?.startAddressLat ||
          mem.startAddressLng !== oldMem?.startAddressLng;
        const prefChanged = mem.optimizationPreference !== oldMem?.optimizationPreference;
        if (addressChanged || prefChanged) {
          toursMutated = true;
          return { ...tour, calculated: false };
        }
      }
      return tour;
    });

    if (toursMutated) {
      saveFsmTours(nextTours);
    }
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
        veilles={veilles}
        onUpdateVeilles={saveVeilles}
        commercialDocs={commercialDocs}
        onUpdateCommercialDocs={saveCommercialDocs}
        onAddTicket={handleAddTicket}
        onAddNotification={addNotification}
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
        onAddTicket={handleAddTicket}
        onAddNotification={addNotification}
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
        onAddTicket={handleAddTicket}
        onAddNotification={addNotification}
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
        veilles={veilles}
        onUpdateVeilles={saveVeilles}
        commercialDocs={commercialDocs}
        onUpdateCommercialDocs={saveCommercialDocs}
        onAddTicket={handleAddTicket}
        onAddNotification={addNotification}
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

  const loggedRole = localStorage.getItem('defib_logged_user_role') || '';
  if (loggedRole === 'megaadmin') {
    return <MegaAdminDashboard onLogout={handleLogout} />;
  }

  if (isBlockedByPrez) {
    const getPrezBlockMessage = () => {
      const lang = getLanguage();
      if (lang === 'English') {
        return `Welcome! To get started, you must schedule an introductory call with a Défibeo specialist to guide you through your first steps. You will be logged out in ${prezCountdown} second${prezCountdown > 1 ? 's' : ''}.`;
      } else if (lang === 'Deutsch') {
        return `Willkommen! Um zu beginnen, müssen Sie ein Einführungsgespräch mit einem Défibeo-Spezialisten vereinbaren, der Sie bei Ihren ersten Schritten begleitet. Sie werden in ${prezCountdown} Sekunde${prezCountdown > 1 ? 'n' : ''} abgemeldet.`;
      } else if (lang === 'Español') {
        return `¡Bienvenido! Para empezar, debe programar una llamada de presentación con un especialista de Défibeo para que le guíe en sus primeros pasos. Se le desconectará en ${prezCountdown} segundo${prezCountdown > 1 ? 's' : ''}.`;
      } else if (lang === 'Português') {
        return `Bem-vindo! Para começar, deve agendar uma chamada de apresentação com um especialista Défibeo para o orientar nos seus primeiros passos. Será desconectado em ${prezCountdown} segundo${prezCountdown > 1 ? 's' : ''}.`;
      }
      return `Bienvenue! Pour commencer, vous devez planifier un appel de présentation avec un spécialiste Défibeo afin d'être guidé dans vos premiers pas. Vous allez être déconnecté dans ${prezCountdown} seconde${prezCountdown > 1 ? 's' : ''}.`;
    };

    return (
      <div 
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center text-center font-sans p-6" 
        style={{ 
          background: 'radial-gradient(#7e2e86, #36093a)',
          color: '#ffffff'
        }}
        id="prez-block-overlay"
      >
        <div className="flex flex-col items-center gap-6 max-w-lg">
          <span className="text-white text-[18px] font-sans font-medium leading-relaxed">
            {getPrezBlockMessage()}
          </span>
        </div>
      </div>
    );
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
            { id: 'defibrillateurs', label: t('Défibrillateurs'), icon: Heart },
            ...(enableOtherEquipments === "Oui" ? [{ id: 'autres-materiels', label: t('Autres matériels'), icon: Layers }] : []),
            { id: 'clients', label: t('Clients'), icon: User },
            { id: 'fsm', label: t('FSM (Tournées)'), icon: Flame },
            { id: 'gmao', label: t('GMAO (Rapports)'), icon: Wrench },
            { id: 'stocks', label: t('Centrale des stocks'), icon: Inbox },
            { id: 'stocks-distribues', label: t('Stocks distribués'), icon: Layers },
            { id: 'achats-fournisseurs', label: t('Achats fournisseurs'), icon: ShoppingBag },
            { id: 'devis', label: t('Devis & Factures'), icon: FileSpreadsheet },
            { id: 'crm', label: t('CRM'), icon: FolderSync },
            { id: 'ged', label: t('GED'), icon: ClipboardList },
            { id: 'temps', label: t('Temps'), icon: Clock },
            { id: 'localisations', label: t('Localisations'), icon: MapPin },
            { id: 'tickets', label: t('Tickets Caisse'), icon: Ticket },
            { id: 'variables', label: t('Variables'), icon: Layers },
            { id: 'import-export', label: t('Importer Exporter'), icon: Download },
            { id: 'satisfaction', label: t('Satisfaction'), icon: ThumbsUp },
            { id: 'statistiques', label: t('Statistiques'), icon: TrendingUp },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'veilles', label: t('Relevé Concurrentiel'), icon: ClipboardList },
          ].filter(tab => {
            if (!companyInfo?.hiddenTabs) return true;
            const tabToLabelMap: Record<string, string> = {
              fsm: "FSM (Tournées)",
              gmao: "GMAO (Rapports)",
              stocks: "Centrale des stocks",
              "stocks-distribues": "Stocks distribués",
              "achats-fournisseurs": "Achats fournisseurs",
              devis: "Devis & Factures",
              crm: "CRM",
              ged: "GED",
              temps: "Temps",
              localisations: "Localisations",
              tickets: "Tickets Caisse",
              variables: "Variables",
              "import-export": "Importer Exporter",
              satisfaction: "Satisfaction",
              notifications: "Notifications",
              veilles: "Relevé Concurrentiel"
            };
            const label = tabToLabelMap[tab.id];
            return !label || !companyInfo.hiddenTabs.includes(label);
          }).map((tab) => {
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
              boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #3556ec, inset 0 6px 12px #ffffff1f',
              background: '#3556ec',
              fontSize: '18px',
              textTransform: 'none',
              letterSpacing: 'normal',
              fontWeight: 'bold',
              fontFamily: "DefibeoMain, Civilprom, sans-serif"
            }}
          >
            <span>{t('Paramètres')}</span>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE CONTAINER */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-[#f6f6f6]">
        {isSubscriptionInactive && (
          <div 
            className="sticky top-0 z-[100] w-full bg-[#F9383C] text-white py-3.5 px-6 flex items-center justify-between font-sans shadow-md"
            id="subscription-inactive-banner"
          >
            <span className="font-bold text-[15px] sm:text-[16px] text-left">
              {t("Attention requise : Votre abonnement est inactif, veuillez compléter le paiement pour l'activation.")}
            </span>
            {paymentUrl && (
              <a 
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white active:scale-[0.98] transition-all font-semibold shrink-0 border-0 flex items-center justify-center cursor-pointer select-none"
                style={{ 
                  textDecoration: 'none',
                  backgroundColor: '#D82C30',
                  borderRadius: '13px',
                  fontSize: '18px',
                  padding: '8px 24px',
                  boxShadow: 'none'
                }}
              >
                {t("Continuer")}
              </a>
            )}
          </div>
        )}
        {/* Dashboard Workspace Viewports wrapper */}
        <main className="flex-1 w-full" id="main-content">
          {/* Sub-component Active tab wrapper */}
          <section className={`${activeTab === 'parametres' ? 'bg-white' : 'pb-16'} p-0`} id="active-tab-content-wrapper">
          {activeTab === 'defibrillateurs' && (
            <DefibTab
              currentLang={currentLang}
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
              setActiveTab={setActiveTab}
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

            const uniqueDates = Array.from(new Set(fsmTours.map((t: any) => t.startDate).filter(Boolean))).filter(d => d !== 'A trier').sort() as string[];
            const activeDateFilter = fsmDateFilter === 'Tous' ? 'A trier' : fsmDateFilter;

            const filteredTours = fsmTours.filter((tour) => {
              if (activeDateFilter !== 'Tous') {
                if (activeDateFilter === 'A trier') {
                  return tour.id === 'a-trier' || tour.startDate === 'A trier';
                }
                if (tour.startDate !== activeDateFilter) {
                  return false;
                }
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

                <HelpBubble 
                  cacheKey="help_dismissed_fsm" 
                  text="Abréviation de Field Service Management, orchestrez depuis cet onglet les tournées que devront réaliser les techniciens. Chaque tournée est calculée intelligemment selon de nombreux critères comme les créneaux d’accès du défibrillateur, les plages de disponibilité du technicien, la route optimisée en termes de distance et de consommation, etc. Une tournée s'affiche sur la webapp technicien uniquement lorsqu’elle est placée en situation « À faire »." 
                />

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
                      <button
                        type="button"
                        onClick={() => setFsmDateFilter('A trier')}
                        style={{
                          borderRadius: '1000px',
                          padding: '10px 20px',
                          fontSize: '15px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                          backgroundColor: activeDateFilter === 'A trier' ? '#fa53d5' : '#ffffff',
                          color: activeDateFilter === 'A trier' ? '#ffffff' : '#000000',
                          border: activeDateFilter === 'A trier' ? '1px solid #fa53d5' : '1px solid rgb(218, 218, 218)',
                          transition: 'all 0.15s ease'
                        }}
                        className="transition-all"
                      >
                        Tournées à trier
                      </button>

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
                      if (t.id === 'a-trier') {
                        return (
                          <div key={t.id} className="bg-white relative space-y-6 animate-fadeIn" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px', maxWidth: '98%', margin: '24px auto', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                            {/* Tour missions list */}
                            <div className="p-4 space-y-4">
                              {t.missions.length === 0 ? (
                                <div className="py-12 text-center font-sans bg-white rounded-xl" style={{ color: '#000000', fontSize: '16px', border: 'none' }}>
                                  Aucune mission à trier.
                                </div>
                              ) : (
                                <div className="space-y-4 bg-white">
                                  {t.missions.map((m: any, idx: number) => {
                                    return (
                                      <div key={m.id} className="rounded-xl p-4 shadow-3xs transition-shadow space-y-4 font-sans" style={{ border: '1px solid rgb(229, 229, 229)', backgroundColor: 'rgb(245, 245, 245)' }}>
                                        {/* Row 1: Gélules */}
                                        <div className="flex flex-wrap items-center gap-2 bg-transparent pb-0.5">
                                          <span
                                            style={{
                                              backgroundColor: 'rgb(77, 21, 83)',
                                              color: 'rgb(255, 255, 255)',
                                              borderRadius: '1000px',
                                              padding: '4px 12px',
                                              fontSize: '15px',
                                              fontWeight: 700,
                                              border: 'none',
                                              cursor: 'default'
                                            }}
                                          >
                                            {m.equipmentType || 'Défibrillateur'}
                                          </span>

                                          {(() => {
                                            const matchedDefib = defibrillateurs.find((d: any) => d.identifiant === m.defibIdentifiant);
                                            const other = !matchedDefib ? otherEquipments.find((o: any) => o.identifiant === m.defibIdentifiant) : null;
                                            
                                            if (!matchedDefib && !other) return null;
                                            
                                            const renderCapsule = (label: string, rawVal: string) => {
                                              if (!rawVal || rawVal.trim() === '' || rawVal.trim() === '-') return null;
                                              const formatted = formatDateToFR(rawVal);
                                              if (!formatted || formatted === '-') return null;
                                              return (
                                                <span 
                                                  key={label}
                                                  style={{
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    padding: '4.5px 15px',
                                                    border: 'none',
                                                    background: getCapsuleBgColor(rawVal),
                                                    cursor: 'default'
                                                  }}
                                                  className="inline-flex items-center rounded-full font-sans font-medium"
                                                >
                                                  <span className="font-extrabold mr-1">{label}</span>
                                                  {formatted}
                                                </span>
                                              );
                                            };

                                            if (matchedDefib) {
                                              const defibModel = variables.find((v: any) => v.id === matchedDefib.modeleId);
                                              const modelName = defibModel 
                                                ? (defibModel.marque && defibModel.marque !== 'Standard' ? `${defibModel.marque} ${defibModel.nom}` : defibModel.nom) 
                                                : (matchedDefib.modeleId || 'Modèle inconnu');
                                              const nextMaint = computeProchaineMaintenance(matchedDefib.derniereMaintenance);
                                              
                                              return (
                                                <div className="flex flex-wrap gap-1 md:gap-1.5 ml-1 md:ml-2 items-center">
                                                  <span 
                                                    style={{
                                                      color: '#fff',
                                                      fontSize: '14px',
                                                      padding: '4.5px 15px',
                                                      border: 'none',
                                                      background: '#000000',
                                                      cursor: 'default'
                                                    }}
                                                    className="inline-flex items-center rounded-full font-sans font-medium"
                                                  >
                                                    {modelName}
                                                  </span>
                                                  {renderCapsule('Péremption A.', matchedDefib.peremptionElectrodeA)}
                                                  {renderCapsule('Péremption A.S.', matchedDefib.peremptionSecoursElectrodeA || '')}
                                                  {renderCapsule('Péremption P.', matchedDefib.peremptionElectrodeP)}
                                                  {renderCapsule('Péremption P.S.', matchedDefib.peremptionSecoursElectrodeP || '')}
                                                  {renderCapsule('Péremption B.', matchedDefib.peremptionBatterie)}
                                                  {renderCapsule('Expiration G.', matchedDefib.finGarantie)}
                                                  {renderCapsule('Prochaine V.', nextMaint)}
                                                </div>
                                              );
                                            } else if (other) {
                                              const modelName = other.categorie || 'Autre matériel';
                                              return (
                                                <div className="flex flex-wrap gap-1 md:gap-1.5 ml-1 md:ml-2 items-center">
                                                  <span 
                                                    style={{
                                                      color: '#fff',
                                                      fontSize: '14px',
                                                      padding: '4.5px 15px',
                                                      border: 'none',
                                                      background: '#000000',
                                                      cursor: 'default'
                                                    }}
                                                    className="inline-flex items-center rounded-full font-sans font-medium"
                                                  >
                                                    {modelName}
                                                  </span>
                                                  {renderCapsule('Expiration G.', other.expirationGarantie)}
                                                  {renderCapsule('Prochaine V.', other.prochaineMaintenance)}
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>

                                        {/* Row 2: Site & Identifiant & Localisation */}
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-transparent">
                                          <div className="space-y-0.5 bg-transparent">
                                            <label className="block mb-1 fsm-label-style">Site.</label>
                                            <input
                                              type="text"
                                              value={m.clientName || ""}
                                              disabled={true}
                                              className="w-full font-sans cursor-not-allowed"
                                              placeholder="Nom du Site"
                                            />
                                          </div>

                                          <div className="space-y-0.5 bg-transparent">
                                            <label className="block mb-1 fsm-label-style">Identifiant.</label>
                                            <input
                                              type="text"
                                              value={m.defibIdentifiant || ""}
                                              disabled={true}
                                              className="w-full font-mono cursor-not-allowed"
                                              placeholder="ID Matériel"
                                            />
                                          </div>

                                          <div className="space-y-0.5 bg-transparent">
                                            <label className="block mb-1 fsm-label-style">Localisation.</label>
                                            <input
                                              type="text"
                                              value={(() => {
                                                const matchedDefib = defibrillateurs.find((d: any) => d.identifiant === m.defibIdentifiant);
                                                const other = !matchedDefib ? otherEquipments.find((o: any) => o.identifiant === m.defibIdentifiant) : null;
                                                const ville = matchedDefib ? matchedDefib.ville : (other ? other.ville : '');
                                                const cp = matchedDefib ? (matchedDefib.codePostal || matchedDefib.cp || '') : (other ? (other.codePostal || other.cp || '') : '');
                                                return (ville && cp) ? `${ville}, ${cp}` : (ville || cp || '');
                                              })()}
                                              disabled={true}
                                              className="w-full font-sans cursor-not-allowed"
                                              placeholder="Ville, CP"
                                            />
                                          </div>

                                          {/* Transférer section */}
                                          <div className="space-y-0.5 bg-transparent md:col-span-2">
                                            <label className="block mb-1 fsm-label-style" style={{ fontSize: '18px' }}>Transférer.</label>
                                            <div className="flex gap-2">
                                              <select
                                                id={`transfer-select-${m.id}`}
                                                style={{
                                                  border: '1px solid #dedede',
                                                  borderRadius: '13px',
                                                  padding: '12px',
                                                  fontSize: '16px',
                                                  fontWeight: '100',
                                                  backgroundColor: '#ffffff',
                                                  color: '#000000',
                                                  flex: 1
                                                }}
                                                className="font-sans cursor-pointer focus:outline-none"
                                              >
                                                <option value="">Sélection tournée brouillon.</option>
                                                {fsmTours
                                                  .filter(tour => tour.id !== 'a-trier' && (tour.status || 'Brouillon') === 'Brouillon')
                                                  .map(tour => (
                                                    <option key={tour.id} value={tour.id}>
                                                      {tour.title} ({tour.startDate || 'Sans date'})
                                                    </option>
                                                  ))
                                                }
                                              </select>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const selectEl = document.getElementById(`transfer-select-${m.id}`) as HTMLSelectElement;
                                                  const targetId = selectEl?.value;
                                                  if (!targetId) {
                                                    alert("Veuillez sélectionner une tournée en Brouillon.");
                                                    return;
                                                  }
                                                  
                                                  const targetTour = fsmTours.find(tour => tour.id === targetId);
                                                  if (targetTour && (targetTour.status || 'Brouillon') !== 'Brouillon') {
                                                    alert("Erreur : vous ne pouvez transférer des missions qu'à une tournée en situation Brouillon.");
                                                    return;
                                                  }
                                                  
                                                  // Perform transfer!
                                                  const updated = fsmTours.map(tour => {
                                                    if (tour.id === 'a-trier') {
                                                      return {
                                                        ...tour,
                                                        missions: tour.missions.filter((miss: any) => miss.id !== m.id)
                                                      };
                                                    }
                                                    if (tour.id === targetId) {
                                                      return {
                                                        ...tour,
                                                        missions: [...tour.missions, m]
                                                      };
                                                    }
                                                    return tour;
                                                  });
                                                  saveFsmTours(updated);
                                                  alert("Mission transférée avec succès !");
                                                }}
                                                style={{
                                                  backgroundColor: '#000000',
                                                  color: '#ffffff',
                                                  padding: '12px 18px',
                                                  borderRadius: '13px',
                                                  fontSize: '18px',
                                                  fontWeight: 'bold',
                                                  cursor: 'pointer',
                                                  border: 'none',
                                                }}
                                                className="hover:opacity-90 transition-opacity whitespace-nowrap"
                                              >
                                                Transférer
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

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
                                disabled={tourStatus === 'À faire' || tourStatus === 'En cours'}
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
                                  width: '100%',
                                  opacity: (tourStatus === 'À faire' || tourStatus === 'En cours') ? 0.4 : 1,
                                  cursor: (tourStatus === 'À faire' || tourStatus === 'En cours') ? 'not-allowed' : 'pointer'
                                }}
                                className={`${(tourStatus === 'À faire' || tourStatus === 'En cours') ? '' : 'cursor-pointer'} md:w-auto flex-1 md:flex-initial`}
                                title={(tourStatus === 'À faire' || tourStatus === 'En cours') ? "Impossible de supprimer une tournée dont le statut est À faire ou En cours" : ""}
                              >
                                Supprimer
                              </button>

                              {/* Calculer button */}
                              <button
                                type="button"
                                disabled={(t.missions ? t.missions.length : 0) <= 1}
                                onClick={async () => {
                                  const draftVal = fsmTourDrafts[t.id] || {};
                                  const finalTitle = draftVal.title !== undefined ? draftVal.title : (t.title || '');
                                  const finalTech = draftVal.techName !== undefined ? draftVal.techName : (t.techName || '');
                                  const finalStartDate = draftVal.startDate !== undefined ? draftVal.startDate : (t.startDate || '');
                                  const finalStatus = draftVal.status !== undefined ? draftVal.status : (t.status || 'Brouillon');
                                  const finalVehicule = draftVal.vehicule !== undefined ? draftVal.vehicule : (t.vehicule || 'Aucun');

                                  if (!finalTech || finalTech.trim() === '') {
                                    alert("Veuillez sélectionner un technicien avec une adresse de départ renseignée pour pouvoir calculer l'itinéraire.");
                                    return;
                                  }

                                  const matchingMember = members.find(m => m.name.trim().toLowerCase() === finalTech.trim().toLowerCase());
                                  const hasStructuredAddress = matchingMember && matchingMember.startAddressLat !== undefined && matchingMember.startAddressLng !== undefined;
                                  const hasStringAddress = matchingMember && matchingMember.startAddress && matchingMember.startAddress.trim() !== '';
                                  if (!matchingMember || (!hasStructuredAddress && !hasStringAddress)) {
                                    console.warn("Calculer clicked but technician not found or missing starting coordinates:", { finalTech, matchingMember, members });
                                    alert("Le technicien sélectionné doit avoir une adresse de départ renseignée (avec latitude et longitude renseignées) pour pouvoir calculer l'itinéraire.");
                                    return;
                                  }

                                  const mergedTour = {
                                    ...t,
                                    title: finalTitle,
                                    techName: finalTech,
                                    startDate: finalStartDate,
                                    status: finalStatus,
                                    vehicule: finalVehicule
                                  };

                                  const updatedToursList = fsmTours.map(tourItem => tourItem.id === t.id ? mergedTour : tourItem);
                                  
                                  await optimizeFsmTour(t.id, updatedToursList);

                                  // Clear draft since it is now successfully calculated and saved
                                  setFsmTourDrafts(prev => {
                                    const copy = { ...prev };
                                    delete copy[t.id];
                                    return copy;
                                  });
                                  alert("L'itinéraire et les horaires ont été calculés et optimisés avec succès !");
                                }}
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
                                  width: '100%',
                                  opacity: (t.missions ? t.missions.length : 0) <= 1 ? 0.5 : 1,
                                  cursor: (t.missions ? t.missions.length : 0) <= 1 ? 'not-allowed' : 'pointer'
                                }}
                                className={`${(t.missions ? t.missions.length : 0) <= 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} md:w-auto flex-1 md:flex-initial`}
                              >
                                Calculer
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
                                  const finalStatus = draftVal.status !== undefined ? draftVal.status : (t.status || 'Brouillon');

                                  if (!finalTitle.trim()) {
                                    alert("Le titre de la tournée est requis.");
                                    return;
                                  }
                                  if (finalStatus !== 'Brouillon' && (!finalTech || finalTech.trim() === '')) {
                                    alert("Veuillez sélectionner un technicien pour planifier cette tournée.");
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
                            if (!t.techName || t.techName === 'Aucun' || t.techName.trim() === '') {
                              return null;
                            }
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
                                  La tournée comporte <strong className="font-extrabold">{mLength} {mLength > 1 ? 'missions' : 'mission'}</strong>, nous estimons à <strong className="font-extrabold">{daysEstimate} {daysEstimate > 1 ? 'jours' : 'jour'}</strong> la durée du déplacement. <strong className="font-extrabold">{(mLength * 1.2).toFixed(1).replace('.', ',')} kg d’émissions de CO₂ (dioxyde de carbone)</strong> ont été évités grâce à l’optimisation du trajet (Source: MyClimate).
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
                                  const selectedTechName = e.target.value;
                                  const matchingMember = members.find(m => m.name.trim().toLowerCase() === selectedTechName.trim().toLowerCase());
                                  const assignedVehicle = matchingMember?.locationLink || 'Aucun';
                                  setFsmTourDrafts(prev => ({
                                    ...prev,
                                    [t.id]: {
                                      ...(prev[t.id] || {}),
                                      techName: selectedTechName,
                                      vehicule: assignedVehicle
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
                                <option value="">Sélectionnez un technicien.</option>
                                {(() => {
                                  const techOptions = Array.from(new Set([
                                    ...members.filter(m => {
                                      const roleLower = (m.role || '').toLowerCase();
                                      const isTech = roleLower.includes('tech') || roleLower.includes('maintenance') || roleLower.includes('terrain');
                                      const hasAddress = 
                                        (!!m.startAddress && m.startAddress.trim() !== '') ||
                                        (m.startAddressLat !== undefined && m.startAddressLng !== undefined);
                                      if (!isTech && !hasAddress) return false;

                                      // Check unavailability for tourStartDate
                                      if (tourStartDate && m.absences && m.absences.length > 0) {
                                        const isUnavailable = m.absences.some(abs => {
                                          if (!abs.startDate || !abs.endDate) return false;
                                          return tourStartDate >= abs.startDate && tourStartDate <= abs.endDate;
                                        });
                                        if (isUnavailable) return false;
                                      }
                                      return true;
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
                                onChange={() => {}} // No-op to satisfy React warning
                                style={{
                                  border: '1px solid #dedede',
                                  borderRadius: '13px',
                                  padding: '12px',
                                  fontSize: '16px',
                                  fontWeight: '100',
                                  color: '#64748b',
                                  backgroundColor: '#ffffff',
                                  width: '100%',
                                  opacity: 1,
                                  pointerEvents: 'none',
                                }}
                                className="font-sans cursor-not-allowed focus:outline-none bg-white"
                              >
                                {['Aucun', 'Véhicule A', 'Véhicule B', 'Véhicule C', 'Véhicule D', 'Véhicule E', 'Véhicule F', 'Véhicule G', 'Véhicule H', 'Véhicule I', 'Véhicule J'].map((veh) => (
                                  <option key={veh} value={veh}>
                                    {veh === 'Aucun' ? veh : getLocationCustomName(veh)}
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
                            const selectedMember = members.find(m => m.name.trim().toLowerCase() === tourTechName.trim().toLowerCase());
                            const comps = selectedMember?.competences || [];
                            const compsStr = comps.length > 0 ? comps.join(', ') : 'Aucune';
                            return (
                              <div 
                                style={{
                                  color: 'rgb(143 51 151)',
                                  backgroundColor: 'rgb(253 229 255)',
                                  border: 'none',
                                  cursor: 'default'
                                }}
                                className="font-semibold text-sm px-4 py-3 rounded-xl flex items-center gap-2.5 mx-0.5"
                              >
                                <span>
                                  Compétences : {compsStr}
                                </span>
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
                                const estimatedDateValue = m.estimatedDate || (t.calculated ? calculatedDate : '');
                                return (
                                  <div key={m.id} className="rounded-xl p-4 shadow-3xs transition-shadow space-y-4 font-sans" style={{ border: '1px solid rgb(229, 229, 229)', backgroundColor: 'rgb(245, 245, 245)' }}>
                                      {/* Ligne 1: Numéro de passage */}
                                      <div className="flex flex-wrap items-center gap-2 bg-transparent pb-0.5">
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
                                            fontSize: '14px',
                                            cursor: 'default'
                                          }}
                                        >
                                          {!t.calculated ? '?' : (idx + 1)}
                                        </div>
                                        <span
                                          style={{
                                            backgroundColor: 'rgb(77, 21, 83)',
                                            color: 'rgb(255, 255, 255)',
                                            borderRadius: '1000px',
                                            padding: '4px 12px',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            border: 'none',
                                            cursor: 'default'
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
                                          const other = !matchedDefib ? otherEquipments.find((o: any) => o.identifiant === m.defibIdentifiant) : null;
                                          
                                          if (!matchedDefib && !other) return null;
                                          
                                          const renderCapsule = (label: string, rawVal: string, colorClasses: string) => {
                                            if (!rawVal || rawVal.trim() === '' || rawVal.trim() === '-') return null;
                                            const formatted = formatDateToFR(rawVal);
                                            if (!formatted || formatted === '-') return null;
                                            return (
                                              <span 
                                                key={label}
                                                style={{
                                                  color: '#fff',
                                                  fontSize: '14px',
                                                  padding: '4.5px 15px',
                                                  border: 'none',
                                                  background: getCapsuleBgColor(rawVal),
                                                  cursor: 'default'
                                                }}
                                                className="inline-flex items-center rounded-full font-sans font-medium"
                                              >
                                                <span className="font-extrabold mr-1">{label}</span>
                                                {formatted}
                                              </span>
                                            );
                                          };

                                          if (matchedDefib) {
                                            const defibModel = variables.find((v: any) => v.id === matchedDefib.modeleId);
                                            const modelName = defibModel 
                                              ? (defibModel.marque && defibModel.marque !== 'Standard' ? `${defibModel.marque} ${defibModel.nom}` : defibModel.nom) 
                                              : (matchedDefib.modeleId || 'Modèle inconnu');
                                            const nextMaint = computeProchaineMaintenance(matchedDefib.derniereMaintenance);
                                            
                                            return (
                                              <div className="flex flex-wrap gap-1 md:gap-1.5 ml-1 md:ml-2 items-center">
                                                <span 
                                                  style={{
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    padding: '4.5px 15px',
                                                    border: 'none',
                                                    background: '#000000',
                                                    cursor: 'default'
                                                  }}
                                                  className="inline-flex items-center rounded-full font-sans font-medium"
                                                >
                                                  {modelName}
                                                </span>
                                                {renderCapsule('Péremption A.', matchedDefib.peremptionElectrodeA, 'bg-rose-50 text-rose-700 border-rose-200')}
                                                {renderCapsule('Péremption A.S.', matchedDefib.peremptionSecoursElectrodeA || '', 'bg-rose-50 text-rose-700 border-rose-200')}
                                                {renderCapsule('Péremption P.', matchedDefib.peremptionElectrodeP, 'bg-purple-50 text-purple-700 border-purple-200')}
                                                {renderCapsule('Péremption P.S.', matchedDefib.peremptionSecoursElectrodeP || '', 'bg-purple-50 text-purple-700 border-purple-200')}
                                                {renderCapsule('Péremption B.', matchedDefib.peremptionBatterie, 'bg-amber-50 text-amber-700 border-amber-250')}
                                                {renderCapsule('Expiration G.', matchedDefib.finGarantie, 'bg-blue-50 text-blue-700 border-blue-200')}
                                                {renderCapsule('Prochaine V.', nextMaint, 'bg-emerald-50 text-emerald-700 border-emerald-250')}
                                              </div>
                                            );
                                          } else if (other) {
                                            const modelName = other.categorie || 'Autre matériel';
                                            return (
                                              <div className="flex flex-wrap gap-1 md:gap-1.5 ml-1 md:ml-2 items-center">
                                                <span 
                                                  style={{
                                                    color: '#fff',
                                                    fontSize: '14px',
                                                    padding: '4.5px 15px',
                                                    border: 'none',
                                                    background: '#000000',
                                                    cursor: 'default'
                                                  }}
                                                  className="inline-flex items-center rounded-full font-sans font-medium"
                                                >
                                                  {modelName}
                                                </span>
                                                {renderCapsule('Expiration G.', other.expirationGarantie, 'bg-blue-50 text-blue-700 border-blue-200')}
                                                {renderCapsule('Prochaine V.', other.prochaineMaintenance, 'bg-emerald-50 text-emerald-700 border-emerald-250')}
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>

                                      {/* Ligne 2: Site., Identifiant., Localisation., Raison., Bon de commande., Date estimée., Créneau estimé., Situation. */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full bg-transparent">
                                        {/* Site. (toujours disabled) */}
                                        <div className="space-y-0.5 bg-transparent">
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
                                        <div className="space-y-0.5 bg-transparent">
                                          <label className="block mb-1 fsm-label-style">Identifiant.</label>
                                          <input
                                            type="text"
                                            value={m.defibIdentifiant || ""}
                                            disabled={true}
                                            className="w-full font-mono cursor-not-allowed"
                                            placeholder="ID Défib"
                                          />
                                        </div>

                                        {/* Localisation. */}
                                        <div className="space-y-0.5 bg-transparent">
                                          <label className="block mb-1 fsm-label-style">Localisation.</label>
                                          <input
                                            type="text"
                                            value={(() => {
                                              const matchedDefib = defibrillateurs.find((d: any) => d.identifiant === m.defibIdentifiant);
                                              const other = !matchedDefib ? otherEquipments.find((o: any) => o.identifiant === m.defibIdentifiant) : null;
                                              const ville = matchedDefib ? matchedDefib.ville : (other ? other.ville : '');
                                              const cp = matchedDefib ? (matchedDefib.codePostal || matchedDefib.cp || '') : (other ? (other.codePostal || other.cp || '') : '');
                                              return (ville && cp) ? `${ville}, ${cp}` : (ville || cp || '');
                                            })()}
                                            disabled={true}
                                            className="w-full font-sans cursor-not-allowed"
                                            placeholder="Ville, CP"
                                          />
                                        </div>

                                        {/* Raison. */}
                                        <div className="space-y-0.5 bg-transparent">
                                          <label className="block mb-1 fsm-label-style">Raison.</label>
                                          <select
                                            value={m.reason}
                                            onChange={(e) => updateFsmMission(t.id, m.id, { reason: e.target.value })}
                                            className="w-full font-sans focus:outline-none cursor-pointer"
                                          >
                                            <option value="Maintenance 1h Monôme">Maintenance 1h Monôme</option>
                                            <option value="Maintenance 30mins Monôme">Maintenance 30mins Monôme</option>
                                            <option value="Maintenance 1h30 Monôme">Maintenance 1h30 Monôme</option>
                                            <option value="Installation 1h Monôme">Installation 1h Monôme</option>
                                            <option value="Installation 30mins Monôme">Installation 30mins Monôme</option>
                                            <option value="Installation 1h30 Monôme">Installation 1h30 Monôme</option>
                                            <option value="Installation et formation">Installation et formation</option>
                                            <option value="Remplacement D 1h Monôme">Remplacement D 1h Monôme</option>
                                            <option value="Remplacement D 30mins Monôme">Remplacement D 30mins Monôme</option>
                                            <option value="Remplacement D 1h30 Monôme">Remplacement D 1h30 Monôme</option>
                                            <option value="Remplacement A 1h Monôme">Remplacement A 1h Monôme</option>
                                            <option value="Remplacement A 30mins Monôme">Remplacement A 30mins Monôme</option>
                                            <option value="Remplacement A 1h30 Monôme">Remplacement A 1h30 Monôme</option>
                                            <option value="Remplacement P 1h Monôme">Remplacement P 1h Monôme</option>
                                            <option value="Remplacement P 30mins Monôme">Remplacement P 30mins Monôme</option>
                                            <option value="Remplacement P 1h30 Monôme">Remplacement P 1h30 Monôme</option>
                                            <option value="Remplacement B 1h Monôme">Remplacement B 1h Monôme</option>
                                            <option value="Remplacement B 30mins Monôme">Remplacement B 30mins Monôme</option>
                                            <option value="Remplacement B 1h30 Monôme">Remplacement B 1h30 Monôme</option>
                                            <option value="Remplacement A + P 1h Monôme">Remplacement A + P 1h Monôme</option>
                                            <option value="Remplacement A + P 30mins Monôme">Remplacement A + P 30mins Monôme</option>
                                            <option value="Remplacement A + P 1h30 Monôme">Remplacement A + P 1h30 Monôme</option>
                                            <option value="Remplacement A + B 1h Monôme">Remplacement A + B 1h Monôme</option>
                                            <option value="Remplacement A + B 30mins Monôme">Remplacement A + B 30mins Monôme</option>
                                            <option value="Remplacement A + B 1h30 Monôme">Remplacement A + B 1h30 Monôme</option>
                                            <option value="Remplacement P + B 1h Monôme">Remplacement P + B 1h Monôme</option>
                                            <option value="Remplacement P + B 30mins Monôme">Remplacement P + B 30mins Monôme</option>
                                            <option value="Remplacement P + B 1h30 Monôme">Remplacement P + B 1h30 Monôme</option>
                                            <option value="Remplacement A + P + B 1h Monôme">Remplacement A + P + B 1h Monôme</option>
                                            <option value="Remplacement A + P + B 30mins Monôme">Remplacement A + P + B 30mins Monôme</option>
                                            <option value="Remplacement A + P + B 1h30 Monôme">Remplacement A + P + B 1h30 Monôme</option>
                                          </select>
                                        </div>

                                        {/* Bon de commande. */}
                                        <div className="space-y-0.5 bg-transparent">
                                          <label className="block mb-1 fsm-label-style">Bon de commande.</label>
                                          <select
                                            value={m.bonCommandeId || ''}
                                            onChange={(e) => {
                                              const nextBcId = e.target.value;
                                              if (nextBcId) {
                                                const selectedBcDoc = commercialDocs.find(doc => doc.id === nextBcId);
                                                if (selectedBcDoc) {
                                                  const nonServiceParts = selectedBcDoc.items
                                                    ? selectedBcDoc.items
                                                        .filter(item => {
                                                          const vObj = variables.find(v => v.id === item.variableId || v.nom === item.nomPiece);
                                                          return !(vObj && vObj.category === 'Modèle Service');
                                                        })
                                                        .map(item => item.nomPiece)
                                                    : [];
                                                  const uniqueParts = Array.from(new Set(nonServiceParts)) as string[];
                                                  changeFsmMissionParts(t.id, m.id, (m.requiredParts || []) as string[], uniqueParts, { bonCommandeId: nextBcId });
                                                } else {
                                                  updateFsmMission(t.id, m.id, { bonCommandeId: nextBcId });
                                                }
                                              } else {
                                                changeFsmMissionParts(t.id, m.id, (m.requiredParts || []) as string[], [], { bonCommandeId: '' });
                                              }
                                            }}
                                            className="w-full font-sans focus:outline-none cursor-pointer text-slate-800"
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
                                            <option value="">-- Aucun --</option>
                                            {(() => {
                                              const matchedClient = (() => {
                                                if (m.clientId) {
                                                  const found = clients.find(c => c.id === m.clientId);
                                                  if (found) return found;
                                                }
                                                const matchedDefib = defibrillateurs.find(df => df.identifiant === m.defibIdentifiant);
                                                if (matchedDefib) {
                                                  const found = clients.find(c => c.id === matchedDefib.clientId);
                                                  if (found) return found;
                                                }
                                                if (m.clientName) {
                                                  const mName = m.clientName.toLowerCase();
                                                  const found = clients.find(c => {
                                                    if (!c.denomination) return false;
                                                    const cDenom = c.denomination.toLowerCase();
                                                    return mName.includes(cDenom) || cDenom.includes(mName);
                                                  });
                                                  if (found) return found;
                                                }
                                                return null;
                                              })();

                                              const clientBcs = matchedClient
                                                ? commercialDocs.filter(doc => 
                                                    doc.hasBonCommande && 
                                                    (doc.clientId === matchedClient.id || 
                                                     (doc.clientDenomination && matchedClient.denomination && 
                                                      doc.clientDenomination.toLowerCase() === matchedClient.denomination.toLowerCase()))
                                                  )
                                                : [];

                                              return clientBcs.map(bcDoc => (
                                                <option key={bcDoc.id} value={bcDoc.id}>
                                                  {bcDoc.bonCommandeEntete || bcDoc.bonCommandeReference || bcDoc.ref}
                                                </option>
                                              ));
                                            })()}
                                          </select>
                                        </div>

                                        {/* Date estimée. */}
                                        <div className="space-y-0.5 bg-transparent">
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
                                        <div className="space-y-0.5 bg-transparent">
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
                                        <div className="space-y-0.5 font-sans relative bg-transparent">
                                          <label className="block mb-1 fsm-label-style">Situation.</label>
                                          <div className="relative flex items-center bg-transparent">
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
                                                  (m.status || 'À faire') === 'Attente' ? '#94a3b8' :  
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
                                              <option value="Attente">Attente</option>
                                              <option value="Effectué">Effectué</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Info block displaying Commentaires of selected Bon de commande */}
                                      {(() => {
                                        const selectedBcDoc = (() => {
                                          if (!m.bonCommandeId) return null;
                                          return commercialDocs.find(doc => doc.id === m.bonCommandeId);
                                        })();

                                        if (selectedBcDoc && selectedBcDoc.commentaires && selectedBcDoc.commentaires.trim() !== '') {
                                          return (
                                            <div 
                                              style={{
                                                color: 'rgb(143 51 151)',
                                                backgroundColor: 'rgb(253 229 255)',
                                                border: 'none',
                                                cursor: 'default'
                                              }}
                                              className="font-semibold text-sm px-4 py-3 rounded-xl flex items-center gap-2.5 mt-2 w-full mx-0.5"
                                            >
                                              <span>
                                                Commentaires : {selectedBcDoc.commentaires}
                                              </span>
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}

                                  {/* Lookup field for required components with stock items selector */}
                                  {(() => {
                                    const currentMissionDefib = defibrillateurs.find((d: any) => d.identifiant === m.defibIdentifiant);

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
                                          label: `${name} (${getLocationCustomName(ds.locationName)} - Qté dispo: ${ds.volumeDisponible}${ugsString})`,
                                          matchedStock
                                        };
                                      });

                                    const recommendedItems = currentMissionDefib && currentMissionDefib.modeleId
                                      ? stockItems.filter(item => Array.isArray(item.matchedStock?.usageRecommandeIds) && item.matchedStock.usageRecommandeIds.includes(currentMissionDefib.modeleId))
                                      : [];
                                    const otherItems = currentMissionDefib && currentMissionDefib.modeleId
                                      ? stockItems.filter(item => !Array.isArray(item.matchedStock?.usageRecommandeIds) || !item.matchedStock.usageRecommandeIds.includes(currentMissionDefib.modeleId))
                                      : stockItems;

                                    return (
                                      <div className="pt-2 space-y-2.5 relative font-sans w-full bg-transparent">
                                        <div className="flex justify-between items-center bg-transparent">
                                          <span className="fsm-label-style bg-transparent" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>
                                            Pièces requises.
                                          </span>
                                        </div>

                                        {/* SELECTED PIECES BADGES */}
                                        {m.requiredParts.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 min-h-[24px] items-center bg-transparent">
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
                                        <div className="relative bg-transparent">
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
                                            {recommendedItems.length > 0 ? (
                                              <>
                                                <optgroup label="Pièces recommandées">
                                                  {recommendedItems.map(item => (
                                                    <option key={item.id} value={item.name}>
                                                      {item.label}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                                <optgroup label="Autres pièces">
                                                  {otherItems.map(item => (
                                                    <option key={item.id} value={item.name}>
                                                      {item.label}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              </>
                                            ) : (
                                              stockItems.map(item => (
                                                <option key={item.id} value={item.name}>
                                                  {item.label}
                                                </option>
                                              ))
                                            )}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Full-width Supprimer button */}
                                  <div className="pt-2 bg-transparent">
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
                    onUpdateStocks={saveStocks}
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

            const isGmaoController = (() => {
              if (!loggedUser || !loggedUser.email) return false;
              const m = members.find(lm => lm.email?.toLowerCase().trim() === loggedUser.email.toLowerCase().trim());
              if (!m) return false;
              
              const isSuperAdmin = m.role === 'Super-Administrateur' || 
                                   m.role === 'Propriétaire / Admin' || 
                                   m.role?.toLowerCase().includes('super') || 
                                   m.role?.toLowerCase().includes('propriétaire');
              
              const isControllerSubRole = m.adminSubRole === 'Contrôleur' || 
                                          m.adminSubRole === 'Administrateur & Contrôleur';
                                          
              return !!(isSuperAdmin || isControllerSubRole);
            })();

            const filteredReports = generatedReports.filter((rep) => {
              if (gmaoFilter === 'validated' && !rep.validated) return false;
              if (gmaoFilter === 'moderation' && rep.validated) return false;

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

                      {/* Apple-style toggle for filtering 'Modération' / 'Validé(s)' */}
                      <div className="flex items-center gap-3 select-none">
                        <span 
                          onClick={() => setGmaoFilter('moderation')}
                          className="font-sans font-bold text-sm transition-colors duration-200 cursor-pointer"
                          style={{
                            color: '#000000',
                            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                            fontSize: '18px'
                          }}
                        >
                          {t("Modération")}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setGmaoFilter(gmaoFilter === 'validated' ? 'moderation' : 'validated')}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none"
                          style={{
                            backgroundColor: gmaoFilter === 'validated' ? '#fe4eba' : '#cbd5e1',
                            cursor: 'pointer',
                            border: 'none',
                          }}
                        >
                          <span
                            className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm"
                            style={{
                              transform: gmaoFilter === 'validated' ? 'translateX(24px)' : 'translateX(4px)',
                            }}
                          />
                        </button>

                        <span 
                          onClick={() => setGmaoFilter('validated')}
                          className="font-sans font-bold text-sm transition-colors duration-200 cursor-pointer"
                          style={{
                            color: gmaoFilter === 'validated' ? '#fe4eba' : '#000000',
                            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                            fontSize: '18px'
                          }}
                        >
                          {t("Validé(s)")}
                        </span>
                      </div>

                      {/* No Actualiser button */}
                    </div>
                  </div>
                </div>

                <HelpBubble 
                  cacheKey="help_dismissed_gmao" 
                  text="Il s’agit des rapports générés par les techniciens. Pour actualiser votre base de données, vous devrez cliquer sur Valider, c’est un principe de modération. Vous avez trouvé une erreur : cliquez sur Corriger pour modifier le document. Attention, une fois validé conformément à la réglementation, le document PDF ne peut plus être altéré." 
                />

                <div 
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn transition-all text-left"
                  style={{
                    borderColor: 'rgb(218, 218, 218)',
                    background: '#ffffff00',
                    boxShadow: 'none',
                    maxWidth: '98%',
                    margin: '15px auto 5px auto',
                  }}
                >
                  <p 
                    className="font-sans leading-relaxed flex-1"
                    style={{ 
                      fontSize: '16px', 
                      fontWeight: 400, 
                      color: '#000000', 
                      cursor: 'default' 
                    }}
                  >
                    Uniquement un membre contrôleur ou administrateur-contrôleur est en capacité de modifier et valider les documents émis qui actualisent la base de données.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('parametres');
                      setTimeout(() => {
                        const el = document.getElementById('settings-section-members');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 300);
                    }}
                    className="font-sans font-semibold active:scale-95 transition-all border-0 cursor-pointer shrink-0 inline-flex items-center justify-center text-center whitespace-nowrap"
                    style={{
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      fontSize: '18px',
                      borderRadius: '13px',
                      padding: '8px 20px',
                    }}
                  >
                    Gérer les membres
                  </button>
                </div>

                {dropboxError && (
                  <div className="space-y-2 mt-4 mb-4">
                    <div className="text-red-600 font-sans font-light text-sm text-left">
                      {dropboxError}
                    </div>
                    {(dropboxError.includes("Autorisation insuffisante") || dropboxError.includes("401") || dropboxError.includes("expiré")) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2 max-w-2xl">
                        <p className="font-bold text-red-900">💡 Guide de configuration & génération de Token Dropbox :</p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-red-700">
                          <li>Allez sur la <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-red-900">Console Dropbox Developer</a>.</li>
                          <li>Sélectionnez votre application Dropbox.</li>
                          <li>Allez dans l'onglet <strong className="font-bold">Permissions</strong>.</li>
                          <li>Cochez la case <strong className="font-bold">files.content.write</strong> (et <strong className="font-bold">files.content.read</strong>).</li>
                          <li>Cliquez sur <strong className="font-bold">Submit</strong> en bas de la page.</li>
                          <li>Retournez dans <strong className="font-bold">Settings</strong>, puis cliquez sur <strong className="font-bold">Generate</strong> pour obtenir un nouveau token.</li>
                          <li>Mettez à jour le token dans les réglages de l'application (bouton engrenage ⚙️).</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

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
                            <th className="px-4 py-3.5" style={thStyle}>Catégorie matériel.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Série.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Identifiant.</th>
                            <th className="px-4 py-3.5" style={thStyle}>Technicien.</th>
                            <th className="px-4 py-3.5 text-right w-12" style={thStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700 text-xs">
                          {filteredReports.map((rep) => {
                            const isConforme = (rep.defibSnapshot?.conforme || 'Oui') === 'Oui';
                            
                            // Retrieve category name elegantly
                            const getCategoryName = (r: any) => {
                              if (r.defibSnapshot?.categorie) {
                                return r.defibSnapshot.categorie;
                              }
                              if (r.title && r.title.trim().toUpperCase().startsWith("RAPPORT TECHNIQUE - ")) {
                                const raw = r.title.trim().substring(20);
                                return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                              }
                              return "Défibrillateur";
                            };

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

                                {/* Catégorie matériel */}
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
                                    {getCategoryName(rep)}
                                  </div>
                                </td>

                                {/* Série */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  {rep.defibSnapshot?.numeroSerie && rep.defibSnapshot.numeroSerie.trim() ? (
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
                                      {rep.defibSnapshot.numeroSerie}
                                    </div>
                                  ) : null}
                                </td>

                                {/* Identifiant */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  {rep.defibIdentifiant && rep.defibIdentifiant.trim() ? (
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
                                  ) : null}
                                </td>

                                {/* Technicien */}
                                <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                  {rep.techName && rep.techName.trim() ? (
                                    <div className="font-medium text-slate-800 whitespace-nowrap" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {rep.techName}
                                    </div>
                                  ) : null}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="inline-flex gap-2">
                                    <button
                                      type="button"
                                      disabled={rep.validated || !isGmaoController}
                                      onClick={() => setEditingReportId(rep.id)}
                                      style={{
                                        ...rowActionButtonStyle,
                                        opacity: (rep.validated || !isGmaoController) ? 0.35 : 1,
                                        cursor: (rep.validated || !isGmaoController) ? 'not-allowed' : 'pointer',
                                        backgroundColor: (rep.validated || !isGmaoController) ? '#cbd5e1' : '#000000',
                                        color: (rep.validated || !isGmaoController) ? '#64748b' : '#ffffff',
                                        boxShadow: (rep.validated || !isGmaoController) ? 'none' : rowActionButtonStyle.boxShadow,
                                      }}
                                      className={`${(rep.validated || !isGmaoController) ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'}`}
                                    >
                                      Corriger
                                    </button>
                                    <button
                                      type="button"
                                      disabled={rep.validated || !isGmaoController}
                                      onClick={() => {
                                        const updatedReports = generatedReports.map(r => r.id === rep.id ? { ...r, validated: true } : r);
                                        saveReports(updatedReports);

                                        // Update "Centrale des stocks" (Volume=0, Situation=Utilisé, Commentaire=Ref intervention)
                                        const usedTraceIds = [
                                          rep.selectionElectrodeARemplacee,
                                          rep.selectionElectrodeASecoursRemplacee,
                                          rep.selectionElectrodePRemplacee,
                                          rep.selectionElectrodePSecoursRemplacee,
                                          rep.selectionBatterieRemplacee,
                                          rep.selectionKitSecoursRemplace
                                        ].filter(id => id && id !== 'Autre');

                                        if (usedTraceIds.length > 0) {
                                          const updatedStocksList = stocks.map(st => {
                                            let stChanged = false;
                                            let decrementQty = 0;
                                            const updatedTraces = (st.traceabilities || []).map(tr => {
                                              if (usedTraceIds.includes(tr.id)) {
                                                stChanged = true;
                                                if (tr.situation === 'Disponible') {
                                                  decrementQty++;
                                                }
                                                return {
                                                  ...tr,
                                                  volume: 0,
                                                  situation: 'Utilisé' as const,
                                                  comment: rep.interventionReference || 'Ref: ' + (rep.id || 'sans-id')
                                                };
                                              }
                                              return tr;
                                            });

                                            if (stChanged) {
                                              return {
                                                ...st,
                                                quantite: Math.max(0, (st.quantite || 0) - decrementQty),
                                                traceabilities: updatedTraces
                                              };
                                            }
                                            return st;
                                          });
                                          saveStocks(updatedStocksList);
                                        }

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

                                        // Upload validated intervention report to Dropbox if active
                                        setDropboxError(null);
                                        if (dropboxActive && dropboxAccessToken) {
                                          (async () => {
                                            try {
                                              const { generateReportPDF, uploadToDropbox } = await import('./utils/dropbox');
                                              const pdfBytes = generateReportPDF(rep);
                                              const ident = snap ? (snap.identifiant || rep.defibIdentifiant) : (rep.defibIdentifiant || rep.id);
                                              const fileName = `Rapport_Intervention_${ident}_${rep.date || 'sans-date'}.pdf`;
                                              await uploadToDropbox(dropboxAccessToken, fileName, pdfBytes);
                                            } catch (dropboxErr: any) {
                                              console.error("Dropbox report upload failed on validation:", dropboxErr);
                                              let cleanMsg = "Impossible d'uploader le rapport sur Dropbox, vérifiez les identifiants.";
                                              if (dropboxErr.message && (dropboxErr.message.includes("401") || dropboxErr.message.includes("expired") || dropboxErr.message.includes("invalid_access_token") || dropboxErr.message.includes("Unauthorized"))) {
                                                cleanMsg = "Erreur Dropbox 401 : Le token d'accès est invalide ou expiré (les tokens temporaires Dropbox expirent au bout de 4 heures). Veuillez générer un nouveau token d'accès dans votre console Dropbox Developer.";
                                              } else
                                              if (dropboxErr.message && dropboxErr.message.includes("missing_scope")) {
                                                cleanMsg = "Erreur Dropbox : Autorisation insuffisante. Veuillez activer la permission 'files.content.write' dans votre console Dropbox Developer, puis générez un nouveau token.";
                                              }
                                              setDropboxError(cleanMsg);
                                            }
                                          })();
                                        }

                                        alert("Le rapport d'intervention a été validé avec succès ! L'état de l'équipement a été mis à jour et un e-mail avec le rapport a été envoyé au client.");
                                      }}
                                      style={{
                                        ...rowActionButtonStyle,
                                        backgroundColor: (rep.validated || !isGmaoController) ? '#cbd5e1' : '#000000',
                                        color: (rep.validated || !isGmaoController) ? '#64748b' : '#ffffff',
                                        opacity: (rep.validated || !isGmaoController) ? 0.35 : 1,
                                        boxShadow: (rep.validated || !isGmaoController) ? 'none' : rowActionButtonStyle.boxShadow,
                                        cursor: (rep.validated || !isGmaoController) ? 'not-allowed' : 'pointer',
                                        border: 'none',
                                      }}
                                      className={`${(rep.validated || !isGmaoController) ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'}`}
                                    >
                                      {rep.validated ? 'Validé' : 'Valider'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadReport(rep)}
                                      disabled={!rep.validated}
                                      style={{
                                        ...rowActionButtonStyle,
                                        backgroundColor: !rep.validated ? '#cbd5e1' : rowActionButtonStyle.backgroundColor,
                                        color: !rep.validated ? '#64748b' : rowActionButtonStyle.color,
                                        opacity: !rep.validated ? 0.35 : 1,
                                        boxShadow: !rep.validated ? 'none' : rowActionButtonStyle.boxShadow,
                                        cursor: !rep.validated ? 'not-allowed' : 'pointer',
                                        border: 'none',
                                      }}
                                      className={!rep.validated ? "cursor-not-allowed opacity-35" : "cursor-pointer"}
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

                <HelpBubble 
                  cacheKey="help_dismissed_crm" 
                  text="Le CRM rassemble les demandes d'assistance, questions de vos clients, ou signalements. C'est ici également que vous pouvez rédiger des mémos rapides (sous forme de post-its virtuels), modifier l'état d'un ticket (« Nouveau », « En cours », « Résolu ») et répondre par e-mail directement au client concerné." 
                />

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
              const matchType =
                docTypeFilter === 'Tous' ||
                (docTypeFilter === 'Bon de commande' ? !!doc.hasBonCommande : doc.type === docTypeFilter);
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
                   #devis-tab-container-harmonized input[type="radio"] {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    width: 18px !important;
                    height: 18px !important;
                    border: 1px solid #dedede !important;
                    border-radius: 50% !important;
                    outline: none !important;
                    background-color: #ffffff !important;
                    cursor: pointer !important;
                    position: relative !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    transition: all 0.2s ease !important;
                    margin-right: 6px !important;
                  }
                  #devis-tab-container-harmonized input[type="radio"]:hover {
                    border-color: oklch(0.44 0.16 324.65) !important;
                    outline: none !important;
                  }
                  #devis-tab-container-harmonized input[type="radio"]:checked {
                    border-color: oklch(0.44 0.16 324.65) !important;
                    background-color: oklch(0.44 0.16 324.65) !important;
                    outline: none !important;
                  }
                  #devis-tab-container-harmonized input[type="radio"]:checked::after {
                    content: "" !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 8px !important;
                    height: 8px !important;
                    background-color: #ffffff !important;
                    border-radius: 50% !important;
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

                          {pennylaneActive && (
                            <button
                              onClick={handlePennylaneGlobalSync}
                              style={{
                                ...customButtonStyle,
                                backgroundColor: '#000000',
                                color: '#ffffff',
                              }}
                              className="font-sans"
                            >
                              {t("Synchroniser")}
                            </button>
                          )}

                          <button 
                            onClick={startNewDoc}
                            style={customButtonStyle}
                            className="font-sans"
                          >
                            {t("Nouveau")}
                          </button>
                        </div>
                      </div>
                    </div>

                    {pennylaneAlertMessage && (
                      <div 
                        style={{
                          color: pennylaneAlertStyle === 'error' ? '#ef4444' : '#10b981',
                          fontSize: '18px',
                          fontWeight: 100,
                          textAlign: 'left',
                          marginTop: '16px',
                          marginBottom: '16px',
                          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
                        }}
                      >
                        {pennylaneAlertMessage}
                      </div>
                    )}

                    <HelpBubble 
                      cacheKey="help_dismissed_devis" 
                      text="Bon à savoir : lorsqu’un technicien enregistre un rapport d’intervention, il peut cocher l’option d’émettre une facture, alors Défibeo reprend les pièces utilisées et génère une facture brouillon que vous pouvez ensuite venir ajuster. Vous avez généré un devis et souhaitez le transformer en facture ? Cliquez sur le bouton Transformer pour la ligne en question." 
                    />

                    {/* Filters Pills Row */}
                    <div className="px-4 flex flex-wrap gap-2.5 justify-center sm:justify-start pt-5" id="devis-type-pills">
                      {(['Tous', 'Devis', 'Facture', 'Bon de commande'] as const).map((filterOpt) => {
                        let count = 0;
                        if (filterOpt === 'Tous') {
                          count = commercialDocs.length;
                        } else if (filterOpt === 'Bon de commande') {
                          count = commercialDocs.filter(d => d.hasBonCommande).length;
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
                            {t(filterOpt)} ({count})
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
                              {t("Aucun résultat.")}
                            </p>
                          </div>
                        ) : (
                          <table className="w-full text-left font-sans border-collapse text-xs" id="devis-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
                            <thead>
                              <tr className="bg-transparent">
                                <th className="px-4 py-3.5" style={thStyle}>{t("Référence.")}</th>
                                <th className="px-4 py-3.5" style={thStyle}>{t("Client.")}</th>
                                <th className="px-4 py-3.5" style={thStyle}>{t("Membre attribué.")}</th>
                                <th className="px-4 py-3.5" style={thStyle}>{t("Objet ou commentaire.")}</th>
                                <th className="px-4 py-3.5" style={thStyle}>{t("Total HT.")}</th>
                                <th className="px-4 py-3.5" style={thStyle}>{t("Date.")}</th>
                                <th className="px-4 py-3.5 text-center w-28" style={thStyle}>{t("Situation.")}</th>
                                <th className="px-4 py-3.5 text-center" style={{ ...thStyle, whiteSpace: 'nowrap' }}>{t("Réf. Bon Comm.")}</th>
                                <th className="px-4 py-3.5 text-right w-12" style={thStyle}>{t("Actions.")}</th>
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
                                  <tr
                                    key={doc.id}
                                    className="group hover:bg-[#ffecf8] transition-all cursor-pointer"
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).closest('button, a, input, select, option')) return;
                                      startEditDoc(doc);
                                    }}
                                  >
                                    {/* Référence */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.ref}
                                    </td>

                                    {/* Client */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {clientDisplay}
                                    </td>

                                    {/* Membre attribué. */}
                                    <td className="px-4 py-5 whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.assignedMemberName || ''}
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
                                        {t(doc.status)}
                                      </span>
                                    </td>

                                    {/* Réf. Bon Comm. */}
                                    <td className="px-4 py-5 text-center whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                                      {doc.hasBonCommande ? (doc.bonCommandeReference || '') : ''}
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
                                          {t("Télécharger")}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={!doc.hasBonCommande}
                                          onClick={() => handleDownloadBonCommande(doc)}
                                          style={{
                                            ...rowActionButton18Style,
                                            opacity: doc.hasBonCommande ? 1 : 0.35,
                                            cursor: doc.hasBonCommande ? 'pointer' : 'not-allowed',
                                          }}
                                          className="font-sans"
                                          title={doc.hasBonCommande ? t("Bon de commande: ") + doc.bonCommandeReference : t("Aucun bon de commande pour cette pièce")}
                                        >
                                          {t("Bon de commande")}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleTransformDoc(doc)}
                                          style={rowActionButton18Style}
                                          className="cursor-pointer font-sans"
                                        >
                                          {t("Transformer")}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => startEditDoc(doc)}
                                          style={rowActionButton18Style}
                                          className="cursor-pointer font-sans"
                                        >
                                          {t("Modifier")}
                                        </button>
                                        {pennylaneActive && doc.type === 'Facture' && doc.status === 'Accepté' && (
                                          <button
                                            type="button"
                                            onClick={() => triggerPennylaneSync(doc)}
                                            style={{
                                              ...rowActionButton18Style,
                                              backgroundColor: '#000000',
                                              color: '#ffffff',
                                              border: 'none',
                                            }}
                                            className="cursor-pointer font-sans shadow-md"
                                          >
                                            {t("Pennylane Sync")}
                                          </button>
                                        )}
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
                          {editingDocId ? t('Modification pièce comptable') : t('Nouvelle pièce comptable')}
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
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              setDocClientId(selectedId);
                              const matchedClient = clients.find(c => c.id === selectedId);
                              if (matchedClient) {
                                if (matchedClient.payeurId) {
                                  setDocPayeurId(matchedClient.payeurId);
                                }
                                if (matchedClient.clientIdField) {
                                  setDocClientIdField(matchedClient.clientIdField);
                                }
                              }
                            }}
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
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Émission.")}</label>
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
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Situation.")}</label>
                          <select
                            value={docStatus}
                            onChange={(e) => setDocStatus(e.target.value as any)}
                            placeholder="QQQQ"
                            className="focus:outline-none"
                            required
                          >
                            <option value="Brouillon">{t("Brouillon")}</option>
                            <option value="Terminé">{t("Terminé")}</option>
                            <option value="Accepté">{t("Accepté")}</option>
                            <option value="Refusé">{t("Refusé")}</option>
                            <option value="Annulé">{t("Annulé")}</option>
                            <option value="Supprimé">{t("Supprimé")}</option>
                          </select>
                        </div>

                        {/* Remarque */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Remarque.")}</label>
                          <input
                            type="text"
                            value={docCommentaire}
                            onChange={(e) => setDocCommentaire(e.target.value)}
                            placeholder={t("Entrez une remarque.")}
                            className="focus:outline-none w-full animate-fadeIn"
                          />
                        </div>

                        {/* Code Taxe */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Code Taxe.")}</label>
                          <input
                            type="text"
                            value={docCodeTaxe}
                            onChange={(e) => setDocCodeTaxe(e.target.value)}
                            placeholder={t("Code Taxe.")}
                            className="focus:outline-none w-full"
                          />
                        </div>

                        {/* Payeur ID */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Payeur ID.")}</label>
                          <input
                            type="text"
                            value={docPayeurId}
                            onChange={(e) => setDocPayeurId(e.target.value)}
                            placeholder={t("Payeur ID.")}
                            className="focus:outline-none w-full"
                          />
                        </div>

                        {/* Client ID */}
                        <div className="flex flex-col gap-1 bg-white">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Client ID.")}</label>
                          <input
                            type="text"
                            value={docClientIdField}
                            onChange={(e) => setDocClientIdField(e.target.value)}
                            placeholder={t("Client ID.")}
                            className="focus:outline-none w-full"
                          />
                        </div>

                      </div>

                      {/* Add spare parts (Lookup in variables) Container */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-transparent space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-transparent">
                          
                          {/* Lookup Piece */}
                          <div className="flex flex-col gap-1 bg-transparent md:col-span-5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Pièce ou service.")}</label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (docClientId && docItems.length > 0) {
                                    handleSaveDoc({ preventDefault: () => {} } as any);
                                  } else {
                                    setIsDocFormOpen(false);
                                    setEditingDocId(null);
                                  }
                                  setActiveTab('variables', true);
                                }}
                                className="text-[16px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer normal-case no-underline hover:no-underline"
                                style={{ textDecoration: 'none' }}
                              >
                                Nouvelle variable
                              </button>
                            </div>
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
                              <option value="">{t("Sélection d'une pièce ou service.")}</option>
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Tarif de vente. (€)")}</label>
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Quantité.")}</label>
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
                              {t("Ajouter")}
                            </button>
                          </div>

                        </div>

                        {/* Added items list */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {docItems.length === 0 ? (
                            <div style={itemValueStyle} className="p-6 text-center bg-white">
                              {t("Aucune ligne ajoutée.")}
                            </div>
                          ) : (
                             <table className="w-full text-left text-xs border-collapse font-sans bg-white">
                              <thead>
                                <tr className="bg-transparent">
                                  <th className="px-4 py-3" style={thStyle}>{t("UGS.")}</th>
                                  <th className="px-4 py-3" style={thStyle}>{t("Pièce.")}</th>
                                  <th className="px-4 py-3 text-right" style={thStyle}>{t("Unité HT. (€)")}</th>
                                  <th className="px-4 py-3 text-center w-24" style={thStyle}>{t("Volume.")}</th>
                                  <th className="px-4 py-3 text-right w-32" style={thStyle}>{t("Total HT. (€)")}</th>
                                  <th className="px-4 py-3 text-right w-24" style={thStyle}>{t("Action.")}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                                {docItems.map((item, idx) => {
                                  const itemUgs = item.ugs || stocks.find(s => s.denominationPieceId === item.variableId)?.ugs || '—';
                                  return (
                                    <tr key={idx} className="bg-white font-sans">
                                      <td className="px-4 py-3.5 font-mono text-xs" style={itemValueStyle}>{itemUgs}</td>
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
                                          {t("Supprimer")}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Calculated values summary */}
                        {docItems.length > 0 && (
                          <div className="flex justify-end pr-1 pt-2 bg-transparent">
                            <div className="w-80 border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
                              <div className="flex justify-between items-center bg-white">
                                <span style={itemValueStyle}>{t("Total HT. (€)")}</span>
                                <span style={itemValueStyle}>
                                  {docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0).toFixed(2)}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white">
                                <span style={itemValueStyle}>{t("Total TVA. (€)")}</span>
                                <span style={itemValueStyle}>
                                  {(docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0) * 0.2).toFixed(2)}€
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-white">
                                <span style={{ ...itemValueStyle, fontWeight: 'bold' }}>{t("Total TTC. (€)")}</span>
                                <span style={{ ...itemValueStyle, fontWeight: 'bold' }}>
                                  {(docItems.reduce((acc, it) => acc + (it.prixVenteHt * it.quantite), 0) * 1.2).toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Textarea Commentaires. */}
                        <div className="flex flex-col gap-1 bg-white mt-4">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Commentaires.")}</label>
                          <textarea
                            value={docCommentaires}
                            onChange={(e) => setDocCommentaires(e.target.value)}
                            placeholder={t("Entrez les commentaires...")}
                            className="focus:outline-none w-full p-3 border border-slate-200 rounded-xl min-h-[100px]"
                          />
                        </div>

                      </div>

                      {/* Section Bon de commande */}
                      {docStatus !== 'Brouillon' && (
                        <div className="border border-slate-200 rounded-2xl p-5 bg-transparent space-y-4 mt-6">
                          
                          <div className="flex flex-col gap-2 bg-transparent">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">
                              {t("Créer un bon de commande ?")}
                            </span>
                            <div className="flex gap-4 mt-1 bg-transparent">
                              <button
                                type="button"
                                onClick={() => {
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
                                className="inline-flex items-center cursor-pointer gap-2 select-none font-sans bg-transparent"
                                style={{ fontSize: '16px', color: '#000000', border: 'none', padding: 0 }}
                              >
                                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${docHasBonCommande === true ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'}`}>
                                  {docHasBonCommande === true && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                                </span>
                                {t("Oui")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDocHasBonCommande(false)}
                                className="inline-flex items-center cursor-pointer gap-2 select-none font-sans bg-transparent"
                                style={{ fontSize: '16px', color: '#000000', border: 'none', padding: 0 }}
                              >
                                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${docHasBonCommande === false ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'}`}>
                                  {docHasBonCommande === false && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                                </span>
                                {t("Non")}
                              </button>
                            </div>
                          </div>

                          {docHasBonCommande && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 bg-transparent animate-fadeIn">
                              {/* Entête BC. */}
                              <div className="flex flex-col gap-1 bg-white col-span-1 md:col-span-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Entête BC.")}</label>
                                <input
                                  type="text"
                                  value={docBonCommandeEntete}
                                  onChange={(e) => setDocBonCommandeEntete(e.target.value)}
                                  placeholder={t("Entrez l'entête du bon de commande.")}
                                  className="focus:outline-none w-full animate-fadeIn"
                                />
                              </div>

                              {/* Référence */}
                              <div className="flex flex-col gap-1 bg-white">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Référence BC.")}</label>
                                <input
                                  type="text"
                                  value={docBonCommandeReference}
                                  disabled
                                  className="focus:outline-none bg-slate-50 font-mono text-xs cursor-not-allowed"
                                  placeholder={t("Générée automatiquement...")}
                                />
                              </div>

                              {/* Livraison Radio buttons */}
                              <div className="flex flex-col gap-1 bg-white">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Livraison BC.")}</label>
                                <div className="flex gap-4 mt-2 bg-transparent">
                                  <button
                                    type="button"
                                    onClick={() => setDocBonCommandeLivraison('Intervention')}
                                    className="inline-flex items-center cursor-pointer gap-2 select-none font-sans bg-transparent"
                                    style={{ fontSize: '16px', color: '#000000', border: 'none', padding: 0 }}
                                  >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${docBonCommandeLivraison === 'Intervention' ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'}`}>
                                      {docBonCommandeLivraison === 'Intervention' && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                                    </span>
                                    {t("Intervention")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDocBonCommandeLivraison('Transporteur')}
                                    className="inline-flex items-center cursor-pointer gap-2 select-none font-sans bg-transparent"
                                    style={{ fontSize: '16px', color: '#000000', border: 'none', padding: 0 }}
                                  >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${docBonCommandeLivraison === 'Transporteur' ? 'border-[#fe4eba]' : 'border-slate-300 bg-white'}`}>
                                      {docBonCommandeLivraison === 'Transporteur' && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
                                    </span>
                                    {t("Transporteur")}
                                  </button>
                                </div>
                              </div>

                              {/* Situation */}
                              <div className="flex flex-col gap-1 bg-white">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider devis-label-style">{t("Situation BC.")}</label>
                                <select
                                  value={docBonCommandeSituation}
                                  onChange={(e) => setDocBonCommandeSituation(e.target.value as any)}
                                  className="focus:outline-none"
                                  required
                                >
                                  <option value="Ouvert">{t("Ouvert")}</option>
                                  <option value="Envoyé Terminé">{t("Envoyé Terminé")}</option>
                                  <option value="Envoyé Logistique">{t("Envoyé Logistique")}</option>
                                  <option value="Terminé">{t("Terminé")}</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

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
              achatsFournisseurs={achatsFournisseurs}
              setActiveTab={setActiveTab}
              members={members}
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
              saveStocks={saveStocks}
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
          {/* RELEVÉS DE VEILLE MODULE */}
          {/* ======================================= */}
          {activeTab === 'veilles' && (
            <VeillesTab
              veilles={veilles}
              onDeleteVeille={(id) => {
                if (confirm("Voulez-vous vraiment supprimer ce relevé de veille ?")) {
                  const updated = veilles.filter((v) => v.id !== id);
                  saveVeilles(updated);
                }
              }}
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

          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              onUpdateNotifications={saveNotifications}
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
              onUpdateOtherEquipments={handleUpdateOtherEquipments}
              otherEquipments={otherEquipments}
              onClearOtherEquipments={() => saveOtherEquipments([])}
              onConnectorsUpdated={loadApiConnectors}
              onUpdateLocationNames={setLocationNames}
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
              setActiveTab={setActiveTab}
              dropboxActive={dropboxActive}
              dropboxAccessToken={dropboxAccessToken}
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
        onUpdateOtherEquipments={handleUpdateOtherEquipments}
        otherEquipments={otherEquipments}
        onClearOtherEquipments={() => saveOtherEquipments([])}
        onConnectorsUpdated={loadApiConnectors}
        onUpdateLocationNames={setLocationNames}
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
