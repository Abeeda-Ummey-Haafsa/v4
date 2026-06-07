import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { Booking, BookingStatus } from '../types/index';
import { reviewSchema } from '../types/schemas';
import { MOCK_BOOKINGS } from '../data';

export async function createBooking(data: {
  relative_id: string;
  elder_id: string;
  caregiver_id: string;
  hours: number;
  care_instructions?: string;
  start_time?: string;
  end_time?: string;
}): Promise<Booking> {
  const path = 'bookings';
  try {
    // 1. Fetch elder details for snapshots
    const elderDocRef = doc(db, 'elders', data.elder_id);
    const elderSnap = await getDoc(elderDocRef);
    if (!elderSnap.exists()) {
      throw new Error('Elder not found');
    }
    const elderData = elderSnap.data();

    // 2. Fetch caregiver details
    const caregiverDocRef = doc(db, 'caregivers', data.caregiver_id);
    const caregiverSnap = await getDoc(caregiverDocRef);
    if (!caregiverSnap.exists()) {
      throw new Error('Caregiver not found');
    }
    const caregiverData = caregiverSnap.data();

    const hourly_rate = caregiverData.hourly_rate;
    const service_fee = 100;
    const total_amount = data.hours * hourly_rate + service_fee;

    const bookingDocRef = doc(collection(db, 'bookings'));

    const insertData: Record<string, unknown> = {
      id: bookingDocRef.id,
      relative_id: data.relative_id,
      elder_id: data.elder_id,
      caregiver_id: data.caregiver_id,
      hours: data.hours,
      hourly_rate,
      service_fee,
      total_amount,
      status: 'confirmed', // Pre-paid checkout is active/confirmed
      payment_status: 'paid', // Simulate pre-paid checkout
      care_instructions: data.care_instructions || null,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      created_at: new Date().toISOString()
    };

    await setDoc(bookingDocRef, insertData);

    // Update caregiver's marketplace availability to OFF immediately
    try {
      const caregiverUpdateRef = doc(db, 'caregivers', data.caregiver_id);
      await updateDoc(caregiverUpdateRef, {
        is_available: false,
        updated_at: new Date().toISOString()
      });
    } catch (updateErr) {
      console.warn("Failed to deactivate caregiver availability upon booking:", updateErr);
    }

    // 3. Create historical booking snapshot
    const snapshotDocRef = doc(collection(db, 'booking_snapshots'));
    const snapshotData = {
      id: snapshotDocRef.id,
      booking_id: bookingDocRef.id,
      elder_name: elderData.full_name || null,
      elder_address: elderData.address || null,
      elder_medical_conditions: elderData.medical_conditions || null,
      caregiver_name: caregiverData.full_name || null,
      caregiver_expertise: caregiverData.expertise || null,
      hourly_rate: caregiverData.hourly_rate || null,
      created_at: new Date().toISOString()
    };

    await setDoc(snapshotDocRef, snapshotData);

    return insertData as any as Booking;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getBookingsByRelative(relativeId: string): Promise<Booking[]> {
  const path = 'bookings';
  try {
    if (!relativeId) {
      throw new Error('Relative ID is required to fetch bookings');
    }

    const q = query(
      collection(db, 'bookings'),
      where('relative_id', '==', relativeId)
    );

    const snapshot = await getDocs(q);
    const bookings: Booking[] = [];

    snapshot.forEach((docSnap) => {
      bookings.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Booking);
    });

    return bookings.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.warn("getBookingsByRelative failed, returning empty list fallback:", error);
    return [];
  }
}

export async function getBookingsByElder(elderId: string): Promise<Booking[]> {
  const path = 'bookings';
  try {
    if (!elderId) {
      throw new Error('Elder ID is required to fetch bookings');
    }

    const q = query(
      collection(db, 'bookings'),
      where('elder_id', '==', elderId)
    );

    const snapshot = await getDocs(q);
    const bookings: Booking[] = [];

    snapshot.forEach((docSnap) => {
      bookings.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Booking);
    });

    return bookings.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    console.warn("getBookingsByElder failed, falling back to mock bookings:", error);
    return MOCK_BOOKINGS.filter(b => b.elderProfileId === elderId).map(b => ({
      id: b.id,
      relative_id: 'dummy_relative_id',
      elder_id: b.elderProfileId,
      caregiver_id: b.caregiverId,
      start_time: b.startDate + 'T09:00:00Z',
      end_time: b.endDate + 'T17:00:00Z',
      hours: b.hoursPerDay * 8,
      hourly_rate: 350,
      service_fee: 100,
      total_amount: b.totalCost,
      status: b.status.toLowerCase() as any,
      payment_status: 'paid',
      care_instructions: b.notes,
      created_at: b.createdAt
    } as any));
  }
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  paymentStatus?: 'unpaid' | 'paid' | 'refunded',
): Promise<Booking> {
  const path = `bookings/${id}`;
  try {
    if (!id) {
      throw new Error('Booking status update requires a booking id');
    }

    // 1. Fetch current status of the booking to enforce valid transitions
    const bookingDocRef = doc(db, 'bookings', id);
    const bookingSnap = await getDoc(bookingDocRef);

    if (!bookingSnap.exists()) throw new Error('Booking not found');
    const currentBooking = bookingSnap.data();

    const currentStatus = currentBooking.status;
    const currentPaymentStatus = currentBooking.payment_status;

    // Status transition authorization checks
    if (status !== currentStatus) {
      if (currentStatus === 'completed') {
        throw new Error('Completed bookings cannot be updated');
      }
      if (currentStatus === 'cancelled') {
        throw new Error('Cancelled bookings cannot be reactivated');
      }

      if (status === 'confirmed' && currentStatus !== 'pending') {
        throw new Error('Only pending bookings can be confirmed');
      }
      if (status === 'completed' && currentStatus !== 'confirmed') {
        throw new Error('Only confirmed bookings can be completed');
      }
      if (status === 'cancelled' && currentStatus !== 'pending' && currentStatus !== 'confirmed') {
        throw new Error('Only pending or confirmed bookings can be cancelled');
      }
    }

    // Payment transition authorization checks
    if (paymentStatus !== undefined && paymentStatus !== currentPaymentStatus) {
      if (paymentStatus === 'refunded' && currentPaymentStatus !== 'paid') {
        throw new Error('Only paid bookings can be refunded');
      }
    }

    const updateData: Record<string, unknown> = { status: status };

    if (paymentStatus !== undefined) {
      updateData.payment_status = paymentStatus;
    }

    await updateDoc(bookingDocRef, updateData);

    const updatedSnap = await getDoc(bookingDocRef);
    return {
      id: updatedSnap.id,
      ...updatedSnap.data()
    } as Booking;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function cancelBooking(id: string): Promise<Booking> {
  try {
    const bookingDocRef = doc(db, 'bookings', id);
    const currentSnap = await getDoc(bookingDocRef);
    const current = currentSnap.data();

    const targetPaymentStatus = current?.payment_status === 'paid' ? 'refunded' : undefined;
    return updateBookingStatus(id, BookingStatus.CANCELLED, targetPaymentStatus);
  } catch {
    return updateBookingStatus(id, BookingStatus.CANCELLED);
  }
}

// =========================================
// REVIEW HELPER METHODS (PART 6)
// =========================================

export async function createReview(data: {
  booking_id: string;
  caregiver_id: string;
  relative_id: string;
  rating: number;
  comment?: string;
}): Promise<any> {
  const path = 'reviews';
  try {
    const parsed = reviewSchema.parse({
      rating: data.rating,
      comment: data.comment || '',
    });

    const reviewsColRef = doc(collection(db, 'reviews'));
    const insertObj = {
      id: reviewsColRef.id,
      booking_id: data.booking_id,
      caregiver_id: data.caregiver_id,
      relative_id: data.relative_id,
      rating: parsed.rating,
      comment: parsed.comment || null,
      created_at: new Date().toISOString()
    };

    await setDoc(reviewsColRef, insertObj);

    // Save the review details directly to the completed booking record
    try {
      const bookingDocRef = doc(db, 'bookings', data.booking_id);
      await updateDoc(bookingDocRef, {
        review_id: reviewsColRef.id,
        review_rating: parsed.rating,
        review_comment: parsed.comment || null,
        review_date: new Date().toISOString()
      });
    } catch (bookingErr) {
      console.warn("Failed to update booking with review details:", bookingErr);
    }

    // Recalculate average rating and reviews count for the caregiver
    await updateCaregiverAverageRating(data.caregiver_id);

    return insertObj;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getCaregiverReviews(caregiverId: string): Promise<any[]> {
  const path = 'reviews';
  try {
    const q = query(
      collection(db, 'reviews'),
      where('caregiver_id', '==', caregiverId)
    );

    const snapshot = await getDocs(q);
    const reviews: any[] = [];

    snapshot.forEach((docSnap) => {
      reviews.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return reviews.sort((a, b) => {
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

export async function updateCaregiverAverageRating(caregiverId: string): Promise<number> {
  const path = `caregivers/${caregiverId}`;
  try {
    const q = query(
      collection(db, 'reviews'),
      where('caregiver_id', '==', caregiverId)
    );

    const snapshot = await getDocs(q);
    const reviews: any[] = [];
    snapshot.forEach((snapDoc) => {
      reviews.push(snapDoc.data());
    });

    let averageRating = 0;
    if (reviews && reviews.length > 0) {
      const total = reviews.reduce((sum, rev) => sum + rev.rating, 0);
      averageRating = Math.round((total / reviews.length) * 10) / 10;
    }

    const caregiverDocRef = doc(db, 'caregivers', caregiverId);
    await updateDoc(caregiverDocRef, { 
      rating: averageRating,
      reviewsCount: reviews.length
    });

    return averageRating;
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function updateReview(data: {
  review_id: string;
  booking_id: string;
  caregiver_id: string;
  rating: number;
  comment?: string;
}): Promise<any> {
  const path = `reviews/${data.review_id}`;
  try {
    const parsed = reviewSchema.parse({
      rating: data.rating,
      comment: data.comment || '',
    });

    const reviewDocRef = doc(db, 'reviews', data.review_id);
    await updateDoc(reviewDocRef, {
      rating: parsed.rating,
      comment: parsed.comment || null,
      updated_at: new Date().toISOString()
    });

    // Update on the booking record too
    try {
      const bookingDocRef = doc(db, 'bookings', data.booking_id);
      await updateDoc(bookingDocRef, {
        review_rating: parsed.rating,
        review_comment: parsed.comment || null,
        review_date: new Date().toISOString()
      });
    } catch (bookingErr) {
      console.warn("Failed to update booking with edited review:", bookingErr);
    }

    // Recalculate caregiver rating and reviewsCount
    await updateCaregiverAverageRating(data.caregiver_id);

    return { id: data.review_id, rating: parsed.rating, comment: parsed.comment };
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function deleteReview(data: {
  review_id: string;
  booking_id: string;
  caregiver_id: string;
}): Promise<void> {
  const path = `reviews/${data.review_id}`;
  try {
    const reviewDocRef = doc(db, 'reviews', data.review_id);
    await deleteDoc(reviewDocRef);

    // Remove from the booking record
    try {
      const bookingDocRef = doc(db, 'bookings', data.booking_id);
      await updateDoc(bookingDocRef, {
        review_rating: deleteField(),
        review_comment: deleteField(),
        review_date: deleteField()
      });
    } catch (bookingErr) {
      console.warn("Failed to remove review from booking:", bookingErr);
    }

    // Recalculate caregiver rating and reviewsCount
    await updateCaregiverAverageRating(data.caregiver_id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
