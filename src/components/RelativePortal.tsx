/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CaregiverAvatar } from './CaregiverAvatar';
import { 
  LayoutDashboard, 
  Users, 
  Search, 
  CalendarDays, 
  Settings, 
  LogOut, 
  MapPin, 
  PlusCircle, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle, 
  Trash2, 
  Edit2, 
  Clock, 
  ClipboardList, 
  CheckCircle2, 
  HeartHandshake, 
  UserCheck, 
  Sliders, 
  ShieldCheck, 
  ArrowRight,
  Info,
  Activity,
  HeartPulse,
  Sparkle,
  PhoneCall,
  User,
  Map,
  Plus,
  Check,
  Star,
  Lock,
  CreditCard
} from 'lucide-react';
import { Booking, Caregiver, ElderProfile, SearchFilters } from '../types';
import { Booking as DBBooking } from '../types/index';
import { DHAKA_LOCATIONS, CARE_TYPES, MOCK_CAREGIVERS } from '../data';
import { CaregiverCard } from './CaregiverCard';
import { BookingForm } from './BookingForm';
import { getRelativeDashboard } from '../services/dashboardService';
import { getElders, createElder, updateElder, deleteElder } from '../services/elderService';
import { getNearbyCaregivers } from '../services/caregiverService';
import { createBooking, getBookingsByRelative, createReview, updateReview, deleteReview } from '../services/bookingService';
import { auth, db, getActiveUserId } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, setDoc, getDocs } from 'firebase/firestore';

interface RelativePortalProps {
  userName: string;
  onLogout: () => void;
  elderProfiles: ElderProfile[];
  setElderProfiles: React.Dispatch<React.SetStateAction<ElderProfile[]>>;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  caregivers: Caregiver[];
  currentView: string;
  setView: (v: any) => void;
  onCancelBooking: (bookingId: string) => void;
}

// Coordinate preset dictionary for auto-filling coordinates on area shift
const COORDINATE_PRESETS: { [key: string]: { lat: number; lng: number } } = {
  'Banani': { lat: 23.7925, lng: 90.4078 },
  'Gulshan': { lat: 23.7925, lng: 90.4194 },
  'Dhanmondi': { lat: 23.7461, lng: 90.3742 },
  'Uttara': { lat: 23.8680, lng: 90.4000 },
  'Mirpur': { lat: 23.8069, lng: 90.3687 },
  'Mohammadpur': { lat: 23.7542, lng: 90.3614 },
  'Badda': { lat: 23.7805, lng: 90.4267 },
  'Lalmatia': { lat: 23.7554, lng: 90.3685 }
};

