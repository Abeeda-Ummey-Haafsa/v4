/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import {
  Users,
  MapPin,
  Clock,
  Search,
  HeartHandshake,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  Award,
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Activity,
  HeartPulse,
  Sparkle,
  PhoneCall,
  Lock,
  Printer,
  CalendarDays,
} from "lucide-react";
import { auth, getActiveUserId, db } from "./lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import {
  AppView,
  Caregiver,
  ElderProfile,
  Booking,
  SearchFilters,
} from "./types";
import { DHAKA_LOCATIONS, CARE_TYPES } from "./data";
import {
  cancelBooking,
  getBookingsByRelative,
} from "./services/bookingService";
import { createElder, getElders } from "./services/elderService";
import { getAllCaregivers } from "./services/caregiverService";
import { seedCaregivers, seedAdminAccount } from "./services/seedService";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { CaregiverCard } from "./components/CaregiverCard";
import { ElderProfileForm } from "./components/ElderProfileForm";
import { BookingForm } from "./components/BookingForm";
import { AuthForms } from "./components/AuthForms";
import { Dashboard } from "./components/Dashboard";
import { RelativePortal } from "./components/RelativePortal";
import { CaregiverPortal } from "./components/CaregiverPortal";
import { AdminDashboard } from "./components/AdminDashboard";
import { isValidCaregiverEmail } from "./types";

const heroImage = "/src/assets/images/caregiver_hero_1780419152980.png";

