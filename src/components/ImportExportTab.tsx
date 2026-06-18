import React, { useState, useEffect } from 'react';
import { Client, Defibrillateur, StockRecord, PointageLog, Variable } from '../types';
import { saveCollectionToFirestore, fetchCollectionFromFirestore } from '../firebase';
import { generateRandomShortCode } from '../utils';

export interface ImportExportRecord {
  id: string;
  date: string;
  type: 'Importation.' | 'Exportation.';
  categorie: 'Défibrillateurs.' | 'Clients.' | 'Stocks.' | 'Temps.';
  format: 'CSV.';
  csvData?: string;
  expiresAt?: number;
  expirationDate?: string;
}

const INITIAL_RECORDS: ImportExportRecord[] = [
  {
    id: 'rec_1',
    date: '2026-06-10',
    type: 'Importation.',
    categorie: 'Clients.',
    format: 'CSV.',
  },
  {
    id: 'rec_2',
    date: '2026-06-11',
    type: 'Exportation.',
    categorie: 'Défibrillateurs.',
    format: 'CSV.',
  },
  {
    id: 'rec_3',
    date: '2026-06-12',
    type: 'Importation.',
    categorie: 'Stocks.',
    format: 'CSV.',
  }
];

function generateCSV(
  compartment: 'Défibrillateurs.' | 'Clients.' | 'Stocks.' | 'Temps.', 
  data: {
    defibrillateurs: Defibrillateur[];
    clients: Client[];
    stocks: StockRecord[];
    pointages: PointageLog[];
  }
): string {
  let headers: string[] = [];
  let keys: string[] = [];
  let items: any[] = [];

  switch (compartment) {
    case 'Défibrillateurs.':
      items = data.defibrillateurs || [];
      keys = [
        'identifiant', 'numeroSerie', 'modeleId', 'clientId', 'nomPrenomSite', 
        'telephoneSite', 'emailSite', 'contrat', 'nomContrat', 'referenceContrat', 
        'debutContrat', 'finContrat', 'modeleCoffretId', 'numeroLotCoffret', 
        'commentaireCoffret', 'numVoie', 'ville', 'cp', 'region', 'pays', 
        'latitude', 'longitude', 'commentaireAdresse', 'acces247', 'accesSemaine', 
        'accesWeekend', 'exterieur', 'finGarantie', 'fabrication', 'miseEnService', 
        'derniereMaintenance', 'sortieFabricant', 'modeleElectrodeAId', 'lotElectrodeA', 
        'insertionElectrodeA', 'peremptionElectrodeA', 'livraisonElectrodeA', 
        'situationElectrodeA', 'commentaireElectrodeA', 'peremptionSecoursElectrodeA', 
        'modeleElectrodePId', 'lotElectrodeP', 'insertionElectrodeP', 'peremptionElectrodeP', 
        'livraisonElectrodeP', 'situationElectrodeP', 'commentaireElectrodeP', 
        'peremptionSecoursElectrodeP', 'modeleBatterieId', 'lotBatterie', 'insertionBatterie', 
        'peremptionBatterie', 'livraisonBatterie', 'situationBatterie', 'pourcentageBatterie', 
        'commentaireBatterie', 'loue', 'prete', 'stocke', 'archive', 'conforme', 
        'sousTraitance', 'fsmAutorise', 'victimeSurvie', 'victimeSansSurvie', 
        'ageVictime', 'commentaireCampagneRappel', 'rappelMensuelAuto', 'commentaire'
      ];
      headers = [
        "Identifiant", "Numéro de Série", "Modèle Défibrillateur", "ID Client", "Nom du Site", 
        "Téléphone Site", "Email Site", "Contrat Actif", "Nom Contrat", "Référence Contrat", 
        "Début Contrat", "Fin Contrat", "Modèle Coffret", "Lot Coffret", 
        "Commentaire Coffret", "Numéro de voie", "Ville", "Code Postal", "Région", "Pays", 
        "Latitude", "Longitude", "Commentaire Adresse", "Accès 24/7", "Accès Semaine", 
        "Accès Weekend", "Extérieur", "Fin Garantie", "Date Fabrication", "Mise en Service", 
        "Dernière Maintenance", "Sortie Fabricant", "Modèle Électrode Adulte", "Lot Électrode Adulte", 
        "Insertion Électrode Adulte", "Péremption Électrode Adulte", "Livraison Électrode Adulte", 
        "Situation Électrode Adulte", "Commentaire Électrode Adulte", "Péremption Secours Électrode Adulte", 
        "Modèle Électrode Enfant", "Lot Électrode Enfant", "Insertion Électrode Enfant", "Péremption Électrode Enfant", 
        "Livraison Électrode Enfant", "Situation Électrode Enfant", "Commentaire Électrode Enfant", 
        "Péremption Secours Électrode Enfant", "Modèle Batterie", "Lot Batterie", "Insertion Batterie", 
        "Péremption Batterie", "Livraison Batterie", "Situation Batterie", "Pourcentage Batterie", 
        "Commentaire Batterie", "Loué", "Prêté", "Stocké", "Archivé", "Conforme", 
        "Sous-traitance", "FSM Autorisé", "Victime Survie", "Victime Sans Survie", 
        "Âge Victime", "Commentaire Campagne Rappel", "Rappel Mensuel Auto", "Commentaire Général"
      ];
      break;

    case 'Clients.':
      items = data.clients || [];
      keys = [
        'id', 'denomination', 'siret', 'email', 'phone', 'accessKey', 
        'nomPrenomSite', 'telephoneSite', 'emailSite', 'contrat', 
        'nomContrat', 'referenceContrat', 'debutContrat', 'finContrat'
      ];
      headers = [
        "ID Client", "Dénomination", "SIRET", "Email", "Téléphone", "Clé d'Accès", 
        "Nom Prénom Site", "Téléphone Site", "Email Site", "Contrat Actif", 
        "Nom Contrat", "Référence Contrat", "Début Contrat", "Fin Contrat"
      ];
      break;

    case 'Stocks.':
      items = data.stocks || [];
      keys = [
        'id', 'denominationPieceId', 'quantite', 'quantiteReservee', 
        'livraisonDate', 'reapprovisionnementDate', 'valeurAchat', 'marge', 
        'prixVenteHt', 'stockage'
      ];
      headers = [
        "ID Stock", "ID Modèle Pièce", "Quantité", "Quantité Réservée", 
        "Date Livraison", "Date Réapprovisionnement", "Valeur d'Achat (€ HT)", 
        "Marge (%)", "Prix de Vente HT (€)", "Zone de Stockage"
      ];
      break;

    case 'Temps.':
      items = data.pointages || [];
      keys = [
        'id', 'techName', 'startDate', 'startTime', 'endDate', 
        'endTime', 'durationSeconds', 'isOngoing', 'comment'
      ];
      headers = [
        "ID Pointage", "Nom Technicien", "Date Début", "Heure Début", 
        "Date Fin", "Heure Fin", "Durée (secondes)", "En Cours", "Commentaire"
      ];
      break;
  }

  // Generate CSV lines
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'boolean' ? (val ? 'Oui' : 'Non') : String(val);
    if (str.includes(';') || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [
    headers.join(';'),
    ...items.map(item => keys.map(k => escapeCSV(item[k])).join(';'))
  ];

  return lines.join('\n');
}

interface ImportExportTabProps {
  tenantId: string;
  isFirebaseLoaded?: boolean;
  defibrillateurs?: Defibrillateur[];
  clients?: Client[];
  stocks?: StockRecord[];
  pointages?: PointageLog[];
  variables?: Variable[];
  saveDefibs?: (newDefibs: Defibrillateur[]) => void;
  saveClients?: (newClients: Client[]) => void;
  saveStocks?: (newStocks: StockRecord[]) => void;
}

// Helper function to robustly parse CSV
function parseCSV(text: string): { headers: string[], rows: string[][] } {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Detect separator (semicolon or comma)
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const sep = semicolonCount >= commaCount ? ';' : ',';
  
  const parseRow = (rowText: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        if (inQuotes && rowText[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

// Validation & Parsing Helpers
const validateAndParseDefibs = (csvText: string, currentVars: Variable[], existingDefibs: Defibrillateur[]): Defibrillateur[] | null => {
  const { headers, rows } = parseCSV(csvText);
  if (rows.length < 5) return null;

  const expected = [
    'Série.', 'Modèle.', 'Commentaire.', 'Numéro et voie.', 'Ville.',
    'Code postal.', 'Pays.', 'Latitude GPS.', 'Longitude GPS.', 'Lot. (A)',
    'Péremption. (A)', 'Lot. (P)', 'Péremption. (P)', 'Lot. (B)', 'Péremption (B)'
  ];
  if (headers.length !== expected.length) return null;
  const hMatch = headers.every((h, i) => h.replace(/^\uFEFF/, '').trim() === expected[i]);
  if (!hMatch) return null;

  const parsedItems: Defibrillateur[] = [];
  const existingIds = [...existingDefibs.map(df => df.identifiant)];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row.length !== expected.length) return null;

    const serie = row[0];
    const modelNom = row[1];
    const commentaire = row[2];
    const numVoie = row[3];
    const ville = row[4];
    const cp = row[5];
    const pays = row[6];
    const latitude = row[7];
    const longitude = row[8];
    const lotA = row[9];
    const peremptionA = row[10];
    const lotP = row[11];
    const peremptionP = row[12];
    const lotB = row[13];
    const peremptionB = row[14];

    // Modèle. must exist exactly as a variable
    const matchingVar = currentVars.find(v => v.nom === modelNom);
    if (!matchingVar) return null;

    const assignedIdentifiant = generateRandomShortCode(existingIds);
    existingIds.push(assignedIdentifiant);

    parsedItems.push({
      id: 'df_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
      identifiant: assignedIdentifiant,
      numeroSerie: serie,
      modeleId: matchingVar.id,
      commentaire: commentaire,
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
      numVoie: numVoie,
      ville: ville,
      cp: cp,
      region: '',
      pays: pays,
      latitude: latitude,
      longitude: longitude,
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
      lotElectrodeA: lotA,
      insertionElectrodeA: '',
      peremptionElectrodeA: peremptionA,
      livraisonElectrodeA: '',
      situationElectrodeA: 'Vert',
      commentaireElectrodeA: '',
      peremptionSecoursElectrodeA: '',
      modeleElectrodePId: '',
      lotElectrodeP: lotP,
      insertionElectrodeP: '',
      peremptionElectrodeP: peremptionP,
      livraisonElectrodeP: '',
      situationElectrodeP: 'Vert',
      commentaireElectrodeP: '',
      peremptionSecoursElectrodeP: '',
      modeleBatterieId: '',
      lotBatterie: lotB,
      insertionBatterie: '',
      peremptionBatterie: peremptionB,
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
      rappelMensuelAuto: 'Non'
    });
  }

  return parsedItems;
};

const validateAndParseClients = (csvText: string): Client[] | null => {
  const { headers, rows } = parseCSV(csvText);
  if (rows.length < 5) return null;

  const expected = [
    'Entreprise.', 'Identifiant fiscal.', 'Email.', 'Téléphone.'
  ];
  if (headers.length !== expected.length) return null;
  const hMatch = headers.every((h, i) => h.replace(/^\uFEFF/, '').trim() === expected[i]);
  if (!hMatch) return null;

  const parsedItems: Client[] = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row.length !== expected.length) return null;

    const entreprise = row[0];
    const idFiscal = row[1];
    const email = row[2];
    const phone = row[3];

    parsedItems.push({
      id: 'cl_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
      denomination: entreprise,
      siret: idFiscal,
      email: email,
      phone: phone,
      accessKey: 'AC-' + Math.floor(100 + Math.random() * 900),
      nomPrenomSite: '',
      telephoneSite: '',
      emailSite: '',
      contrat: 'Non',
      nomContrat: '',
      referenceContrat: '',
      debutContrat: '',
      finContrat: ''
    });
  }

  return parsedItems;
};

const validateAndParseStocks = (csvText: string, currentVars: Variable[]): StockRecord[] | null => {
  const { headers, rows } = parseCSV(csvText);
  if (rows.length < 5) return null;

  const expected = [
    'Pièce ou service.', 'Quantité disponible.', 'Quantité réservée.', 'Quantité totale.',
    'Stockage.', 'Tarif fournisseur.', 'Marge.', 'Tarif de vente.'
  ];
  if (headers.length !== expected.length) return null;
  const hMatch = headers.every((h, i) => h.replace(/^\uFEFF/, '').trim() === expected[i]);
  if (!hMatch) return null;

  const validStockages = ['Entrepôt A', 'Entrepôt B', 'Véhicule A', 'Véhicule B', 'Véhicule C', 'Non approprié.'];

  const parsedItems: StockRecord[] = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (row.length !== expected.length) return null;

    const pieceNom = row[0];
    const qtyDispStr = row[1];
    const qtyResStr = row[2];
    const qtyTotStr = row[3];
    const stockage = row[4];
    const costStr = row[5];
    const marginStr = row[6];
    const priceStr = row[7];

    const matchingVar = currentVars.find(v => v.nom === pieceNom);
    if (!matchingVar) return null;

    if (!validStockages.includes(stockage)) return null;

    const parseNum = (val: string): number | null => {
      if (!val) return null;
      const parsed = parseFloat(val.replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    };

    const quantiteDisp = parseNum(qtyDispStr);
    const quantiteRes = parseNum(qtyResStr);
    const qtyTot = parseNum(qtyTotStr); // Must be a valid numeric

    const cost = parseNum(costStr);
    const margin = parseNum(marginStr);
    const price = parseNum(priceStr);

    if (quantiteDisp === null || quantiteRes === null || qtyTot === null || cost === null || margin === null || price === null) {
      return null;
    }

    parsedItems.push({
      id: 'st_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 1000),
      denominationPieceId: matchingVar.id,
      quantite: quantiteDisp,
      quantiteReservee: quantiteRes,
      livraisonDate: new Date().toISOString().split('T')[0],
      reapprovisionnementDate: '',
      valeurAchat: cost,
      marge: margin,
      prixVenteHt: price,
      stockage: stockage
    });
  }

  return parsedItems;
};

export default function ImportExportTab({ 
  tenantId,
  isFirebaseLoaded,
  defibrillateurs = [],
  clients = [],
  stocks = [],
  pointages = [],
  variables = [],
  saveDefibs,
  saveClients,
  saveStocks,
}: ImportExportTabProps) {
  const [records, setRecords] = useState<ImportExportRecord[]>(() => {
    const key = `defib_import_export_records_${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        return parsed.map((r) => ({
          ...r,
          format: 'CSV.' as const
        }));
      } catch (e) {
        return tenantId === 'demo' ? INITIAL_RECORDS : [];
      }
    }
    return tenantId === 'demo' ? INITIAL_RECORDS : [];
  });

  const [search, setSearch] = useState('');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Form visibility
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formExpirationDate, setFormExpirationDate] = useState('');
  const [formType, setFormType] = useState<'Importation.' | 'Exportation.'>('Importation.');
  const [formCategorie, setFormCategorie] = useState<'Défibrillateurs.' | 'Clients.' | 'Stocks.' | 'Temps.'>('Défibrillateurs.');
  const [formFormat, setFormFormat] = useState<'CSV.'>('CSV.');

  // Import states
  const [uploadedCsvContent, setUploadedCsvContent] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Set expiration date automatically: today + 1 day
  useEffect(() => {
    if (formDate) {
      const d = new Date(formDate);
      d.setDate(d.getDate() + 1);
      setFormExpirationDate(d.toISOString().split('T')[0]);
    }
  }, [formDate]);

  // Sync format automatically when type changes (always CSV now)
  useEffect(() => {
    setFormFormat('CSV.');
  }, [formType]);

  // Remove Temps. option and auto-switch to Defibrillateurs. if importation was chosen
  useEffect(() => {
    if (formType === 'Importation.' && formCategorie === 'Temps.') {
      setFormCategorie('Défibrillateurs.');
    }
    setUploadedCsvContent('');
    setValidationError(null);
  }, [formType, formCategorie]);

  // Load records from LocalStorage / Firestore on tenantId or isFirebaseLoaded change
  useEffect(() => {
    const loadRecords = async () => {
      const key = `defib_import_export_records_${tenantId}`;
      let localRecords: ImportExportRecord[] = [];
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          localRecords = JSON.parse(saved) as ImportExportRecord[];
        } catch (e) {
          localRecords = tenantId === 'demo' ? INITIAL_RECORDS : [];
        }
      } else {
        localRecords = tenantId === 'demo' ? INITIAL_RECORDS : [];
      }

      if (isFirebaseLoaded) {
        const cloudRecords = await fetchCollectionFromFirestore<ImportExportRecord[]>('importExportRecords');
        if (cloudRecords && Array.isArray(cloudRecords)) {
          // Expiration and cleanup check
          const cleanedRecords = cloudRecords.filter(r => {
            if (r.expiresAt && Date.now() > r.expiresAt) {
              return false; // delete expired records
            }
            return true;
          });
          
          setRecords(cleanedRecords);
          localStorage.setItem(key, JSON.stringify(cleanedRecords));
          
          // Save back if some were cleaned up
          if (cleanedRecords.length !== cloudRecords.length) {
            await saveCollectionToFirestore('importExportRecords', cleanedRecords);
          }
          return;
        }
      }

      // Fallback local expirations check
      const cleaned = localRecords.filter(r => {
        if (r.expiresAt && Date.now() > r.expiresAt) {
          return false;
        }
        return true;
      });

      setRecords(cleaned);
      localStorage.setItem(key, JSON.stringify(cleaned));
      if (isFirebaseLoaded) {
        await saveCollectionToFirestore('importExportRecords', cleaned);
      }
    };

    loadRecords();
    setSearch('');
    setShowForm(false);
  }, [tenantId, isFirebaseLoaded]);

  // Periodic cleanup of expired records (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      let expiredFound = false;
      const cleaned = records.filter(r => {
        if (r.expiresAt && Date.now() > r.expiresAt) {
          expiredFound = true;
          return false;
        }
        return true;
      });

      if (expiredFound) {
        setRecords(cleaned);
        const key = `defib_import_export_records_${tenantId}`;
        localStorage.setItem(key, JSON.stringify(cleaned));
        if (isFirebaseLoaded) {
          await saveCollectionToFirestore('importExportRecords', cleaned);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [records, tenantId, isFirebaseLoaded]);

  // Clean filters
  const filteredRecords = records.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.date.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term) ||
      r.categorie.toLowerCase().includes(term) ||
      (r.format && r.format.toLowerCase().includes(term))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formType === 'Importation.') {
      if (!uploadedCsvContent) {
        setValidationError('Fichier invalide, veuillez vérifier votre CSV et essayer à nouveau.');
        return;
      }

      let parsedData: any[] | null = null;
      if (formCategorie === 'Défibrillateurs.') {
        parsedData = validateAndParseDefibs(uploadedCsvContent, variables, defibrillateurs);
      } else if (formCategorie === 'Clients.') {
        parsedData = validateAndParseClients(uploadedCsvContent);
      } else if (formCategorie === 'Stocks.') {
        parsedData = validateAndParseStocks(uploadedCsvContent, variables);
      }

      if (!parsedData) {
        setValidationError('Fichier invalide, veuillez vérifier votre CSV et essayer à nouveau.');
        return;
      }

      setValidationError(null);
      setIsSaving(true);

      // Simulated saving time
      setTimeout(async () => {
        try {
          if (formCategorie === 'Défibrillateurs.' && saveDefibs) {
            saveDefibs([...defibrillateurs, ...parsedData]);
          } else if (formCategorie === 'Clients.' && saveClients) {
            saveClients([...clients, ...parsedData]);
          } else if (formCategorie === 'Stocks.' && saveStocks) {
            saveStocks([...stocks, ...parsedData]);
          }

          // Add transaction list record
          const newRecord: ImportExportRecord = {
            id: 'rec_' + Date.now(),
            date: formDate,
            type: formType,
            categorie: formCategorie,
            format: 'CSV.',
          };

          const updated = [newRecord, ...records];
          setRecords(updated);
          const key = `defib_import_export_records_${tenantId}`;
          localStorage.setItem(key, JSON.stringify(updated));
          if (isFirebaseLoaded) {
            await saveCollectionToFirestore('importExportRecords', updated);
          }

          setIsSaving(false);
          setShowForm(false);
          setUploadedCsvContent('');
        } catch (err) {
          console.error(err);
          setIsSaving(false);
          setValidationError('Une erreur est survenue lors de l’importation.');
        }
      }, 1500);

      return;
    }

    // Exportation path
    let csv = '';
    let expiresTime: number | undefined = undefined;
    let expDateStr: string | undefined = undefined;

    // Calculate expiration: +1 day from formDate
    const d = new Date(formDate);
    d.setDate(d.getDate() + 1);
    expiresTime = d.getTime();
    expDateStr = d.toISOString().split('T')[0];

    // Generate the CSV
    csv = generateCSV(formCategorie, {
      defibrillateurs,
      clients,
      stocks,
      pointages
    });

    const newRecord: ImportExportRecord = {
      id: 'rec_' + Date.now(),
      date: formDate,
      type: formType,
      categorie: formCategorie,
      format: 'CSV.',
      csvData: csv,
      expiresAt: expiresTime,
      expirationDate: expDateStr
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    
    // Save to LocalStorage and Firestore
    const key = `defib_import_export_records_${tenantId}`;
    localStorage.setItem(key, JSON.stringify(updated));
    if (isFirebaseLoaded) {
      await saveCollectionToFirestore('importExportRecords', updated);
    }

    setShowForm(false);

    // Reset fields to today and defaults
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType('Importation.');
    setFormCategorie('Défibrillateurs.');
  };

  const handleDelete = async (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    
    const key = `defib_import_export_records_${tenantId}`;
    localStorage.setItem(key, JSON.stringify(updated));
    if (isFirebaseLoaded) {
      await saveCollectionToFirestore('importExportRecords', updated);
    }
  };


  // Harmonized styles for consistency
  const thStyle: React.CSSProperties = {
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
    fontWeight: 100,
    letterSpacing: 'normal',
    textTransform: 'none',
    color: '#000',
    cursor: 'default',
    fontSize: '16px',
  };

  const roundedButtonStyle: React.CSSProperties = {
    backgroundColor: '#000000',
    color: '#ffffff',
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
    fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
  };

  const roundedButton18Style: React.CSSProperties = {
    ...roundedButtonStyle,
    fontSize: '18px',
    padding: '9px 19px',
  };

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

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 text-black font-sans pb-12" id="import-export-tab-container-harmonized">
      <style>{`
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]),
        #import-export-tab-container-harmonized select {
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
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
        #import-export-tab-container-harmonized input.search-input-field {
          font-size: 18px !important;
        }
        #import-export-tab-container-harmonized input.search-input-field::placeholder {
          font-size: 18px !important;
          font-family: "DefibeoMain", "Civilprom", sans-serif !important;
          font-weight: 100 !important;
        }
        #import-export-tab-container-harmonized select {
          background-image: none !important;
        }
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):hover:not(:disabled),
        #import-export-tab-container-harmonized input:not([type="radio"]):not([type="checkbox"]):focus:not(:disabled),
        #import-export-tab-container-harmonized select:hover:not(:disabled),
        #import-export-tab-container-harmonized select:focus:not(:disabled) {
          outline: 2.5px solid #fa53d5 !important;
          outline-offset: 2px !important;
          transition: all 0s !important;
        }

        /* Hide raw date picker icon indicator */
        #import-export-tab-container-harmonized input[type="date"]::-webkit-calendar-picker-indicator {
          display: none !important;
          -webkit-appearance: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        #import-export-tab-container-harmonized input[type="date"] {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }
      `}</style>



      {/* Main Container - Full page width */}
      <div className="w-full flex flex-col space-y-6">
        
        {/* Harmonized Header - only visible when not filling creation form */}
        {!showForm && (
          <div 
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            style={{
              border: '1px solid #dadada',
              borderTop: 'none',
              borderRadius: '0px 0px 18px 18px',
              maxWidth: '98%',
              margin: 'auto',
              padding: '20px',
              backgroundColor: '#ffffff',
              width: '100%'
            }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-black font-gochi cursor-default" style={{ cursor: 'default' }}>Importer Exporter</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input block */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher."
                  className="w-full sm:w-[220px] search-input-field"
                  style={searchInputStyle}
                  onMouseEnter={() => setIsSearchHovered(true)}
                  onMouseLeave={() => setIsSearchHovered(false)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </div>

              {/* Nouveau Button */}
              <button
                onClick={() => setShowForm(true)}
                style={{
                  ...roundedButton18Style,
                  backgroundColor: 'rgb(53, 86, 236)',
                  color: '#ffffff',
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                }}
                className="transition-all cursor-pointer"
              >
                <span>Nouveau</span>
              </button>
            </div>
          </div>
        )}

        {/* 🛠️ Matches DefibTab's Form Structure when form is open 🛠️ */}
        {showForm && (
          <div className="w-full space-y-6 font-sans animate-fadeIn max-w-[1000px] mx-auto" id="import-export-form-overlay">
            
            {/* Form Header */}
            <div 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
              style={{ 
                border: '1px solid #dadada', 
                borderTop: 'none', 
                borderRadius: '0px 0px 18px 18px', 
                maxWidth: '98%', 
                margin: 'auto', 
                padding: '20px' 
              }}
              id="import-export-form-header-box"
            >
              <div>
                <h3 className="text-2xl font-bold font-gochi" id="form-modal-title" style={{ color: '#000000', cursor: 'default' }}>
                  Nouveau Transfert
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={roundedButton18Style}
                  className="transition-colors cursor-pointer"
                  disabled={isSaving}
                >
                  <span>Fermer</span>
                </button>

                <button
                  type="submit"
                  form="import-export-creation-form"
                  style={{
                    ...roundedButton18Style,
                    backgroundColor: isSaving ? '#6b7280' : 'rgb(53, 86, 236)',
                    color: '#ffffff',
                    opacity: isSaving ? 0.6 : 1,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: isSaving ? 'none' : 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset'
                  }}
                  className="transition-all"
                  disabled={isSaving}
                >
                  {isSaving ? 'Importation...' : 'Enregistrer'}
                </button>
              </div>
            </div>

            {/* Form Body Box with top margin spacing */}
            <div 
              className="w-full animate-fadeIn mt-6"
              style={{ marginTop: '24px' }}
              id="import-export-form-box"
            >
              <form 
                onSubmit={handleCreate} 
                id="import-export-creation-form"
                style={{ maxWidth: '98%', margin: 'auto' }}
              >
                <div 
                  className="bg-white p-5 relative space-y-3"
                  style={{
                    border: '1px solid rgb(218, 218, 218)',
                    borderRadius: '18px',
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
                      1 — Paramètres du transfert
                    </span>
                  </div>

                  {/* Form grid matches fields requested */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Date field */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-date" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Date.
                      </label>
                      <input
                        type="date"
                        id="form-ie-date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                        disabled
                        required
                      />
                    </div>

                    {/* Date d'expiration field */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-expiration" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Date d'expiration.
                      </label>
                      <input
                        type="date"
                        id="form-ie-expiration"
                        value={formExpirationDate}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                        disabled
                        required
                      />
                    </div>

                    {/* Type select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-type" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Type de transfert.
                      </label>
                      <select
                        id="form-ie-type"
                        value={formType}
                        onChange={(e) => {
                          const val = e.target.value as 'Importation.' | 'Exportation.';
                          setFormType(val);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black cursor-pointer"
                      >
                        <option value="Importation.">Importation.</option>
                        <option value="Exportation.">Exportation.</option>
                      </select>
                    </div>

                    {/* Catégorie select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-cat" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Compartiment de données.
                      </label>
                      <select
                        id="form-ie-cat"
                        value={formCategorie}
                        onChange={(e) => setFormCategorie(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black cursor-pointer"
                      >
                        <option value="Défibrillateurs.">Défibrillateurs.</option>
                        <option value="Clients.">Clients.</option>
                        <option value="Stocks.">Stocks.</option>
                        {formType !== 'Importation.' && (
                          <option value="Temps.">Temps.</option>
                        )}
                      </select>
                    </div>

                    {/* Format disabled select */}
                    <div className="space-y-1">
                      <label htmlFor="form-ie-fmt" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                        Format.
                      </label>
                      <select
                        id="form-ie-fmt"
                        value="CSV."
                        disabled
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                      >
                        <option value="CSV.">CSV.</option>
                      </select>
                    </div>

                    {formType === 'Importation.' && (
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="form-ie-file" className="block text-black font-bold font-sans" style={{ color: '#000000', fontSize: '16px', letterSpacing: 'normal', textTransform: 'none' }}>
                          Fichier d'importation (.csv).
                        </label>
                        <input
                          type="file"
                          id="form-ie-file"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const text = evt.target?.result;
                                if (typeof text === 'string') {
                                  setUploadedCsvContent(text);
                                }
                              };
                              reader.readAsText(file, 'utf-8');
                            } else {
                              setUploadedCsvContent('');
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-black"
                          required
                        />
                      </div>
                    )}

                  </div>

                  {validationError && (
                    <div className="pt-2 text-center" id="validation-error-msg">
                      <p className="text-red-600 font-bold font-sans" style={{ color: '#dc2626', fontSize: '18px' }}>
                        {validationError}
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>

          </div>
        )}

        {/* REPORT / List of Transfers - full width - only visible when not filling creation form */}
        {!showForm && (
          <div 
            className="bg-white overflow-hidden mt-6 rounded-none animate-fadeIn"
            style={{ border: 'none', borderRadius: '0px', boxShadow: 'none' }}
            id="import-export-report-container"
          >
            {filteredRecords.length === 0 ? (
              <div className="p-16 text-center font-sans lg:py-24" id="no-records-view">
                <p style={{ color: '#000000', fontSize: '16px', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                  Aucun résultat.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table 
                  className="w-full text-left font-sans border-collapse text-xs" 
                  id="records-table" 
                  style={{ borderTop: '1px solid rgb(218, 218, 218)', borderBottom: '1px solid rgb(218, 218, 218)' }}
                >
                  <thead>
                    <tr className="bg-transparent">
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Horodatage.</th>
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Circulation.</th>
                      <th className="px-4 py-3.5 w-[25%]" style={thStyle}>Compartiment.</th>
                      <th className="px-4 py-3.5 w-[15%]" style={thStyle}>Format.</th>
                      <th className="px-4 py-3.5 text-right w-[15%]" style={thStyle}>Actions.</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-705 text-xs text-black">
                    {filteredRecords.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-[#ffecf8] transition-all cursor-default"
                      >
                        {/* Date column (exactly mimicking text styling from DefibTab) */}
                        <td 
                          className="px-4 py-5 font-sans whitespace-nowrap"
                          style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
                        >
                          {formatDateToDDMMYYYY(r.date)}
                        </td>

                        {/* Type badge column without color dot */}
                        <td className="px-4 py-5 font-sans whitespace-nowrap text-left">
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              border: '1px solid rgb(231, 231, 231)',
                              borderRadius: '1000px',
                              padding: '4px 12px',
                              backgroundColor: '#ffffff'
                            }} 
                            className="whitespace-nowrap"
                          >
                            <span style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                              {r.type}
                            </span>
                          </div>
                        </td>

                        {/* Catégorie column */}
                        <td 
                          className="px-4 py-5 font-sans whitespace-nowrap"
                          style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}
                        >
                          {r.categorie}
                        </td>

                        {/* Format column without color dot */}
                        <td className="px-4 py-5 font-sans whitespace-nowrap text-left">
                          <div 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              border: '1px solid rgb(231, 231, 231)',
                              borderRadius: '1000px',
                              padding: '4px 12px',
                              backgroundColor: '#ffffff'
                            }} 
                            className="whitespace-nowrap"
                          >
                            <span style={{ fontSize: '16px', color: '#000000', fontWeight: 100, fontFamily: '"DefibeoMain", "Civilprom", sans-serif' }}>
                              {r.format}
                            </span>
                          </div>
                        </td>

                        {/* Consulter & Supprimer buttons */}
                        <td className="px-4 py-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {r.type === 'Importation.' ? (
                              <button
                                type="button"
                                disabled
                                style={{
                                  ...roundedButton18Style,
                                  backgroundColor: '#dedede',
                                  color: '#959595',
                                  cursor: 'not-allowed',
                                  boxShadow: 'none'
                                }}
                                className="opacity-60"
                              >
                                <span>Télécharger</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!r.csvData) {
                                    alert("Aucune donnée CSV disponible pour ce record.");
                                    return;
                                  }
                                  const csvContent = "\ufeff" + r.csvData;
                                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  const sanitizedCat = r.categorie.replace(/\./g, '').toLowerCase().replace(/é/g, 'e');
                                  link.download = `export_${sanitizedCat}_${r.date}.csv`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                }}
                                style={{
                                  ...roundedButton18Style,
                                  backgroundColor: '#000000',
                                  color: '#ffffff'
                                }}
                                className="transition-all hover:opacity-80"
                              >
                                <span>Télécharger</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              style={roundedButton18Style}
                              className="transition-all text-white bg-black rounded cursor-pointer"
                            >
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

