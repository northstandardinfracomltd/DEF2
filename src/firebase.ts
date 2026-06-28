import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_VARIABLES } from './utils';
import { Member, Client } from './types';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalForceLongPolling: true,
});
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
  shortEnvId?: string;
  nomLogiciel?: string;
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

export function saveToLocalCache(key: string, value: any): void {
  try {
    localStorage.setItem(`fs_cache_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write to local cache for key ${key}:`, err);
  }
}

export function getFromLocalCache<T>(key: string): T | null {
  try {
    const val = localStorage.getItem(`fs_cache_${key}`);
    return val ? JSON.parse(val) as T : null;
  } catch (err) {
    console.warn(`Failed to read from local cache for key ${key}:`, err);
    return null;
  }
}

/**
 * Fetches a collection (stored as a single document with a 'list' array or object data) 
 * from Firestore. Returns null if the document does not exist yet.
 */
export async function fetchCollectionFromFirestore<T>(collectionName: string): Promise<T | null> {
  const key = getCollectionKey(collectionName);
  try {
    const docRef = doc(db, 'appData', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const payload = snap.data();
      const val = payload.value as T;
      saveToLocalCache(key, val);
      return val;
    }
    return getFromLocalCache<T>(key);
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} from Firestore (will try cache):`, error);
    return getFromLocalCache<T>(key);
  }
}

/**
 * Recursively cleans and removes undefined keys from an object or array to make it Firestore-safe.
 */
export function sanitizeUndefined(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeUndefined(item));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    try {
      const serialized = JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'function') return null;
        return value;
      });
      return JSON.parse(serialized);
    } catch (e) {
      const res: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const val = obj[key];
          if (val !== undefined && typeof val !== 'function') {
            res[key] = sanitizeUndefined(val);
          }
        }
      }
      return res;
    }
  }
  return obj;
}

/**
 * Saves a collection array or object to Firestore.
 */
export async function saveCollectionToFirestore<T>(collectionName: string, value: T): Promise<void> {
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

  const finalCleanValue = sanitizeUndefined(sanitizedValue);
  
  // Save to cache immediately so UI reads it instantly
  saveToLocalCache(key, finalCleanValue);

  try {
    const docRef = doc(db, 'appData', key);
    await setDoc(docRef, { value: finalCleanValue });
    console.log(`Successfully synced ${key} to Firestore with hidden environment fields.`);
  } catch (error) {
    console.error(`Error saving collection ${collectionName} to Firestore (kept in cache):`, error);
  }
}

export function generateUniqueShortEnvId(existingCodes: string[]): string {
  let attempts = 0;
  while (attempts < 1000) {
    const num = Math.floor(Math.random() * 90) + 10; // 10 to 99
    const candidate = `D${num}`;
    if (!existingCodes.includes(candidate) && candidate !== 'D18') {
      return candidate;
    }
    attempts++;
  }
  for (let num = 10; num <= 99; num++) {
    const candidate = `D${num}`;
    if (!existingCodes.includes(candidate) && candidate !== 'D18') {
      return candidate;
    }
  }
  return 'D99';
}

/**
 * Fetches the master list of registered tenants. 
 */
export async function getRegisteredTenants(): Promise<Tenant[]> {
  try {
    const docRef = doc(db, 'appData', 'registered_tenants');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const tenants = (snap.data().value || []) as Tenant[];
      let needsUpdate = false;
      const existingShortCodes = tenants
        .map(t => t.shortEnvId)
        .filter((code): code is string => !!code);

      const updatedTenants = tenants.map(t => {
        if (!t.shortEnvId) {
          const newCode = generateUniqueShortEnvId(existingShortCodes);
          existingShortCodes.push(newCode);
          needsUpdate = true;
          return { ...t, shortEnvId: newCode };
        }
        return t;
      });

      if (needsUpdate) {
        await setDoc(docRef, { value: updatedTenants });
        console.log('Successfully migrated missing shortEnvId for some tenants:', updatedTenants);
      }

      saveToLocalCache('registered_tenants', updatedTenants);
      return updatedTenants;
    }
    return getFromLocalCache<Tenant[]>('registered_tenants') || [];
  } catch (err) {
    console.error('Error fetching registered_tenants (will try cache):', err);
    return getFromLocalCache<Tenant[]>('registered_tenants') || [];
  }
}

/**
 * Fetches a raw collection key from Firestore bypassing the default prefix.
 */
export async function fetchRawCollectionFromFirestore<T>(rawKey: string): Promise<T | null> {
  try {
    const docRef = doc(db, 'appData', rawKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const payload = snap.data();
      const val = payload.value as T;
      saveToLocalCache(rawKey, val);
      return val;
    }
    return getFromLocalCache<T>(rawKey);
  } catch (error) {
    console.error(`Error fetching raw collection ${rawKey} from Firestore (will try cache):`, error);
    return getFromLocalCache<T>(rawKey);
  }
}

/**
 * Verifies if an email exists anywhere in the entire database (cross-environments, cross-roles).
 */
export async function checkIfEmailExistsAnywhere(
  email: string,
  excludeCurrentTenant?: {
    tenantId: string;
    excludeOption: 'member' | 'client' | 'none';
    uniqueId?: string; // member email or client ID
  }
): Promise<{ exists: boolean; message: string }> {
  const checkEmail = email.trim().toLowerCase();
  if (!checkEmail) {
    return { exists: false, message: '' };
  }

  if (checkEmail === 'account@demo.com') {
    return { exists: true, message: 'Cette adresse email est réservée pour le compte de démonstration.' };
  }

  // 1. Check registered tenants main data
  const tenants = await getRegisteredTenants();
  for (const t of tenants) {
    if (excludeCurrentTenant?.tenantId === t.id && excludeCurrentTenant?.excludeOption === 'none') {
      continue;
    }
    if (t.adminEmail.trim().toLowerCase() === checkEmail) {
      return { exists: true, message: 'Erreur: un utilisateur avec cet email est déjà existant.' };
    }
    if (t.companyEmail.trim().toLowerCase() === checkEmail) {
      return { exists: true, message: 'Erreur: un utilisateur avec cet email est déjà existant.' };
    }
  }

  // 2. Scan every tenant's lists
  const tenantIds = ['demo', ...tenants.map(t => t.id)];

  for (const tid of tenantIds) {
    // Check members
    const mKey = tid === 'demo' ? 'members' : `${tid}_members`;
    const membersList = await fetchRawCollectionFromFirestore<Member[]>(mKey) || [];
    if (Array.isArray(membersList)) {
      for (const m of membersList) {
        if (
          excludeCurrentTenant?.tenantId === tid &&
          excludeCurrentTenant?.excludeOption === 'member' &&
          excludeCurrentTenant?.uniqueId?.trim().toLowerCase() === m.email.trim().toLowerCase() &&
          m.email.trim().toLowerCase() === checkEmail
        ) {
          continue;
        }
        if (m.email && m.email.trim().toLowerCase() === checkEmail) {
          return { exists: true, message: 'Erreur: un utilisateur avec cet email est déjà existant.' };
        }
      }
    }

    // Check clients
    const cKey = tid === 'demo' ? 'clients' : `${tid}_clients`;
    const clientsList = await fetchRawCollectionFromFirestore<Client[]>(cKey) || [];
    if (Array.isArray(clientsList)) {
      for (const c of clientsList) {
        if (
          excludeCurrentTenant?.tenantId === tid &&
          excludeCurrentTenant?.excludeOption === 'client' &&
          excludeCurrentTenant?.uniqueId === c.id
        ) {
          continue;
        }
        if (
          (c.email && c.email.trim().toLowerCase() === checkEmail) ||
          (c.emailSite && c.emailSite.trim().toLowerCase() === checkEmail)
        ) {
          return { exists: true, message: 'Erreur: un utilisateur avec cet email est déjà existant.' };
        }
      }
    }
  }

  return { exists: false, message: '' };
}

/**
 * Registers a new environment (new tenant instance) in Firestore.
 * Initializes all client/defibrillator database partitions.
 */
export async function registerNewTenant(tenantData: Omit<Tenant, 'id' | 'createdAt'> & { customTenantId?: string }): Promise<string> {
  const adminEmailLower = tenantData.adminEmail.trim().toLowerCase();
  const companyEmailLower = tenantData.companyEmail.trim().toLowerCase();

  // Also check demo hardcoded credential to prevent collisions
  if (adminEmailLower === 'account@demo.com') {
    throw new Error('Cette adresse email est réservée pour le compte de démonstration.');
  }

  // Perform whole-db cross validation
  const checkAdmin = await checkIfEmailExistsAnywhere(adminEmailLower);
  if (checkAdmin.exists) {
    throw new Error(checkAdmin.message);
  }

  const checkCompany = await checkIfEmailExistsAnywhere(companyEmailLower);
  if (checkCompany.exists) {
    throw new Error(checkCompany.message);
  }

  const tenants = await getRegisteredTenants();
  const cleanTenantId = tenantData.customTenantId ? tenantData.customTenantId.trim() : '';
  if (cleanTenantId) {
    const existingTenantId = tenants.find(t => t.id.trim().toLowerCase() === cleanTenantId.toLowerCase());
    if (existingTenantId || cleanTenantId.toLowerCase() === 'demo') {
      throw new Error("Cet identifiant d'environnement (Identifiant Logiciel) est déjà utilisé. Veuillez en choisir un autre.");
    }
  }

  // Create unique tenant ID (following D1, D2, D3... sequential pattern)
  let tenantId = cleanTenantId;
  if (!tenantId) {
    const dPrefixTenants = tenants.filter(t => /^D\d+$/i.test(t.id));
    if (dPrefixTenants.length > 0) {
      const numbers = dPrefixTenants.map(t => {
        const match = t.id.match(/^D(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = Math.max(...numbers);
      tenantId = `D${maxNum + 1}`;
    } else {
      tenantId = 'D1';
    }
  }
  
  const { customTenantId, ...restTenantData } = tenantData;

  const existingShortCodes = tenants
    .map(t => t.shortEnvId)
    .filter((code): code is string => !!code);
  const assignedShortEnvId = generateUniqueShortEnvId(existingShortCodes);

  const newTenant: Tenant = {
    ...restTenantData,
    id: tenantId,
    shortEnvId: assignedShortEnvId,
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
    logo: "",
    website: `${tenantData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.defibeo.com`,
    email: tenantData.companyEmail,
    phone: tenantData.companyPhone,
    nomLogiciel: tenantData.nomLogiciel || tenantData.companyName || "Défibeo Suite"
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
    'fsmTours',
    'otherEquipments',
    'pointagesAutoVigilance'
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

/**
 * Verifies if a defibrillator identifiant exists anywhere in the entire database (cross-environments/tenants).
 */
export async function checkIfDefibIdentifiantExistsAnywhere(
  identifiant: string,
  excludeDefibId?: string
): Promise<{ exists: boolean; tenantName?: string }> {
  const checkIdent = identifiant.trim().toUpperCase();
  if (!checkIdent) {
    return { exists: false };
  }

  try {
    const tenants = await getRegisteredTenants();
    const tenantIds = ['demo', ...tenants.map(t => t.id)];

    for (const tid of tenantIds) {
      const key = tid === 'demo' ? 'defibrillateurs' : `${tid}_defibrillateurs`;
      const defibList = await fetchRawCollectionFromFirestore<any[]>(key) || [];
      if (Array.isArray(defibList)) {
        for (const df of defibList) {
          if (excludeDefibId && df.id === excludeDefibId) {
            continue;
          }
          if (df.identifiant && df.identifiant.trim().toUpperCase() === checkIdent) {
            let tenantLabel = 'Démonstration';
            if (tid !== 'demo') {
              const matchingTenant = tenants.find(t => t.id === tid);
              tenantLabel = matchingTenant ? matchingTenant.companyName : tid;
            }
            return { exists: true, tenantName: tenantLabel };
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking global defibrillator uniqueness:', error);
  }

  return { exists: false };
}

/**
 * Finds the tenant information owning a specified defibrillator identifiant.
 */
export async function findTenantAndDefibGlobally(identifiant: string): Promise<{ tenantId: string; companyName: string; companyEmail: string; exists: boolean } | null> {
  const checkIdent = identifiant.trim().toUpperCase();
  if (!checkIdent) return null;
  try {
    const tenants = await getRegisteredTenants();
    const tenantIds = ['demo', ...tenants.map(t => t.id)];

    for (const tid of tenantIds) {
      const key = tid === 'demo' ? 'defibrillateurs' : `${tid}_defibrillateurs`;
      const defibList = await fetchRawCollectionFromFirestore<any[]>(key) || [];
      if (Array.isArray(defibList)) {
        const hasMatch = defibList.some(df => 
          (df.identifiant && df.identifiant.trim().toUpperCase() === checkIdent) ||
          (df.id && df.id.trim().toUpperCase() === checkIdent)
        );
        if (hasMatch) {
          if (tid === 'demo') {
            return {
              tenantId: 'demo',
              companyName: 'Défibeo Solutions',
              companyEmail: 'contact@defibeo-solutions.com',
              exists: true
            };
          } else {
            const tenantObj = tenants.find(t => t.id === tid);
            return {
              tenantId: tid,
              companyName: tenantObj ? tenantObj.companyName : tid,
              companyEmail: tenantObj ? tenantObj.companyEmail : 'support@defibeo.com',
              exists: true
            };
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding tenant and defib globally:', error);
  }
  return null;
}

/**
 * Updates the language of a specific tenant in the master registry.
 */
export async function updateTenantLanguage(tenantId: string, lang: string): Promise<void> {
  if (tenantId === 'demo' || !tenantId) return;
  try {
    const tenants = await getRegisteredTenants();
    const updated = tenants.map(t => {
      if (t.id === tenantId) {
        return { ...t, lang };
      }
      return t;
    });
    const docRef = doc(db, 'appData', 'registered_tenants');
    await setDoc(docRef, { value: updated });
    saveToLocalCache('registered_tenants', updated);
    console.log(`Updated tenant ${tenantId} language to ${lang} in Firestore`);
  } catch (err) {
    console.error(`Error updating language for tenant ${tenantId}:`, err);
  }
}


