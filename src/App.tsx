import React, { useState, useEffect, useRef } from 'react';
import { fetchCollectionFromFirestore, saveCollectionToFirestore, setTenantId as setFirebaseTenantId } from './firebase';
import { Client, Variable, Defibrillateur, SupportTicket, Member, CompanyInfo, PointageLog, StockRecord, CommercialDoc, CommercialDocItem, GedDocument } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_VARIABLES,
  INITIAL_DEFIBRILLATEURS,
} from './utils';
import {
  triggerEmail4Signalement,
  triggerEmail5AvisageFSM,
  triggerEmail7CrmReply,
  triggerEmail8NouvelleTourneeTech
} from './utils/emailService';

import DefibTab from './components/DefibTab';
import ClientTab from './components/ClientTab';
import VariableTab from './components/VariableTab';
import SettingsModal from './components/SettingsModal';
import StatsModal from './components/StatsModal';
import PublicPortal from './components/PublicPortal';
import ClientPortal from './components/ClientPortal';
import Login from './components/Login';
import StocksTab from './components/StocksTab';
import GedTab from './components/GedTab';
import TicketsCaisseTab from './components/TicketsCaisseTab';
import TempsTab from './components/TempsTab';
import LocalisationsTab from './components/LocalisationsTab';
import SatisfactionTab from './components/SatisfactionTab';
import GmaoCorrectionForm from './components/GmaoCorrectionForm';
import ImportExportTab from './components/ImportExportTab';

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
  ChevronDown
} from 'lucide-react';

export type AppTab = 
  | 'defibrillateurs'
  | 'clients'
  | 'variables'
  | 'fsm'
  | 'gmao'
  | 'crm'
  | 'devis'
  | 'stocks'
  | 'ged'
  | 'tickets'
  | 'temps'
  | 'localisations'
  | 'satisfaction'
  | 'statistiques'
  | 'parametres'
  | 'import-export';

