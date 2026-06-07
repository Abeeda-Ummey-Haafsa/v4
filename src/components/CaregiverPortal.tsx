/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Clock, 
  DollarSign, 
  Settings, 
  User, 
  MapPin, 
  Activity, 
  TrendingUp, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  Sparkles, 
  Power, 
  ExternalLink,
  ShieldAlert,
  Loader2,
  Trash2,
  BookOpen,
  Star
} from 'lucide-react';
import { isValidCaregiverEmail } from '../types';
import { db, getActiveUserId, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';

interface CaregiverPortalProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onProfileUpdate?: () => void;
}

// Simulated types for local interaction
interface ShiftLog {
  id: string;
  time: string;
  text: string;
}

interface SimulatedBooking {
  id: string;
  elderName: string;
  address: string;
  mobilityLevel: string;
  medicalConditions: string[];
  startDate: string;
  endDate: string;
  durationHours: number;
  hourlyRate: number;
  totalEarnings: number;
  status: 'Active' | 'Upcoming' | 'Completed';
  notes?: string;
  tasks: { id: string; label: string; checked: boolean }[];
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({
  userName,
  userEmail,
  onLogout,
  onProfileUpdate,
}) => {
  const isDemoCaregiver = userEmail.toLowerCase().trim() === 'samia@du.student.edu.bd';

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'logs' | 'earnings' | 'settings' | 'reviews'>('dashboard');
  
  // Reviews state structure
  interface ReviewItem {
    id: string;
    rating: number;
    comment: string;
    relative_id: string;
    reviewerName: string;
    created_at: string;
    booking_id: string;
  }
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  
  // Sidebar states (for mobile collapsible drawer)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Availability state: 'Available' | 'Occupied' | 'Unavailable'
  const [manualAvailability, setManualAvailability] = useState<boolean>(isDemoCaregiver); // user default toggle
  
  // Simulation: state for the current caregiver bookings
  const [simulatedBookings, setSimulatedBookings] = useState<SimulatedBooking[]>([]);

  // Selected booking detail view
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Shift logs database subscription state
  const [activeShiftLogs, setActiveShiftLogs] = useState<{id: string, time: string, text: string, created_at?: string}[]>([]);
  const [logTime, setLogTime] = useState('');
  const [logText, setLogText] = useState('');

  // Page Skeleton/Loading states simulation
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Settings State
  const [profName, setProfName] = useState(userName);
  const [profUniversity, setProfUniversity] = useState(() => {
    // Determine university based on email subdomain pre-fill
    const emailLower = userEmail.toLowerCase();
    if (emailLower.includes('du.')) return 'Dhaka University';
    if (emailLower.includes('nsu.')) return 'North South University';
    if (emailLower.includes('iub.')) return 'Independent University, Bangladesh';
    if (emailLower.includes('buet.')) return 'BUET';
    if (emailLower.includes('brac.')) return 'Brac University';
    return 'East West University';
  });
  const [profEmail, setProfEmail] = useState(userEmail);
  const [profPhone, setProfPhone] = useState('+8801824-789012');
  const [profRate, setProfRate] = useState(350);
  const [profExpertise, setProfExpertise] = useState('Post-Stroke Rehabilitation');
  const [profBio, setProfBio] = useState('Enthusiastic senior clinical nursing student with practical hospital ward training to care for elders with cardiac recovery needs.');
  const [profGender, setProfGender] = useState<'Male' | 'Female'>('Female');
  const [profArea, setProfArea] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchCaregiverProfile = async () => {
      const uid = getActiveUserId();
      if (!uid) return;
      try {
        const docRef = doc(db, 'caregivers', uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.full_name) {
            setProfName(data.full_name);
          }
          if (data.email) {
            setProfEmail(data.email);
          }
          if (data.phone) {
            setProfPhone(data.phone);
          }
          if (data.hourly_rate !== undefined) {
            setProfRate(Number(data.hourly_rate));
          }
          if (data.expertise) {
            setProfExpertise(data.expertise);
          }
          if (data.bio) {
            setProfBio(data.bio);
          }
          if (data.gender) {
            const parsedGender = data.gender === 'male' || data.gender === 'Male' ? 'Male' : 'Female';
            setProfGender(parsedGender);
          }
          if (data.area !== undefined) {
            setProfArea(data.area);
          }
          if (data.is_available !== undefined) {
            setManualAvailability(!!data.is_available);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch caregiver profile:", err);
      }
    };
    fetchCaregiverProfile();
  }, [userEmail]);

