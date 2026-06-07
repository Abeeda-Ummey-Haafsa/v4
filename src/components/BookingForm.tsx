/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Calendar, Clock, CreditCard, Lock, AlertCircle, Sparkle, UserCheck } from 'lucide-react';
import { Caregiver, ElderProfile, Booking } from '../types';
import { CaregiverAvatar } from './CaregiverAvatar';

interface BookingFormProps {
  caregiver: Caregiver;
  elder: ElderProfile; // Directly pass the selected elder from the search flow
  onCancel: () => void;
  onBook: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => void;
  onCreateElderClick?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  caregiver,
  elder,
  onCancel,
  onBook
}) => {
  // Date values
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getDayAfterTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // 1-day care session
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTomorrowString());
  const [endDate, setEndDate] = useState(getDayAfterTomorrowString());
  const [hoursPerDay, setHoursPerDay] = useState<number>(4);
  const [notes, setNotes] = useState('');

  // Stripe-Inspired Credit Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic cost calculations
  const [daysCount, setDaysCount] = useState<number>(1);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [serviceFee] = useState<number>(100); // ৳100 fixed service fee
  const [totalCost, setTotalCost] = useState<number>(0);

  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end >= start) {
      const differenceInTime = end.getTime() - start.getTime();
      const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24)) + 1;
      setDaysCount(differenceInDays);
      
      const calcSubtotal = differenceInDays * hoursPerDay * caregiver.ratePerHour;
      setSubtotal(calcSubtotal);
      setTotalCost(calcSubtotal + serviceFee);
    } else {
      setDaysCount(0);
      setSubtotal(0);
      setTotalCost(0);
    }
  }, [startDate, endDate, hoursPerDay, caregiver.ratePerHour, serviceFee]);

  // Handle formatted card inputs
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : clean);
  };

  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').substring(0, 4);
    if (clean.length >= 2) {
      setExpiryDate(`${clean.substring(0, 2)}/${clean.substring(2, 4)}`);
    } else {
      setExpiryDate(clean);
    }
  };

  const handleCvvChange = (val: string) => {
    setCvv(val.replace(/\D/g, '').substring(0, 3));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysCount <= 0) {
      alert('End date must be on or after the start date.');
      return;
    }
    if (cardNumber.length < 15 || cvv.length < 3 || !cardHolder || expiryDate.length < 5) {
      alert('Please fill out the payment details accurately.');
      return;
    }

    setIsProcessing(true);
    // Simulate safe processing transition delay
    setTimeout(() => {
      setIsProcessing(false);
      onBook({
        caregiverId: caregiver.id,
        elderProfileId: elder.id,
        startDate,
        endDate,
        hoursPerDay,
        totalCost,
        notes
      });
    }, 1200);
  };

  return (
    <div id="booking-checkout-container" className="animate-fade-in space-y-6">
      
      {/* Page Title */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight">Carebridge Booking Checkout</h2>
          {/* <p className="text-xs text-slate-500">Provide medical details and authorize standard payments in Dhaka security sectors.</p> */}
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-bold text-slate-600 hover:text-sky-600 cursor-pointer"
        >
          &larr; Back to Listings
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SUMMARIES & SPECIAL REQUIREMENTS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Dual Summary Card (Caregiver & Elder Side-by-Side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Selected Caregiver Card */}
            <div className="bg-[#fbfcff] border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-3xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-[10px] text-sky-700 font-extrabold tracking-wider uppercase block">Selected Caregiver</span>
                <span className="text-[10px] font-bold text-slate-500">৳{caregiver.ratePerHour}/hr</span>
              </div>
              <div className="flex items-center gap-3">
                <CaregiverAvatar
                  gender={caregiver.gender}
                  className="h-11 w-11 rounded-xl"
                  iconClassName="h-5 w-5"
                />
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-900 truncate text-xs">{caregiver.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{caregiver.certification}</p>
                  <p className="text-[9px] text-sky-650 font-bold mt-1 uppercase">{caregiver.experience} Years of Care</p>
                </div>
              </div>
            </div>

            {/* Selected Elder Card */}
            <div className="bg-[#fbfcff] border border-slate-200/80 rounded-2xl p-4.5 space-y-3 shadow-3xs">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-[10px] text-sky-700 font-extrabold tracking-wider uppercase block">Elder Passenger</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-mono">{elder.location}</span>
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-slate-900 truncate text-xs">{elder.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Age: <strong>{elder.age}</strong> • Mobility: <strong>{elder.mobilityLevel}</strong></p>
                <p className="text-[9px] text-rose-650 font-bold mt-1 uppercase truncate">Condition: {elder.medicalConditions.slice(0, 2).join(', ') || 'Companionship'}</p>
              </div>
            </div>

          </div>

          {/* Date Range selectors */}
          <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-3xs">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-sky-500" />
              <span>Shift Care Schedule Dates</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Start Shift Date</label>
                <input
                  type="date"
                  required
                  min={getTomorrowString()}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border p-2.5 rounded-xl outline-hidden focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">End Shift Date</label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border p-2.5 rounded-xl outline-hidden focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Hours per Day (Hours Selector) */}
          <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-3xs">
            <div className="flex justify-between items-center text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-500 shrink-0" />
                <span>Duty Hours Selector</span>
              </h4>
              <span className="text-xs font-black text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100">
                {hoursPerDay} Hours/Day
              </span>
            </div>
            
            <div className="space-y-2">
              <input
                id="hours-selector-slider"
                type="range"
                min="2"
                max="12"
                step="1"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <p className="text-[10px] text-slate-500 flex justify-between leading-none pr-1">
                <span>Minimum shift (2 hrs)</span>
                <span>Regular (4-6 hrs)</span>
                <span>Extended (8-12 hrs)</span>
              </p>
            </div>
          </div>

          {/* Care Instructions Textarea */}
          <div className="bg-white border rounded-2xl p-5 space-y-3.5 shadow-3xs">
            <label className="block text-xs font-bold text-slate-900">
              Provide Special Bedside Care Instructions <span className="text-slate-400 font-light">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Schedule for breakfast at 8 AM. Needs assisted guidance to insulin medicine. Ensure she takes daily walk inside Dhanmondi lakeside track."
              className="w-full text-xs bg-slate-50/50 border p-2.5 rounded-xl outline-hidden focus:bg-white focus:border-sky-500 placeholder-slate-400"
            />
            {/* <p className="text-[10px] text-slate-400 leading-none">Registered bedside notes are transmitted securely to {caregiver.name}'s mobile dashboard.</p> */}
          </div>

        </div>

        {/* RIGHT COLUMN: PRICING BREAKDOWN & STRIPE PAYMENT (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Detailed pricing receipt invoice */}
          <div className="bg-[#fbfcff]/70 border border-slate-150 rounded-2xl p-5 space-y-3 shadow-3xs">
            <h4 className="font-display font-bold text-slate-900 border-b pb-2 text-xs uppercase tracking-wide">Duty transparent invoice BDT</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Hourly Rate</span>
                <span className="font-semibold text-slate-800">৳{caregiver.ratePerHour} BDT</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Daily Duration</span>
                <span className="font-semibold text-slate-800">{hoursPerDay} Hours / day</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duty Session Span</span>
                <span className="font-semibold text-slate-800">{daysCount} Days</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-100">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">৳{subtotal} BDT</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Trust Service Fee</span>
                <span className="font-bold text-slate-900">৳{serviceFee} BDT</span>
              </div>

              <div className="pt-2.5 border-t border-dashed border-slate-200 mt-2 flex justify-between items-end">
                <span className="text-xs font-bold text-slate-800">Total Billed Amt</span>
                <div className="text-right">
                  <span className="text-sm text-slate-400 font-normal mr-1">BDT</span>
                  <span className="text-xl font-display font-black text-slate-950">৳{totalCost}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe-Inspired Credit Card Payment UI */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4.5 relative overflow-hidden">
            {/* Visual background gloss accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl" />
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-sky-400 shrink-0" />
                <h4 className="font-display font-extrabold text-[11px] uppercase tracking-wider text-sky-400">Secure Payment</h4>
              </div>
              {/* <div className="flex items-center gap-1 shrink-0 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 font-mono text-[9px] font-bold text-emerald-450">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>SSL AUTH</span>
              </div> */}
            </div>

            {/* Simulated credit card face graphics */}
            <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 p-4.5 rounded-2xl border border-slate-800/80 space-y-4 shadow-inner">
              <div className="flex justify-between items-start">
                {/* Chip illustration */}
                <div className="w-9 h-7 bg-amber-400/20 border border-amber-400/40 rounded-md shadow-inner flex flex-col justify-between p-1">
                  <div className="w-full h-px bg-amber-400/30" />
                  <div className="w-full h-px bg-amber-400/30" />
                  <div className="w-full h-px bg-amber-400/30" />
                </div>
                {/* Visual card brands */}
                <div className="flex gap-1.5">
                  <div className="w-6 h-4 bg-sky-500/20 rounded-full logo opacity-40" />
                  <div className="w-6 h-4 bg-amber-400/20 rounded-full -ml-3" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] text-slate-500 uppercase font-black block">Registered Card Number</span>
                <p className="font-mono text-sm tracking-widest text-slate-100 font-bold h-5">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase font-bold block">Cardholder</span>
                  <p className="text-[10px] text-slate-200 uppercase truncate max-w-40 font-semibold h-4">
                    {cardHolder || 'Your Full Name'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 uppercase font-bold block">Expiry</span>
                  <p className="text-[10px] text-slate-200 font-mono font-bold h-4">
                    {expiryDate || 'MM/YY'}
                  </p>
                </div>
              </div>
            </div>

            {/* INPUT FIELDS FROM RELATIVE */}
            <div className="space-y-3.5 pt-1">
              
              {/* Card Number Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Credit Card Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs rounded-xl font-mono focus:border-sky-500 outline-hidden text-slate-100"
                  />
                </div>
              </div>

              {/* Cardholder name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Cardholder Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ameera Islam"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs rounded-xl focus:border-sky-500 outline-hidden text-slate-100"
                />
              </div>

              {/* Double row Expiry & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs rounded-xl font-mono text-center focus:border-sky-500 outline-hidden text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">CVV Code</label>
                  <input
                    type="password"
                    required
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => handleCvvChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs rounded-xl font-mono text-center focus:border-sky-500 outline-hidden text-slate-100"
                  />
                </div>
              </div>

            </div>

            {/* Secure indicator badges */}
            {/* <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2 text-[10px] text-slate-400 leading-normal">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Stripe Merchant Protection:</strong> BDT funds are processed securely. Unused hours standardly refund within 24 hours back to Credit card balances automatically.
              </span>
            </div> */}

            {/* SUBMIT BUTTON WITH SECURE TRANSITION */}
            <button
              type="submit"
              disabled={isProcessing || cardNumber.length < 15 || cvv.length < 3 || !cardHolder || expiryDate.length < 5}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-xs uppercase text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-97 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-slate-100 border-t-transparent animate-spin inline-block" />
                  <span>Authorizing BDT ৳{totalCost}...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Pay & Book Securely</span>
                </>
              )}
            </button>

          </div>

          {/* Cancellation Policy */}
          {/* <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl flex gap-2 text-[10px] text-slate-600 font-medium leading-relaxed">
            <AlertCircle className="h-4.5 w-4.5 text-yellow-600 shrink-0 mt-0.5" />
            <span>
              <strong>Flexible Policy:</strong> Reschedules block timings are completely free up to 12 hours before the shift start. Cancellation issues within 12 hours carry a minimal ৳200 dispatcher compensation charge.
            </span>
          </div> */}

        </div>

      </form>

    </div>
  );
};