export default function App() {
  // Database States (declared at top of component to be in scope for handlers)
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState<boolean>(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Authentication & Session States
  const [tenantId, setTenantIdState] = useState<string>(() => {
    return localStorage.getItem('defib_tenant_id') || 'demo';
  });

  const loadedTenantIdRef = useRef<string>('');

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('defib_admin_logged_in') === 'true');
  const [loggedUser, setLoggedUser] = useState<{ email: string; name: string } | null>(() => {
    const saved = localStorage.getItem('defib_admin_logged_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showEnvLoading, setShowEnvLoading] = useState<boolean>(false);

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

    const emailLower = email.trim().toLowerCase();
    const matchedClient = clients.find(c => c.email && c.email.trim().toLowerCase() === emailLower);

    // Active environment loading screen for admin login (not technician and not client)
    if (emailLower !== 'tech.ouest@defibeo.com' && roleToSet !== 'technicien' && !matchedClient && emailLower !== 'client@demo.com') {
      setShowEnvLoading(true);
      setTimeout(() => {
        setShowEnvLoading(false);
      }, 5000);
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
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [fsmOpenPieceDropdownId, setFsmOpenPieceDropdownId] = useState<string | null>(null);
  const [fsmPieceSearch, setFsmPieceSearch] = useState('');
  const [fsmSearchQuery, setFsmSearchQuery] = useState('');
  const [gmaoSearchQuery, setGmaoSearchQuery] = useState('');
  const [fsmDateFilter, setFsmDateFilter] = useState<string>('Tous');
  const [fsmTourDrafts, setFsmTourDrafts] = useState<Record<string, any>>({});

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
        }
      ] : [];
      setStocks(defaultStocks);
      localStorage.setItem(key, JSON.stringify(defaultStocks));
    }
  }, [activeTab, tenantId]);

  const saveStocks = (updated: StockRecord[]) => {
    setStocks(updated);
    localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(updated));
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
  const [activeUser, setActiveUser] = useState<Member | null>(null);
  const [pointages, setPointages] = useState<PointageLog[]>([]);
  const [commercialDocs, setCommercialDocs] = useState<CommercialDoc[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isDocFormOpen, setIsDocFormOpen] = useState(false);

  const [docType, setDocType] = useState<'Devis' | 'Facture' | 'Proforma'>('Devis');
  const [docRef, setDocRef] = useState('');
  const [docClientId, setDocClientId] = useState('');
  const [docDateStr, setDocDateStr] = useState('');
  const [docStatus, setDocStatus] = useState<'Brouillon' | 'Terminé' | 'Accepté' | 'Refusé'>('Brouillon');
  const [docItems, setDocItems] = useState<CommercialDocItem[]>([]);
  const [docCommentaire, setDocCommentaire] = useState('');

  const [selectedDocPieceId, setSelectedDocPieceId] = useState('');
  const [customDocPiecePrice, setCustomDocPiecePrice] = useState(0);
  const [customDocPieceQty, setCustomDocPieceQty] = useState(1);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'Tous' | 'Devis' | 'Facture'>('Tous');

  const [customerReviews, setCustomerReviews] = useState<any[]>([]);

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
    localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(updated));
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
  };

  const addFsmTour = () => {
    const newId = 'fsm-tour-' + Date.now();
    setFsmTourDrafts(prev => ({
      ...prev,
      [newId]: {
        title: '',
        techName: ''
      }
    }));
    const newTour = {
      id: newId,
      title: '',
      techName: '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'Brouillon',
      missions: []
    };
    saveFsmTours([newTour, ...fsmTours]);
  };

  const deleteFsmTour = (tourId: string) => {
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
        toursMissions.forEach((m: any) => {
          const defibId = m.defibIdentifiant;
          const defib = defibrillateurs.find(df => df.identifiant === defibId);
          if (defib) {
            const matchingClient = clients.find(c => c.id === defib.clientId);
            const clientEmail = defib.emailSite || matchingClient?.email || matchingClient?.emailSite;
            if (clientEmail && clientEmail.trim()) {
              triggerEmail5AvisageFSM(
                clientEmail.trim(),
                defibId,
                companyName,
                companyEmail,
                formattedDate || 'prochainement'
              ).catch(e => console.error("Error sending Email 5:", e));
            }
          }
        });
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
    saveFsmTours(fsmTours.map(t => {
      if (t.id === tourId) {
        return { ...t, missions: t.missions.filter(m => m.id !== missionId) };
      }
      return t;
    }));
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

  const handleCorrectReport = (id: string, updatedFields: Partial<any>) => {
    const updated = generatedReports.map(rep => rep.id === id ? { ...rep, ...updatedFields } : rep);
    saveReports(updated);
  };

  const savePointages = (updated: PointageLog[]) => {
    setPointages(updated);
    localStorage.setItem('defib_pointages_history', JSON.stringify(updated));
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
          fReports, fTours
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
          fetchCollectionFromFirestore<any[]>('fsmTours')
        ]);

        // Handlers to apply state or write if empty
        if (fClients !== null) {
          setClients(fClients);
          localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(fClients));
        } else {
          const defaultVal = tenantId === 'demo' ? INITIAL_CLIENTS : [];
          setClients(defaultVal);
          await saveCollectionToFirestore('clients', defaultVal);
          localStorage.setItem(`defib_${tenantId}_clients`, JSON.stringify(defaultVal));
        }

        if (fVariables !== null) {
          // If this is a custom tenant and they have exactly the template's custom list initialized previously,
          // instantly clean it up to keep their private workspace clean of seed choices
          if (tenantId !== 'demo' && fVariables.length === INITIAL_VARIABLES.length && fVariables[0]?.id === 'v_def_1') {
            setVariables([]);
            await saveCollectionToFirestore('variables', []);
            localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify([]));
          } else {
            setVariables(fVariables);
            localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(fVariables));
          }
        } else {
          const defaultVal = tenantId === 'demo' ? INITIAL_VARIABLES : [];
          setVariables(defaultVal);
          await saveCollectionToFirestore('variables', defaultVal);
          localStorage.setItem(`defib_${tenantId}_variables`, JSON.stringify(defaultVal));
        }

        if (fDefibrillateurs !== null) {
          setDefibrillateurs(fDefibrillateurs);
          localStorage.setItem(`defib_${tenantId}_defibrillateurs`, JSON.stringify(fDefibrillateurs));
        } else {
          const defaultVal = tenantId === 'demo' ? INITIAL_DEFIBRILLATEURS : [];
          setDefibrillateurs(defaultVal);
          await saveCollectionToFirestore('defibrillateurs', defaultVal);
          localStorage.setItem(`defib_${tenantId}_defibrillateurs`, JSON.stringify(defaultVal));
        }

        if (fCompanyInfo !== null) {
          setCompanyInfo(fCompanyInfo);
          localStorage.setItem(`defib_${tenantId}_company_info`, JSON.stringify(fCompanyInfo));
        } else {
          const defaultInfo = {
            name: "Défibeo Solutions",
            logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&auto=format&fit=crop",
            website: "29382302.defibeo.com",
            email: "contact@defibeo-solutions.com",
            phone: "+33 1 47 20 00 01"
          };
          setCompanyInfo(defaultInfo);
          await saveCollectionToFirestore('companyInfo', defaultInfo);
          localStorage.setItem(`defib_${tenantId}_company_info`, JSON.stringify(defaultInfo));
        }

        if (fMembers !== null) {
          setMembers(fMembers);
          localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(fMembers));
        } else {
          const defaultMembers = [
            { name: 'Ronan Roesch', role: 'Propriétaire / Admin', email: 'roesch.ronan@gmail.com', status: 'Actif', lastActive: 'En ligne', pin: '1234' },
            { name: 'Technicien Ouest', role: 'Maintenance Terrain', email: 'tech.ouest@defibeo.com', status: 'Actif', lastActive: 'Il y a 10 min', pin: '4321' },
            { name: 'Secrétariat Clientèle', role: 'Support & Contrats', email: 'support@defibeo.com', status: 'Inactif', lastActive: 'Hier', pin: '0000' },
          ];
          setMembers(defaultMembers);
          await saveCollectionToFirestore('members', defaultMembers);
          localStorage.setItem(`defib_${tenantId}_members`, JSON.stringify(defaultMembers));
        }

        if (fTickets !== null) {
          setTickets(fTickets);
          localStorage.setItem(`defib_${tenantId}_support_tickets`, JSON.stringify(fTickets));
        } else {
          const defaultTickets = tenantId === 'demo' ? [
            { id: '#128394', identifiant: 'PAR-102', objet: 'Défibrillateur utilisé', message: 'Nous avons déployé notre DAE hier soir lors du malaise d\'un client à l\'accueil. L\'appareil nous a bien guidé, mais le lot d\'électrodes est maintenant à remplacer.', email: 'securite@hotel-paris.com', phone: '01 42 27 00 12', date: '02/06/2026', status: 'Nouveau' },
            { id: '#495729', identifiant: 'NTS-203', objet: 'Défibrillateur hors service', message: 'Le boîtier extérieur émet un bip sonore continu et le voyant rouge clignote. Le diagnostic affiche Battery Low.', email: 'mairie@nantes-mairie.fr', phone: '02 40 12 34 56', date: '28/05/2026', status: 'En cours' },
            { id: '#889403', identifiant: 'TLS-401', objet: 'Autre', message: 'Demande d\'ajout d\'un kit de signalétique murale DAE pour notre nouveau garage souterrain.', email: 'logistique@tls-corporate.com', phone: '05 61 77 88 99', date: '25/05/2026', status: 'Résolu' }
          ] : [];
          setTickets(defaultTickets);
          await saveCollectionToFirestore('tickets', defaultTickets);
          localStorage.setItem(`defib_${tenantId}_support_tickets`, JSON.stringify(defaultTickets));
        }

        if (fDocs !== null) {
          setCommercialDocs(fDocs);
          localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(fDocs));
        } else {
          const defaultDocs = tenantId === 'demo' ? [
            { id: 'doc-1', ref: 'DEV-2026-0419', type: 'Devis', clientId: 'c1', clientDenomination: 'Secours Pro Ouest', items: [{ variableId: 'v_el_1', nomPiece: 'Électrodes Adultes SMART II (Philips)', prixVenteHt: 89, quantite: 6 }, { variableId: 'v_bat_1', nomPiece: 'Batterie Lithium-Manganèse FRx', prixVenteHt: 199, quantite: 1 }], totalHt: 733, status: 'Brouillon', dateStr: '2026-04-19' },
            { id: 'doc-2', ref: 'PRO-2026-0038', type: 'Proforma', clientId: 'c2', clientDenomination: "Clinique de l'Erdre", items: [{ variableId: 'v_cof_2', nomPiece: 'Aivia 200 (Extérieur, chauffé, alarmé)', prixVenteHt: 640, quantite: 1 }], totalHt: 640, status: 'Accepté', dateStr: '2026-05-15' }
          ] : [];
          setCommercialDocs(defaultDocs);
          await saveCollectionToFirestore('commercialDocs', defaultDocs);
          localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(defaultDocs));
        }

        if (fGed !== null) {
          setGedDocs(fGed);
          localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(fGed));
        } else {
          const defaultGed = tenantId === 'demo' ? [
            { id: 'ged-1', title: 'Notice d\'utilisation Lifeline AED', category: 'Manuel de conformité', fileName: 'Notice_Utilisation_Lifeline_AED.pdf', fileSize: '4.2 Mo', dateStr: '2026-02-12' },
            { id: 'ged-2', title: 'Réglementation Nationale Code de la Santé', category: 'Manuel de conformité', fileName: 'Reglementation_Nationale_Code_Sante.pdf', fileSize: '1.1 Mo', dateStr: '2026-01-01' },
            { id: 'ged-3', title: 'PV Maintenance Bordeaux - EVB-411', category: "Fiche de visite d'audit", fileName: 'PV_Maintenance_Bordeaux_EVB-411.pdf', fileSize: '890 Ko', dateStr: '2026-06-06' },
            { id: 'ged-4', title: 'Fiche Technique Mise en Service Nantes', category: "Fiche de visite d'audit", fileName: 'Fiche_Technique_Mise_Service_Nantes.pdf', fileSize: '3.1 Mo', dateStr: '2026-06-04' }
          ] : [];
          setGedDocs(defaultGed);
          await saveCollectionToFirestore('gedDocs', defaultGed);
          localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(defaultGed));
        }

        if (fStocks !== null) {
          setStocks(fStocks);
          localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(fStocks));
        } else {
          const defaultStocks = tenantId === 'demo' ? [
            { id: 'st_1', denominationPieceId: 'v_el_1', quantite: 45, livraisonDate: '2026-04-12', reapprovisionnementDate: '2026-06-15', valeurAchat: 45, marge: 44, prixVenteHt: 89, stockage: 'Entrepôt A' },
            { id: 'st_2', denominationPieceId: 'v_bat_1', quantite: 28, livraisonDate: '2026-05-18', reapprovisionnementDate: '2026-06-30', valeurAchat: 95, marge: 104, prixVenteHt: 199, stockage: 'Entrepôt A' },
            { id: 'st_3', denominationPieceId: 'v_cof_1', quantite: 12, livraisonDate: '2026-05-20', reapprovisionnementDate: '2026-07-05', valeurAchat: 140, marge: 145, prixVenteHt: 285, stockage: 'Entrepôt B' },
            { id: 'st_4', denominationPieceId: 'v_cof_2', quantite: 8, livraisonDate: '2026-05-22', reapprovisionnementDate: '2026-07-10', valeurAchat: 310, marge: 330, prixVenteHt: 640, stockage: 'Entrepôt B' }
          ] : [];
          setStocks(defaultStocks);
          await saveCollectionToFirestore('stocks', defaultStocks);
          localStorage.setItem(`defib_${tenantId}_stocks`, JSON.stringify(defaultStocks));
        }

        if (fReviews !== null) {
          setCustomerReviews(fReviews);
          localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(fReviews));
        } else {
          const defaultReviews = tenantId === 'demo' ? [
            { id: 'rev-1', clientName: 'Secours Pro Ouest (Jean-Marc DUPONT)', comment: "Excellent travail ! Le technicien Thierry a été très soigné et a remplacé les piles rapidement en expliquant le fonctionnement du boîtier thermique.", label: 'Excellent' },
            { id: 'rev-2', clientName: 'Espace Vert Bordeaux (Marc VIGNAL)', comment: "L'intervention s'est déroulée à l'heure convenue. Explications claires et professionnalisme au rendez-vous. Matériel de rechange disponible immédiatement.", label: 'Parfait' },
            { id: 'rev-3', clientName: 'Gymnase Jean Bouin (Stéphanie LEFEVRE)', comment: "Remplacement de l'appareil effectué comme prévu. Cependant, l'un des autocollants signalétiques était légèrement corné.", label: 'Moyen' },
            { id: 'rev-4', clientName: 'Hôtel Splendid Nantes', comment: "Le technicien a oublié de nous laisser le document papier de visite, bien que nous l'ayons reçu par e-mail peu après.", label: 'Décevant' },
            { id: 'rev-5', clientName: 'Camping des Pins', comment: "Délai de passage non respecté deux fois de suite, aucune notification de retard reçue. Nous attendons un geste commercial.", label: 'Médiocre' }
          ] : [];
          setCustomerReviews(defaultReviews);
          await saveCollectionToFirestore('customerReviews', defaultReviews);
          localStorage.setItem(`defib_${tenantId}_customer_reviews`, JSON.stringify(defaultReviews));
        }

        if (fPointages !== null) {
          setPointages(fPointages);
          localStorage.setItem(`defib_${tenantId}_pointages_history`, JSON.stringify(fPointages));
        } else {
          setPointages([]);
          await saveCollectionToFirestore('pointages', []);
          localStorage.setItem(`defib_${tenantId}_pointages_history`, JSON.stringify([]));
        }

        if (fExpenses !== null) {
          setExpenses(fExpenses);
          localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(fExpenses));
        } else {
          const defaultExpenses = tenantId === 'demo' ? [
            { id: 'exp-1', techName: 'Thierry Martin', title: 'Abonnement Parking Nantes', amountTtc: 18.20, amountHt: 15.17, amountTva: 3.03, dateStr: '2026-06-02', photoUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=100&auto=format&fit=crop' },
            { id: 'exp-2', techName: 'Marc VIGNAL', title: 'Achat consommables - Électrodes Lot A3', amountTtc: 220.00, amountHt: 183.33, amountTva: 36.67, dateStr: '2026-06-03', photoUrl: '' },
            { id: 'exp-3', techName: 'Thierry LEFEBVRE', title: 'Batteries Spécifiques Type B2 (x2)', amountTtc: 2550.00, amountHt: 2125.00, amountTva: 425.00, dateStr: '2026-06-01', photoUrl: '' }
          ] : [];
          setExpenses(defaultExpenses);
          await saveCollectionToFirestore('expenses', defaultExpenses);
          localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(defaultExpenses));
        }

        if (fReports !== null) {
          setGeneratedReports(fReports);
          localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(fReports));
        } else {
          const defaultReports = tenantId === 'demo' ? [
            { id: 'rep-1', date: '02-06-2026 14:15', techName: 'Thierry Martin', defibId: 'df_1', defibIdentifiant: 'PAR-101', title: 'CONSTAT DE MAINTENANCE DÉFIBRILLATEUR', siteMission: 'DÉPLACEMENT', photoUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=100&auto=format&fit=crop' }
          ] : [];
          setGeneratedReports(defaultReports);
          await saveCollectionToFirestore('generatedReports', defaultReports);
          localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(defaultReports));
        }

        if (fTours !== null) {
          setFsmTours(fTours);
          localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(fTours));
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
          setFsmTours(defaultTours);
          await saveCollectionToFirestore('fsmTours', defaultTours);
          localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(defaultTours));
        }

        setIsFirebaseLoaded(true);
        loadedTenantIdRef.current = tenantId;
      } catch (err) {
        console.error('Firestore loading failed, falling back to offline localStorage:', err);
        // Fallback loading from local storage
        const savedClients = localStorage.getItem(`defib_${tenantId}_clients`);
        if (savedClients) setClients(JSON.parse(savedClients));
        else setClients(tenantId === 'demo' ? INITIAL_CLIENTS : []);

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

        const savedCommercialDocs = localStorage.getItem(`defib_${tenantId}_commercial_docs`);
        if (savedCommercialDocs) setCommercialDocs(JSON.parse(savedCommercialDocs));

        const savedGedDocs = localStorage.getItem(`defib_${tenantId}_ged_docs`);
        if (savedGedDocs) setGedDocs(JSON.parse(savedGedDocs));

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
      localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(gedDocs));
    }
  }, [gedDocs, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('expenses', expenses);
      localStorage.setItem(`defib_${tenantId}_expenses`, JSON.stringify(expenses));
    }
  }, [expenses, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('generatedReports', generatedReports);
      localStorage.setItem(`defib_${tenantId}_generated_reports`, JSON.stringify(generatedReports));
    }
  }, [generatedReports, isFirebaseLoaded, tenantId]);

  useEffect(() => {
    if (isFirebaseLoaded && tenantId === loadedTenantIdRef.current) {
      saveCollectionToFirestore('fsmTours', fsmTours);
      localStorage.setItem(`defib_${tenantId}_fsm_tours`, JSON.stringify(fsmTours));
    }
  }, [fsmTours, isFirebaseLoaded, tenantId]);

  const saveGedDocs = (newGed: GedDocument[]) => {
    setGedDocs(newGed);
    localStorage.setItem(`defib_${tenantId}_ged_docs`, JSON.stringify(newGed));
  };


  const saveCommercialDocs = (newDocs: CommercialDoc[]) => {
    setCommercialDocs(newDocs);
    localStorage.setItem(`defib_${tenantId}_commercial_docs`, JSON.stringify(newDocs));
  };

  const getSellingPriceForVariable = (varId: string): number => {
    const matchedStock = stocks.find(s => s.denominationPieceId === varId);
    return matchedStock ? matchedStock.prixVenteHt : 45.00;
  };

  useEffect(() => {
    if (!editingDocId && isDocFormOpen) {
      const prefix = docType === 'Devis' ? 'DEV' : docType === 'Facture' ? 'FAC' : 'PRO';
      const randNum = Math.floor(100 + Math.random() * 900);
      const generatedRef = `${prefix}-2026-${String(commercialDocs.filter(d => d.type === docType).length + 1).padStart(2, '0')}${randNum}`;
      setDocRef(generatedRef);
    }
  }, [docType, isDocFormOpen, editingDocId, commercialDocs]);

  const handleDownloadDoc = (doc: CommercialDoc) => {
    const totalTva = doc.totalHt * 0.20;
    const totalTtc = doc.totalHt * 1.20;
    
    const itemsHtml = doc.items.map(item => `
      <tr class="border-b border-slate-100 text-xs">
        <td class="py-3 px-2 font-medium text-slate-800">${item.nomPiece}</td>
        <td class="py-3 px-2 text-right font-mono text-slate-600">${item.prixVenteHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
        <td class="py-3 px-2 text-center font-semibold text-slate-700">${item.quantite}</td>
        <td class="py-3 px-2 text-right font-mono font-bold text-slate-800">${(item.prixVenteHt * item.quantite).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${doc.type} ${doc.ref}</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-50 text-slate-900 font-sans p-8">
        <div class="max-w-3xl mx-auto bg-white p-8 border border-slate-200 rounded-2xl shadow-sm space-y-6">
          <div class="flex justify-between items-start border-b border-slate-100 pb-6">
            <div>
              <span class="text-xs uppercase font-extrabold tracking-wider text-indigo-605 block mb-1">${companyInfo.name}</span>
              <p class="text-[11px] text-slate-500 leading-relaxed font-medium">
                ${companyInfo.email} • ${companyInfo.phone}<br/>
                Site : ${companyInfo.website}
              </p>
            </div>
            <div class="text-right">
              <span class="text-[10px] uppercase font-black tracking-widest text-slate-450 block mb-1">PROVENANCE LOGICIEL</span>
              <span class="inline-block px-3 py-1 bg-slate-50 border border-slate-155 text-slate-705 font-mono text-[11px] font-bold rounded-lg">${doc.dateStr}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <h1 class="text-xl font-bold text-slate-900 uppercase tracking-tight">${doc.type === 'Devis' ? 'OFFRE DE DEVIS' : doc.type === 'Proforma' ? 'FACTURE PROFORMA' : 'FACTURE COMMERCIALE'}</h1>
              <p class="text-xs font-mono text-slate-500 mt-1">RÉFÉRENCE : <span class="font-bold text-slate-800">${doc.ref}</span></p>
              <p class="text-xs font-mono text-slate-500">STATUT : <span class="font-bold text-slate-800 uppercase">${doc.status}</span></p>
            </div>
            <div class="bg-slate-50 p-4 border border-slate-150 rounded-xl">
              <span class="text-[10px] text-slate-400 font-mono uppercase block mb-1">Destinataire / Client</span>
              <span class="text-xs font-black text-slate-800 block">${doc.clientDenomination}</span>
            </div>
          </div>

          <div class="border border-slate-150 rounded-xl overflow-hidden bg-white">
            <table class="w-full text-left font-sans border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th class="py-2.5 px-2">Description / Désignation de la Pièce</th>
                  <th class="py-2.5 px-2 text-right">PU H.T</th>
                  <th class="py-2.5 px-2 text-center">Qté</th>
                  <th class="py-2.5 px-2 text-right">TOTAL H.T</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div class="flex justify-end pt-4">
            <div class="w-64 border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">TOTAL H.T :</span>
                <span class="font-mono font-bold text-slate-700">${doc.totalHt.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500 font-medium">TVA (20%) :</span>
                <span class="font-mono font-semibold text-slate-600">${totalTva.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
              <div class="border-t border-slate-150 pt-2 flex justify-between text-sm font-black">
                <span class="text-slate-800">TOTAL T.T.C :</span>
                <span class="font-mono text-indigo-700">${totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-6 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <div>Défibeo Solutions - Gestion de documents logistiques</div>
            <div>Validité de l'offre : 30 jours à compter de l'émission</div>
          </div>

          <div class="mt-8 text-center no-print">
            <button onclick="window.print()" class="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-colors uppercase tracking-wider">
              Imprimer / Sauvegarder en PDF
            </button>
          </div>
        </div>

        <style>
          @media print {
            .no-print { display: none; }
            body { background: white; padding: 0; }
            .max-w-3xl { border: none; box-shadow: none; max-width: 100%; width: 100%; padding: 0; }
          }
        </style>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
        commentaire: docCommentaire
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
        commentaire: docCommentaire
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
    window.open('https://amazon.com/s3doc1', '_blank');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce ticket de caisse ?')) {
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      localStorage.setItem('defib_expenses', JSON.stringify(updated));
    }
  };


  // Save changes to LocalStorage whenever state updates
  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    localStorage.setItem('defib_clients', JSON.stringify(newClients));
  };

  const saveVariables = (newVariables: Variable[]) => {
    setVariables(newVariables);
    localStorage.setItem('defib_variables', JSON.stringify(newVariables));
  };

  const saveDefibs = (newDefibs: Defibrillateur[]) => {
    setDefibrillateurs(newDefibs);
    localStorage.setItem('defib_defibrillateurs', JSON.stringify(newDefibs));
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
    saveDefibs(defibrillateurs.map((df) => (df.id === updated.id ? updated : df)));
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

  if (isLoggedIn && loggedUser?.email === 'tech.ouest@defibeo.com') {
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
        commercialDocs={commercialDocs}
        variables={variables}
        onClose={handleLogout}
        onLogout={handleLogout}
        initialClient={activePortalClient || clients.find(c => c.id === 'c1')}
        companyInfo={companyInfo}
        generatedReports={generatedReports}
      />
    );
  }

  if (isClientPortalOpen) {
    return (
      <ClientPortal
        clients={clients}
        defibrillateurs={defibrillateurs}
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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" id="app-root-container">
      {showEnvLoading && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center text-center font-sans" 
          style={{ 
            background: 'radial-gradient(#7e2e86, #36093a)',
            fontSize: '18px',
            color: '#ffffff'
          }}
          id="env-loading-overlay"
        >
          <span className="text-white text-[18px] font-sans text-center">Chargement de votre environnement.</span>
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
          className="p-4" 
          style={{ 
            background: 'rgb(255 255 255 / 5%)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)' 
          }}
        >
          <div className="text-center">
            <h1 className="text-white font-sans font-bold text-center" style={{ fontSize: '18px', cursor: 'default' }}>Logiciel Défibeo</h1>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
          {[
            { id: 'defibrillateurs', label: 'Défibrillateurs', icon: Heart },
            { id: 'clients', label: 'Clients', icon: User },
            { id: 'fsm', label: 'FSM', icon: Flame },
            { id: 'gmao', label: 'GMAO', icon: Wrench },
            { id: 'stocks', label: 'Stocks', icon: Inbox },
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
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all border-0 shadow-3xs cursor-pointer text-white"
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
              companyInfo={companyInfo}
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
                  {members.map(m => m.name).concat(['Thierry LEFEBVRE', 'Marc VIGNAL', 'Thierry Martin', 'Sébastien PETIT']).map((name, idx) => (
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
                          Tournées {formatFrenchDate(dateStr)}
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
                                onClick={() => {
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
                                  width: '100%'
                                }}
                                className="cursor-pointer md:w-auto flex-1 md:flex-initial"
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
                                    ...members.map(m => m.name),
                                    ...['Thierry LEFEBVRE', 'Marc VIGNAL', 'Thierry Martin', 'Sébastien PETIT'],
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
                              <label className="block mb-1.5 fsm-label-style" style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>Date.</label>
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
                        </div>

                        {/* TOUR MISSIONS LIST */}
                        <div className="p-4 space-y-4">
                          {t.missions.length === 0 ? (
                            <div className="py-6 text-center font-sans bg-white rounded-xl border border-slate-205" style={{ color: '#000000', fontSize: '16px', border: 'none' }}>
                              Aucune mission.
                            </div>
                          ) : (
                            <div className="space-y-4 bg-white">
                              {t.missions.map((m: any, idx: number) => (
                                <div key={m.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-3xs transition-shadow space-y-4 font-sans">
                                  {/* Ligne 1: Numéro de passage */}
                                  <div className="flex items-center gap-2 bg-white pb-0.5">
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
                                        boxShadow: '0 2px 4px rgba(250, 83, 213, 0.2)'
                                      }}
                                    >
                                      {idx + 1}
                                    </div>
                                  </div>

                                  {/* Ligne 2: Site., Identifiant., Raison., Situation. */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full bg-white">
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
                                        <option value="Remplacement B">Remplacement B</option>
                                        <option value="Remplacer B & A">Remplacer B & A</option>
                                        <option value="Remplacer A & P">Remplacer A & P</option>
                                        <option value="Remplacer B & P">Remplacer B & P</option>
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
                                          <option value="En cours">En cours</option>
                                          <option value="Effectué">Effectué</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Lookup field for required components with stock items selector */}
                                  {(() => {
                                    const stockItems = stocks.map(st => {
                                      const vObj = variables.find(v => v.id === st.denominationPieceId);
                                      const name = vObj ? vObj.valeur : `Pièce indéfinie (${st.id})`;
                                      return {
                                        id: st.id,
                                        name: name,
                                        stockage: st.stockage,
                                        quantite: st.quantite,
                                        label: `${name} (${st.stockage} - Qté: ${st.quantite})`
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
                                                  updateFsmMission(t.id, m.id, { requiredParts: updatedParts });
                                                }}
                                                style={{
                                                  fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                                }}
                                                className="cursor-pointer inline-flex items-center rounded-full bg-white border border-slate-200 text-slate-800 text-[15px] px-3.5 py-1.5 font-medium hover:bg-red-800 hover:border-red-950 hover:text-white transition-all duration-150 select-none"
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
                                                updateFsmMission(t.id, m.id, { requiredParts: updatedParts });
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
                                        padding: '10px 16px'
                                      }}
                                      className="cursor-pointer"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              ))}
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
                                      onClick={() => setEditingReportId(rep.id)}
                                      style={rowActionButtonStyle}
                                      className="cursor-pointer"
                                    >
                                      Corriger
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
                          onClick={() => window.location.reload()}
                          id="btn-refresh-crm"
                          style={customButtonStyle}
                        >
                          Actualiser
                        </button>
                      </div>
                    </div>
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
                                          <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '13px' }}>
                                            Message détaillé du ticket
                                          </span>
                                          <div style={{ fontSize: '16px', lineHeight: '1.6', borderRadius: '12px', color: '#000000', fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }} className="bg-white p-4 border border-slate-200">
                                            "{t.message}"
                                          </div>
                                        </div>

                                        {/* Reply section */}
                                        <div className="space-y-2">
                                          <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '13px' }} className="block">
                                            Répondre au client
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
                                              Envoyer la réponse
                                            </button>
                                          </div>
                                        </div>

                                        {/* Published replies */}
                                        {t.reponse && (
                                          <div className="space-y-2 pt-2">
                                            <span style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100, color: '#000000', fontSize: '13px' }} className="block">
                                              Réponse envoyée
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
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">Pièce.</label>
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
                              <option value="">Sélection d'une pièce.</option>
                              {variables.map(v => (
                                <option key={v.id} value={v.id}>
                                  [{v.category}] {v.nom} ({v.marque})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Selling price */}
                          <div className="flex flex-col gap-1 bg-transparent md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider devis-label-style">Tarif de vente. (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={customDocPiecePrice}
                              disabled
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
                                <span style={itemValueStyle}>Total TVA.</span>
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
              saveStocks={saveStocks}
              showStockForm={showStockForm}
              setShowStockForm={setShowStockForm}
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
              onUpdateExpenses={(updated) => {
                setExpenses(updated);
                localStorage.setItem('defib_expenses', JSON.stringify(updated));
              }}
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
            />
          )}

          {activeTab === 'import-export' && (
            <ImportExportTab tenantId={tenantId} />
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