export const RelativePortal: React.FC<RelativePortalProps> = ({
  userName,
  onLogout,
  elderProfiles,
  setElderProfiles,
  bookings,
  setBookings,
  caregivers = [],
  currentView,
  setView,
  onCancelBooking,
}) => {
  // Navigation tabs of sidebar
  const [activeTab, setActiveTab] = useState<'dashboard' | 'elders' | 'find-caregiver' | 'bookings' | 'settings'>('dashboard');

  // Unique bookings to prevent dashboard and sidebar card duplication
  const uniqueBookings = React.useMemo(() => {
    const seen = new Set<string>();
    return bookings.filter(b => {
      if (!b.id) return true;
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [bookings]);

  // Sub-pages states for Elders tab
  const [elderSubPage, setElderSubPage] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [selectedElder, setSelectedElder] = useState<ElderProfile | null>(null);

  // Elder Profile Form fields
  const [formName, setFormName] = useState('');
  const [formDob, setFormDob] = useState('1950-01-01');
  const [formAge, setFormAge] = useState<number>(76);
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Female');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLocation, setFormLocation] = useState(DHAKA_LOCATIONS[0]);
  const [formLatitude, setFormLatitude] = useState(COORDINATE_PRESETS[DHAKA_LOCATIONS[0]].lat);
  const [formLongitude, setFormLongitude] = useState(COORDINATE_PRESETS[DHAKA_LOCATIONS[0]].lng);
  const [formAllergies, setFormAllergies] = useState('');
  const [formMobilityLevel, setFormMobilityLevel] = useState<'Independent' | 'Assisted Walking' | 'Wheelchair Bound' | 'Bedridden'>('Independent');
  const [formEmergencyName, setFormEmergencyName] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formKeyInstructions, setFormKeyInstructions] = useState('');
  
  // Handlers for medical conditions in the form
  const [formConditions, setFormConditions] = useState<{ [key: string]: boolean }>({
    'Type-2 Diabetes': false,
    'Mild Osteoarthritis': false,
    'Alzheimer\'s (Early Stage)': false,
    'Hypertension': false,
    'Stroke Recovery': false,
    'Chronic Kidney Disease': false,
    'Mobility Issues': false
  });

  // Settings State variables
  const [relativePhone, setRelativePhone] = useState('');
  const [relativeAddress, setRelativeAddress] = useState('');
  const [isBackupGuarantee, setIsBackupGuarantee] = useState(true);
  const [isWhatsappAlerts, setIsWhatsappAlerts] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('None');
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Search/Caregiver marketplace states within portal (Elder-First flow)
  const [searchSelectedElderId, setSearchSelectedElderId] = useState<string>('');
  const [profileSelectedCaregiver, setProfileSelectedCaregiver] = useState<Caregiver | null>(null);
  const [isSearchingLoading, setIsSearchingLoading] = useState<boolean>(false);
  
  // Airbnb style filters
  const [portalFilters, setPortalFilters] = useState<SearchFilters>({
    location: '',
    careType: '',
    gender: 'All'
  });
  const [airbnbMinRating, setAirbnbMinRating] = useState<number>(0);
  const [airbnbMaxRate, setAirbnbMaxRate] = useState<number>(600);
  const [airbnbOnlyAvailable, setAirbnbOnlyAvailable] = useState<boolean>(false);

  const [portalSelectedCaregiver, setPortalSelectedCaregiver] = useState<Caregiver | null>(null);
  const [isSubmittingBookingLocal, setIsSubmittingBookingLocal] = useState(false);
  const [localSuccessBooking, setLocalSuccessBooking] = useState<Booking | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [activeShiftLogs, setActiveShiftLogs] = useState<{id: string, time: string, text: string, created_at?: string}[]>([]);

  const [dashboardStats, setDashboardStats] = useState<{
    totalElders: number;
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    totalSpent: number;
  } | null>(null);

  // Synchronize state with navbar/parent direct view sets
  useEffect(() => {
    if (currentView === 'bookings') {
      setActiveTab('bookings');
    } else if (currentView === 'elder-profiles') {
      setActiveTab('elders');
    }
  }, [currentView]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const uid = getActiveUserId();
        if (uid) {
          const stats = await getRelativeDashboard(uid);
          setDashboardStats(stats);
        } else {
          setDashboardStats({
            totalElders: elderProfiles.length,
            totalBookings: bookings.length,
            upcomingBookings: bookings.filter(b => b.status === "Confirmed").length,
            completedBookings: bookings.filter(b => b.status === "Completed").length,
            totalSpent: bookings.filter(b => b.paymentStatus === "Paid").reduce((sum, b) => sum + b.totalCost, 0)
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };
    fetchDashboardStats();
  }, [bookings, elderProfiles]);

  const fetchEldersList = async () => {
    try {
      const uid = getActiveUserId();
      if (uid) {
        const liveElders = await getElders(uid);
        const mappedElders: ElderProfile[] = liveElders.map((e: any) => ({
          id: e.id,
          name: e.full_name,
          age: e.age ?? 76,
          dob: e.created_at ? e.created_at.split('T')[0] : '1950-01-01',
          gender: (e.gender === 'Male' || e.gender === 'Female') ? e.gender : 'Male',
          phoneNumber: e.phone ?? '',
          address: e.address ?? '',
          location: e.area ?? 'Dhanmondi',
          latitude: e.latitude ?? 23.7461,
          longitude: e.longitude ?? 90.3742,
          medicalConditions: e.medical_conditions ? e.medical_conditions.split(', ') : [],
          allergies: e.allergies ?? 'None',
          mobilityLevel: e.mobility_level === 'independent' ? 'Independent' : e.mobility_level === 'assisted' ? 'Assisted Walking' : 'Wheelchair Bound',
          emergencyContactName: e.emergency_contact_name ?? '',
          emergencyContactPhone: e.emergency_contact_phone ?? '',
          keyInstructions: ''
        }));
        setElderProfiles(mappedElders);
      }
    } catch (err) {
      console.error("Error fetching live elders list:", err);
    }
  };

  const fetchBookingsList = async () => {
    try {
      const uid = getActiveUserId();
      if (uid) {
        const liveBookings = await getBookingsByRelative(uid);
        const mappedBookings: Booking[] = liveBookings.map((b: any) => ({
          id: b.id,
          caregiverId: b.caregiver_id || '',
          elderProfileId: b.elder_id || '',
          startDate: b.start_time ? b.start_time.split('T')[0] : '2026-06-04',
          endDate: b.end_time ? b.end_time.split('T')[0] : '2026-06-05',
          hoursPerDay: b.hours ? Math.round(b.hours) : 4,
          totalCost: b.total_amount || 0,
          notes: b.care_instructions || '',
          status: (b.status === 'active' || b.status === 'Active') ? 'Active' : b.status === 'confirmed' ? 'Confirmed' : b.status === 'completed' ? 'Completed' : b.status === 'cancelled' ? 'Cancelled' : 'Pending',
          createdAt: b.created_at || new Date().toISOString(),
          reviewId: b.review_id,
          reviewRating: b.review_rating,
          reviewText: b.review_comment,
          reviewDate: b.review_date,
          reportStatus: {
            medicineSupplied: b.status === 'completed',
            mealsTaken: true,
            exerciseDone: b.status === 'completed',
            sleepHours: b.status === 'completed' ? 8 : 0,
            activityNotes: b.status === 'completed' ? 'Pre-medication checklists fully ticked.' : 'Caregiver has reviewed the medical profile. Outlining nursing shift schedule.'
          }
        }));
        setBookings(mappedBookings);
      }
    } catch (err) {
      console.error("Error fetching live bookings list:", err);
    }
  };

  const [liveCaregivers, setLiveCaregivers] = useState<Caregiver[]>([]);

  const fetchNearby = async () => {
    if (!searchSelectedElderId) {
      setLiveCaregivers([]);
      return;
    }
    setIsSearchingLoading(true);
    try {
      const reviewsSnap = await getDocs(collection(db, 'reviews'));
      const dbReviews: any[] = [];
      reviewsSnap.forEach(docSnap => {
        dbReviews.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllReviews(dbReviews);

      const result = await getNearbyCaregivers(searchSelectedElderId);
      const mapped: Caregiver[] = result.map((cg: any) => {
        const genderVal = (cg.gender || '').toLowerCase() === 'male' || cg.gender === 'Male' ? 'Male' : 'Female';
        const areaVal = cg.area || cg.location_area || cg.location || 'Dhanmondi';
        const expVal = cg.expertise || cg.speciality || 'Elder Assistant';
        
        const cgReviews = dbReviews.filter(r => r.caregiver_id === cg.id);
        const reviewsCount = cgReviews.length;
        const rating = reviewsCount > 0 
          ? Number((cgReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(1))
          : undefined;

        return {
          id: cg.id,
          name: cg.full_name || cg.name,
          gender: genderVal,
          experience: cg.experience_years ?? cg.experience ?? 5,
          specialty: expVal,
          verification: cg.certification_badge || cg.certification || 'Certified Assistant',
          certification: cg.certification_badge || cg.certification || 'Certified Assistant',
          location: areaVal,
          ratePerHour: cg.hourly_rate ?? cg.ratePerHour ?? 300,
          rating: rating ?? cg.rating ?? 4.8,
          reviewsCount,
          photoUrl: cg.photo_url || cg.photoUrl || `https://images.unsplash.com/photo-${genderVal === 'Male' ? '1500648767791-00dcc994a43e' : '1544005313-94ddf0286df2'}?w=150&auto=format&fit=crop&q=80`,
          available: cg.is_available ?? cg.available ?? true,
          isAvailable: cg.is_available ?? cg.available ?? true,
          latitude: cg.latitude,
          longitude: cg.longitude,
          distance: `${cg.distance?.toFixed(1) || '1.5'} km away`,
          bio: cg.bio || 'Qualified caregiver offering specialized senior assistance and companion care in local sector.',
          specialties: cg.specialties || [expVal]
        } as any;
      });
      setLiveCaregivers(mapped);
    } catch (err) {
      console.error("Error fetching nearby caregivers:", err);
      setLiveCaregivers([]);
    } finally {
      setIsSearchingLoading(false);
    }
  };

  useEffect(() => {
    fetchEldersList();
    fetchBookingsList();
    if (searchSelectedElderId) {
      fetchNearby();
    }

    // 1. Subscribe to 'bookings' table for dynamic state updates
    const uid = getActiveUserId();
    let unsubscribeBookings = () => {};
    if (uid) {
      const qBookings = query(collection(db, 'bookings'), where('relative_id', '==', uid));
      unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
        console.log('Realtime bookings table update:', snapshot.size);
        fetchBookingsList();
      }, (err) => {
        console.warn("Realtime bookings subscription failed:", err);
      });
    }

    // 2. Subscribe to 'reviews' table for real-time rating updates
    const unsubscribeReviews = onSnapshot(collection(db, 'reviews'), (snapshot) => {
      console.log('Realtime reviews table update:', snapshot);
      const reviewsData: any[] = [];
      snapshot.forEach(docSnap => {
        reviewsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllReviews(reviewsData);
      fetchNearby();
    });

    // Cleanup: unsubscribe on unmount
    return () => {
      unsubscribeBookings();
      unsubscribeReviews();
    };
  }, [searchSelectedElderId]);

  const portalActiveBooking = React.useMemo(() => {
    return uniqueBookings.find(b => b.status === 'Active');
  }, [uniqueBookings]);

  useEffect(() => {
    if (!portalActiveBooking) {
      setActiveShiftLogs([]);
      return;
    }
    const qShiftLogs = query(
      collection(db, 'shift_logs'),
      where('booking_id', '==', portalActiveBooking.id)
    );
    const unsubscribeShiftLogs = onSnapshot(qShiftLogs, (snapshot) => {
      const dbLogs: any[] = [];
      snapshot.forEach(docSnap => {
        dbLogs.push({ id: docSnap.id, ...docSnap.data() });
      });
      dbLogs.sort((a, b) => {
        const t1 = a.created_at ? new Date(a.created_at).getTime() : 0;
        const t2 = b.created_at ? new Date(b.created_at).getTime() : 0;
        return t2 - t1; // Newest first
      });
      setActiveShiftLogs(dbLogs);
    }, (error) => {
      console.warn("Failed to subscribe to shift logs in relative portal:", error);
    });

    // Dual-sync same-frame custom event listener for immediate same-page reactivity
    const handleLocalNewLog = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newLog = customEvent.detail;
      if (newLog && newLog.booking_id === portalActiveBooking.id) {
        setActiveShiftLogs(prev => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [newLog, ...prev];
        });
      }
    };

    // Cross-tab storage change listener triggers for side-by-side viewports sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'last_shift_log' && e.newValue) {
        try {
          const newLog = JSON.parse(e.newValue);
          if (newLog && newLog.booking_id === portalActiveBooking.id) {
            setActiveShiftLogs(prev => {
              if (prev.some(l => l.id === newLog.id)) return prev;
              return [newLog, ...prev];
            });
          }
        } catch (err) {
          console.warn("Failed to parse cross-window storage log:", err);
        }
      }
    };

    window.addEventListener('new-shift-log', handleLocalNewLog);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubscribeShiftLogs();
      window.removeEventListener('new-shift-log', handleLocalNewLog);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [portalActiveBooking?.id]);

  // Bookings list history sub-tab state
  const [bookingsActiveTab, setBookingsActiveTab] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');

  // Review & Rating Modal State
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewIsEditing, setReviewIsEditing] = useState<boolean>(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Report Caregiver Modal State
  const [reportingBooking, setReportingBooking] = useState<Booking | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('Unprofessional Behavior');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [isReportSubmitting, setIsReportSubmitting] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Helper: auto-calculate age and preset coordinates on DOB and Location change
  const handleDobChange = (dobStr: string) => {
    setFormDob(dobStr);
    if (dobStr) {
      const birthYear = new Date(dobStr).getFullYear();
      const currentYear = new Date().getFullYear();
      const calculatedAge = currentYear - birthYear;
      setFormAge(calculatedAge > 10 ? calculatedAge : 76);
    }
  };

  const handleLocationChange = (locStr: string) => {
    setFormLocation(locStr);
    const coords = COORDINATE_PRESETS[locStr];
    if (coords) {
      setFormLatitude(coords.lat);
      setFormLongitude(coords.lng);
    }
  };

  const toggleCondition = (cond: string) => {
    setFormConditions(prev => ({ ...prev, [cond]: !prev[cond] }));
  };

  const handleOpenReviewModal = (booking: Booking) => {
    setReviewingBooking(booking);
    setReviewError(null);
    setReviewSuccess(null);
    if (booking.reviewRating !== undefined) {
      setReviewRating(booking.reviewRating);
      setReviewComment(booking.reviewText || '');
      setReviewIsEditing(true);
    } else {
      setReviewRating(5);
      setReviewComment('');
      setReviewIsEditing(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingBooking) return;
    setIsReviewSubmitting(true);
    setReviewError(null);
    try {
      const uid = getActiveUserId();
      if (!uid) throw new Error('You must be logged in to submit a review.');

      if (reviewIsEditing) {
        if (!reviewingBooking.reviewId) {
          throw new Error('Review ID is missing.');
        }
        await updateReview({
          review_id: reviewingBooking.reviewId,
          booking_id: reviewingBooking.id,
          caregiver_id: reviewingBooking.caregiverId,
          rating: reviewRating,
          comment: reviewComment
        });
        setReviewSuccess('Review updated successfully!');
      } else {
        await createReview({
          booking_id: reviewingBooking.id,
          caregiver_id: reviewingBooking.caregiverId,
          relative_id: uid,
          rating: reviewRating,
          comment: reviewComment
        });
        setReviewSuccess('Review submitted successfully!');
      }

      await fetchBookingsList();
      setTimeout(() => {
        setReviewingBooking(null);
        setReviewSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Review submit failed:', err);
      setReviewError(err.message || 'An unexpected error occurred while saving your review.');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (booking: Booking) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      if (!booking.reviewId) {
        throw new Error('Review ID is not found on this booking.');
      }
      await deleteReview({
        review_id: booking.reviewId,
        booking_id: booking.id,
        caregiver_id: booking.caregiverId
      });
      await fetchBookingsList();
    } catch (err: any) {
      console.error('Delete review failed:', err);
      alert(err.message || 'An error occurred while deleting your review.');
    }
  };

  const handleOpenReportModal = (booking: Booking) => {
    setReportingBooking(booking);
    setReportCategory('Unprofessional Behavior');
    setReportDescription('');
    setReportError(null);
    setReportSuccess(null);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingBooking) return;
    if (!reportDescription.trim()) {
      setReportError('Please provide a description of the issue.');
      return;
    }
    setIsReportSubmitting(true);
    setReportError(null);
    try {
      const uid = getActiveUserId();
      if (!uid) throw new Error('You must be logged in to submit a report.');

      // Save report to firestore "reports" collection
      const reportsColRef = doc(collection(db, 'reports'));
      const reportData = {
        id: reportsColRef.id,
        booking_id: reportingBooking.id,
        caregiver_id: reportingBooking.caregiverId,
        reporter_id: uid,
        category: reportCategory,
        description: reportDescription,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      await setDoc(reportsColRef, reportData);

      setReportSuccess('Thank you. Your report has been submitted as reference ID: ' + reportsColRef.id);
      
      setTimeout(() => {
        setReportingBooking(null);
        setReportSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error('Report submission failed:', err);
      setReportError(err.message || 'An unexpected error occurred while submitting your report.');
    } finally {
      setIsReportSubmitting(false);
    }
  };

  // CRUD actions for Elder Profile
  const openAddElderForm = () => {
    setFormName('');
    setFormDob('1950-01-01');
    setFormAge(76);
    setFormGender('Female');
    setFormPhoneNumber('');
    setFormAddress('');
    setFormLocation(DHAKA_LOCATIONS[0]);
    setFormLatitude(COORDINATE_PRESETS[DHAKA_LOCATIONS[0]].lat);
    setFormLongitude(COORDINATE_PRESETS[DHAKA_LOCATIONS[0]].lng);
    setFormAllergies('None');
    setFormMobilityLevel('Independent');
    setFormEmergencyName('');
    setFormEmergencyPhone('');
    setFormKeyInstructions('');
    
    // reset condition checkboxes
    const cleared: { [key: string]: boolean } = {};
    Object.keys(formConditions).forEach(key => cleared[key] = false);
    setFormConditions(cleared);

    setElderSubPage('add');
  };

  const openEditElderForm = (elder: ElderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElder(elder);
    setFormName(elder.name);
    setFormDob(elder.dob || '1950-01-01');
    setFormAge(elder.age);
    setFormGender(elder.gender);
    setFormPhoneNumber(elder.phoneNumber || '');
    setFormAddress(elder.address || '');
    setFormLocation(elder.location);
    setFormLatitude(elder.latitude || COORDINATE_PRESETS[elder.location]?.lat || 23.7925);
    setFormLongitude(elder.longitude || COORDINATE_PRESETS[elder.location]?.lng || 90.4078);
    setFormAllergies(elder.allergies || 'None');
    setFormMobilityLevel((elder.mobilityLevel as any) || 'Independent');
    setFormEmergencyName(elder.emergencyContactName);
    setFormEmergencyPhone(elder.emergencyContactPhone);
    setFormKeyInstructions(elder.keyInstructions);

    // populate condition checkboxes
    const loaded: { [key: string]: boolean } = {};
    Object.keys(formConditions).forEach(key => {
      loaded[key] = elder.medicalConditions.includes(key);
    });
    setFormConditions(loaded);

    setElderSubPage('edit');
  };

  const saveElderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhoneNumber || !formAddress || !formEmergencyName || !formEmergencyPhone) {
      alert('Please fill in all required fields.');
      return;
    }

    const selectedConds = Object.keys(formConditions).filter(k => formConditions[k]);
    const uid = getActiveUserId();

    if (elderSubPage === 'add') {
      if (uid) {
        const createInput = {
          relative_id: uid,
          full_name: formName,
          age: formAge,
          gender: formGender,
          phone: formPhoneNumber,
          address: formAddress,
          area: formLocation,
          latitude: Number(formLatitude),
          longitude: Number(formLongitude),
          medical_conditions: selectedConds.join(', '),
          allergies: formAllergies || 'None',
          mobility_level: formMobilityLevel === 'Independent' ? 'independent' : formMobilityLevel === 'Assisted Walking' ? 'assisted' : 'dependent',
          emergency_contact_name: formEmergencyName,
          emergency_contact_phone: formEmergencyPhone,
        } as any;
        try {
          await createElder(createInput);
          await fetchEldersList();
        } catch (dbErr) {
          console.error("Error creating elder in DB:", dbErr);
          // Fallback
          const newElder: ElderProfile = {
            id: `elder_${Date.now()}`,
            name: formName,
            age: formAge,
            dob: formDob,
            gender: formGender,
            phoneNumber: formPhoneNumber,
            address: formAddress,
            location: formLocation,
            latitude: Number(formLatitude),
            longitude: Number(formLongitude),
            medicalConditions: selectedConds,
            allergies: formAllergies || 'None',
            mobilityLevel: formMobilityLevel,
            emergencyContactName: formEmergencyName,
            emergencyContactPhone: formEmergencyPhone,
            keyInstructions: formKeyInstructions
          };
          setElderProfiles(prev => [newElder, ...prev]);
        }
      } else {
        const newElder: ElderProfile = {
          id: `elder_${Date.now()}`,
          name: formName,
          age: formAge,
          dob: formDob,
          gender: formGender,
          phoneNumber: formPhoneNumber,
          address: formAddress,
          location: formLocation,
          latitude: Number(formLatitude),
          longitude: Number(formLongitude),
          medicalConditions: selectedConds,
          allergies: formAllergies || 'None',
          mobilityLevel: formMobilityLevel,
          emergencyContactName: formEmergencyName,
          emergencyContactPhone: formEmergencyPhone,
          keyInstructions: formKeyInstructions
        };
        setElderProfiles(prev => [newElder, ...prev]);
      }
    } else {
      // Edit
      if (!selectedElder) return;
      if (uid) {
        const updateInput = {
          full_name: formName,
          age: formAge,
          gender: formGender,
          phone: formPhoneNumber,
          address: formAddress,
          area: formLocation,
          latitude: Number(formLatitude),
          longitude: Number(formLongitude),
          medical_conditions: selectedConds.join(', '),
          allergies: formAllergies,
          mobility_level: formMobilityLevel === 'Independent' ? 'independent' : formMobilityLevel === 'Assisted Walking' ? 'assisted' : 'dependent',
          emergency_contact_name: formEmergencyName,
          emergency_contact_phone: formEmergencyPhone,
        } as any;
        try {
          await updateElder(selectedElder.id, updateInput);
          await fetchEldersList();
        } catch (dbErr) {
          console.error("Error updating elder in DB:", dbErr);
          // Fallback
          setElderProfiles(prev => prev.map(item => {
            if (item.id === selectedElder.id) {
              return {
                ...item,
                name: formName,
                age: formAge,
                dob: formDob,
                gender: formGender,
                phoneNumber: formPhoneNumber,
                address: formAddress,
                location: formLocation,
                latitude: Number(formLatitude),
                longitude: Number(formLongitude),
                medicalConditions: selectedConds,
                allergies: formAllergies,
                mobilityLevel: formMobilityLevel,
                emergencyContactName: formEmergencyName,
                emergencyContactPhone: formEmergencyPhone,
                keyInstructions: formKeyInstructions
              };
            }
            return item;
          }));
        }
      } else {
        setElderProfiles(prev => prev.map(item => {
          if (item.id === selectedElder.id) {
            return {
              ...item,
              name: formName,
              age: formAge,
              dob: formDob,
              gender: formGender,
              phoneNumber: formPhoneNumber,
              address: formAddress,
              location: formLocation,
              latitude: Number(formLatitude),
              longitude: Number(formLongitude),
              medicalConditions: selectedConds,
              allergies: formAllergies,
              mobilityLevel: formMobilityLevel,
              emergencyContactName: formEmergencyName,
              emergencyContactPhone: formEmergencyPhone,
              keyInstructions: formKeyInstructions
            };
          }
          return item;
        }));
      }
    }

    setElderSubPage('list');
    setSelectedElder(null);
  };

  const deleteElderProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you absolutely sure you want to delete this elder profile? This decision cannot be reversed.')) {
      try {
        const uid = getActiveUserId();
        if (uid) {
          await deleteElder(id);
          await fetchEldersList();
        } else {
          setElderProfiles(prev => prev.filter(p => p.id !== id));
        }
      } catch (dbErr) {
        console.error("Error deleting elder inside DB:", dbErr);
        // Fallback
        setElderProfiles(prev => prev.filter(p => p.id !== id));
      }
      if (selectedElder?.id === id) {
        setSelectedElder(null);
        setElderSubPage('list');
      }
    }
  };

  const handleElderCardClick = (elder: ElderProfile) => {
    setSelectedElder(elder);
    setElderSubPage('details');
  };

  const handleFindCaregiverForElder = (elder: ElderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchSelectedElderId(elder.id);
    setPortalFilters({
      location: elder.location,
      careType: '',
      gender: 'All'
    });
    setAirbnbMinRating(0);
    setAirbnbMaxRate(1000);
    setAirbnbOnlyAvailable(false);
    setPortalSelectedCaregiver(null);
    setProfileSelectedCaregiver(null);
    setLocalSuccessBooking(null);
    setIsSearchingLoading(true);
    setTimeout(() => setIsSearchingLoading(false), 800);
    setActiveTab('find-caregiver');
  };

  // Booker within portal find-caregiver tab
  const handleSelectCaregiverLocal = (cg: Caregiver) => {
    setPortalSelectedCaregiver(cg);
  };

  const handleBookingConfirmedLocal = async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    setIsSubmittingBookingLocal(true);
    try {
      const uid = getActiveUserId();
      if (uid) {
        const start = new Date(bookingData.startDate);
        const end = new Date(bookingData.endDate);
        const differenceInTime = end.getTime() - start.getTime();
        const daysCount = Math.max(1, Math.ceil(differenceInTime / (1000 * 3600 * 24)) + 1);
        const totalHours = daysCount * bookingData.hoursPerDay;

        // Call the database service layer
        const dbResult = await createBooking({
          relative_id: uid,
          elder_id: bookingData.elderProfileId,
          caregiver_id: bookingData.caregiverId,
          hours: totalHours,
          care_instructions: bookingData.notes,
          start_time: bookingData.startDate + 'T09:00:00Z',
          end_time: bookingData.endDate + 'T17:00:00Z'
        });

        // Map real dbResult fields into the UI layout structure
        const dbResultTyped = dbResult as DBBooking;
        const liveBooking: Booking = {
          id: dbResultTyped.id || `book_${Date.now()}`,
          caregiverId: bookingData.caregiverId,
          elderProfileId: bookingData.elderProfileId,
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          hoursPerDay: bookingData.hoursPerDay,
          totalCost: dbResultTyped.total_amount || bookingData.totalCost,
          notes: bookingData.notes || '',
          status: 'Confirmed',
          createdAt: dbResultTyped.created_at || new Date().toISOString(),
          reportStatus: {
            medicineSupplied: false,
            mealsTaken: true,
            exerciseDone: false,
            sleepHours: 0,
            activityNotes: 'Caregiver has reviewed the medical profile. Outlining nursing shift schedule.'
          }
        };

        setBookings(prev => {
          const filtered = prev.filter(b => b.id !== liveBooking.id);
          return [liveBooking, ...filtered];
        });
        setIsSubmittingBookingLocal(false);
        setLocalSuccessBooking(liveBooking);
        setPortalSelectedCaregiver(null);
        setProfileSelectedCaregiver(null);
      } else {
        // Mock fallback if auth session is missing
        setTimeout(() => {
          const liveBooking: Booking = {
            ...bookingData,
            id: `book_${Date.now()}`,
            status: 'Confirmed',
            createdAt: new Date().toISOString(),
            reportStatus: {
              medicineSupplied: false,
              mealsTaken: true,
              exerciseDone: false,
              sleepHours: 0,
              activityNotes: 'Caregiver has reviewed the medical profile. Outlining nursing shift schedule.'
            }
          };

          setBookings(prev => {
            const filtered = prev.filter(b => b.id !== liveBooking.id);
            return [liveBooking, ...filtered];
          });
          setIsSubmittingBookingLocal(false);
          setLocalSuccessBooking(liveBooking);
          setPortalSelectedCaregiver(null);
          setProfileSelectedCaregiver(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Booking failed in database system:", err);
      // Fallback
      setTimeout(() => {
        const liveBooking: Booking = {
          ...bookingData,
          id: `book_${Date.now()}`,
          status: 'Confirmed',
          createdAt: new Date().toISOString(),
          reportStatus: {
            medicineSupplied: false,
            mealsTaken: true,
            exerciseDone: false,
            sleepHours: 0,
            activityNotes: 'Caregiver has reviewed the medical profile. Outlining nursing shift schedule.'
          }
        };

        setBookings(prev => {
          const filtered = prev.filter(b => b.id !== liveBooking.id);
          return [liveBooking, ...filtered];
        });
        setIsSubmittingBookingLocal(false);
        setLocalSuccessBooking(liveBooking);
        setPortalSelectedCaregiver(null);
        setProfileSelectedCaregiver(null);
      }, 1500);
    }
  };

  // High-fidelity Dhaka neighborhood network matrix for relative distances
  const getCaregiverDistance = (elderLoc: string, cgLoc: string): { text: string; km: number } => {
    if (!elderLoc || !cgLoc) return { text: '1.2 km away', km: 1.2 };
    const eNorm = elderLoc.toLowerCase().trim();
    const cNorm = cgLoc.toLowerCase().trim();
    if (eNorm === cNorm) {
      const hash = (elderLoc.length + cgLoc.length) % 3;
      const km = hash === 0 ? 0.8 : hash === 1 ? 1.2 : 1.5;
      return { text: `${km} km away`, km };
    }
    const key = `${elderLoc}-${cgLoc}`;
    const reverseKey = `${cgLoc}-${elderLoc}`;
    const distances: { [key: string]: number } = {
      'Banani-Gulshan': 1.6,
      'Banani-Dhanmondi': 4.8,
      'Banani-Uttara': 6.2,
      'Banani-Mirpur': 3.9,
      'Banani-Mohammadpur': 4.1,
      'Banani-Bashundhara': 2.7,
      'Banani-Badda': 2.4,

      'Gulshan-Dhanmondi': 5.1,
      'Gulshan-Uttara': 6.7,
      'Gulshan-Mirpur': 4.6,
      'Gulshan-Mohammadpur': 4.9,
      'Gulshan-Bashundhara': 2.5,
      'Gulshan-Badda': 1.2,

      'Dhanmondi-Mohammadpur': 1.8,
      'Dhanmondi-Bashundhara': 9.8,
      'Dhanmondi-Badda': 8.5,
      'Dhanmondi-Uttara': 11.2,
      'Dhanmondi-Mirpur': 5.4,

      'Mohammadpur-Mirpur': 4.1,
      'Mohammadpur-Bashundhara': 8.6,
      'Mohammadpur-Badda': 7.2,

      'Uttara-Mirpur': 7.6,
      'Uttara-Bashundhara': 4.9,
      'Uttara-Badda': 8.9,

      'Bashundhara-Badda': 3.2,
    };

    const km = distances[key] || distances[reverseKey] || 3.5;
    return { text: `${km} km away`, km };
  };

  // Filter and sort caregivers based on selected elder and Airbnb parameters
  const getSortedAndFilteredCaregivers = () => {
    const activeElder = elderProfiles.find(e => e.id === searchSelectedElderId);
    const pool = (liveCaregivers && liveCaregivers.length > 0) ? liveCaregivers : caregivers;
    
    const matches = pool.filter(cg => {
      // 0. Ensure only available and not busy caregivers are displayed
      if (cg.available === false) return false;

      // 1. Area location filter
      const cleanFilterLoc = (portalFilters.location || '').trim().toLowerCase();
      const cleanCgLoc = (cg.location || '').trim().toLowerCase();
      const matchLoc = !cleanFilterLoc || cleanCgLoc.includes(cleanFilterLoc) || cleanFilterLoc.includes(cleanCgLoc);

      // 2. Care category specialty filter
      const matchSpec = !portalFilters.careType || cg.specialties.includes(portalFilters.careType);
      // 3. Gender filter
      const matchGender = portalFilters.gender === 'All' || cg.gender === portalFilters.gender;
      // 4. Airbnb Budget floor & ceiling filter
      const matchRate = cg.ratePerHour <= airbnbMaxRate;
      // 5. Airbnb Star rating filter
      const matchRating = (cg.rating !== undefined ? cg.rating : 4.8) >= airbnbMinRating;
      
      return matchLoc && matchSpec && matchGender && matchRate && matchRating;
    });

    // If an elder is active and we have no live calculated distance inside cg, sort by geographical distance helper
    if (activeElder) {
      return [...matches].sort((a, b) => {
        const distA = a.distance ? parseFloat(a.distance) : getCaregiverDistance(activeElder.location, a.location).km;
        const distB = b.distance ? parseFloat(b.distance) : getCaregiverDistance(activeElder.location, b.location).km;
        return distA - distB;
      });
    }

    return matches;
  };

  const filteredCaregivers = getSortedAndFilteredCaregivers();

  // Calculate dashboard stats
  const totalEldersCount = dashboardStats?.totalElders ?? elderProfiles.length;
  const activeBookingsCount = dashboardStats?.upcomingBookings ?? bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length;
  const completedBookingsCount = dashboardStats?.completedBookings ?? bookings.filter(b => b.status === 'Completed').length;
  const totalSpentSum = dashboardStats?.totalSpent ?? bookings.reduce((acc, b) => acc + (b.paymentStatus === 'Paid' ? b.totalCost : 0), 0);

  return (
    <div id="relative-portal-wrapper" className="min-h-[800px] flex flex-col lg:flex-row bg-slate-50 text-slate-800 rounded-3xl overflow-hidden border border-slate-200 shadow-xl my-4">
      
      {/* LOCAL PORTAL LOADER GRID */}
      {isSubmittingBookingLocal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-fade-in border border-sky-100">
            <div className="relative mx-auto h-20 w-20 flex items-center justify-center bg-sky-50 rounded-full text-sky-500">
              <HeartPulse className="h-10 w-10 text-sky-550 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-slate-900">Scheduling Caregiver</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirming background checks and registering elder clinical history with caregiver reserve.
              </p>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
              <div className="h-full bg-sky-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-[10px] uppercase font-mono font-bold text-sky-600 tracking-wider">
              Dhaka Care Desk Verified
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR PANEL                                    */}
      {/* ======================================================== */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0">
        
        {/* Portal Branding Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-[#fdfdfd] tracking-tight text-base leading-none">
                CareBridge
              </h2>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mt-1">
                Relative Portal
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {/* Dashboard Tab */}
          <button
            id="tab-dashboard-btn"
            onClick={() => { setActiveTab('dashboard'); setLocalSuccessBooking(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            <span>Dashboard</span>
          </button>

          {/* My Elders Tab */}
          <button
            id="tab-elders-btn"
            onClick={() => { setActiveTab('elders'); setElderSubPage('list'); setLocalSuccessBooking(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'elders'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            <span>My Elders</span>
            <span className="ml-auto bg-slate-800 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              {totalEldersCount}
            </span>
          </button>

          {/* Find Caregiver Tab */}
          <button
            id="tab-find-caregiver-btn"
            onClick={() => { setActiveTab('find-caregiver'); setPortalSelectedCaregiver(null); setLocalSuccessBooking(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'find-caregiver'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Search className="h-4.5 w-4.5" />
            <span>Find Caregiver</span>
          </button>

          {/* Bookings Tracker Tab */}
          <button
            id="tab-bookings-btn"
            onClick={() => { setActiveTab('bookings'); setLocalSuccessBooking(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <CalendarDays className="h-4.5 w-4.5" />
            <span>Bookings</span>
            {activeBookingsCount > 0 && (
              <span className="ml-auto bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                {activeBookingsCount}
              </span>
            )}
          </button>

          {/* Settings Tab */}
          <button
            id="tab-settings-btn"
            onClick={() => { setActiveTab('settings'); setLocalSuccessBooking(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Settings className="h-4.5 w-4.5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Relative User footer card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center font-display font-bold text-xs uppercase border border-slate-700">
              {userName.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-slate-200 text-xs truncate leading-none">
                {userName}
              </p>
              <span className="text-[10px] text-slate-500 truncate block mt-1">
                Dhaka Branch Client
              </span>
            </div>
          </div>
          <button
            id="logout-portal-btn"
            onClick={onLogout}
            className="w-full py-2 bg-slate-800 hover:bg-rose-950/65 text-slate-400 hover:text-rose-200 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout Portal</span>
          </button>
        </div>

      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE AREA                                   */}
      {/* ======================================================== */}
      <main className="flex-1 bg-white p-6 sm:p-8 flex flex-col justify-between overflow-x-hidden">
        
        <div>
          {/* Top minimal header line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Relative Workspace active
              </span>
              <h1 className="font-display font-extrabold text-2xl text-slate-950 tracking-tight mt-0.5">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'elders' && 'My Elder Family Members'}
                {activeTab === 'find-caregiver' && 'Verify & Find Caregiver'}
                {activeTab === 'bookings' && 'Live Shift Monitor'}
                {activeTab === 'settings' && 'Portal User Settings'}
              </h1>
            </div>

            {/* <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#f3f7f9] text-sky-750 border border-sky-100 rounded-lg flex items-center gap-1 shrink-0">
                <Clock className="h-3.5 w-3.5 text-sky-500" />
                <span>2026-06-02 UTC</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>LIVE FEED</span>
              </span>
            </div> */}
          </div>

          {/* ========================================================== */}
          {/* TAB CONTENT: 1. DASHBOARD                                  */}
          {/* ========================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Metrics cards row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Metric 1 */}
                <div 
                  id="metric-total-elders"
                  onClick={() => { setActiveTab('elders'); setElderSubPage('list'); }}
                  className="bg-[#fbfcff] hover:bg-sky-50/20 border border-slate-100 hover:border-sky-200 p-5 rounded-2xl shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">
                        Total Registered Elders
                      </span>
                      <p className="text-3xl font-display font-extrabold text-slate-900 mt-2">
                        {totalEldersCount}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <Users className="h-5.5 w-5.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1 font-medium">
                    <span>Manage registered profiles</span>
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>

                {/* Metric 2 */}
                <div 
                  id="metric-upcoming-bookings"
                  onClick={() => setActiveTab('bookings')}
                  className="bg-[#fbfcff] hover:bg-emerald-50/10 border border-slate-100 hover:border-emerald-150 p-5 rounded-xl shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">
                        Upcoming Bookings
                      </span>
                      <p className="text-3xl font-display font-extrabold text-slate-900 mt-2">
                        {activeBookingsCount}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <CalendarDays className="h-5.5 w-5.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1 font-medium">
                    <span>Monitor dynamic active duties</span>
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>

                {/* Metric 3 */}
                <div 
                  id="metric-completed-bookings"
                  onClick={() => setActiveTab('bookings')}
                  className="bg-[#fbfcff] hover:bg-slate-100/50 border border-slate-100 hover:border-slate-300 p-5 rounded-xl shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">
                        Completed Bookings
                      </span>
                      <p className="text-3xl font-display font-extrabold text-slate-900 mt-2">
                        {completedBookingsCount}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <UserCheck className="h-5.5 w-5.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1 font-medium">
                    <span>Review completed nurse logs</span>
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>

                {/* Metric 4 */}
                <div 
                  id="metric-total-spent"
                  className="bg-[#fbfcff] hover:bg-amber-50/10 border border-slate-100 hover:border-amber-200 p-5 rounded-xl shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-slate-450 text-[10px] font-bold uppercase tracking-wider block">
                        Total Amount Spent
                      </span>
                      <p className="text-3xl font-display font-extrabold text-amber-600 mt-2">
                        ৳{totalSpentSum}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-550 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                      <CreditCard className="h-5.5 w-5.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4 flex items-center gap-1 font-medium">
                    <span>Transparent BDT billing</span>
                    <ChevronRight className="h-3 w-3" />
                  </p>
                </div>

              </div>

              {/* Grid: Quick Actions & Recent Bookings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                
                {/* Left panel: Recent Bookings List (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-l-2 border-sky-400 pl-2">
                    Recent Bookings
                  </h3>

                  {uniqueBookings.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center space-y-3">
                      <p className="text-xs text-slate-500">No care shifts booked yet.</p>
                      <button
                        onClick={() => setActiveTab('find-caregiver')}
                        className="text-xs text-sky-500 font-semibold px-3 py-1 bg-white border border-sky-100 rounded-lg shadow-2xs hover:bg-sky-50"
                      >
                        Find Caregiver &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {uniqueBookings.slice(0, 3).map((booking) => {
                        const caregiver = caregivers.find(c => c.id === booking.caregiverId) || 
                                          liveCaregivers.find(c => c.id === booking.caregiverId) || 
                                          (() => {
                                            const match = MOCK_CAREGIVERS.find(c => c.id === booking.caregiverId || c.id + '_seed' === booking.caregiverId);
                                            if (match) {
                                              return {
                                                id: booking.caregiverId,
                                                name: match.name,
                                                photoUrl: match.photoUrl,
                                                certification: match.certification,
                                                experience: match.experience,
                                                rating: match.rating || 4.8
                                              } as any;
                                            }
                                            return {
                                              id: booking.caregiverId,
                                              name: 'Caregiver Assistant',
                                              photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
                                              certification: 'Certified Assistant',
                                              experience: 5,
                                              rating: 4.8
                                            } as any;
                                          })();
                        const elder = elderProfiles.find(e => e.id === booking.elderProfileId) || {
                          id: booking.elderProfileId,
                          name: 'Elder Relative',
                          age: 76,
                          location: 'Dhanmondi',
                          address: 'Dhaka Residence',
                          mobilityLevel: 'Assisted',
                          medicalConditions: ['General Senior Care']
                        };
                        if (!caregiver || !elder) return null;

                        return (
                          <div 
                            key={booking.id}
                            className="bg-white border border-slate-150/60 p-4 rounded-xl shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <CaregiverAvatar
                                gender={caregiver.gender}
                                className="h-10 w-10 rounded-xl"
                                iconClassName="h-5 w-5"
                              />
                              <div>
                                <h4 className="font-display font-bold text-xs text-slate-900">{caregiver.name}</h4>
                                <p className="text-[10px] text-slate-500">Scheduled for <strong>{elder.name}</strong></p>
                                <p className="text-[10px] text-slate-450 mt-1">{booking.startDate} to {booking.endDate} • {booking.hoursPerDay}h/day</p>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-end sm:justify-start justify-between gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                booking.status === 'Confirmed' 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : booking.status === 'Cancelled' 
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {booking.status}
                              </span>
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                ৳{booking.totalCost}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 text-right">
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-xs text-sky-600 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Go to live duty monitoring dashboard</span>
                      <ChevronRight className="h-3.5 w-3.5 text-sky-500" />
                    </button>
                  </div>
                </div>

                {/* Right panel: Quick Actions section (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-l-2 border-sky-400 pl-2">
                    Quick Actions
                  </h3>

                  <div className="bg-[#fbfcff] border border-slate-150/60 rounded-2xl p-5 space-y-3.5 shadow-2xs">
                    
                    {/* Action 1 */}
                    <button
                      id="action-add-elder-btn"
                      onClick={() => { setActiveTab('elders'); openAddElderForm(); }}
                      className="w-full bg-white border border-slate-200/80 p-3 rounded-xl hover:border-sky-305 hover:bg-sky-50/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                    >
                      <div className="h-9 w-9 bg-sky-50 text-sky-500 rounded-lg flex items-center justify-center shrink-0">
                        <PlusCircle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Register Elderly Relative</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Complete condition, allergies & emergency data</p>
                      </div>
                    </button>

                    {/* Action 2 */}
                    <button
                      id="action-find-caregiver-btn"
                      onClick={() => setActiveTab('find-caregiver')}
                      className="w-full bg-white border border-slate-200/80 p-3 rounded-xl hover:border-sky-305 hover:bg-sky-50/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                    >
                      <div className="h-9 w-9 bg-emerald-50 text-emerald-550 rounded-lg flex items-center justify-center shrink-0">
                        <Search className="h-4.5 w-4.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Find & Match Caregivers</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Filter by neighborhood, gender & hourly rates</p>
                      </div>
                    </button>

                    {/* Action 3 */}
                    <button
                      id="action-standby-info"
                      onClick={() => alert('CareBridge dispatch system is active in your zones under (+880) 1800-CBRIDGE.')}
                      className="w-full bg-white border border-slate-200/80 p-3 rounded-xl hover:border-sky-305 hover:bg-sky-50/20 text-left transition-all cursor-pointer flex items-center gap-3.5"
                    >
                      <div className="h-9 w-9 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
                        <PhoneCall className="h-4.5 w-4.5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Emergency 24/7 Hotline</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Direct link to standby medical backup desks</p>
                      </div>
                    </button>

                    {/* Security certification badge */}
                    {/* <div className="bg-slate-50 border border-slate-150/40 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-550 leading-relaxed">
                      <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Backup Insurance Active:</strong> Standby nurse replacement acts as a guarantee during sickness or travel.
                      </span>
                    </div> */}

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB CONTENT: 2. MY ELDERS DIRECTORY                        */}
          {/* ========================================================== */}
          {activeTab === 'elders' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Directory main list subscreen */}
              {elderSubPage === 'list' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border p-4.5 rounded-2xl">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Elder Profile Directory
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Keep profiles updated with conditions, allergies, list coordinates, and instructions to ensure premier caregiver fits.
                      </p>
                    </div>

                    <button
                      id="register-elder-trigger-top"
                      onClick={openAddElderForm}
                      className="px-4.5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Register Elder Need</span>
                    </button>
                  </div>

                  {elderProfiles.length === 0 ? (
                    <div className="bg-white border p-12 rounded-3xl text-center max-w-sm mx-auto space-y-4">
                      <div className="h-12 w-12 rounded-full bg-sky-55/70 text-sky-505 flex items-center justify-center mx-auto">
                        <Users className="h-6 w-6 text-sky-600" />
                      </div>
                      <h3 className="font-display font-semibold text-slate-900">No Profiles Found</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-light">
                        Register your parent, grandparent or aging relative’s clinical history to matches with verified caretakers.
                      </p>
                      <button
                        onClick={openAddElderForm}
                        className="px-4 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-600 transition-colors cursor-pointer"
                      >
                        Register First Profile
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {elderProfiles.map((elder) => (
                        <div
                          key={elder.id}
                          id={`elder-profile-card-${elder.id}`}
                          onClick={() => handleElderCardClick(elder)}
                          className="bg-white border border-slate-200/85 hover:border-sky-305 hover:shadow-xs p-5 rounded-2xl transition-all cursor-pointer flex flex-col justify-between group"
                        >
                          <div className="space-y-4">
                            {/* Card Header name, age, gender */}
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h3 className="font-display font-extrabold text-base text-slate-900 group-hover:text-sky-600 transition-colors">
                                  {elder.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                  {elder.gender} • {elder.age} Years Old (born {elder.dob || '1950'})
                                </p>
                              </div>

                              <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-100 rounded-lg flex items-center gap-0.5 shrink-0">
                                <MapPin className="h-3 w-3 text-sky-550" />
                                <span>{elder.location}</span>
                              </span>
                            </div>

                            {/* Dhaka Address */}
                            <div className="text-xs text-slate-650 space-y-1">
                              <span className="text-slate-450 text-[10px] uppercase font-bold tracking-wider block">Dhaka Address:</span>
                              <p className="font-medium bg-slate-50 p-2 rounded-lg leading-relaxed">{elder.address || 'Not Registered'}</p>
                            </div>

                            {/* Mobility Level */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-xs">
                                <span className="text-slate-450 text-[10px] uppercase font-bold tracking-wider block">Mobility Level:</span>
                                <span className={`inline-block mt-1.5 px-2 py-0.5 font-bold text-[10px] rounded-md ${
                                  elder.mobilityLevel === 'Independent' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : elder.mobilityLevel === 'Assisted Walking'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                    : elder.mobilityLevel === 'Wheelchair Bound'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {elder.mobilityLevel || 'Assisted Walking'}
                                </span>
                              </div>

                              <div className="text-xs">
                                <span className="text-slate-450 text-[10px] uppercase font-bold tracking-wider block">Allergies:</span>
                                <span className="inline-block mt-2 font-semibold text-slate-700 text-[11px] truncate max-w-full">
                                  {elder.allergies || 'None recorded'}
                                </span>
                              </div>
                            </div>

                            {/* Medical Notes Summary */}
                            <div className="text-xs text-slate-650 space-y-1">
                              <span className="text-slate-450 text-[10px] uppercase font-bold tracking-wider block">Medical Conditions & Notes:</span>
                              <p className="text-xs font-light line-clamp-2 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-lg border-l border-slate-205">
                                {elder.keyInstructions ? `"${elder.keyInstructions}"` : '"No special instructions registered."'}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {elder.medicalConditions.map((cond, idc) => (
                                  <span key={idc} className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                    {cond}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Emergency Contacts + actions row */}
                          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                            <div className="text-xs">
                              <span className="text-[9px] text-slate-450 uppercase block">Emergency Liaison</span>
                              <strong className="text-slate-700 font-bold block">{elder.emergencyContactName}</strong>
                              <span className="font-mono text-[10px] text-slate-500 leading-none">{elder.emergencyContactPhone}</span>
                            </div>

                            {/* Row actions */}
                            <div className="flex items-center gap-1.5 ml-auto">
                              {/* Edit btn */}
                              <button
                                id={`edit-elder-btn-${elder.id}`}
                                onClick={(e) => openEditElderForm(elder, e)}
                                className="p-2 text-slate-500 hover:text-sky-600 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-100 rounded-xl transition-all cursor-pointer"
                                title="Edit elder profile details"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Delete btn */}
                              <button
                                id={`delete-elder-btn-${elder.id}`}
                                onClick={(e) => deleteElderProfile(elder.id, e)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-205 hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                                title="Delete elder profile"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                              {/* Find Caregiver btn */}
                              <button
                                id={`find-caregiver-for-elder-${elder.id}`}
                                onClick={(e) => handleFindCaregiverForElder(elder, e)}
                                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[10px] rounded-xl shadow-md hover:shadow-lg hover:scale-102 active:scale-97 transition-all duration-300 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                                title="Find direct match"
                              >
                                <Search className="h-3 w-3 stroke-[2.5]" />
                                <span>Find Caregiver</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Edit or Add Elder Form Subscreen with 14 detailed fields */}
              {(elderSubPage === 'add' || elderSubPage === 'edit') && (
                <div id="elder-form-screen" className="max-w-3xl mx-auto space-y-6 animate-fade-in bg-white border border-slate-100 p-6 sm:p-8 rounded-3xl shadow-sm">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-slate-900">
                        {elderSubPage === 'add' ? 'Register New Elder Needs' : `Edit Profile: ${selectedElder?.name}`}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Please provide all clinical, address, coordinates, and contact details. Vetted standard guidelines.
                      </p>
                    </div>

                    <button
                      onClick={() => setElderSubPage('list')}
                      className="text-xs font-semibold text-slate-500 hover:text-sky-600 cursor-pointer"
                    >
                      &larr; Back to Directory
                    </button>
                  </div>

                  {/* FORM FIELDS */}
                  <form onSubmit={saveElderProfile} className="space-y-6">
                    
                    {/* SECTION 1: PERSONAL INFORMATION */}
                    <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-sky-700 tracking-wider uppercase flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span>Generic Profiles Info</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* 1. Full Name */}
                        <div className="sm:col-span-6 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Full Name <span className="text-rose-500">*</span></label>
                          <input
                            id="form-full-name"
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. Khandaker Rafiqul Islam"
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          />
                        </div>

                        {/* 2. Date of Birth */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Date of Birth <span className="text-rose-500">*</span></label>
                          <input
                            id="form-dob"
                            type="date"
                            required
                            value={formDob}
                            onChange={(e) => handleDobChange(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          />
                        </div>

                        {/* 3. Age calculated */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Calculated Age</label>
                          <div className="bg-slate-100 p-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 border border-slate-205 text-center">
                            {formAge} Years Old
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 4. Gender */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Gender <span className="text-rose-500">*</span></label>
                          <div className="flex gap-2">
                            {['Female', 'Male'].map((genderOption) => (
                              <button
                                key={genderOption}
                                type="button"
                                onClick={() => setFormGender(genderOption as any)}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                                  formGender === genderOption
                                    ? 'bg-sky-50 font-extrabold text-sky-700 border-sky-400'
                                    : 'bg-white text-slate-500 border-slate-200'
                                }`}
                              >
                                {genderOption}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 5. Phone Number of Elder */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Elder Direct Phone Number <span className="text-rose-500">*</span></label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-mono text-slate-400 font-bold">
                              +880
                            </span>
                            <input
                              id="form-phone-number"
                              type="tel"
                              required
                              placeholder="1711223344"
                              value={formPhoneNumber}
                              onChange={(e) => setFormPhoneNumber(e.target.value)}
                              className="w-full pl-13 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-250 rounded-xl focus:border-sky-500 outline-hidden"
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* SECTION 2: ADRESS & AREA COORINDATES */}
                    <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-sky-700 tracking-wider uppercase flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Address & Dhaka Pinpoint Coordinates</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* 6. Residing Area Dropdown */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Dhaka Area <span className="text-rose-500">*</span></label>
                          <select
                            id="form-area"
                            value={formLocation}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          >
                            {DHAKA_LOCATIONS.map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                          </select>
                        </div>

                        {/* 7. Latitude */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Address Latitude (decimal)</label>
                          <input
                            id="form-latitude"
                            type="number"
                            step="0.000001"
                            value={formLatitude}
                            onChange={(e) => setFormLatitude(Number(e.target.value))}
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl font-mono text-slate-700 outline-hidden"
                          />
                        </div>

                        {/* 8. Longitude */}
                        <div className="sm:col-span-4 space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Address Longitude (decimal)</label>
                          <input
                            id="form-longitude"
                            type="number"
                            step="0.000001"
                            value={formLongitude}
                            onChange={(e) => setFormLongitude(Number(e.target.value))}
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl font-mono text-slate-700 outline-hidden"
                          />
                        </div>
                      </div>

                      {/* 9. Dhaka Full Street Address */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Full Home Street Address <span className="text-rose-500">*</span></label>
                        <input
                          id="form-full-address"
                          type="text"
                          required
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          placeholder="e.g. House 42, Road 11A, Dhanmondi R/A, Dhaka-1209"
                          className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                        />
                      </div>

                      {/* Elegant pure state dashboard representation of coordinate mapping pin */}
                      <div className="bg-[#f0f9ff]/55 border border-sky-100 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-sky-850">
                          <span className="flex items-center gap-1.5 text-sky-800">
                            <Map className="h-4 w-4 text-sky-600" />
                            <span>Address with coordinates/map representation:</span>
                          </span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded text-[10px] border border-sky-100 text-sky-700">
                            LAT: {Number(formLatitude).toFixed(4)} , LNG: {Number(formLongitude).toFixed(4)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                          CareBridge map uses those coordinates to automatically guide caregiver emergency transport models and track check-in locations within 50 meters of safety coordinates.
                        </p>
                        <div className="h-16 bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
                          {/* Simulated Radar Grid pattern */}
                          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:10px_10px]" />
                          <div className="relative text-center z-10 px-4">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-450 animate-ping absolute -top-1 -right-1" />
                            <p className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                              <span>Map Center: Pinpoint established at residencies in {formLocation || 'Dhaka'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* SECTION 3: MEDICAL INFORMATION */}
                    <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="text-xs font-bold text-sky-700 tracking-wider uppercase flex items-center gap-1.5">
                        <HeartPulse className="h-3.5 w-3.5" />
                        <span>Medical Information & Needs</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 10. Allergies */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Known Clinical Allergies <span className="text-rose-500">*</span></label>
                          <input
                            id="form-allergies"
                            type="text"
                            required
                            value={formAllergies}
                            onChange={(e) => setFormAllergies(e.target.value)}
                            placeholder="e.g. None Or Peanuts, Penicillin, Dust"
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          />
                        </div>

                        {/* 11. Mobility Level Dropdown */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">Elder Mobility Level <span className="text-rose-500">*</span></label>
                          <select
                            id="form-mobility-level"
                            value={formMobilityLevel}
                            onChange={(e) => setFormMobilityLevel(e.target.value as any)}
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          >
                            <option value="Independent">Independent (Walks without assistance)</option>
                            <option value="Assisted Walking">Assisted Walking (Needs walker or physical guide)</option>
                            <option value="Wheelchair Bound">Wheelchair Bound (Requires manual/electric wheelchair)</option>
                            <option value="Bedridden">Bedridden (Requires complete bed support care)</option>
                          </select>
                        </div>
                      </div>

                      {/* 12. Medical Conditions Checklist */}
                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-slate-700">Diagnosed Health Conditions (Choose applicable)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {Object.keys(formConditions).map((condName) => (
                            <button
                              key={condName}
                              type="button"
                              onClick={() => toggleCondition(condName)}
                              className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 cursor-pointer transition-all ${
                                formConditions[condName]
                                  ? 'bg-sky-50/50 border-sky-200 text-sky-850'
                                  : 'bg-white border-slate-205 text-slate-550'
                              }`}
                            >
                              <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 ${
                                formConditions[condName] ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-350 bg-white'
                              }`}>
                                {formConditions[condName] && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                              </div>
                              <span className="truncate">{condName}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 13. Bedside instructions - keyInstructions */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Additional Notes / Bedside Instructions Summary</label>
                        <textarea
                          id="form-key-instructions"
                          rows={3}
                          value={formKeyInstructions}
                          onChange={(e) => setFormKeyInstructions(e.target.value)}
                          placeholder="Provide custom daily medication timetables, special heart-healthy diets or routine walker exercises..."
                          className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                        />
                      </div>

                    </div>

                    {/* SECTION 4: EMERGENCY CONTACT */}
                    <div className="bg-sky-50/20 p-4.5 rounded-2xl border border-sky-100/60 space-y-4">
                      <h4 className="text-xs font-bold text-sky-800 tracking-wider uppercase flex items-center gap-1.5">
                        <PhoneCall className="h-3.5 w-3.5 text-sky-600" />
                        <span>Emergency Contacts (Always Standby Relatives)</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 13. Emergency Contact Name */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-sky-800">Emergency Liaison Full Name <span className="text-rose-500">*</span></label>
                          <input
                            id="form-emergency-name"
                            type="text"
                            required
                            value={formEmergencyName}
                            onChange={(e) => setFormEmergencyName(e.target.value)}
                            placeholder="e.g. Ameera Islam (Daughter)"
                            className="w-full text-xs sm:text-sm bg-white border border-slate-250 p-2.5 rounded-xl focus:border-sky-500 outline-hidden"
                          />
                        </div>

                        {/* 14. Emergency Contact Number */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-sky-800">Emergency Liaison Phone <span className="text-rose-500">*</span></label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-mono text-slate-450 font-bold">
                              +880
                            </span>
                            <input
                              id="form-emergency-phone"
                              type="tel"
                              required
                              placeholder="1712345678"
                              value={formEmergencyPhone}
                              onChange={(e) => setFormEmergencyPhone(e.target.value)}
                              className="w-full pl-13 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-250 rounded-xl focus:border-sky-500 outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions bar form */}
                    <div className="pt-4 border-t flex justify-end gap-3.5">
                      <button
                        type="button"
                        onClick={() => setElderSubPage('list')}
                        className="px-5 py-2.5 border border-slate-250 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 cursor-pointer"
                      >
                        Cancel Actions
                      </button>

                      <button
                        id="form-submit-save-profile"
                        type="submit"
                        className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-97"
                      >
                        Save Elder Profile &rarr;
                      </button>
                    </div>

                  </form>

                </div>
              )}

              {/* View Elder Details page */}
              {elderSubPage === 'details' && selectedElder && (
                <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                  
                  {/* Back banner button */}
                  <button
                    onClick={() => setElderSubPage('list')}
                    className="text-xs font-semibold text-slate-500 hover:text-sky-650 inline-flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back to Elders Directory Index
                  </button>

                  <div className="bg-white border text-slate-800 rounded-3xl overflow-hidden shadow-xs">
                    {/* Header bar colored banner */}
                    <div className="bg-slate-900 text-slate-100 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                          Verified Elder Medical Card
                        </span>
                        <h3 className="font-display font-extrabold text-2xl tracking-tight text-white mt-1">
                          {selectedElder.name}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          Age {selectedElder.age} Years Old • Resides in <strong>{selectedElder.location} Area</strong>
                        </p>
                      </div>

                      <button
                        id="details-card-find-caregiver"
                        onClick={(e) => handleFindCaregiverForElder(selectedElder, e)}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all self-start sm:self-auto flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Find Matching Caregiver</span>
                      </button>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6.5 text-xs">
                      
                      {/* Grid Profiles, address and emergency contacts */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        
                        {/* Profile metrics */}
                        <div className="space-y-4">
                          <h4 className="font-display font-bold text-slate-900 border-b pb-1.5">
                            Profile & Contacts Address
                          </h4>
                          <div className="space-y-2.5">
                            <div className="flex justify-between">
                              <span className="text-slate-450 uppercase text-[10px] font-bold">Gender:</span>
                              <span className="font-bold text-slate-750">{selectedElder.gender}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-450 uppercase text-[10px] font-bold">Date of Birth:</span>
                              <span className="font-bold text-slate-750">{selectedElder.dob || '1950-01-01'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-450 uppercase text-[10px] font-bold">Residency Phone:</span>
                              <span className="font-mono font-bold text-slate-750">+880 {selectedElder.phoneNumber || 'Not saved'}</span>
                            </div>
                            <div className="space-y-1 pt-1">
                              <span className="text-slate-450 uppercase text-[10px] font-bold block">Residency Address:</span>
                              <p className="bg-slate-50 p-2 rounded-lg leading-relaxed text-slate-700 font-medium">
                                {selectedElder.address || 'Not Registered'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Emergency detail */}
                        <div className="space-y-4">
                          <h4 className="font-display font-bold text-slate-900 border-b pb-1.5">
                            Emergency Contact Liaison
                          </h4>
                          <div className="bg-sky-50/20 p-6 border border-sky-100 rounded-2xl space-y-3">
                            <div>
                              <span className="text-slate-450 uppercase text-[9px] font-bold block">Guardian Name:</span>
                              <strong className="text-slate-900 text-sm font-bold block">{selectedElder.emergencyContactName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-450 uppercase text-[9px] font-bold block">Liaison Mobile Phone:</span>
                              <span className="font-mono text-xs font-bold text-sky-700 bg-white border px-2 py-1 rounded inline-block mt-0.5">
                                +880 {selectedElder.emergencyContactPhone}
                              </span>
                            </div>
                            {/* <p className="text-[10px] text-slate-500 font-light leading-relaxed">
                              Emergency standbys automatically connect to this mobile number on dynamic booking matches or caregiver standby shifts triggers.
                            </p> */}
                          </div>
                        </div>

                      </div>

                      {/* Grid Medical Info */}
                      <div className="space-y-3.5 border-t pt-5">
                        <h4 className="font-display font-bold text-slate-900">
                          Clinical Care Needs & Parameters
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Mobility level */}
                          <div className="bg-slate-50 p-3 rounded-xl border">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block">Assigned Mobility Status:</span>
                            <span className="font-bold text-xs mt-1 inline-block text-slate-800">
                              {selectedElder.mobilityLevel}
                            </span>
                          </div>

                          {/* Allergies */}
                          <div className="bg-slate-50 p-3 rounded-xl border">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block">Known Clinical Allergies:</span>
                            <span className="font-bold text-xs mt-1 inline-block text-rose-700">
                              {selectedElder.allergies || 'None'}
                            </span>
                          </div>

                          {/* Pinpoint Coordinates */}
                          <div className="bg-slate-50 p-3 rounded-xl border">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block">Coordinates Pinpoint:</span>
                            <span className="font-mono font-semibold text-xs mt-1 inline-block text-slate-700">
                              {selectedElder.latitude?.toFixed(4) || '23.7925'}, {selectedElder.longitude?.toFixed(4) || '90.4078'}
                            </span>
                          </div>
                        </div>

                        {/* Diagnostic conditions indicators list */}
                        <div className="space-y-2">
                          <span className="text-slate-450 uppercase text-[10px] font-bold block">Assigned diagnosed conditions:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedElder.medicalConditions.length === 0 ? (
                              <span className="italic text-slate-500 font-light">None recorded (Companionship basis)</span>
                            ) : (
                              selectedElder.medicalConditions.map((cond, cin) => (
                                <span key={cin} className="px-2.5 py-1 bg-sky-50 border border-sky-100 text-sky-850 font-bold text-[10px] rounded-md">
                                  {cond}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Bedside instructions */}
                        <div className="space-y-1 bg-yellow-50/45 p-3.5 border border-yellow-100 rounded-xl">
                          <span className="text-yellow-800 uppercase text-[10px] font-bold tracking-wider block">Bedside Care Instructions:</span>
                          <p className="italic text-slate-700 font-medium leading-relaxed">
                            "{selectedElder.keyInstructions || 'No key bedside instructions registered. Basic daily companionship assistance.'}"
                          </p>
                        </div>
                      </div>

                      {/* Previous Bookings of that elder */}
                      <div className="border-t pt-5 space-y-4">
                        <h4 className="font-display font-bold text-slate-900">
                          Platform previous bookings history
                        </h4>

                        {bookings.filter(b => b.elderProfileId === selectedElder.id).length === 0 ? (
                          <p className="text-xs text-slate-500 font-light">No historical shifts scheduled for this relative on the platform.</p>
                        ) : (
                          <div className="space-y-3.5">
                            {bookings.filter(b => b.elderProfileId === selectedElder.id).map((b) => (
                              <div key={b.id} className="bg-slate-50 p-4.5 rounded-xl border flex justify-between items-center text-xs">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800">Duty shift ID: <span className="font-mono font-medium">{b.id}</span></p>
                                  <p className="text-slate-500 leading-none">Schedule: {b.startDate} to {b.endDate} • {b.hoursPerDay} hours/day</p>
                                </div>

                                <div className="text-right space-y-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                                    {b.status}
                                  </span>
                                  <p className="font-mono font-bold text-slate-850">৳{b.totalCost}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB CONTENT: 3. FIND CAREGIVER                             */}
          {/* ========================================================== */}
          {activeTab === 'find-caregiver' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* If receipt is being displayed (Booking Confirmation Page) */}
              {localSuccessBooking ? (
                <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-fade-in my-4">
                  
                  {/* Receipt header bar */}
                  <div className="bg-emerald-500 text-white p-7 text-center space-y-3.5 relative">
                    <div className="mx-auto h-12 w-12 rounded-full bg-white text-emerald-500 flex items-center justify-center shadow-md animate-bounce">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display font-black text-xl tracking-tight uppercase">Booking Successful!</h3>
                      <p className="text-xs text-emerald-100">Caregiver shift secured and locked cleanly via Stripe</p>
                    </div>
                  </div>

                  {/* Receipt body details */}
                  <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-700">
                    <div className="text-center text-slate-500 pb-3 border-b mb-3">
                      <p className="text-slate-400">Booking Reference ID:</p>
                      <strong className="font-mono text-base text-slate-900 tracking-wider">CBRIDGE-{Math.floor(Math.random() * 89999 + 10000)}-DH</strong>
                      <p className="mt-1 text-[10px] text-slate-400">Card payment processed at {new Date(localSuccessBooking.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                      <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">Care Shift Summaries</h4>
                      
                      <div className="grid grid-cols-2 gap-4 pb-2 text-[11px]">
                        <div>
                          <span className="text-slate-450 uppercase text-[9px] font-bold block">Elder relative</span>
                          <p className="font-extrabold text-slate-800 mt-0.5">
                            {elderProfiles.find(e => e.id === localSuccessBooking.elderProfileId)?.name || 'Elder relative'}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-0.5">Address: {elderProfiles.find(e => e.id === localSuccessBooking.elderProfileId)?.address}</p>
                        </div>

                        <div>
                          <span className="text-slate-450 uppercase text-[9px] font-bold block">Assigned Specialist</span>
                          <p className="font-extrabold text-slate-800 mt-0.5">
                            {caregivers.find(c => c.id === localSuccessBooking.caregiverId)?.name}
                          </p>
                          <p className="text-slate-500 text-[10px] mt-0.5">Contact: Vetted & Direct via Desk</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[11px] border-t pt-3">
                        <div>
                          <span className="text-slate-450 uppercase text-[9px] font-bold block">Reserved Dates</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {localSuccessBooking.startDate} to {localSuccessBooking.endDate}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-450 uppercase text-[9px] font-bold block">Shift Duration</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {localSuccessBooking.hoursPerDay} hours per day
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cost invoice */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between border-b pb-1.5 font-bold">
                        <span>Invoice Charge Details</span>
                        <span>Amount Charged (৳)</span>
                      </div>
                      <div className="flex justify-between text-slate-550 pt-2 font-medium">
                        <span>Caregiver services subtotal</span>
                        <span>৳{localSuccessBooking.totalCost - 100} BDT</span>
                      </div>
                      <div className="flex justify-between text-slate-550 font-medium">
                        <span>Platform secure service fee</span>
                        <span>৳100 BDT</span>
                      </div>
                      <div className="flex justify-between items-end border-t pt-2 mt-2 font-extrabold text-sm text-slate-900">
                        <span>Total Paid (Stripe Auth)</span>
                        <span className="text-[#0ea5e9]">৳{localSuccessBooking.totalCost} BDT</span>
                      </div>
                    </div>

                    {/* Instructions notes backup if provided */}
                    {localSuccessBooking.notes && (
                      <div className="bg-yellow-50/40 p-3.5 rounded-xl border border-yellow-150 leading-relaxed text-slate-700 italic">
                        <strong>My special requests transmission logs:</strong> "{localSuccessBooking.notes}"
                      </div>
                    )}

                    <div className="p-3 bg-sky-50 text-sky-800 rounded-xl leading-relaxed flex gap-2 text-[11px]">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
                      <span>
                        <strong>Important:</strong> Your assigned nurse has reserved their travel coordinates block. They will call you to coordinate the initial meet within 1 hour.
                      </span>
                    </div>

                    {/* Custom confirmation action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => { setLocalSuccessBooking(null); setBookingsActiveTab('Upcoming'); setActiveTab('bookings'); }}
                        className="py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-center cursor-pointer shadow-xs transition-all text-xs"
                      >
                        View My Bookings
                      </button>
                      <button
                        onClick={() => { setLocalSuccessBooking(null); setActiveTab('dashboard'); }}
                        className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-center cursor-pointer transition-all text-xs"
                      >
                        Return to Dashboard
                      </button>
                    </div>
                  </div>

                </div>
              ) : portalSelectedCaregiver ? (
                /* Select caregiver scheduling process form overlay inside tab */
                <div className="space-y-4">
                  <div className="pb-3 border-b flex justify-between items-center">
                    <button
                      onClick={() => setPortalSelectedCaregiver(null)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-1"
                    >
                      &larr; Back to Listings
                    </button>
                    <span className="text-xs text-slate-500">Scheduler Step 2 of 2</span>
                  </div>

                  {/* Upgraded checkout booking form with selected elder */}
                  <BookingForm 
                    caregiver={portalSelectedCaregiver}
                    elder={elderProfiles.find(e => e.id === searchSelectedElderId)!} // Matches selected search elder
                    onCancel={() => setPortalSelectedCaregiver(null)}
                    onBook={handleBookingConfirmedLocal}
                  />
                </div>
              ) : profileSelectedCaregiver ? (
                /* DEDICATED PROFILE PAGE OVERLAY */
                <div className="bg-white border rounded-3xl overflow-hidden shadow-md animate-fade-in">
                  {/* Detailed Profiling Frame */}
                  <div className="relative h-44 bg-gradient-to-tr from-sky-400/90 to-blue-500 p-6 flex flex-col justify-end text-white">
                    <button 
                      onClick={() => setProfileSelectedCaregiver(null)}
                      className="absolute top-6 left-6 px-3 py-1.5 bg-black/25 text-white hover:bg-black/40 text-xs font-bold rounded-xl backdrop-blur-xs cursor-pointer transition-all"
                    >
                      &larr; Back to Discovery list
                    </button>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-4">
                        <CaregiverAvatar
                          gender={profileSelectedCaregiver.gender}
                          className="h-20 w-20 rounded-2xl border-4 border-white shadow-md"
                          iconClassName="h-10 w-10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-display font-extrabold text-xl">{profileSelectedCaregiver.name}</h2>
                            <ShieldCheck className="h-5 w-5 text-white fill-sky-600 shrink-0" />
                          </div>
                          <p className="text-xs text-slate-100 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" /> {profileSelectedCaregiver.location}, Dhaka • {profileSelectedCaregiver.experience} Years Experience
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right bg-white/20 px-4 py-2 rounded-2xl border border-white/20 backdrop-blur-xs">
                        <span className="text-[10px] text-sky-100 block font-bold uppercase tracking-wider">Salary Charge</span>
                        <strong className="text-lg font-display font-black">৳{profileSelectedCaregiver.ratePerHour}</strong> <span className="text-xs">/ hour</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Layout details body */}
                  <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 text-slate-700">
                    
                    {/* Left detailed columns (8 cols) */}
                    <div className="md:col-span-8 space-y-6">
                      
                      {/* Biography section */}
                      <div className="space-y-2">
                        <h3 className="font-display font-bold text-slate-900 border-l-2 border-sky-400 pl-2">Vetted Professional Biography</h3>
                        <p className="text-xs leading-relaxed text-slate-600 font-light">
                          {profileSelectedCaregiver.bio}
                        </p>
                        <p className="text-xs leading-relaxed text-slate-600 font-light pt-2">
                          As a fully registered private clinical nurse practicing inside Dhaka, this professional carries background checks verified with National ID logs. They completed certified nursing training standards in geriatric companionship, respiratory assistance, daily insulin therapy management, and passive structural range mobility exercises.
                        </p>
                      </div>

                      {/* Expertise tags */}
                      <div className="space-y-3">
                        <h3 className="font-style font-bold text-slate-950 text-xs uppercase tracking-wide">Areas of Specialty Expertise</h3>
                        <div className="flex flex-wrap gap-2">
                          {profileSelectedCaregiver.specialties.map((spec, i) => (
                            <span key={i} className="px-3 py-1 font-bold text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Languages */}
                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wide">Languages Spoken fluently:</h4>
                        <p className="text-slate-650">Bangla (Native liaison standard), English (Medical and procedural conversational check)</p>
                      </div>

                      {/* Reviews from database */}
                      {(() => {
                        const cgReviews = allReviews.filter(r => r.caregiver_id === profileSelectedCaregiver.id);
                        if (cgReviews.length === 0) {
                          return (
                            <div className="space-y-4 pt-4 border-t">
                              <h3 className="font-display font-bold text-slate-900">Platform Patient Reviews</h3>
                              <p className="text-slate-500 italic text-[11px]">No reviews or ratings yet.</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                              <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
                              <span>Platform Patient Reviews ({cgReviews.length} Verified)</span>
                            </h3>

                            <div className="space-y-3.5">
                              {cgReviews.map((rev, idx) => (
                                <div key={idx} className="bg-slate-50 border p-4 rounded-xl text-xs space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800">{rev.reviewerName || 'Relative Care Liaison'}</span>
                                    <div className="flex items-center gap-0.5 text-amber-400">
                                      <Star className="h-3 w-3 fill-amber-400" />
                                      <span className="text-[10px] font-bold text-slate-700 ml-1">{Number(rev.rating).toFixed(1)}</span>
                                    </div>
                                  </div>
                                  <p className="italic text-slate-600 font-light font-sans">"{rev.comment || 'Outstanding care session.'}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                    {/* Right Sticky CTA columns (4 cols) */}
                    <div className="md:col-span-4 bg-[#f8fbfe] border rounded-2xl p-5 border-slate-200/80 space-y-5 h-fit shadow-3xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black block leading-none">Hourly Compensation</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-display font-black text-slate-900">৳{profileSelectedCaregiver.ratePerHour}</span>
                          <span className="text-xs text-slate-500 font-light">/ hour</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs border-t pt-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dhaka Base sector:</span>
                          <span className="font-bold text-slate-700">{profileSelectedCaregiver.location}</span>
                        </div>
                        {profileSelectedCaregiver.rating && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Rating review average:</span>
                            <span className="font-bold text-slate-700 flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              {Number(profileSelectedCaregiver.rating).toFixed(1)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Standby Replacement:</span>
                          <span className="font-bold text-emerald-600">INCLUDED</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setPortalSelectedCaregiver(profileSelectedCaregiver)}
                        className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-md transition-all active:scale-97 cursor-pointer text-center"
                      >
                        Book Now
                      </button>

                      <p className="text-[9px] text-slate-400 text-center leading-relaxed">Bookings are held securely. You will calculate matching hours on the next step before authorization.</p>
                    </div>

                  </div>

                </div>
              ) : (
                /* Main matching view */
                <div className="space-y-6">
                  
                  {/* STEP 1: ELDER SELECTION REQUIRED CHECK */}
                  {!searchSelectedElderId ? (
                    <div className="bg-white border text-xs max-w-2xl mx-auto rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm">
                      <div className="relative mx-auto h-20 w-20 flex items-center justify-center bg-sky-50 rounded-full text-sky-500">
                        <UserCheck className="h-10 w-10 text-sky-550 shrink-0" />
                      </div>
                      
                      <div className="space-y-2 max-w-md mx-auto">
                        <h3 className="font-display font-black text-lg text-slate-900">Select an Eldercare Passenger</h3>
                        <p className="text-xs text-slate-550 leading-relaxed font-light">
                          To discover matching certified caregivers, please first select which elderly family member centers the residential geographical matchmaking flow in Dhaka.
                        </p>
                      </div>

                      {elderProfiles.length === 0 ? (
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 max-w-md mx-auto space-y-3">
                          <p className="text-xs text-amber-800 font-semibold text-center flex items-center justify-center gap-1.5">
                            <AlertCircle className="h-4.5 w-4.5" />
                            No elder profiles registered in your account.
                          </p>
                          <button
                            onClick={() => { setActiveTab('elders'); openAddElderForm(); }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
                          >
                            + Register Elder Profile Now
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
                          {elderProfiles.map((elder) => (
                            <div 
                              key={elder.id}
                              onClick={() => {
                                setSearchSelectedElderId(elder.id);
                                setPortalFilters({
                                  location: elder.location,
                                  careType: '',
                                  gender: 'All'
                                });
                                setIsSearchingLoading(true);
                                setTimeout(() => setIsSearchingLoading(false), 700);
                              }}
                              className="border border-slate-200 bg-[#fbfcff]/70 hover:bg-sky-50 hover:border-sky-305 p-4 rounded-2xl cursor-pointer transition-all space-y-3"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 text-xs">{elder.name}</h4>
                                <span className="bg-sky-100/60 text-sky-800 text-[9px] font-bold px-2 py-0.5 rounded-md">{elder.location}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 space-y-1">
                                <p>Age: <strong>{elder.age}</strong> yrs old</p>
                                <p className="truncate">Mobility: {elder.mobilityLevel}</p>
                              </div>
                              <button className="w-full py-1.5 bg-sky-500/10 hover:bg-sky-550 hover:text-white text-sky-655 text-[10px] font-bold rounded-lg transition-all text-center">
                                Match Caregivers Centered here
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* STEP 2: SHOW MATCHING DIRECTORY CENTERED AROUND ADDR */
                    <div className="space-y-6">
                      
                      {/* Active Selected Elder Summary Header Card at Top */}
                      <div className="bg-white border rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 bg-sky-100/75 rounded-xl flex items-center justify-center text-sky-600 shrink-0">
                            <UserCheck className="h-5.5 w-5.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600">Geo Match Center:</span>
                              <span className="px-1.5 py-0.2 bg-[#f4f7f9] border text-[9px] font-bold text-slate-500 rounded font-mono">{elderProfiles.find(e => e.id === searchSelectedElderId)?.location} residence</span>
                            </div>
                            <h3 className="font-display font-extrabold text-base text-slate-900 mt-1">
                              {elderProfiles.find(e => e.id === searchSelectedElderId)?.name} • Age {elderProfiles.find(e => e.id === searchSelectedElderId)?.age}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 max-w-xl truncate leading-normal">
                              Address: <strong>{elderProfiles.find(e => e.id === searchSelectedElderId)?.address}</strong> • Mobility: <strong>{elderProfiles.find(e => e.id === searchSelectedElderId)?.mobilityLevel}</strong> • Conditions: <strong>{elderProfiles.find(e => e.id === searchSelectedElderId)?.medicalConditions.join(', ') || 'Companionship'}</strong> • Emergency Contact: <strong>{elderProfiles.find(e => e.id === searchSelectedElderId)?.emergencyContactName} ({elderProfiles.find(e => e.id === searchSelectedElderId)?.emergencyContactPhone})</strong>
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setSearchSelectedElderId('')}
                          className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border text-slate-700 shrink-0 rounded-xl cursor-pointer transition-all active:scale-97"
                        >
                          Change Target Elder
                        </button>
                      </div>

                      {/* Filter Middle section & Grid (Airbnb style columns) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: AIRBNB FILTER SIDEBAR */}
                        <div className="lg:col-span-3 bg-white border rounded-2xl p-5 space-y-5 shadow-3xs sticky top-4">
                          <div className="flex items-center gap-1.5 pb-2 border-b">
                            <Sliders className="h-4.5 w-4.5 text-sky-500" />
                            <h4 className="font-display font-bold text-slate-900 uppercase tracking-wide text-xs">Verified Filters</h4>
                          </div>

                          {/* Filter 1: Specialty Category dropdown */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-600 block uppercase">Geriatric Specialty</label>
                            <select
                              value={portalFilters.careType}
                              onChange={(e) => {
                                setPortalFilters(prev => ({ ...prev, careType: e.target.value }));
                                setIsSearchingLoading(true);
                                setTimeout(() => setIsSearchingLoading(false), 500);
                              }}
                              className="w-full text-xs bg-slate-50 border p-2.5 rounded-xl outline-hidden font-medium"
                            >
                              <option value="">All Specialties</option>
                              {CARE_TYPES.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filter 2: Residing Dhaka Sector dropdown */}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-600 block uppercase">Dhaka Sector Area</label>
                            <select
                              value={portalFilters.location}
                              onChange={(e) => {
                                setPortalFilters(prev => ({ ...prev, location: e.target.value }));
                                setIsSearchingLoading(true);
                                setTimeout(() => setIsSearchingLoading(false), 500);
                              }}
                              className="w-full text-xs bg-slate-50 border p-2.5 rounded-xl outline-hidden font-medium"
                            >
                              <option value="">All Dhaka Sectors</option>
                              {DHAKA_LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filter 3: Budget maximum Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase">
                              <span>Max Hourly Rate</span>
                              <span className="text-sky-600">৳{airbnbMaxRate}/hr</span>
                            </div>
                            <input
                              type="range"
                              min="300"
                              max="1000"
                              step="50"
                              value={airbnbMaxRate}
                              onChange={(e) => {
                                setAirbnbMaxRate(Number(e.target.value));
                                setIsSearchingLoading(true);
                                setTimeout(() => setIsSearchingLoading(false), 400);
                              }}
                              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                            />
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>৳300</span>
                              <span>৳1,000 / hr</span>
                            </div>
                          </div>

                          {/* Filter 4: Star Minimum selector */}
                          <div className="space-y-2 pt-1">
                            <label className="block text-[11px] font-bold text-slate-600 block uppercase">Minimum Star floor</label>
                            <div className="grid grid-cols-4 gap-1">
                              {[0, 4.0, 4.5, 4.8].map((stars) => (
                                <button
                                  key={stars}
                                  type="button"
                                  onClick={() => {
                                    setAirbnbMinRating(stars);
                                    setIsSearchingLoading(true);
                                    setTimeout(() => setIsSearchingLoading(false), 400);
                                  }}
                                  className={`py-1 text-[10px] font-bold rounded-lg border text-center transition-all ${
                                    airbnbMinRating === stars
                                      ? 'bg-sky-500 text-white border-sky-500 shadow-2xs'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {stars === 0 ? 'All' : `${stars}★`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Filter 5: Gender preference */}
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[11px] font-bold text-slate-600 block uppercase">Gender preference</label>
                            <div className="flex p-0.5 bg-slate-100 border rounded-xl">
                              {['All', 'Female', 'Male'].map(g => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => {
                                    setPortalFilters(prev => ({ ...prev, gender: g as any }));
                                    setIsSearchingLoading(true);
                                    setTimeout(() => setIsSearchingLoading(false), 400);
                                  }}
                                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all text-center ${
                                    portalFilters.gender === g
                                      ? 'bg-sky-500 text-white shadow-2xs'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reset filter trigger links */}
                          <button
                            onClick={() => {
                              setPortalFilters({ location: '', careType: '', gender: 'All' });
                              setAirbnbMinRating(0);
                              setAirbnbMaxRate(1000);
                              setIsSearchingLoading(true);
                              setTimeout(() => setIsSearchingLoading(false), 600);
                            }}
                            className="w-full text-center text-xs font-bold text-rose-500 hover:text-rose-600 inline-block pt-1.5 border-t border-slate-100 cursor-pointer"
                          >
                            Reset Custom Filters
                          </button>

                        </div>

                        {/* RIGHT COLUMN: MAIN CONTENT CATALOG PORT/GRID */}
                        <div className="lg:col-span-9 space-y-4">
                          
                          {/* Total Matches Header results */}
                          <div className="flex justify-between items-center bg-slate-100/50 px-4 py-2 rounded-xl text-xs text-slate-500 font-medium">
                            <p>Sorted by dynamic proximity: closest to {elderProfiles.find(e => e.id === searchSelectedElderId)?.name}</p>
                            <p>{filteredCaregivers.length} matches found</p>
                          </div>

                          {/* SKELETON LOADER ANIMATIONS */}
                          {isSearchingLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {[1, 2, 3].map((s) => (
                                <div key={s} className="bg-white border rounded-2xl p-4.5 space-y-4 animate-pulse">
                                  <div className="h-20 bg-slate-200 rounded-xl w-full" />
                                  <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-slate-200 rounded-full shrink-0" />
                                    <div className="space-y-1.5 w-full">
                                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                                      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                                    </div>
                                  </div>
                                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                                  <div className="h-8 bg-slate-200 rounded w-full" />
                                  <div className="flex justify-between gap-2">
                                    <div className="h-8 bg-slate-200 rounded w-1/2" />
                                    <div className="h-8 bg-slate-200 rounded w-1/2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : filteredCaregivers.length === 0 ? (
                            /* SKELETON REFINED EMPTY STATES */
                            <div className="bg-white border text-center p-12 rounded-3xl space-y-4 max-w-sm mx-auto shadow-2xs">
                              <div className="bg-slate-50 text-slate-400 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
                                <Search className="h-6 w-6 text-slate-550" />
                              </div>
                              <div className="space-y-1.5">
                                <h3 className="font-display font-bold text-slate-900 text-sm">No Nearby Caregivers Found</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-light">
                                  We couldn't locate active caregivers in those custom budget or rating thresholds in {elderProfiles.find(e => e.id === searchSelectedElderId)?.location}.
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setPortalFilters({ location: '', careType: '', gender: 'All' });
                                  setAirbnbMinRating(0);
                                  setAirbnbMaxRate(1000);
                                }}
                                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl"
                              >
                                Reset Search Constraints
                              </button>
                            </div>
                          ) : (
                            /* RENDERING CAREGIVER GRID */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {filteredCaregivers.map((cg) => {
                                const activeElder = elderProfiles.find(e => e.id === searchSelectedElderId)!;
                                const distanceText = cg.distance || getCaregiverDistance(activeElder?.location || '', cg.location).text;
                                
                                return (
                                  <CaregiverCard 
                                    key={cg.id}
                                    caregiver={cg}
                                    distance={distanceText}
                                    onViewProfile={(sel) => setProfileSelectedCaregiver(sel)}
                                    onBook={(sel) => setPortalSelectedCaregiver(sel)}
                                  />
                                );
                              })}
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB CONTENT: 4. BOOKINGS Shifts live parameters monitoring */}
          {/* ========================================================== */}
          {activeTab === 'bookings' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Tab selector upcoming, completed, cancelled */}
              <div className="flex border-b border-slate-200">
                {(['Upcoming', 'Completed', 'Cancelled'] as const).map((tab) => {
                  const subset = uniqueBookings.filter(b => {
                    if (tab === 'Upcoming') return b.status === 'Confirmed' || b.status === 'Pending';
                    if (tab === 'Completed') return b.status === 'Completed';
                    return b.status === 'Cancelled';
                  });
                  return (
                    <button
                      key={tab}
                      onClick={() => setBookingsActiveTab(tab)}
                      className={`py-3 px-5 text-xs font-bold transition-all relative ${
                        bookingsActiveTab === tab 
                          ? 'text-sky-650' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab} Shifts History ({subset.length})
                      {bookingsActiveTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Renders filtered category catalog lists */}
              {(() => {
                const results = uniqueBookings.filter(b => {
                  if (bookingsActiveTab === 'Upcoming') return b.status === 'Confirmed' || b.status === 'Pending';
                  if (bookingsActiveTab === 'Completed') return b.status === 'Completed';
                  return b.status === 'Cancelled';
                });

                if (results.length === 0) {
                  return (
                    /* EMPTY STATES POLISHED AS REQUESTED */
                    <div className="bg-white border p-12 text-center rounded-3xl max-w-md mx-auto space-y-4 shadow-3xs animate-fade-in my-6">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                        <CalendarDays className="h-6 w-6 text-slate-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display font-semibold text-slate-900 text-sm">
                          {bookingsActiveTab === 'Upcoming' && 'No Upcoming Duty Shifts Scheduled'}
                          {bookingsActiveTab === 'Completed' && 'No Completed Care Sessions Yet'}
                          {bookingsActiveTab === 'Cancelled' && 'No Cancelled Bookings'}
                        </h3>
                        <p className="text-xs text-slate-550 leading-relaxed font-light">
                          {bookingsActiveTab === 'Upcoming' && "You have no upcoming caregiver shifts active in Dhaka currently. Match certified nurses in Banani, Gulshan, or Dhanmondi."}
                          {bookingsActiveTab === 'Completed' && "No completed care shifts recorded yet. Caregivers publish live clinical reports on shift completions."}
                          {bookingsActiveTab === 'Cancelled' && "No cancelled bookings recorded."}
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('find-caregiver')}
                        className="px-4.5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-2xs"
                      >
                        Explore certified Caregivers
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Columns: list of matching booking cards */}
                    <div className="lg:col-span-7 space-y-4">
                      
                      <div className="space-y-4">
                        {results.map((booking) => {
                          const caregiver = caregivers.find(c => c.id === booking.caregiverId) || 
                                            liveCaregivers.find(c => c.id === booking.caregiverId) || 
                                            (() => {
                                              const match = MOCK_CAREGIVERS.find(c => c.id === booking.caregiverId || c.id + '_seed' === booking.caregiverId);
                                              if (match) {
                                                return {
                                                  id: booking.caregiverId,
                                                  name: match.name,
                                                  photoUrl: match.photoUrl,
                                                  certification: match.certification,
                                                  experience: match.experience,
                                                  rating: match.rating || 4.8
                                                } as any;
                                              }
                                              return {
                                                id: booking.caregiverId,
                                                name: 'Caregiver Assistant',
                                                photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
                                                certification: 'Certified Assistant',
                                                experience: 5,
                                                rating: 4.8
                                              } as any;
                                            })();
                          const elder = elderProfiles.find(e => e.id === booking.elderProfileId) || {
                            id: booking.elderProfileId,
                            name: 'Elder Relative',
                            age: 76,
                            location: 'Dhanmondi',
                            address: 'Dhaka Residence',
                            mobilityLevel: 'Assisted',
                            medicalConditions: ['General Senior Care']
                          };
                          if (!caregiver || !elder) return null;

                          return (
                            <div 
                              key={booking.id}
                              className="bg-white border text-xs p-5 rounded-2xl shadow-3xs hover:border-sky-200 transition-all space-y-4"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-3">
                                  <CaregiverAvatar
                                    gender={caregiver.gender}
                                    className="h-10 w-10 rounded-xl"
                                    iconClassName="h-5 w-5"
                                  />
                                  <div>
                                    <h4 className="font-display font-bold text-slate-900 leading-none">{caregiver.name}</h4>
                                    <p className="text-[9px] text-sky-600 font-bold mt-1 uppercase">{caregiver.certification}</p>
                                  </div>
                                </div>

                                <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                  booking.status === 'Confirmed' 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                    : booking.status === 'Cancelled' 
                                    ? 'bg-rose-50 text-rose-800 border border-rose-100'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl leading-relaxed text-slate-705 font-medium">
                                <div>
                                  <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Resident Elder Name:</span>
                                  <span className="text-slate-800 font-bold">{elder.name}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Assigned Coordinates:</span>
                                  <span className="text-slate-800 font-bold">{elder.location} sector</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Reserved Shift dates:</span>
                                  <span className="text-slate-800 font-bold">{booking.startDate} to {booking.endDate}</span>
                                </div>
                              </div>

                              {booking.notes && (
                                <p className="bg-yellow-50/20 p-2.5 rounded-lg border-l-2 border-yellow-405 text-slate-600">
                                  <strong>My custom requests notes:</strong> "{booking.notes}"
                                </p>
                              )}

                              {/* If completed, we show feedback/reviews details and report actions before the bottom billing row */}
                              {booking.status === 'Completed' && (
                                <div className="border-t border-dashed pt-3.5 space-y-3">
                                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div>
                                      <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Review Submission Status:</span>
                                      {booking.reviewRating !== undefined ? (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase">Review Submitted</span>
                                          <div className="flex items-center text-amber-500 text-[10px]">
                                            {'★'.repeat(booking.reviewRating)}
                                            {'☆'.repeat(5 - booking.reviewRating)}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 mt-0.5 inline-block uppercase animate-pulse">No Review Submitted</span>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      {booking.reviewRating !== undefined ? (
                                        <>
                                          <button
                                            onClick={() => handleOpenReviewModal(booking)}
                                            className="px-2.5 py-1 text-slate-700 hover:bg-slate-105 bg-white border border-slate-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                          >
                                            Edit Review
                                          </button>
                                          <button
                                            onClick={() => handleDeleteReview(booking)}
                                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 bg-white border border-rose-150 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenReviewModal(booking)}
                                          className="px-3 py-1 bg-sky-50 outline-hidden hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <Star className="h-3 w-3 text-sky-500 fill-sky-500" />
                                          Rate Caregiver
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {booking.reviewRating !== undefined && booking.reviewText && (
                                    <div className="bg-slate-50/50 p-2.5 rounded-xl border border-dashed border-slate-200 text-slate-700">
                                      <p className="font-light italic text-[11px]">"{booking.reviewText}"</p>
                                      {booking.reviewDate && (
                                        <span className="text-[9px] text-slate-400 block mt-1 font-light font-mono">Reviewed on: {new Date(booking.reviewDate).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex justify-between items-center border-t pt-3.5 mt-2 bg-slate-50/20 -mx-5 -mb-5 p-4 rounded-b-2xl">
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase block">Total transparent billing cost:</span>
                                  <strong className="text-sm font-black text-slate-900">৳{booking.totalCost} BDT</strong>
                                  <span className="text-[9px] text-slate-400 block font-light">({booking.hoursPerDay}h/day, standby insurance included)</span>
                                </div>

                                {booking.status === 'Confirmed' && (
                                  <button
                                    onClick={() => onCancelBooking(booking.id)}
                                    className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all text-[11px] border border-rose-100 hover:border-rose-200 cursor-pointer"
                                  >
                                    Cancel Booking
                                  </button>
                                )}

                                {booking.status === 'Completed' && (
                                  <button
                                    onClick={() => handleOpenReportModal(booking)}
                                    className="px-3 py-1.5 text-rose-600 bg-white hover:bg-rose-50 rounded-xl font-bold transition-all text-[11px] border border-rose-200 hover:border-rose-300 shadow-3xs cursor-pointer flex items-center gap-1"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                    Report Caregiver
                                  </button>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column Checklist today and real-time report updating (Logs) */}
                    <div className="lg:col-span-5 space-y-4">
                      <h3 className="font-display font-bold text-slate-900 border-l-2 border-sky-400 pl-2">
                        Today's Realtime Shift Logs
                      </h3>

                      {!portalActiveBooking ? (
                        <div className="bg-white border p-6 rounded-2xl text-center space-y-3.5 shadow-3xs animate-fade-in border-slate-200">
                          <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100/50">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-display font-semibold text-slate-800 text-xs text-center border-none">No Active Shift Detected</h4>
                            <p className="text-[10px] text-slate-500 font-light leading-relaxed mt-1 text-center">
                              Once the caregiver starts an active session, real-time logs and hourly clinical updates posted on shift will instantly stream live right here.
                            </p>
                          </div>
                        </div>
                      ) : (() => {
                        const booking = portalActiveBooking;
                        const caregiver = caregivers.find(c => c.id === booking.caregiverId) || 
                                          liveCaregivers.find(c => c.id === booking.caregiverId) || 
                                          (() => {
                                            const match = MOCK_CAREGIVERS.find(c => c.id === booking.caregiverId || c.id + '_seed' === booking.caregiverId);
                                            if (match) {
                                              return {
                                                id: booking.caregiverId,
                                                name: match.name,
                                                photoUrl: match.photoUrl,
                                                certification: match.certification,
                                                experience: match.experience,
                                                rating: match.rating || 4.8
                                              } as any;
                                            }
                                            return {
                                              id: booking.caregiverId,
                                              name: 'Caregiver Assistant',
                                              photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
                                              certification: 'Certified Assistant',
                                              experience: 5,
                                              rating: 4.8
                                            } as any;
                                          })();
                        const elder = elderProfiles.find(e => e.id === booking.elderProfileId) || {
                          id: booking.elderProfileId,
                          name: 'Elder Relative',
                          age: 76,
                          location: 'Dhanmondi',
                          address: 'Dhaka Residence',
                          mobilityLevel: 'Assisted',
                          medicalConditions: ['General Senior Care']
                        };

                        return (
                          <div key={`report-tab-${booking.id}`} className="bg-white border-2 border-blue-200 hover:border-blue-300 p-6 rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs shadow-3xs">
                              <div className="flex items-center gap-1.5 flex-row">
                                <ClipboardList className="h-4.5 w-4.5 text-blue-600 animate-bounce" />
                                <div>
                                  <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-wider">Live Nursing Updates</h4>
                                  <p className="text-[9px] text-slate-550 leading-none mt-0.5 font-bold">Logged by {caregiver.name} today</p>
                                </div>
                              </div>

                              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2.5 py-0.5 rounded-full animate-pulse border border-emerald-150">
                                ACTIVE SHIFT
                              </span>
                            </div>

                            <p className="text-xs text-slate-755">
                              Elder relative: <strong>{elder.name}</strong>, age {elder.age} in {elder.location}.
                            </p>

                            {/* real-time shift logs from database and empty state */}
                            {activeShiftLogs.length === 0 ? (
                              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100/50 text-xs text-slate-400">
                                No shift logs submitted yet for this active session.
                              </div>
                            ) : (
                              <div className="relative pl-3.5 border-l border-sky-200 space-y-4 text-xs">
                                {activeShiftLogs.map((log) => (
                                  <div key={log.id} className="relative">
                                    <div className="absolute -left-[19.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-sky-50 border border-white" />
                                    <div className="space-y-1.5 text-left">
                                      <span className="font-mono text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                                        {log.time}
                                      </span>
                                      <p className="text-slate-700 leading-relaxed font-semibold">{log.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          </div>
                        );
                      })()}

                      {/* Backup nurse detail cards */}
                      <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-md space-y-3.5">
                        <div className="flex gap-2 items-center">
                          <ShieldCheck className="h-5 w-5 text-sky-400" />
                          <h4 className="font-display font-extrabold text-[#fdfdfd] text-xs uppercase tracking-wide">Dhaka Backup Nursing Shield</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                          Our Banani dispatch desk monitors all shifts. If any sudden caregiver absence happens, our standby system deploys emergency substitute shifts under 2 hours automatically.
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB CONTENT: 5. SETTINGS PANEL REPORT                      */}
          {/* ========================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-xl">
              
              <div className="bg-white border text-xs p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
                
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    Primary Relative Profile & Guidelines
                  </h3>
                  {/* <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Set default phone liaison addresses and customize dynamic emergency protection policies standardly.
                  </p> */}
                </div>

                {saveSettingsSuccess && (
                  <div className="bg-emerald-50/60 border border-emerald-150 p-3.5 rounded-xl flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span className="font-bold">Settings saved successfully. Changes active on live shifts directory.</span>
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); setSaveSettingsSuccess(true); setTimeout(() => setSaveSettingsSuccess(false), 3000); }} className="space-y-4">
                  
                  {/* Liaison Phone */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Liaison Contact Phone Number</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-205 p-2.5 rounded-xl font-mono text-xs text-slate-755 focus:bg-white outline-hidden font-bold"
                      value={relativePhone}
                      onChange={(e) => setRelativePhone(e.target.value)}
                      placeholder="e.g. +8801712345678"
                    />
                  </div>

                  {/* Street Address */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Full Workspace Relative address</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-205 p-2.5 rounded-xl text-xs text-slate-755 focus:bg-white outline-hidden"
                      value={relativeAddress}
                      onChange={(e) => setRelativeAddress(e.target.value)}
                      placeholder="e.g. House 12, Road 4, Dhanmondi R/A, Dhaka"
                    />
                  </div>

                  {/* Payment Method */}
                  {/* <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Default BDT Billing Method</label>
                    <select
                      className="w-full bg-slate-50/50 border border-slate-205 p-2.5 rounded-xl outline-hidden text-xs font-bold"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="None">None</option>
                      <option value="Bkash">Bkash mobile wallet (৳ BDT Secured)</option>
                      <option value="Nagad">Nagad mobile wallet (৳ BDT Secured)</option>
                      <option value="CreditCard">Credit / Debit local Visa/Mastercard (৳ BDT)</option>
                      <option value="CashOnShift">Cash payment on shift completion (৳ BDT)</option>
                    </select>
                  </div> */}

                  {/* Toggle checks */}
                  

                  <div className="pt-4 text-right">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-all active:scale-97"
                    >
                      Save Settings Changes
                    </button>
                  </div>

                </form>

              </div>

            </div>
          )}

        </div>

        {/* Global mini dashboard prompt warning info */}
        {/*
        <div className="mt-12 bg-[#f4f7f9] border border-sky-100/50 p-4 rounded-2xl flex items-start gap-2.5 text-[11px] text-slate-550 leading-relaxed md:max-w-2xl">
          <Info className="h-4.5 w-4.5 text-sky-550 shrink-0 mt-0.5" />
          <span>
            <strong>CareBridge Security Desk Dhaka:</strong> Certified home nurses hold checked clinical NID backgrounds registered across local government stations. For instant coordinates backup, call standard hotline (+880) 1800-CBRIDGE.
          </span>
        </div>
        */}

      </main>

        {/* ========================================== */}
        {/* MODAL: 1. ADD / EDIT CAREGIVER REVIEW      */}
        {/* ========================================== */}
        {reviewingBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm">
                    {reviewIsEditing ? 'Edit Care Session Review' : 'Create Care Session Review'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Share your experience with CareBridge and help the communities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingBooking(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {reviewError && (
                <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl text-rose-800 text-[11px] font-medium leading-relaxed">
                  <strong>Submission Error:</strong> {reviewError}
                </div>
              )}

              {reviewSuccess ? (
                <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl text-emerald-800 flex flex-col items-center gap-2 text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
                  <span className="font-bold text-sm">{reviewSuccess}</span>
                  <span className="text-[10px] text-slate-500 font-light mt-1">Realtime caregiver metrics are syncing...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating selection (1-5 stars) */}
                  <div className="space-y-1.5 text-center bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <label className="block text-[11px] font-bold text-slate-705">Select Session Star Rating</label>
                    <div className="flex justify-center gap-2.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-2xl hover:scale-115 transition-transform duration-100 outline-hidden select-none cursor-pointer"
                        >
                          {star <= reviewRating ? (
                            <span className="text-amber-500">★</span>
                          ) : (
                            <span className="text-slate-205">★</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1 leading-none uppercase">
                      {reviewRating === 1 && 'Unsatisfactory'}
                      {reviewRating === 2 && 'Needs Improvement'}
                      {reviewRating === 3 && 'Acceptable Duty'}
                      {reviewRating === 4 && 'Highly Professional'}
                      {reviewRating === 5 && 'Outstanding Care!'}
                    </span>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-705">Written session review feedback (NID verified)</label>
                    <textarea
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="e.g. Nurse Zaman was incredibly warm-hearted, arrived exactly on coordinates punctually, and monitored all blood sugar timings perfectly..."
                      className="w-full bg-slate-50/50 border border-slate-205 p-3 rounded-xl text-xs text-slate-755 focus:bg-white outline-hidden leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewingBooking(null)}
                      className="px-4 py-2 text-slate-650 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isReviewSubmitting}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition-all active:scale-97 flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {isReviewSubmitting ? (
                        <>Saving Review...</>
                      ) : (
                        <>{reviewIsEditing ? 'Update Review' : 'Submit Review'}</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MODAL: 2. COMPLAINT / REPORT CAREGIVER      */}
        {/* ========================================== */}
        {reportingBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                    Report Caregiver Activity
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Flag an issue securely to ensure service standards and protect community safety.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingBooking(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {reportError && (
                <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl text-rose-800 text-[11px] font-medium leading-relaxed">
                  <strong>Error:</strong> {reportError}
                </div>
              )}

              {reportSuccess ? (
                <div className="bg-amber-50 border border-amber-150 p-4 rounded-xl text-amber-850 flex flex-col items-center gap-2 text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-amber-600" />
                  <span className="font-bold text-xs">{reportSuccess}</span>
                  <p className="text-[10px] text-slate-500 leading-normal mt-1 max-w-xs font-light">
                    Reports are reviewed by the CareBridge administration team to ensure platform safety and service quality.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4">
                  
                  {/* Reference ID and Booking details */}
                  <div className="p-3 bg-slate-50 border rounded-xl text-slate-700 leading-relaxed font-semibold">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider block">Booking Reference ID:</span>
                    <strong className="text-slate-800 font-mono text-[10px]">{reportingBooking.id}</strong>
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider block mt-2">Active Coordinates Dates:</span>
                    <span className="text-slate-800 font-bold">{reportingBooking.startDate} to {reportingBooking.endDate}</span>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Report Category Flag</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-205 p-2.5 rounded-xl outline-hidden text-xs font-bold text-slate-755"
                    >
                      <option value="Fraudulent Activity">Fraudulent Activity</option>
                      <option value="Unprofessional Behavior">Unprofessional Behavior</option>
                      <option value="Safety Concern">Safety Concern</option>
                      <option value="Misrepresentation">Misrepresentation</option>
                      <option value="Harassment">Harassment</option>
                      <option value="Other">Other Issues</option>
                    </select>
                  </div>

                  {/* Text field description */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Detailed Description of Incident</label>
                    <textarea
                      rows={4}
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="e.g. Please describe in detail what occurred, including details of the service quality concern or safety breach..."
                      className="w-full bg-slate-50/50 border border-slate-205 p-3 rounded-xl text-xs text-slate-755 focus:bg-white outline-hidden leading-relaxed"
                    />
                  </div>

                  {/* Business rules & safety alerts helper text */}
                  <p className="bg-slate-50 p-3 rounded-xl border-l-2 border-slate-350 text-[10px] text-slate-550 leading-relaxed font-light">
                    ℹ Reports are reviewed by the CareBridge administration team to ensure platform safety and service quality. Reporting a caregiver must not automatically remove them, pending admin action details.
                  </p>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setReportingBooking(null)}
                      className="px-4 py-2 text-slate-650 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isReportSubmitting}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer transition-all active:scale-97 flex items-center justify-center gap-1.5 disabled:opacity-40 text-center"
                    >
                      {isReportSubmitting ? (
                        <>Filing Complaint...</>
                      ) : (
                        <>Submit Report Security Complaint</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

    </div>
  );
};
