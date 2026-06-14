import React, { useState } from 'react';
import { Client, Defibrillateur, CommercialDoc, CompanyInfo, Variable } from '../types';
import { formatDateToFR, computeProchaineMaintenance } from '../utils';

interface ClientPortalProps {
  clients: Client[];
  defibrillateurs: Defibrillateur[];
  commercialDocs: CommercialDoc[];
  variables: Variable[];
  onClose: () => void;
  onLogout: () => void;
  initialClient?: Client | null;
  companyInfo: CompanyInfo;
}

export default function ClientPortal({
  clients,
  defibrillateurs,
  commercialDocs,
  variables,
  onClose,
  onLogout,
  initialClient = null,
  companyInfo,
}: ClientPortalProps) {
  const [activePortalTab, setActivePortalTab] = useState<'defibs' | 'bills' | 'info'>('defibs');

  const authenticatedClient = initialClient;

  // Filter content for the logged-in client
  const clientDefibs = authenticatedClient
    ? defibrillateurs.filter((df) => df.clientId === authenticatedClient.id)
    : [];

  const clientDocs = authenticatedClient
    ? commercialDocs.filter((doc) => doc.clientId === authenticatedClient.id)
    : [];

  // Downloader for Devis et Factures
  const handleDownloadDoc = (doc: CommercialDoc) => {
    const itemsList = doc.items.map(it => `- ${it.nomPiece} (Qté: ${it.quantite}) : ${it.prixVenteHt.toFixed(2)} € HT`).join('\r\n');
    const content = `===========================================
${doc.type.toUpperCase()} : ${doc.ref}
===========================================
Type de document  : ${doc.type}
Référence         : ${doc.ref}
Situation / État  : ${doc.status}
Date d'émission   : ${doc.dateStr}
Client            : ${doc.clientDenomination}

Détails des prestations / articles :
${itemsList}

-------------------------------------------
Total HT          : ${doc.totalHt.toFixed(2)} €
===========================================
Merci pour votre confiance.
Document généré et certifié conforme.
`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${doc.type.toLowerCase()}_${doc.ref}.txt`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state if client information is currently initializing
  if (!authenticatedClient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-[#7e2e86] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium font-sans">Chargement du portail client...</p>
        </div>
      </div>
    );
  }

  // Helper for displaying styled read-only attributes
  const renderField = (label: string, value: React.ReactNode) => {
    const trimmedLabel = label.trim();
    const labelWithPeriod = trimmedLabel.endsWith('.') ? trimmedLabel : `${trimmedLabel}.`;
    
    const rawValStr = value !== null && value !== undefined ? String(value).trim() : '';
    const hasValue = rawValStr !== '' && rawValStr !== '-';
    const displayValue = hasValue ? value : '-';

    return (
      <div className="space-y-1">
        <span 
          className="block font-semibold select-none"
          style={{ color: 'black', fontSize: '16px', textTransform: 'none' }}
        >
          {labelWithPeriod}
        </span>
        <div 
          className="select-text"
          style={{ 
            fontSize: '16px', 
            color: 'black', 
            fontWeight: 100,
            border: '1px solid #cfcfcf',
            borderRadius: '13px',
            padding: '12px 15px',
            cursor: 'default',
            backgroundColor: '#ffffff'
          }}
        >
          {displayValue}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* Top sticky navigation bar with requested maintainer title */}
      <header 
        className="sticky top-0 z-50 px-4 py-4 shrink-0 border-b border-purple-950/20 shadow-md bg-gradient-to-r from-[#7e2e86] to-[#36093a]"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between font-sans">
          <div>
            <h1 className="text-lg font-black text-white" style={{ letterSpacing: 'normal' }}>
              {companyInfo?.name || 'Défibeo Solutions'}
            </h1>
          </div>

          <div className="flex items-center">
            <button
              onClick={onLogout}
              className="px-5 py-2.5 text-[18px] text-white rounded-xl select-none cursor-pointer border-0 shadow-sm outline-none transition-none brightness-100 hover:brightness-100 hover:opacity-100 hover:scale-100 hover:bg-[#3556ec] active:bg-[#3556ec]"
              style={{
                boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #3556ec, inset 0 6px 12px #ffffff1f',
                background: '#3556ec',
                backgroundColor: '#3556ec',
                fontWeight: 100,
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
        
        {/* Navigation Tabs (Stacks vertically on mobile, horizontally on sm screens) */}
        <div 
          className="flex flex-col sm:flex-row gap-1.5 p-1.5 bg-slate-200/60"
          style={{ borderRadius: '13px' }}
        >
          <button
            onClick={() => setActivePortalTab('defibs')}
            className={`w-full sm:flex-1 py-3 sm:py-2 text-center text-[18px] font-bold text-black transition-all border-0 cursor-pointer ${
              activePortalTab === 'defibs'
                ? 'bg-white shadow-xs'
                : 'bg-transparent hover:bg-white/45'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Défibrillateurs
          </button>
          <button
            onClick={() => setActivePortalTab('bills')}
            className={`w-full sm:flex-1 py-3 sm:py-2 text-center text-[18px] font-bold text-black transition-all border-0 cursor-pointer ${
              activePortalTab === 'bills'
                ? 'bg-white shadow-xs'
                : 'bg-transparent hover:bg-white/45'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Devis et factures
          </button>
          <button
            onClick={() => setActivePortalTab('info')}
            className={`w-full sm:flex-1 py-3 sm:py-2 text-center text-[18px] font-bold text-black transition-all border-0 cursor-pointer ${
              activePortalTab === 'info'
                ? 'bg-white shadow-xs'
                : 'bg-transparent hover:bg-white/45'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Informations
          </button>
        </div>

        {/* Content Wrapper - Completely flat (NO padding, NO border, NO background) */}
        <div className="space-y-6">
          
          {/* Section 1: Défibrillateurs */}
          {activePortalTab === 'defibs' && (
            clientDefibs.length === 0 ? (
              <div 
                className="text-[18px] text-black font-semibold text-center py-12"
                style={{ fontSize: '18px', fontWeight: 'bold' }}
              >
                Aucun résultat.
              </div>
            ) : (
              <div className="space-y-6">
                {clientDefibs.map((df) => {
                  const modelNom = variables.find(v => v.id === df.modeleId)?.nom || df.modeleId || 'Non spécifié';
                  const electrodeAPeremp = formatDateToFR(df.peremptionElectrodeA) || df.peremptionElectrodeA;
                  const electrodePPeremp = formatDateToFR(df.peremptionElectrodeP) || df.peremptionElectrodeP;
                  const batteriePeremp = formatDateToFR(df.peremptionBatterie) || df.peremptionBatterie;

                  return (
                    <div
                      key={df.id}
                      className="bg-white p-5 space-y-4"
                      style={{
                        border: '1px solid #cfcfcf',
                        borderRadius: '13px',
                      }}
                    >
                      <h2 className="text-[18px] font-black text-[#7e2e86] select-none" style={{ letterSpacing: 'normal' }}>
                        {df.identifiant}
                      </h2>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {renderField('Identifiant', df.identifiant)}
                        {renderField('Série', df.numeroSerie)}
                        {renderField('Modèle', modelNom)}
                        {renderField('Contrat en cours', df.contrat || 'Non')}
                        {renderField('Numéro et voie', df.numVoie)}
                        {renderField('Ville', df.ville)}
                        {renderField('Code postal', df.cp)}
                        {renderField('Région', df.region)}
                        {renderField('Pays', df.pays)}
                        {renderField('Expiration de garantie', formatDateToFR(df.finGarantie) || df.finGarantie)}
                        {renderField('Dernière maintenance', formatDateToFR(df.derniereMaintenance) || df.derniereMaintenance)}
                        {renderField('Prochaine maintenance', formatDateToFR(computeProchaineMaintenance(df.derniereMaintenance)))}
                        {renderField('Électrode Adulte ou Mixte, Péremption', electrodeAPeremp)}
                        {renderField('Électrode Pédiatrique, Péremption', electrodePPeremp)}
                        {renderField('Batterie, Péremption', batteriePeremp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Section 2: Devis et factures */}
          {activePortalTab === 'bills' && (
            clientDocs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic">
                Aucun document commercial ou historique de facturation trouvé.
              </div>
            ) : (
              <div className="space-y-6">
                {clientDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white p-5 space-y-4"
                    style={{
                      border: '1px solid #cfcfcf',
                      borderRadius: '13px',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-[18px] font-black text-[#7e2e86]" style={{ letterSpacing: 'normal' }}>
                        {doc.ref}
                      </h2>
                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        style={{
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff1f',
                          borderRadius: '13px',
                          fontSize: '18px',
                          padding: '10px 20px',
                          fontWeight: '100',
                          transition: 'all 0s ease-in-out',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          border: 'none',
                        }}
                      >
                        Télécharger
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {renderField('Objet ou commentaire', doc.commentaire || doc.ref)}
                      {renderField('Type', doc.type)}
                      {renderField('Référence', doc.ref)}
                      {renderField('Situation', doc.status)}
                      {renderField('Total HT', `${doc.totalHt.toFixed(2)} €`)}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Section 3: Informations (contrat) */}
          {activePortalTab === 'info' && (
            <div
              className="bg-white p-5 list-none"
              style={{
                border: '1px solid #cfcfcf',
                borderRadius: '13px',
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderField('Entreprise', authenticatedClient.denomination)}
                {renderField('Identifiant fiscal', authenticatedClient.siret)}
                {renderField('Email', authenticatedClient.email)}
                {renderField('Téléphone', authenticatedClient.phone)}
                {renderField('Contrat', authenticatedClient.contrat || 'Non')}
                {renderField('Référence', authenticatedClient.referenceContrat)}
                {renderField('Début', formatDateToFR(authenticatedClient.debutContrat) || authenticatedClient.debutContrat)}
                {renderField('Fin', formatDateToFR(authenticatedClient.finContrat) || authenticatedClient.finContrat)}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
