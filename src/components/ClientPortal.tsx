import React, { useState, useRef, useEffect } from 'react';
import { Client, Defibrillateur, CommercialDoc, CompanyInfo, Variable, OtherEquipment, PointageAutoVigilance } from '../types';
import { formatDateToFR, computeProchaineMaintenance, formatDateToMonthYear } from '../utils';
import { t } from '../utils/translate';

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
  pointagesAutoVigilance?: PointageAutoVigilance[];
  onAddPointageAutoVigilance?: (newPt: PointageAutoVigilance) => void;
}

interface BarcodeProps {
  text: string;
}

function Barcode({ text }: BarcodeProps) {
  const sanitized = '*' + text.toUpperCase().replace(/[^0-9A-Z\-.\s]/g, '-') + '*';
  
  const charMap: { [key: string]: string } = {
    '0': 'b s b S B s B s b', '1': 'B s b S b s b s B', '2': 'b s B S b s b s B',
    '3': 'B s B S b s b s b', '4': 'b s b S B s b s B', '5': 'B s b S B s b s b',
    '6': 'b s B S B s b s b', '7': 'b s b S b s B s B', '8': 'B s b S b s B s b',
    '9': 'b s B S b s B s b', 'A': 'B s b s b S b s B', 'B': 'b s B s b S b s B',
    'C': 'B s B s b S b s b', 'D': 'b s b s B S b s B', 'E': 'B s b s B S b s b',
    'F': 'b s B s B S b s b', 'G': 'b s b s b S B s B', 'H': 'B s b s b S B s b',
    'I': 'b s B s b S B s b', 'J': 'b s b s B S B s b', 'K': 'B s b s b s b S B',
    'L': 'b s B s b s b S B', 'M': 'B s B s b s b S b', 'N': 'b s b s B s b S B',
    'O': 'B s b s B s b S b', 'P': 'b s B s B s b S b', 'Q': 'b s b s b s B S B',
    'R': 'B s b s b s B S b', 'S': 'b s B s b s B S b', 'T': 'b s b s B s B S b',
    'U': 'B S b s b s b s B', 'V': 'b S B s b s b s B', 'W': 'B S B s b s b s b',
    'X': 'b S b s B s b s B', 'Y': 'B S b s B s b s b', 'Z': 'b S B s B s b s b',
    '-': 'b S b s b s B s B', '.': 'B S b s b s B s b', ' ': 'b S B s b s B s b',
    '*': 'b S b s B s B s b'
  };

  const getWidthStr = (char: string) => {
    return charMap[char] || charMap['-'];
  };

  let x = 10;
  const rects: React.JSX.Element[] = [];
  const narrowWidth = 1.8;
  const wideWidth = 4.2;
  const height = 55;

  for (let i = 0; i < sanitized.length; i++) {
    const pattern = getWidthStr(sanitized[i]);
    const elements = pattern.split(' ');
    
    elements.forEach((el, index) => {
      const isBar = index % 2 === 0;
      const isWide = el === el.toUpperCase();
      const currentWidth = isWide ? wideWidth : narrowWidth;
      
      if (isBar) {
        rects.push(
          <rect key={`${i}-${index}`} x={x} y={10} width={currentWidth} height={height} fill="black" />
        );
      }
      x += currentWidth;
    });
    x += narrowWidth;
  }

  const svgWidth = x + 10;
  const svgHeight = height + 30;

  return (
    <div className="flex flex-col items-center p-2 bg-white max-w-xs mx-auto">
      <svg id={`barcode-${text}`} width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto block">
        {rects}
        <text x={svgWidth / 2} y={height + 25} textAnchor="middle" style={{ fontSize: '18px', letterSpacing: 'normal' }} className="font-sans font-semibold fill-black">
          {text}
        </text>
      </svg>
    </div>
  );
}

