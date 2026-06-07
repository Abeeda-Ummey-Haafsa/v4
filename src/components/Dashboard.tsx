/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, User, MapPin, ClipboardList, CheckCircle2, Clock, MapPinned, FileHeart, ExternalLink, HelpCircle } from 'lucide-react';
import { Booking, Caregiver, ElderProfile } from '../types';
import { CaregiverAvatar } from './CaregiverAvatar';

interface DashboardProps {
  bookings: Booking[];
  caregivers: Caregiver[];
  elderProfiles: ElderProfile[];
  onNavigateToSearch: () => void;
  onCancelBooking: (bookingId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  bookings,
  caregivers,
  elderProfiles,
  onNavigateToSearch,
  onCancelBooking
}) => {
  if (bookings.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-xs space-y-6">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-sky-50 text-sky-500">
          <Calendar className="h-10 w-10 text-sky-650" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Schedule Your First Caregiver Visit
          </h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto font-light leading-relaxed">
            No active bookings scheduled in your profile. Browse our 5-6 premier vetted caregivers in Dhaka to support your elders today.
          </p>
        </div>
        <div className="pt-2">
          <button
            id="discover-caregivers-empty-btn"
            onClick={onNavigateToSearch}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-xl shadow-xs hover:shadow-sm transition-all inline-flex items-center gap-2 active:scale-97 cursor-pointer"
          >
            <span>Browse Dhaka Caregivers</span>
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          * Vetting includes physical address identification and medical practice clearances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Intro Greetings Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-sky-50/50 border border-sky-100 p-6 rounded-3xl">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
            Greetings, Relative Workspace
          </h2>
          <p className="text-sm text-sky-700 font-light mt-0.5">
            Monitor background checks, scheduling shifts, and caregivers in realtime.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="p-1 px-3 bg-white text-emerald-600 rounded-full font-bold text-xs border border-emerald-100/60 shadow-xs flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Monitor Online
          </span>
        </div>
      </div>

      {/* Main Grid: Bookings on left, Today's Live Care logs on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Bookings Tracker Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-500" />
            Scheduled Shifts in Dhaka
          </h3>

          <div className="space-y-4">
            {bookings.map((booking) => {
              const caregiver = caregivers.find((c) => c.id === booking.caregiverId);
              const elder = elderProfiles.find((e) => e.id === booking.elderProfileId);

              if (!caregiver || !elder) return null;

              return (
                <div 
                  key={booking.id}
                  id={`booking-card-${booking.id}`} 
                  className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden hover:border-slate-200 transition-all"
                >
                  <div className="p-5 space-y-4">
                    {/* Header: Caregiver info */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3">
                        <CaregiverAvatar
                          gender={caregiver.gender}
                          className="h-12 w-12 rounded-xl"
                          iconClassName="h-6 w-6"
                        />
                        <div>
                          <h4 className="font-display font-bold text-slate-800 text-sm leading-tight">
                            {caregiver.name}
                          </h4>
                          <p className="text-xs text-sky-600 font-medium">
                            {caregiver.certification}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                        booking.status === 'Confirmed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : booking.status === 'Completed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    {/* Meta info block: Elder, Schedule dates, Location */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase">Elder Member</span>
                        <span className="font-semibold text-slate-800 line-clamp-1">{elder.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-450 block text-[10px] uppercase">Shifts Schedule</span>
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {booking.startDate} &mdash; {booking.endDate}
                        </span>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-slate-450 block text-[10px] uppercase">Assisted Area</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="h-3 w-3 text-sky-500" />
                          {elder.location}
                        </span>
                      </div>
                    </div>

                    {/* Notes logged by relative during submit */}
                    {booking.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border-l-2 border-sky-400">
                        <strong>My Request:</strong> "{booking.notes}"
                      </p>
                    )}
                  </div>

                  {/* Pricing billing status and actions */}
                  <div className="px-5 py-3.5 bg-slate-50/75 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-450 text-[10px] uppercase block">Total Billing</span>
                      <span className="text-base font-display font-extrabold text-slate-900">৳{booking.totalCost}</span>
                      <span className="text-[10px] font-light text-slate-500"> ({booking.hoursPerDay}h/day, including protection)</span>
                    </div>

                    {booking.status === 'Confirmed' && (
                      <button
                        id={`cancel-booking-btn-${booking.id}`}
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this booking? Recovery is immediate.')) {
                            onCancelBooking(booking.id);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Care Shift Daily updates checklist (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <h3 className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-500" />
            Today's Care logs & Checklist
          </h3>

          {bookings.filter(b => b.status === 'Confirmed').map((booking) => {
            const caregiver = caregivers.find(c => c.id === booking.caregiverId);
            const elder = elderProfiles.find(e => e.id === booking.elderProfileId);
            const report = booking.reportStatus || {
              medicineSupplied: true,
              mealsTaken: true,
              exerciseDone: true,
              sleepHours: 8,
              activityNotes: 'Relative had a fantastic afternoon walk. Enjoyed reading news.'
            };

            if (!caregiver || !elder) return null;

            return (
              <div 
                key={`report-${booking.id}`}
                className="bg-white border-2 border-sky-100 rounded-3xl p-5 shadow-xs space-y-4"
              >
                {/* Header info */}
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center bg-sky-50/30 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <FileHeart className="h-5 w-5 text-sky-500" />
                    <div>
                      <h4 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Realtime Shift Status
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-none">
                        Logged by {caregiver.name} today
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 rounded-full animate-pulse uppercase">
                    Live Duty
                  </span>
                </div>

                {/* Elder Patient label metadata */}
                <p className="text-xs text-slate-700">
                  Patient on Bed: <strong>{elder.name}</strong>, age {elder.age} in {elder.location}.
                </p>

                {/* Health checklists and indicators */}
                <div className="space-y-3 pt-1">
                  
                  {/* Medicine Supplied Status */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center ${
                        report.medicineSupplied ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-500'
                      }`}>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-slate-750">Prescription Meds Issued</span>
                    </div>
                    <span className="font-bold text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                      Administered
                    </span>
                  </div>

                  {/* Meals Taken Status */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-5 w-5 rounded-md flex items-center justify-center bg-emerald-500 text-white">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-slate-750">Diabetic Meals Prepared</span>
                    </div>
                    <span className="font-bold text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                      Consumed
                    </span>
                  </div>

                  {/* Exercise Mobility support status */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-5 w-5 rounded-md flex items-center justify-center ${
                        report.exerciseDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-semibold text-slate-750">Morning Park Walks & Rehab</span>
                    </div>
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md uppercase ${
                      report.exerciseDone ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                    }`}>
                      {report.exerciseDone ? 'Completed' : 'Pending Shift'}
                    </span>
                  </div>

                  {/* Sleep Tracker */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4.5 w-4.5 text-sky-500" />
                      <span className="font-semibold text-slate-750">Restful Sleep Logged</span>
                    </div>
                    <span className="font-bold text-sky-700 bg-sky-55/70 px-2.5 py-0.5 rounded-md font-mono">
                      {report.sleepHours} Hours
                    </span>
                  </div>
                </div>

                {/* Caregiver live clinical notes */}
                <div className="p-3.5 bg-yellow-50/50 rounded-2xl border border-yellow-150 text-xs text-slate-650 space-y-1">
                  <span className="block font-bold text-[10px] text-yellow-800 uppercase tracking-wider">
                    Caregiver Daily Notes:
                  </span>
                  <p className="italic font-light">
                    "{report.activityNotes}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
