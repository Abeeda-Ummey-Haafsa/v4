import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { calculateDistance } from '../utils/distance';
import { CaregiverWithDistance, Caregiver } from '../types/index';
import { getPredefinedCoordinates } from './caregiverService';

export async function getNearbyCaregivers(elderId: string, maxDistanceKm: number = 10): Promise<CaregiverWithDistance[]> {
  const path = `elders/${elderId}`;
  try {
    const elderDocRef = doc(db, 'elders', elderId);
    const elderSnap = await getDoc(elderDocRef);

    if (!elderSnap.exists()) {
      throw new Error(`Elder not found with id: ${elderId}`);
    }

    const elderData = elderSnap.data();
    let elderLat = elderData.latitude;
    let elderLng = elderData.longitude;
    if (typeof elderLat !== 'number' || typeof elderLng !== 'number' || isNaN(elderLat) || isNaN(elderLng)) {
      const coords = getPredefinedCoordinates(elderData.location || elderData.area);
      elderLat = coords.lat;
      elderLng = coords.lng;
    }

    const caregiversSnap = await getDocs(collection(db, 'caregivers'));
    const caregivers: Caregiver[] = [];

    caregiversSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.is_available === true) {
        let cgLat = data.latitude;
        let cgLng = data.longitude;
        if (typeof cgLat !== 'number' || typeof cgLng !== 'number' || isNaN(cgLat) || isNaN(cgLng)) {
          const coords = getPredefinedCoordinates(data.area);
          cgLat = coords.lat;
          cgLng = coords.lng;
        }
        caregivers.push({
          id: docSnap.id,
          ...data,
          latitude: cgLat,
          longitude: cgLng
        } as Caregiver);
      }
    });

    if (caregivers.length === 0) {
      return [];
    }

    const caregiversWithDistance = caregivers
      .map((caregiver) => {
        const distance = calculateDistance(
          elderLat,
          elderLng,
          caregiver.latitude as number,
          caregiver.longitude as number
        );

        return {
          ...caregiver,
          distance,
        } as CaregiverWithDistance;
      });

    return caregiversWithDistance
      .filter((caregiver) => caregiver.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Unknown error fetching nearby caregivers');
  }
}
