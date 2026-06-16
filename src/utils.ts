import { Defibrillateur, Client, Variable } from './types';

export const REGIONS_FRANCAISES = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur'
];

export function generateRandomShortCode(existingIds: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let attempts = 0;
  
  // Dynamically determine the environment identifier using the short ID
  const tenantIdDigit = typeof window !== 'undefined' 
    ? (localStorage.getItem('defib_short_env_id') || 'D18') 
    : 'D18';

  while (attempts < 1000) {
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    const n3 = Math.floor(Math.random() * 10);
    const code = `${l1}${l2}${l3}-${tenantIdDigit}-${n1}${n2}${n3}`;
    if (!existingIds.includes(code)) {
      return code;
    }
    attempts++;
  }
  return `DAE-${tenantIdDigit}-${Math.floor(Math.random() * 900) + 100}`;
}

export const INITIAL_CLIENTS: Client[] = [
  {
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
  },
  {
    id: 'c2',
    denomination: 'Clinique de l\'Erdre',
    siret: '56789012345678',
    email: 'admin@clinique-erdre.pro',
    phone: '+33 2 40 44 11 22',
    accessKey: 'ERDRE54321',
    nomPrenomSite: 'Sophie BERTRAND',
    telephoneSite: '+33 2 40 44 11 25',
    emailSite: 's.bertrand@sautron-ecole.fr',
    contrat: 'Non',
    nomContrat: 'Aucun contrat',
    referenceContrat: '-',
    debutContrat: '',
    finContrat: ''
  },
  {
    id: 'c3',
    denomination: 'Mairie de Bordeaux',
    siret: '90123456789012',
    email: 'contact@bordeaux-mairie.fr',
    phone: '+33 5 56 10 20 30',
    accessKey: 'BDX8899000',
    nomPrenomSite: 'Robert PASCAL',
    telephoneSite: '+33 5 56 10 20 31',
    emailSite: 'r.pascal@bordeaux-mairie.fr',
    contrat: 'Non',
    nomContrat: 'Aucun contrat',
    referenceContrat: '-',
    debutContrat: '',
    finContrat: ''
  },
];

export const INITIAL_VARIABLES: Variable[] = [
  // Modèles Défibrillateur
  { id: 'v_def_1', category: 'Modèle Défibrillateur', nom: 'Philips HeartStart FRx', marque: 'Philips', description: 'Idéal pour environnements exigeants' },
  { id: 'v_def_2', category: 'Modèle Défibrillateur', nom: 'ZOLL AED Plus', marque: 'ZOLL Medical', description: 'Assistance RCP temps réel' },
  { id: 'v_def_3', category: 'Modèle Défibrillateur', nom: 'Physio-Control Lifepak CR2', marque: 'Physio-Control', description: 'Connectivité Wi-Fi intégrée' },
  // Modèles de coffrets
  { id: 'v_cof_1', category: 'Modèle Coffret', nom: 'Aivia 100 (Intérieur, non chauffé)', marque: 'Aivia', description: 'Intérieur standard' },
  { id: 'v_cof_2', category: 'Modèle Coffret', nom: 'Aivia 200 (Extérieur, chauffé, alarmé)', marque: 'Aivia', description: 'Extérieur avec chauffage' },
  { id: 'v_cof_3', category: 'Modèle Coffret', nom: 'DefibSafe 2 (Extérieur robuste)', marque: 'DefibSafe', description: 'Résistant aux intempéries' },
  // Modèles d'électrodes
  { id: 'v_el_1', category: 'Modèle Électrode', nom: 'Électrodes Adultes SMART II (Philips)', marque: 'Philips', description: 'Électrodes adultes' },
  { id: 'v_el_2', category: 'Modèle Électrode', nom: 'CPR-D padz Monobloc (ZOLL)', marque: 'ZOLL Medical', description: 'Électrodes monobloc RCP' },
  { id: 'v_el_p_1', category: 'Modèle Électrode', nom: 'Électrodes Pédiatriques SMART Kids', marque: 'Philips', description: 'Électrodes enfants' },
  // Modèles de batteries
  { id: 'v_bat_1', category: 'Modèle Batterie', nom: 'Batterie Lithium-Manganèse FRx', marque: 'Philips', description: 'Durée de vie 4 ans' },
  { id: 'v_bat_2', category: 'Modèle Batterie', nom: 'Piles Lithium CR123A (ZOLL)', marque: 'ZOLL Medical', description: 'Lot de 10 piles lithium' },
];

