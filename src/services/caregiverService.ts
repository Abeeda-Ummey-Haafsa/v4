import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { calculateDistance } from '../utils/distance';
import { Caregiver } from '../types/index';

// Coordinate preset dictionary for resolving manual address inputs to geo coordinates
const SERVICE_COORDINATE_PRESETS: { [key: string]: { lat: number; lng: number } } = {
  'banani': { lat: 23.7925, lng: 90.4078 },
  'gulshan': { lat: 23.7925, lng: 90.4194 },
  'dhanmondi': { lat: 23.7461, lng: 90.3742 },
  'uttara': { lat: 23.8680, lng: 90.4000 },
  'mirpur': { lat: 23.8069, lng: 90.3687 },
  'mohammadpur': { lat: 23.7542, lng: 90.3614 },
  'bashundhara': { lat: 23.8193, lng: 90.4526 },
  'badda': { lat: 23.7805, lng: 90.4267 },
  'lalmatia': { lat: 23.7554, lng: 90.3685 }
};

export function getPredefinedCoordinates(area: string | null | undefined): { lat: number, lng: number } {
  if (!area) return { lat: 23.7461, lng: 90.3742 }; // Dhanmondi default
  const cleanArea = area.trim().toLowerCase();
  
  // Try direct matches
  if (SERVICE_COORDINATE_PRESETS[cleanArea]) {
    return SERVICE_COORDINATE_PRESETS[cleanArea];
  }
  
  // Try partial match
  const matchedKey = Object.keys(SERVICE_COORDINATE_PRESETS).find(key => 
    cleanArea.includes(key) || key.includes(cleanArea)
  );
  if (matchedKey) {
    return SERVICE_COORDINATE_PRESETS[matchedKey];
  }
  
  return { lat: 23.7461, lng: 90.3742 }; // fallback to Dhanmondi
}

/**
 * Fetch all caregivers
 */
export async function getAllCaregivers(): Promise<Caregiver[]> {
  const path = 'caregivers';
  try {
    const q = collection(db, path);
    const snap = await getDocs(q);
    const caregivers: Caregiver[] = [];
    
    snap.forEach((snapshotDoc) => {
      const data = snapshotDoc.data();
      let lat = data.latitude;
      let lng = data.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        const coords = getPredefinedCoordinates(data.area);
        lat = coords.lat;
        lng = coords.lng;
      }
      caregivers.push({
        id: snapshotDoc.id,
        ...data,
        latitude: lat,
        longitude: lng
      } as Caregiver);
    });

    return caregivers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.warn("getAllCaregivers failed, returning empty list:", error);
    return [];
  }
}

/**
 * Fetch single caregiver profile by ID
 */
export async function getCaregiverById(id: string): Promise<Caregiver> {
  const path = `caregivers/${id}`;
  try {
    if (!id) {
      throw new Error('Caregiver ID is required');
    }

    const docRef = doc(db, 'caregivers', id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      throw new Error('Caregiver profile not found');
    }

    const data = snapshot.data();
    let lat = data.latitude;
    let lng = data.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      const coords = getPredefinedCoordinates(data.area);
      lat = coords.lat;
      lng = coords.lng;
    }

    return {
      id: snapshot.id,
      ...data,
      latitude: lat,
      longitude: lng
    } as Caregiver;
  } catch (error) {
    throw error;
  }
}

/**
 * Helper to identify all caregivers with active/upcoming bookings
 */
export async function getBusyCaregiverIds(): Promise<Set<string>> {
  const busyIds = new Set<string>();
  try {
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    bookingsSnap.forEach((bSnap) => {
      const bData = bSnap.data();
      const bStatus = (bData.status || '').toLowerCase();
      if (bStatus === 'confirmed' || bStatus === 'pending') {
        if (bData.caregiver_id) {
          busyIds.add(bData.caregiver_id);
        }
      }
    });
  } catch (err) {
    console.warn("Failed to fetch active bookings to check caregiver busy status:", err);
  }
  return busyIds;
}

/**
 * General text-based search for caregivers in Dhaka
 */
export async function searchCaregivers(queryStr: string): Promise<Caregiver[]> {
  try {
    const busyIds = await getBusyCaregiverIds();
    const all = await getAllCaregivers();
    const qLower = queryStr.toLowerCase();
    return all.filter(cg => {
      if (cg.is_available === false) return false;
      if (busyIds.has(cg.id)) return false;
      return (
        (cg.full_name?.toLowerCase().includes(qLower)) ||
        (cg.expertise?.toLowerCase().includes(qLower)) ||
        (cg.bio?.toLowerCase().includes(qLower))
      );
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Advanced custom filter queries
 */
export async function filterCaregivers(filters: {
  area?: string;
  maxRate?: number;
  minRating?: number;
}): Promise<Caregiver[]> {
  try {
    const busyIds = await getBusyCaregiverIds();
    const all = await getAllCaregivers();
    return all.filter(cg => {
      if (cg.is_available === false) return false;
      if (busyIds.has(cg.id)) return false;
      if (filters.area && cg.area !== filters.area) return false;
      if (typeof filters.maxRate === 'number' && cg.hourly_rate > filters.maxRate) return false;
      if (typeof filters.minRating === 'number' && (cg.rating || 0) < filters.minRating) return false;
      return true;
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Existing search/filter methods kept for compatibility with the old components
 */
export async function getCaregivers(filters?: { area?: string; maxRate?: number }): Promise<Caregiver[]> {
  try {
    const busyIds = await getBusyCaregiverIds();
    const all = await getAllCaregivers();
    return all.filter(cg => {
      if (cg.is_available === false) return false;
      if (busyIds.has(cg.id)) return false;
      if (filters?.area && cg.area !== filters.area) return false;
      if (typeof filters?.maxRate === 'number' && cg.hourly_rate > filters.maxRate) return false;
      return true;
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Geo-matching distance sort method
 */
export async function getNearbyCaregivers(elderId: string, maxDistanceKm: number = 20): Promise<{ id: string; name: string; full_name: string; phone: string | null; area: string | null; city: string; latitude: number | null; longitude: number | null; hourly_rate: number; rating: number; experience_years: number | null; expertise: string | null; bio: string | null; is_available: boolean; created_at: string; distance: number }[]> {
  try {
    const elderDocRef = doc(db, 'elders', elderId);
    const elderSnap = await getDoc(elderDocRef);

    if (!elderSnap.exists()) {
      throw new Error('Elder not found');
    }

    const elderData = elderSnap.data();
    let elderLat = elderData.latitude;
    let elderLng = elderData.longitude;
    if (typeof elderLat !== 'number' || typeof elderLng !== 'number' || isNaN(elderLat) || isNaN(elderLng)) {
      const coords = getPredefinedCoordinates(elderData.location || elderData.area);
      elderLat = coords.lat;
      elderLng = coords.lng;
    }

    const allCaregivers = await getAllCaregivers();
    const availableCaregivers = allCaregivers.filter(cg => cg.is_available !== false);

    const mapped = availableCaregivers
      .map((caregiver: Caregiver) => {
        const distance = calculateDistance(
          elderLat,
          elderLng,
          caregiver.latitude as number,
          caregiver.longitude as number
        );

        return {
          ...caregiver,
          name: caregiver.full_name, // Map for UI compatibility
          distance,
        };
      });

    const filtered = mapped.filter((caregiver) => caregiver.distance <= maxDistanceKm);
    return (filtered.length > 0 ? filtered : mapped).sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.warn("getNearbyCaregivers failed, returning empty list:", error);
    return [];
  }
}
