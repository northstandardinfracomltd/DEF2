import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_VARIABLES } from './utils';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();

export interface Tenant {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHexOrPlain: string;
  lang: string;
  createdAt: string;
}

let currentTenantId: string = localStorage.getItem('defib_tenant_id') || 'demo';

export function setTenantId(tenantId: string) {
  currentTenantId = tenantId;
  localStorage.setItem('defib_tenant_id', tenantId);
}

export function getTenantId(): string {
  return currentTenantId;
}

export function getCollectionKey(collectionName: string, tenantId: string = currentTenantId): string {
  if (tenantId === 'demo' || !tenantId) {
    return collectionName;
  }
  return `${tenantId}_${collectionName}`;
}

/**
 * Fetches a collection (stored as a single document with a 'list' array or object data) 
 * from Firestore. Returns null if the document does not exist yet.
 */
export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T | null> {
  try {
    const key = getCollectionKey(collectionName);
    const docRef = doc(db, 'appData', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const payload = snap.data();
      return payload.value as T;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} from Firestore:`, error);
    return null;
  }
}

/**
 * Saves a collection array or object to Firestore.
 */
export async function saveCollectionToFirestore<T>(collectionName: string, value: T): Promise<void> {
  try {
    const tenantId = getTenantId();
    const key = getCollectionKey(collectionName, tenantId);
    
    // Auto-inject envId and tenantId if items are objects inside an array
    let sanitizedValue = value;
    if (Array.isArray(value)) {
      sanitizedValue = value.map(item => {
        if (item && typeof item === 'object') {
          return {
            ...item,
            envId: tenantId,
            tenantId: tenantId
          };
        }
        return item;
      }) as unknown as T;
    } else if (value && typeof value === 'object') {
      sanitizedValue = {
        ...value,
        envId: tenantId,
        tenantId: tenantId
      } as unknown as T;
    }

    const docRef = doc(db, 'appData', key);
    await setDoc(docRef, { value: sanitizedValue });
    console.log(`Successfully synced ${key} to Firestore with hidden environment fields.`);
  } catch (error) {
    console.error(`Error saving collection ${collectionName} to Firestore:`, error);
  }
}

/**
 * Fetches the master list of registered tenants. 
 */
export async function getRegisteredTenants(): Promise<Tenant[]> {
  try {
    const docRef = doc(db, 'appData', 'registered_tenants');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return (snap.data().value || []) as Tenant[];
    }
    return [];
  } catch (err) {
    console.error('Error fetching registered_tenants:', err);
    return [];
  }
}

/**
 * Registers a new environment (new tenant instance) in Firestore.
 * Initializes all client/defibrillator database partitions.
 */
export async function registerNewTenant(tenantData: Omit<Tenant, 'id' | 'createdAt'> & { customTenantId?: string }): Promise<string> {
  const tenants = await getRegisteredTenants();
  
  // Check duplicates
  const emailLower = tenantData.adminEmail.trim().toLowerCase();
  const companyEmailLower = tenantData.companyEmail.trim().toLowerCase();
  
  // Also check demo hardcoded credential to prevent collisions
  if (emailLower === 'account@demo.com') {
    throw new Error('Cette adresse email est réservée pour le compte de démonstration.');
  }

  const existingEmail = tenants.find(t => t.adminEmail.trim().toLowerCase() === emailLower);
  if (existingEmail) {
    throw new Error('Cette adresse email est déjà associée à un environnement existant.');
  }

  const existingCompany = tenants.find(t => t.companyEmail.trim().toLowerCase() === companyEmailLower);
  if (existingCompany) {
    throw new Error('Cette adresse email d\'entreprise est déjà associée à un environnement existant.');
  }

  const cleanTenantId = tenantData.customTenantId ? tenantData.customTenantId.trim() : '';
  if (cleanTenantId) {
    const existingTenantId = tenants.find(t => t.id.trim().toLowerCase() === cleanTenantId.toLowerCase());
    if (existingTenantId || cleanTenantId.toLowerCase() === 'demo') {
      throw new Error("Cet identifiant d'environnement (Identifiant Logiciel) est déjà utilisé. Veuillez en choisir un autre.");
    }
  }

  // Create unique tenant ID
  const tenantId = cleanTenantId || `tenant_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
  
  const { customTenantId, ...restTenantData } = tenantData;

  const newTenant: Tenant = {
    ...restTenantData,
    id: tenantId,
    createdAt: new Date().toISOString()
  };

  // 1. Save new tenant entry back to list
  tenants.push(newTenant);
  const docRef = doc(db, 'appData', 'registered_tenants');
  await setDoc(docRef, { value: tenants });

  // 2. Initialize the tenant's individual database partitions
  console.log(`Initializing collections partition for tenant: ${tenantId}`);
  
  const customCompanyInfo = {
    name: tenantData.companyName,
    logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=80&auto=format&fit=crop",
    website: `${tenantData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.defibeo.com`,
    email: tenantData.companyEmail,
    phone: tenantData.companyPhone
  };

  const customMembers = [
    {
      name: tenantData.adminName,
      role: 'Propriétaire / Admin',
      email: tenantData.adminEmail,
      status: 'Actif',
      lastActive: 'En ligne',
      pin: '1234'
    }
  ];

  // Store seeded partitions
  await setDoc(doc(db, 'appData', `${tenantId}_companyInfo`), { value: customCompanyInfo });
  await setDoc(doc(db, 'appData', `${tenantId}_members`), { value: customMembers });
  await setDoc(doc(db, 'appData', `${tenantId}_variables`), { value: [] });
  
  // Store empty arrays for independent tables
  const emptyTables = [
    'clients',
    'defibrillateurs',
    'tickets',
    'commercialDocs',
    'gedDocs',
    'stocks',
    'customerReviews',
    'pointages',
    'expenses',
    'generatedReports',
    'fsmTours'
  ];

  await Promise.all(
    emptyTables.map(tableName => 
      setDoc(doc(db, 'appData', `${tenantId}_${tableName}`), { value: [] })
    )
  );

  return tenantId;
}

/**
 * Searches for admin credentials in dynamic tenant partitions.
 */
export async function loginTenantAdmin(email: string, passwordPlain: string): Promise<Tenant | null> {
  const tenants = await getRegisteredTenants();
  const searchEmail = email.trim().toLowerCase();
  const searchPass = passwordPlain.trim();
  
  // Match demo first
  if (searchEmail === 'account@demo.com' && searchPass === '123456') {
    return {
      id: 'demo',
      companyName: 'Défibeo Solutions',
      companyEmail: 'contact@defibeo-solutions.com',
      companyPhone: '+33 1 47 20 00 01',
      adminName: 'Admin Démo',
      adminEmail: 'account@demo.com',
      adminPasswordHexOrPlain: '123456',
      lang: 'Français',
      createdAt: '2026-06-15'
    };
  }

  const found = tenants.find(t => t.adminEmail.trim().toLowerCase() === searchEmail && t.adminPasswordHexOrPlain.trim() === searchPass);
  return found || null;
}