export const INITIAL_SPARE_PARTS = [
  {
    id: 'sp_1',
    label: 'Électrode Adulte Philips SMART II',
    sku: 'PHIL-M5071A',
    stock: 24,
    price: 89.00,
    marque: 'Philips',
    category: 'Modèle Électrode',
    description: 'Électrodes de rechange à usage unique pour Philips HS1/FRx.',
  },
  {
    id: 'sp_2',
    label: 'Électrode Pédiatrique SMART Kids',
    sku: 'PHIL-M5072A',
    stock: 8,
    price: 119.00,
    marque: 'Philips',
    category: 'Modèle Électrode',
    description: 'Cartouche d\'électrodes pédiatriques pour Philips HS1/FRx.',
  },
  {
    id: 'sp_3',
    label: 'Batterie Lithium-Manganèse Philips',
    sku: 'PHIL-M5070A',
    stock: 12,
    price: 199.00,
    marque: 'Philips',
    category: 'Modèle Batterie',
    description: 'Batterie longue durée (4 ans en veille) pour Philips HS1/FRx.',
  },
  {
    id: 'sp_4',
    label: 'Piles Lithium CR123A ZOLL AED (Pack)',
    sku: 'ZOLL-8000-0807-01',
    stock: 18,
    price: 79.00,
    marque: 'Zoll',
    category: 'Modèle Batterie',
    description: 'Lot de 10 piles lithium CR123A pour AED Plus.',
  },
];