  useEffect(() => {
    const uid = getActiveUserId();
    if (!uid) return;

    const reviewsQ = query(
      collection(db, 'reviews'),
      where('caregiver_id', '==', uid)
    );

    const unsubscribeReviews = onSnapshot(reviewsQ, async (snapshot) => {
      try {
        const items: ReviewItem[] = [];
        if (!snapshot.empty) {
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            let reviewerName = 'Relative Care Liaison';
            if (data.relative_id) {
              try {
                const userSnap = await getDoc(doc(db, 'users', data.relative_id));
                if (userSnap.exists()) {
                  reviewerName = userSnap.data().full_name || 'Relative Client';
                }
              } catch (e) {
                console.warn("Failed to fetch reviewer user:", e);
              }
            }
            items.push({
              id: docSnap.id,
              rating: data.rating || 5,
              comment: data.comment || '',
              relative_id: data.relative_id || '',
              reviewerName,
              created_at: data.created_at || new Date().toISOString(),
              booking_id: data.booking_id || ''
            });
          }
        }
        setReviewsList(items);
      } catch (err) {
        console.error("Failed to fetch caregiver reviews:", err);
      }
    });

    return () => {
      unsubscribeReviews();
    };
  }, []);

  useEffect(() => {
    const uid = getActiveUserId();
    if (!uid) return;

    const bookingsQ = query(
      collection(db, 'bookings'),
      where('caregiver_id', '==', uid)
    );

    const unsubscribe = onSnapshot(bookingsQ, async (snapshot) => {
      try {
        const dbBookings: SimulatedBooking[] = [];
        if (!snapshot.empty) {
          for (const docSnap of snapshot.docs) {
            const item = docSnap.data();
            
            // Skip cancelled bookings so they do not show inside active/upcoming or lock availability
            if (item.status === 'cancelled') {
              continue;
            }
            
            let elderName = 'Elder Client';
            let address = 'Dhaka, Bangladesh';
            let mobilityLevel = 'Independent';
            let medicalConditions: string[] = [];
            
            if (item.elder_id) {
              try {
                const elderSnap = await getDoc(doc(db, 'elders', item.elder_id));
                if (elderSnap.exists()) {
                  const elderData = elderSnap.data();
                  elderName = elderData.full_name || 'Elder Client';
                  address = elderData.address || elderData.area || 'Dhaka';
                  mobilityLevel = elderData.mobility_level || 'Independent';
                  if (elderData.medical_conditions) {
                    if (Array.isArray(elderData.medical_conditions)) {
                      medicalConditions = elderData.medical_conditions;
                    } else if (typeof elderData.medical_conditions === 'string') {
                      medicalConditions = [elderData.medical_conditions];
                    }
                  }
                }
              } catch (elderErr) {
                console.warn("Failed to fetch elder details:", elderErr);
              }
            }
            
            let mappedStatus: 'Active' | 'Upcoming' | 'Completed' = 'Upcoming';
            if (item.status === 'completed') {
              mappedStatus = 'Completed';
            } else if (item.status === 'active' || item.status === 'Active') {
              mappedStatus = 'Active';
            } else {
              mappedStatus = 'Upcoming';
            }
            
            const startDateStr = item.start_time ? item.start_time.split('T')[0] : new Date().toISOString().split('T')[0];
            const endDateStr = item.end_time ? item.end_time.split('T')[0] : startDateStr;
            
            dbBookings.push({
              id: item.id || docSnap.id,
              elderName,
              address,
              mobilityLevel,
              medicalConditions,
              startDate: startDateStr,
              endDate: endDateStr,
              durationHours: item.hours || 4,
              hourlyRate: item.hourly_rate || 350,
              totalEarnings: item.total_amount || 1400,
              status: mappedStatus,
              notes: item.care_instructions || '',
              tasks: [
                { id: 'dt1', label: 'Medication Reminder', checked: false },
                { id: 'dt2', label: 'Companion Care Services', checked: false },
                { id: 'dt3', label: 'Monitor Mobility and Stability', checked: false },
              ]
            });
          }
        }
        
        setSimulatedBookings(dbBookings);
      } catch (err) {
        console.warn("Failed to process snapshotted caregiver bookings:", err);
      }
    }, (error) => {
      console.warn("Real-time caregiver bookings snapshot failed:", error);
    });

    return () => unsubscribe();
  }, [userEmail]);

  // Completion modal state
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);

  // Active bookings filter tab (My Bookings page)
  const [bookingsFilter, setBookingsFilter] = useState<'Active' | 'Upcoming' | 'Completed'>('Active');

  // Business logic variables
  const activeBooking = simulatedBookings.find(b => b.status === 'Active');
  
  // Realtime Active Shift Logs Subscription
  useEffect(() => {
    if (!activeBooking) {
      setActiveShiftLogs([]);
      return;
    }
    const qShiftLogs = query(
      collection(db, 'shift_logs'),
      where('booking_id', '==', activeBooking.id)
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
      console.warn("Failed to subscribe to shift logs in caregiver portal:", error);
    });

    return () => unsubscribeShiftLogs();
  }, [activeBooking?.id]);

  // Set current status:
  // "A caregiver can only have ONE active booking at a time."
  // "When assigned to a booking automatically become occupied."
  const caregiverStatus: 'Available' | 'Occupied With Active Booking' | 'Unavailable' = 
    activeBooking 
      ? 'Occupied With Active Booking' 
      : (manualAvailability ? 'Available' : 'Unavailable');

  // Completed booking earnings total calculations
  const totalCompletedEarnings = simulatedBookings
    .filter(b => b.status === 'Completed')
    .reduce((sum, b) => sum + b.totalEarnings, 0);

  // Add shift log
  const handleAddLog = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!logText.trim()) {
      alert("Please enter shift log details or medication summary text.");
      return;
    }
    if (!activeBooking) {
      alert("No active session to write log for! Please start a session first.");
      return;
    }
    const timeToUse = logTime.trim() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logId = `log_${Date.now()}`;
    const logData = {
      id: logId,
      booking_id: activeBooking.id,
      time: timeToUse,
      text: logText.trim(),
      created_at: new Date().toISOString()
    };
    try {
      // Optimistic state update so the item is instantly displayed in the log timelines on CareBridge
      setActiveShiftLogs(prev => [logData, ...prev]);
      
      await setDoc(doc(db, 'shift_logs', logId), logData);
      setLogText('');
      setLogTime('');
    } catch (err) {
      console.warn("Failed to add log to Firestore (continuing with local timeline fallback):", err);
      // We still clear input controls because we successfully updated the local state timeline fallback
      setLogText('');
      setLogTime('');
    }
  };

  const handleDeleteLogDoc = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'shift_logs', logId));
    } catch (err) {
      console.error("Failed to delete log from database:", err);
    }
  };

  // Start Upcoming Booking session right now
  const handleStartSession = async (bookingId: string) => {
    // 1. Convert any other 'Active' booking back to 'confirmed' status
    for (const b of simulatedBookings) {
      if (b.status === 'Active' && b.id !== bookingId) {
        try {
          await setDoc(doc(db, 'bookings', b.id), { status: 'confirmed' }, { merge: true });
        } catch (err) {
          console.warn("Failed to reset previous active booking status:", err);
        }
      }
    }

    // 2. Set target booking status to 'active'
    if (bookingId && !bookingId.startsWith('CB-')) {
      const parentPath = 'bookings';
      try {
        const docRef = doc(db, parentPath, bookingId);
        const existingBooking = simulatedBookings.find(b => b.id === bookingId);
        const duration = existingBooking ? existingBooking.durationHours : 4;
        
        const now = new Date();
        const end = new Date(now.getTime() + duration * 3600000);
        
        await setDoc(docRef, {
          status: 'active',
          start_time: now.toISOString(),
          end_time: end.toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${parentPath}/${bookingId}`);
      }
    }
  };

  // Complete Active Booking flow
  const confirmMarkShiftComplete = async (bookingId: string) => {
    setShowCompleteModal(null);
    setSelectedBookingId(null);
    setActiveTab('dashboard');

    if (bookingId && !bookingId.startsWith('CB-')) {
      const parentPath = 'bookings';
      try {
        const docRef = doc(db, parentPath, bookingId);
        await setDoc(docRef, {
          status: 'completed',
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${parentPath}/${bookingId}`);
      }
    }
  };

  // Profile Email Inline validation check for Settings Panel
  const profileEmailIsValid = isValidCaregiverEmail(profEmail);

  return (
    <div
      className="min-h-screen bg-[#fafbfc] flex font-sans text-slate-800"
      id="caregiver-portal-root"
    >
      {/* ==================== DESKTOP FIXED SIDEBAR ==================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 sticky top-16 h-[calc(100vh-4rem)] p-5 justify-between">
        <div className="space-y-6">
          <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold text-base shadow-xs">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-display font-bold text-slate-900 truncate text-sm">
                  {profName}
                </h4>
                {/* <span className="block text-[10.5px] font-mono text-sky-600 bg-sky-100/40 px-2 py-0.5 rounded-full font-bold w-fit mt-0.5">
                  Student Caregiver
                </span> */}
              </div>
            </div>
          </div>

          <nav className="space-y-1.5" aria-label="Caregiver Desktop Sidebar">
            <button
              id="sidebar-tab-dashboard"
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "dashboard" && !selectedBookingId
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="sidebar-tab-bookings"
              onClick={() => {
                setActiveTab("bookings");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "bookings" || selectedBookingId
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <CalendarDays className="h-4.5 w-4.5" />
              <span>My Bookings</span>
              {simulatedBookings.filter((b) => b.status === "Active").length >
                0 && (
                <span
                  className={`ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                    activeTab === "bookings" || selectedBookingId
                      ? "bg-white text-sky-600"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  1 Active
                </span>
              )}
            </button>

            <button
              id="sidebar-tab-logs"
              onClick={() => {
                setActiveTab("logs");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "logs"
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Activity className="h-4.5 w-4.5" />
              <span>Shift Logs</span>
            </button>

            <button
              id="sidebar-tab-earnings"
              onClick={() => {
                setActiveTab("earnings");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "earnings"
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <DollarSign className="h-4.5 w-4.5" />
              <span>Earnings</span>
            </button>

            <button
              id="sidebar-tab-reviews"
              onClick={() => {
                setActiveTab("reviews");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "reviews"
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Star className="h-4.5 w-4.5" />
              <span>Reviews & Ratings</span>
              {reviewsList.length > 0 && (
                <span
                  className={`ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                    activeTab === "reviews"
                      ? "bg-white text-sky-600"
                      : "bg-sky-500 text-white"
                  }`}
                >
                  {reviewsList.length}
                </span>
              )}
            </button>

            <button
              id="sidebar-tab-settings"
              onClick={() => {
                setActiveTab("settings");
                setSelectedBookingId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-150"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              <span>Profile Settings</span>
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="w-full py-2.5 bg-slate-50 hover:bg-rose-50 text-slate-550 hover:text-rose-600 border border-slate-200/50 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Log Out Portal
          </button>
        </div>
      </aside>

      {/* ==================== MOBILE FLUID CONTAINER ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Upper Rail */}
        <div className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-16 z-30">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
              {userName.charAt(0)}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-none">
                {profName}
              </p>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                Caregiver Workspace
              </p>
            </div>
          </div>

          <div className="flex gap-2 text-[10px]">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-2.5 py-1.5 bg-slate-55 hover:bg-slate-100 rounded-lg text-slate-700 font-bold border border-slate-200"
            >
              Menu Toggle
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown overlay when toggled */}
        {sidebarOpen && (
          <div className="lg:hidden absolute top-28 left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-40 p-4 animate-fade-in">
            <nav
              className="grid grid-cols-2 gap-2"
              aria-label="Caregiver Mobile Onscreen Navigation"
            >
              <button
                id="mobile-tab-dashboard"
                onClick={() => {
                  setActiveTab("dashboard");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "dashboard" && !selectedBookingId
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button
                id="mobile-tab-bookings"
                onClick={() => {
                  setActiveTab("bookings");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "bookings" || selectedBookingId
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Bookings</span>
              </button>
              <button
                id="mobile-tab-logs"
                onClick={() => {
                  setActiveTab("logs");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "logs"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Shift Logs</span>
              </button>
              <button
                id="mobile-tab-earnings"
                onClick={() => {
                  setActiveTab("earnings");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "earnings"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Earnings</span>
              </button>
              <button
                id="mobile-tab-reviews"
                onClick={() => {
                  setActiveTab("reviews");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "reviews"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <Star className="h-4 w-4" />
                <span>Reviews ({reviewsList.length})</span>
              </button>
              <button
                id="mobile-tab-settings"
                onClick={() => {
                  setActiveTab("settings");
                  setSelectedBookingId(null);
                  setSidebarOpen(false);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-[11px] font-bold ${
                  activeTab === "settings"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-50 text-slate-600"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Profile Settings</span>
              </button>
            </nav>
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
              <button
                onClick={onLogout}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl"
              >
                Log Out Custom Session
              </button>
            </div>
          </div>
        )}

        {/* ==================== CORE PORLET VIEWS CONTAINER ==================== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Interactive view toggle loader preview simulation helper */}
          {/* <div className="flex gap-2 justify-end text-[10px] items-center text-slate-450 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit ml-auto">
            <span className="font-semibold">Simulate Workspace states:</span>
            <button
              onClick={() => {
                setIsLoadingDashboard(true);
                setIsLoadingBookings(true);
                setTimeout(() => {
                  setIsLoadingDashboard(false);
                  setIsLoadingBookings(false);
                }, 900);
              }}
              className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-105 rounded-md font-bold text-slate-650 flex items-center gap-0.5"
            >
              <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
              <span>Trigger Skeletons</span>
            </button>
          </div> */}

          {/* Render individual page based on selected booking details view or main tab */}
          {selectedBookingId ? (
            /* ==================== BOOKING DETAILS SCREEN ==================== */
            (() => {
              const booking = simulatedBookings.find(
                (b) => b.id === selectedBookingId,
              );
              if (!booking)
                return <p className="text-sm">Booking details missing.</p>;

              return (
                <div
                  className="space-y-6 animate-fade-in"
                  id={`booking-details-${booking.id}`}
                >
                  {/* Header row with back */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <button
                        onClick={() => setSelectedBookingId(null)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer mb-1.5 focus:ring-1 focus:ring-sky-500 rounded-md px-1"
                      >
                        ← Back to Bookings
                      </button>
                      <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900 flex items-center gap-2">
                        Booking Details:{" "}
                        <span className="text-sky-500">{booking.id}</span>
                      </h2>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          booking.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : booking.status === "Upcoming"
                              ? "bg-yellow-50 text-yellow-600 border border-yellow-105"
                              : "bg-slate-100 text-slate-550 border border-slate-200"
                        }`}
                      >
                        {booking.status} Reservation
                      </span>
                    </div>
                  </div>

                  {/* Quick notification warning */}
                  {booking.status === "Active" && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex gap-2.5 items-start text-indigo-900 text-xs leading-relaxed shadow-3xs">
                      <AlertCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>
                        <strong>Live Shift Connected:</strong> You are currently
                        checked-in with this active elder. Your discoverability
                        in the Dhaka relative marketplace has been automatically
                        paused while this live shift runs.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left & Middle columns: Details */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Elder Information Card */}
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                        <h3 className="font-display font-bold text-slate-900 text-base border-l-2 border-sky-400 pl-2 uppercase tracking-wide">
                          Elder Patient Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/30">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block mb-1">
                              Full Name
                            </span>
                            <p className="font-bold text-slate-800 text-sm">
                              {booking.elderName}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/30">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block mb-1">
                              Mobility Standards
                            </span>
                            <span className="inline-block px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full font-bold text-[10.5px] mt-0.5">
                              {booking.mobilityLevel}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/30 sm:col-span-2">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block mb-1">
                              Work Site / Care Address
                            </span>
                            <p className="font-semibold text-slate-750 flex items-start gap-1">
                              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                              <span>{booking.address}</span>
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/30 sm:col-span-2">
                            <span className="text-slate-450 uppercase text-[10px] font-bold block mb-1">
                              Medical Diagnosis Notes
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {booking.medicalConditions.map((m) => (
                                <span
                                  key={m}
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-semibold text-[10.5px] border border-rose-100"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>

                          {booking.notes && (
                            <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60 sm:col-span-2 space-y-1">
                              <span className="text-amber-800 uppercase text-[10px] font-bold block">
                                Special Bedside Care Instructions
                              </span>
                              <p className="font-semibold text-amber-900 text-xs italic leading-relaxed">
                                "{booking.notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assigned Tasks Checklist */}
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                        <h3 className="font-display font-bold text-slate-900 text-base border-l-2 border-sky-400 pl-2 uppercase tracking-wide">
                          Assigned Duty Tasks Checklist
                        </h3>

                        <div
                          className="space-y-3"
                          role="group"
                          aria-label="Tasks checklist"
                        >
                          {booking.tasks.map((task) => (
                            <label
                              key={task.id}
                              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                task.checked
                                  ? "bg-sky-50/20 border-sky-100/60 text-slate-800"
                                  : "bg-slate-50/50 border-slate-150 text-slate-550"
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={task.id}
                                checked={task.checked}
                                onChange={() => {
                                  // toggle standard task state
                                  setSimulatedBookings((prev) =>
                                    prev.map((b) =>
                                      b.id === booking.id
                                        ? {
                                            ...b,
                                            tasks: b.tasks.map((t) =>
                                              t.id === task.id
                                                ? { ...t, checked: !t.checked }
                                                : t,
                                            ),
                                          }
                                        : b,
                                    ),
                                  );
                                }}
                                className="h-4 w-4 accent-sky-500 rounded-md mt-0.5 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-xs font-semibold leading-relaxed">
                                {task.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right column: Shift logs & Booking actions */}
                    <div className="space-y-6">
                      {/* Booking Summary Stat card */}
                      <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
                        <div>
                          <span className="text-slate-400 uppercase text-[9px] font-bold tracking-wider block">
                            Total Shift Earnings
                          </span>
                          <span className="font-display font-extrabold text-2xl text-white">
                            ৳{booking.totalEarnings} BDT
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Duration
                            </span>
                            <span className="font-bold">
                              {booking.durationHours} hrs / day
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Hourly Standard
                            </span>
                            <span className="font-bold">
                              ৳{booking.hourlyRate} BDT
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shift-Logs Mini timeline */}
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-display font-bold text-slate-900 text-sm">
                            Today's Shift updates
                          </h4>
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                            Live Feed
                          </span>
                        </div>

                        {activeShiftLogs.length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400">
                            No shift update logs registered yet today.
                          </div>
                        ) : (
                          <div className="relative pl-3.5 border-l border-slate-150 space-y-4 text-xs">
                            {activeShiftLogs.map((log) => (
                              <div key={log.id} className="relative">
                                {/* bullet indicator */}
                                <div className="absolute -left-[19.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 border border-white" />
                                <div className="space-y-1.5 text-left">
                                  <span className="font-mono text-[10px] font-bold text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded-md">
                                    {log.time}
                                  </span>
                                  <p className="text-slate-650 leading-relaxed font-semibold">
                                    {log.text}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {booking.status === "Active" && (
                          <button
                            onClick={() => setActiveTab("logs")}
                            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>Open Log Submitter</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* BOOKING COMPLETION ACTION (MARK SHIFT COMPLETE) */}
                      {booking.status === "Active" ? (
                        <div className="pt-2">
                          <button
                            id="finish-booking-trigger"
                            onClick={() => setShowCompleteModal(booking.id)}
                            className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-2xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="h-4.5 w-4.5 text-sky-100" />
                            <span>Mark Shift Complete</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-200/70 text-slate-500 text-xs leading-relaxed font-semibold">
                          This booking reservation is {booking.status}. No
                          primary operations are pending.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeTab === "dashboard" ? (
            /* ==================== A. DASHBOARD SHIFT PAGE ==================== */
            <div className="space-y-6">
              {/* Top Summary Banner */}
              <div className="bg-gradient-to-r from-sky-400 to-indigo-500 p-6 rounded-3xl text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm relative overflow-hidden">
                <div className="space-y-1 z-10">
                  <h2 className="font-display font-extrabold text-2xl tracking-tight">
                    Welcome, {profName}!
                  </h2>
                  <p className="text-xs text-sky-100 font-light max-w-md">
                    Monitor your clinical student schedule, submit today's
                    real-time caregiving shift logs, and manage reservation
                    status.
                  </p>
                </div>
                {/* <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-semibold z-10">
                  <span className="text-[10px] uppercase text-sky-100 block opacity-80">
                    Current Date Context
                  </span>
                  <span className="font-mono text-white text-xs font-bold">
                    UTC: 2026-06-04
                  </span>
                </div> */}
                {/* Accent decoration blob */}
                <div className="absolute -right-10 -bottom-10 h-36 w-36 bg-sky-300/20 rounded-full blur-2xl" />
              </div>

              {/* KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Availability card status */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs flex flex-col justify-evenly space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider block">
                      Availability Status
                    </span>
                    <span
                      className={`inline-flex h-4 w-4 rounded-full ${
                        caregiverStatus === "Available"
                          ? "bg-emerald-500"
                          : caregiverStatus === "Unavailable"
                            ? "bg-slate-400"
                            : "bg-rose-500"
                      }`}
                    />
                  </div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        caregiverStatus === "Available"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : caregiverStatus === "Occupied With Active Booking"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-slate-150 text-slate-550"
                      }`}
                    >
                      {caregiverStatus}
                    </span>
                    {/* <span className="block text-[10px] text-slate-450 mt-1">
                      Automatic Business Rule Sync
                    </span> */}
                  </div>
                </div>

                {/* 2. Active booking details */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs flex flex-col justify-evenly space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider block">
                      Active Booking
                    </span>
                    <Clock className="h-4 w-4 text-sky-500" />
                  </div>
                  <div>
                    {activeBooking ? (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {activeBooking.elderName}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400">
                          {activeBooking.id} • {activeBooking.durationHours} hrs
                          / day
                        </span>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-400 text-xs">
                        No active booking
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Upcoming Bookings count */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs flex flex-col justify-evenly space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider block">
                      Upcoming Bookings
                    </span>
                    <CalendarDays className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <span className="font-display font-extrabold text-2xl text-slate-900">
                      {
                        simulatedBookings.filter((b) => b.status === "Upcoming")
                          .length
                      }
                    </span>
                    {/* <span className="block text-[10px] text-slate-450 mt-0.5">
                      Vetted bookings pre-paid
                    </span> */}
                  </div>
                </div>

                {/* 4. This month earnings */}
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs flex flex-col justify-evenly space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-450 text-[10.5px] font-bold uppercase tracking-wider block">
                      This Month Earnings
                    </span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="font-display font-extrabold text-xl text-slate-900">
                      ৳
                      {totalCompletedEarnings +
                        (activeBooking ? activeBooking.totalEarnings : 0)}{" "}
                      BDT
                    </span>
                    {/* <span className="block text-[10px] text-slate-450 mt-0.5">
                      Includes current active cycles
                    </span> */}
                  </div>
                </div>
              </div>

              {/* Main dashboard core elements layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left & Middle Column (2 cols): Active Booking & Upcoming list */}
                <div className="lg:col-span-2 space-y-6">
                  {/* ACTIVE BOOKING SECTION */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                    <h3 className="font-display font-bold text-slate-900 text-base border-l-2 border-sky-400 pl-2 uppercase tracking-wide">
                      Active Booking Shift
                    </h3>

                    {isLoadingDashboard ? (
                      /* SKELETON LOADER FOR ACTIVE BOOKING */
                      <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded-md w-1/4" />
                        <div className="h-20 bg-slate-100 rounded-2xl" />
                      </div>
                    ) : !activeBooking ? (
                      /* EMPTY STATE */
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-8 text-center space-y-3.5">
                        <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100/50">
                          <Clock className="h-5 w-5" />
                        </div>
                        <h4 className="font-display font-bold text-slate-700">
                          No Active Bookings Scheduled
                        </h4>
                        {/* <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                          Your active client list is currently empty. Make sure
                          your availability status is active so relatives in
                          Dhaka can find you.
                        </p> */}
                      </div>
                    ) : (
                      /* POPULATED STRUCTURE */
                      <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-3xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between gap-2 border-b border-slate-105 pb-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Elder client
                            </span>
                            <span className="font-display font-extrabold text-slate-900 text-lg">
                              {activeBooking.elderName}
                            </span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Assigned Address
                            </span>
                            <span className="text-xs font-semibold text-slate-600 block truncate max-w-xs">
                              {activeBooking.address}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-bold">
                              Duty dates
                            </span>
                            <p className="font-bold text-slate-750">
                              {activeBooking.startDate} —{" "}
                              {activeBooking.endDate}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block font-bold">
                              Duty standards
                            </span>
                            <p className="font-bold text-slate-755">
                              {activeBooking.durationHours} hrs / day
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block font-bold">
                              Shift status
                            </span>
                            <span className="inline-block px-2 bg-emerald-50 text-emerald-600 rounded-md font-bold text-[10.5px]">
                              Active Now
                            </span>
                          </div>
                        </div>

                        {activeBooking.notes && (
                          <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/50 text-xs space-y-1">
                            <span className="text-amber-805 text-amber-800 uppercase text-[10px] font-bold block">
                              Special Bedside Care Instructions
                            </span>
                            <p className="font-semibold text-amber-900 text-[11px] italic leading-relaxed">
                              "{activeBooking.notes}"
                            </p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                          <p className="text-[11px] text-slate-450 leading-relaxed font-semibold max-w-xs">
                            Keep tasks checklist current and post log reports
                            regularly for the relative.
                          </p>
                          <button
                            id="view-active-booking-btn"
                            onClick={() =>
                              setSelectedBookingId(activeBooking.id)
                            }
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                          >
                            View Duties & Logs
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* UPCOMING BOOKINGS SECTION */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                    <h3 className="font-display font-bold text-slate-900 text-base border-l-2 border-indigo-400 pl-2 uppercase tracking-wide">
                      Upcoming Bookings
                    </h3>

                    {isLoadingDashboard ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-16 bg-slate-100 rounded-2xl" />
                        <div className="h-16 bg-slate-100 rounded-2xl" />
                      </div>
                    ) : simulatedBookings.filter((b) => b.status === "Upcoming")
                        .length === 0 ? (
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center space-y-2">
                        <p className="text-xs text-slate-450">
                          No upcoming caregiver slots booked.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {simulatedBookings
                          .filter((b) => b.status === "Upcoming")
                          .map((upcoming) => (
                            <div
                              key={upcoming.id}
                              className="bg-slate-55/70 border border-slate-150 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                            >
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-mono text-slate-400 font-bold block">
                                  {upcoming.id}
                                </span>
                                <span className="font-display font-bold text-slate-800 text-sm block">
                                  {upcoming.elderName}
                                </span>
                                <span className="text-[11px] text-slate-555 block font-semibold">
                                  {upcoming.startDate} (Starts in{" "}
                                  {upcoming.durationHours}h slot)
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleStartSession(upcoming.id)
                                  }
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-3xs"
                                >
                                  Start session right now
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedBookingId(upcoming.id)
                                  }
                                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                                >
                                  View info
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (1 col): Availability Card and Guidelines */}
                <div className="space-y-6">
                  {/* AVAILABILITY CARD */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                    <h4 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                      Marketplace Availability
                    </h4>

                    {/* Status Display badge */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/85">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                        State indicator
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            caregiverStatus === "Available"
                              ? "bg-emerald-500"
                              : caregiverStatus === "Unavailable"
                                ? "bg-slate-300"
                                : "bg-rose-500"
                          }`}
                        />
                        <span className="font-display font-extrabold text-slate-900 text-sm">
                          {caregiverStatus === "Available"
                            ? "Available for Hire"
                            : caregiverStatus === "Unavailable"
                              ? "Manually Unavailable"
                              : "Occupied on Live Duty"}
                        </span>
                      </div>
                    </div>

                    {/* Availability interactive toggle or helper based on business rule */}
                    {caregiverStatus === "Occupied With Active Booking" ? (
                      <div className="space-y-3">
                        {/* Disabled custom toggle element */}
                        <div className="flex justify-between items-center p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl opacity-60">
                          <span className="text-xs font-bold text-slate-700">
                            Market availability
                          </span>
                          <div className="w-10 h-6 bg-indigo-200 rounded-full flex items-center p-1 cursor-not-allowed">
                            <div className="w-4 h-4 bg-indigo-400 rounded-full shadow-md" />
                          </div>
                        </div>

                        {/* EXPOSITORY HELPER TEXT */}
                        <div className="p-3.5 bg-indigo-50/20 border border-indigo-100 rounded-2xl flex gap-2 items-start shadow-3xs">
                          <ShieldAlert className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                            You are currently assigned to an active caregiving
                            session. Your marketplace availability has been
                            automatically disabled until the session is
                            completed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Manual Active Toggle for non-occupied */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-150 rounded-2xl hover:bg-slate-100/50 transition-colors">
                          <span className="text-xs font-bold text-slate-700">
                            Available to Receive Contracts
                          </span>
                          <button
                            id="availability-manual-toggle"
                            type="button"
                            onClick={async () => {
                              const newVal = !manualAvailability;
                              setManualAvailability(newVal);
                              const uid = getActiveUserId();
                              if (!uid) return;
                              try {
                                const docRef = doc(db, "caregivers", uid);
                                await setDoc(
                                  docRef,
                                  {
                                    is_available: newVal,
                                    updated_at: new Date().toISOString(),
                                  },
                                  { merge: true },
                                );
                                if (onProfileUpdate) {
                                  onProfileUpdate();
                                }
                              } catch (err) {
                                console.warn(
                                  "Failed to save availability settings to Firestore:",
                                  err,
                                );
                              }
                            }}
                            className={`w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ${
                              manualAvailability
                                ? "bg-sky-500 justify-end"
                                : "bg-slate-300 justify-start"
                            }`}
                          >
                            <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                          </button>
                        </div>
                        {/* <p className="text-[11px] text-slate-450 leading-relaxed font-semibold">
                          Turn this off when you are busy with university
                          examinations and wish to hide your card from the
                          search results index in Dhaka neighborhoods.
                        </p> */}
                      </div>
                    )}
                  </div>

                  {/* Programmatic student guidelines rulebook */}
                  {/* <div className="bg-sky-50/45 border border-sky-100 rounded-3xl p-5 space-y-3">
                    <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sky-500 animate-pulse" />
                      <span>CareBridge Code of Conduct</span>
                    </h4>
                    <p className="text-[11px] text-slate-550 leading-released leading-relaxed font-semibold">
                      To safeguard your student caregiver status at Dhaka, you
                      must wear your university ID during shifts and maintain
                      log notes regularly inside the portal.
                    </p>
                  </div> */}
                </div>
              </div>
            </div>
          ) : activeTab === "bookings" ? (
            /* ==================== B. MY BOOKINGS PAGE ==================== */
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                    My Booking Reservations
                  </h2>
                  {/* <p className="text-slate-450 text-xs">
                    Access historic, scheduled and current shift assignments.
                  </p> */}
                </div>

                {/* Tab selectors */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-150">
                  {(["Active", "Upcoming", "Completed"] as const).map((tab) => (
                    <button
                      key={tab}
                      id={`booking-subtab-${tab.toLowerCase()}`}
                      onClick={() => setBookingsFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        bookingsFilter === tab
                          ? "bg-white text-sky-600 shadow-3xs"
                          : "text-slate-550 hover:text-slate-800"
                      }`}
                    >
                      {tab} (
                      {simulatedBookings.filter((b) => b.status === tab).length}
                      )
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingBookings ? (
                /* SKELETON CARDS */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      className="bg-white border border-slate-100 rounded-2xl p-6 space-y-3 animate-pulse"
                    >
                      <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                      <div className="h-10 bg-slate-50 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : simulatedBookings.filter((b) => b.status === bookingsFilter)
                  .length === 0 ? (
                /* EMPTY STATE FOR BOOKING TAB */
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-3xs">
                  <div className="inline-flex p-3 rounded-full bg-slate-50 text-slate-400 border border-slate-100/50">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-bold text-slate-700">
                    No {bookingsFilter} Bookings Found
                  </h3>
                  {/* <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
                    You currently have no reservation items marked under{" "}
                    {bookingsFilter} status on CareBridge.
                  </p> */}
                </div>
              ) : (
                /* POPULATED STRUCTURE */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {simulatedBookings
                    .filter((b) => b.status === bookingsFilter)
                    .map((b) => (
                      <div
                        key={b.id}
                        className={`bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs hover:shadow-xs transition-shadow space-y-4 relative overflow-hidden`}
                      >
                        {/* Highlight border for active booking */}
                        {b.status === "Active" && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold block">
                              {b.id}
                            </span>
                            <h4 className="font-display font-extrabold text-slate-900 text-base">
                              {b.elderName}
                            </h4>
                            <span className="text-[11px] text-slate-455 block font-semibold">
                              {b.address}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === "Active"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : b.status === "Upcoming"
                                  ? "bg-yellow-50 text-yellow-600 border border-yellow-100"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-150 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Booking Date
                            </span>
                            <span className="text-slate-800">
                              {b.startDate} to {b.endDate}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Hour duration
                            </span>
                            <span className="text-slate-800">
                              {b.durationHours} hrs / day standard
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Hourly Standard Fee
                            </span>
                            <span className="text-slate-800">
                              ৳{b.hourlyRate} BDT / hr
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">
                              Est Client payout
                            </span>
                            <span className="text-emerald-600 font-bold">
                              ৳{b.totalEarnings} BDT
                            </span>
                          </div>
                        </div>

                        {b.notes && (
                          <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200/50 text-xs space-y-0.5">
                            <span className="text-amber-805 text-amber-800 uppercase text-[9px] font-bold block">
                              Special Care Bedside Instructions
                            </span>
                            <p className="font-semibold text-amber-900 text-[10.5px] italic leading-relaxed">
                              "{b.notes}"
                            </p>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end gap-2.5">
                          {b.status === "Upcoming" && (
                            <button
                              id={`start-session-btn-${b.id}`}
                              onClick={() => handleStartSession(b.id)}
                              className="px-4 py-2 bg-emerald-550 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all active:scale-98 shadow-3xs"
                            >
                              Start session right now
                            </button>
                          )}
                          <button
                            id={`view-booking-details-${b.id}`}
                            onClick={() => setSelectedBookingId(b.id)}
                            className="px-4 py-2 bg-sky-50 bg-sky-50 text-sky-600 hover:bg-sky-100 font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                          >
                            View Full Details & Timeline
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : activeTab === "logs" ? (
            /* ==================== C. SHIFT LOGS SCREEN ==================== */
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                  Real-time Shift Updates
                </h2>
                {/* <p className="text-slate-450 text-xs">
                  Submit ongoing nursing and companionship updates for assigned
                  relative monitoring.
                </p> */}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submit log form */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                  <h3 className="font-display font-bold text-slate-900 text-base border-l-2 border-indigo-500 pl-2 uppercase tracking-wide">
                    Add Real-time Log Update
                  </h3>

                  {activeBooking ? (
                    <form
                      onSubmit={handleAddLog}
                      className="space-y-4 text-xs font-semibold text-slate-700"
                    >
                      <div className="space-y-1.5">
                        <label className="block">Patient Focus Context</label>
                        <input
                          type="text"
                          readOnly
                          value={
                            activeBooking.elderName +
                            ` (Active Cycle: ${activeBooking.id})`
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-bold outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">Timestamp (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 02:45 PM or leave empty for Current time"
                          value={logTime}
                          onChange={(e) => setLogTime(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">
                          Shift log details / Medication summary
                        </label>
                        <textarea
                          rows={4}
                          required
                          placeholder="What tasks did you finish? e.g. Assisted with insulin dose, served warm diet lunch, monitored afternoon nap..."
                          value={logText}
                          onChange={(e) => setLogText(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden leading-relaxed"
                        />
                      </div>

                      <button
                        id="submit-log-btn"
                        type="button"
                        onClick={handleAddLog}
                        className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold uppercase tracking-wider text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-97 flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle className="h-4.5 w-4.5" />
                        <span>Post Real-time Log</span>
                      </button>
                    </form>
                  ) : (
                    <div className="p-5 text-center bg-slate-50 border border-slate-150 rounded-2xl space-y-2 text-slate-500 leading-relaxed font-semibold">
                      <AlertCircle className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-xs max-w-xs mx-auto">
                        Log posting is enabled only when you are currently
                        checked-in on an active clinical elder contract.
                      </p>
                    </div>
                  )}
                </div>

                {/* Today's Shift Logs timeline */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-display font-bold text-slate-900 text-base uppercase tracking-wide">
                      Realtime Shift Logs Timeline Today
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {activeShiftLogs.length} logged
                    </span>
                  </div>

                  {activeShiftLogs.length === 0 ? (
                    <div
                      className="p-12 text-center text-slate-450 space-y-3.5"
                      id="empty-shift-logs-container"
                    >
                      <div className="h-10 w-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100/50">
                        <Activity className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold">
                        No records reported today. Real-time updates posted will
                        appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-4 border-l border-indigo-150 space-y-6 text-xs">
                      {activeShiftLogs.map((log) => (
                        <div key={log.id} className="relative group">
                          {/* Indicator pin */}
                          <div className="absolute -left-[20.5px] top-1.5 h-3 w-3 rounded-full bg-sky-500 ring-4 ring-sky-100/50 border border-white" />
                          <div className="space-y-1 bg-slate-50/40 border border-slate-150 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[10px] font-bold text-sky-655 bg-sky-50 rounded-md px-2 py-0.5">
                                {log.time}
                              </span>
                              <button
                                onClick={() => handleDeleteLogDoc(log.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Log"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-slate-700 leading-relaxed font-semibold pr-3 pt-1">
                              {log.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Informational footer for rel-monitoring logs */}
                  {/* <div className="p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl flex gap-2 items-start text-[10.5px] text-yellow-800 leading-relaxed font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
                    <span>
                      These real-time logs bypass processing delay and route
                      directly to the relative's{" "}
                      <strong>"Today's Realtime Shift Logs"</strong> panel for
                      immediate telemetry tracking.
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
          ) : activeTab === "earnings" ? (
            /* ==================== D. EARNINGS DASHBOARD ==================== */
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                  Caregiver Earnings Summary
                </h2>
                {/* <p className="text-slate-450 text-xs">
                  Track clinical stipend disbursements and pending shift
                  payouts.
                </p> */}
              </div>

              {/* KPI STATS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs space-y-2">
                  <span className="text-slate-450 text-[10px] font-bold uppercase block">
                    This Week Earnings
                  </span>
                  <span className="font-display font-extrabold text-2xl text-slate-950">
                    ৳{isDemoCaregiver ? "2,100" : totalCompletedEarnings} BDT
                  </span>
                  <span className="block text-[10px] text-emerald-500 font-bold">
                    {isDemoCaregiver
                      ? "1"
                      : simulatedBookings.filter(
                          (b) => b.status === "Completed",
                        ).length}{" "}
                    shift cycle
                    {!isDemoCaregiver &&
                    simulatedBookings.filter((b) => b.status === "Completed")
                      .length !== 1
                      ? "s"
                      : ""}{" "}
                    processed
                  </span>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs space-y-2">
                  <span className="text-slate-450 text-[10px] font-bold uppercase block">
                    This Month Earnings
                  </span>
                  <span className="font-display font-extrabold text-2xl text-slate-950">
                    ৳
                    {isDemoCaregiver
                      ? totalCompletedEarnings +
                        (activeBooking ? activeBooking.totalEarnings : 0)
                      : totalCompletedEarnings}{" "}
                    BDT
                  </span>
                  <span className="block text-[10px] text-sky-500 font-bold">
                    Includes clinical hourly hours
                  </span>
                </div>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs space-y-2">
                  <span className="text-slate-450 text-[10px] font-bold uppercase block">
                    Lifetime Earnings
                  </span>
                  <span className="font-display font-extrabold text-2xl text-emerald-600">
                    ৳
                    {isDemoCaregiver
                      ? totalCompletedEarnings + 24500
                      : totalCompletedEarnings}{" "}
                    BDT
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {!isDemoCaregiver && totalCompletedEarnings === 0
                      ? "No payouts processed yet"
                      : "Transferred safely to BKash wallet"}
                  </span>
                </div>
              </div>

              {/* CHART CONTAINERS (PLACEHOLDERS ONLY FOR RECHARTS SUPPORT) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekly Bar Chart container skeleton */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                  <h3 className="font-display font-bold text-slate-800 text-sm uppercase tracking-wide border-l-2 border-sky-400 pl-2">
                    Weekly Earnings Bar Chart
                  </h3>

                  {/* Visual SVG Placeholder indicating future Recharts placement */}
                  <div className="h-48 bg-slate-50 rounded-2xl relative border border-slate-150 flex items-center justify-center p-4">
                    <div className="absolute inset-x-4 bottom-6 top-8 flex justify-around items-end">
                      {/* simulate chart columns using pure tailwind scale with zero fake data */}
                      {isDemoCaregiver || totalCompletedEarnings > 0 ? (
                        <>
                          <div className="w-1/12 bg-sky-200 rounded-t-md h-[40%] transition-all hover:bg-sky-500 relative group">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none whitespace-nowrap">
                              ৳3,500
                            </span>
                          </div>
                          <div className="w-1/12 bg-sky-200 rounded-t-md h-[65%] transition-all hover:bg-sky-500 relative group">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none whitespace-nowrap">
                              ৳5,250
                            </span>
                          </div>
                          <div className="w-1/12 bg-sky-200 rounded-t-md h-[20%] transition-all hover:bg-sky-500 relative group">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none whitespace-nowrap">
                              ৳1,500
                            </span>
                          </div>
                          <div className="w-1/12 bg-sky-250 bg-sky-300 rounded-t-md h-[80%] transition-all hover:bg-sky-500 relative group">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none whitespace-nowrap">
                              ৳7,200
                            </span>
                          </div>
                          <div className="w-1/12 bg-sky-200 rounded-t-md h-[55%] transition-all hover:bg-sky-500 relative group">
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none whitespace-nowrap">
                              ৳4,800
                            </span>
                          </div>
                        </>
                      ) : null}
                      <div className="w-1/12 bg-sky-100 rounded-t-md h-[10%] transition-all hover:opacity-60 relative"></div>
                      <div className="w-1/12 bg-sky-100 rounded-t-md h-[10%] transition-all hover:opacity-60 relative"></div>
                    </div>
                    {/* chart labels */}
                    <div className="absolute bottom-1.5 inset-x-4 flex justify-around text-[9px] font-mono text-slate-400 font-bold">
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                    </div>

                    <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center space-y-1.5">
                      <TrendingUp className="h-5 w-5 text-sky-500" />
                      <p className="text-[11px] font-bold text-slate-700">
                        Recharts Container Anchor
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {!isDemoCaregiver && totalCompletedEarnings === 0
                          ? "No student earnings recorded yet."
                          : "Aggregated student earnings analytics charts map here."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Monthly Bar Chart container skeleton */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-4">
                  <h3 className="font-display font-bold text-slate-800 text-sm uppercase tracking-wide border-l-2 border-indigo-400 pl-2">
                    Monthly Earnings Bar Chart
                  </h3>

                  <div className="h-48 bg-slate-50 rounded-2xl relative border border-slate-150 flex items-center justify-center p-4">
                    <div className="absolute inset-x-4 bottom-6 top-8 flex justify-around items-end">
                      {isDemoCaregiver || totalCompletedEarnings > 0 ? (
                        <>
                          <div className="w-1/12 bg-indigo-200 rounded-t-md h-[50%]"></div>
                          <div className="w-1/12 bg-indigo-200 rounded-t-md h-[30%]"></div>
                          <div className="w-1/12 bg-indigo-300 rounded-t-md h-[75%]"></div>
                        </>
                      ) : null}
                      <div className="w-1/12 bg-indigo-100 rounded-t-md h-[10%]"></div>
                    </div>
                    <div className="absolute bottom-1.5 inset-x-4 flex justify-around text-[9px] font-mono text-slate-400 font-bold">
                      <span>Mar</span>
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>

                    <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center space-y-1.5">
                      <DollarSign className="h-5 w-5 text-indigo-500" />
                      <p className="text-[11px] font-bold text-slate-700">
                        Recharts Container Anchor
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {!isDemoCaregiver && totalCompletedEarnings === 0
                          ? "Weekly and monthly charts will activate with completed shifts."
                          : "Monthly breakdown reports will map into this placeholder."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational security bank notice */}
              {/* <div className="p-4 bg-slate-100/50 rounded-3xl border border-slate-200 flex gap-3 items-start text-xs text-slate-500 leading-relaxed shadow-3xs">
                <ShieldAlert className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <p className="font-bold text-slate-800">
                    Automatic Weekly Student Cashout
                  </p>
                  <p className="font-semibold">
                    CareBridge processes mobile banking stipends to local Bkash,
                    Nagad, or bank accounts every Thursday at 06:00 PM. No
                    manual action is required.
                  </p>
                </div>
              </div> */}
            </div>
          ) : activeTab === "reviews" ? (
            /* ==================== REVIEW & RATINGS PORTAL TAB ==================== */
            <div className="space-y-6 animate-fade-in text-xs font-semibold">
              <div>
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                  Reviews & Ratings Feedback
                </h2>
                {/* <p className="text-slate-450 text-xs">
                  Verify cumulative family comments, ratings status, and service
                  excellence indicators.
                </p> */}
              </div>

              {reviewsList.length === 0 ? (
                <div className="bg-white border border-slate-150 p-12 rounded-3xl shadow-3xs text-center space-y-4">
                  <Star className="h-10 w-10 text-slate-300 mx-auto" />
                  <h3 className="font-display font-extrabold text-slate-800 text-sm">
                    No reviews or ratings yet.
                  </h3>
                  {/* <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    The Reviews & Ratings section will remain empty until a
                    completed booking receives an actual review submission from
                    a relative.
                  </p> */}
                </div>
              ) : (
                <>
                  {/* A. Statistics Widget */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* 1. Rating Meter */}
                    <div className="bg-white border text-center p-6 rounded-3xl shadow-3xs space-y-2 flex flex-col justify-center border-slate-150 border-slate-150">
                      <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">
                        Average Star Rating
                      </span>
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <span className="text-3xl font-black text-slate-900 font-mono">
                          {(
                            reviewsList.reduce((acc, r) => acc + r.rating, 0) /
                            reviewsList.length
                          ).toFixed(1)}
                        </span>
                        <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="flex items-center justify-center gap-0.5 text-amber-500 text-xs">
                        {"★".repeat(
                          Math.round(
                            reviewsList.reduce((acc, r) => acc + r.rating, 0) /
                              reviewsList.length,
                          ),
                        )}
                        {"☆".repeat(
                          5 -
                            Math.round(
                              reviewsList.reduce(
                                (acc, r) => acc + r.rating,
                                0,
                              ) / reviewsList.length,
                            ),
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-light">
                        Calculated across verified jobs
                      </span>
                    </div>

                    {/* 2. Feedback Card */}
                    <div className="bg-white border text-center p-6 rounded-3xl shadow-3xs space-y-2 flex flex-col justify-center border-slate-150">
                      <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">
                        Total Written Feedbacks
                      </span>
                      <span className="text-3xl font-black text-slate-900 font-mono mt-2">
                        {reviewsList.length}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-light">
                        Submissions by relative liaisons
                      </span>
                    </div>

                    {/* 3. Rating Stars Distribution bar split */}
                    <div className="bg-white border p-6 rounded-3xl shadow-3xs space-y-2.5 col-span-1 md:col-span-2 text-left border-slate-150">
                      <span className="text-[9px] text-slate-400 uppercase font-black block tracking-widest leading-none">
                        Ratings Distribution Percentages
                      </span>
                      <div className="space-y-1.5 pt-1 text-[10px] text-slate-550 leading-relaxed font-bold">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = reviewsList.filter(
                            (r) => Math.round(r.rating) === stars,
                          ).length;
                          const percentage = (count / reviewsList.length) * 100;
                          return (
                            <div
                              key={stars}
                              className="flex items-center gap-2"
                            >
                              <span className="w-10 font-mono text-[10.5px] shrink-0 text-slate-600">
                                {stars} Stars
                              </span>
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="w-8 font-mono text-right shrink-0 text-[10px] text-slate-450">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* B. Core reviews list feed */}
                  <div className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 shadow-3xs space-y-5">
                    <h3 className="font-display font-extrabold text-slate-900 text-sm uppercase tracking-wide border-l-2 border-sky-400 pl-2">
                      Relative Feedbacks Feed
                    </h3>

                    <div className="space-y-4">
                      {reviewsList.map((review) => (
                        <div
                          key={review.id}
                          className="p-4 bg-slate-50/50 border rounded-2xl space-y-2.5 hover:border-slate-350 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">
                                {review.reviewerName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-light">
                                Session Reference: {review.booking_id}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-0.5 text-amber-500 text-[11px] justify-end">
                                {"★".repeat(review.rating)}
                                {"☆".repeat(5 - review.rating)}
                              </div>
                              <span className="text-[9px] text-slate-400 block font-light mt-1 font-mono">
                                {new Date(
                                  review.created_at,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {review.comment && (
                            <p className="italic text-slate-650 bg-white p-3 rounded-xl border-l-2 border-sky-400 text-[11px] leading-relaxed font-light font-sans">
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ==================== E. PROFILE SETTINGS SCREEN ==================== */
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
                  Profile Settings
                </h2>
                {/* <p className="text-slate-450 text-xs">
                  Manage personal details, hourly rate, and expertise
                  credentials.
                </p> */}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Input Columns (Left/Middle) */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-6">
                  {/* Alert success banner */}
                  {saveSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-2xl flex gap-2 items-center text-emerald-800 text-xs font-semibold animate-fade-in">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                      <span>
                        Your profile credentials updated successfully! Changes
                        made are cached in preview memory.
                      </span>
                    </div>
                  )}

                  {/* Personal Information section */}
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-slate-950 text-sm uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      1. Personal Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                      <div className="space-y-1.5">
                        <label className="block">Full Name</label>
                        <input
                          type="text"
                          value={profName}
                          onChange={(e) => setProfName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">
                          Dhaka Neighborhood / Care site
                        </label>
                        <input
                          type="text"
                          value={profArea}
                          onChange={(e) => setProfArea(e.target.value)}
                          placeholder="e.g. Dhanmondi, Dhaka"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">Educational Email</label>
                        <input
                          type="email"
                          value={profEmail}
                          onChange={(e) => setProfEmail(e.target.value)}
                          className={`w-full bg-slate-50 border focus:bg-white rounded-xl px-3 py-2.5 outline-hidden ${
                            profileEmailIsValid
                              ? "border-slate-200 focus:border-sky-500"
                              : "border-rose-300 focus:border-rose-500"
                          }`}
                        />
                        {/* EMAIL VALIDATION UI FEEDBACK */}
                        {/* <div className="mt-1">
                          {profileEmailIsValid ? (
                            <span className="text-[10px] font-bold text-emerald-600 block">
                              ✓ Valid institutional student domain (Extracted
                              University: {profUniversity})
                            </span>
                          ) : (
                            <div className="space-y-1 mt-1 text-[10px] font-semibold">
                              <span className="text-rose-600 block">
                                ❌ Invalid caregiver domain format. Rejected
                                caregiver emails: user@student.edu.bd,
                                user@edu.bd.
                              </span>
                              <span className="text-slate-400 block font-light leading-relaxed">
                                Eligible student domain format required: e.g.
                                user@du.student.edu.bd, user@nsu.student.edu.bd
                              </span>
                            </div>
                          )}
                        </div> */}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">University</label>
                        <input
                          type="text"
                          value={profUniversity}
                          onChange={(e) => setProfUniversity(e.target.value)}
                          placeholder="e.g. Dhaka University"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                        {/* <select
                          value={profUniversity}
                          onChange={(e) => setProfUniversity(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-hidden"
                        >
                          <option value="Dhaka University">
                            Dhaka University (DU)
                          </option>
                          <option value="North South University">
                            North South University (NSU)
                          </option>
                          <option value="Independent University, Bangladesh">
                            Independent University, Bangladesh (IUB)
                          </option>
                          <option value="BUET">BUET</option>
                          <option value="Brac University">
                            Brac University
                          </option>
                          <option value="Other">
                            Other Verified Institution
                          </option>
                        </select> */}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">
                          Liaison Contact Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profPhone}
                          onChange={(e) => setProfPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">Gender</label>
                        <select
                          value={profGender}
                          onChange={(e) =>
                            setProfGender(e.target.value as "Male" | "Female")
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-hidden font-semibold text-slate-700 text-xs"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Professional information section */}
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-slate-950 text-sm uppercase tracking-wider border-b border-slate-100 pb-1.5">
                      2. Professional Credentials & Hourly standard
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                      <div className="space-y-1.5">
                        <label className="block">
                          My Hourly Rate (৳ BDT / hr)
                        </label>
                        <input
                          type="number"
                          value={profRate}
                          onChange={(e) => setProfRate(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block">
                          Clinical Expertise Specialty
                        </label>
                        <select
                          value={profExpertise}
                          onChange={(e) => setProfExpertise(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-hidden"
                        >
                          <option value="Post-Stroke Rehabilitation">
                            Post-Stroke Rehabilitation
                          </option>
                          <option value="Clinical Eldercare">
                            Clinical Eldercare
                          </option>
                          <option value="Alzheimer's Memory Assist">
                            Alzheimer's Memory Assist
                          </option>
                          <option value="Post-Surgical Companion Care">
                            Post-Surgical Companion Care
                          </option>
                          <option value="Post-Stroke Rehabilitation">
                            Post-Stroke Rehabilitation
                          </option>
                          <option value="Post-operative Recovery">
                            Post-operative Recovery
                          </option>
                          <option value="Physiotherapy & Mobility">
                            Physiotherapy & Mobility
                          </option>
                          <option value="Diabetes Maintenance">
                            Diabetes Maintenance
                          </option>
                          <option value="Dementia Care">Dementia Care</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block">
                          Professional Bio description
                        </label>
                        <textarea
                          rows={3}
                          value={profBio}
                          onChange={(e) => setProfBio(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2.5 outline-hidden leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save action button */}
                  <div className="pt-2">
                    <button
                      id="save-caregiver-settings-btn"
                      onClick={async () => {
                        const uid = getActiveUserId();
                        if (!uid) {
                          alert("No active session detected.");
                          return;
                        }
                        try {
                          const docRef = doc(db, "caregivers", uid);
                          await setDoc(
                            docRef,
                            {
                              id: uid,
                              full_name: profName,
                              email: profEmail,
                              phone: profPhone,
                              area: profArea,
                              hourly_rate: profRate,
                              expertise: profExpertise,
                              bio: profBio,
                              gender: profGender,
                              is_available: manualAvailability,
                              updated_at: new Date().toISOString(),
                            },
                            { merge: true },
                          );

                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 3000);

                          if (onProfileUpdate) {
                            onProfileUpdate();
                          }
                        } catch (err) {
                          console.error(
                            "Failed to save caregiver settings:",
                            err,
                          );
                          alert("Failed to save changes to the database.");
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                {/* Settings Column Rights: Availability Sync settings */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wide border-l-2 border-indigo-500 pl-2">
                      Availability Settings
                    </h3>
                    {/* <p className="text-slate-450 text-[11px] leading-relaxed">
                      Toggle whether your profile card should show up on client directories in Dhaka.
                    </p> */}
                  </div>

                  {caregiverStatus === "Occupied With Active Booking" ? (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11.5px] text-indigo-950 leading-relaxed font-semibold">
                      <AlertCircle className="h-5 w-5 text-indigo-500 mb-2" />
                      <span>
                        You are currently assigned to an active caregiving
                        session. Your marketplace availability has been
                        automatically disabled until the session is completed.
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-bold text-slate-700">
                      <span>Show in Marketplace</span>
                      <button
                        onClick={async () => {
                          const newVal = !manualAvailability;
                          setManualAvailability(newVal);
                          const uid = getActiveUserId();
                          if (!uid) return;
                          try {
                            const docRef = doc(db, "caregivers", uid);
                            await setDoc(
                              docRef,
                              {
                                is_available: newVal,
                                updated_at: new Date().toISOString(),
                              },
                              { merge: true },
                            );
                            if (onProfileUpdate) {
                              onProfileUpdate();
                            }
                          } catch (err) {
                            console.warn(
                              "Failed to save availability settings to Firestore:",
                              err,
                            );
                          }
                        }}
                        className={`w-11 h-6 rounded-full flex items-center p-1 transition-all duration-300 ${
                          manualAvailability
                            ? "bg-sky-500 justify-end"
                            : "bg-slate-300 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </button>
                    </div>
                  )}

                  {/* <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex gap-2.5 items-start text-[11px] text-slate-450 leading-relaxed font-semibold">
                    <Power className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Disabling availability temporarily unlists your card from public directories while keeping ongoing appointments unaffected.
                    </span>
                  </div> */}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== CONFIRMATION MODAL (BOOKING COMPLETION FLOW) ==================== */}
      {showCompleteModal && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          id="shift-complete-confirmation-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shift-complete-title"
        >
          <div className="bg-white rounded-3xl border border-slate-150 p-6 sm:p-8 max-w-md w-full space-y-6 text-center animate-scale-up">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-3xs border border-emerald-100">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3
                id="shift-complete-title"
                className="font-display font-extrabold text-xl text-slate-900"
              >
                Confirm Shift Completion?
              </h3>
              <p className="text-xs text-slate-455 leading-relaxed max-w-xs mx-auto">
                By marking booking{" "}
                <strong className="text-slate-800">{showCompleteModal}</strong>{" "}
                completed:
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3.5 text-xs text-left text-slate-650 font-semibold leading-relaxed">
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  The booking reservation is marked officially{" "}
                  <strong>Completed</strong>.
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Caregiver availability returns instantly to{" "}
                  <strong>Available</strong>.
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Your profile card becomes fully <strong>Discoverable</strong>{" "}
                  again on Dhaka directories.
                </span>
              </div>
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Stipend earnings will reflect the completed booking amount
                  safely.
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="cancel-complete-flow"
                onClick={() => setShowCompleteModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                No, Dismiss
              </button>
              <button
                id="confirm-complete-flow"
                onClick={() => confirmMarkShiftComplete(showCompleteModal)}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer active:scale-97"
              >
                Yes, Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
