import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CompanyInfo, Member, SupportTicket, Defibrillateur, Variable, Client, StockRecord } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { REGIONS_FRANCAISES } from '../utils';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GmaoCorrectionFormProps {
  report?: any;
  isNew?: boolean;
  onSave: (updatedReport: any) => void;
  onCancel: () => void;
  clients: Client[];
  variables: Variable[];
  defibrillateurs: Defibrillateur[];
  initialDefibId?: string;
  stocks?: StockRecord[];
  members?: Member[];
  forceSmartphoneLayout?: boolean;
}

const DEFAULT_DEFIB: Defibrillateur = {
  id: '',
  identifiant: '',
  numeroSerie: '',
  commentaire: '',
  modeleId: '',
  clientId: '',
  nomPrenomSite: '',
  telephoneSite: '',
  emailSite: '',
  contrat: 'Non',
  nomContrat: '',
  referenceContrat: '',
  debutContrat: '',
  finContrat: '',
  modeleCoffretId: '',
  numeroLotCoffret: '',
  commentaireCoffret: '',
  numVoie: '',
  ville: '',
  cp: '',
  region: 'Île-de-France',
  pays: 'France',
  latitude: '48.8566',
  longitude: '2.3522',
  commentaireAdresse: '',
  acces247: false,
  accesSemaine: false,
  accesWeekend: false,
  exterieur: false,
  finGarantie: '',
  fabrication: '',
  miseEnService: '',
  derniereMaintenance: '',
  sortieFabricant: '',
  modeleElectrodeAId: '',
  lotElectrodeA: '',
  insertionElectrodeA: '',
  peremptionElectrodeA: '',
  livraisonElectrodeA: '',
  situationElectrodeA: 'Vert',
  commentaireElectrodeA: '',
  peremptionSecoursElectrodeA: '',
  modeleElectrodePId: '',
  lotElectrodeP: '',
  insertionElectrodeP: '',
  peremptionElectrodeP: '',
  livraisonElectrodeP: '',
  situationElectrodeP: 'Vert',
  commentaireElectrodeP: '',
  peremptionSecoursElectrodeP: '',
  modeleBatterieId: '',
  lotBatterie: '',
  insertionBatterie: '',
  peremptionBatterie: '',
  livraisonBatterie: '',
  situationBatterie: 'Vert',
  pourcentageBatterie: '100',
  commentaireBatterie: '',
  loue: 'Non',
  prete: 'Non',
  stocke: 'Non',
  archive: 'Non',
  conforme: 'Oui',
  sousTraitance: 'Non',
  fsmAutorise: 'Non',
  victimeSurvie: 'Non',
  victimeSansSurvie: 'Non',
  ageVictime: '',
  commentaireCampagneRappel: '',
  rappelMensuelAuto: 'Non',
  rappelHebdoAuto: 'Non',
  rappelJournalierAuto: 'Non'
};

const ERROR_CODES_DB = [
  // Philips
  { label: "Philips - Code 1", description: "Les électrodes sont périmées, mal branchées ou le gel est sec. Il faut remplacer la cartouche d'électrodes immédiatement." },
  { label: "Philips - Code 2", description: "La batterie est faible ou déchargée. Il faut remplacer la pile au lithium (M5070A)." },
  { label: "Philips - Code 4", description: "Le DAE a détecté une erreur matérielle interne majeure lors de son auto-test. Il faut retirer et réinsérer la batterie pour relancer un auto-test complet. Si le problème persiste, l'appareil doit être retourné au SAV Philips." },
  { label: "Philips - C1001", description: "Échec de la configuration ou de la carte de données. Il faut formater ou remplacer la carte SD configurée par le logiciel Philips." },
  { label: "Philips - C1005", description: "Erreur critique de la mémoire flash interne. Il faut lancer un test initié par l'utilisateur (User-Initiated Test). Si l'erreur reste, la carte mère est à remplacer." },
  { label: "Philips - Code \"F\" ou Voyant Clignotant Rouge", description: "Panne de sous-système interne (souvent le condensateur de charge). Il faut retirer l'appareil du service et contacter le support technique." },
  { label: "Philips - Code 3", description: "La température de stockage de l'appareil est hors des tolérances acceptables (trop froid ou trop chaud). Il faut déplacer le DAE dans un environnement tempéré et attendre que la température se stabilise pour l'auto-test." },
  { label: "Philips - Code 5", description: "Dysfonctionnement du circuit audio ou du haut-parleur. Il faut insérer une batterie neuve pour retenter le test. Si l'appareil reste muet mais clignote, le haut-parleur est défaillant." },
  { label: "Philips - C1002", description: "Échec de l'auto-test de la pile ou tension réseau interne incorrecte. Il faut installer une batterie FR3 neuve certifiée Philips." },
  { label: "Philips - C1004", description: "Erreur d'intégrité logicielle (Firmware corrompu). Il faut reflasher l'appareil avec le logiciel d'administration Philips ou remplacer la carte principale." },

  // Zoll
  { label: "Zoll - 902-E", description: "Il s'agit d'un problème de communication ou de détection du câble d'électrodes (souvent legato à des CPR-D padz mal enfoncées ou défectueuses). Il faut débrancher les électrodes, nettoyer les broches du connecteur et rebrancher une nouvelle paire." },
  { label: "Zoll - N = 1", description: "Paramètres d'IP statique locale incorrects. Il faut vérifier dans le menu de configuration que l'adresse IP statique n'est pas à 0.0.0.0 et que le masque de sous-réseau est correct." },
  { label: "Zoll - N = 2", description: "Erreur de serveur avec DNS désactivé. Il faut renseigner manuellement l'adresse IP du serveur de transmission des données (Full Disclosure Server)." },
  { label: "Zoll - Échec Test de Choc", description: "Le circuit de charge ou de décharge haute tension est défaillant. Il faut tester l'appareil sur un simulateur de charge externe (ex: QA-90). Si le choc n'est pas délivré ou si l'énergie est hors tolérance, le module haute tension est HS." },
  { label: "Zoll - Chirping", description: "Les piles (CR123a) sont faibles. Il faut remplacer l'ensemble des 10 piles en même temps par des piles de marque identique approuvées." },
  { label: "Zoll - 901-E", description: "Échec du test de l'architecture électronique générale ou de la RAM lors de l'auto-test. Il faut effectuer un hard reset (retrait des piles pendant 2 minutes). Si le code persiste au redémarrage, la carte mère est défectueuse." },
  { label: "Zoll - 905-E", description: "Problème lié au bouton de choc (contact permanent détecté ou bouton bloqué). Il faut inspecter visuellement le bouton, tenter de le décoincer mécaniquement, ou remplacer la face avant." },
  { label: "Zoll - TIMEOUT CHG", description: "Le temps de charge maximum autorisé pour atteindre l'énergie sélectionnée a été dépassé. Il faut contrôler l'usure de la batterie principale ou le condensateur haute tension en atelier." },

  // Physio-Control
  { label: "Physio-Control - Icône Clé à molette", description: "Une anomalie interne a été détectée lors de l'auto-test hebdomadaire ou mensuel. Il faut retirer la batterie CHARGE-PAK, attendre 10 secondes, la réinsérer et observer si l'icône repasse sur 'OK'. Si la clé reste, l'appareil nécessite une intervention en atelier." },
  { label: "Physio-Control - Icône \"!\"", description: "La batterie interne permanente est trop basse après le remplacement du module CHARGE-PAK. Il faut laisser l'appareil au repos pendant 24 à 72 heures pour permettre à la batterie interne de se recharger complètement." },
  { label: "Physio-Control - Code 119", description: "Erreur d'interface utilisateur ou du sélecteur d'énergie. Il faut nettoyer ou remplacer le clavier à membrane ou le bouton rotatif." },
  { label: "Physio-Control - Code 124", description: "Défaut d'acquisition ou d'isolation du module ECG. Il faut vérifier la carte d'entrée ECG et le câblage interne." },
  { label: "Physio-Control - Code 128", description: "Erreur critique du sous-système de thérapie (haute tension). Il faut effectuer un test d'énergie et de calibration. Si le code revient à chaque tentative de charge, le module de thérapie est défectueux." },
  { label: "Physio-Control - Code 102", description: "Erreur de communication avec le module de gestion de l'alimentation (Power PCB). Il faut inspecter les nappes de connexion internes et mettre à jour le firmware." },
  { label: "Physio-Control - Code 105", description: "Erreur d'étalonnage de l'horloge interne (RTC). Il faut remplacer la pile bouton de sauvegarde soudée sur la carte mère." },
  { label: "Physio-Control - Code 310", description: "Défaut d'alimentation secteur (liaison coupée ou fusible d'entrée sauté alors que le câble est branché). Il faut tester le cordon d'alimentation et vérifier les fusibles du bloc d'entrée." },
  { label: "Physio-Control - Code 401", description: "Échec de l'auto-test de l'imprimante thermique. Il faut vérifier qu'un rouleau de papier est présent, que la porte est bien verrouillée et que la tête d'impression n'est pas encrassée." },

  // Heartsine
  { label: "Heartsine - Bip rapide continu + LED d'état éteinte", description: "Le Pad-Pak (cartouche intégrée pile + électrodes) est manquant, mal enclenché ou périmé. Il faut extraire le Pad-Pak, vérifier la date de péremption, nettoyer les glissières et le réinsérer fermement jusqu'à entendre le clic." },
  { label: "Heartsine - Bip lent intermittent + Icône de maintenance (Clé)", description: "Erreur logicielle interne ou température de stockage hors limites (inférieure à 0°C ou supérieure à 50°C). Il faut replacer l'appareil dans un environnement tempéré pendant 2 heures puis extraire/réinsérer le Pad-Pak pour forcer un auto-test." },

  // Schiller
  { label: "Schiller - Err 1", description: "Erreur de configuration EEPROM ou données d'étalonnage manquantes. Il faut renvoyer l'appareil pour réécriture des données d'usine via le logiciel de service Schiller." },
  { label: "Schiller - Err 4", description: "Échec du test du condensateur haute tension (temps de charge trop long). Il faut tester la capacité du condensateur et le remplacer si sa valeur a dérivé." },
  { label: "Schiller - Err 5", description: "Le relais de sécurité ou le circuit de décharge interne est bloqué en position ouverte. La carte de thérapie doit être remplacée." },
  { label: "Schiller - Err 8", description: "Tension de la pile de sauvegarde de sécurité insuffisante. Il faut ouvrir le boîtier pour remplacer la pile lithium interne dédiée à l'horloge et à la mémoire." },
  { label: "Schiller - LED Rouge Clignotante + 3 bips", description: "Les électrodes ne sont pas détectées ou la date de péremption intégrée à la puce RFID est dépassée. Il faut remplacer les électrodes par un consommable neuf." },

  // Primedic
  { label: "Primedic - Err 21", description: "Erreur lors de la phase de charge haute tension (court-circuit détecté). Il faut vérifier l'absence de poussière conductrice sur la carte haute tension ou remplacer le transformateur de charge." },
  { label: "Primedic - Err 32", description: "Problème logiciel détecté sur le processeur esclave de sécurité. Il faut faire une mise à jour du firmware ou un remplacement de la puce d'origine." },
  { label: "Primedic - Err 45", description: "Dysfonctionnement du module d'enregistrement des données (carte SaveCard manquante ou défectueuse). Il faut insérer une carte mémoire Primedic valide." },

  // Mindray
  { label: "Mindray - Code 00-0022", description: "Erreur d'authentification ou d'identification de la batterie intelligente. Il faut nettoyer les contacts de la batterie ou tester avec une autre batterie d'origine Mindray." },
  { label: "Mindray - Code 01-0004", description: "Échec du circuit de détection d'impédance du patient. Il faut remplacer le câble patient (câble thérapeutique) ou nettoyer le connecteur femelle de l'appareil." },
  { label: "Mindray - Code 02-0008", description: "Erreur fatale du module de défibrillation (Échec du circuit d'analyse d'onde). L'appareil doit être immédiatement retiré du service pour remplacement de la carte principale." }
];

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

