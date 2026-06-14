import React, { useState, useMemo } from 'react';
import { Client, Defibrillateur, Variable } from '../types';
import { Plus, Search, Trash2, Edit2, X, Briefcase, Mail, Phone, FileText, Calendar, ShieldCheck } from 'lucide-react';

interface ClientTabProps {
  clients: Client[];
  defibrillateurs?: Defibrillateur[];
  variables?: Variable[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientTab({
  clients,
  defibrillateurs = [],
  variables = [],
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientTabProps) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [denomination, setDenomination] = useState('');
  const [siret, setSiret] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessKey, setAccessKey] = useState('');
  
  // Site Information
  const [nomPrenomSite, setNomPrenomSite] = useState('');
  const [telephoneSite, setTelephoneSite] = useState('');
  const [emailSite, setEmailSite] = useState('');
  
  // Contract Details
  const [contrat, setContrat] = useState<Client['contrat']>('Oui');
  const [nomContrat, setNomContrat] = useState('');
  const [referenceContrat, setReferenceContrat] = useState('');
  const [debutContrat, setDebutContrat] = useState('');
  const [finContrat, setFinContrat] = useState('');

  const contractModels = useMemo(() => {
    return variables.filter((v) => v.category === 'Modèle Contrat');
  }, [variables]);

  const [contractFile, setContractFile] = useState<File | null>(null);
  
  const [error, setError] = useState('');
  
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const rowActionButton18Style: React.CSSProperties = {
    ...rowActionButtonStyle,
    fontSize: '18px',
    padding: '9px 19px',
  };

  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000000',
    cursor: 'default',
  };

  // Search filter
  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        (c.denomination || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.siret || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.nomPrenomSite || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.nomContrat || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  const openAddModal = () => {
    setEditingClient(null);
    setDenomination('');
    setSiret('');
    setEmail('');
    setPhone('');
    setAccessKey('');
    setNomPrenomSite('');
    setTelephoneSite('');
    setEmailSite('');
    setContrat('Non');
    setNomContrat('');
    setReferenceContrat('');
    setDebutContrat('');
    setFinContrat('');
    setContractFile(null);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setDenomination(client.denomination);
    setSiret(client.siret);
    setEmail(client.email);
    setPhone(client.phone);
    setAccessKey(client.accessKey || '');
    setNomPrenomSite(client.nomPrenomSite || '');
    setTelephoneSite(client.telephoneSite || '');
    setEmailSite(client.emailSite || '');
    setContrat(client.contrat || 'Non');
    setNomContrat(client.nomContrat === 'Sans contrat de maintenance' ? '' : (client.nomContrat || ''));
    setReferenceContrat(client.referenceContrat === '-' ? '' : (client.referenceContrat || ''));
    setDebutContrat(client.debutContrat || '');
    setFinContrat(client.finContrat || '');
    setContractFile(null);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!denomination.trim()) {
      setError('La dénomination est obligatoire.');
      return;
    }
    if (!siret.trim()) {
      setError('Le numéro d\'enregistrement (SIRET) est obligatoire.');
      return;
    }

    const hasContract = nomContrat && nomContrat.trim() !== '' && nomContrat.trim() !== 'Sans contrat de maintenance';
    const payload = {
      denomination: denomination.trim(),
      siret: siret.trim(),
      email: email.trim(),
      phone: phone.trim(),
      accessKey: accessKey.trim(),
      nomPrenomSite: nomPrenomSite.trim() || 'Représentant Standard',
      telephoneSite: telephoneSite.trim() || phone.trim(),
      emailSite: emailSite.trim() || email.trim(),
      contrat: (hasContract ? 'Oui' : 'Non') as 'Oui' | 'Non',
      nomContrat: hasContract ? nomContrat.trim() : 'Sans contrat de maintenance',
      referenceContrat: (hasContract && referenceContrat.trim()) ? referenceContrat.trim() : '-',
      debutContrat: hasContract ? debutContrat : '',
      finContrat: hasContract ? finContrat : '',
    };

    if (editingClient) {
      onUpdateClient({
        id: editingClient.id,
        ...payload,
      });
    } else {
      onAddClient(payload);
    }

    setIsModalOpen(false);
  };