// Seed initial comprehensive Defibrillateurs matching new schema
export const INITIAL_DEFIBRILLATEURS: Defibrillateur[] = [
  {
    id: 'df_1',
    identifiant: 'PAR-101',
    numeroSerie: 'SN-00918239',
    commentaire: 'Défibrillateur principal situé au rez-de-chaussée près du guichet de sécurité.',
    modeleId: 'v_def_2', // HeartStart HS1
    clientId: 'c3',
    nomPrenomSite: 'Robert PASCAL',
    telephoneSite: '+33 5 56 10 20 31',
    emailSite: 'r.pascal@bordeaux-mairie.fr',
    contrat: 'Non',
    nomContrat: 'Aucun contrat',
    referenceContrat: '-',
    debutContrat: '',
    finContrat: '',
    modeleCoffretId: 'v_cof_1',
    numeroLotCoffret: 'LOT-COF-202a',
    commentaireCoffret: 'Serrure magnétique fonctionnelle. Pas d\'anomalies constatées.',
    numVoie: '12 Place Pey Berland',
    ville: 'Bordeaux',
    cp: '33000',
    region: 'Nouvelle-Aquitaine',
    pays: 'France',
    latitude: '44.8378',
    longitude: '-0.5792',
    commentaireAdresse: 'En intérieur, panneau mural visible depuis la rue.',
    acces247: false,
    accesSemaine: true,
    accesWeekend: false,
    exterieur: false,
    finGarantie: '2029-05-15',
    fabrication: '2024-05-10',
    miseEnService: '2024-06-01',
    derniereMaintenance: '2025-06-12',
    sortieFabricant: '2024-05-20',
    modeleElectrodeAId: 'v_el_2',
    lotElectrodeA: 'LOTA-99824',
    insertionElectrodeA: '2024-06-01',
    peremptionElectrodeA: '2027-06-01',
    livraisonElectrodeA: '2024-05-25',
    situationElectrodeA: 'Vert',
    commentaireElectrodeA: 'Neuves lors de l\'installation initiale.',
    peremptionSecoursElectrodeA: '2028-01-10',
    modeleElectrodePId: 'v_el_p_1',
    lotElectrodeP: 'LOTP-11234',
    insertionElectrodeP: '2024-06-01',
    peremptionElectrodeP: '2026-12-01',
    livraisonElectrodeP: '2024-05-25',
    situationElectrodeP: 'Orange',
    commentaireElectrodeP: 'Nécessitera une attention à la fin de l\'année.',
    peremptionSecoursElectrodeP: '2027-03-15',
    modeleBatterieId: 'v_bat_2',
    lotBatterie: 'LOTB-00912',
    insertionBatterie: '2024-06-01',
    peremptionBatterie: '2028-06-01',
    livraisonBatterie: '2024-05-25',
    situationBatterie: 'Vert',
    pourcentageBatterie: '92',
    commentaireBatterie: 'Tension normale confirmée par l\'appareil.',
    loue: 'Non',
    prete: 'Non',
    stocke: 'Non',
    archive: 'Non',
    conforme: 'Oui',
    sousTraitance: 'Non',
    fsmAutorise: 'Oui',
    victimeSurvie: 'Non',
    victimeSansSurvie: 'Non',
    ageVictime: '0',
    commentaireCampagneRappel: 'Aucune campagne de rappel signalée pour ce numéro de série.',
  },
  {
    id: 'df_2',
    identifiant: 'PAR-102',
    numeroSerie: 'SN-77291102',
    commentaire: 'Défibrillateur externe chauffé dans le hall sportif principal.',
    modeleId: 'v_def_1', // Lifeline AED
    clientId: 'c1',
    nomPrenomSite: 'Jean-Marc DUPONT',
    telephoneSite: '+33 6 12 34 56 78',
    emailSite: 'jm.dupont@secours-ouest.fr',
    contrat: 'Oui',
    nomContrat: 'Abonnement Maintenance Premium',
    referenceContrat: 'REF-2026-SPO',
    debutContrat: '2026-01-01',
    finContrat: '2029-12-31',
    modeleCoffretId: 'v_cof_2',
    numeroLotCoffret: 'LOT-COF-303c',
    commentaireCoffret: 'Coffret alimenté, test témoin chauffage validé.',
    numVoie: '44 Rue du Général de Gaulle',
    ville: 'Nantes',
    cp: '44000',
    region: 'Pays de la Loire',
    pays: 'France',
    latitude: '47.2184',
    longitude: '-1.5536',
    commentaireAdresse: 'Rattaché au mur mitoyen au terrain de football.',
    acces247: true,
    accesSemaine: false,
    accesWeekend: false,
    exterieur: true,
    finGarantie: '2030-03-20',
    fabrication: '2025-02-15',
    miseEnService: '2025-03-01',
    derniereMaintenance: '2026-02-28',
    sortieFabricant: '2025-02-20',
    modeleElectrodeAId: 'v_el_1',
    lotElectrodeA: 'LOTA-1109A',
    insertionElectrodeA: '2025-03-01',
    peremptionElectrodeA: '2028-03-01',
    livraisonElectrodeA: '2025-02-27',
    situationElectrodeA: 'Vert',
    commentaireElectrodeA: 'Sachet stérile non percé.',
    peremptionSecoursElectrodeA: '',
    modeleElectrodePId: 'v_el_p_1',
    lotElectrodeP: 'LOTP-992B',
    insertionElectrodeP: '2025-03-01',
    peremptionElectrodeP: '2026-03-01',
    livraisonElectrodeP: '2025-02-27',
    situationElectrodeP: 'Rouge',
    commentaireElectrodeP: 'ATTENTION : Électrodes pédiatriques périmées, renouvellement commandé.',
    peremptionSecoursElectrodeP: '',
    modeleBatterieId: 'v_bat_1',
    lotBatterie: 'LOTB-9981K',
    insertionBatterie: '2025-03-01',
    peremptionBatterie: '2030-03-01',
    livraisonBatterie: '2025-02-27',
    situationBatterie: 'Vert',
    pourcentageBatterie: '82',
    commentaireBatterie: 'Indicateur de charge stable.',
    loue: 'Oui',
    prete: 'Non',
    stocke: 'Non',
    archive: 'Non',
    conforme: 'Non',
    sousTraitance: 'Non',
    fsmAutorise: 'Non',
    victimeSurvie: 'Oui',
    victimeSansSurvie: 'Non',
    ageVictime: '54',
    commentaireCampagneRappel: '',
  },
  {
    id: 'df_3',
    identifiant: 'PAR-103',
    numeroSerie: 'SN-33928131',
    commentaire: 'DAE Place de la République, fixé sur le pilier ouest.',
    modeleId: 'v_def_3',
    clientId: 'c3',
    nomPrenomSite: 'Jean-Pierre MOREAU',
    telephoneSite: '+33 5 56 10 20 32',
    emailSite: 'jp.moreau@bordeaux-mairie.fr',
    contrat: 'Oui',
    nomContrat: 'Maintenance de Base',
    referenceContrat: 'REF-BOR-2026',
    debutContrat: '2026-02-01',
    finContrat: '2028-02-01',
    modeleCoffretId: 'v_cof_1',
    numeroLotCoffret: 'LOT-COF-110b',
    commentaireCoffret: 'Propre, pas d\'anomalies.',
    numVoie: 'Place de la République',
    ville: 'Bordeaux',
    cp: '33000',
    region: 'Nouvelle-Aquitaine',
    pays: 'France',
    latitude: '44.8350',
    longitude: '-0.5750',
    commentaireAdresse: 'Pilier principal.',
    acces247: true,
    accesSemaine: false,
    accesWeekend: false,
    exterieur: true,
    finGarantie: '2031-01-10',
    fabrication: '2026-01-05',
    miseEnService: '2026-01-20',
    derniereMaintenance: '2026-01-20',
    sortieFabricant: '2026-01-10',
    modeleElectrodeAId: 'v_el_1',
    lotElectrodeA: 'LOTA-120A',
    insertionElectrodeA: '2026-01-20',
    peremptionElectrodeA: '2029-01-20',
    livraisonElectrodeA: '2026-01-15',
    situationElectrodeA: 'Vert',
    commentaireElectrodeA: 'Sachet OK.',
    peremptionSecoursElectrodeA: '',
    modeleElectrodePId: 'v_el_p_1',
    lotElectrodeP: 'LOTP-550A',
    insertionElectrodeP: '2026-01-20',
    peremptionElectrodeP: '2028-01-20',
    livraisonElectrodeP: '2026-01-15',
    situationElectrodeP: 'Vert',
    commentaireElectrodeP: 'En place.',
    peremptionSecoursElectrodeP: '',
    modeleBatterieId: 'v_bat_1',
    lotBatterie: 'LOTB-303A',
    insertionBatterie: '2026-01-20',
    peremptionBatterie: '2031-01-20',
    livraisonBatterie: '2026-01-15',
    situationBatterie: 'Vert',
    pourcentageBatterie: '98',
    commentaireBatterie: 'Piles neuves.',
    loue: 'Non',
    prete: 'Non',
    stocke: 'Non',
    archive: 'Non',
    conforme: 'Oui',
    sousTraitance: 'Non',
    fsmAutorise: 'Oui',
    victimeSurvie: 'Non',
    victimeSansSurvie: 'Non',
    ageVictime: '0',
    commentaireCampagneRappel: '',
  },
  {
    id: 'df_4',
    identifiant: 'PAR-104',
    numeroSerie: 'SN-44918231',
    commentaire: 'Défibrillateur école de Sautron, hall principal.',
    modeleId: 'v_def_2',
    clientId: 'c2',
    nomPrenomSite: 'Sophie BERTRAND',
    telephoneSite: '+33 2 40 44 11 25',
    emailSite: 's.bertrand@sautron-ecole.fr',
    contrat: 'Non',
    nomContrat: 'Aucun contrat',
    referenceContrat: '-',
    debutContrat: '',
    finContrat: '',
    modeleCoffretId: 'v_cof_3',
    numeroLotCoffret: 'LOT-COF-404d',
    commentaireCoffret: 'Serrure sécurisée, OK.',
    numVoie: '18 Rue de la Paix',
    ville: 'Sautron',
    cp: '44880',
    region: 'Pays de la Loire',
    pays: 'France',
    latitude: '47.2639',
    longitude: '-1.6678',
    commentaireAdresse: 'Hall d\'accueil de l\'école primaire.',
    acces247: false,
    accesSemaine: true,
    accesWeekend: false,
    exterieur: false,
    finGarantie: '2028-11-20',
    fabrication: '2023-11-01',
    miseEnService: '2023-11-15',
    derniereMaintenance: '2025-11-15',
    sortieFabricant: '2023-11-05',
    modeleElectrodeAId: 'v_el_2',
    lotElectrodeA: 'LOTA-440B',
    insertionElectrodeA: '2023-11-15',
    peremptionElectrodeA: '2026-11-15',
    livraisonElectrodeA: '2023-11-10',
    situationElectrodeA: 'Vert',
    commentaireElectrodeA: 'Rien à signaler.',
    peremptionSecoursElectrodeA: '',
    modeleElectrodePId: 'v_el_p_1',
    lotElectrodeP: 'LOTP-440P',
    insertionElectrodeP: '2023-11-15',
    peremptionElectrodeP: '2025-11-15',
    livraisonElectrodeP: '2023-11-10',
    situationElectrodeP: 'Rouge',
    commentaireElectrodeP: 'Pédiatriques expirées.',
    peremptionSecoursElectrodeP: '',
    modeleBatterieId: 'v_bat_2',
    lotBatterie: 'LOTB-440Y',
    insertionBatterie: '2023-11-15',
    peremptionBatterie: '2027-11-15',
    livraisonBatterie: '2023-11-10',
    situationBatterie: 'Vert',
    pourcentageBatterie: '45',
    commentaireBatterie: 'La batterie devra être rechargée ou renouvelée l\'année prochaine.',
    loue: 'Non',
    prete: 'Oui',
    stocke: 'Non',
    archive: 'Non',
    conforme: 'Non',
    sousTraitance: 'Non',
    fsmAutorise: 'Oui',
    victimeSurvie: 'Non',
    victimeSansSurvie: 'Non',
    ageVictime: '0',
    commentaireCampagneRappel: '',
  },
  {
    id: 'df_5',
    identifiant: 'PAR-105',
    numeroSerie: 'SN-55819231',
    commentaire: 'DAE Mairie Saint-Herblain, entrée principale.',
    modeleId: 'v_def_1',
    clientId: 'c1',
    nomPrenomSite: 'Claire ALBERT',
    telephoneSite: '+33 2 40 90 22 11',
    emailSite: 'claire.albert@st-herblain.fr',
    contrat: 'Oui',
    nomContrat: 'Contrat Zen',
    referenceContrat: 'REF-STH-2026',
    debutContrat: '2026-03-01',
    finContrat: '2030-03-01',
    modeleCoffretId: 'v_cof_2',
    numeroLotCoffret: 'LOT-COF-505x',
    commentaireCoffret: 'Alarme en service et chauffage fonctionnel.',
    numVoie: 'Avenue de l\'Atlantique',
    ville: 'Saint-Herblain',
    cp: '44800',
    region: 'Pays de la Loire',
    pays: 'France',
    latitude: '47.2105',
    longitude: '-1.6250',
    commentaireAdresse: 'Mairie, entrée du public.',
    acces247: true,
    accesSemaine: false,
    accesWeekend: false,
    exterieur: true,
    finGarantie: '2031-03-15',
    fabrication: '2026-03-01',
    miseEnService: '2026-03-15',
    derniereMaintenance: '2026-03-15',
    sortieFabricant: '2026-03-05',
    modeleElectrodeAId: 'v_el_1',
    lotElectrodeA: 'LOTA-505X',
    insertionElectrodeA: '2026-03-15',
    peremptionElectrodeA: '2029-03-15',
    livraisonElectrodeA: '2026-03-10',
    situationElectrodeA: 'Vert',
    commentaireElectrodeA: 'Parfait état.',
    peremptionSecoursElectrodeA: '',
    modeleElectrodePId: 'v_el_p_1',
    lotElectrodeP: 'LOTP-505P',
    insertionElectrodeP: '2026-03-15',
    peremptionElectrodeP: '2028-03-15',
    livraisonElectrodeP: '2026-03-10',
    situationElectrodeP: 'Vert',
    commentaireElectrodeP: 'Installé.',
    peremptionSecoursElectrodeP: '',
    modeleBatterieId: 'v_bat_1',
    lotBatterie: 'LOTB-505B',
    insertionBatterie: '2026-03-15',
    peremptionBatterie: '2031-03-15',
    livraisonBatterie: '2026-03-10',
    situationBatterie: 'Vert',
    pourcentageBatterie: '100',
    commentaireBatterie: 'Batterie neuve rutilante.',
    loue: 'Non',
    prete: 'Non',
    stocke: 'Non',
    archive: 'Non',
    conforme: 'Oui',
    sousTraitance: 'Non',
    fsmAutorise: 'Oui',
    victimeSurvie: 'Non',
    victimeSansSurvie: 'Non',
    ageVictime: '0',
    commentaireCampagneRappel: '',
  },
];

