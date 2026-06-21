import React from 'react';
import {
  X,
  Users,
  CreditCard,
  Mail,
  ExternalLink,
  Laptop,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Globe,
  Building,
  Phone,
  Link as LinkIcon,
  Image as ImageIcon,
  KeyRound,
  Plus,
  Trash2
} from 'lucide-react';
import { CompanyInfo, Member, MemberSchedule, MemberAbsence } from '../types';
import { getRegisteredTenants, fetchCollectionFromFirestore, saveCollectionToFirestore, checkIfEmailExistsAnywhere } from '../firebase';
import { getAppsScriptUrl, saveAppsScriptUrl, triggerEmail2TechnicianConnexion, triggerEmail3AdminConnexion } from '../utils/emailService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  onOpenPublicPortal: () => void;
  onOpenClientPortal?: () => void;
  isPage?: boolean;
  onLogout?: () => void;
  currentUser?: { email: string; name: string } | null;
  enableOtherEquipments?: string;
  onUpdateOtherEquipments?: (val: string) => void;
  otherEquipments?: any[];
  onClearOtherEquipments?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  companyInfo,
  onUpdateCompanyInfo,
  members,
  onUpdateMembers,
  onOpenPublicPortal,
  onOpenClientPortal,
  isPage = false,
  onLogout,
  currentUser,
  enableOtherEquipments: propEnableOtherEquipments = 'Non',
  onUpdateOtherEquipments,
  otherEquipments = [],
  onClearOtherEquipments
}: SettingsModalProps) {
  const [selectedLang, setSelectedLang] = React.useState(() => localStorage.getItem('defib_lang') || 'Français, France');
  const [shortEnvId, setShortEnvId] = React.useState(() => localStorage.getItem('defib_short_env_id') || 'D18');

  React.useEffect(() => {
    const activeId = localStorage.getItem('defib_tenant_id') || 'demo';
    if (activeId.toLowerCase() === 'demo') {
      setShortEnvId('D18');
      localStorage.setItem('defib_short_env_id', 'D18');
    } else {
      getRegisteredTenants().then(tenants => {
        const found = tenants.find(t => t.id === activeId);
        if (found && found.shortEnvId) {
          setShortEnvId(found.shortEnvId);
          localStorage.setItem('defib_short_env_id', found.shortEnvId);
        } else {
          setShortEnvId('D18');
        }
      }).catch(err => {
        console.error('Error fetching registered tenants shortEnvId in SettingsModal:', err);
      });
    }
  }, []);

  const [appsScriptUrl, setAppsScriptUrl] = React.useState<string>('');
  
  React.useEffect(() => {
    if (isOpen || isPage) {
      getAppsScriptUrl().then(url => {
        setAppsScriptUrl(url);
      });
    }
  }, [isOpen, isPage]);
  
  // Local states for form editing without auto-saving until save clicked ("pas d'auto-save")
  const [localCompany, setLocalCompany] = React.useState<CompanyInfo>(companyInfo);
  const [localMembers, setLocalMembers] = React.useState<Member[]>(members);
  const [isSaving, setIsSaving] = React.useState(false);
  const [enableOtherEquipments, setEnableOtherEquipments] = React.useState(propEnableOtherEquipments);
  const [showDisableOtherEquipmentsConfirmation, setShowDisableOtherEquipmentsConfirmation] = React.useState(false);

  React.useEffect(() => {
    setEnableOtherEquipments(propEnableOtherEquipments);
    setShowDisableOtherEquipmentsConfirmation(false);
  }, [propEnableOtherEquipments, isOpen]);

  // Synchronise if parent prop changes upon load or reset
  const hasLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasLoadedRef.current && (companyInfo.name || members.length > 0)) {
      setLocalCompany(companyInfo);
      setLocalMembers(members);
      hasLoadedRef.current = true;
    }
  }, [companyInfo, members]);

  // States for the member addition form inside the local state
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [newMemberRole, setNewMemberRole] = React.useState('Administrateur');
  const [newMemberPin, setNewMemberPin] = React.useState('');
  const [newMemberLocation, setNewMemberLocation] = React.useState('');
  const [newMemberAdminSubRole, setNewMemberAdminSubRole] = React.useState<'Administrateur' | 'Administration' | 'Planification' | 'Logistique' | 'Comptabilité'>('Administrateur');

  // LOCAL STATES FOR CONNECTORS
  const [sageActive, setSageActive] = React.useState(false);
  const [sageClientId, setSageClientId] = React.useState('');
  const [sageAccessToken, setSageAccessToken] = React.useState('');
  const [sageSecretToken, setSageSecretToken] = React.useState('');

  const [pennylaneActive, setPennylaneActive] = React.useState(false);
  const [pennylaneClientId, setPennylaneClientId] = React.useState('');
  const [pennylaneCompanyToken, setPennylaneCompanyToken] = React.useState('');
  const [pennylaneSecretToken, setPennylaneSecretToken] = React.useState('');

  const [dropboxActive, setDropboxActive] = React.useState(false);
  const [dropboxAccessToken, setDropboxAccessToken] = React.useState('');
  const [dropboxAccessTokenSecret, setDropboxAccessTokenSecret] = React.useState('');

  const [cegidActive, setCegidActive] = React.useState(false);
  const [cegidApiKey, setCegidApiKey] = React.useState('');
  const [cegidApiSecret, setCegidApiSecret] = React.useState('');

  const [connectorsSaveStatus, setConnectorsSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  React.useEffect(() => {
    if (isOpen || isPage) {
      fetchCollectionFromFirestore<any>('api_connectors').then(data => {
        if (data) {
          if (data.sageActive !== undefined) setSageActive(data.sageActive);
          if (data.sageClientId !== undefined) setSageClientId(data.sageClientId);
          if (data.sageAccessToken !== undefined) setSageAccessToken(data.sageAccessToken);
          if (data.sageSecretToken !== undefined) setSageSecretToken(data.sageSecretToken);

          if (data.pennylaneActive !== undefined) setPennylaneActive(data.pennylaneActive);
          if (data.pennylaneClientId !== undefined) setPennylaneClientId(data.pennylaneClientId);
          if (data.pennylaneCompanyToken !== undefined) setPennylaneCompanyToken(data.pennylaneCompanyToken);
          if (data.pennylaneSecretToken !== undefined) setPennylaneSecretToken(data.pennylaneSecretToken);

          if (data.dropboxActive !== undefined) setDropboxActive(data.dropboxActive);
          if (data.dropboxAccessToken !== undefined) setDropboxAccessToken(data.dropboxAccessToken);
          if (data.dropboxAccessTokenSecret !== undefined) setDropboxAccessTokenSecret(data.dropboxAccessTokenSecret);

          if (data.cegidActive !== undefined) setCegidActive(data.cegidActive);
          if (data.cegidApiKey !== undefined) setCegidApiKey(data.cegidApiKey);
          if (data.cegidApiSecret !== undefined) setCegidApiSecret(data.cegidApiSecret);
        }
      }).catch(err => {
        console.error('Error loading API connectors from Firestore:', err);
      });
    }
  }, [isOpen, isPage]);

  const handleSaveConnectors = async () => {
    setConnectorsSaveStatus('saving');
    try {
      const payload = {
        sageActive,
        sageClientId,
        sageAccessToken,
        sageSecretToken,
        pennylaneActive,
        pennylaneClientId,
        pennylaneCompanyToken,
        pennylaneSecretToken,
        dropboxActive,
        dropboxAccessToken,
        dropboxAccessTokenSecret,
        cegidActive,
        cegidApiKey,
        cegidApiSecret
      };
      await saveCollectionToFirestore('api_connectors', payload);
      setConnectorsSaveStatus('saved');
    } catch (e) {
      console.error('Error saving API connectors to Firestore:', e);
      setConnectorsSaveStatus('idle');
    }
    setTimeout(() => {
      setConnectorsSaveStatus('idle');
    }, 2500);
  };

  if (!isPage && !isOpen) return null;

  // Local state change handlers
  const handleCompanyChange = (key: keyof CompanyInfo, value: string) => {
    setLocalCompany(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const canEditMember = (index: number) => {
    const m = localMembers[index];
    if (!m) return false;
    const isTech = m.role === 'Technicien' || m.role === 'Maintenance Terrain' || m.role?.toLowerCase().includes('tech');
    const isOwnSession = currentUser && m.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim();
    
    const loggedInMember = currentUser ? localMembers.find(lm => lm.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) : null;
    const isCurrentUserAdminOrSuperAdmin = loggedInMember && (
      loggedInMember.role === 'Administrateur' || 
      loggedInMember.role === 'Super-Administrateur' || 
      loggedInMember.role === 'Propriétaire / Admin' || 
      loggedInMember.role?.toLowerCase().includes('super') || 
      loggedInMember.role?.toLowerCase().includes('propriétaire') ||
      loggedInMember.role?.toLowerCase().includes('admin')
    );
    const isCurrentUserSuperAdmin = loggedInMember && (
      loggedInMember.role === 'Super-Administrateur' || 
      loggedInMember.role === 'Propriétaire / Admin' || 
      loggedInMember.role?.toLowerCase().includes('super') || 
      loggedInMember.role?.toLowerCase().includes('propriétaire')
    );
    return !!(isOwnSession || isCurrentUserSuperAdmin || (isTech && isCurrentUserAdminOrSuperAdmin));
  };

  const handlePinChange = (index: number, pinVal: string) => {
    if (!canEditMember(index)) return;
    const cleaned = pinVal.replace(/[^0-9]/g, '').slice(0, 4);
    setLocalMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], pin: cleaned };
      return updated;
    });
  };

  const handleRoleChange = (index: number, newRole: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const isTech = newRole === 'Technicien';
      updated[index] = { 
        ...updated[index], 
        role: newRole,
        pin: updated[index].pin || '1234',
        locationLink: isTech ? updated[index].locationLink : undefined,
        adminSubRole: !isTech ? (updated[index].adminSubRole || 'Administrateur') : undefined
      };
      return updated;
    });
  };

  const handleNameChange = (index: number, val: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: val };
      return updated;
    });
  };

  const handleEmailChange = (index: number, val: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], email: val };
      return updated;
    });
  };

  const handleLocationChange = (index: number, val: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], locationLink: val || undefined };
      return updated;
    });
  };

  const handleCompetenceToggle = (index: number, comp: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].competences || [];
      const newCompetences = current.includes(comp)
        ? current.filter(c => c !== comp)
        : [...current, comp];
      updated[index] = { ...updated[index], competences: newCompetences };
      return updated;
    });
  };

  const handleAddMemberSchedule = (index: number) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].semaineTypique || [];
      const newSchedule: MemberSchedule = {
        days: [],
        fermetureMidi: false,
        openMorning: '09:00',
        closeMorning: '12:00',
        openAfternoon: '14:00',
        closeAfternoon: '18:00',
        openContinuous: '09:00',
        closeContinuous: '17:00'
      };
      updated[index] = { ...updated[index], semaineTypique: [...current, newSchedule] };
      return updated;
    });
  };

  const handleRemoveMemberSchedule = (index: number, schIdx: number) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].semaineTypique || [];
      const filtered = current.filter((_, i) => i !== schIdx);
      updated[index] = { ...updated[index], semaineTypique: filtered };
      return updated;
    });
  };

  const handleUpdateMemberScheduleField = (index: number, schIdx: number, field: keyof MemberSchedule, val: any) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].semaineTypique || [];
      const updatedSchedules = current.map((sch, i) => {
        if (i !== schIdx) return sch;
        return { ...sch, [field]: val };
      });
      updated[index] = { ...updated[index], semaineTypique: updatedSchedules };
      return updated;
    });
  };

  const handleToggleMemberScheduleDay = (index: number, schIdx: number, day: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].semaineTypique || [];
      const updatedSchedules = current.map((sch, i) => {
        if (i !== schIdx) return sch;
        const days = sch.days.includes(day)
          ? sch.days.filter(d => d !== day)
          : [...sch.days, day];
        return { ...sch, days };
      });
      updated[index] = { ...updated[index], semaineTypique: updatedSchedules };
      return updated;
    });
  };

  const handleAddMemberAbsence = (index: number) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].absences || [];
      const newAbsence: MemberAbsence = {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        commentaire: ''
      };
      updated[index] = { ...updated[index], absences: [...current, newAbsence] };
      return updated;
    });
  };

  const handleRemoveMemberAbsence = (index: number, absIdx: number) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].absences || [];
      const filtered = current.filter((_, i) => i !== absIdx);
      updated[index] = { ...updated[index], absences: filtered };
      return updated;
    });
  };

  const handleUpdateMemberAbsenceField = (index: number, absIdx: number, field: keyof MemberAbsence, val: string) => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      const current = updated[index].absences || [];
      const updatedAbsences = current.map((abs, i) => {
        if (i !== absIdx) return abs;
        return { ...abs, [field]: val };
      });
      updated[index] = { ...updated[index], absences: updatedAbsences };
      return updated;
    });
  };

  const handleAdminSubRoleChange = (index: number, val: 'Administrateur' | 'Administration' | 'Planification' | 'Logistique' | 'Comptabilité') => {
    if (!canEditMember(index)) return;
    setLocalMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], adminSubRole: val };
      return updated;
    });
  };

  const handleRemoveMember = (index: number) => {
    const m = localMembers[index];
    const isSuperAdmin = m.role === 'Super-Administrateur' || m.role === 'Propriétaire / Admin' || m.role?.toLowerCase().includes('super') || m.role?.toLowerCase().includes('propriétaire');
    if (isSuperAdmin) {
      alert("Impossible de supprimer le Super-Administrateur principal.");
      return;
    }
    if (confirm(`Voulez-vous vraiment supprimer le membre "${m.name}" ?`)) {
      setLocalMembers(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const [isVerifyingEmail, setIsVerifyingEmail] = React.useState(false);
  const [newMemberError, setNewMemberError] = React.useState<string | null>(null);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewMemberError(null);

    if (!newMemberName.trim()) {
      setNewMemberError("Veuillez saisir un Nom & Prénom.");
      return;
    }
    if (!newMemberEmail.trim()) {
      setNewMemberError("Veuillez saisir une adresse email.");
      return;
    }
    if (newMemberPin.length !== 4) {
      setNewMemberError("Le code PIN doit comporter exactement 4 chiffres.");
      return;
    }

    const candidateEmail = newMemberEmail.trim().toLowerCase();

    // 1. Check local state duplicates
    const existsLocally = localMembers.some(m => m.email?.trim().toLowerCase() === candidateEmail);
    if (existsLocally) {
      setNewMemberError("Erreur: un utilisateur avec cet email est déjà existant.");
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const emailCheck = await checkIfEmailExistsAnywhere(candidateEmail);
      if (emailCheck.exists) {
        setNewMemberError("Erreur: un utilisateur avec cet email est déjà existant.");
        setIsVerifyingEmail(false);
        return;
      }
    } catch (err) {
      console.error('Error verifying email uniqueness:', err);
    } finally {
      setIsVerifyingEmail(false);
    }

    if (newMemberRole === 'Technicien' && newMemberLocation) {
      const alreadyTaken = localMembers.some(
        mem => mem.role === 'Technicien' && mem.locationLink === newMemberLocation
      );
      if (alreadyTaken) {
        setNewMemberError(`Erreur: l'emplacement ${newMemberLocation} est déjà attribué.`);
        setIsVerifyingEmail(false);
        return;
      }
    }

    const m: Member = {
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      pin: newMemberPin,
      status: 'Inactif',
      lastActive: 'Jamais',
      locationLink: newMemberRole === 'Technicien' ? (newMemberLocation || undefined) : undefined,
      adminSubRole: newMemberRole === 'Administrateur' ? (newMemberAdminSubRole || 'Administrateur') : undefined
    };

    setLocalMembers(prev => [...prev, m]);

    // Reset rapid addition fields
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Administrateur');
    setNewMemberPin('');
    setNewMemberLocation('');
    setNewMemberAdminSubRole('Administrateur');
    setNewMemberError(null);
  };

  // Perform overall save to parent state upon Enregistrer click
  const handleSaveAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsVerifyingEmail(true);

    try {
      // Check for duplicate location assignments among technicians
      const locationsAssigned = new Set<string>();
      for (const m of localMembers) {
        if (m.role === 'Technicien' && m.locationLink) {
          if (locationsAssigned.has(m.locationLink)) {
            alert(`Erreur: l'emplacement "${m.locationLink}" est attribué à plusieurs techniciens.`);
            setIsSaving(false);
            setIsVerifyingEmail(false);
            return;
          }
          locationsAssigned.add(m.locationLink);
        }
      }

      // 1. Check local duplicates within the local list itself
      const emailsSeen = new Set<string>();
      for (const m of localMembers) {
        const emailLower = m.email?.trim().toLowerCase();
        if (!emailLower) continue;
        if (emailsSeen.has(emailLower)) {
          alert(`Erreur: un utilisateur avec cet email est déjà existant.`);
          setIsSaving(false);
          setIsVerifyingEmail(false);
          return;
        }
        emailsSeen.add(emailLower);
      }

      // 2. Fetch and check entire database for collisions (excluding unmodified emails)
      const myTenantId = localStorage.getItem('defib_tenant_id') || 'demo';

      for (const m of localMembers) {
        const candidateEmail = m.email?.trim().toLowerCase();
        if (!candidateEmail) continue;

        // Is this member new, or did they change their email?
        const originalMember = members.find(orig => orig.email?.trim().toLowerCase() === candidateEmail);
        if (originalMember) {
          // This email is unchanged for this member: skip cross-db lookup
          continue;
        }

        // Email has been added or edited to something else
        const emailCheck = await checkIfEmailExistsAnywhere(candidateEmail);
        if (emailCheck.exists) {
          alert("Erreur: un utilisateur avec cet email est déjà existant.");
          setIsSaving(false);
          setIsVerifyingEmail(false);
          return;
        }
      }

    } catch (err) {
      console.error('Error validation before save:', err);
    } finally {
      setIsVerifyingEmail(false);
    }

    onUpdateCompanyInfo(localCompany);
    onUpdateMembers(localMembers);

    // Envoi des emails aux nouveaux membres (Email 2 & 3)
    try {
      const originalEmails = new Set(members.map(m => m.email?.trim().toLowerCase()));
      const newMembers = localMembers.filter(m => m.email && !originalEmails.has(m.email.trim().toLowerCase()));

      for (const m of newMembers) {
        if (m.role === 'Technicien') {
          triggerEmail2TechnicianConnexion(
            m.email.trim(),
            m.pin,
            localCompany.name || 'Défibeo Suite',
            localCompany.email || ''
          ).catch(e => console.error("Error sending tech invite:", e));
        } else if (m.role === 'Administrateur') {
          triggerEmail3AdminConnexion(
            m.email.trim(),
            m.pin,
            localCompany.name || 'Défibeo Suite',
            localCompany.email || ''
          ).catch(e => console.error("Error sending admin invite:", e));
        }
      }
    } catch (err) {
      console.error("Error dispatching member invites:", err);
    }
    
    // Sauvegarder l'url de l'app script
    saveAppsScriptUrl(appsScriptUrl).catch(console.error);
    
    // Keep disabled for 3 seconds as requested, then release
    setTimeout(() => {
      setIsSaving(false);
    }, 3000);
  };

  // Harmonized styling constants
  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
  };

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '1000px',
    backgroundColor: 'rgb(76 20 81)',
    border: 'none',
    color: 'rgb(255 255 255)',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    whiteSpace: 'nowrap',
    fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
    textTransform: 'none',
    cursor: 'default',
  };

  const rowActionButtonStyle: React.CSSProperties = {
    backgroundColor: '#000',
    color: '#fff',
    boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
    borderRadius: '0.75rem',
    fontSize: '18px',
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

  return (
    <div className={isPage ? "w-full min-h-screen bg-white font-sans text-black" : "fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 shadow-2xl"} id={isPage ? "settings-page-wrapper" : "settings-modal-overlay"}>
      <style>{`
        #settings-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]),
        #settings-tab-container-harmonized select {
          height: 48px !important;
          padding: 12px 16px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 13px !important;
          font-size: 16px !important;
          font-weight: 400 !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          box-sizing: border-box !important;
          outline: none !important;
          transition: all 0s !important;
        }
        #settings-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]).bg-grey-input {
          background: #f1f5f9 !important;
        }
        #settings-tab-container-harmonized textarea {
          padding: 12px 16px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 13px !important;
          font-size: 16px !important;
          font-weight: 400 !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          box-sizing: border-box !important;
          outline: none !important;
          transition: all 0s !important;
        }
        #settings-tab-container-harmonized select {
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          background-image: none !important;
          padding-right: 12px !important;
        }
        #settings-tab-container-harmonized label {
          font-size: 16px !important;
          font-weight: 600 !important;
          text-transform: none !important;
          letter-spacing: normal !important;
          color: #000000 !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          cursor: default !important;
        }
        #settings-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled),
        #settings-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled),
        #settings-tab-container-harmonized select:hover:not(:disabled),
        #settings-tab-container-harmonized select:focus:not(:disabled) {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }
        #settings-tab-container-harmonized input:disabled {
          background-color: #f3f4f6 !important;
          color: #9ca3af !important;
          cursor: not-allowed !important;
          border-color: #e5e7eb !important;
        }
      `}</style>



      <div 
        className={isPage ? "bg-white w-full max-w-[760px] mx-auto flex flex-col overflow-hidden animate-fadeIn" : "bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col transform transition-all animate-scaleUp"}
        id={isPage ? "settings-page-container" : "settings-modal-dialog"}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header aligned with other modules */}
        <div 
          className="flex items-center justify-between"
          style={isPage ? {
            border: '1px solid #dadada',
            borderTop: 'none',
            borderRadius: '0px 0px 18px 18px',
            maxWidth: '98%',
            width: '100%',
            margin: '0 auto',
            padding: '20px',
            backgroundColor: '#ffffff'
          } : {
            padding: '16px 24px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-2xl font-bold text-black font-gochi" style={{ color: '#000000', cursor: 'default' }}>Paramètres</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              disabled={isSaving}
              onClick={handleSaveAll}
              style={{
                backgroundColor: 'rgb(53, 86, 236)',
                color: '#ffffff',
                boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, 0 4px 4px #ffffff00, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff36',
                borderRadius: '0.75rem',
                fontSize: '18px',
                padding: '11px 22px',
                fontWeight: '100',
                transition: 'all 0s ease-in-out',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1,
                border: 'none',
                fontFamily: "'DefibeoMain', 'Civilprom', sans-serif"
              }}
              className="transition-all"
            >
              Enregistrer
            </button>
            {!isPage && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div 
          className={isPage ? "py-6 pb-24 space-y-6" : "p-6 space-y-6 overflow-y-auto max-h-[75vh]"} 
          id="settings-tab-container-harmonized"
          style={isPage ? { maxWidth: '98%', margin: '0 auto', width: '100%' } : {}}
        >
          
          {/* SECTION 0: INFORMATION ENTREPRISE */}
          <div className="space-y-4 pb-6" id="settings-section-company">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Nom commercial.</label>
                <input
                  type="text"
                  value={localCompany.name}
                  onChange={(e) => handleCompanyChange('name', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm"
                  placeholder="Entrez un nom commercial."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">URL source du logo.</label>
                <input
                  type="text"
                  value={localCompany.logo}
                  onChange={(e) => handleCompanyChange('logo', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm"
                  placeholder="Collez le lien source du logo."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">URL du site internet.</label>
                <input
                  type="text"
                  value={localCompany.website}
                  onChange={(e) => handleCompanyChange('website', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm"
                  placeholder="Collez le lien du site internet."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Email de l’entreprise.</label>
                <input
                  type="email"
                  value={localCompany.email}
                  onChange={(e) => handleCompanyChange('email', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-xs"
                  placeholder="Entrez l’email de l’entreprise."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Téléphone de l’entreprise.</label>
                <input
                  type="text"
                  value={localCompany.phone}
                  onChange={(e) => handleCompanyChange('phone', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm"
                  placeholder="Entrez le téléphone de l’entreprise."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Nom du logiciel.</label>
                <input
                  type="text"
                  value={localCompany.nomLogiciel ?? ''}
                  onChange={(e) => handleCompanyChange('nomLogiciel', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm bg-grey-input"
                  placeholder="Entrez un nom pour votre logiciel."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Lien vers les conditions légales.</label>
                <input
                  type="url"
                  value={localCompany.conditionsLegalesLink ?? ''}
                  onChange={(e) => handleCompanyChange('conditionsLegalesLink', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm bg-grey-input"
                  placeholder="Collez le lien vers vos conditions légales."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Mentions légales pour les pièces comptables.</label>
                <input
                  type="text"
                  value={localCompany.mentionsLegalesFactures ?? ''}
                  onChange={(e) => handleCompanyChange('mentionsLegalesFactures', e.target.value)}
                  className="w-full text-black placeholder-[#747474] font-sans text-sm bg-grey-input"
                  placeholder="Saisissez les mentions légales pour vos devis et factures."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[16px] font-bold text-black font-sans">Langue et région du logiciel.</label>
                <select
                  value={selectedLang || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLang(val);
                    localStorage.setItem('defib_lang', val);
                  }}
                  className="w-full text-black font-sans text-sm cursor-pointer"
                >
                  <option value="" disabled hidden>Sélectionnez une localisation.</option>
                  <option value="Français, France">Français, France</option>
                  <option value="Français, Belgique">Français, Belgique</option>
                  <option value="Français, Luxembourg">Français, Luxembourg</option>
                  <option value="Français, Monaco">Français, Monaco</option>
                  <option value="English, Switzerland">English, Switzerland</option>
                  <option value="English, United Kingdom">English, United Kingdom</option>
                  <option value="English, Spain">English, Spain</option>
                  <option value="English, Portugal">English, Portugal</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* SECTION: OTHER EQUIPMENTS INTEGRATION */}
          <div className="space-y-2 mt-4 text-left">
            <label className="block text-[16px] font-bold text-black font-sans leading-tight">
              Activer l'infogérance et la maintenance de d'autres types d'équipements.
            </label>
            <div className="flex items-center space-x-6 py-1 font-sans">
              <button
                type="button"
                onClick={() => {
                  setEnableOtherEquipments("Oui");
                  localStorage.setItem('defib_enable_other_equipments', 'Oui');
                  onUpdateOtherEquipments?.("Oui");
                  setShowDisableOtherEquipmentsConfirmation(false);
                }}
                className="inline-flex items-center cursor-pointer gap-2 select-none justify-start text-left"
              >
                <span 
                  className="rounded-full flex items-center justify-center transition-all bg-white"
                  style={{
                    border: enableOtherEquipments === "Oui" ? '2.5px solid #fe4eba' : '2.5px solid #cbd5e1',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    minHeight: '20px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {enableOtherEquipments === "Oui" && (
                    <span className="rounded-full bg-[#fe4eba]" style={{ width: '9px', height: '9px' }} />
                  )}
                </span>
                <span className="text-[15px] font-semibold text-black">Oui</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (enableOtherEquipments === "Oui" && (otherEquipments || []).length > 0) {
                    setShowDisableOtherEquipmentsConfirmation(true);
                  } else {
                    setEnableOtherEquipments("Non");
                    localStorage.setItem('defib_enable_other_equipments', 'Non');
                    onUpdateOtherEquipments?.("Non");
                    setShowDisableOtherEquipmentsConfirmation(false);
                  }
                }}
                className="inline-flex items-center cursor-pointer gap-2 select-none justify-start text-left"
              >
                <span 
                  className="rounded-full flex items-center justify-center transition-all bg-white"
                  style={{
                    border: enableOtherEquipments === "Non" ? '2.5px solid #fe4eba' : '2.5px solid #cbd5e1',
                    width: '20px',
                    height: '20px',
                    minWidth: '20px',
                    minHeight: '20px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {enableOtherEquipments === "Non" && (
                    <span className="rounded-full bg-[#fe4eba]" style={{ width: '9px', height: '9px' }} />
                  )}
                </span>
                <span className="text-[15px] font-semibold text-black">Non</span>
              </button>
            </div>

            {showDisableOtherEquipmentsConfirmation && (
              <div 
                className="mt-3 p-4 rounded-xl space-y-3 border transition-all animate-fadeIn"
                style={{
                  backgroundColor: '#fffdfd',
                  borderColor: '#fca5a5',
                }}
              >
                <p 
                  className="font-sans font-medium text-red-600"
                  style={{ fontSize: '15px', lineHeight: '1.4' }}
                >
                  Souhaitez-vous faire clôture votre extension, cela engendre la suppression de ces données.
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableOtherEquipmentsConfirmation(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all font-sans cursor-pointer text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnableOtherEquipments("Non");
                      localStorage.setItem('defib_enable_other_equipments', 'Non');
                      onUpdateOtherEquipments?.("Non");
                      onClearOtherEquipments?.();
                      setShowDisableOtherEquipmentsConfirmation(false);
                    }}
                    className="px-4 py-2 rounded-xl text-white font-semibold transition-all font-sans cursor-pointer text-sm hover:opacity-90"
                    style={{
                      backgroundColor: '#ef4444'
                    }}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* SECTION 1: MEMBERS LIST */}
          <div className="space-y-4 pb-6" id="settings-section-members">

            {/* Formulaire d'ajout rapide de collaborateur */}
            <form onSubmit={handleAddMemberSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Nom et prénom.</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => { setNewMemberName(e.target.value); setNewMemberError(null); }}
                    placeholder=""
                    className="w-full text-black text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Email.</label>
                  <input
                    type="type"
                    value={newMemberEmail}
                    onChange={(e) => { setNewMemberEmail(e.target.value); setNewMemberError(null); }}
                    placeholder=""
                    className="w-full text-black text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Rôle.</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => { setNewMemberRole(e.target.value); setNewMemberError(null); }}
                    className="w-full text-black font-semibold text-xs font-sans cursor-pointer"
                  >
                    <option value="Administrateur">Administrateur</option>
                    <option value="Technicien">Technicien</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">
                    {newMemberRole === 'Administrateur' ? 'Mot de passe.' : 'PIN d’accès.'}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newMemberPin}
                    onChange={(e) => { setNewMemberPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setNewMemberError(null); }}
                    placeholder="Entrez un code."
                    className="w-full text-black text-center font-mono font-bold text-xs"
                  />
                </div>

                {newMemberRole === 'Administrateur' && (
                  <div className="space-y-1">
                    <label className="block text-[16px] font-bold text-black font-sans">Attribuer un rôle.</label>
                    <select
                      value={newMemberAdminSubRole}
                      onChange={(e) => { setNewMemberAdminSubRole(e.target.value as any); setNewMemberError(null); }}
                      className="w-full text-black font-semibold text-xs font-sans cursor-pointer"
                    >
                      <option value="Administrateur">Administrateur</option>
                      <option value="Administration">Administration</option>
                      <option value="Planification">Planification</option>
                      <option value="Logistique">Logistique</option>
                      <option value="Comptabilité">Comptabilité</option>
                    </select>
                  </div>
                )}

                {newMemberRole === 'Technicien' && (
                  <div className="space-y-1">
                    <label className="block text-[16px] font-bold text-black font-sans">Emplacement.</label>
                    <select
                      value={newMemberLocation}
                      onChange={(e) => { setNewMemberLocation(e.target.value); setNewMemberError(null); }}
                      className="w-full text-black font-semibold text-xs font-sans cursor-pointer"
                    >
                      <option value="">Sélect. un emplacement</option>
                      {(['Entrepôt A', 'Entrepôt B', 'Entrepôt C', 'Véhicule A', 'Véhicule B', 'Véhicule C'] as const).map(loc => {
                        const isTaken = localMembers.some(
                          mem => mem.role === 'Technicien' && mem.locationLink === loc
                        );
                        return (
                          <option key={loc} value={loc} disabled={isTaken}>
                            {loc} {isTaken ? ' (Déjà attribué)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  style={{ ...rowActionButtonStyle, width: '100%' }}
                  className="w-full cursor-pointer font-sans text-white font-normal text-[18px]"
                >
                  Nouveau membre
                </button>
                {newMemberError && (
                  <div className="mt-2 text-red-600 text-[16px] font-sans font-medium text-left animate-fadeIn">
                    {newMemberError}
                  </div>
                )}
              </div>
            </form>

            {/* Liste des membres */}
            <div className="bg-white overflow-hidden mt-6 rounded-xl animate-fadeIn border border-slate-200" style={{ boxShadow: 'none' }}>
              <table className="w-full text-left font-sans border-collapse text-xs" style={{ borderTop: 'none', borderBottom: 'none' }}>
                <tbody className="text-slate-700 text-xs text-black">
                  {localMembers.map((m, idx) => {
                    const isSuperAdmin = m.role === 'Super-Administrateur' || m.role === 'Propriétaire / Admin' || m.role?.toLowerCase().includes('super') || m.role?.toLowerCase().includes('propriétaire');
                    const isTech = m.role === 'Technicien' || m.role === 'Maintenance Terrain' || m.role?.toLowerCase().includes('tech');
                    const isOwnSession = currentUser && m.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim();
                    
                    const loggedInMember = currentUser ? localMembers.find(lm => lm.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) : null;
                    const isCurrentUserAdminOrSuperAdmin = loggedInMember && (
                      loggedInMember.role === 'Administrateur' || 
                      loggedInMember.role === 'Super-Administrateur' || 
                      loggedInMember.role === 'Propriétaire / Admin' || 
                      loggedInMember.role?.toLowerCase().includes('super') || 
                      loggedInMember.role?.toLowerCase().includes('propriétaire') ||
                      loggedInMember.role?.toLowerCase().includes('admin')
                    );
                    const isCurrentUserSuperAdmin = loggedInMember && (
                      loggedInMember.role === 'Super-Administrateur' || 
                      loggedInMember.role === 'Propriétaire / Admin' || 
                      loggedInMember.role?.toLowerCase().includes('super') || 
                      loggedInMember.role?.toLowerCase().includes('propriétaire')
                    );
                    const canEditThisMember = isOwnSession || isCurrentUserSuperAdmin || (isTech && isCurrentUserAdminOrSuperAdmin);

                    return (
                      <tr key={idx} className="group transition-all">
                        
                        {/* Column 1: Nom & Prenom with pills beneath */}
                        <td className="px-5 py-5 font-sans align-top" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                          <div className="flex flex-col gap-2 max-w-[340px] w-full">
                            {/* Supprimer button placed right above Name field for quick access and extra space */}
                            {!isSuperAdmin && canEditThisMember && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(idx)}
                                className="text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 border border-red-200/60 rounded-lg px-2 py-1 text-xs font-semibold self-start flex items-center gap-1 transition-all shadow-sm cursor-pointer mb-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-500 animate-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer le membre
                              </button>
                            )}
                            <input
                              type="text"
                              value={m.name}
                              onChange={(e) => handleNameChange(idx, e.target.value)}
                              placeholder=""
                              disabled={!canEditThisMember}
                              className="text-black font-semibold text-sm w-full font-sans animate-none bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {isSuperAdmin && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '1000px',
                                  backgroundColor: 'rgb(76 20 81)',
                                  border: 'none',
                                  color: 'rgb(255 255 255)',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  padding: '4px 10px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                  textTransform: 'none',
                                  cursor: 'default'
                                }}>Super-Administrateur</span>
                              )}
                              {isOwnSession && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '1000px',
                                  backgroundColor: 'rgb(76 20 81)',
                                  border: 'none',
                                  color: 'rgb(255 255 255)',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  padding: '4px 10px',
                                  whiteSpace: 'nowrap',
                                  fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
                                  textTransform: 'none',
                                  cursor: 'default'
                                }}>Votre session en cours</span>
                              )}
                              {!isTech && !isSuperAdmin && (
                                <span className="inline-flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-sans text-xs font-bold px-2.5 py-1 border border-indigo-200">
                                  {m.adminSubRole || 'Administrateur'}
                                </span>
                              )}
                              {isTech && (
                                <span className="inline-flex items-center justify-center rounded-full bg-amber-50 text-amber-700 font-sans text-xs font-bold px-2.5 py-1 border border-amber-200">
                                  Technicien {m.locationLink ? `(${m.locationLink})` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Réglages with Email input, Role and PIN select */}
                        <td className="px-5 py-5 font-sans" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                          <div className="flex flex-col gap-3 max-w-[420px] w-full">
                            
                            {/* Email */}
                            <div className="space-y-1">
                              <span className="text-[16px] font-bold text-black block font-sans" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>Email.</span>
                              <input
                                type="email"
                                value={m.email}
                                onChange={(e) => handleEmailChange(idx, e.target.value)}
                                placeholder=""
                                disabled={!canEditThisMember}
                                className="w-full text-black text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ height: '36px', padding: '6px 10px', fontSize: '13px' }}
                              />
                            </div>

                            {/* Rôle & PIN side-by-side */}
                            {!isSuperAdmin && (
                              <div className="grid grid-cols-2 gap-3 items-end w-full">
                                <div className="space-y-1">
                                  <span className="text-[16px] font-bold text-black block font-sans" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>Rôle.</span>
                                  <select
                                    value={isTech ? 'Technicien' : 'Administrateur'}
                                    disabled={!canEditThisMember}
                                    onChange={(e) => handleRoleChange(idx, e.target.value)}
                                    className="w-full font-sans text-xs bg-white text-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ height: '36px', padding: '6px 10px' }}
                                  >
                                    <option value="Administrateur">Administrateur</option>
                                    <option value="Technicien">Technicien</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[16px] font-bold text-black block font-sans text-left" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>
                                    {isTech ? 'PIN d’accès.' : 'Mot de passe.'}
                                  </span>
                                  <input
                                    type="text"
                                    maxLength={4}
                                    value={m.pin || ''}
                                    disabled={!canEditThisMember}
                                    onChange={(e) => handlePinChange(idx, e.target.value)}
                                    placeholder="Entrez un code."
                                    className="w-full text-left font-mono font-bold text-xs bg-white text-black disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                    style={{ height: '36px', padding: '6px 10px' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Emplacement attribué (exclusive dropdown for Technicians) */}
                            {isTech && !isSuperAdmin && (
                              <div className="space-y-1 mt-1 w-full text-left">
                                <span className="text-[16px] font-bold text-black block font-sans" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>
                                  Emplacement attribué *
                                </span>
                                <select
                                  value={m.locationLink || ''}
                                  disabled={!canEditThisMember}
                                  onChange={(e) => handleLocationChange(idx, e.target.value)}
                                  className="w-full font-sans text-xs bg-white text-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  style={{ height: '36px', padding: '6px 10px' }}
                                >
                                  <option value="">Sélect. un emplacement</option>
                                  {(['Entrepôt A', 'Entrepôt B', 'Entrepôt C', 'Véhicule A', 'Véhicule B', 'Véhicule C'] as const).map(loc => {
                                    // Check if this location is taken by ANOTHER technician
                                    const isTakenByOther = localMembers.some(
                                      (mem, otherIdx) => otherIdx !== idx && mem.role === 'Technicien' && mem.locationLink === loc
                                    );
                                    return (
                                      <option key={loc} value={loc} disabled={isTakenByOther}>
                                        {loc} {isTakenByOther ? ' (Déjà attribué)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}

                            {/* Compétences (Checklist for Technicians) */}
                            {isTech && (
                              <div className="space-y-2 mt-3 w-full text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <span className="text-sm font-bold text-slate-800 block font-sans" style={{ textTransform: 'none' }}>
                                  Compétences (choix multiples)
                                </span>
                                <div className="flex flex-col gap-2">
                                  {[
                                    "Formation AMD",
                                    "Habilitation Électrique",
                                    "Pose de coffret",
                                    "Installation et maintenance défibrillateur",
                                    "Installation et maintenance extincteur",
                                    "Installation et maintenance BIMP",
                                    "Installation et maintenance signalisation",
                                    "Installation et maintenance éclairage de secours",
                                    "Installation et maintenance purificateur d'air"
                                  ].map((comp) => {
                                    const hasComp = (m.competences || []).includes(comp);
                                    return (
                                      <label key={comp} className="flex items-start gap-2.5 text-xs text-black font-sans cursor-pointer select-none py-0.5">
                                        <input
                                          type="checkbox"
                                          checked={hasComp}
                                          disabled={!canEditThisMember}
                                          onChange={() => handleCompetenceToggle(idx, comp)}
                                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                        <span className="text-slate-700 text-xs font-medium leading-tight">{comp}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Semaine typique / Horaires d'ouvertures (Checklist for Technicians) */}
                            {isTech && (
                              <div className="space-y-3 mt-3 w-full text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-800 block font-sans" style={{ textTransform: 'none' }}>
                                    Semaine typique
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canEditThisMember}
                                    onClick={() => handleAddMemberSchedule(idx)}
                                    className="px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    + Ajouter une plage
                                  </button>
                                </div>

                                {!(m.semaineTypique && m.semaineTypique.length > 0) ? (
                                  <div className="text-xs text-slate-500 italic py-1">
                                    Aucun horaire renseigné pour le moment.
                                  </div>
                                ) : (
                                  (m.semaineTypique || []).map((sch, schIdx) => (
                                    <div key={schIdx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative space-y-3">
                                      <button
                                        type="button"
                                        disabled={!canEditThisMember}
                                        onClick={() => handleRemoveMemberSchedule(idx, schIdx)}
                                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1 cursor-pointer disabled:opacity-50"
                                        title="Supprimer cette plage"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>

                                      {/* Midi closing toggle */}
                                      <div className="flex items-center gap-2 select-none">
                                        <input
                                          type="checkbox"
                                          id={`mem-${idx}-mid-close-${schIdx}`}
                                          checked={sch.fermetureMidi}
                                          disabled={!canEditThisMember}
                                          onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'fermetureMidi', e.target.checked)}
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                        />
                                        <label htmlFor={`mem-${idx}-mid-close-${schIdx}`} className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                                          Fermeture le midi (4 plages)
                                        </label>
                                      </div>

                                      {/* Time Inputs */}
                                      <div className="grid grid-cols-2 gap-2">
                                        {sch.fermetureMidi ? (
                                          <>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Deb. Matin</label>
                                              <input
                                                type="time"
                                                value={sch.openMorning || '09:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'openMorning', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Fin. Matin</label>
                                              <input
                                                type="time"
                                                value={sch.closeMorning || '12:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'closeMorning', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Deb. Apr-M</label>
                                              <input
                                                type="time"
                                                value={sch.openAfternoon || '14:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'openAfternoon', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Fin. Apr-M</label>
                                              <input
                                                type="time"
                                                value={sch.closeAfternoon || '18:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'closeAfternoon', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Début</label>
                                              <input
                                                type="time"
                                                value={sch.openContinuous || '09:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'openContinuous', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Fin</label>
                                              <input
                                                type="time"
                                                value={sch.closeContinuous || '17:00'}
                                                disabled={!canEditThisMember}
                                                onChange={(e) => handleUpdateMemberScheduleField(idx, schIdx, 'closeContinuous', e.target.value)}
                                                className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                              />
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      {/* Day checkboxes (Lundi to Dimanche) */}
                                      <div className="space-y-1">
                                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Jours concernés</span>
                                        <div className="flex flex-wrap gap-1">
                                          {[
                                            { key: 'Lundi', label: 'Lun' },
                                            { key: 'Mardi', label: 'Mar' },
                                            { key: 'Mercredi', label: 'Mer' },
                                            { key: 'Jeudi', label: 'Jeu' },
                                            { key: 'Vendredi', label: 'Ven' },
                                            { key: 'Samedi', label: 'Sam' },
                                            { key: 'Dimanche', label: 'Dim' }
                                          ].map((dayObj) => {
                                            const isChecked = sch.days.includes(dayObj.key);
                                            const isDayTakenElsewhere = (m.semaineTypique || []).some((s, i) => i !== schIdx && s.days.includes(dayObj.key));
                                            return (
                                              <button
                                                key={dayObj.key}
                                                type="button"
                                                disabled={isDayTakenElsewhere || !canEditThisMember}
                                                onClick={() => handleToggleMemberScheduleDay(idx, schIdx, dayObj.key)}
                                                className={`px-2 py-1 text-[10px] font-semibold border rounded transition-all select-none ${
                                                  isChecked
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm cursor-pointer'
                                                    : isDayTakenElsewhere
                                                      ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-45 cursor-not-allowed'
                                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer'
                                                }`}
                                              >
                                                {dayObj.label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Section Absences for Technicians */}
                            {isTech && (
                              <div className="space-y-3 mt-3 w-full text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 animate-none">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-800 block font-sans" style={{ textTransform: 'none' }}>
                                    Périodes d'indisponibilité
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canEditThisMember}
                                    onClick={() => handleAddMemberAbsence(idx)}
                                    className="px-2 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <svg xmlns="http://www.w3.org/2050/svg" className="w-3.5 h-3.5 animate-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Absence
                                  </button>
                                </div>

                                {!(m.absences && m.absences.length > 0) ? (
                                  <div className="text-xs text-slate-500 italic py-1">
                                    Aucune indisponibilité déclarée.
                                  </div>
                                ) : (
                                  (m.absences || []).map((abs, absIdx) => (
                                    <div key={absIdx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative space-y-2">
                                      <button
                                        type="button"
                                        disabled={!canEditThisMember}
                                        onClick={() => handleRemoveMemberAbsence(idx, absIdx)}
                                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1 cursor-pointer disabled:opacity-50"
                                        title="Supprimer cette absence"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>

                                      <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Date début</label>
                                          <input
                                            type="date"
                                            value={abs.startDate}
                                            disabled={!canEditThisMember}
                                            onChange={(e) => handleUpdateMemberAbsenceField(idx, absIdx, 'startDate', e.target.value)}
                                            className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Date fin</label>
                                          <input
                                            type="date"
                                            value={abs.endDate}
                                            disabled={!canEditThisMember}
                                            onChange={(e) => handleUpdateMemberAbsenceField(idx, absIdx, 'endDate', e.target.value)}
                                            className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Commentaire court</label>
                                        <input
                                          type="text"
                                          placeholder="Ex: Congés annuels, Formation..."
                                          value={abs.commentaire}
                                          disabled={!canEditThisMember}
                                          onChange={(e) => handleUpdateMemberAbsenceField(idx, absIdx, 'commentaire', e.target.value)}
                                          className="w-full p-1 text-[11px] border border-slate-250 rounded focus:ring-indigo-500 bg-white"
                                        />
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Type de rôle (sub-role select for Administrators) */}
                            {!isTech && !isSuperAdmin && (
                              <div className="space-y-1 mt-1 w-full text-left">
                                <span className="text-[16px] font-bold text-black block font-sans" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>
                                  Type de rôle *
                                </span>
                                <select
                                  value={m.adminSubRole || 'Administrateur'}
                                  disabled={!canEditThisMember}
                                  onChange={(e) => handleAdminSubRoleChange(idx, e.target.value as any)}
                                  className="w-full font-sans text-xs bg-white text-black cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  style={{ height: '36px', padding: '6px 10px' }}
                                >
                                  <option value="Administrateur">Administrateur</option>
                                  <option value="Administration">Administration</option>
                                  <option value="Planification">Planification</option>
                                  <option value="Logistique">Logistique</option>
                                  <option value="Comptabilité">Comptabilité</option>
                                </select>
                              </div>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: CONNECTEURS */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white animate-fadeIn" id="settings-section-connectors">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-black cursor-default select-none animate-fadeIn" style={{ fontSize: '18px', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif" }}>
                  Connecteurs API & Applications.
                </h4>
              </div>
              <button
                type="button"
                onClick={handleSaveConnectors}
                disabled={connectorsSaveStatus === 'saving'}
                style={{
                  backgroundColor: '#fa53d5',
                  color: 'white',
                }}
                className="text-xs font-sans font-extrabold px-4 py-1.5 rounded-full select-none shadow-3xs transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {connectorsSaveStatus === 'saving' ? (
                  <span>Enregistrement...</span>
                ) : connectorsSaveStatus === 'saved' ? (
                  <span className="flex items-center gap-1">Enregistré ! ✓</span>
                ) : (
                  <span>Enregistrer</span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SAGE */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 transition-shadow hover:shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#00746b]/10 flex items-center justify-center font-bold text-[#00746b] text-sm select-none">S</div>
                      <div>
                        <h5 className="font-bold font-sans text-sm text-black">Sage</h5>
                        <div className="text-[10px] text-slate-500 select-none font-sans flex items-center gap-1.5">
                          <span>Statut :</span>
                          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] select-none uppercase">Indisponible</span>
                        </div>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans text-slate-500 select-none">{sageActive ? 'Activé' : 'Désactivé'}</span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sageActive}
                          onChange={(e) => {
                            setSageActive(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00746b]"></div>
                      </label>
                    </div>
                  </div>

                  {sageActive && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 animate-slideUp">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">ID Client.</label>
                        <input
                          type="text"
                          value={sageClientId}
                          onChange={(e) => {
                            setSageClientId(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez l'ID Client."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Sage ID token d’accès.</label>
                        <input
                          type="text"
                          value={sageAccessToken}
                          onChange={(e) => {
                            setSageAccessToken(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Sage ID token d’accès."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Sage ID token secret.</label>
                        <input
                          type="text"
                          value={sageSecretToken}
                          onChange={(e) => {
                            setSageSecretToken(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Sage ID token secret."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PENNYLANE */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 transition-shadow hover:shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 flex items-center justify-center font-bold text-[#4f46e5] text-sm select-none">P</div>
                      <div>
                        <h5 className="font-bold font-sans text-sm text-black">Pennylane</h5>
                        <div className="text-[10px] text-slate-500 select-none font-sans flex items-center gap-1.5">
                          <span>Statut :</span>
                          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] select-none uppercase">Indisponible</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-sans text-slate-550 select-none">{pennylaneActive ? 'Activé' : 'Désactivé'}</span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pennylaneActive}
                          onChange={(e) => {
                            setPennylaneActive(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
                      </label>
                    </div>
                  </div>

                  {pennylaneActive && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 animate-slideUp">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">ID Client.</label>
                        <input
                          type="text"
                          value={pennylaneClientId}
                          onChange={(e) => {
                            setPennylaneClientId(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez l'ID Client."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Company API token.</label>
                        <input
                          type="text"
                          value={pennylaneCompanyToken}
                          onChange={(e) => {
                            setPennylaneCompanyToken(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Company API token."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Secret API token.</label>
                        <input
                          type="text"
                          value={pennylaneSecretToken}
                          onChange={(e) => {
                            setPennylaneSecretToken(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Secret API token."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DROPBOX */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 transition-shadow hover:shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0061ff]/10 flex items-center justify-center font-bold text-[#0061ff] text-sm select-none">D</div>
                      <div>
                        <h5 className="font-bold font-sans text-sm text-black">Dropbox</h5>
                        <div className="text-[10px] text-slate-505 select-none font-sans flex items-center gap-1.5">
                          <span>Statut :</span>
                          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] select-none uppercase">Indisponible</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-sans text-slate-550 select-none">{dropboxActive ? 'Activé' : 'Désactivé'}</span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dropboxActive}
                          onChange={(e) => {
                            setDropboxActive(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0061ff]"></div>
                      </label>
                    </div>
                  </div>

                  {dropboxActive && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 animate-slideUp">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Token d’accès.</label>
                        <input
                          type="text"
                          value={dropboxAccessToken}
                          onChange={(e) => {
                            setDropboxAccessToken(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Token d'accès."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Token secret d’accès.</label>
                        <input
                          type="text"
                          value={dropboxAccessTokenSecret}
                          onChange={(e) => {
                            setDropboxAccessTokenSecret(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez le Token secret d'accès."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CEGID */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 transition-shadow hover:shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#cc0000]/10 flex items-center justify-center font-bold text-[#cc0000] text-sm select-none">C</div>
                      <div>
                        <h5 className="font-bold font-sans text-sm text-black">Cegid</h5>
                        <div className="text-[10px] text-slate-550 select-none font-sans flex items-center gap-1.5">
                          <span>Statut :</span>
                          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[9px] select-none uppercase">Indisponible</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-sans text-slate-550 select-none">{cegidActive ? 'Activé' : 'Désactivé'}</span>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cegidActive}
                          onChange={(e) => {
                            setCegidActive(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#cc0000]"></div>
                      </label>
                    </div>
                  </div>

                  {cegidActive && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3 animate-slideUp">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Clé d’API.</label>
                        <input
                          type="text"
                          value={cegidApiKey}
                          onChange={(e) => {
                            setCegidApiKey(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez la Clé d’API."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">Clé secrète d’API.</label>
                        <input
                          type="text"
                          value={cegidApiSecret}
                          onChange={(e) => {
                            setCegidApiSecret(e.target.value);
                          }}
                          className="w-full text-black placeholder-[#a8a8a8] font-sans text-xs bg-white"
                          placeholder="Entrez la Clé secrète d’API."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SECTION 2: SUBSCRIPTION */}
            <div 
              className="rounded-2xl p-5 space-y-3 bg-[#311833] text-white flex flex-col justify-between animate-fadeIn" 
              id="settings-section-subscription"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white cursor-default select-none" style={{ fontSize: '18px', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif" }}>
                    Facturation Défibeo.
                  </h4>
                </div>
                <div style={{ backgroundColor: '#ffffff1c', border: 'none', padding: '20px', borderRadius: '13px' }}>
                  <div className="font-semibold text-white text-[16px] font-sans" style={{ textTransform: 'none' }}>
                    Votre abonnement Défibeo.
                  </div>
                  <div className="text-xl text-white mt-1 font-sans" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100 }}>
                    380€ Mensuel.
                  </div>
                  <div className="mt-4">
                    <a
                      href="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-8P432259DF5486110NIYZTWY"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center font-bold px-5 py-2.5 text-[18px] text-white hover:opacity-90 active:scale-95 transition-all w-full"
                      style={{
                        backgroundColor: 'rgb(53, 86, 236)',
                        borderRadius: '0.75rem',
                        fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                        fontWeight: '100',
                        boxShadow: 'inset 0 1px 1px #ffffff00, 0 1px 2px #08080833, inset 0 6px 12px #ffffff25',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Mettre à jour
                    </a>
                  </div>
                </div>

                <div className="space-y-2 pt-2 flex flex-col">
                  <span className="block text-[16px] text-white font-sans leading-relaxed" style={{ color: '#ffffff' }}>
                    Les factures sont automatiquement envoyées par e-mail. Les taxes et frais sont inclus dans le montant de l'abonnement. Vous trouverez ci-dessous l'identifiant de votre environnement logiciel.
                  </span>
                  <div className="inline-flex items-center justify-center rounded-full bg-transparent text-white border border-white/30 px-3 py-1.5 text-sm font-semibold w-fit select-none" style={{ backgroundColor: 'transparent' }}>
                    Défibeo {shortEnvId.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ASSISTANCE SUPPORT */}
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-white animate-fadeIn" id="settings-section-support">
              <div className="space-y-2 bg-white">
                <p className="text-[16px] text-black leading-relaxed font-sans">
                  L'assistance Défibeo est disponible tous les jours, y compris les jours fériés, en Français et en Anglais par email à{' '}
                  <a href="mailto:support@defibeo.com" className="text-blue-600 hover:underline hover:text-blue-700 font-bold">
                    support@defibeo.com
                  </a>
                  .
                </p>
                <div className="space-y-2 pt-1 font-sans flex flex-col bg-white">
                  <a 
                    href="https://defibeo.com/#pricing" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block text-[16px] font-semibold text-blue-600 hover:underline hover:text-blue-700 cursor-pointer w-fit"
                  >
                    Informations sur mon offre.
                  </a>
                  <a 
                    href="https://defibeo.com/eula" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block text-[16px] font-semibold text-blue-600 hover:underline hover:text-blue-700 cursor-pointer w-fit"
                  >
                    Licence et agrément EULA.
                  </a>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3 mt-4">
                <a
                  href="https://defibeo.com/school/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...rowActionButtonStyle, width: '100%', fontSize: '18px', backgroundColor: 'rgb(53, 86, 236)', color: '#fff' }}
                  className="text-center cursor-pointer"
                >
                  Centre de connaissances
                </a>

                <a
                  href="mailto:support@defibeo.com"
                  style={{ ...rowActionButtonStyle, width: '100%', fontSize: '18px', backgroundColor: '#000', color: '#fff' }}
                  className="text-center cursor-pointer"
                >
                  Envoyer un message
                </a>
              </div>
            </div>

          </div>

          {onLogout && (
            <div className="pt-4">
              <button
                type="button"
                onClick={onLogout}
                style={{
                  ...rowActionButtonStyle,
                  backgroundColor: '#b91c1c',
                  width: '100%',
                  fontSize: '18px',
                  padding: '13px'
                }}
                className="transition-all text-white font-sans"
              >
                Quitter la session
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
