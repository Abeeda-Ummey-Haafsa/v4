import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Calculates the complete booking cost with itemized fee variables.
 */
export function calculateBookingCost(hours: number, hourlyRate: number): {
  hourly_rate: number;
  service_fee: number;
  total_amount: number;
} {
  const service_fee = 100; // Fixed service fee in TK
  const total_amount = hours * hourlyRate + service_fee;
  return {
    hourly_rate: hourlyRate,
    service_fee,
    total_amount,
  };
}

/**
 * Creates a payment intent to support Stripe-compatible pre-authorizations or payments.
 */
export async function createPaymentIntent(
  bookingId: string,
  amount: number
): Promise<{ success: boolean; clientSecret: string; stripePaymentId: string }> {
  const path = `bookings/${bookingId}`;
  try {
    // Generate a secure mockup Stripe transaction proof
    const stripePaymentId = `ch_${Math.random().toString(36).substring(2, 11)}`;
    const clientSecret = `pi_${Math.random().toString(36).substring(2, 11)}_secret_${Math.random().toString(36).substring(2, 6)}`;

    const bookingDocRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingDocRef, { stripe_payment_id: stripePaymentId, total_amount: amount });

    return {
      success: true,
      clientSecret,
      stripePaymentId,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Persists payment status transitions like 'unpaid', 'paid', or 'refunded'.
 */
export async function updatePaymentStatus(
  bookingId: string,
  status: 'unpaid' | 'paid' | 'refunded',
  stripePaymentId?: string
): Promise<any> {
  const path = `bookings/${bookingId}`;
  try {
    const updateData: Record<string, any> = { payment_status: status };
    if (stripePaymentId) {
      updateData.stripe_payment_id = stripePaymentId;
    }

    const bookingDocRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingDocRef, updateData);

    const updatedSnap = await getDoc(bookingDocRef);
    return {
      id: updatedSnap.id,
      ...updatedSnap.data()
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Pulls detailed historic receipt details.
 */
export async function generateReceipt(bookingId: string): Promise<{
  receiptNumber: string;
  issuedAt: string;
  bookingId: string;
  amount: number;
  paymentStatus: string;
}> {
  const path = `bookings/${bookingId}`;
  try {
    const bookingDocRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingDocRef);

    if (!bookingSnap.exists()) {
      throw new Error('Booking not found for receipt generation');
    }

    const booking = bookingSnap.data();

    return {
      receiptNumber: `REC-${bookingId.substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`,
      issuedAt: new Date().toISOString(),
      bookingId,
      amount: booking.total_amount,
      paymentStatus: booking.payment_status,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.GET, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Retrieves payment history records for the relative.
 */
export async function getPaymentHistory(relativeId: string): Promise<any[]> {
  const path = 'bookings';
  try {
    const q = query(
      collection(db, 'bookings'),
      where('relative_id', '==', relativeId)
    );

    const snapshot = await getDocs(q);
    const bookings: any[] = [];

    snapshot.forEach((docSnap) => {
      bookings.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return bookings.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