export function formatDateToFR(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function parseFRDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

export function computeProchaineMaintenance(derniereMaintenanceStr: string): string {
  if (!derniereMaintenanceStr) return '';
  try {
    const parts = xxxSplitOrRescue(derniereMaintenanceStr);
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const nextYear = year + 1;
      return `${nextYear}-${parts[1]}-${parts[2]}`;
    }
  } catch (e) {}
  return '';
}

function xxxSplitOrRescue(str: string) {
  if (str.includes('/')) {
    const p = str.split('/');
    return [p[2], p[1], p[0]]; // dd/mm/yyyy to yyyy, mm, dd
  }
  return str.split('-');
}

export function exportToCSV(
  defibrillateurs: Defibrillateur[],
  clients: Client[],
  variables: Variable[]
) {
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const variableMap = new Map(variables.map(v => [v.id, v]));

  const headers = [
    'Identifiant',
    'Numéro de série',
    'Modèle Défibrillateur',
    'Marque',
    'Client Exploitant',
    'Site Nom Prénom',
    'Site Téléphone',
    'Site Email',
    'A un contrat et nom',
    'Référence Contrat',
    'Modèle de coffret',
    'Lot Coffret',
    'Localisation (Voie)',
    'Ville',
    'Code Postal',
    'Région',
    'Coordonnées (Lat, Lng)',
    'Date Fin Garantie',
    'Date Fabrication',
    'Date Mise en Service',
    'Date Dernière Maintenance',
    'Date Prochaine Maintenance',
    'Électrode A Modèle',
    'Électrode A Lot',
    'Électrode A Situation',
    'Électrode P Situation',
    'Batterie Situation',
    'Batterie Capacité (%)'
  ];

  let csvContent = '\uFEFF' + headers.join(';') + '\n';

  defibrillateurs.forEach(df => {
    const cl = clientMap.get(df.clientId);
    const modDef = variableMap.get(df.modeleId);
    const row = [
      df.identifiant || '',
      df.numeroSerie || '',
      modDef ? modDef.nom : '',
      modDef ? modDef.marque : '',
      cl ? cl.denomination : '',
      df.nomPrenomSite || '',
      df.telephoneSite || '',
      df.emailSite || '',
      df.contrat === 'Oui' ? df.nomContrat : 'Non',
      df.referenceContrat || '',
      variableMap.get(df.modeleCoffretId)?.nom || '',
      df.numeroLotCoffret || '',
      df.numVoie || '',
      df.ville || '',
      df.cp || '',
      df.region || '',
      `${df.latitude}, ${df.longitude}`,
      df.finGarantie || '',
      df.fabrication || '',
      df.miseEnService || '',
      df.derniereMaintenance || '',
      computeProchaineMaintenance(df.derniereMaintenance),
      variableMap.get(df.modeleElectrodeAId)?.nom || '',
      df.lotElectrodeA || '',
      df.situationElectrodeA || '',
      df.situationElectrodeP || '',
      df.situationBatterie || '',
      df.pourcentageBatterie || ''
    ];
    csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `export_defibrillateurs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