const registerButtonStyle: React.CSSProperties = {
  ...rowActionButton18Style,
  backgroundColor: 'rgb(53, 86, 236)',
  color: '#ffffff',
  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
};

// Custom Radio Component with exact design styling (representing white gap, rose border and pink dot)
function FormRadio({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center cursor-pointer gap-2 select-none justify-start text-left"
      style={{ fontSize: '15px', color: '#000000', fontWeight: '500' }}
    >
      <span 
        className="rounded-full relative transition-all bg-white"
        style={{
          border: checked ? '2.5px solid #fe4eba' : '2.5px solid #cbd5e1',
          width: '20px',
          height: '20px',
          minWidth: '20px',
          minHeight: '20px',
          backgroundColor: '#ffffff'
        }}
      >
        {checked && (
          <span 
            className="rounded-full bg-[#fe4eba] absolute" 
            style={{ 
              width: '9px', 
              height: '9px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        )}
      </span>
      <span className="text-[15px] font-semibold text-black">{label}</span>
    </button>
  );
}

function LocationPickerEvents({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

const parseDateSafely = (dateStr: string): Date | null => {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanStr = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
  }
  const match = cleanStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const nativeParsed = new Date(cleanStr);
  if (!isNaN(nativeParsed.getTime())) return nativeParsed;
  return null;
};

export default function GmaoCorrectionForm({
  report,
  isNew = false,
  onSave,
  onCancel,
  clients,
  variables,
  defibrillateurs,
  initialDefibId,
  stocks = [],
  members = [],
  forceSmartphoneLayout = false
}: GmaoCorrectionFormProps) {

  const availableMembers = React.useMemo<Member[]>(() => {
    let list: Member[] = [];
    if (members && members.length > 0) {
      list = members;
    } else {
      try {
        const keys = Object.keys(localStorage);
        const membersKey = keys.find(k => k.startsWith('defib_') && k.endsWith('_members'));
        if (membersKey) {
          const saved = localStorage.getItem(membersKey);
          if (saved) list = JSON.parse(saved);
        }
      } catch (e) {}
    }
    if (!list || list.length === 0) {
      list = [
        { name: 'Ronan Roesch', role: 'Propriétaire / Admin', email: 'roesch.ronan@gmail.com', status: 'Actif', lastActive: 'En ligne', pin: '1234' },
        { name: 'Technicien Ouest', role: 'Maintenance Terrain', email: 'tech.ouest@defibeo.com', status: 'Actif', lastActive: 'Il y a 10 min', pin: '4321' },
        { name: 'Secrétariat Clientèle', role: 'Support & Contrats', email: 'support@defibeo.com', status: 'Inactif', lastActive: 'Hier', pin: '0000' },
      ];
    }
    return list.filter(m => {
      const roleLower = (m.role || '').toLowerCase();
      return (
        roleLower.includes('tech') ||
        roleLower.includes('maintenance') ||
        roleLower.includes('terrain')
      );
    });
  }, [members]);

  // Auto-determination of selected DAE
  const [selectedDefibId, setSelectedDefibId] = useState(() => {
    return report?.defibId || initialDefibId || '';
  });

  const origDefib = defibrillateurs.find(
    d => d.id === selectedDefibId || d.identifiant === selectedDefibId
  );

  // Snapshot initialization
  const [snapshot, setSnapshot] = useState<Defibrillateur>(() => {
    const base = {
      ...DEFAULT_DEFIB,
      ...(origDefib ? origDefib : {}),
      ...(report?.defibSnapshot ? report.defibSnapshot : {})
    };
    if (isNew) {
      base.conforme = '' as any; // Par défaut à l’arrivée deselect
    }
    return base;
  });

  // Report fields
  const [clientPinCode, setClientPinCode] = useState(report?.clientPinCode || '');
  const [reportTitle, setReportTitle] = useState(report?.title || 'RAPPORT TECHNIQUE DÉFIBRILLATEUR');
  const [techName, setTechName] = useState(() => {
    if (report?.techName) return report.techName;
    try {
      const activeTechRaw = localStorage.getItem('defib_active_tech_session');
      if (activeTechRaw) {
        const activeTech = JSON.parse(activeTechRaw);
        if (activeTech && activeTech.name) return activeTech.name;
      }
    } catch (e) {}
    return 'Technicien connecté';
  });
  const [interventionDate, setInterventionDate] = useState(() => {
    if (report?.date) return report.date;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  });
  const [missionSite, setMissionSite] = useState<'DÉPLACEMENT' | 'ATELIER SAV'>(
    report?.siteMission === 'ATELIER SAV' ? 'ATELIER SAV' : 'DÉPLACEMENT'
  );
  const [photoUrl, setPhotoUrl] = useState(report?.photoUrl || '');
  const [errorText, setErrorText] = useState('');
  const [alertInfoErrors, setAlertInfoErrors] = useState<string[]>([]);
  const [hasClickedOnce, setHasClickedOnce] = useState(false);
  const [selectedErrorCode, setSelectedErrorCode] = useState('');

  // States for map position selection
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [tempLat, setTempLat] = useState<number>(48.8566);
  const [tempLng, setTempLng] = useState<number>(2.3522);

  // S3 Alarme & Armoire
  const [equipeAlarme, setEquipeAlarme] = useState<'Oui' | 'Non' | ''>(report?.equipeAlarme || 'Oui');
  const [alarme, setAlarme] = useState<'Oui' | 'Non' | ''>(report?.alarme || 'Non');
  const [armoireConnectee, setArmoireConnectee] = useState<'Oui' | 'Non'>(report?.armoireConnectee || 'Non');
  const [dispositifHandicap, setDispositifHandicap] = useState<'Oui' | 'Non'>(report?.dispositifHandicap || 'Non');
  const [signaletiqueConforme, setSignaletiqueConforme] = useState<'Oui' | 'Non'>(report?.signaletiqueConforme || 'Non');

  // S6 Electrode A
  const [electrodeARemplacee, setElectrodeARemplacee] = useState<'Oui' | 'Non'>(report?.electrodeARemplacee || 'Non');
  const [selectionElectrodeARemplacee, setSelectionElectrodeARemplacee] = useState<string>(report?.selectionElectrodeARemplacee || '');
  const [electrodeAConformeSante, setElectrodeAConformeSante] = useState<'Oui' | 'Non'>(report?.electrodeAConformeSante || 'Oui');
  const [electrodeASecoursRemplacee, setElectrodeASecoursRemplacee] = useState<'Oui' | 'Non'>(report?.electrodeASecoursRemplacee || 'Non');
  const [selectionElectrodeASecoursRemplacee, setSelectionElectrodeASecoursRemplacee] = useState<string>(report?.selectionElectrodeASecoursRemplacee || '');

  // S7 Electrode P
  const [electrodePRemplacee, setElectrodePRemplacee] = useState<'Oui' | 'Non'>(report?.electrodePRemplacee || 'Non');
  const [selectionElectrodePRemplacee, setSelectionElectrodePRemplacee] = useState<string>(report?.selectionElectrodePRemplacee || '');
  const [electrodePConformeSante, setElectrodePConformeSante] = useState<'Oui' | 'Non'>(report?.electrodePConformeSante || 'Oui');
  const [electrodePSecoursRemplacee, setElectrodePSecoursRemplacee] = useState<'Oui' | 'Non'>(report?.electrodePSecoursRemplacee || 'Non');
  const [selectionElectrodePSecoursRemplacee, setSelectionElectrodePSecoursRemplacee] = useState<string>(report?.selectionElectrodePSecoursRemplacee || '');

  // S8 Batterie
  const [batterieRemplacee, setBatterieRemplacee] = useState<'Oui' | 'Non'>(report?.batterieRemplacee || 'Non');
  const [selectionBatterieRemplacee, setSelectionBatterieRemplacee] = useState<string>(report?.selectionBatterieRemplacee || '');
  const [batterieConformeSante, setBatterieConformeSante] = useState<'Oui' | 'Non'>(
    report?.batterieConformeSante || (snapshot?.situationBatterie === 'Vert' ? 'Oui' : 'Non') || 'Oui'
  );

  // S9 Vérifications techniques
  const [techConformeArrivee, setTechConformeArrivee] = useState<'Oui' | 'Non' | ''>(report?.techConformeArrivee || '');
  const [techCommentaireArrivee, setTechCommentaireArrivee] = useState<string>(report?.techCommentaireArrivee || '');
  const [techVoyantConforme, setTechVoyantConforme] = useState<'Oui' | 'Non' | ''>(isNew ? '' : (report?.techVoyantConforme || ''));
  const [techEquipeMessageNumerique, setTechEquipeMessageNumerique] = useState<'Oui' | 'Non' | ''>(report?.techEquipeMessageNumerique || 'Oui');
  const [techMessageNumeroConforme, setTechMessageNumeroConforme] = useState<'Oui' | 'Non' | ''>(isNew ? '' : (report?.techMessageNumeroConforme || ''));
  const [techGuidesVocauxConformes, setTechGuidesVocauxConformes] = useState<'Oui' | 'Non' | ''>(isNew ? '' : (report?.techGuidesVocauxConformes || ''));
  const [techNettoyage, setTechNettoyage] = useState<'Oui' | 'Non' | ''>(isNew ? '' : (report?.techNettoyage || ''));
  const [techBranchementElectrodesConforme, setTechBranchementElectrodesConforme] = useState<'Oui' | 'Non' | ''>(isNew ? '' : (report?.techBranchementElectrodesConforme || ''));
  const [techDelivranceChocConforme, setTechDelivranceChocConforme] = useState<'Oui' | 'Non' | 'Non approprié' | ''>(isNew ? '' : (report?.techDelivranceChocConforme || ''));
  const [techResultatJoulesElectrodeA, setTechResultatJoulesElectrodeA] = useState<string>(report?.techResultatJoulesElectrodeA || '');
  const [techResultatJoulesElectrodeA2, setTechResultatJoulesElectrodeA2] = useState<string>(report?.techResultatJoulesElectrodeA2 || '');

  // S10 (n) Vérifications kit de secours
  const [kitTrousseSecoursPresent, setKitTrousseSecoursPresent] = useState<'Oui' | 'Non'>(report?.kitTrousseSecoursPresent || 'Oui');
  const [kitCiseauxPresents, setKitCiseauxPresents] = useState<'Oui' | 'Non'>(report?.kitCiseauxPresents || 'Oui');
  const [kitMasquePresent, setKitMasquePresent] = useState<'Oui' | 'Non'>(report?.kitMasquePresent || 'Oui');
  const [kitPeremptionMasque, setKitPeremptionMasque] = useState<string>(report?.kitPeremptionMasque || '');
  const [kitServiettesPresentes, setKitServiettesPresentes] = useState<'Oui' | 'Non'>(report?.kitServiettesPresentes || 'Oui');
  const [kitPeremptionServiettes, setKitPeremptionServiettes] = useState<string>(report?.kitPeremptionServiettes || '');
  const [kitGantsPresents, setKitGantsPresents] = useState<'Oui' | 'Non'>(report?.kitGantsPresents || 'Oui');
  const [kitRasoirPresent, setKitRasoirPresent] = useState<'Oui' | 'Non'>(report?.kitRasoirPresent || 'Oui');
  const [kitSecoursRemplaceOuAjoute, setKitSecoursRemplaceOuAjoute] = useState<'Oui' | 'Non'>(report?.kitSecoursRemplaceOuAjoute || 'Non');
  const [selectionKitSecoursRemplace, setSelectionKitSecoursRemplace] = useState<string>(report?.selectionKitSecoursRemplace || '');
  
  // S11 add-on
  const [fichierDonneesRecupere, setFichierDonneesRecupere] = useState<'Oui' | 'Non'>(report?.fichierDonneesRecupere || 'Non');
  
  const [emettreFactureBrouillon, setEmettreFactureBrouillon] = useState<'Oui' | 'Non'>(report?.emettreFactureBrouillon || 'Non');
  const [serviceEmettreId, setServiceEmettreId] = useState<string>(report?.serviceEmettreId || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isLotScannerOpen, setIsLotScannerOpen] = useState(false);
  const [isSerieScannerOpen, setIsSerieScannerOpen] = useState(false);
  const [isIdentifiantScannerOpen, setIsIdentifiantScannerOpen] = useState(false);
  const [isLookupScannerOpen, setIsLookupScannerOpen] = useState(false);
  const [isLotAScannerOpen, setIsLotAScannerOpen] = useState(false);
  const [isLotPScannerOpen, setIsLotPScannerOpen] = useState(false);
  const [isLotBatScannerOpen, setIsLotBatScannerOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [techSignature, setTechSignature] = useState(report?.techSignature || '');
  const [endTimeStamp, setEndTimeStamp] = useState(report?.endTimeStamp || '');
  const isDrawing = useRef(false);

  useEffect(() => {
    // If we have an existing signature and the canvas is mounted, draw it on the canvas
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
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setTechSignature(dataUrl);
      
      // Auto-populate Horodatage de fin if empty/not completed
      const nowStr = new Date().toLocaleString('fr-FR');
      setEndTimeStamp(nowStr);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTechSignature('');
  };

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
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

    // Scale coordinates accurately if bounding rectangle differs from actual design resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Sync snapshot when searched lookup Changes
  const handleDefibLookupChange = (defibId: string) => {
    setSelectedDefibId(defibId);
    const defib = defibrillateurs.find(d => d.id === defibId);
    if (defib) {
      setSnapshot({
        ...DEFAULT_DEFIB,
        ...defib
      });
    } else {
      setSnapshot(DEFAULT_DEFIB);
    }
  };

  const handleSnapshotChange = (key: keyof Defibrillateur, value: any) => {
    setSnapshot(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Str = reader.result as string;
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 500; // max width/height
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); // 60% quality is perfect and very small
            setPhotoUrl(compressedBase64);
          } else {
            setPhotoUrl(base64Str);
          }
        };
        img.onerror = () => {
          setPhotoUrl(base64Str);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setAlertInfoErrors([]);

    const errors: string[] = [];

    // Basic block validation
    if (!snapshot.identifiant.trim()) {
      errors.push("L'identifiant unique du défibrillateur est obligatoire.");
    }
    if (!snapshot.numeroSerie.trim()) {
      errors.push("Le numéro de série du défibrillateur est obligatoire.");
    }
    if (!snapshot.clientId) {
      errors.push("Veuillez associer un client à l'appareil.");
    }

    // 1. PIN Code validation
    const enteredPinTrimmed = clientPinCode.trim().toUpperCase();
    let isPinValid = true;
    if (!clientPinCode.trim()) {
      isPinValid = false;
    } else {
      const relatedClient = clients.find(c => c.id === snapshot.clientId);
      const isOriginalPin = report && report.clientPinCode && report.clientPinCode.trim().toUpperCase() === enteredPinTrimmed;

      if (relatedClient) {
        const clientStaticPin = relatedClient.signaturePin ? relatedClient.signaturePin.trim().toUpperCase() : '';
        
        if (clientStaticPin) {
          if (enteredPinTrimmed !== clientStaticPin && !isOriginalPin) {
            isPinValid = false;
          }
        } else {
          const pins = relatedClient.signaturePins || [];
          const hasAnyPins = pins.length > 0;
          
          if (hasAnyPins && !isOriginalPin) {
            const matchingPin = pins.find(p => p.code.toUpperCase() === enteredPinTrimmed);
            if (!matchingPin || matchingPin.status === 'validé') {
              isPinValid = false;
            }
          } else if (!isOriginalPin) {
            const pinRegex = /^[A-Z]{3}\d{3}$/;
            if (!pinRegex.test(enteredPinTrimmed)) {
              isPinValid = false;
            }
          }
        }
      } else {
        const pinRegex = /^[A-Z]{3}\d{3}$/;
        if (!pinRegex.test(enteredPinTrimmed) && !isOriginalPin) {
          isPinValid = false;
        }
      }
    }
    if (!isPinValid) {
      errors.push("Le code PIN de signature client s'est avéré invalide pour ce client.");
    }

    // 2. Dates validation
    const today = new Date();
    const todayPure = new Date(today);
    todayPure.setHours(0, 0, 0, 0);

    const twoYearsFromNow = new Date(today);
    twoYearsFromNow.setFullYear(today.getFullYear() + 2);

    const sixMonthsFromNow = new Date(today);
    sixMonthsFromNow.setMonth(today.getMonth() + 6);
    const sixMonthsFromNowPure = new Date(sixMonthsFromNow);
    sixMonthsFromNowPure.setHours(23, 59, 59, 999);

    const checkDateRules = (val: string, label: string) => {
      if (!val || !val.trim()) return;
      const d = parseDateSafely(val);
      if (!d) return;

      const dPure = new Date(d);
      dPure.setHours(0, 0, 0, 0);

      if (d > twoYearsFromNow) {
        errors.push(`La date de ${label} est à plus de 2 ans.`);
      }
      if (dPure < todayPure) {
        errors.push(`La date de ${label} est dans le passé.`);
      }
      if (dPure >= todayPure && dPure <= sixMonthsFromNowPure) {
        errors.push(`La date de ${label} est sous 6 mois.`);
      }
    };

    checkDateRules(snapshot.fabrication, "fabrication");
    checkDateRules(snapshot.miseEnService, "mise en service");
    checkDateRules(snapshot.finGarantie, "fin de garantie");
    checkDateRules(snapshot.insertionElectrodeA, "l'insertion de l'électrode adulte");
    checkDateRules(snapshot.peremptionElectrodeA, "la péremption de l'électrode adulte");
    checkDateRules(snapshot.peremptionSecoursElectrodeA, "la péremption de l’électrode de secours");
    checkDateRules(snapshot.insertionElectrodeP, "l'insertion de l'électrode pédiatrique");
    checkDateRules(snapshot.peremptionElectrodeP, "la péremption de l'électrode pédiatrique");
    checkDateRules(snapshot.peremptionSecoursElectrodeP, "la péremption de l’électrode de secours pédiatrique");
    checkDateRules(snapshot.insertionBatterie, "l'insertion de la batterie");
    checkDateRules(snapshot.peremptionBatterie, "la péremption de la batterie");
    checkDateRules(kitPeremptionMasque, "la péremption du masque");
    checkDateRules(kitPeremptionServiettes, "la péremption des serviettes");
    checkDateRules(interventionDate, "l'horodatage entrant");

    // 3. Special characters validation
    const checkSpecialChars = (val: string, label: string) => {
      if (!val || !val.trim()) return;
      const regex = /^[a-zA-Z0-9\sÀ-ÿŒœÆæ.,'_\-]*$/;
      if (!regex.test(val)) {
        const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
        errors.push(`${capLabel} contient des caractères spéciaux.`);
      }
    };

    checkSpecialChars(snapshot.identifiant, "identifiant");
    checkSpecialChars(snapshot.numeroSerie, "numéro de série");
    checkSpecialChars(snapshot.lotElectrodeA, "lot de l'électrode adulte");
    checkSpecialChars(snapshot.lotElectrodeASecours, "lot de l'électrode de secours");
    checkSpecialChars(snapshot.lotElectrodeP, "lot de l'électrode pédiatrique");
    checkSpecialChars(snapshot.lotElectrodePSecours, "lot de l'électrode de secours pédiatrique");
    checkSpecialChars(snapshot.lotBatterie, "lot de la batterie");
    checkSpecialChars(snapshot.numeroLotCoffret, "lot de boîtier");
    checkSpecialChars(reportTitle, "titre du rapport");

    // 4. Section 11 conforme validation (blocking)
    if (snapshot.conforme !== 'Oui' && snapshot.conforme !== 'Non') {
      errors.push("À la section 11, vous devez choisir Oui ou Non pour le défibrillateur conforme et prêt à l’usage. (Attention, ça c’est vraiment champ bloquant, c’est requis.)");
    }

    // 5. Section 9 arrivee conforme validation (blocking)
    if (techConformeArrivee !== 'Oui' && techConformeArrivee !== 'Non') {
      errors.push("À la section 9, vous devez choisir Oui ou Non pour (défibrillateur) conforme à mon arrivée. (Attention, ça c’est vraiment champ bloquant, c’est requis.)");
    }

    // 6. Section 11 signature validation (blocking)
    if (!techSignature || !techSignature.trim()) {
      errors.push("À la section 11, vous n’avez pas dessiné votre signature. (Attention, ça c’est vraiment champ bloquant, c’est requis.)");
    }

    // 7. Lot numbers but no expiration date checks
    if (snapshot.lotElectrodeA && !snapshot.peremptionElectrodeA) {
      errors.push("Vous avez renseigné un numéro de lot (lot de l'électrode adulte), mais vous n’avez pas renseigné de date de péremption.");
    }
    if (snapshot.lotElectrodeASecours && !snapshot.peremptionSecoursElectrodeA) {
      errors.push("Vous avez renseigné un numéro de lot (lot de l'électrode de secours), mais vous n’avez pas renseigné de date de péremption.");
    }
    if (snapshot.lotElectrodeP && !snapshot.peremptionElectrodeP) {
      errors.push("Vous avez renseigné un numéro de lot (lot de l'électrode pédiatrique), mais vous n’avez pas renseigné de date de péremption.");
    }
    if (snapshot.lotElectrodePSecours && !snapshot.peremptionSecoursElectrodeP) {
      errors.push("Vous avez renseigné un numéro de lot (lot de l'électrode de secours pédiatrique), mais vous n’avez pas renseigné de date de péremption.");
    }
    if (snapshot.lotBatterie && !snapshot.peremptionBatterie) {
      errors.push("Vous avez renseigné un numéro de lot (lot de la batterie), mais vous n’avez pas renseigné de date de péremption.");
    }

    // 8. Replaced option but no selected product checks
    if (electrodeARemplacee === 'Oui' && !selectionElectrodeARemplacee) {
      errors.push("Une électrode est marquée comme remplacée (électrode A remplacée), mais vous n’avez pas sélectionné d’électrode en remplacement.");
    }
    if (electrodeASecoursRemplacee === 'Oui' && !selectionElectrodeASecoursRemplacee) {
      errors.push("Une électrode de secours est marquée comme remplacée (électrode A Secours remplacée), mais vous n’avez pas sélectionné d’électrode de secours en remplacement.");
    }
    if (electrodePRemplacee === 'Oui' && !selectionElectrodePRemplacee) {
      errors.push("Une électrode est marquée comme remplacée (électrode P remplacée), mais vous n’avez pas sélectionné d’électrode en remplacement.");
    }
    if (electrodePSecoursRemplacee === 'Oui' && !selectionElectrodePSecoursRemplacee) {
      errors.push("Une électrode de secours est marquée comme remplacée (électrode P Secours remplacée), mais vous n’avez pas sélectionné d’électrode de secours en remplacement.");
    }
    if (batterieRemplacee === 'Oui' && !selectionBatterieRemplacee) {
      errors.push("La batterie est marquée comme remplacée (batterie remplacée), mais vous n’avez pas sélectionné de batterie en remplacement.");
    }
    if (kitSecoursRemplaceOuAjoute === 'Oui' && !selectionKitSecoursRemplace) {
      errors.push("Le kit de secours est marqué comme remplacé (kit de secours remplacé ou ajouté), mais vous n’avez pas sélectionné de kit de secours en remplacement.");
    }

    if (errors.length > 0) {
      if (!hasClickedOnce) {
        setAlertInfoErrors(errors);
        setHasClickedOnce(true);
        setTimeout(() => {
          document.getElementById('custom-alert-info-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      } else {
        const hasBlocking = errors.some(err => 
          err.includes("bloquant") || 
          err.includes("obligatoire") || 
          err.includes("associer un client") || 
          err.includes("invalide")
        );
        if (hasBlocking) {
          setAlertInfoErrors(errors);
          setErrorText("Veuillez corriger les erreurs bloquantes avant d'enregistrer.");
          setTimeout(() => {
            document.getElementById('custom-alert-info-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          return;
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const maintDate = interventionDate || todayStr;

    const finalSnapshot = {
      ...snapshot,
      derniereMaintenance: maintDate,
      situationBatterie: (batterieConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge',
      situationElectrodeA: (electrodeAConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge',
      situationElectrodeP: (electrodePConformeSante === 'Oui' ? 'Vert' : 'Rouge') as 'Vert' | 'Rouge'
    };

    // Auto-update replacement parts details in the defibrillator snap on submit
    if (electrodeARemplacee === 'Oui' && selectionElectrodeARemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodeARemplacee);
      if (st) {
        finalSnapshot.modeleElectrodeAId = st.denominationPieceId;
        finalSnapshot.lotElectrodeA = st.id;
        finalSnapshot.insertionElectrodeA = maintDate;
        finalSnapshot.situationElectrodeA = 'Vert';
      }
    }

    if (electrodeASecoursRemplacee === 'Oui' && selectionElectrodeASecoursRemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodeASecoursRemplacee);
      if (st) {
        finalSnapshot.modeleElectrodeASecoursId = st.denominationPieceId;
        finalSnapshot.lotElectrodeASecours = st.id;
      }
    }

    if (electrodePRemplacee === 'Oui' && selectionElectrodePRemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodePRemplacee);
      if (st) {
        finalSnapshot.modeleElectrodePId = st.denominationPieceId;
        finalSnapshot.lotElectrodeP = st.id;
        finalSnapshot.insertionElectrodeP = maintDate;
        finalSnapshot.situationElectrodeP = 'Vert';
      }
    }

    if (electrodePSecoursRemplacee === 'Oui' && selectionElectrodePSecoursRemplacee) {
      const st = stocks?.find(s => s.id === selectionElectrodePSecoursRemplacee);
      if (st) {
        finalSnapshot.modeleElectrodePSecoursId = st.denominationPieceId;
        finalSnapshot.lotElectrodePSecours = st.id;
      }
    }

    if (batterieRemplacee === 'Oui' && selectionBatterieRemplacee) {
      const st = stocks?.find(s => s.id === selectionBatterieRemplacee);
      if (st) {
        finalSnapshot.modeleBatterieId = st.denominationPieceId;
        finalSnapshot.lotBatterie = st.id;
        finalSnapshot.insertionBatterie = maintDate;
        finalSnapshot.pourcentageBatterie = '100';
        finalSnapshot.situationBatterie = 'Vert';
      }
    }

    const savedReportPayload = {
      ...report,
      title: reportTitle,
      techName: techName,
      date: interventionDate || new Date().toLocaleString('fr-FR'),
      defibId: finalSnapshot.id || selectedDefibId,
      defibIdentifiant: finalSnapshot.identifiant.toUpperCase(),
      siteMission: missionSite,
      photoUrl: photoUrl || undefined,
      defibSnapshot: finalSnapshot,
      techSignature: techSignature,
      endTimeStamp: endTimeStamp,
      clientPinCode: clientPinCode,
      
      // Section 3 additions
      equipeAlarme,
      alarme,
      armoireConnectee,
      dispositifHandicap,
      signaletiqueConforme,

      // Section 6 additions
      electrodeARemplacee,
      selectionElectrodeARemplacee,
      electrodeAConformeSante,
      electrodeASecoursRemplacee,
      selectionElectrodeASecoursRemplacee,

      // Section 7 additions
      electrodePRemplacee,
      selectionElectrodePRemplacee,
      electrodePConformeSante,
      electrodePSecoursRemplacee,
      selectionElectrodePSecoursRemplacee,

      // Section 8 additions
      batterieRemplacee,
      selectionBatterieRemplacee,
      batterieConformeSante,

      // Section 10 kit de secours additionnels
      kitPeremptionMasque,
      kitPeremptionServiettes,

      // Section 9 : Vérifications techniques
      techConformeArrivee,
      techCommentaireArrivee,
      techAccessibiliteConforme: 'Oui', // preserved for type and backward comp
      techEtatFonctionnelConforme: finalSnapshot.conforme || 'Oui', // mapped dependency
      techVoyantConforme,
      techEquipeMessageNumerique,
      techMessageNumeroConforme,
      techGuidesVocauxConformes,
      techNettoyage,
      techBranchementElectrodesConforme,
      techDelivranceChocConforme,
      techResultatJoulesElectrodeA,
      techResultatJoulesElectrodeA2,

      // n : Vérifications du kit de secours
      kitTrousseSecoursPresent,
      kitCiseauxPresents,
      kitMasquePresent,
      kitServiettesPresentes,
      kitGantsPresents,
      kitRasoirPresent,
      kitSecoursRemplaceOuAjoute,
      selectionKitSecoursRemplace,

      // Section 11 additions
      fichierDonneesRecupere,
      
      // Draft invoice integration
      emettreFactureBrouillon,
      serviceEmettreId
    };

    setIsSaving(true);
    setTimeout(() => {
      onSave(savedReportPayload);
      setIsSaving(false);
    }, 3000);
  };

  return (
    <div className={`w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto text-black pb-48 ${forceSmartphoneLayout ? 'force-smartphone-layout' : ''}`} id="gmao-correction-layout">
      {/* Header section identical in looks to Defibrillateurs with limited width */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
        style={{ border: '1px solid #dadada', borderTop: 'none', borderRadius: '0px 0px 18px 18px', maxWidth: '100%', margin: 'auto', padding: '20px' }}
        id="defib-form-header-box"
      >
        <div>
          <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000000', cursor: 'default' }}>
            {isNew || !report ? 'Nouveau Rapport' : 'Correction Document'}
          </h3>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            id="btn-close-gmao-modal"
            style={rowActionButton18Style}
            className="transition-colors cursor-pointer font-sans"
          >
            Fermer
          </button>

          <button
            type="submit"
            disabled={isSaving}
            form="gmao-correction-form"
            id="btn-submit-gmao-form"
            style={{ ...registerButtonStyle, opacity: isSaving ? 0.5 : (hasClickedOnce ? 0.85 : 1) }}
            className="transition-colors cursor-pointer font-sans"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {alertInfoErrors && alertInfoErrors.length > 0 && (
        <div 
          className="p-5 border rounded-2xl font-sans text-sm animate-fadeIn space-y-2" 
          style={{ 
            backgroundColor: '#fffdf5', 
            borderColor: '#eab308', 
            color: '#854d0e',
            maxWidth: '100%',
            margin: '12px auto'
          }} 
          id="custom-alert-info-box"
        >
          <div className="font-bold text-[15px] flex items-center gap-1.5" style={{ color: '#713f12' }}>
            <span>⚠️</span> Potentielles erreurs détectées :
          </div>
          <ul className="list-disc pl-5 mt-1.5 space-y-1">
            {alertInfoErrors.map((err, idx) => {
              const isBlocking = err.includes("Attention, ça c’est vraiment champ bloquant");
              return (
                <li key={idx} className={isBlocking ? "font-bold text-red-600" : ""}>
                  {err}
                </li>
              );
            })}
          </ul>
          <p className="text-xs pt-1 text-slate-500 italic">
            * S'il n'y a pas d'erreur bloquante (affichée en rouge gras), vous pouvez cliquer à nouveau sur "Enregistrer" pour confirmer votre choix de l'enregistrer dans cet état.
          </p>
        </div>
      )}

      {errorText && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold" style={{ maxWidth: '100%', margin: 'auto' }} id="correction-error">
          {errorText}
        </div>
      )}

      {/* Main core form */}
      <form onSubmit={handleSubmit} id="gmao-correction-form" className="space-y-6">
        <style>{`
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]),
          #gmao-correction-form select,
          #gmao-correction-form textarea {
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
            min-width: 0 !important;
            max-width: 100% !important;
          }
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]):hover,
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"]):focus,
          #gmao-correction-form select:hover,
          #gmao-correction-form select:focus,
          #gmao-correction-form textarea:hover,
          #gmao-correction-form textarea:focus {
            outline: 2.5px solid #fa53d5 !important;
            outline-offset: 2px !important;
            transition: all 0s !important;
          }
          #gmao-correction-form input:not([type="radio"]):not([type="checkbox"])::placeholder,
          #gmao-correction-form textarea::placeholder {
            color: #000000 !important;
            opacity: 1 !important;
            font-weight: 100 !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          }
          #gmao-correction-form input:disabled,
          #gmao-correction-form select:disabled,
          #gmao-correction-form textarea:disabled {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            background-color: #f1f5f9 !important;
            opacity: 0.95 !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
            cursor: not-allowed !important;
          }
          #gmao-correction-form select#snap-contrat:disabled {
            background-color: #ffffff !important;
            background: #ffffff !important;
          }
          #gmao-correction-form input:disabled:hover,
          #gmao-correction-form input:disabled:focus,
          #gmao-correction-form select:disabled:hover,
          #gmao-correction-form select:disabled:focus,
          #gmao-correction-form textarea:disabled:hover,
          #gmao-correction-form textarea:disabled:focus {
            outline: none !important;
          }
          #gmao-correction-form select {
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            background-image: none !important;
          }
          #gmao-correction-form select option {
            color: #000000 !important;
            background: #ffffff !important;
            font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          }
          #gmao-correction-form input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            -webkit-appearance: none !important;
            background: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          #gmao-correction-form input[type="date"] {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            display: block !important;
            width: 100% !important;
          }
          #gmao-correction-form input[type="date"]::-webkit-date-and-time-value {
            min-height: 1.5em;
            text-align: left;
          }
          #gmao-correction-form label,
          #gmao-correction-form .section-title-label,
          #gmao-correction-form span.block.uppercase {
            letter-spacing: normal !important;
            text-transform: none !important;
            font-size: 16px !important;
            color: #000000 !important;
            font-weight: 600 !important;
          }
          #gmao-correction-form input[type="radio"] {
            appearance: none !important;
            -webkit-appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 50% !important;
            background-color: #ffffff !important;
            outline: none !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
            margin-right: 6px !important;
          }
          #gmao-correction-form input[type="radio"]:hover {
            border-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="radio"]:checked {
            border-color: oklch(0.44 0.16 324.65) !important;
            background-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="radio"]:checked::after {
            content: "" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 8px !important;
            height: 8px !important;
            background-color: #ffffff !important;
            border-radius: 50% !important;
            display: block !important;
          }
          #gmao-correction-form input[type="checkbox"] {
            appearance: none !important;
            -webkit-appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            border: 2px solid #cbd5e1 !important;
            border-radius: 4px !important;
            background-color: #ffffff !important;
            outline: none !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.2s ease !important;
            margin-right: 6px !important;
          }
          #gmao-correction-form input[type="checkbox"]:hover {
            border-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="checkbox"]:checked {
            border-color: oklch(0.44 0.16 324.65) !important;
            background-color: oklch(0.44 0.16 324.65) !important;
          }
          #gmao-correction-form input[type="checkbox"]:checked::after {
            content: "✓" !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            color: #ffffff !important;
            font-size: 11px !important;
            font-weight: 900 !important;
            display: block !important;
          }
        `}</style>
        
        {/* Stacked Layout: Sections layered one on top of the other, identical to DefibTab.tsx */}
        <div className="space-y-0" style={{ maxWidth: '100%', margin: '12px auto 0px' }}>
          
          {/* Section 0 - Document Configuration & Lookup */}
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
                0 — Configuration
              </span>
            </div>

            {/* If New mode, represent lookup select input first */}
            {isNew && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Sélectionner un équipement.
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={selectedDefibId}
                    onChange={(e) => handleDefibLookupChange(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Choisir un DAE ou Saisir Libre --</option>
                    {defibrillateurs.map(df => (
                      <option key={df.id} value={df.id}>
                        {df.identifiant} - {df.numeroSerie}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorText('');
                      setIsLookupScannerOpen(true);
                    }}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans bg-black text-white hover:bg-neutral-900"
                  >
                    Scan
                  </button>
                </div>
                {isLookupScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLookupScannerOpen}
                    onClose={() => setIsLookupScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      const textUpper = scannedText.trim().toUpperCase();
                      const matchingDefib = defibrillateurs.find(
                        d => (d.identifiant || '').toUpperCase() === textUpper || (d.numeroSerie || '').toUpperCase() === textUpper
                      );
                      if (matchingDefib) {
                        handleDefibLookupChange(matchingDefib.id);
                      } else {
                        setErrorText(`Aucun équipement trouvé avec le code-barres "${scannedText}".`);
                      }
                      setIsLookupScannerOpen(false);
                    }}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Document Title */}
              <div className="space-y-1">
                <label htmlFor="select-cert-title" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Titre du document.
                </label>
                <select
                  id="select-cert-title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection d’un titre.</option>
                  <option value="RAPPORT TECHNIQUE DÉFIBRILLATEUR">RAPPORT TECHNIQUE DÉFIBRILLATEUR</option>
                  <option value="CONSTAT DE MAINTENANCE DÉFIBRILLATEUR">CONSTAT DE MAINTENANCE DÉFIBRILLATEUR</option>
                  <option value="RI RAPPORT INTERVENTION">RI RAPPORT INTERVENTION</option>
                  <option value="RAPPORT DISTANCIEL">RAPPORT DISTANCIEL</option>
                  <option value="BON PRÊT DÉFIBRILLATEUR">BON PRÊT DÉFIBRILLATEUR</option>
                  <option value="BON REPRISE DÉFIBRILLATEUR">BON REPRISE DÉFIBRILLATEUR</option>
                  <option value="MISE EN SERVICE DÉFIBRILLATEUR">MISE EN SERVICE DÉFIBRILLATEUR</option>
                </select>
              </div>

              {/* Redacteur */}
              <div className="space-y-1">
                <label htmlFor="input-tech-name" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Technicien.
                </label>
                <select
                  id="input-tech-name"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection du technicien.</option>
                  {availableMembers.map((m) => (
                    <option key={m.id || m.name} value={m.name}>
                      {m.name} {m.role ? `(${m.role})` : ''}
                    </option>
                  ))}
                  {techName && !availableMembers.some((m) => m.name === techName) && (
                    <option value={techName}>{techName}</option>
                  )}
                </select>
              </div>

              {/* Intervention Date */}
              <div className="space-y-1">
                <label htmlFor="input-interv-date" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Horodatage entrant.
                </label>
                <input
                  type="text"
                  id="input-interv-date"
                  value={interventionDate}
                  onChange={(e) => setInterventionDate(e.target.value)}
                  placeholder="Ex: 02-06-2026 14:15"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Mission Site */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Site de la mission.
                </label>
                <div className="flex gap-6 items-center pt-2">
                  <FormRadio
                    label="Déplacement."
                    checked={missionSite === 'DÉPLACEMENT'}
                    onChange={() => setMissionSite('DÉPLACEMENT')}
                  />
                  <FormRadio
                    label="Atelier."
                    checked={missionSite === 'ATELIER SAV'}
                    onChange={() => setMissionSite('ATELIER SAV')}
                  />
                </div>
              </div>

              {/* Photo Cliché */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase tracking-wider">
                  Photographie du défibrillateur.
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
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1 - Appareil Défibrillateur Raccordé */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                1 — Identification
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-identifiant" className="block text-[11px] font-bold text-black uppercase">
                  Identifiant.
                </label>
                <input
                  type="text"
                  id="snap-identifiant"
                  disabled
                  value={snapshot.identifiant || ''}
                  placeholder="Entrez un identifiant."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-numeroSerie" className="block text-[11px] font-bold text-black uppercase">
                  Série.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-numeroSerie"
                    required
                    value={snapshot.numeroSerie || ''}
                    onChange={(e) => handleSnapshotChange('numeroSerie', e.target.value)}
                    placeholder="Entrez un numéro de série."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSerieScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isSerieScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isSerieScannerOpen}
                    onClose={() => setIsSerieScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('numeroSerie', scannedText);
                      setIsSerieScannerOpen(false);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleId" className="block text-[11px] font-bold text-black uppercase">
                Modèle de défibrillateur.
              </label>
              <select
                id="snap-modeleId"
                value={snapshot.modeleId || ''}
                onChange={(e) => handleSnapshotChange('modeleId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                required
              >
                <option value="">Sélection d’un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Défibrillateur').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2 - Client & Contrat */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                2 — Client
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-clientId" className="block text-[11px] font-bold text-black uppercase">
                Client.
              </label>
              <select
                id="snap-clientId"
                value={snapshot.clientId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = clients.find(c => c.id === val);
                  if (matched) {
                    setSnapshot(prev => ({
                      ...prev,
                      clientId: val,
                      nomPrenomSite: matched.nomPrenomSite || '',
                      telephoneSite: matched.telephoneSite || '',
                      emailSite: matched.emailSite || '',
                      contrat: matched.contrat || 'Non',
                      nomContrat: matched.nomContrat || '',
                      referenceContrat: matched.referenceContrat || '',
                      debutContrat: matched.debutContrat || '',
                      finContrat: matched.finContrat || ''
                    }));
                  } else {
                    handleSnapshotChange('clientId', val);
                  }
                }}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                required
              >
                <option value="">Sélection d’un client.</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.denomination} ({c.siret})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-nomPrenomSite" className="block text-[11px] font-bold text-black uppercase">
                  Contact.
                </label>
                <input
                  type="text"
                  id="snap-nomPrenomSite"
                  value={snapshot.nomPrenomSite || ''}
                  onChange={(e) => handleSnapshotChange('nomPrenomSite', e.target.value)}
                  placeholder="Entrez un nom et prénom."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-telephoneSite" className="block text-[11px] font-bold text-black uppercase">
                  Téléphone du contact.
                </label>
                <input
                  type="text"
                  id="snap-telephoneSite"
                  value={snapshot.telephoneSite || ''}
                  onChange={(e) => handleSnapshotChange('telephoneSite', e.target.value)}
                  placeholder="Entrez un téléphone."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-emailSite" className="block text-[11px] font-bold text-black uppercase">
                  Email du contact.
                </label>
                <input
                  type="text"
                  id="snap-emailSite"
                  value={snapshot.emailSite || ''}
                  onChange={(e) => handleSnapshotChange('emailSite', e.target.value)}
                  placeholder="Entrez un email."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                />
              </div>
            </div>

            <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-contrat" className="block text-[11px] font-bold text-black uppercase">
                  Contrat.
                </label>
                <select
                  id="snap-contrat"
                  disabled
                  value={snapshot.contrat || 'Non'}
                  onChange={(e) => handleSnapshotChange('contrat', e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                >
                  <option value="">Aucun contrat.</option>
                  <option value="Oui">Oui (Contrat actif)</option>
                  <option value="Non">Aucun contrat.</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-referenceContrat" className="block text-[11px] font-bold text-black uppercase">
                  Référence du contrat.
                </label>
                <input
                  type="text"
                  id="snap-referenceContrat"
                  disabled
                  value={snapshot.referenceContrat || ''}
                  onChange={(e) => handleSnapshotChange('referenceContrat', e.target.value)}
                  placeholder="Aucune référence."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-nomContrat" className="block text-[11px] font-bold text-black uppercase">
                  Catégorie de contrat.
                </label>
                <input
                  type="text"
                  id="snap-nomContrat"
                  disabled
                  value={snapshot.nomContrat || ''}
                  onChange={(e) => handleSnapshotChange('nomContrat', e.target.value)}
                  placeholder="Aucune catégorie de contrat."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-3 mt-2 space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Émettre une facture brouillon.
                </label>
                <div className="flex items-center gap-4 text-xs mt-1">
                  <FormRadio
                    label="Oui"
                    checked={emettreFactureBrouillon === 'Oui'}
                    onChange={() => setEmettreFactureBrouillon('Oui')}
                  />
                  <FormRadio
                    label="Non"
                    checked={emettreFactureBrouillon === 'Non'}
                    onChange={() => {
                      setEmettreFactureBrouillon('Non');
                      setServiceEmettreId('');
                    }}
                  />
                </div>
              </div>

              {emettreFactureBrouillon === 'Oui' && (
                <div className="space-y-1 animate-fadeIn">
                  <label htmlFor="serviceEmettreId" className="block text-[11px] font-bold text-black uppercase">
                    Sélection d’un service.
                  </label>
                  <select
                    id="serviceEmettreId"
                    value={serviceEmettreId}
                    onChange={(e) => setServiceEmettreId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                    required={emettreFactureBrouillon === 'Oui'}
                  >
                    <option value="">Sélectionner un service...</option>
                     {(() => {
                      const serviceStocks = (stocks || []).filter(st => {
                        const variable = variables.find(v => v.id === st.denominationPieceId);
                        if (!variable) return false;
                        const cat = (variable.category || '').toLowerCase();
                        const nom = (variable.nom || '').toLowerCase();
                        return cat.includes('service') || nom.includes('service');
                      });

                      const serviceVariablesOnly = (variables || []).filter(v => {
                        const cat = (v.category || '').toLowerCase();
                        const nom = (v.nom || '').toLowerCase();
                        const isService = cat.includes('service') || nom.includes('service');
                        if (!isService) return false;
                        return !serviceStocks.some(st => st.denominationPieceId === v.id);
                      });

                      const hasAny = serviceStocks.length > 0 || serviceVariablesOnly.length > 0;
                      
                      if (hasAny) {
                        return (
                          <>
                            {serviceStocks.map(st => {
                              const variable = variables.find(v => v.id === st.denominationPieceId);
                              const label = variable ? `${variable.nom} (${variable.marque})` : 'Service Inconnu';
                              return (
                                <option key={st.id} value={st.id}>
                                  {label} — {st.prixVenteHt} € HT
                                </option>
                              );
                            })}
                            {serviceVariablesOnly.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.nom} ({v.marque}) — 150 € HT (Virtuel)
                              </option>
                            ))}
                          </>
                        );
                      }

                      // Fallback options when tenant has empty variables/stocks
                      const fallbacks = [
                        { id: 'st_fallback_srv_1', label: 'Maintenance Préventive standard (Défibeo)', price: 150 },
                        { id: 'st_fallback_srv_2', label: 'Mise en service DAE (Défibeo)', price: 120 },
                        { id: 'st_fallback_srv_3', label: 'Audit de conformité (Défibeo)', price: 95 }
                      ];

                      return fallbacks.map(fb => (
                        <option key={fb.id} value={fb.id}>
                          {fb.label} — {fb.price} € HT
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3 - Coffret */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                3 — Coffret
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-modeleCoffretId" className="block text-[11px] font-bold text-black uppercase">
                  Modèle de boîtier.
                </label>
                <select
                  id="snap-modeleCoffretId"
                  value={snapshot.modeleCoffretId || ''}
                  onChange={(e) => handleSnapshotChange('modeleCoffretId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélection d’un modèle de coffret.</option>
                  {variables.filter(v => v.category === 'Modèle Coffret').map(v => (
                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-numeroLotCoffret" className="block text-[11px] font-bold text-black uppercase">
                  Lot de boîtier.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-numeroLotCoffret"
                    value={snapshot.numeroLotCoffret || ''}
                    onChange={(e) => handleSnapshotChange('numeroLotCoffret', e.target.value)}
                    placeholder="Entrez un numéro de lot de boîtier."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotScannerOpen}
                    onClose={() => setIsLotScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('numeroLotCoffret', scannedText);
                      setIsLotScannerOpen(false);
                    }}
                  />
                )}
              </div>
            </div>

            {/* New additions Section 3 (Alarme, Armoire connected, Dispositif handicap, Signalétique, Commentaire) */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Équipé d’une alarme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={equipeAlarme === 'Oui'} 
                    onChange={() => {
                      setEquipeAlarme('Oui');
                    }} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={equipeAlarme === 'Non'} 
                    onChange={() => {
                      setEquipeAlarme('Non');
                      setAlarme('');
                    }} 
                  />
                </div>
              </div>

              <div className={`space-y-1 bg-white transition-opacity duration-200 ${equipeAlarme === 'Non' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-[11px] font-bold text-black uppercase">
                  Alarme fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={alarme === 'Oui' && equipeAlarme !== 'Non'} 
                    onChange={() => equipeAlarme !== 'Non' && setAlarme('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={alarme === 'Non' && equipeAlarme !== 'Non'} 
                    onChange={() => equipeAlarme !== 'Non' && setAlarme('Non')} 
                  />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Dispositif d’armoire connectée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={armoireConnectee === 'Oui'} onChange={() => setArmoireConnectee('Oui')} />
                  <FormRadio label="Non" checked={armoireConnectee === 'Non'} onChange={() => setArmoireConnectee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Dispositif handicap.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={dispositifHandicap === 'Oui'} onChange={() => setDispositifHandicap('Oui')} />
                  <FormRadio label="Non" checked={dispositifHandicap === 'Non'} onChange={() => setDispositifHandicap('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Signalétique conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={signaletiqueConforme === 'Oui'} onChange={() => setSignaletiqueConforme('Oui')} />
                  <FormRadio label="Non" checked={signaletiqueConforme === 'Non'} onChange={() => setSignaletiqueConforme('Non')} />
                </div>
              </div>
            </div>

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireCoffret" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant le boîtier.
              </label>
              <textarea
                id="snap-commentaireCoffret"
                value={snapshot.commentaireCoffret || ''}
                onChange={(e) => handleSnapshotChange('commentaireCoffret', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                rows={2}
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 4 - Accès */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                4 — Accès
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-numVoie" className="block text-[11px] font-bold text-black uppercase">
                  Voie.
                </label>
                <input
                  type="text"
                  id="snap-numVoie"
                  value={snapshot.numVoie || ''}
                  onChange={(e) => handleSnapshotChange('numVoie', e.target.value)}
                  placeholder="Entrez un numéro et une rue."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-ville" className="block text-[11px] font-bold text-black uppercase">
                  Ville.
                </label>
                <input
                  type="text"
                  id="snap-ville"
                  value={snapshot.ville || ''}
                  onChange={(e) => handleSnapshotChange('ville', e.target.value)}
                  placeholder="Entrez une ville."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-cp" className="block text-[11px] font-bold text-black uppercase">
                  Code postal.
                </label>
                <input
                  type="text"
                  id="snap-cp"
                  value={snapshot.cp || ''}
                  onChange={(e) => handleSnapshotChange('cp', e.target.value)}
                  placeholder="Entrez un code postal."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-region" className="block text-[11px] font-bold text-black uppercase">
                  Région.
                </label>
                <select
                  id="snap-region"
                  value={snapshot.region || ''}
                  onChange={(e) => handleSnapshotChange('region', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 cursor-pointer"
                >
                  <option value="">Sélectionnez une région.</option>
                  {REGIONS_FRANCAISES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-pays" className="block text-[11px] font-bold text-black uppercase">
                  Pays.
                </label>
                <select
                  id="snap-pays"
                  value={snapshot.pays || ''}
                  onChange={(e) => handleSnapshotChange('pays', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 cursor-pointer"
                >
                  <option value="">Sélectionnez un pays.</option>
                  {['France', 'Espagne', 'Portugal', 'Suisse', 'Belgique', 'Luxembourg', 'Monaco', 'Switzerland', 'United Kingdom', 'Deutschland', 'Nederland'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-latitude" className="block text-[11px] font-bold text-black uppercase">
                  Latitude GPS.
                </label>
                <input
                  type="text"
                  id="snap-latitude"
                  disabled
                  value={snapshot.latitude || ''}
                  onChange={(e) => handleSnapshotChange('latitude', e.target.value)}
                  placeholder="Entrez une coordonnée."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-mono text-xs cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-longitude" className="block text-[11px] font-bold text-black uppercase">
                  Longitude GPS.
                </label>
                <input
                  type="text"
                  id="snap-longitude"
                  disabled
                  value={snapshot.longitude || ''}
                  onChange={(e) => handleSnapshotChange('longitude', e.target.value)}
                  placeholder="Entrez une coordonnée."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-mono text-xs cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const savedLat = parseFloat(snapshot.latitude) || 48.8566;
                  const savedLng = parseFloat(snapshot.longitude) || 2.3522;
                  setTempLat(savedLat);
                  setTempLng(savedLng);
                  setIsMapPickerOpen(true);
                }}
                style={{ ...rowActionButton18Style, width: '100%', textTransform: 'none' }}
                className="font-sans"
              >
                Ajuster la position
              </button>
            </div>
          </div>

          {/* Section 5 - Dates */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                5 — Dates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-fabrication" className="block text-[11px] font-bold text-black uppercase">
                  Fabrication.
                </label>
                <input
                  type="date"
                  id="snap-fabrication"
                  value={snapshot.fabrication || ''}
                  onChange={(e) => handleSnapshotChange('fabrication', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-miseEnService" className="block text-[11px] font-bold text-black uppercase">
                  Mise en service.
                </label>
                <input
                  type="date"
                  id="snap-miseEnService"
                  value={snapshot.miseEnService || ''}
                  onChange={(e) => handleSnapshotChange('miseEnService', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-finGarantie" className="block text-[11px] font-bold text-black uppercase">
                  Fin de garantie.
                </label>
                <input
                  type="date"
                  id="snap-finGarantie"
                  value={snapshot.finGarantie || ''}
                  onChange={(e) => handleSnapshotChange('finGarantie', e.target.value)}
                  placeholder="Entrez une date."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 6 - Électrode Adulte */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                6 — Électrode Adulte (A)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleElectrodeAId" className="block text-[11px] font-bold text-black uppercase">
                Modèle d’électrode A.
              </label>
              <select
                id="snap-modeleElectrodeAId"
                value={snapshot.modeleElectrodeAId || ''}
                onChange={(e) => handleSnapshotChange('modeleElectrodeAId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs cursor-pointer"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-lotElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                Lot A.
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  id="snap-lotElectrodeA"
                  value={snapshot.lotElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('lotElectrodeA', e.target.value)}
                  placeholder="Entrez une référence."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsLotAScannerOpen(true)}
                  style={rowActionButton18Style}
                  className="shrink-0 transition-colors cursor-pointer font-sans"
                >
                  Scan
                </button>
              </div>
              {isLotAScannerOpen && (
                <BarcodeScannerModal
                  isOpen={isLotAScannerOpen}
                  onClose={() => setIsLotAScannerOpen(false)}
                  onScanSuccess={(scannedText) => {
                    handleSnapshotChange('lotElectrodeA', scannedText);
                    setIsLotAScannerOpen(false);
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-insertionElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Insertion.
                </label>
                <input
                  type="date"
                  id="snap-insertionElectrodeA"
                  value={snapshot.insertionElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('insertionElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="snap-peremptionElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionElectrodeA"
                  value={snapshot.peremptionElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('peremptionElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="pt-3 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
              <div className="space-y-1">
                <label htmlFor="snap-modeleElectrodeASecoursId" className="block text-[11px] font-bold text-black uppercase">
                  Modèle d’électrode de secours.
                </label>
                <select
                  id="snap-modeleElectrodeASecoursId"
                  value={snapshot.modeleElectrodeASecoursId || ''}
                  onChange={(e) => handleSnapshotChange('modeleElectrodeASecoursId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs cursor-pointer"
                >
                  <option value="">Sélectionnez un modèle de secours.</option>
                  {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-lotElectrodeASecours" className="block text-[11px] font-bold text-black uppercase">
                  Lot de l’électrode de secours.
                </label>
                <input
                  type="text"
                  id="snap-lotElectrodeASecours"
                  value={snapshot.lotElectrodeASecours || ''}
                  onChange={(e) => handleSnapshotChange('lotElectrodeASecours', e.target.value)}
                  placeholder="Numéro de lot"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-peremptionSecoursElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Péremption de l’électrode de secours.
                </label>
                <input
                  type="date"
                  id="snap-peremptionSecoursElectrodeA"
                  value={snapshot.peremptionSecoursElectrodeA || ''}
                  onChange={(e) => handleSnapshotChange('peremptionSecoursElectrodeA', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 6 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodeARemplacee === 'Oui'} onChange={() => setElectrodeARemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodeARemplacee === 'Non'} onChange={() => setElectrodeARemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodeAConformeSante === 'Oui'} onChange={() => setElectrodeAConformeSante('Oui')} />
                  <FormRadio label="Non" checked={electrodeAConformeSante === 'Non'} onChange={() => setElectrodeAConformeSante('Non')} />
                </div>
              </div>
            </div>

            {electrodeARemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-a-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode remplacée.
                </label>
                <select
                  id="select-electrode-a-rempc"
                  value={selectionElectrodeARemplacee}
                  onChange={(e) => setSelectionElectrodeARemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Secours Electrode A Replacement Fields */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A Secours remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodeASecoursRemplacee === 'Oui'} onChange={() => setElectrodeASecoursRemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodeASecoursRemplacee === 'Non'} onChange={() => setElectrodeASecoursRemplacee('Non')} />
                </div>
              </div>
            </div>

            {electrodeASecoursRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-a-secours-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode Secours A remplacée.
                </label>
                <select
                  id="select-electrode-a-secours-rempc"
                  value={selectionElectrodeASecoursRemplacee}
                  onChange={(e) => setSelectionElectrodeASecoursRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode de secours stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant l’électrode A.
              </label>
              <input
                type="text"
                id="snap-commentaireElectrodeA"
                value={snapshot.commentaireElectrodeA || ''}
                onChange={(e) => handleSnapshotChange('commentaireElectrodeA', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 7 - Électrode Pédiatrique */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                7 — Électrode Pédiatrique (P)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleElectrodePId" className="block text-[11px] font-bold text-black uppercase">
                Modèle d’électrode P
              </label>
              <select
                id="snap-modeleElectrodePId"
                value={snapshot.modeleElectrodePId || ''}
                onChange={(e) => handleSnapshotChange('modeleElectrodePId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer text-slate-800"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-lotElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Lot P.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-lotElectrodeP"
                    value={snapshot.lotElectrodeP || ''}
                    onChange={(e) => handleSnapshotChange('lotElectrodeP', e.target.value)}
                    placeholder="Entrez une référence."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotPScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotPScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotPScannerOpen}
                    onClose={() => setIsLotPScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('lotElectrodeP', scannedText);
                      setIsLotPScannerOpen(false);
                    }}
                  />
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-peremptionElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionElectrodeP"
                  value={snapshot.peremptionElectrodeP || ''}
                  onChange={(e) => handleSnapshotChange('peremptionElectrodeP', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="pt-3 mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
              <div className="space-y-1">
                <label htmlFor="snap-modeleElectrodePSecoursId" className="block text-[11px] font-bold text-black uppercase">
                  Modèle d’électrode de secours.
                </label>
                <select
                  id="snap-modeleElectrodePSecoursId"
                  value={snapshot.modeleElectrodePSecoursId || ''}
                  onChange={(e) => handleSnapshotChange('modeleElectrodePSecoursId', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs cursor-pointer"
                >
                  <option value="">Sélectionnez un modèle de secours.</option>
                  {variables.filter(v => v.category === 'Modèle Électrode').map(v => (
                    <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-lotElectrodePSecours" className="block text-[11px] font-bold text-black uppercase">
                  Lot de l’électrode de secours.
                </label>
                <input
                  type="text"
                  id="snap-lotElectrodePSecours"
                  value={snapshot.lotElectrodePSecours || ''}
                  onChange={(e) => handleSnapshotChange('lotElectrodePSecours', e.target.value)}
                  placeholder="Numéro de lot"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-peremptionSecoursElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                  Péremption de l’électrode de secours.
                </label>
                <input
                  type="date"
                  id="snap-peremptionSecoursElectrodeP"
                  value={snapshot.peremptionSecoursElectrodeP || ''}
                  onChange={(e) => handleSnapshotChange('peremptionSecoursElectrodeP', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 7 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode P remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodePRemplacee === 'Oui'} onChange={() => setElectrodePRemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodePRemplacee === 'Non'} onChange={() => setElectrodePRemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode A conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodePConformeSante === 'Oui'} onChange={() => setElectrodePConformeSante('Oui')} />
                  <FormRadio label="Non" checked={electrodePConformeSante === 'Non'} onChange={() => setElectrodePConformeSante('Non')} />
                </div>
              </div>
            </div>

            {electrodePRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-p-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode remplacée.
                </label>
                <select
                  id="select-electrode-p-rempc"
                  value={selectionElectrodePRemplacee}
                  onChange={(e) => setSelectionElectrodePRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Secours Electrode P Replacement Fields */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Électrode P Secours remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={electrodePSecoursRemplacee === 'Oui'} onChange={() => setElectrodePSecoursRemplacee('Oui')} />
                  <FormRadio label="Non" checked={electrodePSecoursRemplacee === 'Non'} onChange={() => setElectrodePSecoursRemplacee('Non')} />
                </div>
              </div>
            </div>

            {electrodePSecoursRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-electrode-p-secours-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de l'électrode Secours P remplacée.
                </label>
                <select
                  id="select-electrode-p-secours-rempc"
                  value={selectionElectrodePSecoursRemplacee}
                  onChange={(e) => setSelectionElectrodePSecoursRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner l'électrode de secours stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireElectrodeP" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant l’électrode P.
              </label>
              <input
                type="text"
                id="snap-commentaireElectrodeP"
                value={snapshot.commentaireElectrodeP || ''}
                onChange={(e) => handleSnapshotChange('commentaireElectrodeP', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 8 - Batterie */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                8 — Batterie (B)
              </span>
            </div>

            <div className="space-y-1">
              <label htmlFor="snap-modeleBatterieId" className="block text-[11px] font-bold text-black uppercase">
                Modèle de batterie.
              </label>
              <select
                id="snap-modeleBatterieId"
                value={snapshot.modeleBatterieId || ''}
                onChange={(e) => handleSnapshotChange('modeleBatterieId', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer text-slate-800"
              >
                <option value="">Sélectionnez un modèle.</option>
                {variables.filter(v => v.category === 'Modèle Batterie').map(v => (
                  <option key={v.id} value={v.id}>{v.nom} ({v.marque})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="snap-pourcentageBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Pourcentage de charge.
                </label>
                <input
                  type="number"
                  id="snap-pourcentageBatterie"
                  max={100}
                  min={0}
                  required
                  value={snapshot.pourcentageBatterie || ''}
                  onChange={(e) => handleSnapshotChange('pourcentageBatterie', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-mono font-bold"
                  placeholder="Entrez un nombre."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="snap-lotBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Lot B.
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    id="snap-lotBatterie"
                    value={snapshot.lotBatterie || ''}
                    onChange={(e) => handleSnapshotChange('lotBatterie', e.target.value)}
                    placeholder="Entrez une référence."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLotBatScannerOpen(true)}
                    style={rowActionButton18Style}
                    className="shrink-0 transition-colors cursor-pointer font-sans"
                  >
                    Scan
                  </button>
                </div>
                {isLotBatScannerOpen && (
                  <BarcodeScannerModal
                    isOpen={isLotBatScannerOpen}
                    onClose={() => setIsLotBatScannerOpen(false)}
                    onScanSuccess={(scannedText) => {
                      handleSnapshotChange('lotBatterie', scannedText);
                      setIsLotBatScannerOpen(false);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label htmlFor="snap-peremptionBatterie" className="block text-[11px] font-bold text-black uppercase">
                  Péremption.
                </label>
                <input
                  type="date"
                  id="snap-peremptionBatterie"
                  value={snapshot.peremptionBatterie || ''}
                  onChange={(e) => handleSnapshotChange('peremptionBatterie', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Section 8 Extra Fields requested by User */}
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Batterie remplacée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={batterieRemplacee === 'Oui'} onChange={() => setBatterieRemplacee('Oui')} />
                  <FormRadio label="Non" checked={batterieRemplacee === 'Non'} onChange={() => setBatterieRemplacee('Non')} />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Batterie conforme et fonctionnelle.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={batterieConformeSante === 'Oui'} onChange={() => setBatterieConformeSante('Oui')} />
                  <FormRadio label="Non" checked={batterieConformeSante === 'Non'} onChange={() => setBatterieConformeSante('Non')} />
                </div>
              </div>
            </div>

            {batterieRemplacee === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-batterie-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection de la batterie.
                </label>
                <select
                  id="select-batterie-rempc"
                  value={selectionBatterieRemplacee}
                  onChange={(e) => setSelectionBatterieRemplacee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner la batterie stockée...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="pt-3 space-y-1 bg-white">
              <label htmlFor="snap-commentaireBatterie" className="block text-[11px] font-bold text-black uppercase">
                Commentaire concernant la batterie.
              </label>
              <input
                type="text"
                id="snap-commentaireBatterie"
                value={snapshot.commentaireBatterie || ''}
                onChange={(e) => handleSnapshotChange('commentaireBatterie', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-850"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

          {/* Section 9 - Vérifications techniques */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                9 — Vérifications techniques
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              {/* Conforme à mon arrivée (Full width span) */}
              <div className="col-span-1 md:col-span-2 space-y-1 bg-white pb-3">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Conforme à mon arrivée.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={techConformeArrivee === 'Oui'} 
                    onChange={() => setTechConformeArrivee('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={techConformeArrivee === 'Non'} 
                    onChange={() => setTechConformeArrivee('Non')} 
                  />
                </div>
              </div>

              {/* Commentaire sur l'état à mon arrivée (Full width span) */}
              <div className="col-span-1 md:col-span-2 space-y-1 bg-white pb-3">
                <label htmlFor="techCommentaireArrivee" className="block text-[11px] font-bold text-black uppercase">
                  Commentaire sur l’état à mon arrivée.
                </label>
                <input
                  type="text"
                  id="techCommentaireArrivee"
                  value={techCommentaireArrivee}
                  onChange={(e) => setTechCommentaireArrivee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-805 rounded-lg text-xs"
                  placeholder="Saisissez un commentaire sur l'état constaté à votre arrivée..."
                />
              </div>

              {/* 1. Nettoyage. (Moved first!) */}
              <div className="space-y-1 bg-white animate-fadeIn">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Nettoyage.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techNettoyage === 'Oui'} onChange={() => setTechNettoyage('Oui')} />
                  <FormRadio label="Non" checked={techNettoyage === 'Non'} onChange={() => setTechNettoyage('Non')} />
                </div>
              </div>

              {/* 2. Voyant conforme. */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Voyant conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techVoyantConforme === 'Oui'} onChange={() => setTechVoyantConforme('Oui')} />
                  <FormRadio label="Non" checked={techVoyantConforme === 'Non'} onChange={() => setTechVoyantConforme('Non')} />
                </div>
              </div>

              {/* 3. Équipé d’un message numérique. (New!) */}
              <div className="space-y-1 bg-white animate-fadeIn">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Équipé d’un message numérique.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={techEquipeMessageNumerique === 'Oui'} 
                    onChange={() => setTechEquipeMessageNumerique('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={techEquipeMessageNumerique === 'Non'} 
                    onChange={() => {
                      setTechEquipeMessageNumerique('Non');
                      setTechMessageNumeroConforme('');
                    }} 
                  />
                </div>
              </div>

              {/* 4. Message numérique conforme. (Dependent on Equipé d'un message numérique) */}
              <div className={`space-y-1 bg-white transition-opacity duration-200 ${techEquipeMessageNumerique === 'Non' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-[11px] font-bold text-black uppercase">
                  Message numérique conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={techMessageNumeroConforme === 'Oui' && techEquipeMessageNumerique !== 'Non'} 
                    onChange={() => techEquipeMessageNumerique !== 'Non' && setTechMessageNumeroConforme('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={techMessageNumeroConforme === 'Non' && techEquipeMessageNumerique !== 'Non'} 
                    onChange={() => techEquipeMessageNumerique !== 'Non' && setTechMessageNumeroConforme('Non')} 
                  />
                </div>
              </div>

              {/* 5. Guides vocaux conformes. */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Guides vocaux conformes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techGuidesVocauxConformes === 'Oui'} onChange={() => setTechGuidesVocauxConformes('Oui')} />
                  <FormRadio label="Non" checked={techGuidesVocauxConformes === 'Non'} onChange={() => setTechGuidesVocauxConformes('Non')} />
                </div>
              </div>

              {/* 6. Branchement conforme des électrodes. */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Branchement conforme des électrodes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techBranchementElectrodesConforme === 'Oui'} onChange={() => setTechBranchementElectrodesConforme('Oui')} />
                  <FormRadio label="Non" checked={techBranchementElectrodesConforme === 'Non'} onChange={() => setTechBranchementElectrodesConforme('Non')} />
                </div>
              </div>

              {/* 7. Délivrance du choc conforme. */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Délivrance du choc conforme.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={techDelivranceChocConforme === 'Oui'} onChange={() => setTechDelivranceChocConforme('Oui')} />
                  <FormRadio label="Non" checked={techDelivranceChocConforme === 'Non'} onChange={() => setTechDelivranceChocConforme('Non')} />
                  <FormRadio label="Non approprié" checked={techDelivranceChocConforme === 'Non approprié'} onChange={() => setTechDelivranceChocConforme('Non approprié')} />
                </div>
              </div>

              {/* Spacer */}
              <div className="col-span-1 md:col-span-2 bg-white" />

              <div 
                className="col-span-1 md:col-span-2 rounded-xl p-4 leading-relaxed space-y-2 text-left"
                style={{ background: '#ffe8f6', border: 'none', fontSize: '16px', color: '#69236d' }}
              >
                <div className="font-bold flex items-start home-important" style={{ color: '#69236d', fontSize: '16px' }}>
                  <span>Important : Conformément aux manuels techniques des fabricants et aux recommandations de l'ANSM, la réalisation de tests de décharge de choc externe sur simulateur est proscrite ou déconseillée pour les modèles suivants :</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-3" style={{ color: '#69236d', fontSize: '16px' }}>
                  <li><strong style={{ color: '#69236d' }}>ZOLL</strong> : AED Plus et AED 3</li>
                  <li><strong style={{ color: '#69236d' }}>PHILIPS</strong> : HeartStart HS1 et FRx</li>
                  <li><strong style={{ color: '#69236d' }}>CARDIAC SCIENCE / ZOLL</strong> : Powerheart G3 et G5 (la validation repose exclusivement sur la technologie d'autotest intégrée Rescue Ready)</li>
                  <li><strong style={{ color: '#69236d' }}>LIFEAZ</strong> : Clark (télésurveillance et autotests internes dématérialisés)</li>
                </ul>
              </div>

              {/* 8. Résultat du test en joules de l’électrode A */}
              <div className="space-y-1 bg-white">
                <label htmlFor="techResultatJoulesElectrodeA" className="block text-[11px] font-bold text-black uppercase">
                  Résultat du test en joules de l’électrode A.
                </label>
                <input
                  type="number"
                  id="techResultatJoulesElectrodeA"
                  value={techResultatJoulesElectrodeA}
                  onChange={(e) => setTechResultatJoulesElectrodeA(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-805 rounded-lg text-xs font-mono"
                  placeholder="Saisissez un chiffre..."
                />
              </div>

              {/* 9. Résultat du test en joules de l’électrode P */}
              <div className="space-y-1 bg-white">
                <label htmlFor="techResultatJoulesElectrodeA2" className="block text-[11px] font-bold text-black uppercase">
                  Résultat du test en joules de l’électrode P.
                </label>
                <input
                  type="number"
                  id="techResultatJoulesElectrodeA2"
                  value={techResultatJoulesElectrodeA2}
                  onChange={(e) => setTechResultatJoulesElectrodeA2(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-805 rounded-lg text-xs font-mono"
                  placeholder="Saisissez un chiffre..."
                />
              </div>
            </div>
          </div>

          {/* Section 10 - Vérifications du kit de secours */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
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
                10 — Vérifications du kit de secours
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              {/* 1. Trousse de secours présente */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Trousse de secours présente.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitTrousseSecoursPresent === 'Oui'} onChange={() => setKitTrousseSecoursPresent('Oui')} />
                  <FormRadio label="Non" checked={kitTrousseSecoursPresent === 'Non'} onChange={() => setKitTrousseSecoursPresent('Non')} />
                </div>
              </div>

              {/* 2. Kit de secours remplacé ou ajouté */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Kit de secours remplacé ou ajouté.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitSecoursRemplaceOuAjoute === 'Oui'} onChange={() => setKitSecoursRemplaceOuAjoute('Oui')} />
                  <FormRadio label="Non" checked={kitSecoursRemplaceOuAjoute === 'Non'} onChange={() => setKitSecoursRemplaceOuAjoute('Non')} />
                </div>
              </div>
            </div>

            {/* Selection with NO line divider */}
            {kitSecoursRemplaceOuAjoute === 'Oui' && (
              <div className="pt-3 space-y-1 bg-white animate-fadeIn">
                <label htmlFor="select-kit-rempc" className="block text-[11px] font-bold text-black uppercase">
                  Sélection d’un kit de secours.
                </label>
                <select
                  id="select-kit-rempc"
                  value={selectionKitSecoursRemplace}
                  onChange={(e) => setSelectionKitSecoursRemplace(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 cursor-pointer"
                >
                  <option value="">Sélectionner le kit de secours stocké...</option>
                  {(stocks || []).map(st => {
                    const varObj = variables.find(v => v.id === st.denominationPieceId);
                    const denom = varObj ? `${varObj.nom} (${varObj.marque})` : `Pièce (${st.id})`;
                    const label = `${denom}, ${st.prixVenteHt} € ht`;
                    return (
                      <option key={st.id} value={st.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white pt-2">
              {/* 3. Ciseaux présents */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Ciseaux présents.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitCiseauxPresents === 'Oui'} onChange={() => setKitCiseauxPresents('Oui')} />
                  <FormRadio label="Non" checked={kitCiseauxPresents === 'Non'} onChange={() => setKitCiseauxPresents('Non')} />
                </div>
              </div>

              {/* 4. Masque présent */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Masque présent.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitMasquePresent === 'Oui'} onChange={() => setKitMasquePresent('Oui')} />
                  <FormRadio label="Non" checked={kitMasquePresent === 'Non'} onChange={() => { setKitMasquePresent('Non'); setKitPeremptionMasque(''); }} />
                </div>
              </div>

              {/* 4b. Péremption du masque */}
              <div className={`space-y-1 bg-white transition-opacity duration-200 ${kitMasquePresent !== 'Oui' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="kitPeremptionMasque" className="block text-[11px] font-bold text-black uppercase">
                  Péremption du masque.
                </label>
                <input
                  type="date"
                  id="kitPeremptionMasque"
                  value={kitPeremptionMasque || ''}
                  onChange={(e) => setKitPeremptionMasque(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  disabled={kitMasquePresent !== 'Oui'}
                />
              </div>

              {/* 5. Serviettes présentes */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Serviettes présentes.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitServiettesPresentes === 'Oui'} onChange={() => setKitServiettesPresentes('Oui')} />
                  <FormRadio label="Non" checked={kitServiettesPresentes === 'Non'} onChange={() => { setKitServiettesPresentes('Non'); setKitPeremptionServiettes(''); }} />
                </div>
              </div>

              {/* 5b. Péremption des serviettes */}
              <div className={`space-y-1 bg-white transition-opacity duration-200 ${kitServiettesPresentes !== 'Oui' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="kitPeremptionServiettes" className="block text-[11px] font-bold text-black uppercase">
                  Péremption des serviettes.
                </label>
                <input
                  type="date"
                  id="kitPeremptionServiettes"
                  value={kitPeremptionServiettes || ''}
                  onChange={(e) => setKitPeremptionServiettes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  disabled={kitServiettesPresentes !== 'Oui'}
                />
              </div>

              {/* 6. Paires de gants présents */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Paires de gants présents.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitGantsPresents === 'Oui'} onChange={() => setKitGantsPresents('Oui')} />
                  <FormRadio label="Non" checked={kitGantsPresents === 'Non'} onChange={() => setKitGantsPresents('Non')} />
                </div>
              </div>

              {/* 7. Rasoir */}
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Rasoir.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio label="Oui" checked={kitRasoirPresent === 'Oui'} onChange={() => setKitRasoirPresent('Oui')} />
                  <FormRadio label="Non" checked={kitRasoirPresent === 'Non'} onChange={() => setKitRasoirPresent('Non')} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 11 - Diagnostics et clôture */}
          <div 
            className="bg-white p-5 relative space-y-3"
            style={{
              border: '1px solid rgb(218, 218, 218)',
              borderTop: 'none',
              borderRadius: '0px 0px 18px 18px',
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
                11 — Diagnostics et clôture
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Fichier de données récupéré.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={fichierDonneesRecupere === 'Oui'} 
                    onChange={() => setFichierDonneesRecupere('Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={fichierDonneesRecupere === 'Non'} 
                    onChange={() => setFichierDonneesRecupere('Non')} 
                  />
                </div>
              </div>

              <div className="space-y-1 bg-white">
                <label className="block text-[11px] font-bold text-black uppercase">
                  Défibrillateur conforme et prêt à l’usage.
                </label>
                <div className="flex gap-6 items-center pt-1 bg-white">
                  <FormRadio 
                    label="Oui" 
                    checked={snapshot.conforme === 'Oui'} 
                    onChange={() => handleSnapshotChange('conforme', 'Oui')} 
                  />
                  <FormRadio 
                    label="Non" 
                    checked={snapshot.conforme === 'Non'} 
                    onChange={() => handleSnapshotChange('conforme', 'Non')} 
                  />
                </div>
              </div>
            </div>

            <div 
              className="p-4 space-y-3 bg-white"
              style={{
                border: '1px solid #D5D5D5',
                borderRadius: '13px'
              }}
            >
              <label htmlFor="client-pin-code" className="block text-[11px] font-bold text-black uppercase tracking-wider">
                Signature client avec PIN. <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  id="client-pin-code"
                  maxLength={6}
                  value={clientPinCode}
                  onChange={(e) => setClientPinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Ex: ABC123"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-800 tracking-widest placeholder:tracking-normal placeholder:font-sans"
                  required
                />
              </div>
            </div>

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
                      onClick={clearSignature}
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

            <div className="space-y-1">
              <label htmlFor="snap-commentaire" className="block text-[11px] font-bold text-black uppercase">
                Commentaire de diagnostic et de clôture.
              </label>
              <textarea
                id="snap-commentaire"
                rows={4}
                value={snapshot.commentaire || ''}
                onChange={(e) => handleSnapshotChange('commentaire', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg leading-relaxed focus:ring-1 focus:ring-indigo-500"
                placeholder="Entrez un commentaire."
              />
            </div>
          </div>

        </div>

      </form>

      {/* Fixed Error Code Helper Box */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border border-b-0 border-slate-200 p-4 z-40 space-y-3 w-full" 
        style={{ 
          boxShadow: 'none',
          maxWidth: '1000px',
          marginLeft: 'auto',
          marginRight: 'auto',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }} 
        id="error-code-helper-panel"
      >
        <div className="w-full">
          <select
            value={selectedErrorCode}
            onChange={(e) => setSelectedErrorCode(e.target.value)}
            className="w-full text-black bg-white focus:outline-none cursor-pointer"
            style={{ 
              fontSize: '18px', 
              appearance: 'none', 
              WebkitAppearance: 'none', 
              MozAppearance: 'none',
              border: '1.5px solid #dedede',
              borderRadius: '13px',
              padding: '12px 14px',
              boxSizing: 'border-box',
              display: 'block',
              width: '100%'
            }}
          >
            <option value="">Sélectionnez un code erreur.</option>
            {ERROR_CODES_DB.map((item, idx) => (
              <option key={idx} value={item.label}>{item.label}</option>
            ))}
          </select>
        </div>

        {selectedErrorCode && (
          <div className="bg-white space-y-3 animate-fadeIn">
            <p className="text-black font-medium leading-relaxed" style={{ fontSize: '18px' }}>
              {ERROR_CODES_DB.find(e => e.label === selectedErrorCode)?.description}
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedErrorCode('')}
                style={{ fontSize: '18px' }}
                className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      {isMapPickerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)]">

            {/* Map Container */}
            <div className="relative h-56 w-full bg-slate-100">
              <MapContainer
                center={[tempLat, tempLng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPickerEvents onPick={(lat, lng) => {
                  setTempLat(lat);
                  setTempLng(lng);
                }} />
                <Marker 
                  position={[tempLat, tempLng]}
                  icon={L.divIcon({
                    html: `
                      <div class="relative flex items-center justify-center" style="transform: translate(-12px, -12px);">
                        <div class="absolute w-8 h-8 rounded-full bg-black/30 animate-ping"></div>
                        <div class="w-5 h-5 rounded-full bg-black border-2 border-white shadow-lg"></div>
                      </div>
                    `,
                    className: 'custom-picker-icon',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                  })}
                />
              </MapContainer>
            </div>

            {/* Live coordinates display */}
            <div className="p-4 bg-slate-50">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block font-semibold text-black font-sans" style={{ fontSize: '16px' }}>Latitude du point.</span>
                  <span className="block font-bold text-black font-sans" style={{ fontSize: '18px', marginTop: '4px' }}>{tempLat.toFixed(6)}</span>
                </div>
                <div>
                  <span className="block font-semibold text-black font-sans" style={{ fontSize: '16px' }}>Longitude du point.</span>
                  <span className="block font-bold text-black font-sans" style={{ fontSize: '18px', marginTop: '4px' }}>{tempLng.toFixed(6)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex gap-3 bg-white">
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(false)}
                style={{ borderRadius: '13px', fontSize: '18px' }}
                className="flex-1 py-3 bg-black hover:bg-neutral-900 text-white font-bold transition-all cursor-pointer font-sans"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSnapshotChange('latitude', tempLat.toFixed(6));
                  handleSnapshotChange('longitude', tempLng.toFixed(6));
                  setIsMapPickerOpen(false);
                }}
                style={{ borderRadius: '13px', fontSize: '18px', backgroundColor: '#2563eb' }}
                className="flex-1 py-3 hover:bg-blue-700 text-white font-bold transition-all cursor-pointer font-sans"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
