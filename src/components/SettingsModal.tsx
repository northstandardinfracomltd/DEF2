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
import { CompanyInfo, Member } from '../types';
import { getRegisteredTenants, fetchCollectionFromFirestore } from '../firebase';
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
  currentUser
}: SettingsModalProps) {
  const [selectedLang, setSelectedLang] = React.useState(() => localStorage.getItem('defib_lang') || 'Français, France');
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
  const [saveSuccessMsg, setSaveSuccessMsg] = React.useState<string | null>(null);

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
    return !!(isOwnSession || (isTech && isCurrentUserAdminOrSuperAdmin));
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
        locationLink: isTech ? updated[index].locationLink : undefined
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

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("Veuillez saisir un Nom & Prénom");
      return;
    }
    if (!newMemberEmail.trim()) {
      alert("Veuillez saisir une adresse email");
      return;
    }
    if (newMemberPin.length !== 4) {
      alert("Le code PIN doit comporter exactement 4 chiffres");
      return;
    }

    const candidateEmail = newMemberEmail.trim().toLowerCase();

    // 1. Check local state duplicates
    const existsLocally = localMembers.some(m => m.email?.trim().toLowerCase() === candidateEmail);
    if (existsLocally) {
      alert("Erreur, l'email est déjà utilisé.");
      return;
    }

    setIsVerifyingEmail(true);
    try {
      // 2. Check registered tenants (primary admins)
      const tenants = await getRegisteredTenants();
      const existsAsTenantAdmin = tenants.some(t => t.adminEmail.trim().toLowerCase() === candidateEmail);
      if (existsAsTenantAdmin) {
        alert("Erreur, l'email est déjà utilisé.");
        setIsVerifyingEmail(false);
        return;
      }

      // 3. Check members in all tenants' sub-accounts
      let existsAsSubAccount = false;
      for (const tnt of tenants) {
        const tenantId = tnt.id;
        const key = tenantId === 'demo' ? 'members' : `${tenantId}_members`;
        const fetchedMembers = await fetchCollectionFromFirestore<any[]>(key);
        if (fetchedMembers && Array.isArray(fetchedMembers)) {
          const found = fetchedMembers.some(m => m.email && m.email.trim().toLowerCase() === candidateEmail);
          if (found) {
            existsAsSubAccount = true;
            break;
          }
        }
      }

      if (existsAsSubAccount) {
        alert("Erreur, l'email est déjà utilisé.");
        setIsVerifyingEmail(false);
        return;
      }

    } catch (err) {
      console.error('Error verifying email uniqueness:', err);
    } finally {
      setIsVerifyingEmail(false);
    }

    const m: Member = {
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      pin: newMemberPin,
      status: 'Inactif',
      lastActive: 'Jamais'
    };

    setLocalMembers(prev => [...prev, m]);

    // Reset rapid addition fields
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Administrateur');
    setNewMemberPin('');
    setNewMemberLocation('');
  };

  // Perform overall save to parent state upon Enregistrer click
  const handleSaveAll = async () => {
    setIsVerifyingEmail(true);
    setSaveSuccessMsg(null);

    try {
      // 1. Check local duplicates within the local list itself
      const emailsSeen = new Set<string>();
      for (const m of localMembers) {
        const emailLower = m.email?.trim().toLowerCase();
        if (!emailLower) continue;
        if (emailsSeen.has(emailLower)) {
          alert(`Erreur, l'email est déjà utilisé.`);
          setIsVerifyingEmail(false);
          return;
        }
        emailsSeen.add(emailLower);
      }

      // 2. Fetch all tenants and their sub-accounts to make sure there are no collisions with other accounts (excluding their own unchanged values)
      const tenants = await getRegisteredTenants();
      const myTenantId = localStorage.getItem('defib_tenant_id') || 'demo';

      for (const m of localMembers) {
        const candidateEmail = m.email?.trim().toLowerCase();
        if (!candidateEmail) continue;

        // Check if candidateEmail is used as admin in a different tenant
        const otherTenantAdmin = tenants.some(t => t.id !== myTenantId && t.adminEmail.trim().toLowerCase() === candidateEmail);
        if (otherTenantAdmin) {
          alert(`Erreur, l'email est déjà utilisé.`);
          setIsVerifyingEmail(false);
          return;
        }

        // Check if candidateEmail is used as a member in any other tenant
        for (const tnt of tenants) {
          if (tnt.id === myTenantId) continue; // skip our own tenant
          const key = tnt.id === 'demo' ? 'members' : `${tnt.id}_members`;
          const fetchedMembers = await fetchCollectionFromFirestore<any[]>(key);
          if (fetchedMembers && Array.isArray(fetchedMembers)) {
            const found = fetchedMembers.some(fm => fm.email && fm.email.trim().toLowerCase() === candidateEmail);
            if (found) {
              alert(`Erreur, l'email est déjà utilisé.`);
              setIsVerifyingEmail(false);
              return;
            }
          }
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
    
    // Highlight successful sync to the user
    setSaveSuccessMsg("Paramètres enregistrés avec succès !");
    setTimeout(() => {
      setSaveSuccessMsg(null);
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

      {/* Success indicator toast */}
      {saveSuccessMsg && (
        <div 
          className="fixed bottom-6 right-6 z-[200] bg-black text-white px-5 py-3.5 rounded-xl border border-slate-700 shadow-2xl flex items-center gap-2 animate-scaleUp font-sans"
          style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
        >
          <span className="text-pink-400 font-bold">✓</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

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
                cursor: 'pointer',
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
          
          {/* SECTION 1: MEMBERS LIST */}
          <div className="space-y-4 pb-6" id="settings-section-members">

            {/* Formulaire d'ajout rapide de collaborateur */}
            <form onSubmit={handleAddMemberSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Nom et prénom.</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder=""
                    className="w-full text-black text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Email.</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder=""
                    className="w-full text-black text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">Rôle.</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full text-black font-semibold text-xs font-sans cursor-pointer"
                  >
                    <option value="Administrateur">Administrateur</option>
                    <option value="Technicien">Technicien</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[16px] font-bold text-black font-sans">PIN d’accès.</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newMemberPin}
                    onChange={(e) => setNewMemberPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="Ex: 1234"
                    className="w-full text-black text-center font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  style={{ ...rowActionButtonStyle, width: '100%' }}
                  className="w-full cursor-pointer font-sans text-white font-normal text-[18px]"
                >
                  Nouveau membre
                </button>
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
                    const canEditThisMember = isOwnSession || (isTech && isCurrentUserAdminOrSuperAdmin);

                    return (
                      <tr key={idx} className="group transition-all">
                        
                        {/* Column 1: Nom & Prenom with pills beneath */}
                        <td className="px-5 py-5 font-sans align-top" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                          <div className="flex flex-col gap-2 max-w-[280px]">
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
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Réglages with Email input, Role and PIN select */}
                        <td className="px-5 py-5 font-sans" style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                          <div className="flex flex-col gap-3 max-w-[340px] w-full">
                            
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
                                  <span className="text-[16px] font-bold text-black block font-sans text-left" style={{ fontSize: '16px', textTransform: 'none', color: '#000000' }}>PIN d’accès.</span>
                                  <input
                                    type="text"
                                    maxLength={4}
                                    value={m.pin || ''}
                                    disabled={!canEditThisMember}
                                    onChange={(e) => handlePinChange(idx, e.target.value)}
                                    placeholder=""
                                    className="w-full text-left font-mono font-bold text-xs bg-white text-black disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                                    style={{ height: '36px', padding: '6px 10px' }}
                                  />
                                </div>
                              </div>
                            )}

                          </div>
                        </td>

                        {/* Column 3: actions */}
                        <td className="px-5 py-5 text-right align-middle whitespace-nowrap bg-transparent" onClick={(e) => e.stopPropagation()}>
                          {!isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              style={{
                                ...rowActionButtonStyle,
                                padding: '8px 16px',
                                fontSize: '18px'
                              }}
                              className="cursor-pointer font-sans bg-transparent hover:bg-rose-50 hover:text-rose-600"
                            >
                              Supprimer
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                    {localMembers.length >= 4 ? 'Abonnement PME ETI' : 'Abonnement Indépendant TPE'}
                  </div>
                  <div className="text-xl text-white mt-1 font-sans" style={{ fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontWeight: 100 }}>
                    149€ Mensuel
                  </div>
                </div>

                <div className="space-y-2 pt-2 flex flex-col">
                  <span className="block text-[16px] text-white font-sans leading-relaxed" style={{ color: '#ffffff' }}>
                    Les factures sont automatiquement envoyées par e-mail. Les taxes et frais sont inclus dans le montant de l'abonnement. Vous trouverez ci-dessous l'identifiant de votre environnement logiciel.
                  </span>
                  <div className="inline-flex items-center justify-center rounded-full bg-transparent text-white border border-white/30 px-3 py-1.5 text-sm font-semibold w-fit select-none" style={{ backgroundColor: 'transparent' }}>
                    Défibeo D18
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: ASSISTANCE SUPPORT */}
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-white animate-fadeIn" id="settings-section-support">
              <div className="space-y-2 bg-white">
                <div className="flex items-center gap-2 bg-white">
                  <h4 className="font-bold text-black cursor-default select-none" style={{ fontSize: '18px', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif" }}>
                    Assistance Défibeo.
                  </h4>
                </div>
                <p className="text-[16px] text-black leading-relaxed font-sans">
                  Le support Défibeo est disponible tous les jours, y compris les jours fériés, en Français et en Anglais par email à{' '}
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
              
              <a
                href="mailto:support@defibeo.com"
                style={{ ...rowActionButtonStyle, fontSize: '18px', backgroundColor: '#000', color: '#fff' }}
                className="mt-4 text-center"
              >
                Envoyer un message
              </a>
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
