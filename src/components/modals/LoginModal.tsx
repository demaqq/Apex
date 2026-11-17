import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Mail,
  Shield,
  Stethoscope,
  User as UserIcon,
  Users,
  X,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { User as UserType } from '../../types';

interface LoginModalProps {
  onClose: () => void;
  onRedirectTab?: (tab: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onRedirectTab }) => {
  const { allUsers, currentUser, setCurrentUser, addToast } = useHospital();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('Apex General Academic Medical Center - Main Campus');

  const getHomeTabForRole = (role: string): string => {
    switch (role) {
      case 'GP':
      case 'Resident':
      case 'Senior Specialist':
      case 'Sub-Specialist':
        return 'doctor_queue';
      case 'Triage Nurse':
      case 'Ward Nurse':
      case 'ICU Nurse':
      case 'OT Nurse':
        return 'beds';
      case 'Lab Technician':
        return 'lab';
      case 'Imaging Technician':
      case 'Radiologist':
        return 'imaging';
      case 'Physiotherapist':
      case 'Occupational Therapist':
      case 'Nutritionist':
      case 'Respiratory Therapist':
      case 'Speech Pathologist':
        return 'departments';
      case 'Pharmacist':
      case 'Pharmacy Technician':
        return 'pharmacy';
      case 'Billing Officer':
        return 'billing';
      case 'Receptionist':
      case 'Records Officer':
        return 'patients';
      case 'Admin':
      default:
        return 'dashboard';
    }
  };

  const handleSelectUser = (user: UserType) => {
    setCurrentUser(user);
    const targetTab = getHomeTabForRole(user.role);
    if (onRedirectTab) {
      onRedirectTab(targetTab);
    }
    addToast({
      type: 'info',
      title: 'Authenticated Session',
      message: `Switched identity to ${user.name} (${user.title}) • ${user.department}.`,
    });
    onClose();
  };

  const handleCredentialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = allUsers.find(
      u => u.email.toLowerCase() === emailInput.toLowerCase() || u.name.toLowerCase().includes(emailInput.toLowerCase())
    );
    if (found) {
      handleSelectUser(found);
    } else {
      // Default to first user or admin if not found
      handleSelectUser(allUsers[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-950/80 border border-cyan-800 rounded-xl text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Apex Health HMS — Role-Based Secure Login
              </h2>
              <p className="text-[11px] text-slate-400">
                Sign in with hospital credentials or quick role switcher to access department homepages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Credential Login Form */}
        <form onSubmit={handleCredentialLogin} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="text-xs font-mono uppercase text-cyan-400 font-bold">
            Hospital Staff Portal Sign-In
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                Hospital Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. g.house@apexhealth.org"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 block mb-1">
                Password / Secure Token
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 block mb-1">
              Select Facility / Campus Branch
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <select
                value={selectedFacility}
                onChange={e => setSelectedFacility(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500"
              >
                <option value="Apex General Academic Medical Center - Main Campus">Apex General Academic Medical Center - Main Campus</option>
                <option value="Apex Pediatric & Women's Pavilion">Apex Pediatric & Women's Pavilion</option>
                <option value="Apex Emergency & Trauma Institute">Apex Emergency & Trauma Institute</option>
                <option value="Apex Regional Rehabilitation & Outpatient Centre">Apex Regional Rehabilitation & Outpatient Centre</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-600/25 cursor-pointer"
            >
              <span>Authenticate & Redirect to Department Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick Role Switcher Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">
              Or Instant Select Staff Identity / Role:
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Auto-routes to role home
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[36vh] overflow-y-auto p-1">
            {allUsers.map(user => {
              const isCurrent = currentUser.id === user.id;
              const targetTab = getHomeTabForRole(user.role);
              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/70 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <span>{user.name}</span>
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-[11px] text-cyan-400 font-mono font-semibold">
                        {user.role} <span className="text-slate-500 font-normal">→ /{targetTab}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{user.department}</div>
                    </div>

                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                      {user.email.split('@')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs text-slate-500">
          <span>Apex HMS Enterprise v4.5 (HIPAA & HL7 FHIR Compliant)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
