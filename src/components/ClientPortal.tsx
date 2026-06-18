import React, { useState } from 'react';
import { Client, Defibrillateur, CommercialDoc, CompanyInfo, Variable, OtherEquipment } from '../types';
import { formatDateToFR, computeProchaineMaintenance } from '../utils';

interface ClientPortalProps {
  clients: Client[];
  defibrillateurs: Defibrillateur[];
  otherEquipments?: OtherEquipment[];
  commercialDocs: CommercialDoc[];
  variables: Variable[];
  onClose: () => void;
  onLogout: () => void;
  initialClient?: Client | null;
  companyInfo: CompanyInfo;
  generatedReports?: any[];
}

export default function ClientPortal({
  clients,
  defibrillateurs,
  otherEquipments = [],
  commercialDocs,
  variables,
  onClose,
  onLogout,
  initialClient = null,
  companyInfo,
  generatedReports = [],
}: ClientPortalProps) {
  const [activePortalTab, setActivePortalTab] = useState<'defibs' | 'bills' | 'reports' | 'info'>('defibs');

  const authenticatedClient = initialClient;

  // Filter content for the logged-in client
  const clientDefibs = authenticatedClient
    ? defibrillateurs.filter((df) => df.clientId === authenticatedClient.id)
    : [];

  const clientOthers = authenticatedClient
    ? otherEquipments.filter((oth) => oth.clientId === authenticatedClient.id)
    : [];

  const clientDocs = authenticatedClient
    ? commercialDocs.filter((doc) => doc.clientId === authenticatedClient.id)
    : [];

  // Downloader for Devis et Factures
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
            body { background: white !important; padding: 0 !important; }
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

        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Downloader for Reports
  const handleDownloadReport = (rep: any) => {
    const snap = rep.defibSnapshot || {};
    const isOther = snap.categorie && snap.categorie !== 'Défibrillateur';
    
    let content = '';
    if (isOther) {
      content = `===========================================
${rep.title || 'RAPPORT TECHNIQUE - ' + snap.categorie.toUpperCase()}
===========================================
Référence du Rapport      : ${rep.id}
Date de l'intervention    : ${rep.date || ''}
Technicien                : ${rep.techName || ''}
Matériel                  : ${rep.defibIdentifiant || snap.identifiant || ''}
Catégorie                 : ${snap.categorie || 'Autre matériel'}
Site / Mission de tournée : ${rep.siteMission || ''}

-------------------------------------------
Détails supplémentaires :
État de fonctionnement : Conforme et validé avec succès
Document certifié conforme par le représentant technique.
===========================================
${companyInfo.name || 'Défibeo Solutions'}
Merci pour votre collaboration de sécurité.
`;
    } else {
      content = `===========================================
${rep.title || 'RAPPORT DE MAINTENANCE DÉFIBRILLATEUR'}
===========================================
Référence du Rapport      : ${rep.id}
Date de l'intervention    : ${rep.date || ''}
Technicien                : ${rep.techName || ''}
Défibrillateur            : ${rep.defibIdentifiant || ''} (ID: ${rep.defibId || ''})
Site / Mission de tournée : ${rep.siteMission || ''}

-------------------------------------------
Détails supplémentaires :
État de fonctionnement : Conforme et validé avec succès
Document certifié conforme par le représentant technique.
===========================================
${companyInfo.name || 'Défibeo Solutions'}
Merci pour votre collaboration de sécurité.
`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rapport_${rep.id || 'maintenance'}.txt`);
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
        className="sticky top-0 z-50 px-4 py-5 shrink-0 border-b border-purple-950/20 shadow-md bg-gradient-to-r from-[#7e2e86] to-[#36093a]"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between font-sans">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-lg font-black text-white animate-fadeIn" style={{ letterSpacing: 'normal' }}>
              {companyInfo?.name || 'Défibeo Solutions'}
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              {companyInfo?.phone && (
                <a
                  href={`tel:${companyInfo.phone}`}
                  className="px-5 py-2 text-base font-medium bg-white/10 hover:bg-white/20 select-all text-white border border-white/15 rounded-full flex items-center transition-all duration-200 outline-none hover:opacity-100"
                >
                  <span>{companyInfo.phone}</span>
                </a>
              )}
              {companyInfo?.email && (
                <a
                  href={`mailto:${companyInfo.email}`}
                  className="px-5 py-2 text-base font-medium bg-white/10 hover:bg-white/20 select-all text-white border border-white/15 rounded-full flex items-center transition-all duration-200 outline-none hover:opacity-100"
                >
                  <span>{companyInfo.email}</span>
                </a>
              )}
            </div>
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
            Défibrillateurs & Autres matériels
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
            onClick={() => setActivePortalTab('reports')}
            className={`w-full sm:flex-1 py-3 sm:py-2 text-center text-[18px] font-bold text-black transition-all border-0 cursor-pointer ${
              activePortalTab === 'reports'
                ? 'bg-white shadow-xs'
                : 'bg-transparent hover:bg-white/45'
            }`}
            style={{ borderRadius: '12px' }}
          >
            Rapports PDF
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
          
          {/* Section 1: Défibrillateurs & Autres matériels */}
          {activePortalTab === 'defibs' && (
            (clientDefibs.length === 0 && clientOthers.length === 0) ? (
              <div className="p-10 text-center font-sans">
                <p className="text-black font-light text-[16px]">Aucun équipement enregistré.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {clientDefibs.length > 0 && (
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
                          <div className="flex items-center justify-between">
                            <h2 className="text-[18px] font-black text-[#7e2e86] select-none" style={{ letterSpacing: 'normal' }}>
                              {df.identifiant}
                            </h2>
                            <span 
                              className="px-3 py-1 text-xs font-bold font-sans text-[#7e2e86] bg-purple-50 border border-purple-200"
                              style={{ borderRadius: '1000px' }}
                            >
                              Défibrillateur
                            </span>
                          </div>
                          
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
                )}

                {clientOthers.length > 0 && (
                  <div className="space-y-6">
                    {clientOthers.map((oth) => {
                      const expireGarantie = formatDateToFR(oth.expirationGarantie) || oth.expirationGarantie;
                      const derniereMaint = formatDateToFR(oth.derniereMaintenance) || oth.derniereMaintenance;
                      const prochaineMaint = formatDateToFR(oth.prochaineMaintenance) || oth.prochaineMaintenance;
                      const miseServ = formatDateToFR(oth.miseEnService) || oth.miseEnService;

                      return (
                        <div
                          key={oth.id}
                          className="bg-white p-5 space-y-4"
                          style={{
                            border: '1px solid #cfcfcf',
                            borderRadius: '13px',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <h2 className="text-[18px] font-black text-[#7e2e86] select-none" style={{ letterSpacing: 'normal' }}>
                              {oth.identifiant}
                            </h2>
                            <span 
                              className="px-3 py-1 text-xs font-bold font-sans text-rose-600 bg-rose-50 border border-rose-200"
                              style={{ borderRadius: '1000px' }}
                            >
                              {oth.categorie}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {renderField('Identifiant', oth.identifiant)}
                            {renderField('Catégorie', oth.categorie)}
                            {renderField('Série', oth.specifiques?.numeroSerie || '-')}
                            {renderField('Contrat en cours', oth.contrat || 'Non')}
                            {renderField('Numéro et voie', oth.numeroVoie)}
                            {renderField('Ville', oth.ville)}
                            {renderField('Code postal', oth.codePostal || '')}
                            {renderField('Région', oth.region || '')}
                            {renderField('Pays', oth.pays || '')}
                            {renderField('Expiration de garantie', expireGarantie)}
                            {renderField('Dernière maintenance', derniereMaint)}
                            {renderField('Prochaine maintenance', prochaineMaint)}
                            {renderField('Mise en service', miseServ)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* Section 2: Devis et factures */}
          {activePortalTab === 'bills' && (
            clientDocs.length === 0 ? null : (
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

          {/* Section 4: Rapports PDF */}
          {activePortalTab === 'reports' && (
            (() => {
              const clientDefibIds = new Set(clientDefibs.map(df => df.id));
              const clientDefibIdents = new Set(clientDefibs.map(df => df.identifiant));
              const clientOtherIds = new Set(clientOthers.map(o => o.id));
              const clientOtherIdents = new Set(clientOthers.map(o => o.identifiant));

              const clientReports = generatedReports.filter(rep => {
                const snapClientId = rep.defibSnapshot?.clientId;
                if (snapClientId && snapClientId === authenticatedClient.id) return true;
                if (rep.defibId && (clientDefibIds.has(rep.defibId) || clientOtherIds.has(rep.defibId))) return true;
                if (rep.defibIdentifiant && (clientDefibIdents.has(rep.defibIdentifiant) || clientOtherIdents.has(rep.defibIdentifiant))) return true;
                return false;
              });

              const formatTitle = (str: string) => {
                const s = (str || 'Constat de maintenance').trim();
                if (!s) return '';
                return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
              };

              return clientReports.length === 0 ? (
                <div className="p-10 text-center font-sans">
                  <p className="text-black font-light text-[16px]">Aucun rapport disponible.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {clientReports.map((rep) => {
                    const snap = rep.defibSnapshot || {};
                    const isOther = snap.categorie && snap.categorie !== 'Défibrillateur';
                    return (
                      <div
                        key={rep.id}
                        className="bg-white p-5 space-y-4"
                        style={{
                          border: '1px solid #cfcfcf',
                          borderRadius: '13px',
                        }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h2 className="text-[18px] font-black text-[#7e2e86]" style={{ letterSpacing: 'normal' }}>
                            {formatTitle(rep.title)}
                          </h2>
                          <button
                            onClick={() => handleDownloadReport(rep)}
                            style={{
                              backgroundColor: '#3556ec',
                              color: '#ffffff',
                              boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #077ac7, inset 0 6px 12px #ffffff1f',
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
                          {renderField('Référence Rapport', rep.id)}
                          {renderField(isOther ? 'Matériel concerné' : 'Défibrillateur concerné', rep.defibIdentifiant || snap.identifiant || 'Non spécifié')}
                          {renderField('Date d\'intervention', rep.date)}
                          {renderField('Technicien intervenant', rep.techName)}
                          {renderField('Site / Mission', rep.siteMission || '-')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
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