export default function App() {
  // Navigation & Simulation State
  const [currentView, setView] = useState<AppView>("home");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<"relative" | "caregiver" | "admin">(
    "relative",
  );
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [pendingBookingCaregiver, setPendingBookingCaregiver] =
    useState<Caregiver | null>(null);
  const [selectedElder, setSelectedElder] = useState<ElderProfile | null>(null);

  // Data State
  const [elderProfiles, setElderProfiles] = useState<ElderProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(
    null,
  );

  // Search state
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    careType: "",
    gender: "All",
  });

  // UI Flow States
  const [isSubmittingBooking, setIsSubmittingBooking] =
    useState<boolean>(false);
  const [activeSuccessBooking, setActiveSuccessBooking] =
    useState<Booking | null>(null);
  const [showElderForm, setShowElderForm] = useState<boolean>(false);

  const currentActiveUserId = getActiveUserId();

  // Quick navigation helper
  const handleFeaturedLocationClick = (location: string) => {
    setFilters({
      location: location,
      careType: "",
      gender: "All",
    });
    setView("search");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Auth Handlers
  const handleAuthSuccess = async (name: string) => {
    setAuthLoading(true);
    setIsLoggedIn(true);
    setUserName(name);

    const email =
      auth.currentUser?.email || localStorage.getItem("cb_auth_email") || "";
    setUserEmail(email);

    try {
      const uid =
        auth.currentUser?.uid ||
        localStorage.getItem("cb_auth_uid") ||
        "fb_" + name.replace(/\s+/g, "_").toLowerCase();
      let roleDetermined: "admin" | "caregiver" | "relative" = "relative";
      let suspendedDetermined = false;

      if (email === "admin@example.com") {
        roleDetermined = "admin";
      } else {
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          roleDetermined =
            (data.role as any) ||
            (isValidCaregiverEmail(email) ? "caregiver" : "relative");
          suspendedDetermined = data.status === "suspended";
        } else {
          const cgDocRef = doc(db, "caregivers", uid);
          const cgSnap = await getDoc(cgDocRef);
          if (cgSnap.exists()) {
            const data = cgSnap.data();
            roleDetermined = (data.role as any) || "caregiver";
            suspendedDetermined = data.status === "suspended";
          } else {
            roleDetermined = isValidCaregiverEmail(email)
              ? "caregiver"
              : "relative";
          }
        }
      }

      setUserRole(roleDetermined);
      setIsSuspended(suspendedDetermined);

      if (suspendedDetermined) {
        alert(
          "This account has been suspended by an Administrator. Logging out.",
        );
        handleLogout();
        setAuthLoading(false);
        return;
      }

      if (roleDetermined === "admin") {
        setView("admin-dashboard");
      } else if (roleDetermined === "caregiver") {
        setView("caregiver-portal");
      } else {
        if (pendingBookingCaregiver) {
          setSelectedCaregiver(pendingBookingCaregiver);
          setPendingBookingCaregiver(null);
          setView("search");
        } else if (selectedCaregiver) {
          setView("search");
        } else {
          setView("bookings");
        }
      }
    } catch (err) {
      console.error("Error resolving successful auth role:", err);
      const isCg = isValidCaregiverEmail(email);
      setUserRole(isCg ? "caregiver" : "relative");
      setView(isCg ? "caregiver-portal" : "bookings");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Failed to sign out from Firebase Auth:", err);
    }
    localStorage.removeItem("cb_auth_fallback");
    localStorage.removeItem("cb_auth_uid");
    localStorage.removeItem("cb_auth_email");
    setIsLoggedIn(false);
    setUserName("");
    setUserEmail("");
    setUserRole("relative");
    setView("home");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        const name = user.displayName || user.email?.split("@")[0] || "User";
        const email = user.email || "";
        setIsLoggedIn(true);
        setUserName(name);
        setUserEmail(email);

        // Fetch user from Firestore to get role & suspended status
        try {
          const uid = user.uid;
          let roleDetermined: "admin" | "caregiver" | "relative" = "relative";
          let suspendedDetermined = false;

          if (email === "admin@example.com") {
            roleDetermined = "admin";
          } else {
            const userDocRef = doc(db, "users", uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              roleDetermined =
                (data.role as any) ||
                (isValidCaregiverEmail(email) ? "caregiver" : "relative");
              suspendedDetermined = data.status === "suspended";
            } else {
              const cgDocRef = doc(db, "caregivers", uid);
              const cgSnap = await getDoc(cgDocRef);
              if (cgSnap.exists()) {
                const data = cgSnap.data();
                roleDetermined = (data.role as any) || "caregiver";
                suspendedDetermined = data.status === "suspended";
              } else {
                roleDetermined = isValidCaregiverEmail(email)
                  ? "caregiver"
                  : "relative";
              }
            }
          }

          setUserRole(roleDetermined);
          setIsSuspended(suspendedDetermined);

          if (roleDetermined === "admin") {
            setView("admin-dashboard");
          } else if (roleDetermined === "caregiver") {
            setView("caregiver-portal");
          } else {
            // Keep default view if already somewhere else, otherwise bookings
            if (
              currentView === "home" ||
              currentView === "login" ||
              currentView === "register"
            ) {
              setView("bookings");
            }
          }
        } catch (err) {
          console.error("Error resolving user role on state change:", err);
          const isCg = isValidCaregiverEmail(email);
          setUserRole(isCg ? "caregiver" : "relative");
          if (isCg) setView("caregiver-portal");
        }
      } else {
        const fallbackName = localStorage.getItem("cb_auth_fallback");
        const fallbackEmail = localStorage.getItem("cb_auth_email") || "";
        if (fallbackName) {
          setIsLoggedIn(true);
          setUserName(fallbackName);
          setUserEmail(fallbackEmail);

          try {
            const fallbackUid =
              localStorage.getItem("cb_auth_uid") ||
              "fb_" + fallbackName.replace(/\s+/g, "_").toLowerCase();
            let roleDetermined: "admin" | "caregiver" | "relative" = "relative";
            let suspendedDetermined = false;

            if (fallbackEmail === "admin@example.com") {
              roleDetermined = "admin";
            } else {
              const userDocRef = doc(db, "users", fallbackUid);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                roleDetermined =
                  (data.role as any) ||
                  (isValidCaregiverEmail(fallbackEmail)
                    ? "caregiver"
                    : "relative");
                suspendedDetermined = data.status === "suspended";
              } else {
                const cgDocRef = doc(db, "caregivers", fallbackUid);
                const cgSnap = await getDoc(cgDocRef);
                if (cgSnap.exists()) {
                  const data = cgSnap.data();
                  roleDetermined = (data.role as any) || "caregiver";
                  suspendedDetermined = data.status === "suspended";
                } else {
                  roleDetermined = isValidCaregiverEmail(fallbackEmail)
                    ? "caregiver"
                    : "relative";
                }
              }
            }

            setUserRole(roleDetermined);
            setIsSuspended(suspendedDetermined);

            if (roleDetermined === "admin") {
              setView("admin-dashboard");
            } else if (roleDetermined === "caregiver") {
              setView("caregiver-portal");
            } else {
              if (
                currentView === "home" ||
                currentView === "login" ||
                currentView === "register"
              ) {
                setView("bookings");
              }
            }
          } catch (err) {
            console.error("Error resolving fallback user role:", err);
            const isCg = isValidCaregiverEmail(fallbackEmail);
            setUserRole(isCg ? "caregiver" : "relative");
            if (isCg) setView("caregiver-portal");
          }
        } else {
          setIsLoggedIn(false);
          setUserName("");
          setUserEmail("");
          setUserRole("relative");
          setIsSuspended(false);
          setView("home");
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Hydrate elder profiles and bookings automatically on login state changes or page reload
  useEffect(() => {
    const loadUserData = async () => {
      const uid = getActiveUserId();
      if (isLoggedIn && uid) {
        try {
          // 1. Fetch live elders from DB
          const liveElders = await getElders(uid);
          const mappedElders: ElderProfile[] = liveElders.map((e: any) => ({
            id: e.id,
            name: e.full_name,
            age: e.age ?? 76,
            dob: e.created_at ? e.created_at.split("T")[0] : "1950-01-01",
            gender:
              e.gender === "Male" || e.gender === "Female" ? e.gender : "Male",
            phoneNumber: e.phone ?? "",
            address: e.address ?? "",
            location: e.area ?? "Dhanmondi",
            latitude: e.latitude ?? 23.7461,
            longitude: e.longitude ?? 90.3742,
            medicalConditions: e.medical_conditions
              ? e.medical_conditions.split(", ")
              : [],
            allergies: e.allergies ?? "None",
            mobilityLevel:
              e.mobility_level === "independent"
                ? "Independent"
                : e.mobility_level === "assisted"
                  ? "Assisted Walking"
                  : "Wheelchair Bound",
            emergencyContactName: e.emergency_contact_name ?? "",
            emergencyContactPhone: e.emergency_contact_phone ?? "",
            keyInstructions: e.allergies || "",
          }));
          setElderProfiles(mappedElders);
          if (mappedElders.length > 0) {
            setSelectedElder(mappedElders[0]);
          }

          // 2. Fetch live bookings from DB
          const liveBookings = await getBookingsByRelative(uid);
          const mappedBookings: Booking[] = liveBookings.map((b: any) => ({
            id: b.id,
            caregiverId: b.caregiver_id || "",
            elderProfileId: b.elder_id || "",
            startDate: b.start_time ? b.start_time.split("T")[0] : "2026-06-04",
            endDate: b.end_time ? b.end_time.split("T")[0] : "2026-06-05",
            hoursPerDay: b.hours ? Math.round(b.hours) : 4,
            totalCost: b.total_amount || 0,
            notes: b.care_instructions || "",
            status:
              b.status === "active" || b.status === "Active"
                ? "Active"
                : b.status === "confirmed"
                  ? "Confirmed"
                  : b.status === "completed"
                    ? "Completed"
                    : b.status === "cancelled"
                      ? "Cancelled"
                      : "Pending",
            createdAt: b.created_at || new Date().toISOString(),
            reportStatus: {
              medicineSupplied: b.status === "completed",
              mealsTaken: true,
              exerciseDone: b.status === "completed",
              sleepHours: b.status === "completed" ? 8 : 0,
              activityNotes:
                b.status === "completed"
                  ? "Pre-medication checklists fully ticked."
                  : "Caregiver has reviewed the medical profile. Outlining nursing shift schedule.",
            },
          }));
          setBookings(mappedBookings);
        } catch (err) {
          console.error("Failed to fetch user data on login/refresh:", err);
        }
      } else {
        setElderProfiles([]);
        setBookings([]);
        setSelectedElder(null);
      }
    };
    loadUserData();
  }, [isLoggedIn, currentActiveUserId]);

  // Load available caregivers from Firebase (including programmatic seed if empty)
  const handleRefreshCaregivers = async () => {
    try {
      await seedAdminAccount();
    } catch (e) {
      console.warn("Could not seed system admin credentials:", e);
    }
    try {
      await seedCaregivers();
      const list = await getAllCaregivers();
      setCaregivers(mapCaregivers(list));
    } catch (err) {
      console.error("Failed to load caregivers from Firebase:", err);
    }
  };

  useEffect(() => {
    handleRefreshCaregivers();
  }, []);

  // Helper to map DB Caregivers to frontend Caregiver interfaces
  const mapCaregivers = (dbList: any[]): Caregiver[] => {
    return dbList.map((cg) => {
      const isMale = cg.gender === "male" || cg.gender === "Male";
      return {
        id: cg.id,
        name: cg.full_name,
        age: 30, // Default mock info when metadata columns are omitted
        gender: isMale ? "Male" : "Female",
        experience: cg.experience_years ?? 5,
        rating: cg.rating,
        reviewsCount: cg.reviews_count ?? cg.reviewsCount ?? 0,
        ratePerHour: cg.hourly_rate ?? 300,
        location: cg.area || "Dhanmondi",
        photoUrl: cg.photo_url || "",
        specialties: cg.expertise ? [cg.expertise] : ["Clinical Eldercare"],
        languages: ["Bangla", "English"],
        bio:
          cg.bio ||
          "Certified senior nurse with specialized clinical training.",
        certification: cg.expertise
          ? `${cg.expertise} Specialist`
          : "Certified Clinical Assistant",
        available:
          cg.status === "suspended" ? false : (cg.is_available ?? true),
        status: cg.status || "active",
        email: cg.email || "",
      };
    });
  };

  // Elder Profile Handlers
  const handleSaveElder = async (newProfile: Omit<ElderProfile, "id">) => {
    try {
      const uid = getActiveUserId();
      if (!uid) {
        alert("Please log in to save elder profiles");
        return;
      }

      const dbElder = await createElder({
        relative_id: uid,
        full_name: newProfile.name,
        age: newProfile.age,
        gender: newProfile.gender.toLowerCase(),
        phone: newProfile.phoneNumber || newProfile.emergencyContactPhone,
        address: newProfile.address || newProfile.location + ", Dhaka",
        area: newProfile.location,
        city: "Dhaka",
        latitude: newProfile.gender === "Male" ? 23.75 : 23.76, // generic default coords
        longitude: 90.38,
        medical_conditions: newProfile.medicalConditions.join(", "),
        allergies: newProfile.keyInstructions,
        emergency_contact_name: newProfile.emergencyContactName,
        emergency_contact_phone: newProfile.emergencyContactPhone,
      });

      const profileWithId: ElderProfile = {
        id: dbElder.id,
        name: dbElder.full_name,
        age: dbElder.age ?? 75,
        dob: "1951-01-01",
        gender: dbElder.gender === "male" ? "Male" : "Female",
        phoneNumber: dbElder.phone || "+8801711122233",
        address: dbElder.address || "Road 4A, Dhanmondi R/A",
        location: dbElder.area || "Dhanmondi",
        latitude: dbElder.latitude ?? 23.75,
        longitude: dbElder.longitude ?? 90.38,
        medicalConditions: dbElder.medical_conditions
          ? dbElder.medical_conditions.split(", ")
          : [],
        allergies: "None",
        mobilityLevel: "Independent",
        emergencyContactName: dbElder.emergency_contact_name || "Relative Desk",
        emergencyContactPhone:
          dbElder.emergency_contact_phone || "+8801711122233",
        keyInstructions:
          dbElder.allergies || "Low-sodium diabetic dietary requirement.",
      };

      setElderProfiles((prev) => [profileWithId, ...prev]);
      setSelectedElder(profileWithId);
      setShowElderForm(false);
    } catch (err) {
      console.error("Error creating elder profile in Database:", err);
      alert("Failed to save elder profile to the live database.");
    }
  };

  // Booking Handlers
  const handleSelectCaregiver = (caregiver: Caregiver) => {
    if (!isLoggedIn) {
      setPendingBookingCaregiver(caregiver);
      setView("login");
      return;
    }
    setSelectedCaregiver(caregiver);
    if (!selectedElder && elderProfiles.length > 0) {
      setSelectedElder(elderProfiles[0]);
    }
  };

  useEffect(() => {
    if (!selectedElder && elderProfiles.length > 0) {
      setSelectedElder(elderProfiles[0]);
    }
  }, [elderProfiles, selectedElder]);

  const handleConfirmBookingDetails = (
    bookingData: Omit<Booking, "id" | "createdAt" | "status">,
  ) => {
    if (!isLoggedIn) {
      if (selectedCaregiver) {
        setPendingBookingCaregiver(selectedCaregiver);
      }
      setView("login");
      return;
    }
    setIsSubmittingBooking(true);

    // Simulate premium scheduler matching algorithms (2.5 seconds matching visual block)
    setTimeout(() => {
      const liveBooking: Booking = {
        ...bookingData,
        id: `book_${Date.now()}`,
        status: "Confirmed",
        createdAt: new Date().toISOString(),
        // populate high-fidelity live metrics
        reportStatus: {
          medicineSupplied: false,
          mealsTaken: true,
          exerciseDone: false,
          sleepHours: 0,
          activityNotes:
            "Caregiver has reviewed elder clinical history. Setting up transport to elderly patients coordinates.",
        },
      };

      setBookings((prev) => [liveBooking, ...prev]);
      setIsSubmittingBooking(false);
      setActiveSuccessBooking(liveBooking);
      setSelectedCaregiver(null); // Clear active item
    }, 2200);
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      console.error("DB cancel failed, updating local state only:", err);
    }
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "Cancelled" as const } : b,
      ),
    );
  };

  // Filtering Logic for Caregivers
  const filteredCaregivers = caregivers.filter((cg) => {
    const matchLoc =
      !filters.location ||
      cg.location.toLowerCase() === filters.location.toLowerCase();
    const matchSpec =
      !filters.careType || cg.specialties.includes(filters.careType);
    const matchGender =
      filters.gender === "All" || cg.gender === filters.gender;
    return matchLoc && matchSpec && matchGender;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
          <HeartPulse className="h-5 w-5 text-indigo-500 absolute animate-pulse animate-duration-1000" />
        </div>
        <p className="text-xs text-slate-400 font-bold font-mono tracking-wider uppercase">
          Verifying session credentials...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-950 via-violet-800 to-slate-950 text-slate-100">
      {/* 1. GLOBAL LAYOUT MODULE - STICKY RESPONSIVE HEADER */}
      <Navbar
        currentView={currentView}
        setView={(v) => {
          setView(v);
          setActiveSuccessBooking(null);
          setSelectedCaregiver(null);
        }}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onLoginClick={() => setView("login")}
        onRegisterClick={() => setView("register")}
        userName={userName}
        userRole={userRole}
      />

      {/* MAIN APPLICATION CONTAINER AREA - CONTENT SECTIONS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {/* SUBMITTING SCHEDULER MATCHING - SEVERE LOADING STATE FOR ELEVATED EXPERIENCE */}
        {isSubmittingBooking && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-blue-500/30 animate-fade-in">
              <div className="relative mx-auto h-20 w-20 flex items-center justify-center bg-blue-500/20 rounded-full text-blue-400">
                <HeartPulse className="h-10 w-10 text-blue-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl text-blue-100 tracking-tight">
                  Scheduling Caregiver
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Confirming national NID background verification clearances and
                  registering elder clinical history with caregiver standby
                  reserve.
                </p>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-[progress_2s_ease-in-out_infinite]"
                  style={{ width: "45%" }}
                />
              </div>
              <p className="text-[10px] uppercase font-mono font-bold text-blue-400 tracking-widest leading-none">
                Dhaka Medical Desk
              </p>
            </div>
          </div>
        )}

        {/* ==================== A. LANDING VIEW ==================== */}
        {currentView === "home" &&
          !activeSuccessBooking &&
          !selectedCaregiver && (
            <div className="space-y-16 py-4">
              {/* HERO BANNER SECTION */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white shadow-2xl border border-blue-500/20">
                {/* Layout for responsive spacing: Half content overlay, half image backdrop */}
                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
                  {/* Hero text overlay (7 Cols) */}
                  <div className="lg:col-span-7 flex flex-col justify-center p-8 sm:p-12 lg:p-16 space-y-6 bg-gradient-to-r from-blue-950 via-blue-950/95 to-slate-900/70 z-10">
                    <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight text-white">
                      Find trusted caregivers for your loved ones
                    </h1>

                    <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-xl">
                      Book certified caregivers near your elder’s location
                      anywhere in Dhaka (BDT ৳). Vetted backgrounds, 24/7
                      standby replacement guarantees.
                    </p>

                    <div className="flex flex-wrap gap-3.5 pt-2">
                      <button
                        id="hero-cta-search"
                        onClick={() => setView("search")}
                        className="px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <span>Find Vetted Caregivers</span>
                        <ArrowRight className="h-4.5 w-4.5 text-blue-100" />
                      </button>
                      <button
                        id="hero-cta-profile"
                        onClick={() => setView("elder-profiles")}
                        className="px-6 py-3.5 text-sm font-semibold text-blue-100 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        Register Elder Needs
                      </button>
                    </div>

                    {/* Trust markers */}
                    <div className="pt-6 border-t border-blue-500/20 flex flex-wrap gap-y-3 gap-x-8 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span>Certified Clinical Standard</span>
                      </div>
                      <div className="flex items-center gap-1.5"></div>
                    </div>
                  </div>

                  {/* Cover Image backdrop (5 Cols) */}
                  <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
                    <img
                      src={heroImage}
                      alt="Caring interaction with Bengali elder"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Soft blue gradient masking overlay on the content junction side */}
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-blue-950 via-blue-950/20 to-transparent lg:from-blue-950 lg:via-transparent" />
                  </div>
                </div>
              </div>

              {/* SECTIONS BELOW HERO: 1. HOW CAREBRIDGE WORKS */}
              <section id="how-it-works" className="space-y-8 py-2">
                <div className="text-center space-y-2">
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                    How CareBridge Works
                  </h2>
                  <p className="text-sm text-slate-400 max-w-lg mx-auto font-light">
                    Simple, transparent, secure process designed with absolute
                    love for your senior family members.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Step 1 */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-2xl p-6 border border-blue-500/20 text-center space-y-4 hover:border-blue-500/40 hover:bg-blue-900/40 transition-all">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-display font-bold text-lg">
                      01
                    </div>
                    <h3 className="font-display font-bold text-blue-100 text-lg">
                      Add Elder Profile
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Document chronic medical conditions, diets, and specific
                      medicine timing instructions inside Banani, Gulshan, or
                      Uttara.
                    </p>
                    <button
                      onClick={() => setView("elder-profiles")}
                      className="text-xs text-blue-400 font-semibold inline-flex items-center gap-1 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Setup Profile &rarr;
                    </button>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-2xl p-6 border border-blue-500/20 text-center space-y-4 hover:border-blue-500/40 hover:bg-blue-900/40 transition-all">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-display font-bold text-lg">
                      02
                    </div>
                    <h3 className="font-display font-bold text-blue-100 text-lg">
                      Find Nearby Caregiver
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Filter 5-6 premier Dhaka caregivers by neighborhood,
                      specialty, hourly rates, and gender preference.
                    </p>
                    <button
                      onClick={() => setView("search")}
                      className="text-xs text-blue-400 font-semibold inline-flex items-center gap-1 hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      Browse Caregivers &rarr;
                    </button>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-2xl p-6 border border-blue-500/20 text-center space-y-4 hover:border-blue-500/40 hover:bg-blue-900/40 transition-all">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-display font-bold text-lg">
                      03
                    </div>
                    <h3 className="font-display font-bold text-blue-100 text-lg">
                      Book Securely
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-light">
                      Schedule with dynamic BDT pricing. Monitor real-time daily
                      logs (meals taken, medicines consumed) submitted by
                      caregivers.
                    </p>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold text-emerald-950 bg-emerald-400 rounded-md border border-emerald-500 uppercase">
                      ৳ BDT Regulated
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTIONS BELOW HERO: 2. Core BENEFITS */}
              <section
                id="benefits"
                className="space-y-8 bg-gradient-to-br from-blue-900/20 to-blue-950/20 border border-blue-500/20 p-8 sm:p-12 rounded-3xl"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left content benefit listing */}
                  <div className="lg:col-span-5 space-y-5">
                    <span className="inline-block px-2.5 py-1 text-[10px] uppercase tracking-wider bg-blue-500/15 text-blue-300 rounded-md font-semibold">
                      Core Platform Benefits
                    </span>
                    <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                      Why Dhaka families need a platform like CareBridge
                    </h3>
                    <p className="text-sm text-slate-300 font-light leading-relaxed">
                      Unlike unregulated freelance matching, CareBridge mandates
                      strict background checks and ongoing nurse standby
                      operations.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => setView("search")}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
                      >
                        Book 24/7 Verified Coverage
                      </button>
                    </div>
                  </div>

                  {/* Right grid highlights */}
                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 p-5 rounded-2xl border border-blue-500/20 space-y-2">
                      <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Award className="h-5 w-5" />
                      </div>
                      <h4 className="font-display font-bold text-blue-100 text-sm">
                        Elite Medical Vetting
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal font-light">
                        Caregivers hold verified DU, NITOR, or BIRDEM
                        certifications with direct clinical elderly experience.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 p-5 rounded-2xl border border-blue-500/20 space-y-2">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <h4 className="font-display font-bold text-blue-100 text-sm">
                        Hourly Affordability (৳ BDT)
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal font-light">
                        Rates start standardly at BDT ৳250/hour with zero agency
                        premium add-ons for full budget transparency.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 p-5 rounded-2xl border border-blue-500/20 space-y-2">
                      <div className="h-9 w-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Activity className="h-5 w-5" />
                      </div>
                      <h4 className="font-display font-bold text-blue-100 text-sm">
                        Real-time Care Checklists
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal font-light">
                        Receive immediate logs showing insulin status, meal
                        times, sleep trackers, and memory exercises.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 p-5 rounded-2xl border border-blue-500/20 space-y-2">
                      <div className="h-9 w-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5" />
                      </div>
                      <h4 className="font-display font-bold text-blue-100 text-sm">
                        Immediate Replacing Standby
                      </h4>
                      <p className="text-xs text-slate-400 leading-normal font-light">
                        Backup emergency nurses dispatched to coordinates under
                        2 hours in Banani and Gulshan sectors.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTIONS BELOW HERO: 3. TRUST & SAFETY */}
              <section id="trust-safety" className="space-y-8 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gradient-to-r from-blue-950 to-blue-900 text-white p-8 sm:p-12 rounded-3xl border border-blue-500/20">
                  <div className="space-y-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                      <ShieldCheck className="h-5.5 w-5.5" />
                    </div>
                    <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-left tracking-tight">
                      Dhaka’s Only Double-Vetted Elder Network
                    </h3>
                    <p className="text-sm text-slate-300 font-light leading-relaxed">
                      We understand relatives worry when leaving parents at
                      home. Every caregiver coordinates address documentation
                      with neighborhood police officers.
                    </p>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Strict physical home address inspection
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        Mandatory medical practice evaluation tests
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        In-hospital caregiving experience confirmation
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 bg-slate-800/50 rounded-2xl border border-blue-500/20 space-y-5">
                    <h4 className="font-display font-bold text-base uppercase text-blue-300 tracking-wide">
                      Emergency Protection Standard
                    </h4>
                    <div className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-100">
                          How Replacements Work:
                        </p>
                        <p className="text-slate-300 leading-relaxed font-light">
                          If a selected caregiver calls in sick or experiences
                          an emergency, CareBridge alerts relatives immediately
                          and routes a certified standby helper with a
                          pre-validated history.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-100">
                          24/7 Hotline Support:
                        </p>
                        <p className="text-slate-300 leading-relaxed font-light">
                          Dedicated local client hotline with professional
                          medical assistants standing by at (+880) 1800-CBRIDGE.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

        {/* ==================== B. SEARCH & MARKETPLACE VIEW ==================== */}
        {currentView === "search" &&
          !activeSuccessBooking &&
          !selectedCaregiver && (
            <div className="space-y-8 animate-fade-in">
              {/* Header Title */}
              <div className="space-y-2">
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-teal-400 tracking-tight">
                  Verified Caregivers in Dhaka
                </h2>
                {/* <p className="text-sm text-slate-500 font-light">
                  Browse our verified caregivers database. Find
                  assistance in Banani, Gulshan, Dhanmondi, and beyond.
                </p> */}
              </div>

              {/* Filter controls panel */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Filter 1: Dhaka Location search dropdown */}
                <div className="col-span-1 md:col-span-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Filter Dhaka Area
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <select
                      id="filter-location-select"
                      value={filters.location}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full pl-9 pr-4 py-2.5 text-xs text-black sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white"
                    >
                      <option value="">All Locations in Dhaka</option>
                      {DHAKA_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter 2: Care Category Specialty */}
                <div className="col-span-1 md:col-span-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Filter Assistance Type
                  </label>
                  <select
                    id="filter-spec-select"
                    value={filters.careType}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        careType: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 text-xs text-black sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white"
                  >
                    <option value="">All Specialties</option>
                    {CARE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter 3: Caregiver Gender */}
                <div className="col-span-1 md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Caregiver Gender
                  </label>
                  <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-xl">
                    {["All", "Female", "Male"].map((g) => (
                      <button
                        key={g}
                        id={`gender-filter-${g.toLowerCase()}`}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, gender: g as any }))
                        }
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          filters.gender === g
                            ? "bg-sky-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-sky-600"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset filter button */}
                <div className="col-span-1 md:col-span-1 flex justify-end">
                  <button
                    id="reset-filter-btn"
                    onClick={() =>
                      setFilters({ location: "", careType: "", gender: "All" })
                    }
                    className="w-full md:w-auto py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Reset Filter"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Caregivers Grid matching filters */}
              {filteredCaregivers.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
                  <div className="inline-flex p-3 rounded-full bg-slate-50 text-slate-400">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    No matching caregivers found
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Try clearing your location or specialty filters to see all
                    available elder assistants in Dhaka.
                  </p>
                  <div className="pt-2">
                    <button
                      id="no-match-reset-btn"
                      onClick={() =>
                        setFilters({
                          location: "",
                          careType: "",
                          gender: "All",
                        })
                      }
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredCaregivers.map((cg) => (
                    <CaregiverCard
                      key={cg.id}
                      caregiver={cg}
                      distance="2.3 km"
                      onViewProfile={() => setView("search")}
                      onBook={handleSelectCaregiver}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        {/* ==================== C. INDIVIDUAL BOOKING FORM PROCESS (SCHEDULER CARD) ==================== */}
        {selectedCaregiver && !activeSuccessBooking && (
          <div className="space-y-6 animate-fade-in py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-slate-150 pb-3">
              <button
                id="booking-back-btn"
                onClick={() => setSelectedCaregiver(null)}
                className="text-xs font-semibold text-sky-655 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                &larr; Back to Caregiver list
              </button>
              <span className="text-xs text-slate-450">
                Step 2 of 2: Care Scheduler Details
              </span>
            </div>

            {/* Display Booking Form or Elder Profile registration form on-the-fly */}
            {showElderForm ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-display font-bold text-lg text-slate-900">
                    Add New Elder details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document history first to match booking conditions
                    perfectly.
                  </p>
                </div>
                <ElderProfileForm
                  onSave={handleSaveElder}
                  onCancel={() => setShowElderForm(false)}
                />
              </div>
            ) : (
              <BookingForm
                caregiver={selectedCaregiver}
                elder={selectedElder ?? elderProfiles[0]}
                onBook={handleConfirmBookingDetails}
                onCancel={() => setSelectedCaregiver(null)}
                onCreateElderClick={() => setShowElderForm(true)}
              />
            )}
          </div>
        )}

        {/* ==================== D. SUCCESS STATE BOOKING CONFIRMATION RECEIPT ==================== */}
        {activeSuccessBooking && (
          <div className="max-w-xl mx-auto bg-white border-2 border-emerald-100 rounded-3xl overflow-hidden shadow-xl animate-fade-in my-8">
            {/* Success visual header */}
            <div className="bg-emerald-500 text-white p-8 text-center space-y-3 relative">
              <div className="mx-auto h-12 w-12 rounded-full bg-white text-emerald-500 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-extrabold text-2xl tracking-tight">
                  Booking Scheduled
                </h3>
                <p className="text-xs text-emerald-100 font-light">
                  Caregiver reservation has been confirmed & locked
                </p>
              </div>
              <span className="absolute top-4 right-4 bg-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase">
                SUCCESS
              </span>
            </div>

            {/* Success Details Receipt */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center text-xs text-slate-500 pb-4 border-b border-slate-100">
                <p>
                  Booking ID:{" "}
                  <strong className="font-mono text-slate-750">
                    {activeSuccessBooking.id}
                  </strong>
                </p>
                <p className="mt-0.5">
                  Created At:{" "}
                  {new Date(activeSuccessBooking.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Patient info */}
              <div className="space-y-3 text-xs">
                <h4 className="font-display font-bold text-slate-800 text-sm uppercase tracking-wider text-left border-l-2 border-sky-400 pl-2">
                  Assigned Coordinates
                </h4>

                <div className="grid grid-cols-2 gap-4 pb-2">
                  <div>
                    <span className="text-slate-450 uppercase text-[10px]">
                      Elder patient
                    </span>
                    <p className="font-bold text-slate-800">
                      {
                        elderProfiles.find(
                          (e) => e.id === activeSuccessBooking.elderProfileId,
                        )?.name
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-450 uppercase text-[10px]">
                      Active caregiver
                    </span>
                    <p className="font-bold text-slate-800">
                      {
                        caregivers.find(
                          (c) => c.id === activeSuccessBooking.caregiverId,
                        )?.name
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-450 uppercase text-[10px]">
                      Reservations dates
                    </span>
                    <p className="font-semibold text-slate-800">
                      {activeSuccessBooking.startDate} &mdash;{" "}
                      {activeSuccessBooking.endDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-450 uppercase text-[10px]">
                      Duty standard
                    </span>
                    <p className="font-semibold text-slate-800">
                      {activeSuccessBooking.hoursPerDay} hours per day
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic verified receipt fee */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs">
                <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">
                  <span>Billing Receipt</span>
                  <span>Amount Fully Paid (৳)</span>
                </div>
                <div className="flex justify-between text-slate-550 mb-1">
                  <span>Subtotal hours fee</span>
                  <span>৳{activeSuccessBooking.totalCost - 150} BDT</span>
                </div>
                <div className="flex justify-between text-slate-550 mb-2">
                  <span>Trust Backup insurance premium</span>
                  <span>৳150 BDT</span>
                </div>
                <div className="flex justify-between items-end text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">
                    Total Charged (VAT Inclusive)
                  </span>
                  <span className="font-display font-extrabold text-base text-slate-900">
                    ৳{activeSuccessBooking.totalCost} BDT
                  </span>
                </div>
              </div>

              {/* Safe instructions warning alert */}
              <div className="p-3.5 bg-yellow-50 text-yellow-800 rounded-xl text-[11px] leading-relaxed flex gap-2 items-start">
                <AlertCircle className="h-4.5 w-4.5 text-yellow-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Important Next Action:</strong> Caregiver will call
                  your emergency mobile number within 1 hour to introduce
                  themselves. Have the elder's past hospital papers prepared.
                </span>
              </div>

              {/* Receipt Footer Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  id="print-success-receipt-btn"
                  onClick={() =>
                    alert("Receipt downloaded / printed successfully.")
                  }
                  className="flex-1 py-2.5 text-slate-650 hover:bg-slate-55 rounded-xl border border-slate-250 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Download Invoice</span>
                </button>
                <button
                  id="success-receipt-dashboard-btn"
                  onClick={() => {
                    setActiveSuccessBooking(null);
                    setView("bookings");
                  }}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Go to Live Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== E. RELATIVE PORTAL WORKSPACE OR LOGIN PROMPT ==================== */}
        {(currentView === "bookings" || currentView === "elder-profiles") &&
          !activeSuccessBooking &&
          !selectedCaregiver &&
          (isLoggedIn ? (
            <RelativePortal
              userName={userName}
              onLogout={handleLogout}
              elderProfiles={elderProfiles}
              setElderProfiles={setElderProfiles}
              bookings={bookings}
              setBookings={setBookings}
              caregivers={caregivers}
              currentView={currentView}
              setView={setView}
              onCancelBooking={handleCancelBooking}
            />
          ) : (
            <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-6 shadow-sm my-12 animate-fade-in">
              <div className="h-12 w-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">
                  Access Restricted
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Please log in or register a new relative account to manage
                  elder profiles and monitor live caregiver shifts.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setView("login")}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl"
                >
                  Log In
                </button>
                <button
                  onClick={() => setView("register")}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Register Account
                </button>
              </div>
            </div>
          ))}

        {/* ==================== F. CAREGIVER PORTAL CLIENT WORKSPACE ==================== */}
        {currentView === "caregiver-portal" &&
          (isLoggedIn && userRole === "caregiver" ? (
            <CaregiverPortal
              userName={userName}
              onLogout={handleLogout}
              userEmail={userEmail}
              onProfileUpdate={handleRefreshCaregivers}
            />
          ) : (
            <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-6 shadow-sm my-12 animate-fade-in">
              <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl text-indigo-950 tracking-tight">
                  Caregiver Portal Access
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Please log in or register with verified collegiate email
                  credentials (.student.edu.bd) to manage shift rosters, booking
                  sheets, and submit log timelines.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setView("login")}
                  className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => setView("register")}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          ))}

        {/* ==================== F.5. ADMIN DASHBOARD ==================== */}
        {currentView === "admin-dashboard" &&
          (isLoggedIn && userRole === "admin" ? (
            <AdminDashboard
              userName={userName}
              onLogout={handleLogout}
              userEmail={userEmail}
            />
          ) : (
            <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-6 shadow-sm my-12 animate-fade-in">
              <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-xl text-indigo-950 tracking-tight">
                  Admin Portal Access
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  This portal is restricted to authorized administrators only.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setView("login")}
                  className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Log In
                </button>
              </div>
            </div>
          ))}

        {/* ==================== G. AUTHENTICATION PAGES ==================== */}
        {(currentView === "login" || currentView === "register") && (
          <div className="animate-fade-in py-4">
            <AuthForms
              initialTab={currentView}
              onAuthSuccess={handleAuthSuccess}
              onCancel={() => setView("home")}
            />
          </div>
        )}
      </main>

      {/* GLOBAL FOOTER COMPONENT */}
      <Footer setView={setView} />
    </div>
  );
}
