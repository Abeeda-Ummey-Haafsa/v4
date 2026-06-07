// =========================================
// CAREBRIDGE BACKEND TYPES
// Aligned with Supabase PostgreSQL Schema
// =========================================

/**
 * User Roles in CareBridge
 */
// export type UserRole = 'relative' | 'admin';

import { BookingStatus, PaymentStatus } from './schemas';
export { BookingStatus, PaymentStatus };

/**
 * Mobility levels for elders
 */
export type MobilityLevel = 'independent' | 'assisted' | 'dependent';

// =========================================
// USER (RELATIVE + ADMIN)
// =========================================

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  password_hash: string | null;
  created_at: string;
}

/**
 * User data for creation/registration
 */
export interface CreateUserInput {
  full_name: string;
  email: string;
  phone?: string;
  password?: string;
}

/**
 * User data for updates
 */
export interface UpdateUserInput {
  full_name?: string;
  email?: string;
  phone?: string;
}

// =========================================
// ELDER
// =========================================

export interface Elder {
  id: string;
  relative_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  medical_conditions: string | null;
  allergies: string | null;
  mobility_level: MobilityLevel | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
}

/**
 * Elder data for creation
 */
export interface CreateElderInput {
  relative_id: string;
  full_name: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  area?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  medical_conditions?: string;
  allergies?: string;
  mobility_level?: MobilityLevel;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

/**
 * Elder data for updates
 */
export interface UpdateElderInput {
  full_name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  area?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  medical_conditions?: string;
  allergies?: string;
  mobility_level?: MobilityLevel;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// =========================================
// CAREGIVER
// =========================================

export interface Caregiver {
  id: string;
  full_name: string;
  phone: string | null;
  area: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  hourly_rate: number;
  rating: number;
  experience_years: number | null;
  expertise: string | null;
  bio: string | null;
  is_available: boolean;
  created_at: string;
  distance?: any;
}

/**
 * Caregiver data for creation (admin only)
 */
export interface CreateCaregiverInput {
  full_name: string;
  phone?: string;
  area?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  hourly_rate: number;
  rating?: number;
  experience_years?: number;
  expertise?: string;
  bio?: string;
  is_available?: boolean;
}

/**
 * Caregiver data for updates
 */
export interface UpdateCaregiverInput {
  full_name?: string;
  phone?: string;
  area?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  hourly_rate?: number;
  rating?: number;
  experience_years?: number;
  expertise?: string;
  bio?: string;
  is_available?: boolean;
}

/**
 * Caregiver response with calculated distance (for search results)
 */
export interface CaregiverWithDistance extends Caregiver {
  distance: number;
}

// =========================================
// BOOKING
// =========================================

export interface Booking {
  id: string;
  relative_id: string;
  elder_id: string;
  caregiver_id: string | null;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  hourly_rate: number;
  service_fee: number;
  total_amount: number;
  status: BookingStatus;
  care_instructions: string | null;
  payment_status: PaymentStatus;
  stripe_payment_id: string | null;
  created_at: string;
  review_id?: string;
  reviewRating?: number;
  reviewText?: string;
  reviewDate?: string;
}

/**
 * Booking data for creation
 */
export interface CreateBookingInput {
  relative_id: string;
  elder_id: string;
  caregiver_id?: string;
  start_time: string;
  end_time: string;
  hours: number;
  hourly_rate: number;
  service_fee?: number;
  total_amount: number;
  care_instructions?: string;
}

/**
 * Booking data for updates
 */
export interface UpdateBookingInput {
  caregiver_id?: string;
  start_time?: string;
  end_time?: string;
  hours?: number;
  hourly_rate?: number;
  service_fee?: number;
  total_amount?: number;
  status?: BookingStatus;
  care_instructions?: string;
  payment_status?: PaymentStatus;
  stripe_payment_id?: string;
}

/**
 * Booking with related data for display
 */
export interface BookingWithDetails extends Booking {
  relative?: User;
  elder?: Elder;
  caregiver?: Caregiver;
}

// =========================================
// BOOKING SNAPSHOT (HISTORY)
// =========================================

export interface BookingSnapshot {
  id: string;
  booking_id: string;
  elder_name: string | null;
  elder_address: string | null;
  elder_medical_conditions: string | null;
  caregiver_name: string | null;
  caregiver_expertise: string | null;
  hourly_rate: number | null;
  created_at: string;
}

/**
 * Booking snapshot data for creation
 */
export interface CreateBookingSnapshotInput {
  booking_id: string;
  elder_name?: string;
  elder_address?: string;
  elder_medical_conditions?: string;
  caregiver_name?: string;
  caregiver_expertise?: string;
  hourly_rate?: number;
}

// =========================================
// REVIEW
// =========================================

export interface Review {
  id: string;
  booking_id: string;
  caregiver_id: string;
  relative_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * Review data for creation
 */
export interface CreateReviewInput {
  booking_id: string;
  caregiver_id: string;
  relative_id: string;
  rating: number;
  comment?: string;
}

/**
 * Review data for updates
 */
export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

/**
 * Review with caregiver and relative details
 */
export interface ReviewWithDetails extends Review {
  caregiver?: Caregiver;
  relative?: User;
}

// =========================================
// API REQUEST/RESPONSE TYPES
// =========================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  error?: string;
}

/**
 * Search filters for caregivers
 */
export interface CaregiverSearchFilters {
  area?: string;
  max_distance_km?: number;
  min_rating?: number;
  max_hourly_rate?: number;
  expertise?: string;
  is_available?: boolean;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
}

// =========================================
// ERROR TYPES
// =========================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// =========================================
// VALIDATION SCHEMAS & INFERRED TYPES
// =========================================
export {
  authSchema,
  elderSchema,
  bookingSchema,
  paymentSchema,
  reviewSchema,
} from './schemas';

export type {
  AuthInput,
  ElderInput,
  BookingInput,
  PaymentInput,
  ReviewInput,
} from './schemas';

// =========================================
// SERVICE RESPONSE WRAPPER
// =========================================
export type ServiceResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
