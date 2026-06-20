import React, { useState, useRef, useEffect } from 'react';
import { Client } from '../types';

interface GmaoOtherEquipmentCorrectionFormProps {
  otherEquipment: any;
  clients: Client[];
  onCancel: () => void;
  onSave: (payload: any) => void;
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
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all bg-white col-span-1 ${isChecked ? 'border-[#fe4eba]' : 'border-slate-300'}`}>
        {isChecked && <span className="w-2.5 h-2.5 rounded-full bg-[#fe4eba]" />}
      </span>
      {label}
    </button>
  );
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

export default function GmaoOtherEquipmentCorrectionForm({
  otherEquipment,
  clients,
  onCancel,
  onSave
}: GmaoOtherEquipmentCorrectionFormProps) {
  // Section 1 - Client fields
  const [clientId, setClientId] = useState(otherEquipment?.clientId || '');
  const [nomPrenomSite, setNomPrenomSite] = useState(otherEquipment?.nomPrenomSite || '');
  const [telephoneSite, setTelephoneSite] = useState(otherEquipment?.telephoneSite || '');
  const [emailSite, setEmailSite] = useState(otherEquipment?.emailSite || '');
  const [contrat, setContrat] = useState<'Oui' | 'Non'>(otherEquipment?.contrat || 'Oui');
  const [nomContrat, setNomContrat] = useState(otherEquipment?.nomContrat || '');
  const [referenceContrat, setReferenceContrat] = useState(otherEquipment?.referenceContrat || '');
  const [debutContrat, setDebutContrat] = useState(otherEquipment?.debutContrat || '');
  const [finContrat, setFinContrat] = useState(otherEquipment?.finContrat || '');

  // Lookups search
  const [clientSearchText, setClientSearchText] = useState(() => {
    const cl = clients.find(c => c.id === (otherEquipment?.clientId || ''));
    return cl ? `${cl.denomination} (${cl.siret || cl.id})` : '';
  });
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Section 2 - Localisation
  const [numeroVoie, setNumeroVoie] = useState(otherEquipment?.numeroVoie || '');
  const [ville, setVille] = useState(otherEquipment?.ville || '');
  const [codePostal, setCodePostal] = useState(otherEquipment?.codePostal || '');
  const [region, setRegion] = useState(otherEquipment?.region || '');
  const [pays, setPays] = useState(otherEquipment?.pays || 'France');
  const [latitude, setLatitude] = useState(otherEquipment?.latitude || '');
  const [longitude, setLongitude] = useState(otherEquipment?.longitude || '');
  const [aideAcces, setAideAcces] = useState(otherEquipment?.aideAcces || '');
  const [accesPermanent, setAccesPermanent] = useState<'Oui' | 'Non'>(otherEquipment?.accesPermanent || 'Oui');
  const [accesJoursOuvres, setAccesJoursOuvres] = useState<'Oui' | 'Non'>(otherEquipment?.accesJoursOuvres || 'Oui');
  const [accesWeekend, setAccesWeekend] = useState<'Oui' | 'Non'>(otherEquipment?.accesWeekend || 'Non');
  const [installeExterieur, setInstalleExterieur] = useState<'Oui' | 'Non'>(otherEquipment?.installeExterieur || 'Non');

  // Section 3 - Dates
  const [expirationGarantie, setExpirationGarantie] = useState(otherEquipment?.expirationGarantie || '');
  const [fabrication, setFabrication] = useState(otherEquipment?.fabrication || '');
  const [miseEnService, setMiseEnService] = useState(otherEquipment?.miseEnService || '');
  const [derniereMaintenance, setDerniereMaintenance] = useState(otherEquipment?.derniereMaintenance || '');
  const [sortieUsine, setSortieUsine] = useState(otherEquipment?.sortieUsine || '');
  const [prochaineMaintenance, setProchaineMaintenance] = useState(otherEquipment?.prochaineMaintenance || '');

  // Section 4 - Catégorie and Identifiant
  const [categorie, setCategorie] = useState(otherEquipment?.categorie || 'Extincteur');
  const [identifiant, setIdentifiant] = useState(otherEquipment?.identifiant || '');

  // Section 5 - Specifiques
  const [specifiques, setSpecifiques] = useState<Record<string, any>>(otherEquipment?.specifiques || {});

  // Photograph & Signature fields
  const [photoUrl, setPhotoUrl] = useState(otherEquipment?.photoUrl || '');
  const [techSignature, setTechSignature] = useState(otherEquipment?.techSignature || '');
  const [endTimeStamp, setEndTimeStamp] = useState(otherEquipment?.endTimeStamp || '');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Helper to handle date next maintenance +12m
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

  // Loading signature canvas if available
  useEffect(() => {
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

  // Client search engine
  const filteredClientsForDropdown = clients.filter(c => {
    if (!clientSearchText) return true;
    const term = clientSearchText.toLowerCase();
    return (
      c.denomination.toLowerCase().includes(term) ||
      (c.siret && c.siret.toLowerCase().includes(term)) ||
      c.id.toLowerCase().includes(term)
    );
  });

  const handleClientSelect = (cId: string) => {
    const cl = clients.find(c => c.id === cId);
    if (cl) {
      setClientId(cl.id);
      setClientSearchText(`${cl.denomination} (${cl.siret || cl.id})`);
      setIsClientDropdownOpen(false);
    }
  };

  const handleSpecifiqueChange = (key: string, value: any) => {
    setSpecifiques(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Base64 file converter
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const r = new FileReader();
      r.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
        }
      };
      r.readAsDataURL(files[0]);
    }
  };

  const triggerCameraInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Canvas drawing Helpers
  const getEventCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      const me = e as React.MouseEvent;
      return {
        x: me.clientX - rect.left,
        y: me.clientY - rect.top
      };
    }
  };

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
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas) {
        setTechSignature(canvas.toDataURL());
        if (!endTimeStamp) {
          const nowStr = new Date().toLocaleString('fr-FR');
          setEndTimeStamp(nowStr);
        }
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setTechSignature('');
        setEndTimeStamp('');
      }
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const snapshotPayload = {
      ...otherEquipment,
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
      identifiant,
      specifiques,
      endTimeStamp: endTimeStamp || new Date().toLocaleString('fr-FR'),
      photoUrl: photoUrl || undefined,
      techSignature: techSignature || undefined
    };

    setTimeout(() => {
      onSave({
        title: `RAPPORT TECHNIQUE - ${categorie.toUpperCase()}`,
        defibSnapshot: snapshotPayload, // store other equipment inside defibSnapshot so existing backoffice table properties resolve automatically
        photoUrl: photoUrl || undefined,
        techSignature: techSignature || undefined,
        endTimeStamp: endTimeStamp || new Date().toLocaleString('fr-FR')
      });
      setSaving(false);
    }, 1500);
  };

  const rowActionButton18Style: React.CSSProperties = {
    fontFamily: '"DefibeoMain", "Civilprom", sans-serif',
    fontWeight: 100,
    fontSize: '18px',
    padding: '11px 20px',
    borderRadius: '13px',
    border: '1px solid rgb(218, 218, 218)',
    backgroundColor: '#ffffff',
    color: '#000000',
    transition: 'all 0.15s ease'
  };

  return (
    <div className="w-full space-y-6 font-sans animate-fadeIn text-black pb-12" id="gmao-other-eq-correction-layout">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '100%', margin: 'auto', padding: '20px' }}
      >
        <div>
          <h3 className="text-2xl font-bold font-gochi" style={{ color: '#000000', cursor: 'default' }}>
            RAPPORT AUTRE MATÉRIEL
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...rowActionButton18Style,
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '1px solid #000000',
            }}
            className="transition-colors cursor-pointer font-semibold"
          >
            Fermer
          </button>

          <button
            type="submit"
            form="other-eq-core-form"
            disabled={saving}
            style={{
              ...rowActionButton18Style,
              backgroundColor: 'rgb(53, 86, 236)',
              color: '#ffffff',
              border: '1px solid rgb(53, 86, 236)',
              opacity: saving ? 0.5 : 1,
            }}
            className="transition-all cursor-pointer font-semibold"
          >
            Enregistrer
          </button>
        </div>
      </div>

      <div className="w-full mt-6" style={{ marginTop: '24px' }}>
        <style>{`
          #other-eq-core-form input:not([type="radio"]):not([type="checkbox"]),
          #other-eq-core-form select,
          #other-eq-core-form textarea {
            padding: 12px !important;
            border: 1px solid #dedede !important;
            border-radius: 13px !important;
            font-size: 16px !important;
            font-weight: 100 !important;
            background: #ffffff !important;
            color: #000000 !important;
            outline: none !important;
            width: 100% !important;
          }
          #other-eq-core-form input:not([type="radio"]):not([type="checkbox"]):hover,
          #other-eq-core-form input:not([type="radio"]):not([type="checkbox"]):focus,
          #other-eq-core-form select:hover,
          #other-eq-core-form select:focus,
          #other-eq-core-form textarea:hover,
          #other-eq-core-form textarea:focus {
            outline: 2.5px solid #fa53d5 !important;
            outline-offset: 2px !important;
          }
          #other-eq-core-form label {
            font-size: 14px !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          #other-eq-core-form input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            -webkit-appearance: none;
          }
        `}</style>
        
        <form onSubmit={handleSubmit} id="other-eq-core-form" className="space-y-4">
          
          {/* SECTION 1 - CLIENT */}
          <div className="bg-white p-5 space-y-3" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <div className="mb-2">
              <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
                1 — Client
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Sélection du client.</label>
                <input
                  type="text"
                  value={clientSearchText}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onChange={(e) => {
                    setClientSearchText(e.target.value);
                    setIsClientDropdownOpen(true);
                    if (clientId) setClientId('');
                  }}
                  onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 250)}
                  placeholder="Rechercher un client."
                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs"
                />
                {isClientDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg mt-1 shadow-lg divide-y divide-slate-100">
                    {filteredClientsForDropdown.length === 0 ? (
                      <div className="p-3 text-slate-500 text-xs">Aucun client trouvé</div>
                    ) : (
                      filteredClientsForDropdown.map(c => {
                        const labelStr = `${c.denomination} (${c.siret || c.id})`;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => handleClientSelect(c.id)}
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

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Contact.</label>
                <input type="text" value={nomPrenomSite} onChange={(e) => setNomPrenomSite(e.target.value)} placeholder="Entrez un nom et prénom." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Téléphone du contact.</label>
                <input type="text" value={telephoneSite} onChange={(e) => setTelephoneSite(e.target.value)} placeholder="Entrez un numéro." />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Email du contact.</label>
                <input type="email" value={emailSite} onChange={(e) => setEmailSite(e.target.value)} placeholder="Entrez un email." />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="space-y-1 md:w-1/3">
                <label className="block text-[11px] font-bold text-slate-500">Contrat en cours.</label>
                <div className="flex items-center space-x-4 py-1">
                  <CustomPinkRadio value="Oui" currentValue={contrat} onChange={(val) => setContrat(val as 'Oui' | 'Non')} label="Oui" />
                  <CustomPinkRadio value="Non" currentValue={contrat} onChange={(val) => setContrat(val as 'Oui' | 'Non')} label="Non" />
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <label className="block text-[11px] font-bold text-slate-500">Titre du contrat.</label>
                <input type="text" value={nomContrat} onChange={(e) => setNomContrat(e.target.value)} placeholder="" disabled={contrat === 'Non'} />
              </div>
              <div className="space-y-1 flex-1">
                <label className="block text-[11px] font-bold text-slate-500">Référence du contrat.</label>
                <input type="text" value={referenceContrat} onChange={(e) => setReferenceContrat(e.target.value)} placeholder="" disabled={contrat === 'Non'} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Début du contrat.</label>
                <input type="date" value={debutContrat} onChange={(e) => setDebutContrat(e.target.value)} disabled={contrat === 'Non'} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Expiration du contrat.</label>
                <input type="date" value={finContrat} onChange={(e) => setFinContrat(e.target.value)} disabled={contrat === 'Non'} />
              </div>
            </div>
          </div>

          {/* SECTION 2 - LOCALISATION */}
          <div className="bg-white p-5 space-y-3" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <div className="mb-2">
              <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
                2 — Localisation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500">Numéro et voie.</label>
                <input type="text" value={numeroVoie} onChange={(e) => setNumeroVoie(e.target.value)} placeholder="Entrez un numéro et une rue." />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Ville.</label>
                <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Entrez une ville." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Code postal.</label>
                <input type="text" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} placeholder="Entrez un code postal." />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Région.</label>
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
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Pays.</label>
                <select value={pays} onChange={(e) => setPays(e.target.value)}>
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
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Latitude.</label>
                <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Longitude.</label>
                <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500">Aide d’accès.</label>
              <textarea value={aideAcces} onChange={(e) => setAideAcces(e.target.value)} rows={2} style={{ resize: 'none' }} placeholder="Entrez un commentaire." />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 uppercase">Accès permanent.</label>
                <div className="flex gap-4"><CustomPinkRadio value="Oui" currentValue={accesPermanent} onChange={(v) => setAccesPermanent(v as any)} label="Oui" /><CustomPinkRadio value="Non" currentValue={accesPermanent} onChange={(v) => setAccesPermanent(v as any)} label="Non" /></div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 uppercase">Accès jours ouvrés.</label>
                <div className="flex gap-4"><CustomPinkRadio value="Oui" currentValue={accesJoursOuvres} onChange={(v) => setAccesJoursOuvres(v as any)} label="Oui" /><CustomPinkRadio value="Non" currentValue={accesJoursOuvres} onChange={(v) => setAccesJoursOuvres(v as any)} label="Non" /></div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 uppercase">Accès week-end.</label>
                <div className="flex gap-4"><CustomPinkRadio value="Oui" currentValue={accesWeekend} onChange={(v) => setAccesWeekend(v as any)} label="Oui" /><CustomPinkRadio value="Non" currentValue={accesWeekend} onChange={(v) => setAccesWeekend(v as any)} label="Non" /></div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 uppercase">Installé en extérieur.</label>
                <div className="flex gap-4"><CustomPinkRadio value="Oui" currentValue={installeExterieur} onChange={(v) => setInstalleExterieur(v as any)} label="Oui" /><CustomPinkRadio value="Non" currentValue={installeExterieur} onChange={(v) => setInstalleExterieur(v as any)} label="Non" /></div>
              </div>
            </div>
          </div>

          {/* SECTION 3 - DATES */}
          <div className="bg-white p-5 space-y-3" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <div className="mb-2">
              <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
                3 — Dates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Date de fabrication.</label>
                <input type="date" value={fabrication} onChange={(e) => setFabrication(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Mise en service.</label>
                <input type="date" value={miseEnService} onChange={(e) => setMiseEnService(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Expiration de garantie.</label>
                <input type="date" value={expirationGarantie} onChange={(e) => setExpirationGarantie(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Sortie d'usine.</label>
                <input type="date" value={sortieUsine} onChange={(e) => setSortieUsine(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Dernière maintenance.</label>
                <input type="date" value={derniereMaintenance} onChange={(e) => handleDerniereMaintenanceChange(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Prochaine maintenance.</label>
                <input type="date" value={prochaineMaintenance} onChange={(e) => setProchaineMaintenance(e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECTION 4 - CATÉGORIE ENROULÉE */}
          <div className="bg-white p-5 space-y-3" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <div className="mb-2">
              <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
                4 — Catégorie et identifiant
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Catégorie.</label>
                <input type="text" value={categorie} readOnly className="bg-slate-100 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Identifiant unique.</label>
                <input type="text" value={identifiant} readOnly className="bg-slate-100 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* SECTION 5 - CHAMPS SPÉCIFIQUES */}
          <div className="bg-white p-5 space-y-3 font-sans text-black text-[15px]" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <div className="mb-2">
              <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
                5 — Caractéristiques Techniques : {categorie}
              </span>
            </div>

            <div className="pt-2">
              {/* 1. EXTINCTEUR */}
              {categorie === 'Extincteur' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Type d'agent extincteur</label>
                      <select value={specifiques.agentExtincteur || 'Eau pulvérisée'} onChange={(e) => handleSpecifiqueChange('agentExtincteur', e.target.value)}>
                        <option value="Eau pulvérisée">Eau pulvérisée</option>
                        <option value="CO2">CO2</option>
                        <option value="Poudre">Poudre</option>
                        <option value="Mousse">Mousse</option>
                        <option value="Unique">Unique</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Capacité de l'appareil</label>
                      <input type="text" value={specifiques.capacite || ''} placeholder="Ex: 6 Litres ou 2 kg" onChange={(e) => handleSpecifiqueChange('capacite', e.target.value)} />
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
                      <label>Niveau de charge de la batterie</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Correct" currentValue={specifiques.chargeBatterie || 'Correct'} onChange={(v) => handleSpecifiqueChange('chargeBatterie', v)} label="Correct" />
                        <CustomPinkRadio value="Insuffisant" currentValue={specifiques.chargeBatterie || 'Correct'} onChange={(v) => handleSpecifiqueChange('chargeBatterie', v)} label="Insuffisant" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Qualité du test audio</label>
                      <select value={specifiques.testAudio || 'Excellente'} onChange={(e) => handleSpecifiqueChange('testAudio', e.target.value)}>
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
                      <label>Filtre à remplacer</label>
                      <select value={specifiques.filtreRemplacer || 'Aucun'} onChange={(e) => handleSpecifiqueChange('filtreRemplacer', e.target.value)}>
                        <option value="Aucun">Aucun</option>
                        <option value="Pré-filtre">Pré-filtre</option>
                        <option value="HEPA H13">HEPA H13</option>
                        <option value="HEPA H14">HEPA H14</option>
                        <option value="Charbon actif">Charbon actif</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Pourcentage d'usure des filtres</label>
                      <input type="text" value={specifiques.usureFiltre || ''} placeholder="Ex: 45%" onChange={(e) => handleSpecifiqueChange('usureFiltre', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Vitesse du flux d'air</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Fonctionnel" currentValue={specifiques.fluxAir || 'Fonctionnel'} onChange={(v) => handleSpecifiqueChange('fluxAir', v)} label="Fonctionnel" />
                        <CustomPinkRadio value="Défectueux" currentValue={specifiques.fluxAir || 'Fonctionnel'} onChange={(v) => handleSpecifiqueChange('fluxAir', v)} label="Défectueux" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Propreté des capteurs</label>
                      <select value={specifiques.propreteCapteurs || 'Propre'} onChange={(e) => handleSpecifiqueChange('propreteCapteurs', e.target.value)}>
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
                      <label>Nature du panneau</label>
                      <select value={specifiques.naturePanneau || 'Évacuation'} onChange={(e) => handleSpecifiqueChange('naturePanneau', e.target.value)}>
                        <option value="Évacuation">Évacuation</option>
                        <option value="Danger / Interdiction">Danger / Interdiction</option>
                        <option value="Moyens de secours">Moyens de secours</option>
                        <option value="Sécurité incendie">Sécurité incendie</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Visibilité du panneau</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Visible" currentValue={specifiques.visibilite || 'Visible'} onChange={(v) => handleSpecifiqueChange('visibilite', v)} label="Visible" />
                        <CustomPinkRadio value="Masqué / Obstacle" currentValue={specifiques.visibilite || 'Visible'} onChange={(v) => handleSpecifiqueChange('visibilite', v)} label="Masqué / Obstacle" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Solidité de la fixation</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Correcte" currentValue={specifiques.solidiateFixation || 'Correcte'} onChange={(v) => handleSpecifiqueChange('solidiateFixation', v)} label="Correcte" />
                        <CustomPinkRadio value="Instable / À refaire" currentValue={specifiques.solidiateFixation || 'Correcte'} onChange={(v) => handleSpecifiqueChange('solidiateFixation', v)} label="Instable / À refaire" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Cohérence du fléchage d'évacuation</label>
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
                      <label>Type de bloc autonome</label>
                      <select value={specifiques.blocType || 'BAES Évacuation'} onChange={(e) => handleSpecifiqueChange('blocType', e.target.value)}>
                        <option value="BAES Évacuation">BAES Évacuation</option>
                        <option value="BAES Ambiance">BAES Ambiance</option>
                        <option value="BAEH Habitation">BAEH Habitation</option>
                        <option value="Bloc bi-fonction">Bloc bi-fonction</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Technologie du bloc</label>
                      <select value={specifiques.techBloc || 'SATI (Auto-testable)'} onChange={(e) => handleSpecifiqueChange('techBloc', e.target.value)}>
                        <option value="SATI (Auto-testable)">SATI (Auto-testable)</option>
                        <option value="Standard (Télécommandable)">Standard (Télécommandable)</option>
                        <option value="Connecté sans fil">Connecté sans fil</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Durée d'autonomie constatée</label>
                      <input type="text" value={specifiques.durreAutonomie || ''} placeholder="Ex: 1 h 15" onChange={(e) => handleSpecifiqueChange('durreAutonomie', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Test de commutation automatique</label>
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
                      <label>Type d'hydrant</label>
                      <select value={specifiques.typeHydrant || 'RIA DN25'} onChange={(e) => handleSpecifiqueChange('typeHydrant', e.target.value)}>
                        <option value="RIA DN25">RIA DN25</option>
                        <option value="RIA DN33">RIA DN33</option>
                        <option value="Poteau d'incendie">Poteau d'incendie</option>
                        <option value="Bouche d'incendie">Bouche d'incendie</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Pression hydrostatique (bars)</label>
                      <input type="text" value={specifiques.pressionEau || ''} placeholder="Ex: 3.5 bars" onChange={(e) => handleSpecifiqueChange('pressionEau', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label>Débit d'eau (L/min)</label>
                      <input type="text" value={specifiques.debitEau || ''} placeholder="Ex: 150 L/min" onChange={(e) => handleSpecifiqueChange('debitEau', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>État visuel du tuyau / lance</label>
                      <select value={specifiques.etatTuyau || 'Parfait état'} onChange={(e) => handleSpecifiqueChange('etatTuyau', e.target.value)}>
                        <option value="Parfait état">Parfait état</option>
                        <option value="Légère usure sans fuite">Légère usure sans fuite</option>
                        <option value="Craquelé / À remplacer">Craquelé / À remplacer</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Accessibilité permanente de la zone</label>
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
                      <label>Date limite de remplacement</label>
                      <input type="text" value={specifiques.remplacementMax || ''} placeholder="Ex: Décembre 2031" onChange={(e) => handleSpecifiqueChange('remplacementMax', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label>Test déclenchement aérosol</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Positif" currentValue={specifiques.declenchementAerosol || 'Positif'} onChange={(v) => handleSpecifiqueChange('declenchementAerosol', v)} label="Positif" />
                        <CustomPinkRadio value="Négatif" currentValue={specifiques.declenchementAerosol || 'Positif'} onChange={(v) => handleSpecifiqueChange('declenchementAerosol', v)} label="Négatif" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Vérifier l'absence de signal pile faible</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Aucun signal" currentValue={specifiques.testPileFaible || 'Aucun signal'} onChange={(v) => handleSpecifiqueChange('testPileFaible', v)} label="Aucun signal" />
                        <CustomPinkRadio value="Signal actif / Alerte" currentValue={specifiques.testPileFaible || 'Aucun signal'} onChange={(v) => handleSpecifiqueChange('testPileFaible', v)} label="Signal actif" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Empoussièrement de la chambre</label>
                      <select value={specifiques.propreteChambre || 'Propre'} onChange={(e) => handleSpecifiqueChange('propreteChambre', e.target.value)}>
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
                      <label>Type de centrale</label>
                      <select value={specifiques.stextContent || 'ECS (Détection)'} onChange={(e) => handleSpecifiqueChange('stextContent', e.target.value)}>
                        <option value="ECS (Détection)">ECS (Détection)</option>
                        <option value="CMSI (Mise en sécurité)">CMSI (Mise en sécurité)</option>
                        <option value="SMSI (Système intégré)">SMSI (Système intégré)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>Tension des batteries (V)</label>
                      <input type="text" value={specifiques.tensionBat || ''} placeholder="Ex: 24.2 V" onChange={(e) => handleSpecifiqueChange('tensionBat', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label>Nombre de défauts (Historique)</label>
                      <input type="text" value={specifiques.historiqueDefauts || ''} placeholder="Ex: 0" onChange={(e) => handleSpecifiqueChange('historiqueDefauts', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Voyant de dérangement</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Aucun défaut" currentValue={specifiques.absenceVoyant || 'Aucun défaut'} onChange={(v) => handleSpecifiqueChange('absenceVoyant', v)} label="Aucun défaut" />
                        <CustomPinkRadio value="Dérangement présent" currentValue={specifiques.absenceVoyant || 'Aucun défaut'} onChange={(v) => handleSpecifiqueChange('absenceVoyant', v)} label="Dérangement" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Test de transmission alarme</label>
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
                      <label>Mode de télécommande</label>
                      <select value={specifiques.telecommande || 'Pneumatique (CO2)'} onChange={(e) => handleSpecifiqueChange('telecommande', e.target.value)}>
                        <option value="Pneumatique (CO2)">Pneumatique (CO2)</option>
                        <option value="Électrique (24V/48V)">Électrique (24V/48V)</option>
                        <option value="Mécanique (Câble)">Mécanique (Câble)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label>État des cartouches / fusibles</label>
                      <select value={specifiques.cartouchesGaz || 'Intactes'} onChange={(e) => handleSpecifiqueChange('cartouchesGaz', e.target.value)}>
                        <option value="Intactes">Intactes</option>
                        <option value="Percées / À remplacer">Percées / À remplacer</option>
                        <option value="Non applicable">Non applicable</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>Ouverture de l'exutoire</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Ouverture totale" currentValue={specifiques.exutoireOuverture || 'Ouverture totale'} onChange={(v) => handleSpecifiqueChange('exutoireOuverture', v)} label="Totale" />
                        <CustomPinkRadio value="Ouverture partielle / Blocage" currentValue={specifiques.exutoireOuverture || 'Ouverture totale'} onChange={(v) => handleSpecifiqueChange('exutoireOuverture', v)} label="Partielle" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label>Facilité de réarmement</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Réarmé avec succès" currentValue={specifiques.rearmement || 'Réarmé avec succès'} onChange={(v) => handleSpecifiqueChange('rearmement', v)} label="Réussi" />
                        <CustomPinkRadio value="Blocage au réarmement" currentValue={specifiques.rearmement || 'Réarmé avec succès'} onChange={(v) => handleSpecifiqueChange('rearmement', v)} label="Blocage" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label>État des câbles / poulies</label>
                      <div className="flex space-x-4 py-1">
                        <CustomPinkRadio value="Bon état" currentValue={specifiques.etatPoulies || 'Bon état'} onChange={(v) => handleSpecifiqueChange('etatPoulies', v)} label="Bon état" />
                        <CustomPinkRadio value="Usure prononcée / À remplacer" currentValue={specifiques.etatPoulies || 'Bon état'} onChange={(v) => handleSpecifiqueChange('etatPoulies', v)} label="Usure / À remplacer" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commentaire de visite technique */}
              <div className="space-y-1 mt-4 pt-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Commentaire de visite technique (Une seule ligne)</label>
                <input
                  type="text"
                  value={specifiques.commentaire || ''}
                  placeholder="Ex: RAS. Tout est conforme aux normes."
                  onChange={(e) => handleSpecifiqueChange('commentaire', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ADDED INTERACTIVE SECTIONS FOR TECHNICIANS: PHOTO & SIGNATURE */}
          
          {/* Photo Cliché */}
          <div className="bg-white p-5 space-y-4 shadow-sm" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold mb-2" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
              6 — Preuve Visuelle
            </span>
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                Photographie du matériel.
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
              {photoUrl && (
                <div className="mt-3">
                  <img src={photoUrl} alt="Intervention audit" className="max-h-48 rounded-lg shadow border" />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 7: SIGNATURE */}
          <div className="bg-white p-5 space-y-4 shadow-sm" style={{ border: '1px solid rgb(218, 218, 218)', borderRadius: '18px' }}>
            <span className="text-white px-3 py-1 text-[13px] inline-block font-semibold" style={{ backgroundColor: 'oklch(0.44 0.16 324.65)', borderRadius: '1000px' }}>
              7 — Clôture & Signature
            </span>

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
                      onClick={clearCanvas}
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
          </div>

        </form>
      </div>
    </div>
  );
}
