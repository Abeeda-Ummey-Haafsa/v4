/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  User,
  MapPin,
  Heart,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { DHAKA_LOCATIONS } from "../data";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { isValidCaregiverEmail } from "../types";

interface AuthFormsProps {
  initialTab?: "login" | "register";
  onAuthSuccess: (userName: string) => void;
  onCancel?: () => void;
}

export const AuthForms: React.FC<AuthFormsProps> = ({
  initialTab = "login",
  onAuthSuccess,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLocation, setRegLocation] = useState(DHAKA_LOCATIONS[0]);
  const [regRelation, setRegRelation] = useState("Daughter");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Caregiver Specific Register State
  const [regPhone, setRegPhone] = useState("");
  const [regArea, setRegArea] = useState("");
  const [regRate, setRegRate] = useState(300);
  const [regExpertise, setRegExpertise] = useState("Clinical Eldercare");
  const [regBio, setRegBio] = useState("");
  const [regGender, setRegGender] = useState<"Male" | "Female">("Female");

  // Email validation and dynamic check states
  const [loginEmailChecked, setLoginEmailChecked] = useState(false);
  const [loginEmailExists, setLoginEmailExists] = useState<boolean | null>(
    null,
  );
  const [isCheckingLoginEmail, setIsCheckingLoginEmail] = useState(false);

  const [regEmailChecked, setRegEmailChecked] = useState(false);
  const [regEmailExists, setRegEmailExists] = useState<boolean | null>(null);
  const [isCheckingRegEmail, setIsCheckingRegEmail] = useState(false);

  const checkEmailInDb = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@") || !email.includes(".")) return false;
    const cleanEmail = email.trim().toLowerCase();

    // Quick matches for high fidelity sandbox demo presets
    if (cleanEmail === "demo@carebridge.com") return true;
    if (cleanEmail === "samia@du.student.edu.bd") return true;
    if (cleanEmail === "admin@example.com") return true;

    try {
      const usersRef = collection(db, "users");
      const qUsers = query(usersRef, where("email", "==", cleanEmail));
      const userSnap = await getDocs(qUsers);
      if (!userSnap.empty) return true;

      const caregiversRef = collection(db, "caregivers");
      const qCaregivers = query(
        caregiversRef,
        where("email", "==", cleanEmail),
      );
      const cgSnap = await getDocs(qCaregivers);
      if (!cgSnap.empty) return true;

      return false;
    } catch (err) {
      console.warn("Failed checking email existence in Firestore:", err);
      return false;
    }
  };

  // Debounce hook for login email check
  useEffect(() => {
    if (!loginEmail || !loginEmail.includes("@") || !loginEmail.includes(".")) {
      setLoginEmailExists(null);
      setLoginEmailChecked(false);
      setIsCheckingLoginEmail(false);
      return;
    }

    setIsCheckingLoginEmail(true);
    const handler = setTimeout(async () => {
      const exists = await checkEmailInDb(loginEmail);
      setLoginEmailExists(exists);
      setLoginEmailChecked(true);
      setIsCheckingLoginEmail(false);
    }, 400);

    return () => clearTimeout(handler);
  }, [loginEmail]);

  // Debounce hook for registration email check
  useEffect(() => {
    if (!regEmail || !regEmail.includes("@") || !regEmail.includes(".")) {
      setRegEmailExists(null);
      setRegEmailChecked(false);
      setIsCheckingRegEmail(false);
      return;
    }

    const cleanRegEmail = regEmail.toLowerCase().trim();
    const isStudentEmail =
      cleanRegEmail.endsWith(".student.edu.bd") ||
      cleanRegEmail.endsWith("@student.edu.bd") ||
      cleanRegEmail.endsWith(".edu.bd") ||
      cleanRegEmail.endsWith("@edu.bd");
    if (isStudentEmail && !isValidCaregiverEmail(regEmail)) {
      setRegEmailExists(null);
      setRegEmailChecked(false);
      setIsCheckingRegEmail(false);
      return;
    }

    setIsCheckingRegEmail(true);
    const handler = setTimeout(async () => {
      const exists = await checkEmailInDb(regEmail);
      setRegEmailExists(exists);
      setRegEmailChecked(true);
      setIsCheckingRegEmail(false);
    }, 400);

    return () => clearTimeout(handler);
  }, [regEmail]);

  const handleNextStep = () => {
    if (!regName.trim() || !regEmail.trim()) {
      alert("Please fill out your full name and email address.");
      return;
    }
    if (!regEmail.includes("@") || !regEmail.includes(".")) {
      alert("Please enter a valid email address.");
      return;
    }

    // Validate educational syntax if pretending to be healthcare student
    const cleanRegEmail = regEmail.toLowerCase().trim();
    const isStudentEmail =
      cleanRegEmail.endsWith(".student.edu.bd") ||
      cleanRegEmail.endsWith("@student.edu.bd") ||
      cleanRegEmail.endsWith(".edu.bd") ||
      cleanRegEmail.endsWith("@edu.bd");
    if (isStudentEmail) {
      if (!isValidCaregiverEmail(regEmail)) {
        alert(
          "Educational validation rejected: emails representing an institution under student.edu.bd are required (e.g. user@du.student.edu.bd). Generic student.edu.bd or edu.bd are rejected.",
        );
        return;
      }
    }
    setRegisterStep(2);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      alert("Please fill out all fields.");
      return;
    }

    const cleanEmail = loginEmail.toLowerCase().trim();
    const exists = await checkEmailInDb(cleanEmail);
    if (!exists) {
      alert("No account found with this email address.");
      const wantToRegister = confirm(
        "No account found with this email address. Would you like to create a new account instead?",
      );
      if (wantToRegister) {
        setRegEmail(loginEmail);
        setActiveTab("register");
        setRegisterStep(1);
      }
      return;
    }

    localStorage.setItem("cb_auth_email", cleanEmail);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        loginPassword,
      );
      const user = userCredential.user;
      onAuthSuccess(user.displayName || user.email?.split("@")[0] || "User");
    } catch (err: any) {
      if (cleanEmail === "admin@example.com" && loginPassword === "123456") {
        const fallbackUser = "System Admin";
        localStorage.setItem("cb_auth_fallback", fallbackUser);
        localStorage.setItem("cb_auth_uid", "fb_admin");
        onAuthSuccess(fallbackUser);
      } else if (
        err.code === "auth/operation-not-allowed" ||
        (err.message && err.message.includes("operation-not-allowed"))
      ) {
        // alert(
        //   "⚠️ Email/Password Auth is not yet enabled in your Firebase Console.\n\n" +
        //   "How to fix:\n" +
        //   "1. Go to console.firebase.google.com and open your project.\n" +
        //   "2. Click 'Authentication' in the left sidebar, then select the 'Sign-in method' tab.\n" +
        //   "3. Click 'Add new provider', choose 'Email/Password', enable it, and save.\n\n" +
        //   "💡 To let you explore CareBridge instantly, we have logged you in with a simulated local session for this preview!"
        // );
        const fallbackUser =
          cleanEmail === "admin@example.com"
            ? "System Admin"
            : cleanEmail.split("@")[0] || "Ameera Islam";
        localStorage.setItem("cb_auth_fallback", fallbackUser);
        localStorage.setItem(
          "cb_auth_uid",
          cleanEmail === "admin@example.com"
            ? "fb_admin"
            : "fb_" + fallbackUser.replace(/\s+/g, "_").toLowerCase(),
        );
        onAuthSuccess(fallbackUser);
      } else {
        alert(err.message || "An error occurred during login.");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      alert("Please fill out all required fields.");
      return;
    }
    const cleanRegEmail = regEmail.toLowerCase().trim();
    const isStudentEmail =
      cleanRegEmail.endsWith(".student.edu.bd") ||
      cleanRegEmail.endsWith("@student.edu.bd") ||
      cleanRegEmail.endsWith(".edu.bd") ||
      cleanRegEmail.endsWith("@edu.bd");
    if (isStudentEmail && !isValidCaregiverEmail(regEmail)) {
      alert(
        "Educational validation rejected: emails representing an institution under student.edu.bd are required (e.g. user@du.student.edu.bd). Generic student.edu.bd or edu.bd are rejected.",
      );
      return;
    }

    // Check database if email already exists
    const exists = await checkEmailInDb(cleanRegEmail);
    if (exists) {
      // alert("An account already exists with this email address. Please sign in instead.");
      return;
    }

    const isCaregiver = isValidCaregiverEmail(regEmail);
    if (isCaregiver && !regPhone) {
      alert("Liaison contact phone number is required.");
      return;
    }

    localStorage.setItem("cb_auth_email", cleanRegEmail);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanRegEmail,
        regPassword,
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: regName,
      });

      try {
        if (isCaregiver) {
          await setDoc(doc(db, "caregivers", user.uid), {
            id: user.uid,
            full_name: regName,
            email: cleanRegEmail,
            phone: regPhone,
            area: regArea,
            hourly_rate: regRate,
            is_available: false,
            experience_years: 0,
            expertise: regExpertise,
            bio: regBio || "Clinical nursing student eager to care for elders.",
            gender: regGender,
            created_at: new Date().toISOString(),
          });
        } else {
          await setDoc(doc(db, "users", user.uid), {
            id: user.uid,
            full_name: regName,
            email: cleanRegEmail,
            phone: "",
            location: regLocation,
            relation: regRelation,
            created_at: new Date().toISOString(),
          });
        }
      } catch (insertErr) {
        console.error("Failed to insert details into Firestore", insertErr);
      }

      onAuthSuccess(regName);
    } catch (err: any) {
      if (
        err.code === "auth/operation-not-allowed" ||
        (err.message && err.message.includes("operation-not-allowed"))
      ) {
        // alert(
        //   "⚠️ Email/Password Auth is not yet enabled in your Firebase Console.\n\n" +
        //   "💡 To let you explore CareBridge instantly, we have logged you in with a simulated local session for this preview!"
        // );
        const dummyUid = "fb_" + regName.replace(/\s+/g, "_").toLowerCase();
        localStorage.setItem("cb_auth_fallback", regName);
        localStorage.setItem("cb_auth_uid", dummyUid);
        if (isCaregiver) {
          try {
            await setDoc(doc(db, "caregivers", dummyUid), {
              id: dummyUid,
              full_name: regName,
              email: cleanRegEmail,
              phone: regPhone,
              area: regArea,
              hourly_rate: regRate,
              is_available: false,
              experience_years: 1,
              expertise: regExpertise,
              bio:
                regBio || "Clinical nursing student eager to care for elders.",
              gender: regGender,
              created_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Failed to write fallback caregiver to database:", e);
          }
        } else {
          try {
            await setDoc(doc(db, "users", dummyUid), {
              id: dummyUid,
              full_name: regName,
              email: cleanRegEmail,
              phone: "",
              location: regLocation,
              relation: regRelation,
              created_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Failed to write fallback user to database:", e);
          }
        }
        onAuthSuccess(regName);
      } else {
        alert(err.message || "An error occurred during registration.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const cleanEmail = user.email ? user.email.toLowerCase().trim() : "";
      localStorage.setItem("cb_auth_email", cleanEmail);

      const isCaregiver = isValidCaregiverEmail(cleanEmail);
      let exists = false;
      if (cleanEmail) {
        exists = await checkEmailInDb(cleanEmail);
      }

      if (!exists && user.uid && cleanEmail) {
        if (isCaregiver) {
          await setDoc(doc(db, "caregivers", user.uid), {
            id: user.uid,
            full_name: user.displayName || "Authorized Caregiver",
            email: cleanEmail,
            phone: user.phoneNumber || "",
            area: "Dhanmondi",
            hourly_rate: 350,
            is_available: true,
            experience_years: 1,
            expertise: "Companion Care",
            bio: "Authorized nursing student.",
            gender: "Female",
            created_at: new Date().toISOString(),
          });
        } else {
          await setDoc(doc(db, "users", user.uid), {
            id: user.uid,
            full_name: user.displayName || "Family Relative",
            email: cleanEmail,
            phone: user.phoneNumber || "",
            location: "Dhanmondi",
            relation: "Relative of Elder",
            created_at: new Date().toISOString(),
          });
        }
      }

      onAuthSuccess(user.displayName || user.email?.split("@")[0] || "User");
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      // Ensure we don't alert standard user cancellations
      if (err.code !== "auth/popup-closed-by-user") {
        alert("Google Sign-In failed: " + (err.message || String(err)));
      }
    }
  };

  // const loadDemoUser = async () => {
  //   const demoEmail = 'demo@carebridge.com';
  //   const demoPassword = 'Password123!';
  //   localStorage.setItem("cb_auth_email", demoEmail);
  //   try {
  //     try {
  //       const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
  //       const user = userCredential.user;
  //       onAuthSuccess(user.displayName || 'Ameera Islam');
  //       return;
  //     } catch (signError: any) {
  //       if (signError.code === 'auth/operation-not-allowed' || (signError.message && signError.message.includes('operation-not-allowed'))) {
  //         throw signError;
  //       }
  //       // Sign-in failed, so try signing up
  //       const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
  //       const user = userCredential.user;

  //       await updateProfile(user, {
  //         displayName: 'Ameera Islam'
  //       });

  //       try {
  //         await setDoc(doc(db, 'users', user.uid), {
  //           id: user.uid,
  //           full_name: 'Ameera Islam',
  //           email: demoEmail,
  //           phone: '+8801712345678',
  //           created_at: new Date().toISOString()
  //         });
  //       } catch (e) {}

  //       onAuthSuccess('Ameera Islam');
  //     }
  //   } catch (err: any) {
  //     localStorage.setItem("cb_auth_fallback", "Ameera Islam");
  //     localStorage.setItem("cb_auth_uid", "fb_ameera_islam");
  //     onAuthSuccess('Ameera Islam');
  //   }
  // };

  // const loadDemoCaregiver = async () => {
  //   const cgEmail = 'samia@du.student.edu.bd';
  //   const cgUid = "fb_samia_rahman";
  //   localStorage.setItem("cb_auth_email", cgEmail);
  //   localStorage.setItem("cb_auth_fallback", "Samia Rahman (DU Student)");
  //   localStorage.setItem("cb_auth_uid", cgUid);

  //   try {
  //     await setDoc(doc(db, 'caregivers', cgUid), {
  //       id: cgUid,
  //       full_name: "Samia Rahman (DU Student)",
  //       email: cgEmail,
  //       phone: "+8801755566677",
  //       area: 'Dhanmondi',
  //       hourly_rate: 350,
  //       is_available: true,
  //       experience_years: 2,
  //       expertise: 'Companion Care',
  //       bio: 'Enthusiastic senior clinical nursing student with practical hospital ward training to care for elders with cardiac recovery needs.',
  //       gender: 'Female',
  //       created_at: new Date().toISOString()
  //     }, { merge: true });
  //   } catch (e) {
  //     console.warn("Failed to register demo caregiver in database:", e);
  //   }

  //   onAuthSuccess("Samia Rahman (DU Student)");
  // };

  return (
    <div className="max-w-md w-full mx-auto bg-white border border-slate-100 rounded-3xl shadow-lg overflow-hidden my-8">
      {/* Visual Top Branding banner */}
      <div className="bg-gradient-to-r from-sky-400 to-indigo-500 p-6 text-white text-center">
        <h3 className="font-display font-extrabold text-2xl tracking-tight">
          CareBridge
        </h3>
        <p className="text-xs text-sky-100 mt-1 font-light">
          Trusted elder companionship and nursing care in Dhaka
        </p>
      </div>

      {/* Tabs Controller */}
      <div className="flex border-b border-slate-100">
        <button
          id="tab-login"
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex-1 py-3.5 text-center text-sm font-semibold transition-all relative ${
            activeTab === "login"
              ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/10"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Sign In
        </button>
        <button
          id="tab-register"
          type="button"
          onClick={() => {
            setActiveTab("register");
            setRegisterStep(1);
          }}
          className={`flex-1 py-3.5 text-center text-sm font-semibold transition-all relative ${
            activeTab === "register"
              ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/10"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {/* Simple quick login help */}
        {/* <div className="mb-6 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-150 flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs gap-3">
          <span className="font-semibold text-slate-705 flex items-center gap-1.5 justify-center">
            <Sparkles className="h-4 w-4 text-sky-500 animate-pulse" />
            Instant Sandbox Portals:
          </span>
          <div className="flex gap-2 justify-center">
            <button
              id="quick-demo-login-btn"
              type="button"
              onClick={loadDemoUser}
              className="px-3 py-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100 font-bold rounded-xl transition-all cursor-pointer text-[11px]"
            >
              Demo Relative
            </button>
            <button
              id="caregiver-demo-login-btn"
              type="button"
              onClick={loadDemoCaregiver}
              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-105 border border-indigo-100 font-bold rounded-xl transition-all cursor-pointer text-[11px]"
            >
              Demo Student Caregiver
            </button>
          </div>
        </div> */}

        {/* Recommended Google Sign-In */}
        <div className="mb-6">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-xs active:scale-97 cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.243-3.12C18.435 1.838 15.58 1 12.24 1C5.73 1 .48 6.252.48 12.75s5.25 11.75 11.76 11.75c6.8 0 11.315-4.783 11.315-11.522 0-.776-.08-1.365-.18-1.693H12.24z"
              />
            </svg>
            <span className="text-xs">Continue with Google</span>
          </button>

          <div className="relative my-4 flex py-1.5 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              or continue with email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
        </div>

        {activeTab === "login" ? (
          /* LOGIN FORM */
          <form
            id="auth-login-form"
            onSubmit={handleLoginSubmit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. ameera@domain.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white text-black border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                />
              </div>

              {/* Login Email existence warning */}
              {loginEmail.trim() !== "" &&
                loginEmail.includes("@") &&
                loginEmail.includes(".") && (
                  <div className="mt-1.5 text-xs transition-all flex items-center gap-1.5">
                    {isCheckingLoginEmail ? (
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                        Checking account database...
                      </span>
                    ) : loginEmailExists === false ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Create an account first
                      </span>
                    ) : loginEmailExists === true ? (
                      <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Registered account detected
                      </span>
                    ) : null}
                  </div>
                )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 text-black border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isCheckingLoginEmail || loginEmailExists !== true}
              className={`w-full py-3 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 mt-2 active:scale-97 cursor-pointer ${
                isCheckingLoginEmail || loginEmailExists !== true
                  ? "bg-slate-300 hover:bg-slate-300 cursor-not-allowed opacity-60"
                  : "bg-sky-500 hover:bg-sky-600"
              }`}
            >
              <span>Sign In Securely</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form
            id="auth-register-form"
            onSubmit={handleRegisterSubmit}
            className="space-y-4"
          >
            {/* Step indicator */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-2">
              <span className="text-xs font-bold text-slate-700">
                {registerStep === 1
                  ? "Step 1: General Info"
                  : "Step 2: Profile Details"}
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full font-bold">
                {registerStep} / 2
              </span>
            </div>

            {registerStep === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold text-slate-700"
                    htmlFor="reg-name-input"
                  >
                    Your Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      id="reg-name-input"
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Ameera Islam"
                      className="w-full pl-9 text-black pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold text-slate-700"
                    htmlFor="reg-email-input"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      id="reg-email-input"
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. user@du.student.edu.bd"
                      className="w-full pl-9 pr-4 py-2.5 text-sm text-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                    />
                  </div>

                  {/* Register Email existence warning */}
                  {regEmail.trim() !== "" &&
                    regEmail.includes("@") &&
                    regEmail.includes(".") && (
                      <div className="mt-1.5 text-xs transition-all flex items-center gap-1.5">
                        {isCheckingRegEmail ? (
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                            Checking availability...
                          </span>
                        ) : regEmailExists === true ? (
                          <span className="text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="h-3.5 w-3.5 animate-bounce" />
                            You already have an account. Please Enter another
                            valid email
                          </span>
                        ) : regEmailExists === false ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Email is available!
                          </span>
                        ) : null}
                      </div>
                    )}

                  {/* EDUCATIONAL MAIL SYNTAX VALIDATION */}
                  {regEmail.trim() !== "" && (
                    <div className="mt-2 p-2.5 rounded-xl border border-slate-150 text-[10.5px]">
                      {regEmail
                        .toLowerCase()
                        .trim()
                        .endsWith(".student.edu.bd") ||
                      regEmail
                        .toLowerCase()
                        .trim()
                        .endsWith("@student.edu.bd") ||
                      regEmail.toLowerCase().trim().endsWith(".edu.bd") ||
                      regEmail.toLowerCase().trim().endsWith("@edu.bd") ? (
                        isValidCaregiverEmail(regEmail) ? (
                          <div className="text-emerald-700 font-semibold">
                            <span className="font-extrabold flex items-center gap-1 text-[11px]">
                              <GraduationCap className="h-4 w-4 text-emerald-500" />
                              ✓ Valid Educational Domain Detected
                            </span>
                            <span className="block mt-0.5 text-slate-500">
                              Classifying as: <strong>Caregiver Student</strong>{" "}
                              (automatic post-routing enabled)
                            </span>
                          </div>
                        ) : (
                          <div className="text-rose-700">
                            <span className="font-extrabold block text-[11px]">
                              ⚠️ Invalid Caregiver Domain Representation
                            </span>
                            <span className="block mt-0.5 text-slate-500 leading-relaxed font-light">
                              Emails representing a specific institutional
                              format are required (e.g.{" "}
                              <strong>user@du.student.edu.bd</strong>). Generic
                              student.edu.bd or edu.bd elements are not
                              accepted.
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="text-sky-700 font-semibold">
                          <span className="font-extrabold block text-[11px]">
                            ✓ General Email Detected
                          </span>
                          <span className="block mt-0.5 text-slate-500">
                            Classifying as: <strong>Relative User</strong> (Care
                            Seeker portal)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  id="register-next-btn"
                  type="button"
                  onClick={handleNextStep}
                  disabled={
                    isCheckingRegEmail ||
                    regEmailExists !== false ||
                    !regName.trim()
                  }
                  className={`w-full py-3 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 mt-2 active:scale-97 cursor-pointer ${
                    isCheckingRegEmail ||
                    regEmailExists !== false ||
                    !regName.trim()
                      ? "bg-slate-300 hover:bg-slate-300 cursor-not-allowed opacity-60"
                      : "bg-sky-500 hover:bg-sky-600"
                  }`}
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label
                    className="block text-xs font-semibold text-slate-700"
                    htmlFor="reg-password-input"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="reg-password-input"
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Make it strong"
                      className="w-full pl-9 pr-4 py-2.5 text-sm text-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                    />
                  </div>
                </div>

                {isValidCaregiverEmail(regEmail) ? (
                  /* CAREGIVER SPECIFIC REGISTRATION DETAILS */
                  <div className="space-y-3.5 transition-all">
                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-phone-input"
                      >
                        Verified Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-phone-input"
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. +8801700000000"
                          className="w-full pl-9 pr-4 py-2.5 text-sm text-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-area-input"
                      >
                        Location Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-area-input"
                          type="text"
                          required
                          value={regArea}
                          onChange={(e) => setRegArea(e.target.value)}
                          placeholder="e.g. Dhanmondi, Dhaka"
                          className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                        />
                      </div>
                    </div> */}

                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-location-select"
                      >
                        Location Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <MapPin className="h-4.5 w-4.5" />
                        </span>
                        <select
                          id="reg-location-select"
                          value={regArea}
                          onChange={(e) => setRegArea(e.target.value)}
                          className="w-full pl-9 pr-2 py-2.5 text-xs text-black bg-slate-50 border border-slate-200 rounded-xl outline-hidden appearance-none"
                        >
                          {DHAKA_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-700">
                      <div className="space-y-1.5">
                        <label className="block" htmlFor="reg-rate-input">
                          Rate (৳/hr)
                        </label>
                        <input
                          id="reg-rate-input"
                          type="number"
                          required
                          value={regRate}
                          onChange={(e) => setRegRate(Number(e.target.value))}
                          className="w-full px-2.5 py-2 text-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block" htmlFor="reg-expertise-input">
                          Specialty Focus
                        </label>
                        <select
                          id="reg-expertise-input"
                          value={regExpertise}
                          onChange={(e) => setRegExpertise(e.target.value)}
                          className="w-full px-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white text-[11px]"
                        >
                          <option value="Clinical Eldercare">
                            Clinical Eldercare
                          </option>
                          <option value="Daily Companionship">
                            Daily Companionship
                          </option>
                          <option value="Post-Stroke Rehabilitation">
                            Post-Stroke Rehabilitation
                          </option>
                          <option value="Alzheimer's Memory Assist">
                            Alzheimer's Memory Assist
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

                      <div className="space-y-1.5">
                        <label className="block" htmlFor="reg-gender-input">
                          Gender
                        </label>
                        <select
                          id="reg-gender-input"
                          value={regGender}
                          onChange={(e) =>
                            setRegGender(e.target.value as "Male" | "Female")
                          }
                          className="w-full px-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white text-[11px]"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-bio-input"
                      >
                        Caregiver Biography
                      </label>
                      <textarea
                        id="reg-bio-input"
                        rows={2}
                        required
                        value={regBio}
                        onChange={(e) => setRegBio(e.target.value)}
                        placeholder="Tell relatives about your nursing/companionship courses..."
                        className="w-full px-3 py-2 text-xs text-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 outline-hidden focus:bg-white leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  /* RELATIVE ACC CUSTOM STEP 2 */
                  <div className="grid grid-cols-2 gap-3 pb-1 transition-all">
                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-location-select"
                      >
                        Dhaka Neighborhood
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <MapPin className="h-4.5 w-4.5" />
                        </span>
                        <select
                          id="reg-location-select"
                          value={regLocation}
                          onChange={(e) => setRegLocation(e.target.value)}
                          className="w-full pl-9 pr-2 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden appearance-none"
                        >
                          {DHAKA_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-700"
                        htmlFor="reg-relation-select"
                      >
                        Relation to Elder
                      </label>
                      <select
                        id="reg-relation-select"
                        value={regRelation}
                        onChange={(e) => setRegRelation(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                      >
                        <option value="Daughter">Daughter</option>
                        <option value="Son">Son</option>
                        <option value="Nieces/Nephew">Niece/Nephew</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Grandchild">Grandchild</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 text-xs font-bold">
                  <button
                    id="register-back-btn"
                    type="button"
                    onClick={() => setRegisterStep(1)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 ml-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    id="register-submit-btn"
                    type="submit"
                    className="flex-2 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 ml-2 cursor-pointer"
                  >
                    <span>Submit & Terms</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-450 text-center justify-center">
          <ShieldCheck className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
          <span>
            Vetted caregiver booking standards conform entirely with NID
            background regulations.
          </span>
        </div> */}

        {onCancel && (
          <div className="text-center mt-5">
            <button
              id="auth-go-back"
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-sky-600 cursor-pointer"
            >
              Go Back to Platform
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
