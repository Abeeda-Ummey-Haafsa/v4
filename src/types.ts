/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Caregiver {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  location: string; // Realistic Dhaka locations, e.g., Banani, Gulshan, Dhanmondi
  experience: number; // Years of experience
  rating: number;
  reviewsCount: number;
  ratePerHour: number; // in BDT ৳
  photoUrl: string;
  specialties: string[];
  languages: string[];
  bio: string;
  certification: string;
  available: boolean;
  distance?: any;
}

export interface ElderProfile {
  id: string;
  name: string;
  age: number;
  dob?: string;
  gender: 'Male' | 'Female';
  phoneNumber?: string;
  address?: string;
  location: string; // Realistic Dhaka locations, e.g., Banani, Gulshan, Dhanmondi
  latitude?: number;
  longitude?: number;
  medicalConditions: string[];
  allergies?: string;
  mobilityLevel?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  keyInstructions: string; // Additional Notes
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  caregiverId: string;
  elderProfileId: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  totalCost: number; // in BDT ৳
  status: BookingStatus;
  notes: string;
  createdAt: string;
  paymentStatus?: string;
  reviewId?: string;
  reviewRating?: number;
  reviewText?: string;
  reviewDate?: string;
  // Live care report details
  reportStatus?: {
    medicineSupplied: boolean;
    mealsTaken: boolean;
    exerciseDone: boolean;
    sleepHours: number;
    activityNotes: string;
  };
}

export interface SearchFilters {
  location: string;
  careType: string;
  gender: 'All' | 'Male' | 'Female';
}

export type AppView = 'home' | 'search' | 'bookings' | 'elder-profiles' | 'login' | 'register' | 'caregiver-portal';

export const isValidCaregiverEmail = (email: string): boolean => {
  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail.includes('@')) return false;
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (domain === 'student.edu.bd' || domain === 'edu.bd') return false;
  if (!domain.endsWith('.student.edu.bd')) return false;
  const subparts = domain.replace('.student.edu.bd', '').split('.');
  return subparts.length > 0 && subparts[0] !== '';
};
