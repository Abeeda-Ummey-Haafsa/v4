/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeartPulse, Calendar, Users, FileText, LogIn, LogOut, HeartHandshake, UserPlus } from 'lucide-react';
import { AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  onLoginClick: () => void;
  onRegisterClick: () => void;
  userName?: string;
  userRole?: 'relative' | 'caregiver';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setView,
  isLoggedIn,
  onLogout,
  onLoginClick,
  onRegisterClick,
  userName = 'Ameera Islam',
  userRole = 'relative'
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand left */}
          <div className="flex items-center">
            <button 
              id="brand-logo-btn"
              onClick={() => setView('home')} 
              className="flex items-center gap-2.5 group focus:outline-hidden"
            >
              <div className="p-2 rounded-xl bg-sky-50 text-sky-500 group-hover:bg-sky-100 transition-colors duration-200">
                <HeartPulse className="h-6 w-6 text-sky-600" />
              </div>
              <div className="text-left">
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors duration-150">
                  Care<span className="text-sky-500">Bridge</span>
                </span>
                {/* <span className="block text-[10px] font-sans font-semibold text-slate-400 tracking-wider uppercase -mt-1">
                  Dhaka Support
                </span> */}
              </div>
            </button>
          </div>

          {/* Nav Links Center */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              id="nav-home-btn"
              onClick={() => setView('home')}
              className={`px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg ${
                currentView === 'home'
                  ? 'text-sky-600 bg-sky-50/70'
                  : 'text-slate-600 hover:text-sky-600 hover:bg-slate-50'
              }`}
            >
              Home
            </button>

            {userRole === 'caregiver' ? (
              <button
                id="nav-caregiver-workspace-btn"
                onClick={() => setView('caregiver-portal')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg flex items-center gap-1.5 ${
                  currentView === 'caregiver-portal'
                    ? 'text-sky-600 bg-sky-55'
                    : 'text-slate-650 hover:text-sky-600 hover:bg-slate-50'
                }`}
              >
                <HeartHandshake className="h-4 w-4 text-sky-500 animate-pulse" />
                <span>Caregiver Workspace</span>
              </button>
            ) : (
              <>
                <button
                  id="nav-search-btn"
                  onClick={() => setView('search')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'search'
                      ? 'text-sky-600 bg-sky-50/70'
                      : 'text-slate-600 hover:text-sky-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Find Caregivers
                </button>
                <button
                  id="nav-bookings-btn"
                  onClick={() => setView('bookings')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'bookings'
                      ? 'text-sky-600 bg-sky-50/70'
                      : 'text-slate-600 hover:text-sky-600 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  My Bookings
                  {isLoggedIn && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 ml-1 text-[10px] font-bold leading-none text-white bg-emerald-500 rounded-full">
                      Active
                    </span>
                  )}
                </button>
                <button
                  id="nav-elders-btn"
                  onClick={() => setView('elder-profiles')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'elder-profiles'
                      ? 'text-sky-600 bg-sky-50/70'
                      : 'text-slate-600 hover:text-sky-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Elders Profile
                </button>
              </>
            )}
          </div>

          {/* Auth Rights Side */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
                <div className="hidden lg:block text-right">
                  {/* <p className="text-xs text-slate-450 font-semibold text-slate-500">
                    {userRole === 'caregiver' ? 'Student Caregiver' : 'Active Relative'}
                  </p> */}
                  <p className="text-sm font-semibold text-slate-800">{userName}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm border-2 border-sky-450">
                  {userName.charAt(0)}
                </div>
                <button
                  id="nav-logout-btn"
                  onClick={onLogout}
                  className="p-2 ml-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="nav-login-btn"
                  onClick={onLoginClick}
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-sky-600 hover:bg-sky-50/50 rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  id="nav-register-btn"
                  onClick={onRegisterClick}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 active:scale-97 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Tab bar at bottom of mobile viewport or standard fluid menu. Let's make a beautiful fluid layout */}
      <div className="flex md:hidden border-t border-slate-100 bg-white justify-around py-2">
        <button
          id="mobile-nav-home"
          onClick={() => setView('home')}
          className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
            currentView === 'home' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <HeartHandshake className="h-5 w-5" />
          <span>Home</span>
        </button>
        {userRole === 'caregiver' ? (
          <button
            id="mobile-nav-caregiver-workspace"
            onClick={() => setView('caregiver-portal')}
            className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
              currentView === 'caregiver-portal' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <HeartHandshake className="h-5 w-5 text-sky-500" />
            <span>Workspace</span>
          </button>
        ) : (
          <>
            <button
              id="mobile-nav-search"
              onClick={() => setView('search')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'search' ? 'text-sky-600' : 'text-slate-500'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Caregivers</span>
            </button>
            <button
              id="mobile-nav-bookings"
              onClick={() => setView('bookings')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'bookings' ? 'text-sky-600' : 'text-slate-500'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span>Bookings</span>
            </button>
            <button
              id="mobile-nav-elders"
              onClick={() => setView('elder-profiles')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'elder-profiles' ? 'text-sky-600' : 'text-slate-500'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Elders</span>
            </button>
          </>
        )}
      </div>

    </nav>
  );
};
