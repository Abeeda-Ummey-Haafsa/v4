import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function getRelativeDashboard(relativeId: string): Promise<{
  totalElders: number;
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalSpent: number;
}> {
  const path = 'dashboard';
  try {
    // 1. Fetch elders
    const eldersQ = query(
      collection(db, 'elders'),
      where('relative_id', '==', relativeId)
    );
    const eldersSnap = await getDocs(eldersQ);
    const totalElders = eldersSnap.size;

    // 2. Fetch bookings
    const bookingsQ = query(
      collection(db, 'bookings'),
      where('relative_id', '==', relativeId)
    );
    const bookingsSnap = await getDocs(bookingsQ);
    const totalBookings = bookingsSnap.size;

    let upcomingBookings = 0;
    let completedBookings = 0;
    let totalSpent = 0;

    bookingsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'confirmed') upcomingBookings++;
      if (data.status === 'completed') completedBookings++;
      if (data.payment_status === 'paid') {
        const amount = typeof data.total_amount === 'number' ? data.total_amount : 0;
        totalSpent += amount;
      }
    });

    return {
      totalElders,
      totalBookings,
      upcomingBookings,
      completedBookings,
      totalSpent
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
