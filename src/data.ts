/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Caregiver, ElderProfile, Booking } from './types';

export const DHAKA_LOCATIONS = [
  'Banani',
  'Gulshan',
  'Dhanmondi',
  'Uttara',
  'Mirpur',
  'Mohammadpur',
  'Bashundhara',
  'Badda'
];

export const CARE_TYPES = [
  'Daily Companionship',
  'Dementia Care',
  'Post-operative Recovery',
  'Physiotherapy & Mobility',
  'Overnight Care',
  'Diabetes Maintenance'
];

export const MOCK_CAREGIVERS: Caregiver[] = [
  {
    id: 'cg_1',
    name: 'Rebecca Sultana',
    age: 34,
    gender: 'Female',
    location: 'Gulshan',
    experience: 8,
    rating: 4.9,
    reviewsCount: 37,
    ratePerHour: 350, // ৳350/hr
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Dementia Care', 'Daily Companionship', 'Diabetes Maintenance'],
    languages: ['Bangla', 'English'],
    bio: 'Dedicated senior nurse with 8 years of specialized geriatric care experience at Apollo/Evercare Hospital. Warm, empathetic, and expert at managing cognitive health programs and diabetic dietary plans.',
    certification: 'BS in Nursing (DU), Certified Dementia Specialist',
    available: true
  },
  {
    id: 'cg_2',
    name: 'Dr. Rafid Ahmed',
    age: 29,
    gender: 'Male',
    location: 'Dhanmondi',
    experience: 5,
    rating: 4.8,
    reviewsCount: 24,
    ratePerHour: 400, // ৳400/hr
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Physiotherapy & Mobility', 'Post-operative Recovery'],
    languages: ['Bangla', 'English', 'Hindi'],
    bio: 'Licensed physiotherapist who graduated from the National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR). Highly committed to assisting elderly patients with strokes, post-surgery physical rehab, and gait correction.',
    certification: 'Bachelor of Physiotherapy (NITOR), Senior Rehab Fellow',
    available: true
  },
  {
    id: 'cg_3',
    name: 'Rowshan Ara Begum',
    age: 42,
    gender: 'Female',
    location: 'Uttara',
    experience: 12,
    rating: 4.95,
    reviewsCount: 58,
    ratePerHour: 300, // ৳300/hr
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Daily Companionship', 'Dementia Care'],
    languages: ['Bangla'],
    bio: 'Affectionately known as "Rowshan Apa" by many prominent Uttara families. Specializes in assisting bedridden elderly relatives, grooming assistance, medication tracking, and preparing heart-healthy high-nutrition traditional meals.',
    certification: 'Senior Care Ministry Vetted, Geriatric Care Diploma (Dhaka)',
    available: true
  },
  {
    id: 'cg_4',
    name: 'Tamim Bin Shariar',
    age: 31,
    gender: 'Male',
    location: 'Mohammadpur',
    experience: 6,
    rating: 4.7,
    reviewsCount: 19,
    ratePerHour: 280, // ৳280/hr
    photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Post-operative Recovery', 'Diabetes Maintenance'],
    languages: ['Bangla', 'English'],
    bio: 'Diligent clinical assistant with extensive trauma and ICU-support credentials. Energetic, soft-spoken, and highly precise in monitoring respiratory equipment, blood sugar logs, and medication management schedules.',
    certification: 'Diploma in Medical Assistant (MATS), Red Crescent Veteran',
    available: true
  },
  {
    id: 'cg_5',
    name: 'Farzana Yesmin',
    age: 36,
    gender: 'Female',
    location: 'Banani',
    experience: 9,
    rating: 4.9,
    reviewsCount: 42,
    ratePerHour: 380, // ৳380/hr
    photoUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Dementia Care', 'Physiotherapy & Mobility', 'Overnight Care'],
    languages: ['Bangla', 'English'],
    bio: 'Compassionate licensed nurse specializing in overnight monitoring and advanced Alzheimer support. Experienced at building cognitive stimulation activities and supporting elders through sleep pattern disruptions.',
    certification: 'Diploma in Nursing Science and Midwifery (SBA), NIH Aged Care Cert',
    available: true
  },
  {
    id: 'cg_6',
    name: 'Arifur Rahman',
    age: 28,
    gender: 'Male',
    location: 'Mirpur',
    experience: 4,
    rating: 4.6,
    reviewsCount: 11,
    ratePerHour: 250, // ৳250/hr
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200',
    specialties: ['Daily Companionship', 'Diabetes Maintenance'],
    languages: ['Bangla'],
    bio: 'Very courteous and patient caregiver who loves giving company and talking to elderly uncles and grandfathers. Dedicated to accompanying relatives to hospital visits, helping with walks, reading newspapers, and active insulin monitoring.',
    certification: 'Adult Healthcare Training (BIRDEM Certified)',
    available: true
  }
];

