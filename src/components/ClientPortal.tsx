import React, { useState, useRef, useEffect } from 'react';
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
  onUpdateClient?: (client: Client) => void;
  stocks?: any[];
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
  onUpdateClient,
  stocks = [],
}: ClientPortalProps) {
  const [activePortalTab, setActivePortalTab] = useState<'defibs' | 'bills' | 'reports' | 'info'>('defibs');

  const authenticatedClient = initialClient;

  // Signature related states & refs
  const [clientSignature, setClientSignature] = useState(authenticatedClient?.clientSignatureImage || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const clientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSig = useRef(false);

  useEffect(() => {
    if (authenticatedClient) {
      setClientSignature(authenticatedClient.clientSignatureImage || '');
    }
  }, [authenticatedClient]);

  useEffect(() => {
    if (activePortalTab === 'info' && clientSignature && clientCanvasRef.current) {
      const canvas = clientCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = clientSignature;
      }
    }
  }, [clientSignature, activePortalTab]);

  const startDrawingSig = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = clientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingSig.current = true;
    const pos = getEventCoordsSig(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const drawSig = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingSig.current) return;
    e.preventDefault();
    const canvas = clientCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventCoordsSig(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawingSig = () => {
    if (!isDrawingSig.current) return;
    isDrawingSig.current = false;
    const canvas = clientCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setClientSignature(dataUrl);
    }
  };

  const clearSignatureSig = () => {
    const canvas = clientCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setClientSignature('');
  };

  const getEventCoordsSig = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleSaveSignature = () => {
    if (!authenticatedClient) return;
    if (onUpdateClient) {
      const updated: Client = {
        ...authenticatedClient,
        clientSignatureImage: clientSignature || undefined,
      };
      onUpdateClient(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }
  };

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

          <!-- MENTIONS LEGALES ET CONDITIONS -->
          ${companyInfo.mentionsLegalesFactures || companyInfo.conditionsLegalesLink ? `
            <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
              ${companyInfo.mentionsLegalesFactures ? `<div style="font-size: 15px !important;">Mentions légales : ${companyInfo.mentionsLegalesFactures}</div>` : ''}
              ${companyInfo.conditionsLegalesLink ? `<div style="font-xs !important;">Conditions légales : <a href="${companyInfo.conditionsLegalesLink}" target="_blank" class="blue-link">${companyInfo.conditionsLegalesLink}</a></div>` : ''}
            </div>
          ` : ''}

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
  const handleDownloadReport = (report: any) => {
    const snapshot = report.defibSnapshot || defibrillateurs.find(d => d.id === report.defibId || d.identifiant === report.defibIdentifiant) || {};
    const isOther = snapshot.categorie && snapshot.categorie !== 'Défibrillateur';
    const clientFound = clients.find(c => c.id === snapshot.clientId);
    const clientName = clientFound ? clientFound.denomination : (snapshot.nomPrenomSite || 'Non rattaché');

    const compLogo = companyInfo.logo || '';
    const compName = companyInfo.name || 'Défibeo Solutions';
    const compEmail = companyInfo.email || '';
    const compPhone = companyInfo.phone || '';
    const compWebsite = companyInfo.website || '';

    let htmlContent = '';

    if (isOther) {
      // Filter out typical top-level keys to get custom equipment properties!
      const topLevelKeys = [
        'id', 'clientId', 'nomPrenomSite', 'telephoneSite', 'emailSite', 'contrat', 'nomContrat', 'referenceContrat',
        'debutContrat', 'finContrat', 'pays', 'codePostal', 'cp', 'ville', 'adresseComplexe', 'identifiant',
        'codeNfc', 'statutGmao', 'categorie', 'conforme', 'miseEnServiceDate', 'miseEnService', 'commentaireGmao'
      ];
      
      const customProperties = Object.entries(snapshot).filter(([k, v]) => {
        return !topLevelKeys.includes(k) && v !== undefined && v !== null && v !== '' && typeof v !== 'object';
      });

      htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || '-'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * {
              font-family: "Inter", sans-serif !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
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
              font-family: "Inter", sans-serif !important;
              font-size: 28px;
              font-weight: 800 !important;
              text-align: center;
              color: #1e1b4b;
              margin-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .pdf-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            }
            .pdf-card-header {
              padding: 10px 14px;
              font-size: 14px;
              font-weight: 700;
              background-color: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }
            .pdf-card-body {
              padding: 12px 14px;
              font-size: 13px;
              display: flex;
              flex-direction: column;
              gap: 6px;
              color: #1e293b;
            }
            .pdf-line {
              font-size: 13px;
              line-height: 1.4;
            }
            .pdf-label {
              color: #64748b;
              font-weight: 500;
            }
            .pdf-bold {
              color: #1e293b;
              font-weight: 600;
            }
            .pdf-footer {
              position: absolute;
              bottom: 15mm;
              left: 15mm;
              right: 15mm;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #cbd5e1;
              padding-top: 8px;
            }
          </style>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </head>
        <body class="bg-white">
          <div id="print-container">
            <!-- PAGE 1: FICHE TECHNIQUE GMAO -->
            <div class="pdf-page">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                  ${compLogo ? `<img src="${compLogo}" style="max-height: 50px; object-fit: contain; margin-bottom: 6px;" alt="Logo" referrerPolicy="no-referrer" />` : ''}
                  <div style="font-size: 12px; font-weight: bold; color: #1e1b4b;">${compName}</div>
                  <div style="font-size: 10px; color: #64748b;">${compEmail} | ${compPhone}</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b;">
                  <div>Rapport GMAO N° <strong style="color: #1e293b;">${report.id || 'N/A'}</strong></div>
                  <div>Date d'intervention : <strong style="color: #1e1b4b;">${report.date || '-'}</strong></div>
                </div>
              </div>

              <div class="pdf-header">RAPPORT DE MAINTENANCE GMAO</div>

              <div class="pdf-card">
                <div class="pdf-card-header">1. INFORMATIONS CLIENT & SITE</div>
                <div class="pdf-card-body">
                  <div class="pdf-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                      <div class="pdf-line"><span class="pdf-label">Client :</span> <span class="pdf-bold">${clientName}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Site / Mission :</span> <span class="pdf-bold">${report.siteMission || '-'}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Adresse :</span> <span class="pdf-bold">${snapshot.adresseComplexe || snapshot.ville || '-'}</span></div>
                    </div>
                    <div>
                      <div class="pdf-line"><span class="pdf-label">Technicien :</span> <span class="pdf-bold">${report.techName || '-'}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Identifiant matériel :</span> <span class="pdf-bold">${snapshot.identifiant || report.defibIdentifiant || '-'}</span></div>
                      <div class="pdf-line"><span class="pdf-label">Catégorie :</span> <span class="pdf-bold">${snapshot.categorie || 'Autre matériel'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">2. ÉTAT DU MATÉRIEL & SPÉCIFICATIONS</div>
                <div class="pdf-card-body">
                  <div class="pdf-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${customProperties.map(([k, v]) => `
                      <div class="pdf-line">
                        <span class="pdf-label" style="text-transform: capitalize;">${k.replace(/([A-Z])/g, ' $1').toLowerCase()} :</span>
                        <span class="pdf-bold">${v}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">3. SYNTHÈSE DES POINTS MAJEURS</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Statut GMAO final :</span> <span class="pdf-bold">${report.conforme ? 'CONFORME (Prêt à l\'emploi)' : 'NON CONFORME (Action requise)'}</span></div>
                  <div class="pdf-line"><span class="pdf-label">Commentaire / Remarques :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaireGmao || snapshot.commentaire || 'Aucun commentaire.'}</span></div>
                </div>
              </div>

              <div class="pdf-card" style="margin-top: auto;">
                <div class="pdf-card-header">4. SIGNATURES & PREUVES D'INTERVENTION</div>
                <div class="pdf-card-body" style="padding: 15px;">
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <!-- Photo -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Photographie terrain</div>
                      ${report.photoUrl ? `
                        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; display: flex; justify-items: start; height: 100px; width: 160px;">
                          <img src="${report.photoUrl}" style="max-height: 100px; max-width: 160px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                        </div>
                      ` : '<div style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucune photographie</div>'}
                    </div>

                    <!-- Tech signature -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Signature technicien</div>
                      ${report.techSignature ? `
                        <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                          <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                        </div>
                      ` : `<div style="font-size: 11px; color: #a1a1a1; font-style: italic;">Non signée</div>`}
                    </div>

                    <!-- Client signature -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Signature client</div>
                      ${report.clientPinCode ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <span class="pdf-label" style="font-size:10px; color:#555;">PIN validé:</span> 
                          <span class="pdf-bold" style="font-size:10px; font-family: monospace !important; font-weight: bold !important;">${report.clientPinCode}</span>
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
                          <div style="font-size: 11px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `}
                      `}
                    </div>

                  </div>
                </div>
              </div>

              <div class="pdf-footer">
                <span>Rapport d'intervention original - Document certifié conforme</span>
                <span>Page 1 / 1</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Standard Defibrillator layout
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

      htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport - ${snapshot.identifiant || report.defibIdentifiant || '-'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * {
              font-family: "Inter", sans-serif !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
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
              padding: 15mm 15mm;
              box-sizing: border-box;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 12px;
              page-break-after: always;
              break-after: page;
            }
            .pdf-header {
              font-size: 24px;
              font-weight: 800 !important;
              text-align: center;
              color: #1e1b4b;
              margin-bottom: 6px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .pdf-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              background-color: #ffffff;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            }
            .pdf-card-header {
              padding: 8px 12px;
              font-size: 13px;
              font-weight: 700;
              background-color: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }
            .pdf-card-body {
              padding: 10px 12px;
              font-size: 12px;
              display: flex;
              flex-direction: column;
              gap: 5px;
              color: #1e293b;
            }
            .pdf-line {
              font-size: 12px;
              line-height: 1.35;
            }
            .pdf-label {
              color: #64748b;
              font-weight: 500;
            }
            .pdf-bold {
              color: #1e293b;
              font-weight: 600;
            }
            .pdf-footer {
              position: absolute;
              bottom: 12mm;
              left: 15mm;
              right: 15mm;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px solid #cbd5e1;
              padding-top: 6px;
            }
          </style>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </head>
        <body class="bg-white">
          <div id="print-container">
            <!-- PAGE 1: DÉTAILS TECHNIQUES -->
            <div class="pdf-page">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div>
                  ${compLogo ? `<img src="${compLogo}" style="max-height: 40px; object-fit: contain; margin-bottom: 4px;" alt="Logo" referrerPolicy="no-referrer" />` : ''}
                  <div style="font-size: 11px; font-weight: bold; color: #1e1b4b;">${compName}</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                  <div>Rapport GMAO N° <strong>${report.id || 'N/A'}</strong></div>
                  <div>Date : <strong>${report.date || '-'}</strong></div>
                </div>
              </div>

              <div class="pdf-header">RAPPORT DE MAINTENANCE DÉFIBRILLATEUR</div>

              <div class="pdf-card">
                <div class="pdf-card-header">1. CONTEXTE CLIENT & SITE</div>
                <div class="pdf-card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Raison sociale :</span> <span class="pdf-bold">${clientName}</span></div>
                    <div class="pdf-line"><span class="pdf-label">SIRET :</span> <span class="pdf-bold">${clientFound ? clientFound.siret || '-' : '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Adresse :</span> <span class="pdf-bold">${snapshot.adresseComplexe || snapshot.ville || '-'}</span></div>
                  </div>
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Technicien :</span> <span class="pdf-bold">${report.techName || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Site / Mission :</span> <span class="pdf-bold">${report.siteMission || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Code postal / Ville :</span> <span class="pdf-bold">${snapshot.codePostal || ''} ${snapshot.ville || ''}</span></div>
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">2. SPÉCIFICATIONS DU DÉFIBRILLATEUR</div>
                <div class="pdf-card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Identifiant :</span> <span class="pdf-bold">${snapshot.identifiant || report.defibIdentifiant || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Code NFC :</span> <span class="pdf-bold">${snapshot.codeNfc || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Marque / Modèle :</span> <span class="pdf-bold">${variables.find(v => v.id === snapshot.modeleId)?.nom || '-'}</span></div>
                  </div>
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Type d'alimentation :</span> <span class="pdf-bold">${snapshot.typeBatterie || 'Pile lithium'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Emplacement précis :</span> <span class="pdf-bold">${snapshot.emplacementPrecis || '-'}</span></div>
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">3. ÉTAT INITIAL ET DIAGNOSTIC SUR TERRAIN</div>
                <div class="pdf-card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Voyant état fonctionnel :</span> <span class="pdf-bold text-emerald-600">${report.statusVoyantCorrect === 'Oui' ? '✓ CORRECT' : '✗ ANOMALIE'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Aspect externe général :</span> <span class="pdf-bold">${report.aspectGeneralCorrect === 'Oui' ? 'Correct' : 'Présence d\'anomalie'}</span></div>
                  </div>
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Présence du kit de secours :</span> <span class="pdf-bold">${report.kitSecoursPresent === 'Oui' ? 'Oui (Complet)' : 'Absent / Incomplet'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Signalétique murale :</span> <span class="pdf-bold">${report.signaletiqueOk === 'Oui' ? 'Correcte' : 'Déficiente'}</span></div>
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">4. PIÈCES ET DROITS CONSOMMÉS / REMPLACÉS</div>
                <div class="pdf-card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Remplacement électrodes adultes :</span> <span class="pdf-bold">${report.electrodeARemplacee === 'Oui' ? 'Oui (' + selElectrodeA + ')' : 'Non (Échéance valide)'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Remplacement électrodes enfants :</span> <span class="pdf-bold">${report.electrodePRemplacee === 'Oui' ? 'Oui (' + selElectrodeP + ')' : 'Non'}</span></div>
                  </div>
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Remplacement batterie / pile :</span> <span class="pdf-bold">${report.batterieRemplacee === 'Oui' ? 'Oui (' + selBatterie + ')' : 'Non'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Kit secours remplacé :</span> <span class="pdf-bold">${report.kitSecoursRemplace === 'Oui' ? 'Oui (' + selKitSecours + ')' : 'Non'}</span></div>
                  </div>
                </div>
              </div>

              <div class="pdf-footer">
                <span>Rapport d'intervention original - Document certifié conforme</span>
                <span>Page 1 / 2</span>
              </div>
            </div>

            <!-- PAGE 2: RELEVÉS NUMÉRIQUES DE SÉCURITÉ -->
            <div class="pdf-page">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div>
                  <div style="font-size: 11px; font-weight: bold; color: #1e1b4b;">${compName}</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #64748b;">
                  <div>Rapport GMAO N° <strong>${report.id || 'N/A'}</strong></div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">5. RELEVÉS NUMÉRIQUES & ÉCHÉANCES SÉCURITÉ</div>
                <div class="pdf-card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Date de mise en service :</span> <span class="pdf-bold">${snapshot.miseEnServiceDate || snapshot.miseEnService || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Prochaine maintenance planifiée :</span> <span class="pdf-bold">${report.dateEcheanceMaintenance || '-'}</span></div>
                  </div>
                  <div>
                    <div class="pdf-line"><span class="pdf-label">Échéance de la batterie :</span> <span class="pdf-bold">${report.nouvelleEcheanceBatterie || snapshot.peremptionBatterie || '-'}</span></div>
                    <div class="pdf-line"><span class="pdf-label">Échéance des électrodes adultes :</span> <span class="pdf-bold">${report.nouvelleEcheanceElectrodeA || snapshot.peremptionElectrodeA || '-'}</span></div>
                  </div>
                </div>
              </div>

              <div class="pdf-card">
                <div class="pdf-card-header">6. COMMENTAIRES & CERTIFICATION FINALE</div>
                <div class="pdf-card-body">
                  <div class="pdf-line"><span class="pdf-label">Statut global de sécurité :</span> <span class="pdf-bold text-emerald-600">${report.conforme ? 'CONFORME À L\'AFFECTATION DE SÉCURITÉ' : 'NON CONFORME (Alerte technique)'}</span></div>
                  <div class="pdf-line" style="margin-top: 4px;"><span class="pdf-label">Commentaire de synthèse :</span> <span class="pdf-bold" style="white-space: pre-line;">${snapshot.commentaire || report.defibSnapshot?.commentaire || '-'}</span></div>
                </div>
              </div>

              <div class="pdf-card" style="margin-top: auto;">
                <div class="pdf-card-header">7. SIGNATURES & HÉBERGEMENTS NUMÉRIQUES DE SÉCURITÉ</div>
                <div class="pdf-card-body" style="padding: 15px;">
                  <div style="display: flex; flex-direction: row; gap: 20px; width: 100%;">
                    <!-- Photo -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Photographie matériel</div>
                      ${report.photoUrl ? `
                        <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; display: flex; justify-items: start; height: 80px; width: 130px;">
                          <img src="${report.photoUrl}" style="max-height: 80px; max-width: 130px; object-fit: contain;" alt="Photo" referrerPolicy="no-referrer" />
                        </div>
                      ` : '<div style="font-size: 11px; color: #94a3b8; font-style: italic;">Aucune photographie</div>'}
                    </div>

                    <!-- Tech signature -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Signature technicien</div>
                      ${report.techSignature ? `
                        <div style="background: #ffffff; display: flex; justify-content: flex-start; align-items: center; max-height: 60px; max-width: 150px;">
                          <img src="${report.techSignature}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Signature" />
                        </div>
                      ` : `<div style="font-size: 11px; color: #a1a1a1; font-style: italic;">Non signée</div>`}
                    </div>

                    <!-- Client signature -->
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <div class="pdf-line" style="font-weight: 700; margin-bottom: 2px;">Signature client</div>
                      ${report.clientPinCode ? `
                        <div style="font-size: 10px; margin-bottom: 2px;">
                          <span class="pdf-label" style="font-size:10px; color:#555;">PIN validé:</span> 
                          <span class="pdf-bold" style="font-size:10px; font-family: monospace !important; font-weight: bold !important;">${report.clientPinCode}</span>
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
                          <div style="font-size: 11px; color: #a1a1a1; font-style: italic;">
                            Non signée
                          </div>
                        `}
                      `}
                    </div>

                  </div>
                </div>
              </div>

              <div class="pdf-footer">
                <span>Rapport d'intervention original - Document certifié conforme</span>
                <span>Page 2 / 2</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
                            
                            {df.horaires && (() => {
                              try {
                                const parsed = JSON.parse(df.horaires);
                                if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((p: any) => p.days && p.days.length > 0)) {
                                  return (
                                    <div className="col-span-1 sm:col-span-2 md:col-span-3 mt-2 pt-2 border-t border-slate-100">
                                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">📅 Horaires d'ouverture :</span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                        {parsed.map((sch: any, currentIdx: number) => {
                                          if (!sch.days || sch.days.length === 0) return null;
                                          return (
                                            <div key={currentIdx} className="bg-slate-50 p-2 rounded border border-slate-100 flex flex-col justify-between">
                                              <span className="font-semibold text-slate-700">{sch.days.join(', ')}</span>
                                              <span className="font-mono text-indigo-600 mt-1">
                                                {sch.fermetureMidi ? `${sch.openMorning} - ${sch.closeMorning} / ${sch.openAfternoon} - ${sch.closeAfternoon}` : `${sch.openContinuous} - ${sch.closeContinuous}`}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                              } catch(e){}
                              return null;
                            })()}
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
            <div className="space-y-6">
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

              {/* Card Commentaire (si existant) */}
              {authenticatedClient.commentaire && (
                <div
                  className="bg-white p-5 list-none space-y-2 text-slate-800"
                  style={{
                    border: '1px solid #cfcfcf',
                    borderRadius: '13px',
                  }}
                >
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Commentaire / Notes</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap font-sans">{authenticatedClient.commentaire}</p>
                </div>
              )}

              {/* Card Contacts de l'Établissement */}
              <div
                className="bg-white p-5 list-none space-y-4"
                style={{
                  border: '1px solid #cfcfcf',
                  borderRadius: '13px',
                }}
              >
                <div>
                  <h3 className="text-[18px] font-black text-black select-none" style={{ letterSpacing: 'normal' }}>
                    Contacts de l'établissement / Site
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-1">
                    Retrouvez ci-dessous la liste des contacts enregistrés pour votre établissement.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Contact 1 */}
                  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="text-xs font-bold text-indigo-600 mb-2 font-mono uppercase">Contact 1 {authenticatedClient.typeContact1 ? `(${authenticatedClient.typeContact1})` : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderField('Contact', authenticatedClient.nomPrenomSite || '-')}
                      {renderField('Téléphone', authenticatedClient.telephoneSite || '-')}
                      {renderField('Email', authenticatedClient.emailSite || '-')}
                    </div>
                  </div>

                  {/* Contact 2 */}
                  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="text-xs font-bold text-indigo-600 mb-2 font-mono uppercase">Contact 2 {authenticatedClient.typeContact2 ? `(${authenticatedClient.typeContact2})` : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderField('Contact', authenticatedClient.nomContact2 || '-')}
                      {renderField('Téléphone', authenticatedClient.telephoneSite2 || '-')}
                      {renderField('Email', authenticatedClient.emailSite2 || '-')}
                    </div>
                  </div>

                  {/* Contact 3 */}
                  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="text-xs font-bold text-indigo-600 mb-2 font-mono uppercase">Contact 3 {authenticatedClient.typeContact3 ? `(${authenticatedClient.typeContact3})` : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderField('Contact', authenticatedClient.nomContact3 || '-')}
                      {renderField('Téléphone', authenticatedClient.telephoneSite3 || '-')}
                      {renderField('Email', authenticatedClient.emailSite3 || '-')}
                    </div>
                  </div>

                  {/* Contact 4 */}
                  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="text-xs font-bold text-indigo-600 mb-2 font-mono uppercase">Contact 4 {authenticatedClient.typeContact4 ? `(${authenticatedClient.typeContact4})` : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderField('Contact', authenticatedClient.nomContact4 || '-')}
                      {renderField('Téléphone', authenticatedClient.telephoneSite4 || '-')}
                      {renderField('Email', authenticatedClient.emailSite4 || '-')}
                    </div>
                  </div>

                  {/* Contact 5 */}
                  <div className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="text-xs font-bold text-indigo-600 mb-2 font-mono uppercase">Contact 5 {authenticatedClient.typeContact5 ? `(${authenticatedClient.typeContact5})` : ''}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderField('Contact', authenticatedClient.nomContact5 || '-')}
                      {renderField('Téléphone', authenticatedClient.telephoneSite5 || '-')}
                      {renderField('Email', authenticatedClient.emailSite5 || '-')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Signature pour le client */}
              <div
                className="bg-white p-5 list-none space-y-4"
                style={{
                  border: '1px solid #cfcfcf',
                  borderRadius: '13px',
                }}
              >
                <div>
                  <h3 className="text-[18px] font-black text-black select-none" style={{ letterSpacing: 'normal' }}>
                    Votre signature électronique client (à distance)
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-1">
                    Dessinez votre signature ci-dessous. Une fois enregistrée, elle s'affichera à l'emplacement approprié sur vos rapports d'interventions certifiés et signés de votre part.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-start">
                  <div className="border border-slate-300 rounded-xl bg-slate-50/50 overflow-hidden" style={{ width: '300px', height: '150px' }}>
                    <canvas
                      ref={clientCanvasRef}
                      width={300}
                      height={150}
                      className="touch-none cursor-crosshair block bg-white"
                      onMouseDown={startDrawingSig}
                      onMouseMove={drawSig}
                      onMouseUp={stopDrawingSig}
                      onMouseLeave={stopDrawingSig}
                      onTouchStart={startDrawingSig}
                      onTouchMove={drawSig}
                      onTouchEnd={stopDrawingSig}
                    />
                  </div>

                  <div className="flex flex-col gap-3 self-stretch justify-center">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearSignatureSig}
                        className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-all rounded-lg cursor-pointer"
                      >
                        Effacer
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSaveSignature}
                        className="px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all border border-transparent rounded-lg cursor-pointer shadow-sm"
                      >
                        Enregistrer ma signature
                      </button>
                    </div>

                    {saveSuccess && (
                      <span className="text-sm font-bold text-emerald-600 font-sans animate-fadeIn flex items-center gap-1">
                        ✓ Signature enregistrée avec succès !
                      </span>
                    )}

                    {clientSignature ? (
                      <div className="text-[11px] text-slate-600 font-sans italic border-l-2 border-indigo-500 pl-2">
                        Une signature est actuellement enregistrée sur votre compte.
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 font-sans italic border-l-2 border-amber-500 pl-2">
                        Aucune signature enregistrée pour l'instant.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
