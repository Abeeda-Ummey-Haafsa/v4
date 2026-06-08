/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, MapPin, ShieldCheck, Award, Calendar, ChevronRight } from 'lucide-react';
import { Caregiver } from '../types';
import { CaregiverAvatar } from './CaregiverAvatar';

interface CaregiverCardProps {
  caregiver: Caregiver;
  distance: string;
  onViewProfile: (caregiver: Caregiver) => void;
  onBook: (caregiver: Caregiver) => void;
}

export const CaregiverCard: React.FC<CaregiverCardProps> = ({
  caregiver,
  distance,
  onViewProfile,
  onBook
}) => {
  return (
    <div 
      id={`caregiver-card-${caregiver.id}`}
      className="bg-white border border-slate-150 rounded-2xl shadow-xs hover:shadow-md hover:border-sky-300 transition-all duration-300 flex flex-col overflow-hidden group"
    >
      {/* Upper header section with stats */}
      <div className="relative h-20 bg-gradient-to-tr from-sky-50/60 to-blue-50/40 p-3.5 flex justify-between items-start">
        {/* Availability Badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-3xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active & Ready</span>
        </span>
      </div>

      {/* Main info card */}
      <div className="px-4.5 -mt-8 flex-1 pb-4 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Avatar and Main Meta */}
          <div className="flex items-end gap-3">
            <div className="relative">
              <CaregiverAvatar
                gender={caregiver.gender}
                className="h-16 w-16 border-3 border-white shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full border border-white">
                <ShieldCheck className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="overflow-hidden pb-0.5">
              <h3 className="font-display font-extrabold text-sm text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                {caregiver.name}
              </h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5 font-medium">
                <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
                <span className="truncate">{caregiver.location}, Dhaka</span>
              </p>
            </div>
          </div>

          {/* Core short description */}
          <p className="text-[11px] text-black leading-relaxed line-clamp-2 italic font-light">
            "{caregiver.bio}"
          </p>

          {/* Specialty Expertise pill list */}
          <div className="flex flex-wrap gap-1">
            {caregiver.specialties.map((spec, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 text-[9px] font-bold text-sky-600 bg-sky-50/70 border border-sky-100 rounded"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Rating and Hourly Rate Section */}
        <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px]">
            {caregiver.rating && caregiver.reviewsCount && caregiver.reviewsCount > 0 ? (
              <>
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-slate-800">{Number(caregiver.rating).toFixed(1)}</span>
                <span className="text-slate-400">({caregiver.reviewsCount} reviews)</span>
              </>
            ) : (
              <span className="text-black italic">No reviews or ratings yet.</span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide block leading-none">Rate per Hour</span>
            <div className="mt-0.5">
              <span className="text-sm font-display font-black text-slate-900">৳{caregiver.ratePerHour}</span>
              <span className="text-[10px] text-slate-500 font-light">/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid CTA buttons footer */}
      <div className="bg-slate-50 border-t border-slate-100 grid grid-cols-2 p-2 gap-2">
        <button
          id={`view-profile-btn-${caregiver.id}`}
          onClick={() => onViewProfile(caregiver)}
          className="py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[10px] uppercase rounded-xl border border-slate-205 transition-all text-center cursor-pointer"
        >
          View Profile
        </button>

        <button
          id={`book-btn-${caregiver.id}`}
          onClick={() => onBook(caregiver)}
          className="py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-bold text-[10px] uppercase rounded-xl shadow-3xs hover:shadow-2xs transition-all text-center cursor-pointer flex items-center justify-center gap-1"
        >
          <span>Book Now</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