export const INITIAL_ELDER_PROFILES: ElderProfile[] = [
  {
    id: 'elder_1',
    name: 'Khandaker Rafiqul Islam',
    age: 82,
    dob: '1944-04-12',
    gender: 'Male',
    phoneNumber: '+8801711223344',
    address: 'House 42, Road 11A, Dhanmondi R/A',
    location: 'Dhanmondi',
    latitude: 23.7461,
    longitude: 90.3742,
    medicalConditions: ['Type-2 Diabetes', 'Mild Osteoarthritis'],
    allergies: 'None',
    mobilityLevel: 'Assisted Walking',
    emergencyContactName: 'Ameera Islam (Daughter)',
    emergencyContactPhone: '01712345678',
    keyInstructions: 'Needs assistance with afternoon walks and insulin administration. Please read the Daily Ittefaq newspaper aloud in English or Bangla.'
  },
  {
    id: 'elder_2',
    name: 'Jahanara Akhter',
    age: 76,
    dob: '1950-08-23',
    gender: 'Female',
    phoneNumber: '+8801815556677',
    address: 'Flat 4B, Concord Heights, Road 27, Banani',
    location: 'Banani',
    latitude: 23.7925,
    longitude: 90.4078,
    medicalConditions: ["Alzheimer's (Early Stage)", 'Hypertension'],
    allergies: 'Peanuts, Penicillin',
    mobilityLevel: 'Independent',
    emergencyContactName: 'Dr. Tariq Zaman (Son)',
    emergencyContactPhone: '01898765432',
    keyInstructions: 'Requires soft, memory-stretching conversations. Takes high-blood pressure pills after breakfast (8:30 AM). Prefers walking inside the Banani park.'
  },
  {
    id: 'elder_3',
    name: 'Alim Al Razi',
    age: 69,
    dob: '1957-01-30',
    gender: 'Male',
    phoneNumber: '+8801914445588',
    address: 'House 14, Sector 4, Uttara',
    location: 'Uttara',
    latitude: 23.8680,
    longitude: 90.4000,
    medicalConditions: ['Post-stroke Weakness', 'Chronic Kidney Disease'],
    allergies: 'Sulfa Drugs',
    mobilityLevel: 'Wheelchair Bound',
    emergencyContactName: 'Nadia Razi (Wife)',
    emergencyContactPhone: '01912444555',
    keyInstructions: 'Needs assistance transferring from bed to wheelchair. Gentle passive range of motion exercises for right arm twice daily. Monitor blood pressure before dinner.'
  }
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'book_1',
    caregiverId: 'cg_1',
    elderProfileId: 'elder_2',
    startDate: '2026-06-03',
    endDate: '2026-06-05',
    hoursPerDay: 4,
    totalCost: 4200, // 350 * 4 * 3 = 4200
    status: 'Confirmed',
    notes: 'Please support my mother with daily meals and morning medicine. Highly excited to have Rebecca Sultana with us.',
    createdAt: '2026-06-01T10:00:00Z',
    reportStatus: {
      medicineSupplied: true,
      mealsTaken: true,
      exerciseDone: false,
      sleepHours: 7,
      activityNotes: 'Begum Sahiba had a very peaceful night. She was responsive and took her morning tea cheerfully.'
    }
  }
];