  if (isModalOpen) {
    return (
      <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="client-form-overlay">
        {/* Form Header */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
          style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px' }}
          id="client-form-header-box"
        >
          <div>
            <h3 className="text-2xl font-bold font-gochi" id="client-modal-title" style={{ color: '#000000', cursor: 'default' }}>
              {editingClient ? 'Modification Client' : 'Nouveau Client'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              id="btn-close-client-modal"
              style={rowActionButton18Style}
              className="transition-colors cursor-pointer"
            >
              <span>Fermer</span>
            </button>

            <button
              type="submit"
              form="client-form"
              id="btn-submit-client-form"
              style={{
                ...rowActionButton18Style,
                backgroundColor: 'rgb(53, 86, 236)',
                color: '#ffffff',
                boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
              }}
              className="transition-all cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* Form Box */}
        <div
          className="w-full animate-fadeIn mt-6"
          style={{ marginTop: '24px' }}
          id="client-form-box"
        >
          <style>{`
             #client-form input:not([type="radio"]):not([type="checkbox"]),
             #client-form select,
             #client-form textarea {
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
             #client-form input:not([type="radio"]):not([type="checkbox"]):hover,
             #client-form input:not([type="radio"]):not([type="checkbox"]):focus,
             #client-form select:hover,
             #client-form select:focus,
             #client-form textarea:hover,
             #client-form textarea:focus {
               outline: 2.5px solid #fa53d5 !important;
               outline-offset: 2px !important;
               transition: all 0s !important;
             }
             #client-form input:not([type="radio"]):not([type="checkbox"])::placeholder,
             #client-form textarea::placeholder {
               color: #000000 !important;
               opacity: 1 !important;
               font-weight: 100 !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
             }
             #client-form input:disabled,
             #client-form select:disabled,
             #client-form textarea:disabled {
               color: #000000 !important;
               -webkit-text-fill-color: #000000 !important;
               background-color: #f1f5f9 !important;
               opacity: 0.95 !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
               cursor: not-allowed !important;
             }
             #client-form input:disabled:hover,
             #client-form input:disabled:focus,
             #client-form select:disabled:hover,
             #client-form select:disabled:focus,
             #client-form textarea:disabled:hover,
             #client-form textarea:disabled:focus {
               outline: none !important;
             }
             #client-form select {
               appearance: none !important;
               -webkit-appearance: none !important;
               -moz-appearance: none !important;
               background-image: none !important;
             }
             #client-form select option {
               color: #000000 !important;
               background: #ffffff !important;
               font-family: "DefibeoMain", "Civilprom", sans-serif !important;
             }
             #client-form input[type="date"]::-webkit-calendar-picker-indicator {
               display: none !important;
               -webkit-appearance: none !important;
               background: none !important;
               width: 0 !important;
               height: 0 !important;
             }
             #client-form label,
             #client-form .section-title-label,
             #client-form span.block.uppercase {
               letter-spacing: normal !important;
               text-transform: none !important;
               font-size: 16px !important;
               color: #000000 !important;
               font-weight: 600 !important;
             }
             #client-form input[type="radio"] {
               appearance: none !important;
               -webkit-appearance: none !important;
               width: 18px !important;
               height: 18px !important;
               border: 2px solid #cbd5e1 !important;
               border-radius: 50% !important;
               background-color: #ffffff !important;
               outline: none !important;
               cursor: pointer !important;
               display: inline-flex !important;
               align-items: center !important;
               justify-content: center !important;
               transition: all 0.2s ease !important;
               margin-right: 6px !important;
             }
             #client-form input[type="radio"]:hover {
               border-color: oklch(0.44 0.16 324.65) !important;
             }
             #client-form input[type="radio"]:checked {
               border-color: oklch(0.44 0.16 324.65) !important;
               background-color: oklch(0.44 0.16 324.65) !important;
             }
             #client-form input[type="radio"]:checked::after {
               content: "" !important;
               width: 8px !important;
               height: 8px !important;
               background-color: #ffffff !important;
               border-radius: 50% !important;
               display: block !important;
             }
             #client-form input[type="checkbox"] {
               appearance: none !important;
               -webkit-appearance: none !important;
               width: 18px !important;
               height: 18px !important;
               border: 2px solid #cbd5e1 !important;
               border-radius: 4px !important;
               background-color: #ffffff !important;
               outline: none !important;
               cursor: pointer !important;
               display: inline-flex !important;
               align-items: center !important;
               justify-content: center !important;
               transition: all 0.2s ease !important;
               margin-right: 6px !important;
             }
             #client-form input[type="checkbox"]:hover {
               border-color: oklch(0.44 0.16 324.65) !important;
             }
             #client-form input[type="checkbox"]:checked {
               border-color: oklch(0.44 0.16 324.65) !important;
               background-color: oklch(0.44 0.16 324.65) !important;
             }
             #client-form input[type="checkbox"]:checked::after {
               content: "✓" !important;
               color: #ffffff !important;
               font-size: 11px !important;
               font-weight: 900 !important;
               display: block !important;
             }
          `}</style>
          
          <form onSubmit={handleSubmit} id="client-form" className="space-y-6">
            {error && (
              <div
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-sans mb-4"
                id="client-form-error"
                style={{ maxWidth: '98%', margin: 'auto' }}
              >
                {error}
              </div>
            )}

            <div className="space-y-0" style={{ maxWidth: '98%', margin: 'auto' }}>
              {/* Section 1 - Informations Sociales / Entreprise */}
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
                    1 — Entreprise
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="input-client-denomination" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Entreprise. *
                    </label>
                    <input
                      type="text"
                      id="input-client-denomination"
                      value={denomination}
                      onChange={(e) => setDenomination(e.target.value)}
                      placeholder="Entrez une dénomination."
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-client-siret" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Identifiant fiscal. *
                    </label>
                    <input
                      type="text"
                      id="input-client-siret"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="Entrez un identifiant fiscal."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="input-client-email" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Email. *
                    </label>
                    <input
                      type="email"
                      id="input-client-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Entrez un email."
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-client-phone" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Téléphone. *
                    </label>
                    <input
                      type="text"
                      id="input-client-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Entrez un téléphone."
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="input-client-access-key" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Mot de passe.
                    </label>
                    <input
                      type="text"
                      id="input-client-access-key"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="Entrez un mot de passe."
                      className="font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 - Responsable / Contact Physique sur Site */}
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
                    2 — Contact
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="input-client-site-nom" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Contact.
                    </label>
                    <input
                      type="text"
                      id="input-client-site-nom"
                      value={nomPrenomSite}
                      onChange={(e) => setNomPrenomSite(e.target.value)}
                      placeholder="Entrez un nom et prénom."
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-client-site-tel" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Téléphone du contact.
                    </label>
                    <input
                      type="text"
                      id="input-client-site-tel"
                      value={telephoneSite}
                      onChange={(e) => setTelephoneSite(e.target.value)}
                      placeholder="Entrez un téléphone."
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="input-client-site-mail" className="block text-[11px] font-bold text-slate-500 uppercase">
                      Email du contact.
                    </label>
                    <input
                      type="email"
                      id="input-client-site-mail"
                      value={emailSite}
                      onChange={(e) => setEmailSite(e.target.value)}
                      placeholder="Entrez un email."
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 - Contrat de Maintenance du Client */}
              <div 
                className="bg-white p-5 relative space-y-3"
                style={{
                  border: '1px solid rgb(218, 218, 218)',
                  borderTop: 'none',
                  borderRadius: '0px 0px 18px 18px',
                }}
              >
                <div className="mb-2 bg-transparent flex flex-wrap items-center justify-between gap-4">
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
                    3 — Contrat
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="input-client-contract-name" className="block text-[11px] font-bold text-slate-500 uppercase">
                        Catégorie du contrat.
                      </label>
                      <select
                        id="input-client-contract-name"
                        value={nomContrat}
                        onChange={(e) => setNomContrat(e.target.value)}
                        className="font-sans cursor-pointer focus:outline-none"
                      >
                        <option value="">Sélectionnez une catégorie.</option>
                        {contractModels.map((v) => (
                          <option key={v.id} value={v.nom}>
                            {v.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="input-client-contract-ref" className="block text-[11px] font-bold text-slate-500 uppercase">
                        Référence du contrat.
                      </label>
                      <input
                        type="text"
                        id="input-client-contract-ref"
                        value={referenceContrat}
                        onChange={(e) => setReferenceContrat(e.target.value)}
                        placeholder="Entrez une référence."
                        className="font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="input-client-contract-start" className="block text-[11px] font-bold text-slate-500 uppercase">
                        Début.
                      </label>
                      <input
                        type="date"
                        id="input-client-contract-start"
                        value={debutContrat}
                        onChange={(e) => setDebutContrat(e.target.value)}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="input-client-contract-end" className="block text-[11px] font-bold text-slate-500 uppercase">
                        Expiration.
                      </label>
                      <input
                        type="date"
                        id="input-client-contract-end"
                        value={finContrat}
                        onChange={(e) => setFinContrat(e.target.value)}
                        placeholder="dd/mm/yyyy"
                      />
                    </div>
                  </div>

                  {/* Upload de fichier si contrat sélectionné */}
                  {nomContrat && nomContrat.trim() !== '' && nomContrat.trim() !== 'Sans contrat de maintenance' && (
                    <div className="space-y-1 pt-2">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">
                        Téléchargement du contrat.
                      </label>
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
                          if (file.size > MAX_SIZE_BYTES) {
                            alert(`Le fichier dépasse la limite standard de 10 Mo (poids du fichier sélectionné : ${(file.size / (1024 * 1024)).toFixed(2)} Mo).`);
                            return;
                          }
                          setContractFile(file);
                        }}
                        onClick={() => document.getElementById('client-contract-file-upload-input')?.click()}
                        className="p-8 text-center space-y-4 hover:bg-[#ffecf8]/20 transition-all cursor-pointer"
                        style={{ borderRadius: '13px', border: 'none', backgroundColor: '#fdecff' }}
                      >
                        <input
                          type="file"
                          id="client-contract-file-upload-input"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
                            if (file.size > MAX_SIZE_BYTES) {
                              alert(`Le fichier dépasse la limite standard de 10 Mo (poids du fichier sélectionné : ${(file.size / (1024 * 1024)).toFixed(2)} Mo).`);
                              return;
                            }
                            setContractFile(file);
                          }}
                        />
                        
                        <div className="font-sans" style={{ fontSize: '16px', color: '#000000' }}>
                          {contractFile ? (
                            <span className="font-bold inline-block" style={{ fontSize: '16px', padding: '9px 16px', backgroundColor: '#501655', border: 'none', color: '#ffffff', borderRadius: '9999px' }}>
                              Fichier contrat : {contractFile.name} ({(contractFile.size / (1024 * 1024)).toFixed(2)} Mo)
                            </span>
                          ) : (
                            <span style={{ color: '#000000', fontSize: '16px' }}>
                              Cliquez dans cette zone ou glissez directement votre fichier.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="client-tab-container">
      {/* Upper Action Block & Search metrics */}
      <div 
        className="bg-white space-y-4"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '98%', margin: 'auto', padding: '20px', backgroundColor: '#ffffff' }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-gochi" id="client-tab-title" style={{ color: '#000000', cursor: 'default' }}>Clients</h2>
          </div>

          {/* Both search and buttons are placed directly next to the title */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Field recherche (Search input) with size reduced */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                id="search-clients-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                id="btn-refresh-clients"
                style={customButtonStyle}
              >
                Actualiser
              </button>
              <button
                onClick={openAddModal}
                id="btn-add-client"
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

      {/* Main Table Records Sheet */}
      <div className="bg-white overflow-hidden mt-6 rounded-none" style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}>
        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="p-16 text-center font-sans lg:py-24" id="no-clients-view">
              <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100 }}>Aucun résultat</p>
            </div>
          ) : (
            <table className="w-full text-left font-sans border-collapse text-xs" id="clients-table" style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}>
              <thead>
                <tr className="bg-transparent border-b border-slate-100">
                  <th className="px-4 py-3.5 w-12 text-center" style={thStyle}>Volume.</th>
                  <th className="px-4 py-3.5" style={thStyle}>Entreprise.</th>
                  <th className="px-4 py-3.5" style={thStyle}>Numéro fiscal.</th>
                  <th className="px-4 py-3.5" style={thStyle}>Contrat.</th>
                  <th className="px-4 py-3.5 text-right w-12" style={thStyle}>Actions.</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-xs">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    id={`client-row-${client.id}`}
                    onClick={() => openEditModal(client)}
                    className="group hover:bg-[#ffecf8] transition-all cursor-pointer"
                  >
                    {/* Defib count pill */}
                    <td className="px-4 py-5 text-center whitespace-nowrap">
                      {(() => {
                        const count = defibrillateurs.filter(d => d.clientId === client.id).length;
                        return (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 text-[11px] font-black text-white bg-[#fe4eba] rounded-full font-sans">
                            {count}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Denomination */}
                    <td className="px-4 py-5 font-sans" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                      <div className="font-semibold text-slate-950 whitespace-nowrap truncate max-w-[200px]" title={client.denomination}>
                        {client.denomination.length > 20 ? client.denomination.substring(0, 20) + '...' : client.denomination}
                      </div>
                    </td>

                    {/* SIRET */}
                    <td className="px-4 py-5 font-sans whitespace-nowrap" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                      <div 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          border: '1px solid rgb(231, 231, 231)',
                          borderRadius: '1000px',
                          padding: '4px 12px',
                          backgroundColor: '#ffffff'
                        }} 
                        className="whitespace-nowrap"
                      >
                        {client.siret}
                      </div>
                    </td>

                    {/* Nom et Ref Contrat */}
                    <td className="px-4 py-5 font-sans" style={{ fontSize: '16px', color: '#000000', fontWeight: 100 }}>
                      {client.contrat === 'Oui' ? (
                        <p className="font-semibold text-slate-800">{client.nomContrat}</p>
                      ) : null}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const defibCount = defibrillateurs.filter(d => d.clientId === client.id).length;
                        const isDeleteDisabled = defibCount > 0;
                        return (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openEditModal(client)}
                              id={`btn-edit-client-${client.id}`}
                              style={rowActionButton18Style}
                              className="cursor-pointer"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => {
                                if (isDeleteDisabled) return;
                                if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${client.denomination}" ?`)) {
                                  onDeleteClient(client.id);
                                }
                              }}
                              disabled={isDeleteDisabled}
                              id={`btn-delete-client-${client.id}`}
                              style={{
                                ...rowActionButton18Style,
                                opacity: isDeleteDisabled ? 0.4 : 1,
                                cursor: isDeleteDisabled ? 'not-allowed' : 'pointer'
                              }}
                              className={isDeleteDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            >
                              Supprimer
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ fontSize: '18px', color: '#000000', fontWeight: 'bold', cursor: 'default' }} className="p-4 font-sans text-left" id="client-tab-total-summary">
        Total clients (Tous): {clients.length}.
      </div>
    </div>
  );
}
