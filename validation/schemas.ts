import { z } from 'zod';

// =========================================
// 1. SHARED ENUMS
// =========================================

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

// =========================================
// 2. CREATE ZOD SCHEMAS
// =========================================

/**
 * Auth Validation Schema: email, password, confirmPassword (must match)
 */
export const authSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

/**
 * Elder Validation Schema: full_name (req), age (0-130), latitude (-90 to 90), longitude (-180 to 180),
 * phone & emergency_contact_phone (validate Bangladesh format patterns starting with +880 or 01),
 * city (defaults to 'Dhaka' if omitted)
 */
export const elderSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  age: z.number().int().min(0, "Age must be between 0 and 130").max(130, "Age must be between 0 and 130"),
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").optional().nullable(),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").optional().nullable(),
  phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladesh phone number format. Must start with +880 or 01"),
  emergency_contact_phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Invalid Bangladesh phone number format. Must start with +880 or 01"),
  city: z.string().optional().default('Dhaka')
});

/**
 * Booking Validation Schema: elder_id, caregiver_id, start_time, end_time (end_time > start_time),
 * hours (>0, must match time difference)
 */
export const bookingSchema = z.object({
  elder_id: z.string().min(1, "Elder ID is required"),
  caregiver_id: z.string().min(1, "Caregiver ID is required"),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start_time format"
  }),
  end_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end_time format"
  }),
  hours: z.number().positive("Hours must be greater than 0")
}).refine((data) => {
  const start = new Date(data.start_time).getTime();
  const end = new Date(data.end_time).getTime();
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["end_time"]
}).refine((data) => {
  const start = new Date(data.start_time).getTime();
  const end = new Date(data.end_time).getTime();
  const calculatedHours = (end - start) / (1000 * 60 * 60);
  return Math.abs(calculatedHours - data.hours) < 0.01;
}, {
  message: "Hours must match the difference between start_time and end_time",
  path: ["hours"]
});

/**
 * Payment Validation Schema: hourly_rate, service_fee, total_amount (all >= 0)
 */
export const paymentSchema = z.object({
  hourly_rate: z.number().min(0, "Hourly rate must be greater than or equal to 0"),
  service_fee: z.number().min(0, "Service fee must be greater than or equal to 0"),
  total_amount: z.number().min(0, "Total amount must be greater than or equal to 0")
});

/**
 * Review Validation Schema: rating (int 1-5), comment string
 */
export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z.string()
});

// =========================================
// 3. EXPORT INFERRED TYPES
// =========================================

export type AuthInput = z.infer<typeof authSchema>;
export type ElderInput = z.infer<typeof elderSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
