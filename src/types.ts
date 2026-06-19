export interface SignaturePin {
  code: string;
  createdAt: string;
  status: 'émis' | 'validé';
  validatedAt?: string;
  reportTitle?: string;
}

export interface Client {
  id: string;
  denomination: string;
  siret: string; // Numéro d'enregistrement de l'entreprise
  email: string;
  phone: string;
  accessKey?: string; // Clé d'accès pour le portail client
  signaturePins?: SignaturePin[]; // Array of signature pin codes for validation
  clientSignatureImage?: string; // Signature drawing saved by the client in their portal
  
  // Site Information & Contract details for autopopulation
  nomPrenomSite: string;
  telephoneSite: string;
  emailSite: string;
  contrat: 'Oui' | 'Non';
  nomContrat: string;
  referenceContrat: string;
  debutContrat: string;
  finContrat: string;

  typeContact1?: string;
  typeContact2?: string;
  typeContact3?: string;
  typeContact4?: string;
  typeContact5?: string;
  nomContact2?: string;
  telephoneSite2?: string;
  emailSite2?: string;
  nomContact3?: string;
  telephoneSite3?: string;
  emailSite3?: string;
  nomContact4?: string;
  telephoneSite4?: string;
  emailSite4?: string;
  nomContact5?: string;
  telephoneSite5?: string;
  emailSite5?: string;
  commentaire?: string;
}

export type VariableCategory = 'Modèle Défibrillateur' | 'Modèle Coffret' | 'Modèle Électrode' | 'Modèle Batterie' | 'Modèle Contrat' | 'Modèle Service';

export interface Variable {
  id: string;
  nom: string;
  marque: string;
  description: string;
  category: VariableCategory;
  imageUrl?: string; // Appliqué si category === 'Modèle Défibrillateur'
  identifiant?: string;
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
  horaires?: string;

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
  modeleElectrodeASecoursId?: string;
  lotElectrodeASecours?: string;

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
  rappelHebdoAuto?: 'Oui' | 'Non';
  rappelJournalierAuto?: 'Oui' | 'Non';
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
  nomLogiciel?: string;
  conditionsLegalesLink?: string;
  mentionsLegalesFactures?: string;
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
  besoinProjete2Mois?: number;
  besoinProjete2a6Mois?: number;
  totalACommander?: number;
  commentaire?: string;
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
  status: 'Brouillon' | 'Terminé' | 'Accepté' | 'Refusé' | 'Annulé' | 'Supprimé';
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

export interface OtherEquipment {
  id: string;
  identifiant: string;
  
  // Section 1 - Client
  clientId: string;
  nomPrenomSite: string;
  telephoneSite: string;
  emailSite: string;
  contrat: 'Oui' | 'Non';
  nomContrat: string;
  referenceContrat: string;
  debutContrat: string;
  finContrat: string;

  // Section 2 - Localisation
  numeroVoie: string;
  ville: string;
  codePostal: string;
  region: string;
  pays: string;
  latitude: string;
  longitude: string;
  aideAcces: string;
  accesPermanent: 'Oui' | 'Non';
  accesJoursOuvres: 'Oui' | 'Non';
  accesWeekend: 'Oui' | 'Non';
  installeExterieur: 'Oui' | 'Non';

  // Section 3 - Dates
  expirationGarantie: string;
  fabrication: string;
  miseEnService: string;
  derniereMaintenance: string;
  sortieUsine: string;
  prochaineMaintenance: string;

  // Section 4 - Catégorie
  categorie: string;
  tournee?: string;

  // Section 5 - Champs techniques spécifiques
  specifiques: Record<string, any>;
}



