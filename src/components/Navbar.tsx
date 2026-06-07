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
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 border-b border-teal-800/30 backdrop-blur-xl bg-opacity-95 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand left */}
          <div className="flex items-center">
            <button 
              id="brand-logo-btn"
              onClick={() => setView('home')} 
              className="flex items-center gap-2.5 group focus:outline-hidden"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-all duration-200">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="font-display font-extrabold text-lg tracking-tight text-white group-hover:text-blue-300 transition-colors duration-150">
                  Care<span className="text-teal-400">Bridge</span>
                </span>
              </div>
            </button>
          </div>

          {/* Nav Links Center */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              id="nav-home-btn"
              onClick={() => setView('home')}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                currentView === 'home'
                  ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
              }`}
            >
              Home
            </button>

            {userRole === 'caregiver' ? (
              <button
                id="nav-caregiver-workspace-btn"
                onClick={() => setView('caregiver-portal')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                  currentView === 'caregiver-portal'
                    ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
                }`}
              >
                <HeartHandshake className="h-4 w-4 text-blue-400 animate-pulse" />
                <span>Caregiver Workspace</span>
              </button>
            ) : (
              <>
                <button
                  id="nav-search-btn"
                  onClick={() => setView('search')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'search'
                      ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                      : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Find Caregivers
                </button>
                <button
                  id="nav-bookings-btn"
                  onClick={() => setView('bookings')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'bookings'
                      ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                      : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  My Bookings
                  {isLoggedIn && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 ml-1 text-[10px] font-bold leading-none text-emerald-950 bg-emerald-400 rounded-full">
                      Active
                    </span>
                  )}
                </button>
                <button
                  id="nav-elders-btn"
                  onClick={() => setView('elder-profiles')}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg flex items-center gap-1.5 ${
                    currentView === 'elder-profiles'
                      ? 'text-blue-300 bg-blue-500/15 border border-blue-500/30'
                      : 'text-slate-300 hover:text-blue-300 hover:bg-blue-500/10'
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
              <div className="flex items-center gap-3 pl-3 border-l border-blue-500/20">
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-semibold text-blue-100">{userName}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {userName.charAt(0)}
                </div>
                <button
                  id="nav-logout-btn"
                  onClick={onLogout}
                  className="p-2 ml-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
                  className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-blue-300 hover:bg-blue-500/15 rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  id="nav-register-btn"
                  onClick={onRegisterClick}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Tab bar */}
      <div className="flex md:hidden border-t border-blue-500/20 bg-slate-900 justify-around py-2">
        <button
          id="mobile-nav-home"
          onClick={() => setView('home')}
          className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
            currentView === 'home' ? 'text-blue-400' : 'text-slate-400'
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
              currentView === 'caregiver-portal' ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            <HeartHandshake className="h-5 w-5" />
            <span>Workspace</span>
          </button>
        ) : (
          <>
            <button
              id="mobile-nav-search"
              onClick={() => setView('search')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'search' ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Caregivers</span>
            </button>
            <button
              id="mobile-nav-bookings"
              onClick={() => setView('bookings')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'bookings' ? 'text-blue-400' : 'text-slate-400'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span>Bookings</span>
            </button>
            <button
              id="mobile-nav-elders"
              onClick={() => setView('elder-profiles')}
              className={`flex flex-col items-center text-[10px] font-medium gap-0.5 ${
                currentView === 'elder-profiles' ? 'text-blue-400' : 'text-slate-400'
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
