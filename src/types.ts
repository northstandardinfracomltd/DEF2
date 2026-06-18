export interface Client {
  id: string;
  denomination: string;
  siret: string; // Numéro d'enregistrement de l'entreprise
  email: string;
  phone: string;
  accessKey?: string; // Clé d'accès pour le portail client
  
  // Site Information & Contract details for autopopulation
  nomPrenomSite: string;
  telephoneSite: string;
  emailSite: string;
  contrat: 'Oui' | 'Non';
  nomContrat: string;
  referenceContrat: string;
  debutContrat: string;
  finContrat: string;
}

export type VariableCategory = 'Modèle Défibrillateur' | 'Modèle Coffret' | 'Modèle Électrode' | 'Modèle Batterie' | 'Modèle Contrat' | 'Modèle Service';

export interface Variable {
  id: string;
  nom: string;
  marque: string;
  description: string;
  category: VariableCategory;
  imageUrl?: string; // Appliqué si category === 'Modèle Défibrillateur'
}

export interface Defibrillateur {
  id: string;
  
  // Section 1 - Défibrillateur
  identifiant: string; // Unique short code, format format AAA-111
  numeroSerie: string;
  commentaire: string;
  modeleId: string; // Lookup Variable category 'Modèle Défibrillateur'
  
  // Section 2 - Client
  clientId: string; // Lookup Client
  nomPrenomSite: string;
  telephoneSite: string;
  emailSite: string;
  contrat: 'Oui' | 'Non';
  nomContrat: string;
  referenceContrat: string;
  debutContrat: string;
  finContrat: string;

  // Section 3 - Coffret
  modeleCoffretId: string; // Lookup Variable category 'Modèle Coffret'
  numeroLotCoffret: string;
  commentaireCoffret: string;

  // Section 4 - Accès
  numVoie: string;
  ville: string;
  cp: string;
  region: string;
  pays: string;
  latitude: string;
  longitude: string;
  commentaireAdresse: string;
  acces247: boolean;
  accesSemaine: boolean;
  accesWeekend: boolean;
  exterieur: boolean;

  // Section 5 - Dates
  finGarantie: string;
  fabrication: string;
  miseEnService: string;
  derniereMaintenance: string;
  sortieFabricant: string;

  // Section 6 - Électrode Mixte ou Adulte (A)
  modeleElectrodeAId: string; // Lookup Variable category 'Modèle Électrode'
  lotElectrodeA: string;
  insertionElectrodeA: string;
  peremptionElectrodeA: string;
  livraisonElectrodeA: string;
  situationElectrodeA: 'Vert' | 'Orange' | 'Rouge';
  commentaireElectrodeA: string;
  peremptionSecoursElectrodeA: string;

  // Section 7 - Électrode Pédiatrique (P)
  modeleElectrodePId: string; // Lookup Variable category 'Modèle Électrode'
  lotElectrodeP: string;
  insertionElectrodeP: string;
  peremptionElectrodeP: string;
  livraisonElectrodeP: string;
  situationElectrodeP: 'Vert' | 'Orange' | 'Rouge';
  commentaireElectrodeP: string;
  peremptionSecoursElectrodeP: string;

  // Section 8 - Batterie (B)
  modeleBatterieId: string; // Lookup Variable category 'Modèle Batterie'
  lotBatterie: string;
  insertionBatterie: string;
  peremptionBatterie: string;
  livraisonBatterie: string;
  situationBatterie: 'Vert' | 'Orange' | 'Rouge';
  pourcentageBatterie: string; // Deux chiffres max (0-99/100)
  commentaireBatterie: string;

  // Section 9 - Catégories
  loue: 'Oui' | 'Non';
  prete: 'Oui' | 'Non';
  stocke: 'Oui' | 'Non';
  archive: 'Oui' | 'Non';
  conforme: 'Oui' | 'Non';
  sousTraitance: 'Oui' | 'Non';
  fsmAutorise: 'Oui' | 'Non';
  victimeSurvie: 'Oui' | 'Non';
  victimeSansSurvie: 'Oui' | 'Non';
  ageVictime: string; // deux chiffres
  commentaireCampagneRappel: string;
  rappelMensuelAuto?: 'Oui' | 'Non';
}

export interface SupportTicket {
  id: string; // e.g. #123456
  identifiant: string;
  objet: 'Défibrillateur utilisé' | 'Défibrillateur endommagé' | 'Défibrillateur hors service' | 'Autre';
  message: string;
  email: string;
  phone: string;
  date: string;
  status: 'Nouveau' | 'En cours' | 'Résolu';
  reponse?: string;
}

export interface Member {
  name: string;
  role: string;
  email: string;
  status: string;
  lastActive: string;
  pin: string;
  locationLink?: string;
}

export interface CompanyInfo {
  name: string;
  logo: string;
  website: string;
  email: string;
  phone: string;
}

export interface PointageLog {
  id: string;
  techName: string;
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  durationSeconds?: number;
  isOngoing: boolean;
  comment?: string;
}

export interface StockRecord {
  id: string;
  denominationPieceId: string; // ID corresponding to a Variable
  quantite: number;
  quantiteReservee?: number;
  livraisonDate: string;
  reapprovisionnementDate: string;
  valeurAchat: number;
  marge: number;
  prixVenteHt: number;
  stockage: string;
}

export interface CommercialDocItem {
  variableId: string;
  nomPiece: string;
  prixVenteHt: number;
  quantite: number;
}

export interface CommercialDoc {
  id: string;
  ref: string;
  type: 'Devis' | 'Facture' | 'Proforma';
  clientId: string;
  clientDenomination: string;
  items: CommercialDocItem[];
  totalHt: number;
  status: 'Brouillon' | 'Terminé' | 'Accepté' | 'Refusé';
  dateStr: string;
  commentaire?: string;
}

export interface GedDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileSize: string;
  dateStr: string;
  fileContent?: string;
  fileUrl?: string;
}

export interface Memo {
  id: string;
  text: string;
  createdAt: number;
}