const handleDownloadBarcode = (text: string) => {
  const svgEl = document.getElementById(`barcode-${text}`);
  if (!svgEl) return;
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = `codebarre_${text}.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

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
  pointagesAutoVigilance = [],
  onAddPointageAutoVigilance,
}: ClientPortalProps) {
  const [activePortalTab, setActivePortalTab] = useState<'defibs' | 'bills' | 'reports' | 'info' | 'autovigilance'>('defibs');

  const authenticatedClient = initialClient;

  // Contact editing states
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [c1Nom, setC1Nom] = useState('');
  const [c1Tel, setC1Tel] = useState('');
  const [c1Email, setC1Email] = useState('');
  const [c1Type, setC1Type] = useState('');

  const [c2Nom, setC2Nom] = useState('');
  const [c2Tel, setC2Tel] = useState('');
  const [c2Email, setC2Email] = useState('');
  const [c2Type, setC2Type] = useState('');

  const [c3Nom, setC3Nom] = useState('');
  const [c3Tel, setC3Tel] = useState('');
  const [c3Email, setC3Email] = useState('');
  const [c3Type, setC3Type] = useState('');

  const [c4Nom, setC4Nom] = useState('');
  const [c4Tel, setC4Tel] = useState('');
  const [c4Email, setC4Email] = useState('');
  const [c4Type, setC4Type] = useState('');

  const [c5Nom, setC5Nom] = useState('');
  const [c5Tel, setC5Tel] = useState('');
  const [c5Email, setC5Email] = useState('');
  const [c5Type, setC5Type] = useState('');

  useEffect(() => {
    if (authenticatedClient) {
      setC1Nom(authenticatedClient.nomPrenomSite || '');
      setC1Tel(authenticatedClient.telephoneSite || '');
      setC1Email(authenticatedClient.emailSite || '');
      setC1Type(authenticatedClient.typeContact1 || '');

      setC2Nom(authenticatedClient.nomContact2 || '');
      setC2Tel(authenticatedClient.telephoneSite2 || '');
      setC2Email(authenticatedClient.emailSite2 || '');
      setC2Type(authenticatedClient.typeContact2 || '');

      setC3Nom(authenticatedClient.nomContact3 || '');
      setC3Tel(authenticatedClient.telephoneSite3 || '');
      setC3Email(authenticatedClient.emailSite3 || '');
      setC3Type(authenticatedClient.typeContact3 || '');

      setC4Nom(authenticatedClient.nomContact4 || '');
      setC4Tel(authenticatedClient.telephoneSite4 || '');
      setC4Email(authenticatedClient.emailSite4 || '');
      setC4Type(authenticatedClient.typeContact4 || '');

      setC5Nom(authenticatedClient.nomContact5 || '');
      setC5Tel(authenticatedClient.telephoneSite5 || '');
      setC5Email(authenticatedClient.emailSite5 || '');
      setC5Type(authenticatedClient.typeContact5 || '');
    }
  }, [authenticatedClient]);

  // Signature related states & refs
  const [clientSignature, setClientSignature] = useState(authenticatedClient?.clientSignatureImage || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const clientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSig = useRef(false);

  // Contract-specific states in ClientPortal
  const [portalRedactionContrat, setPortalRedactionContrat] = useState('');
  const [portalDateSignatureContrat, setPortalDateSignatureContrat] = useState('');
  const [portalSigneParContrat, setPortalSigneParContrat] = useState('');
  const [portalSignatureClientContratImage, setPortalSignatureClientContratImage] = useState('');
  const [contractSaveSuccess, setContractSaveSuccess] = useState(false);

  const portalContractCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingPortalContractSig = useRef(false);

  useEffect(() => {
    if (authenticatedClient) {
      setPortalRedactionContrat(authenticatedClient.redactionContrat || '');
      setPortalDateSignatureContrat(authenticatedClient.dateSignatureContrat || new Date().toISOString().split('T')[0]);
      setPortalSigneParContrat(authenticatedClient.signeParContrat || '');
      setPortalSignatureClientContratImage(authenticatedClient.signatureClientContratImage || '');
    }
  }, [authenticatedClient]);

  useEffect(() => {
    if (activePortalTab === 'info' && portalSignatureClientContratImage && portalContractCanvasRef.current) {
      const canvas = portalContractCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = portalSignatureClientContratImage;
      }
    }
  }, [portalSignatureClientContratImage, activePortalTab]);

  const startDrawingPortalContractSig = (e: React.MouseEvent | React.TouchEvent) => {
    if (authenticatedClient?.signatureClientContratImage) return; // Read-only once saved
    e.preventDefault();
    const canvas = portalContractCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingPortalContractSig.current = true;
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

  const drawPortalContractSig = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingPortalContractSig.current) return;
    e.preventDefault();
    const canvas = portalContractCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventCoordsSig(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawingPortalContractSig = () => {
    if (!isDrawingPortalContractSig.current) return;
    isDrawingPortalContractSig.current = false;
    const canvas = portalContractCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setPortalSignatureClientContratImage(dataUrl);
    }
  };

  const clearPortalContractSignature = () => {
    if (authenticatedClient?.signatureClientContratImage) return; // Read-only once saved
    const canvas = portalContractCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setPortalSignatureClientContratImage('');
  };

  const handleSavePortalContract = () => {
    if (!authenticatedClient || !onUpdateClient) return;
    if (!portalSigneParContrat.trim()) {
      alert("Veuillez renseigner le champ 'Signé par' avant d'enregistrer.");
      return;
    }
    if (!portalSignatureClientContratImage) {
      alert("Veuillez signer avant d'enregistrer.");
      return;
    }

    const updated: Client = {
      ...authenticatedClient,
      dateSignatureContrat: portalDateSignatureContrat,
      signeParContrat: portalSigneParContrat.trim(),
      signatureClientContratImage: portalSignatureClientContratImage,
    };

    onUpdateClient(updated);
    setContractSaveSuccess(true);
    setTimeout(() => {
      setContractSaveSuccess(false);
    }, 3000);
  };

  const handleDownloadContractPDF = () => {
    if (!authenticatedClient) return;
    const compLogo = companyInfo.logo || '';
    const compName = companyInfo.name || 'Défibeo Solutions';
    const compEmail = companyInfo.email || '';
    const compPhone = companyInfo.phone || '';
    const compWebsite = companyInfo.website || '';

    // Format date beautifully under contract options
    const formattedDate = portalDateSignatureContrat ? new Date(portalDateSignatureContrat).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : '-';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Contrat de Maintenance - ${authenticatedClient.denomination || 'Client'}</title>
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
          <div class="flex justify-between items-start pb-4" style="border-bottom: 1px solid #dcdcdc;">
            <div>
              \${compLogo ? \`<img src="\${compLogo}" style="max-width: 300px; max-height: 100px; object-fit: contain; margin-bottom: 12px; display: block;" referrerPolicy="no-referrer" />\` : ''}
              <span class="text-large" style="display: block; margin-bottom: 4px;">\${compName}</span>
              <div>\${compEmail}</div>
              <div>\${compPhone}</div>
              <div style="margin-top: 2px;"><a href="https://\${compWebsite}" target="_blank" class="blue-link">\${compWebsite}</a></div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold;">CONTRAT DE MAINTENANCE</div>
              <div style="margin-top: 4px; color: #555;">Généré le \${new Date().toLocaleDateString('fr-FR')}</div>
              \${authenticatedClient.nomContrat ? \`<div style="margin-top: 4px; font-weight: bold; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; display: inline-block;">Catégorie : \${authenticatedClient.nomContrat}</div>\` : ''}
            </div>
          </div>

          <!-- TITRE DU DOCUMENT / INFOS CLIENT -->
          <div class="grid grid-cols-2 gap-6" style="margin-top: 20px;">
            <div>
              <h1 class="doc-title" style="margin-bottom: 10px;">CONTRAT</h1>
              <p style="margin: 4px 0 0 0; font-size: 15px !important; color: #555 !important;">
                Le présent contrat formalise les engagements de maintenance et d'audit pour la sécurité de vos dispositifs d'urgence de santé.
              </p>
            </div>
            <div style="border: 1px solid #dcdcdc; padding: 16px; border-radius: 12px; background-color: #ffffff;">
              <div style="margin-bottom: 6px; font-weight: bold; color: #555;">Client bénéficiaire.</div>
              <div style="font-size: 24px !important; font-weight: bold !important; margin-bottom: 6px; line-height: 1.2 !important;">\${authenticatedClient.denomination || 'Non renseigné'}</div>
              \${authenticatedClient.siret ? \`<div style="margin-bottom: 2px;">SIRET. \${authenticatedClient.siret}</div>\` : ''}
              \${authenticatedClient.nomPrenomSite ? \`<div style="margin-bottom: 2px;">Contact site. \${authenticatedClient.nomPrenomSite}</div>\` : ''}
              \${authenticatedClient.email ? \`<div style="margin-bottom: 2px;">Email. \${authenticatedClient.email}</div>\` : ''}
              \${authenticatedClient.phone ? \`<div style="margin-bottom: 2px;">\${t("Téléphone.")} \${authenticatedClient.phone}</div>\` : ''}
            </div>
          </div>

          <!-- CORPS DU CONTRAT -->
          <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 20px; background-color: #fafafa; margin-top: 10px;">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 18px !important; border-bottom: 1px solid #dcdcdc; padding-bottom: 8px;">
              Conditions Particulières & Descriptif de la maintenance
            </div>
            <div style="white-space: pre-wrap; font-size: 15px !important; line-height: 1.6 !important; color: #333333 !important;">
              \${portalRedactionContrat || "Aucun détail contractuel n'est rédigé."}
            </div>
          </div>

          <!-- SIGNATURES -->
          <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 20px; background-color: #ffffff; margin-top: 10px;">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 18px !important; border-bottom: 1px solid #dcdcdc; padding-bottom: 8px;">
              Signatures contractuelles
            </div>
            <div class="grid grid-cols-2 gap-6" style="margin-top: 12px;">
              <div>
                <div style="font-weight: bold; margin-bottom: 6px; color: #555;">Le prestataire :</div>
                <div style="font-size: 15px !important; font-weight: bold !important;">\${compName}</div>
                <div style="font-size: 13px !important; color: #64748b; margin-top: 4px;">Signé électroniquement par défaut de service contractuel.</div>
              </div>
              <div style="border-left: 1px solid #e2e8f0; padding-left: 20px;">
                <div style="font-weight: bold; margin-bottom: 6px; color: #555;">Le Client :</div>
                <div style="font-size: 15px !important;"><span style="color: #64748b;">Signataire :</span> <strong>\${portalSigneParContrat || '-'}</strong></div>
                <div style="font-size: 13px !important; color: #64748b; margin-top: 2px;">Date signature : \${formattedDate}</div>
                
                <div style="margin-top: 12px; text-align: center;">
                  \${portalSignatureClientContratImage ? \`
                    <div style="display: inline-block; border: 1px dashed rgb(200, 200, 200); padding: 6px; border-radius: 8px; background-color: #fff;">
                      <img src="\${portalSignatureClientContratImage}" style="max-height: 70px; max-width: 220px; object-fit: contain;" alt="Signature Client" />
                      <div style="font-size: 10px !important; color: #16a34a; font-weight: bold; margin-top: 4px;">✓ Document signé électroniquement</div>
                    </div>
                  \` : \`
                    <div style="border: 1px dashed #dcdcdc; padding: 20px; color: #a1a1a1; font-style: italic; font-size: 14px !important; border-radius: 8px;">
                      Contrat en attente de signature client
                    </div>
                  \`}
                </div>
              </div>
            </div>
          </div>

          <!-- MENTIONS LEGALES ET CONDITIONS -->
          \${companyInfo.mentionsLegalesFactures || companyInfo.conditionsLegalesLink ? \`
            <div style="border: 1px solid #dcdcdc; border-radius: 12px; padding: 16px; background-color: #ffffff; display: flex; flex-direction: column; gap: 6px; margin-top: 10px; font-size: 12px !important;">
              \${companyInfo.mentionsLegalesFactures ? \`<div style="font-size: 12px !important; color: #64748b !important;">Mentions légales : \${companyInfo.mentionsLegalesFactures}</div>\` : ''}
              \${companyInfo.conditionsLegalesLink ? \`<div style="font-size: 12px !important; color: #64748b !important;">Conditions légales : <a href="\${companyInfo.conditionsLegalesLink}" target="_blank" class="blue-link" style="font-size: 12px !important;">\${companyInfo.conditionsLegalesLink}</a></div>\` : ''}
            </div>
          \` : ''}

        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

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

  const handleSaveContacts = () => {
    if (!authenticatedClient) return;
    if (onUpdateClient) {
      const updated: Client = {
        ...authenticatedClient,
        nomPrenomSite: c1Nom,
        telephoneSite: c1Tel,
        emailSite: c1Email,
        typeContact1: c1Type,

        nomContact2: c2Nom,
        telephoneSite2: c2Tel,
        emailSite2: c2Email,
        typeContact2: c2Type,

        nomContact3: c3Nom,
        telephoneSite3: c3Tel,
        emailSite3: c3Email,
        typeContact3: c3Type,

        nomContact4: c4Nom,
        telephoneSite4: c4Tel,
        emailSite4: c4Email,
        typeContact4: c4Type,

        nomContact5: c5Nom,
        telephoneSite5: c5Tel,
        emailSite5: c5Email,
        typeContact5: c5Type,
      };
      onUpdateClient(updated);
      setIsEditingContacts(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }
  };

  const renderEditField = (label: string, value: string, onChange: (val: string) => void) => {
    return (
      <div className="space-y-1">
        <span className="block text-[18px] font-bold text-black font-sans select-none">
          {label}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="w-full text-[18px] text-black bg-white focus:outline-none transition-all placeholder:text-gray-400 font-sans"
          style={{
            border: '1px solid #cfcfcf',
            borderRadius: '11px',
            padding: '10px 14px',
            fontWeight: 100,
            height: '48px'
          }}
        />
      </div>
    );
  };

  // Filter content for the logged-in client
  const clientDefibs = authenticatedClient
    ? defibrillateurs.filter((df) => df.clientId === authenticatedClient.id)
    : [];

  const clientOthers = authenticatedClient
    ? otherEquipments.filter((oth) => oth.clientId === authenticatedClient.id)
    : [];

  // Pointages form states
  const [selectedEquipId, setSelectedEquipId] = useState('');
  const [pointageDate, setPointageDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [pointageComment, setPointageComment] = useState<'En fonctionnement et accessible' | 'Problème résolu' | 'Problème non résolu' | 'Problème non résolu et assistance demandée'>('En fonctionnement et accessible');
  const [pointageSuccess, setPointageSuccess] = useState(false);

  const assignedEquipment = [
    ...clientDefibs.map(d => ({
      id: d.id,
      identifiant: d.identifiant,
      nom: `${variables.find(v => v.id === d.modeleId)?.nom || 'Défibrillateur'} (${d.identifiant})`,
      type: 'defib'
    })),
    ...clientOthers.map(o => ({
      id: o.id,
      identifiant: o.identifiant,
      nom: `${o.categorie || 'Autre matériel'} (${o.identifiant})`,
      type: 'other'
    }))
  ];

  const handleSavePointage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatedClient) return;
    if (!selectedEquipId) {
      alert('Veuillez sélectionner un matériel.');
      return;
    }
    const equip = assignedEquipment.find(eq => eq.id === selectedEquipId);
    if (!equip) return;

    if (onAddPointageAutoVigilance) {
      const newPt: PointageAutoVigilance = {
        id: 'pt_av_' + Date.now(),
        clientId: authenticatedClient.id,
        equipementId: equip.id,
        equipementIdentifiant: equip.identifiant,
        equipementNom: equip.nom,
        date: pointageDate,
        commentaire: pointageComment,
        createdAt: new Date().toISOString()
      };
      onAddPointageAutoVigilance(newPt);
      setSelectedEquipId('');
      setPointageSuccess(true);
      setTimeout(() => {
        setPointageSuccess(false);
      }, 3000);
    }
  };

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
                ${clientObj.phone ? `<div style="margin-bottom: 2px;">${t("Téléphone.")} ${clientObj.phone}</div>` : ''}
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
          <p className="text-xs text-slate-500 font-medium font-sans">{t('Chargement du portail client...') || 'Loading client portal...'}</p>
        </div>
      </div>
    );
  }

  // Helper for displaying styled read-only attributes
  const renderField = (label: string, value: React.ReactNode, isMaterial: boolean = false) => {
    const translatedLabel = t(label);
    const trimmedLabel = translatedLabel.trim();
    const labelWithPeriod = trimmedLabel.endsWith('.') ? trimmedLabel : `${trimmedLabel}.`;
    
    let displayValue = value;
    if (typeof value === 'string') {
      displayValue = t(value);
    }
    const rawValStr = displayValue !== null && displayValue !== undefined ? String(displayValue).trim() : '';
    const hasValue = rawValStr !== '' && rawValStr !== '-';
    const finalValue = hasValue ? displayValue : '-';

    return (
      <div className="space-y-1">
        <span 
          className="block font-bold select-none font-sans"
          style={{ color: 'black', fontSize: '18px', textTransform: 'none' }}
        >
          {labelWithPeriod}
        </span>
        <div 
          className="select-text font-sans"
          style={{ 
            fontSize: '18px', 
            color: isMaterial ? '#772a7e' : 'black', 
            fontWeight: isMaterial ? 'bold' : 100,
            border: isMaterial ? 'none' : '1px solid #cfcfcf',
            borderRadius: '13px',
            padding: '10px 14px',
            cursor: 'default',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isMaterial ? 'rgb(253 234 255)' : '#ffffff'
          }}
        >
          {finalValue}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans select-none">
      {/* Top sticky navigation bar with requested maintainer title */}
      <header 
        className="sticky top-0 z-50 px-4 py-5 shrink-0 border-b border-purple-950/20 shadow-md bg-gradient-to-r from-[#7e2e86] to-[#36093a]"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between font-sans">
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
              {t('Quitter')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        
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
            {t('Matériels')}
          </button>
          <button
            onClick={() => setActivePortalTab('autovigilance')}
            className={`w-full sm:flex-1 py-3 sm:py-2 text-center text-[18px] font-bold text-black transition-all border-0 cursor-pointer ${
              activePortalTab === 'autovigilance'
                ? 'bg-white shadow-xs'
                : 'bg-transparent hover:bg-white/45'
            }`}
            style={{ borderRadius: '12px' }}
          >
            {t('Pointages auto-vigilance')}
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
            {t('Devis et factures')}
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
            {t('Rapports PDF')}
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
            {t('Informations')}
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
                          <div className="flex items-center gap-3 select-none">
                            <h2 className="text-[18px] font-black text-[#7e2e86]" style={{ letterSpacing: 'normal' }}>
                              {df.identifiant}
                            </h2>
                            <span 
                              style={{ 
                                backgroundColor: '#45114a',
                                color: '#fff',
                                fontSize: '18px',
                                borderRadius: '100px',
                                padding: '10px 15px',
                                fontWeight: 'bold',
                                lineHeight: 'normal'
                              }}
                              className="font-sans"
                            >
                              Défibrillateur
                            </span>
                          </div>
                          
                          {/* Barcode and Download button in first place */}
                          <div className="flex flex-col items-center gap-2">
                            <Barcode text={df.identifiant || 'DEFIB'} />
                            <button
                              type="button"
                              onClick={() => handleDownloadBarcode(df.identifiant || 'DEFIB')}
                              style={{ fontSize: '18px' }}
                              className="px-6 py-2 bg-black text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm border-none outline-none"
                            >
                              Télécharger
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {renderField('Identifiant', df.identifiant, true)}
                            {renderField('Série', df.numeroSerie, true)}
                            {renderField('Modèle', modelNom, true)}
                            {renderField('Contrat en cours', df.contrat || 'Non', true)}
                            {renderField('Numéro et voie', df.numVoie, true)}
                            {renderField('Ville', df.ville, true)}
                            {renderField('Code postal', df.cp, true)}
                            {renderField('Région', df.region, true)}
                            {renderField('Pays', df.pays, true)}
                            {renderField('Expiration de garantie', formatDateToFR(df.finGarantie) || df.finGarantie, true)}
                            {renderField('Dernière maintenance', formatDateToFR(df.derniereMaintenance) || df.derniereMaintenance, true)}
                            {renderField('Prochaine maintenance indicative.', formatDateToMonthYear(computeProchaineMaintenance(df.derniereMaintenance)), true)}
                            {renderField('Électrode Adulte ou Mixte, Péremption', electrodeAPeremp, true)}
                            {renderField('Électrode Pédiatrique, Péremption', electrodePPeremp, true)}
                            {renderField('Batterie, Péremption', batteriePeremp, true)}
                            {(() => {
                              let recurrenceAutoVigilance = 'Aucune';
                              if (df.rappelMensuelAuto === 'Oui') {
                                recurrenceAutoVigilance = 'Mensuelle';
                              } else if (df.rappelHebdoAuto === 'Oui') {
                                recurrenceAutoVigilance = 'Hebdomadaire';
                              } else if (df.rappelJournalierAuto === 'Oui') {
                                recurrenceAutoVigilance = 'Journalière';
                              }
                              return renderField('Récurrence auto-vigilance', recurrenceAutoVigilance, true);
                            })()}
                            
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
                          <div className="flex items-center gap-3 select-none">
                            <h2 className="text-[18px] font-black text-[#7e2e86]" style={{ letterSpacing: 'normal' }}>
                              {oth.identifiant}
                            </h2>
                            <span 
                              style={{ 
                                backgroundColor: '#45114a',
                                color: '#fff',
                                fontSize: '18px',
                                borderRadius: '100px',
                                padding: '10px 15px',
                                fontWeight: 'bold',
                                lineHeight: 'normal'
                              }}
                              className="font-sans"
                            >
                              {oth.categorie}
                            </span>
                          </div>
                          
                          {/* Barcode and Download button in first place */}
                          <div className="flex flex-col items-center gap-2">
                            <Barcode text={oth.identifiant || 'OTHER'} />
                            <button
                              type="button"
                              onClick={() => handleDownloadBarcode(oth.identifiant || 'OTHER')}
                              style={{ fontSize: '18px' }}
                              className="px-6 py-2 bg-black text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm border-none outline-none"
                            >
                              Télécharger
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {renderField('Identifiant', oth.identifiant, true)}
                            {renderField('Catégorie', oth.categorie, true)}
                            {renderField('Série', oth.specifiques?.numeroSerie || '-', true)}
                            {renderField('Contrat en cours', oth.contrat || 'Non', true)}
                            {renderField('Numéro et voie', oth.numeroVoie, true)}
                            {renderField('Ville', oth.ville, true)}
                            {renderField('Code postal', oth.codePostal || '', true)}
                            {renderField('Région', oth.region || '', true)}
                            {renderField('Pays', oth.pays || '', true)}
                            {renderField('Expiration de garantie', expireGarantie, true)}
                            {renderField('Dernière maintenance', derniereMaint, true)}
                            {renderField('Prochaine maintenance', prochaineMaint, true)}
                            {renderField('Mise en service', miseServ, true)}
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
                      {renderField('Objet ou commentaire', doc.commentaire || doc.ref, true)}
                      {renderField('Type', doc.type, true)}
                      {renderField('Référence', doc.ref, true)}
                      {renderField('Situation', doc.status, true)}
                      {renderField('Total HT', `${doc.totalHt.toFixed(2)} €`, true)}
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
                if (!rep.validated) return false;
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
                              backgroundColor: '#000000',
                              color: '#ffffff',
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
                          {renderField('Référence Rapport', rep.id, true)}
                          {renderField('Identifiant.', rep.defibIdentifiant || snap.identifiant || 'Non spécifié', true)}
                          {renderField('Date d\'intervention', rep.date, true)}
                          {renderField('Technicien intervenant', rep.techName, true)}
                          {renderField('Site / Mission', rep.siteMission || '-', true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}

           {/* Section: Pointages auto-vigilance */}
          {activePortalTab === 'autovigilance' && (
            <div className="space-y-8">
              <div id="new-pointage-container">
                {assignedEquipment.length === 0 ? (
                  <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-sans">
                    {t("Aucun matériel n'est actuellement affecté à votre établissement. Vous pourrez ajouter des pointages d'auto-vigilance dès que votre parc de matériels sera configuré.")}
                  </div>
                ) : (
                  <form onSubmit={handleSavePointage} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      {/* Sélection du matériel */}
                      <div className="space-y-1">
                        <label className="block text-[18px] font-bold text-black font-sans">
                          {t('Sélection du matériel *')}
                        </label>
                        <select
                          required
                          value={selectedEquipId}
                          onChange={(e) => setSelectedEquipId(e.target.value)}
                          className="w-full text-[18px] text-black bg-white hover:outline hover:outline-2 hover:outline-[#772a7e] hover:outline-offset-2 focus:ring-0 focus:outline focus:outline-2 focus:outline-[#772a7e] focus:outline-offset-2 transition-all cursor-pointer appearance-none"
                          style={{
                            border: '1px solid #cfcfcf',
                            borderRadius: '11px',
                            padding: '10px 14px',
                            fontWeight: 100,
                            height: '48px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        >
                          <option value="">{t('-- Choisir un matériel --')}</option>
                          {assignedEquipment.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.nom}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date */}
                      <div className="space-y-1">
                        <label className="block text-[18px] font-bold text-black font-sans">
                          {t('Date *')}
                        </label>
                        <input
                          type="date"
                          required
                          value={pointageDate}
                          onChange={(e) => setPointageDate(e.target.value)}
                          className="w-full text-[18px] text-black bg-white hover:outline hover:outline-2 hover:outline-[#772a7e] hover:outline-offset-2 focus:ring-0 focus:outline focus:outline-2 focus:outline-[#772a7e] focus:outline-offset-2 transition-all [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          style={{
                            border: '1px solid #cfcfcf',
                            borderRadius: '11px',
                            padding: '10px 14px',
                            fontWeight: 100,
                            height: '48px'
                          }}
                        />
                      </div>

                      {/* Commentaire */}
                      <div className="space-y-1">
                        <label className="block text-[18px] font-bold text-black font-sans">
                          {t('Commentaire *')}
                        </label>
                        <select
                          required
                          value={pointageComment}
                          onChange={(e) => setPointageComment(e.target.value as any)}
                          className="w-full text-[18px] text-black bg-white hover:outline hover:outline-2 hover:outline-[#772a7e] hover:outline-offset-2 focus:ring-0 focus:outline focus:outline-2 focus:outline-[#772a7e] focus:outline-offset-2 transition-all cursor-pointer appearance-none"
                          style={{
                            border: '1px solid #cfcfcf',
                            borderRadius: '11px',
                            padding: '10px 14px',
                            fontWeight: 100,
                            height: '48px',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        >
                          <option value="En fonctionnement et accessible">{t('En fonctionnement et accessible')}</option>
                          <option value="Problème résolu">{t('Problème résolu')}</option>
                          <option value="Problème non résolu">{t('Problème non résolu')}</option>
                          <option value="Problème non résolu et assistance demandée">{t('Problème non résolu et assistance demandée')}</option>
                        </select>
                      </div>

                      {/* Button */}
                      <div className="w-full">
                        <button
                          type="submit"
                          className="w-full text-white transition-all cursor-pointer outline-none border-none shrink-0 font-bold"
                          style={{
                            backgroundColor: '#000000',
                            borderRadius: '11px',
                            fontSize: '18px',
                            height: '48px',
                          }}
                        >
                          {t('Enregistrer')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Liste des pointages */}
              <div id="historique-pointage-container" className="mt-8">
                {!pointagesAutoVigilance || pointagesAutoVigilance.filter(p => p.clientId === authenticatedClient?.id).length === 0 ? (
                  null
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-sm border-collapse">
                      <thead>
                        <tr className="text-black font-bold font-sans" style={{ fontSize: '18px' }}>
                          <th className="py-3 px-2">{t('Date.')}</th>
                          <th className="py-3 px-2">{t('Matériel.')}</th>
                          <th className="py-3 px-2">{t('Identifiant.')}</th>
                          <th className="py-3 px-2">{t('Situation.')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pointagesAutoVigilance]
                          .filter(p => p.clientId === authenticatedClient?.id)
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((pt) => {
                            return (
                              <tr key={pt.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-2 text-black font-sans" style={{ fontSize: '18px' }}>
                                  {formatDateToFR ? formatDateToFR(pt.date) : pt.date}
                                </td>
                                <td className="py-3 px-2 text-black font-sans" style={{ fontSize: '18px' }}>
                                  {pt.equipementNom}
                                </td>
                                <td className="py-3 px-2 text-black font-sans" style={{ fontSize: '18px' }}>
                                  {pt.equipementIdentifiant}
                                </td>
                                <td className="py-3 px-2 text-black font-sans" style={{ fontSize: '18px' }}>
                                  {t(pt.commentaire)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
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
                  {renderField('Entreprise', authenticatedClient.denomination, true)}
                  {renderField('Identifiant fiscal', authenticatedClient.siret, true)}
                  {renderField('Email', authenticatedClient.email, true)}
                  {renderField('Téléphone', authenticatedClient.phone, true)}
                  {renderField('Contrat', authenticatedClient.contrat || 'Non', true)}
                  {renderField('Référence', authenticatedClient.referenceContrat, true)}
                  {renderField('Début', formatDateToFR(authenticatedClient.debutContrat) || authenticatedClient.debutContrat, true)}
                  {renderField('Fin', formatDateToFR(authenticatedClient.finContrat) || authenticatedClient.finContrat, true)}
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

              {/* Card Contrat */}
              {portalRedactionContrat && portalRedactionContrat.trim() !== '' && (
                <div
                  className="bg-white p-5 list-none space-y-4"
                  style={{
                    border: '1px solid #cfcfcf',
                    borderRadius: '13px',
                  }}
                >
                  <div>
                    <h3 className="text-[18px] font-black text-black select-none font-sans" style={{ letterSpacing: 'normal' }}>
                      Contrat.
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <div 
                      className="w-full text-black font-sans whitespace-pre-wrap select-text"
                      style={{ fontSize: '16px' }}
                    >
                      {portalRedactionContrat}
                    </div>
                  </div>

                  {/* 3 columns on desktop for Signature details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-start">
                    {/* Date de signature */}
                    <div className="space-y-1">
                      <label className="block text-[18px] font-bold text-black font-sans select-none">
                        Date.
                      </label>
                      <input
                        type="date"
                        value={portalDateSignatureContrat}
                        onChange={(e) => setPortalDateSignatureContrat(e.target.value)}
                        disabled={!!authenticatedClient?.signatureClientContratImage}
                        className="w-full border border-slate-200 rounded-xl p-3 text-[18px] text-black bg-white focus:outline-none disabled:bg-slate-50 disabled:text-black font-sans [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                      />
                    </div>

                    {/* Signé par */}
                    <div className="space-y-1">
                      <label className="block text-[18px] font-bold text-black font-sans select-none">
                        {t("Signataire.")}
                      </label>
                      <input
                        type="text"
                        value={portalSigneParContrat}
                        onChange={(e) => setPortalSigneParContrat(e.target.value)}
                        disabled={!!authenticatedClient?.signatureClientContratImage}
                        placeholder="Nom du signataire"
                        className="w-full border border-slate-200 rounded-xl p-3 text-[18px] text-black bg-white focus:outline-none disabled:bg-slate-50 disabled:text-black font-sans"
                      />
                    </div>

                    {/* Signature du client */}
                    <div className="space-y-1 flex flex-col">
                      <label className="block text-[18px] font-bold text-black font-sans select-none">
                        Signature.
                      </label>
                      <div className="flex flex-col items-center justify-center p-2 bg-transparent">
                        {authenticatedClient?.signatureClientContratImage ? (
                          <div className="bg-white border border-slate-200 rounded-lg p-1 w-[320px] h-[120px] flex items-center justify-center">
                            <img 
                              src={authenticatedClient.signatureClientContratImage} 
                              alt="Signature client sous contrat" 
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <>
                            <canvas
                              ref={portalContractCanvasRef}
                              width={320}
                              height={120}
                              className="bg-white border border-slate-200 cursor-crosshair rounded-lg"
                              onMouseDown={startDrawingPortalContractSig}
                              onMouseMove={drawPortalContractSig}
                              onMouseUp={stopDrawingPortalContractSig}
                              onMouseLeave={stopDrawingPortalContractSig}
                              onTouchStart={startDrawingPortalContractSig}
                              onTouchMove={drawPortalContractSig}
                              onTouchEnd={stopDrawingPortalContractSig}
                            />
                            <div className="flex justify-between items-center w-full mt-2 px-1">
                              <button
                                type="button"
                                onClick={clearPortalContractSignature}
                                className="px-6 py-3 text-white transition-all cursor-pointer outline-none border-none font-bold"
                                style={{
                                  backgroundColor: '#000000',
                                  borderRadius: '13px',
                                  fontSize: '18px',
                                  boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff1f',
                                }}
                              >
                                {t("Effacer")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions row: Download button always visible, Save button visible if not signed yet */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 gap-4">
                    <div>
                      {contractSaveSuccess && (
                        <span className="text-sm font-bold text-emerald-600 font-sans animate-fadeIn">
                          ✓ Votre signature a été enregistrée avec succès !
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleDownloadContractPDF}
                        className="px-6 py-3 text-white transition-all cursor-pointer flex items-center gap-2 border-none outline-none font-bold"
                        style={{
                          backgroundColor: '#000000',
                          borderRadius: '13px',
                          fontSize: '18px',
                          boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff1f',
                        }}
                      >
                        {t("Télécharger le contrat PDF")}
                      </button>

                      {!authenticatedClient?.signatureClientContratImage && (
                        <button
                          type="button"
                          onClick={handleSavePortalContract}
                          className="px-6 py-3 text-white transition-all cursor-pointer outline-none border-none shrink-0 font-bold"
                          style={{
                            backgroundColor: '#000000',
                            borderRadius: '13px',
                            fontSize: '18px',
                            boxShadow: 'inset 0 1px 1px #fff3, 0 1px 2px #08080833, 0 4px 4px #08080814, 0 7px 0 -12px #000000, inset 0 6px 12px #ffffff1f',
                          }}
                        >
                          {t("Enregistrer & Signer le Contrat")}
                        </button>
                      )}
                    </div>
                  </div>

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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-[18px] font-black text-black select-none font-sans" style={{ letterSpacing: 'normal' }}>
                      Contacts.
                    </h3>
                  </div>
                  {!isEditingContacts ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingContacts(true)}
                      className="px-6 py-3 text-white transition-all cursor-pointer outline-none border-none whitespace-nowrap self-stretch sm:self-auto font-bold animate-fadeIn"
                      style={{
                        backgroundColor: '#000000',
                        borderRadius: '13px',
                        fontSize: '18px',
                        boxShadow: 'none',
                      }}
                    >
                      {t("Modifier les contacts")}
                    </button>
                  ) : (
                    <div className="flex gap-2 self-stretch sm:self-auto justify-end">
                      <button
                        onClick={handleSaveContacts}
                        className="px-6 py-3 text-white transition-all cursor-pointer outline-none border-none font-bold"
                        style={{
                          backgroundColor: '#000000',
                          borderRadius: '13px',
                          fontSize: '18px',
                        }}
                      >
                        {t("Enregistrer")}
                      </button>
                      <button
                        onClick={() => {
                          // Reset to previous state values
                          if (authenticatedClient) {
                            setC1Nom(authenticatedClient.nomPrenomSite || '');
                            setC1Tel(authenticatedClient.telephoneSite || '');
                            setC1Email(authenticatedClient.emailSite || '');
                            setC1Type(authenticatedClient.typeContact1 || '');

                            setC2Nom(authenticatedClient.nomContact2 || '');
                            setC2Tel(authenticatedClient.telephoneSite2 || '');
                            setC2Email(authenticatedClient.emailSite2 || '');
                            setC2Type(authenticatedClient.typeContact2 || '');

                            setC3Nom(authenticatedClient.nomContact3 || '');
                            setC3Tel(authenticatedClient.telephoneSite3 || '');
                            setC3Email(authenticatedClient.emailSite3 || '');
                            setC3Type(authenticatedClient.typeContact3 || '');

                            setC4Nom(authenticatedClient.nomContact4 || '');
                            setC4Tel(authenticatedClient.telephoneSite4 || '');
                            setC4Email(authenticatedClient.emailSite4 || '');
                            setC4Type(authenticatedClient.typeContact4 || '');

                            setC5Nom(authenticatedClient.nomContact5 || '');
                            setC5Tel(authenticatedClient.telephoneSite5 || '');
                            setC5Email(authenticatedClient.emailSite5 || '');
                            setC5Type(authenticatedClient.typeContact5 || '');
                          }
                          setIsEditingContacts(false);
                        }}
                        className="px-6 py-3 text-white transition-all cursor-pointer outline-none border-none font-bold"
                        style={{
                          backgroundColor: '#000000',
                          borderRadius: '13px',
                          fontSize: '18px',
                        }}
                      >
                        {t("Annuler")}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingContacts ? (
                  <div className="space-y-6">
                    {/* Contact 1 */}
                    <div className="pb-4">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 1
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderField('Type du contact', c1Type || '-')}
                        {renderField('Nom & Prénom', c1Nom || '-')}
                        {renderField('Téléphone', c1Tel || '-')}
                        {renderField('Email', c1Email || '-')}
                      </div>
                    </div>

                    {/* Contact 2 */}
                    <div className="pb-4">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 2
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderField('Type du contact', c2Type || '-')}
                        {renderField('Nom & Prénom', c2Nom || '-')}
                        {renderField('Téléphone', c2Tel || '-')}
                        {renderField('Email', c2Email || '-')}
                      </div>
                    </div>

                    {/* Contact 3 */}
                    <div className="pb-4">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 3
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderField('Type du contact', c3Type || '-')}
                        {renderField('Nom & Prénom', c3Nom || '-')}
                        {renderField('Téléphone', c3Tel || '-')}
                        {renderField('Email', c3Email || '-')}
                      </div>
                    </div>

                    {/* Contact 4 */}
                    <div className="pb-4">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 4
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderField('Type du contact', c4Type || '-')}
                        {renderField('Nom & Prénom', c4Nom || '-')}
                        {renderField('Téléphone', c4Tel || '-')}
                        {renderField('Email', c4Email || '-')}
                      </div>
                    </div>

                    {/* Contact 5 */}
                    <div className="pb-4">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 5
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderField('Type du contact', c5Type || '-')}
                        {renderField('Nom & Prénom', c5Nom || '-')}
                        {renderField('Téléphone', c5Tel || '-')}
                        {renderField('Email', c5Email || '-')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-2">
                    {/* Edit Contact 1 */}
                    <div className="pb-6">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 1
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderEditField('Type du contact (ex. Direction)', c1Type, setC1Type)}
                        {renderEditField('Nom & Prénom', c1Nom, setC1Nom)}
                        {renderEditField('Téléphone', c1Tel, setC1Tel)}
                        {renderEditField('Email', c1Email, setC1Email)}
                      </div>
                    </div>

                    {/* Edit Contact 2 */}
                    <div className="pb-6">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 2
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderEditField('Type du contact (ex. Direction)', c2Type, setC2Type)}
                        {renderEditField('Nom & Prénom', c2Nom, setC2Nom)}
                        {renderEditField('Téléphone', c2Tel, setC2Tel)}
                        {renderEditField('Email', c2Email, setC2Email)}
                      </div>
                    </div>

                    {/* Edit Contact 3 */}
                    <div className="pb-6">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 3
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderEditField('Type du contact (ex. Direction)', c3Type, setC3Type)}
                        {renderEditField('Nom & Prénom', c3Nom, setC3Nom)}
                        {renderEditField('Téléphone', c3Tel, setC3Tel)}
                        {renderEditField('Email', c3Email, setC3Email)}
                      </div>
                    </div>

                    {/* Edit Contact 4 */}
                    <div className="pb-6">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 4
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderEditField('Type du contact (ex. Direction)', c4Type, setC4Type)}
                        {renderEditField('Nom & Prénom', c4Nom, setC4Nom)}
                        {renderEditField('Téléphone', c4Tel, setC4Tel)}
                        {renderEditField('Email', c4Email, setC4Email)}
                      </div>
                    </div>

                    {/* Edit Contact 5 */}
                    <div className="pb-2">
                      <div className="inline-block px-3 py-1 text-[14px] font-bold rounded-full font-sans select-none mb-3" style={{ backgroundColor: '#411046', color: '#ffffff' }}>
                        Contact 5
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {renderEditField('Type du contact (ex. Direction)', c5Type, setC5Type)}
                        {renderEditField('Nom & Prénom', c5Nom, setC5Nom)}
                        {renderEditField('Téléphone', c5Tel, setC5Tel)}
                        {renderEditField('Email', c5Email, setC5Email)}
                      </div>
                    </div>
                  </div>
                )}
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
                  <h3 className="text-[18px] font-black text-black select-none font-sans" style={{ letterSpacing: 'normal' }}>
                    {t("Signature à distance.")}
                  </h3>
                </div>

                <div className="flex flex-col md:flex-row gap-5 items-start">
                  <div className="border border-slate-300 rounded-xl overflow-hidden" style={{ width: '300px', height: '150px' }}>
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
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={clearSignatureSig}
                        className="px-6 py-3 text-white transition-all cursor-pointer border-none outline-none font-bold"
                        style={{
                          backgroundColor: '#000000',
                          borderRadius: '13px',
                          fontSize: '18px',
                        }}
                      >
                        {t("Effacer")}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSaveSignature}
                        className="px-6 py-3 text-white transition-all cursor-pointer border-none outline-none font-bold"
                        style={{
                          backgroundColor: '#000000',
                          borderRadius: '13px',
                          fontSize: '18px',
                        }}
                      >
                        {t("Enregistrer ma signature")}
                      </button>
                    </div>

                    {saveSuccess && (
                      <span className="text-sm font-bold text-emerald-600 font-sans animate-fadeIn flex items-center gap-1">
                        ✓ {t("Signature enregistrée avec succès !")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Single PIN display in disabled view */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                  <div className="space-y-1 bg-white">
                    <label className="block text-[18px] font-bold text-black font-sans select-none">
                      {t("PIN unique de signature à communiquer au technicien.")}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={authenticatedClient?.signaturePin || 'Non défini'}
                      style={{ cursor: 'not-allowed', backgroundColor: '#ffffff', borderColor: '#cfcfcf', color: 'black', fontFamily: '"DefibeoMain", "Civilprom", sans-serif', fontSize: '18px' }}
                      className="px-4 py-2 border rounded-xl font-bold text-center w-40 font-sans"
                    />
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
