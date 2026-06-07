/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeartPulse, User, Calendar, MapPin, Phone, MessageSquare, Check, ShieldAlert } from 'lucide-react';
import { ElderProfile } from '../types';
import { DHAKA_LOCATIONS } from '../data';
import { elderSchema } from '@/validation/schemas';

interface ElderProfileFormProps {
  onSave: (profile: Omit<ElderProfile, 'id'>) => void;
  onCancel?: () => void;
}

export const ElderProfileForm: React.FC<ElderProfileFormProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [location, setLocation] = useState(DHAKA_LOCATIONS[0]);
  const [phone, setPhone] = useState('');
  const [keyInstructions, setKeyInstructions] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  
  // Validation, Loading & Dirty state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Check dirtiness
  const isDirty = 
    name !== '' || 
    age !== '' || 
    phone !== '' || 
    keyInstructions !== '' || 
    emergencyContactName !== '' || 
    emergencyContactPhone !== '';

  // Requirement 3: Page exit / Reload confirmation when form state is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes on this form. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Chronic Medical condition checkboxes
  const [conditions, setConditions] = useState<{ [key: string]: boolean }>({
    'Mild Osteoarthritis': false,
    'Type-2 Diabetes': false,
    'Hypertension': false,
    'Alzheimer\'s (Early Stage)': false,
    'Dementia': false,
    'Stroke Recovery': false,
    'Mobility Issues': false
  });

  const handleConditionToggle = (cond: string) => {
    setConditions(prev => ({
      ...prev,
      [cond]: !prev[cond]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submits

    setErrors({});

    // format mobile inputs for pattern match (+880 prefix or raw)
    const formattedPhone = phone ? (phone.startsWith('+880') || phone.startsWith('0') ? phone : '+880' + phone) : '';
    const formattedEmergencyPhone = emergencyContactPhone ? (emergencyContactPhone.startsWith('+880') || emergencyContactPhone.startsWith('0') ? emergencyContactPhone : '+880' + emergencyContactPhone) : '';

    // Requirement 1: Parse form fields on submit via Zod Schemas
    const validationResult = elderSchema.safeParse({
      full_name: name,
      age: age === '' ? undefined : Number(age),
      phone: formattedPhone,
      emergency_contact_phone: formattedEmergencyPhone,
      latitude: gender === "Male" ? 23.75 : 23.76,
      longitude: 90.38,
      city: 'Dhaka'
    });

    if (!validationResult.success) {
      const fieldErrors: { [key: string]: string } = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (path) {
          fieldErrors[path as string] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const selectedConditions = Object.keys(conditions).filter(key => conditions[key]);

    // Requirement 2: Show loading state and block successive triggers
    setIsLoading(true);
    try {
      await onSave({
        name,
        age: Number(age),
        gender,
        phoneNumber: formattedPhone,
        address: location + ", Dhaka",
        location,
        medicalConditions: selectedConditions,
        keyInstructions: keyInstructions || 'Low-sodium diabetic dietary requirement.',
        emergencyContactName,
        emergencyContactPhone: formattedEmergencyPhone
      });

      // Clear Form on success
      setName('');
      setAge('');
      setPhone('');
      setKeyInstructions('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setConditions({
        'Mild Osteoarthritis': false,
        'Type-2 Diabetes': false,
        'Hypertension': false,
        'Alzheimer\'s (Early Stage)': false,
        'Dementia': false,
        'Stroke Recovery': false,
        'Mobility Issues': false
      });
    } catch (err) {
      console.error("Error committing elder details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form 
      id="elder-profile-form"
      onSubmit={handleSubmit} 
      className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6 max-w-2xl mx-auto"
    >
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-display font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-sky-500" />
          Add Elderly Relative Profile
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Document your elder's medical status and specific care requirements to matching caregivers.
        </p>
      </div>

      {/* Row 1: Name and Age */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Elderly Member Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <input
              id="elder-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alhaj Md. Aminul Islam"
              className={`w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden ${
                errors.full_name ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.full_name && (
            <p id="error-msg-full_name" className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> {errors.full_name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Age (Years) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              id="elder-age-input"
              type="number"
              required
              min="0"
              max="130"
              value={age}
              onChange={(e) => setAge(e.target.value !== '' ? Number(e.target.value) : '')}
              placeholder="e.g. 78"
              className={`w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden ${
                errors.age ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.age && (
            <p id="error-msg-age" className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> {errors.age}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Gender, Location, Elder Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Gender</label>
          <div className="flex gap-2">
            <button
              id="gender-female-btn"
              type="button"
              onClick={() => setGender('Female')}
              className={`flex-1 py-2.5 text-sm font-medium border rounded-xl transition-all ${
                gender === 'Female'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Female
            </button>
            <button
              id="gender-male-btn"
              type="button"
              onClick={() => setGender('Male')}
              className={`flex-1 py-2.5 text-sm font-medium border rounded-xl transition-all ${
                gender === 'Male'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Male
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Residing Dhaka Location <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <MapPin className="h-4 w-4" />
            </span>
            <select
              id="elder-location-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden appearance-none"
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
          <label className="block text-xs font-semibold text-slate-700">
            Elderly Mobile <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Phone className="h-4 w-4" />
            </span>
            <input
              id="elder-phone-input"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              className={`w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden ${
                errors.phone ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.phone && (
            <p id="error-msg-phone" className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Row 3: Medical Conditions Checkboxes */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Diagnosed Health Conditions (Select all that apply)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.keys(conditions).map((cond) => (
            <button
              key={cond}
              id={`condition-chk-${cond.replace(/\s+/g, '-').toLowerCase()}`}
              type="button"
              onClick={() => handleConditionToggle(cond)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                conditions[cond]
                  ? 'border-sky-200 bg-sky-50/50 text-sky-800'
                  : 'border-slate-100 bg-slate-50/45 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                conditions[cond] ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-350 bg-white'
              }`}>
                {conditions[cond] && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <span>{cond}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Custom Instructions */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">
          Critical Bedside Care Instructions / Medicine Routines
        </label>
        <div className="relative">
          <span className="absolute top-3 left-3 text-slate-400">
            <MessageSquare className="h-4 w-4" />
          </span>
          <textarea
            id="elder-instructions-input"
            rows={3}
            value={keyInstructions}
            onChange={(e) => setKeyInstructions(e.target.value)}
            placeholder="e.g. Support morning walks by 7:30 AM, insulin injection after each meal, prefers soft khichuri for lunch."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Row 5: Emergency Contacts */}
      <div className="bg-sky-50/30 p-4 rounded-xl border border-sky-100/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-sky-800">
            Emergency Contact Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="elder-emergency-name"
            type="text"
            required
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            placeholder="e.g. Ameera Islam (Daughter)"
            className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-sky-800">
            Emergency Contact Mobile <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Phone className="h-4 w-4" />
            </span>
            <input
              id="elder-emergency-phone"
              type="tel"
              required
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              placeholder="e.g. 01712345678"
              className={`w-full pl-9 pr-4 py-2 text-sm bg-white border rounded-xl focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all outline-hidden ${
                errors.emergency_contact_phone ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.emergency_contact_phone && (
            <p id="error-msg-emergency_contact_phone" className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> {errors.emergency_contact_phone}
            </p>
          )}
        </div>
      </div>

      {/* Form CTA Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            id="elder-cancel-btn"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          id="elder-submit-btn"
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow-xs transition-all active:scale-97 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Elder Profile'
          )}
        </button>
      </div>
    </form>
  );
};
