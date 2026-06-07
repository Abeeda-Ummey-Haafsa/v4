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
    <footer className="bg-gradient-to-b from-blue-950/50 to-slate-950 text-slate-300 border-t border-blue-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Left */}
          <div className="md:col-span-1 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <HeartPulse className="h-5 w-5" />
              </div>
              <span className="font-display font-bold text-xl text-white">
                Care<span className="text-blue-400">Bridge</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              CareBridge is Dhaka's premier healthcare marketplace, connecting loving families with certified geriatric caregivers. We verify backgrounds so you can book with absolute peace of mind.
            </p>
            <div className="flex items-center gap-2 pt-3">
              <span className="inline-block px-3 py-1.5 text-[10px] uppercase tracking-wider bg-blue-500/20 text-blue-300 rounded-md font-semibold font-mono border border-blue-500/30">
                ৳ BDT Dhaka
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-blue-300">
              Platform
            </h4>
            <ul className="space-y-3 text-xs">
              <li>
                <button
                  onClick={() => handleScrollTo('how-it-works')}
                  className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  How CareBridge Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScrollTo('benefits')}
                  className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Our Core Benefits
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleScrollTo('trust-safety')}
                  className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Trust & Safety
                </button>
              </li>
              <li>
                <button
                  onClick={() => setView('search')}
                  className="text-slate-400 hover:text-blue-300 transition-colors cursor-pointer text-left focus:outline-hidden"
                >
                  Browse Caregivers
                </button>
              </li>
            </ul>
          </div>

          {/* Trust Guarantees */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-blue-300">
              Standards
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <strong className="text-slate-300">Police Verified:</strong> Criminal background checks & address verification for every caregiver.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <HelpCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="text-slate-400">
                  <strong className="text-slate-300">Emergency Backup:</strong> Certified standby caregiver within 2 hours if needed.
                </span>
              </div>
            </div>
          </div>

          {/* Local Details */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-blue-300">
              Contact Us
            </h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Level 4, House 54, Road 11, Banani, Dhaka 1213</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-300">+880 1800-CBRIDGE</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-slate-400">support@carebridge.bd</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-blue-500/20 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} CareBridge Bangladesh Ltd. All Rights Reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">License #DH-100293 BG</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
