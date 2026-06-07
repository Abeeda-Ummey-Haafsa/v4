import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Search,
  User,
  Mail,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  LogOut,
  RefreshCw,
  Eye,
  Ban,
  UserCheck,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { Caregiver } from "../types";

interface AdminDashboardProps {
  onLogout: () => void;
  userName: string;
  userEmail: string;
}

interface ReportItem {
  id: string;
  booking_id: string;
  caregiver_id: string;
  reporter_id: string;
  category: string;
  description: string;
  status: "pending" | "resolved";
  created_at: string;
  caregiverName?: string;
  reporterName?: string;
}

interface RelativeItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location?: string;
  relation?: string;
  created_at?: string;
  role?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  userName,
  userEmail,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "caregivers" | "reports"
  >("overview");

  // Data States
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [relatives, setRelatives] = useState<RelativeItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [cgSearchQuery, setCgSearchQuery] = useState<string>("");
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(
    null,
  );
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Caregivers
      const cgCol = collection(db, "caregivers");
      const cgSnap = await getDocs(cgCol);
      const cgList: Caregiver[] = [];
      cgSnap.forEach((doc) => {
        const data = doc.data();
        cgList.push({
          id: doc.id,
          name: data.full_name || "Anonymous Caregiver",
          age: data.age || 30,
          gender: data.gender || "Female",
          location: data.area || data.location || "Dhaka",
          experience: data.experience_years ?? data.experience ?? 3,
          rating: data.rating,
          reviewsCount: data.reviews_count ?? data.reviewsCount ?? 0,
          ratePerHour: data.hourly_rate ?? data.ratePerHour ?? 300,
          photoUrl: data.photo_url || data.photoUrl || "",
          specialties: data.expertise
            ? [data.expertise]
            : ["Clinical Eldercare"],
          languages: ["Bangla", "English"],
          bio: data.bio || "Senior nursing assistant student.",
          certification: data.certification || "Certified Clinical Assistant",
          available:
            data.status === "suspended" ? false : (data.is_available ?? true),
          status: data.status || "active",
          email: data.email || "caregiver@student.edu.bd",
        });
      });

      // 2. Fetch Relatives/Users
      const usersCol = collection(db, "users");
      const usersSnap = await getDocs(usersCol);
      const relativeList: RelativeItem[] = [];
      usersSnap.forEach((doc) => {
        const data = doc.data();
        // Ignore admins, collect relatives
        if (data.role !== "admin") {
          relativeList.push({
            id: doc.id,
            full_name: data.full_name || "Anonymous Relative",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            relation: data.relation || "",
            created_at: data.created_at || "",
            role: data.role || "relative",
          });
        }
      });

      // 3. Fetch Reports
      const reportsCol = collection(db, "reports");
      const reportsSnap = await getDocs(reportsCol);
      const reportList: ReportItem[] = [];
      reportsSnap.forEach((doc) => {
        const data = doc.data();
        reportList.push({
          id: doc.id,
          booking_id: data.booking_id || "",
          caregiver_id: data.caregiver_id || "",
          reporter_id: data.reporter_id || "",
          category: data.category || "General Concern",
          description: data.description || "",
          status: data.status || "pending",
          created_at: data.created_at || new Date().toISOString(),
        } as ReportItem);
      });

      // Map names to reports for display usability
      const mappedReports = reportList.map((rep) => {
        const matchingCg = cgList.find((c) => c.id === rep.caregiver_id);
        const matchingRelative = relativeList.find(
          (r) => r.id === rep.reporter_id,
        );
        return {
          ...rep,
          caregiverName: matchingCg ? matchingCg.name : "Unknown Caregiver",
          reporterName: matchingRelative
            ? matchingRelative.full_name
            : "Unknown Relative",
        };
      });

      setCaregivers(cgList);
      setRelatives(relativeList);
      setReports(
        mappedReports.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (err: any) {
      console.error("Admin Dashboard failed to load Firestore datasets:", err);
      setError(
        "Failed to fetch real-time administration records. Please double-check schema security rules.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Toggle caregiver suspension status
  const toggleCaregiverStatus = async (caregiver: Caregiver) => {
    const isCurrentlySuspended = caregiver.status === "suspended";
    const nextStatus = isCurrentlySuspended ? "active" : "suspended";

    try {
      const cgDocRef = doc(db, "caregivers", caregiver.id);
      await updateDoc(cgDocRef, {
        status: nextStatus,
        is_available: nextStatus === "active",
      });

      // Update local state smoothly
      setCaregivers((prev) =>
        prev.map((c) => {
          if (c.id === caregiver.id) {
            return {
              ...c,
              status: nextStatus,
              available: nextStatus === "active",
            };
          }
          return c;
        }),
      );

      // Update selected modal details view if active
      if (selectedCaregiver?.id === caregiver.id) {
        setSelectedCaregiver((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                available: nextStatus === "active",
              }
            : null,
        );
      }

      console.log(
        `Caregiver profile successfully ${nextStatus === "suspended" ? "suspended" : "reactivated"}.`,
      );
    } catch (err: any) {
      console.error("Failed updating caregiver status in firestore:", err);
    }
  };

  // Resolve a report submitted by a parent or relative
  const resolveReport = async (reportId: string) => {
    try {
      const reportDocRef = doc(db, "reports", reportId);
      await updateDoc(reportDocRef, {
        status: "resolved",
      });

      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)),
      );

      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) =>
          prev ? { ...prev, status: "resolved" } : null,
        );
      }

      console.log("Report resolved cleanly and archived.");
    } catch (err: any) {
      console.error("Failed resolving report:", err);
    }
  };

  // Metrics overview calculations
  const totalCaregiversCount = caregivers.length;
  const totalRelativesCount = relatives.length;
  const pendingReportsCount = reports.filter(
    (r) => r.status === "pending",
  ).length;

  // Filter caregiver search query
  const filteredCaregivers = caregivers.filter((cg) => {
    const q = cgSearchQuery.toLowerCase().trim();
    return (
      cg.name.toLowerCase().includes(q) ||
      (cg.email && cg.email.toLowerCase().includes(q)) ||
      cg.location.toLowerCase().includes(q) ||
      (cg.specialties?.[0] && cg.specialties[0].toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 animate-fade-in sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto pt-6 px-4">
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="space-y-1 z-10">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-bold text-[10px] rounded-full uppercase tracking-wider border border-indigo-400/20">
              Administrative Command Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              CareBridge System Audit
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm">
              Logged in: <strong className="text-white">{userName}</strong> (
              {userEmail})
            </p>
          </div>
          <div className="flex gap-2.5 z-10 self-stretch md:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-50 text-indigo-200 hover:text-indigo-100 font-bold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
              title="Refresh Firestore Sync"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={onLogout}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-900/30 font-bold text-xs rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dynamic Errors Container */}
        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-800 animate-slide-up">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 mt-8 gap-5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-semibold relative transition-all cursor-pointer ${
              activeTab === "overview"
                ? "text-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview Node
            {activeTab === "overview" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("caregivers")}
            className={`pb-3 text-sm font-semibold relative transition-all cursor-pointer ${
              activeTab === "caregivers"
                ? "text-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Caregiver Profiles ({totalCaregiversCount})
            {activeTab === "caregivers" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-3 text-sm font-semibold relative transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "reports"
                ? "text-indigo-600 font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Relatives' Complaints ({reports.length})
            {pendingReportsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-550 text-white rounded-full leading-none animate-pulse">
                {pendingReportsCount}
              </span>
            )}
            {activeTab === "reports" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        </div>

        {/* MODULE CORE VIEWPORT */}
        {loading && !refreshing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500">
              Querying live CareBridge databases...
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {/* 1. OVERVIEW NODE */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-fade-in">
                {/* Visual Widgets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card: Total Caregivers */}
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                          Active Caregivers
                        </p>
                        <h3 className="text-3xl font-display font-extrabold text-slate-900">
                          {totalCaregiversCount}
                        </h3>
                        <p className="text-slate-500 text-[11px] font-medium leading-none">
                          Registered students verified
                        </p>
                      </div>
                      <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Card: Total Relatives */}
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                          Family Relatives
                        </p>
                        <h3 className="text-3xl font-display font-extrabold text-slate-900">
                          {totalRelativesCount}
                        </h3>
                        <p className="text-slate-500 text-[11px] font-medium leading-none">
                          Active relative accounts registered
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl">
                        <User className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  {/* Card: Pending Incidents */}
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-xs hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                          Pending Violations
                        </p>
                        <h3
                          className={`text-3xl font-display font-extrabold ${pendingReportsCount > 0 ? "text-rose-600" : "text-slate-900"}`}
                        >
                          {pendingReportsCount}
                        </h3>
                        <p className="text-slate-500 text-[11px] font-medium leading-none">
                          Unresolved reports awaiting audit
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-2xl ${pendingReportsCount > 0 ? "bg-rose-50 text-rose-500" : "bg-slate-50 text-slate-400"}`}
                      >
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-panels overview split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Recent Incidents */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-display font-extrabold text-base text-slate-900">
                        Recent Relative Complaints
                      </h4>
                      <button
                        onClick={() => setActiveTab("reports")}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Manage Complaints</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {reports.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No active complaints registered yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                        {reports.slice(0, 5).map((rep) => (
                          <div
                            key={rep.id}
                            className="py-3.5 space-y-1.5 first:pt-0 last:pb-0"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <span className="inline-flex px-2 py-0.5 bg-slate-10/70 text-slate-600 border border-slate-200 text-[9px] font-bold rounded-lg mb-1">
                                  {rep.category}
                                </span>
                                <h5 className="text-xs font-semibold text-slate-900">
                                  Complaint filed against{" "}
                                  <strong className="text-slate-800">
                                    {rep.caregiverName}
                                  </strong>
                                </h5>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  rep.status === "pending"
                                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                } border`}
                              >
                                {rep.status}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs line-clamp-2">
                              {rep.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-450 text-slate-400">
                              <span>By: {rep.reporterName}</span>
                              <span>•</span>
                              <span>
                                {new Date(rep.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Suspended Caregivers list */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs space-y-4">
                    <h4 className="font-display font-extrabold text-base text-slate-900">
                      Suspended Service Accounts
                    </h4>
                    {caregivers.filter((c) => c.status === "suspended")
                      .length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                        <ShieldCheck className="h-8 w-8 text-emerald-500" />
                        <span>
                          All Caregiver profiles are active and trusted.
                        </span>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                        {caregivers
                          .filter((c) => c.status === "suspended")
                          .map((cg) => (
                            <div
                              key={cg.id}
                              className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-inner grayscale opacity-70 ${
                                    cg.gender?.toLowerCase() === "male"
                                      ? "bg-sky-50 text-sky-600 border-sky-100"
                                      : "bg-rose-50 text-rose-500 border-rose-100"
                                  }`}
                                >
                                  <User className="h-5 w-5" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-800">
                                    {cg.name}
                                  </h5>
                                  <p className="text-slate-500 text-[10px]">
                                    {cg.email}
                                  </p>
                                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg uppercase">
                                    <Ban className="h-2.5 w-2.5" />
                                    Suspended Account
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleCaregiverStatus(cg)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                Reactivate
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CAREGIVER PROFILES NODE */}
            {activeTab === "caregivers" && (
              <div className="space-y-6 animate-fade-in">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      id="caregiver-search-admin"
                      type="text"
                      placeholder="Search caregivers by name, email, expertise Area, etc."
                      value={cgSearchQuery}
                      onChange={(e) => setCgSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl font-sans text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Grid checklist */}
                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                          <th className="p-4 pl-6">Profile Details</th>
                          <th className="p-4">Educational Expertise</th>
                          <th className="p-4">Area Location</th>
                          <th className="p-4">Experience</th>
                          <th className="p-4">Hourly Rate</th>
                          <th className="p-4">Audit Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCaregivers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-8 text-center text-slate-400"
                            >
                              No caregivers match your admin search
                              requirements.
                            </td>
                          </tr>
                        ) : (
                          filteredCaregivers.map((cg) => (
                            <tr
                              key={cg.id}
                              className="hover:bg-slate-50/50 transition duration-150"
                            >
                              <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border shadow-inner outline-2 outline-offset-2 ${
                                      cg.status === "suspended"
                                        ? "outline-rose-300 grayscale opacity-70"
                                        : "outline-slate-100"
                                    } ${
                                      cg.gender?.toLowerCase() === "male"
                                        ? "bg-sky-50 text-sky-600 border-sky-100"
                                        : "bg-rose-50 text-rose-500 border-rose-100"
                                    }`}
                                  >
                                    <User className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-slate-800">
                                      {cg.name}
                                    </h5>
                                    <p className="text-slate-400 text-[10px]">
                                      {cg.email}
                                    </p>
                                    {cg.rating &&
                                    cg.reviewsCount &&
                                    cg.reviewsCount > 0 ? (
                                      <div className="flex items-center gap-1 text-[10px] mt-0.5 text-amber-500 font-bold">
                                        <span>★</span>
                                        <span>
                                          {Number(cg.rating).toFixed(1)} (
                                          {cg.reviewsCount} reviews)
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 text-[10px] mt-0.5 italic">
                                        No reviews yet
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-600">
                                {cg.specialties?.[0] || "Elder Support"}
                              </td>
                              <td className="p-4 font-semibold text-slate-600">
                                {cg.location}, Dhaka
                              </td>
                              <td className="p-4 font-semibold text-slate-550">
                                {cg.experience} yrs
                              </td>
                              <td className="p-4 font-bold text-indigo-600 text-xs">
                                ৳ {cg.ratePerHour}/hr
                              </td>
                              <td className="p-4">
                                {cg.status === "suspended" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-100">
                                    <Ban className="h-2.5 w-2.5" />
                                    Suspended
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100">
                                    <UserCheck className="h-2.5 w-2.5" />
                                    Active Profile
                                  </span>
                                )}
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedCaregiver(cg)}
                                    className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-[10px] transition cursor-pointer"
                                    title="View Profile Details"
                                  >
                                    Inspect
                                  </button>
                                  <button
                                    onClick={() => toggleCaregiverStatus(cg)}
                                    className={`p-1 px-2 font-bold text-[10px] rounded-lg transition overflow-hidden cursor-pointer ${
                                      cg.status === "suspended"
                                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100"
                                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100"
                                    }`}
                                  >
                                    {cg.status === "suspended"
                                      ? "Reactivate"
                                      : "Suspend"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. RELATIVES' COMPLAINTS NODE */}
            {activeTab === "reports" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                          <th className="p-4 pl-6">
                            Incident Complaint Target
                          </th>
                          <th className="p-4">Filed By Relative</th>
                          <th className="p-4">Report Topic Category</th>
                          <th className="p-4">Incident Description</th>
                          <th className="p-4">Timestamp Filed</th>
                          <th className="p-4">Resolution</th>
                          <th className="p-4 pr-6 text-right">
                            Inspect Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {reports.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-8 text-center text-slate-450"
                            >
                              No relative-caregiver incident complaints indexed.
                            </td>
                          </tr>
                        ) : (
                          reports.map((rep) => (
                            <tr
                              key={rep.id}
                              className="hover:bg-slate-50/50 transition duration-150"
                            >
                              <td className="p-4 pl-6 font-bold text-slate-800">
                                {rep.caregiverName}
                              </td>
                              <td className="p-4 font-semibold text-slate-650">
                                {rep.reporterName}
                              </td>
                              <td className="p-4">
                                <span className="inline-block px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg">
                                  {rep.category}
                                </span>
                              </td>
                              <td className="p-4 max-w-xs truncate text-slate-500">
                                {rep.description}
                              </td>
                              <td className="p-4 text-slate-450">
                                {new Date(rep.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                {rep.status === "pending" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-rose-700 bg-rose-50 border border-rose-10 border-rose-100 text-[9px] font-black uppercase rounded-full">
                                    <Clock className="h-2.5 w-2.5 animate-spin" />
                                    Review Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-emerald-700 bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase rounded-full">
                                    <CheckCircle className="h-2.5 w-2.5" />
                                    Resolved
                                  </span>
                                )}
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setSelectedReport(rep)}
                                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-[10px] border border-slate-200 hover:border-slate-300 transition-all duration-150 cursor-pointer"
                                    title="View Audit Case File"
                                  >
                                    View File
                                  </button>
                                  {(() => {
                                    const associatedCg = caregivers.find(
                                      (c) => c.id === rep.caregiver_id,
                                    );
                                    if (!associatedCg) return null;
                                    return (
                                      <button
                                        onClick={() =>
                                          toggleCaregiverStatus(associatedCg)
                                        }
                                        className={`p-1 px-2.5 font-bold text-[10px] rounded-lg transition-all duration-150 cursor-pointer border ${
                                          associatedCg.status === "suspended"
                                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300"
                                            : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300"
                                        }`}
                                        title={
                                          associatedCg.status === "suspended"
                                            ? "Reactivate Caregiver profile"
                                            : "Suspend Caregiver profile"
                                        }
                                      >
                                        {associatedCg.status === "suspended"
                                          ? "Reactivate"
                                          : "Suspend"}
                                      </button>
                                    );
                                  })()}
                                  {rep.status === "pending" && (
                                    <button
                                      onClick={() => resolveReport(rep.id)}
                                      className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] border border-indigo-700 hover:border-indigo-800 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
                                    >
                                      Resolve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL WINDOW 1: INSPECT CAREGIVER */}
      {selectedCaregiver && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedCaregiver(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div
                className={`h-20 w-20 rounded-full flex items-center justify-center shrink-0 border-2 shadow-inner ${
                  selectedCaregiver.status === "suspended"
                    ? "border-rose-300 grayscale opacity-70"
                    : "border-indigo-400"
                } ${
                  selectedCaregiver.gender?.toLowerCase() === "male"
                    ? "bg-sky-50 text-sky-600 border-sky-100"
                    : "bg-rose-50 text-rose-500 border-rose-100"
                }`}
              >
                <User className="h-10 w-10" />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedCaregiver.status === "suspended"
                      ? "bg-rose-50 text-rose-700 border border-rose-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  } border`}
                >
                  {selectedCaregiver.status === "suspended"
                    ? "Suspended"
                    : "Active Account"}
                </span>
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  {selectedCaregiver.name}
                </h3>
                <p className="text-slate-450 text-xs flex items-center gap-1 justify-center sm:justify-start">
                  <Mail className="h-3.5 w-3.5 text-slate-450" />
                  <span>{selectedCaregiver.email}</span>
                </p>
                <p className="text-indigo-600 font-bold text-xs mt-1">
                  Hourly Rate: ৳ {selectedCaregiver.ratePerHour}/hr
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 font-bold uppercase text-[9px]">
                  Specialty Practice
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCaregiver.specialties?.[0]}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 font-bold uppercase text-[9px]">
                  Experience Length
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCaregiver.experience} Years
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 font-bold uppercase text-[9px]">
                  District Area
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCaregiver.location}, Dhaka
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-slate-400 font-bold uppercase text-[9px]">
                  Availability Status
                </p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {selectedCaregiver.available
                    ? "Available for Jobs"
                    : "Unavailable/Busy"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Professional Bio Statement
              </h4>
              <p className="text-slate-600 text-xs bg-slate-50 p-4 rounded-2xl italic leading-relaxed">
                "{selectedCaregiver.bio}"
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedCaregiver(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Inspect
              </button>
              <button
                onClick={() => {
                  toggleCaregiverStatus(selectedCaregiver);
                }}
                className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition duration-150 cursor-pointer ${
                  selectedCaregiver.status === "suspended"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:shadow"
                }`}
              >
                {selectedCaregiver.status === "suspended"
                  ? "Reactivate Profile"
                  : "Suspend Caregiver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WINDOW 2: COMPLAINT CASE FILE */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 text-center sm:text-left">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  selectedReport.status === "pending"
                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                } border`}
              >
                {selectedReport.status === "pending"
                  ? "Pending Review"
                  : "Resolved Incident"}
              </span>
              <h3 className="font-display font-extrabold text-lg text-slate-900">
                Complaint Incident File
              </h3>
              <p className="text-slate-400 text-xs">
                Reference ID: {selectedReport.id}
              </p>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-4 text-xs">
              <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl justify-between items-center">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[9px]">
                    Accused Caregiver
                  </p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedReport.caregiverName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase text-[9px]">
                    Reporter (Relative)
                  </p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedReport.reporterName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <p className="text-slate-400 font-bold uppercase text-[9px]">
                    Report Topic Category
                  </p>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {selectedReport.category}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <p className="text-slate-400 font-bold uppercase text-[9px]">
                    Date Submitted
                  </p>
                  <p className="font-semibold text-slate-700 mt-0.5">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                <label className="text-slate-405 text-slate-400 uppercase tracking-wider font-extrabold text-[9px]">
                  Complaint Description and Log
                </label>
                <p className="text-slate-700 leading-relaxed font-sans mt-1">
                  {selectedReport.description}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Incident file
              </button>
              {(() => {
                const associatedCg = caregivers.find(
                  (c) => c.id === selectedReport.caregiver_id,
                );
                if (!associatedCg) return null;
                return (
                  <button
                    onClick={() => toggleCaregiverStatus(associatedCg)}
                    className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition duration-155 cursor-pointer border active:scale-98 shadow-sm hover:shadow ${
                      associatedCg.status === "suspended"
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300"
                    }`}
                  >
                    {associatedCg.status === "suspended"
                      ? "Reactivate Caregiver"
                      : "Suspend Caregiver"}
                  </button>
                );
              })()}
              {selectedReport.status === "pending" && (
                <button
                  onClick={() => {
                    resolveReport(selectedReport.id);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md active:scale-98 border border-indigo-700 transition duration-155 cursor-pointer"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
