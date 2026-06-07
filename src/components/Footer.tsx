/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HeartPulse, Mail, Phone, MapPin, ShieldCheck, HelpCircle } from 'lucide-react';
import { AppView } from '../types';

interface FooterProps {
  setView: (view: AppView) => void;
  onSectionScroll?: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setView, onSectionScroll }) => {
  const handleScrollTo = (id: string) => {
    if (onSectionScroll) {
      onSectionScroll(id);
    } else {
      setView('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Left */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <HeartPulse className="h-5 w-5" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Care<span className="text-sky-400">Bridge</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              CareBridge is Dhaka's premier healthcare marketplace, bridging loving relatives and certified geriatric caregivers. We verify backgrounds so you can book with absolute peace of mind.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-block px-2.5 py-1 text-[10px] uppercase tracking-wider bg-slate-800 text-sky-400 rounded-md font-semibold font-mono">
                Dhaka Only (৳ BDT)
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-100">
              Platform Care
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleScrollTo('how-it-works')}
                  className="hover:text-sky-400 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  How CareBridge Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScrollTo('benefits')}
                  className="hover:text-sky-400 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Our Core Benefits
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScrollTo('trust-safety')}
                  className="hover:text-sky-400 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Trust & Safety Policies
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView('search')}
                  className="hover:text-sky-400 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Search Caregivers Dhaka
                </button>
              </li>
            </ul>
          </div>

          {/* Trust Guarantees */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-100">
              Vetting Standards
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <strong>Police Cleared:</strong> Every caregiver goes through physical address Verification and criminal background checks in Dhaka.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <HelpCircle className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <strong>Emergency Backup:</strong> In case your caretaker falls ill, a certified standby arrives in under 2 hours.
                </span>
              </div>
            </div>
          </div>

          {/* Local Details */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-slate-100">
              Dhaka Support Office
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Level 4, House 54, Road 11, Banani C/A, Dhaka 1213, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="font-semibold">+880 1800-CBRIDGE (274343)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-400 shrink-0" />
                <span>support@carebridge.com.bd</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Bottom copyright */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} CareBridge BD Ltd. All Rights Reserved. Supporting elders in Banani, Gulshan, Dhanmondi, Uttara, Mirpur, & Mohammadpur.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Regulated Elder Care Platform License: #DH-100293 BG</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
