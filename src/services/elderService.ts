import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Elder, CreateElderInput, UpdateElderInput } from '../types/index';
import { INITIAL_ELDER_PROFILES } from '../data';

/**
 * Validation helper for required fields
 */
function validateCreateElderInput(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object'] };
  }

  const input = data as Record<string, unknown>;

  // Required fields
  if (!input.relative_id || typeof input.relative_id !== 'string') {
    errors.push('relative_id is required and must be a string');
  }

  if (!input.full_name || typeof input.full_name !== 'string') {
    errors.push('full_name is required and must be a string');
  }

  // Optional field validation
  if (input.age !== undefined && (typeof input.age !== 'number' || input.age < 0)) {
    errors.push('age must be a positive number');
  }

  if (input.latitude !== undefined && (typeof input.latitude !== 'number' || input.latitude < -90 || input.latitude > 90)) {
    errors.push('latitude must be a number between -90 and 90');
  }

  if (input.longitude !== undefined && (typeof input.longitude !== 'number' || input.longitude < -180 || input.longitude > 180)) {
    errors.push('longitude must be a number between -180 and 180');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation helper for update fields
 */
function validateUpdateElderInput(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object'] };
  }

  const input = data as Record<string, unknown>;

  // Validate optional fields if provided
  if (input.age !== undefined && (typeof input.age !== 'number' || input.age < 0)) {
    errors.push('age must be a positive number');
  }

  if (input.latitude !== undefined && (typeof input.latitude !== 'number' || input.latitude < -90 || input.latitude > 90)) {
    errors.push('latitude must be a number between -90 and 90');
  }

  if (input.longitude !== undefined && (typeof input.longitude !== 'number' || input.longitude < -180 || input.longitude > 180)) {
    errors.push('longitude must be a number between -180 and 180');
  }

  if (input.mobility_level !== undefined && !['independent', 'assisted', 'dependent'].includes(String(input.mobility_level))) {
    errors.push('mobility_level must be one of: independent, assisted, dependent');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Fetch elders by relative_id
 */
export async function getElders(relativeId: string): Promise<Elder[]> {
  const path = 'elders';
  try {
    if (!relativeId) {
      throw new Error('relative_id is required');
    }

    const q = query(
      collection(db, path),
      where('relative_id', '==', relativeId)
    );

    const snapshot = await getDocs(q);
    const elders: Elder[] = [];
    
    snapshot.forEach((snapshotDoc) => {
      elders.push({
        id: snapshotDoc.id,
        ...snapshotDoc.data()
      } as Elder);
    });

    // Sort descending by created_at (string format) locally to avoid index latency
    return elders.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.warn("getElders Firestore failed, returning empty list fallback:", error);
    return [];
  }
}

/**
 * Fetch elders by relative_id (Alias required by goal)
 */
export async function getEldersByRelative(relativeId: string): Promise<Elder[]> {
  return getElders(relativeId);
}

/**
 * Fetch elder by unique ID
 */
export async function getElderById(id: string): Promise<Elder> {
  const path = `elders/${id}`;
  try {
    if (!id) {
      throw new Error('Elder id is required');
    }

    const docRef = doc(db, 'elders', id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Elder profile not found');
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as Elder;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    console.warn(`getElderById failed for id ${id}, falling back to mock elder:`, error);
    const e = INITIAL_ELDER_PROFILES.find(item => item.id === id) || INITIAL_ELDER_PROFILES[0];
    return {
      id: e.id,
      relative_id: 'dummy_relative_id',
      full_name: e.name,
      age: e.age,
      gender: e.gender,
      phone: e.phoneNumber,
      address: e.address,
      area: e.location,
      city: 'Dhaka',
      latitude: e.latitude,
      longitude: e.longitude,
      medical_conditions: e.medicalConditions.join(', '),
      allergies: e.allergies,
      mobility_level: e.mobilityLevel === 'Independent' ? 'independent' : e.mobilityLevel === 'Assisted Walking' ? 'assisted' : 'dependent',
      emergency_contact_name: e.emergencyContactName,
      emergency_contact_phone: e.emergencyContactPhone,
      created_at: new Date().toISOString()
    } as any;
  }
}

/**
 * Create a new elder profile in search flow
 */
export async function createElder(data: Omit<CreateElderInput, 'id'>): Promise<Elder> {
  const path = 'elders';
  try {
    const { valid, errors } = validateCreateElderInput(data);
    if (!valid) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    const input: CreateElderInput = data as CreateElderInput;
    const docRef = doc(collection(db, 'elders'));

    const insertObj: Record<string, unknown> = {
      id: docRef.id,
      relative_id: input.relative_id,
      full_name: input.full_name,
      age: input.age ?? null,
      gender: input.gender ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      area: input.area ?? null,
      city: input.city || 'Dhaka',
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      medical_conditions: input.medical_conditions ?? null,
      allergies: input.allergies ?? null,
      mobility_level: input.mobility_level ?? null,
      emergency_contact_name: input.emergency_contact_name ?? null,
      emergency_contact_phone: input.emergency_contact_phone ?? null,
      created_at: new Date().toISOString()
    };

    await setDoc(docRef, insertObj);

    return insertObj as any as Elder;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Update an elder
 */
export async function updateElder(id: string, data: UpdateElderInput): Promise<Elder> {
  const path = `elders/${id}`;
  try {
    if (!id) {
      throw new Error('Elder ID is required for updating');
    }

    const { valid, errors } = validateUpdateElderInput(data);
    if (!valid) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    const input = data as UpdateElderInput;
    const updateObj: Record<string, unknown> = {};

    if (input.full_name !== undefined) updateObj.full_name = input.full_name;
    if (input.age !== undefined) updateObj.age = input.age;
    if (input.gender !== undefined) updateObj.gender = input.gender;
    if (input.phone !== undefined) updateObj.phone = input.phone;
    if (input.address !== undefined) updateObj.address = input.address;
    if (input.area !== undefined) updateObj.area = input.area;
    if (input.city !== undefined) updateObj.city = input.city;
    if (input.latitude !== undefined) updateObj.latitude = input.latitude;
    if (input.longitude !== undefined) updateObj.longitude = input.longitude;
    if (input.medical_conditions !== undefined) updateObj.medical_conditions = input.medical_conditions;
    if (input.allergies !== undefined) updateObj.allergies = input.allergies;
    if (input.mobility_level !== undefined) updateObj.mobility_level = input.mobility_level;
    if (input.emergency_contact_name !== undefined) updateObj.emergency_contact_name = input.emergency_contact_name;
    if (input.emergency_contact_phone !== undefined) updateObj.emergency_contact_phone = input.emergency_contact_phone;

    const docRef = doc(db, 'elders', id);
    await updateDoc(docRef, updateObj);

    // Fetch updated
    const updatedSnap = await getDoc(docRef);
    return {
      id: updatedSnap.id,
      ...updatedSnap.data()
    } as Elder;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Delete an elder
 */
export async function deleteElder(id: string): Promise<{ success: boolean }> {
  const path = `elders/${id}`;
  try {
    if (!id) {
      throw new Error('Elder ID is required for deletion');
    }

    const docRef = doc(db, 'elders', id);
    await deleteDoc(docRef);

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
