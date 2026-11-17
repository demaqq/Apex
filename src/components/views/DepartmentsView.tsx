import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Baby,
  Bed,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  HeartPulse,
  Layers,
  Scissors,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { HospitalDepartment } from '../../types';

interface DepartmentsViewProps {
  onNavigateTab: (tab: string) => void;
  onFilterDoctorQueueByDept: (dept: HospitalDepartment) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  onNavigateTab,
  onFilterDoctorQueueByDept,
}) => {
  const { doctorQueue, beds, staff } = useHospital();

  const departments: {
    name: HospitalDepartment;
    head: string;
    description: string;
    icon: any;
    color: string;
    wardBeds: string;
  }[] = [
    {
      name: 'Emergency Medicine',
      head: 'Dr. Gregory House, MD',
      description: 'Tier-1 trauma resuscitation, rapid clinical triage, acute stabilization, and ESI protocol execution.',
      icon: Flame,
      color: 'text-rose-400 border-rose-800 bg-rose-950/40',
      wardBeds: 'ED-01 to ED-04',
    },
    {
      name: 'Intensive Care Unit (ICU)',
      head: 'Dr. Robert Chase, MD',
      description: 'Critical multiorgan failure, mechanical ventilation, invasive arterial monitoring, and vasopressor titration.',
      icon: HeartPulse,
      color: 'text-purple-400 border-purple-800 bg-purple-950/40',
      wardBeds: 'ICU-101 to ICU-104',
    },
    {
      name: 'Cardiology',
      head: 'Dr. James Wilson, MD',
      description: 'Coronary care, STEMI primary PCI pathway, transesophageal echocardiography, and arrhythmia ablation.',
      icon: Heart,
      color: 'text-rose-400 border-rose-800 bg-rose-950/40',
      wardBeds: 'SD-201 to SD-204',
    },
    {
      name: 'Neurology',
      head: 'Dr. Eric Foreman, MD',
      description: 'Acute ischemic stroke thrombolysis, neurocritical monitoring, intracranial pressure mapping, and epilepsy EEG.',
      icon: Brain,
      color: 'text-cyan-400 border-cyan-800 bg-cyan-950/40',
      wardBeds: 'MS-301 to MS-304',
    },
    {
      name: 'General Surgery & Trauma',
      head: 'Dr. Christopher Turk, MD',
      description: 'Laparoscopic emergencies, polytrauma exploratory laparotomy, vascular repair, and post-op surgical recovery.',
      icon: Scissors,
      color: 'text-amber-400 border-amber-800 bg-amber-950/40',
      wardBeds: 'OR-Bay 1 & 2',
    },
    {
      name: 'Pediatrics',
      head: 'Dr. Arizona Robbins, MD',
      description: 'Pediatric urgent care, neonatal jaundice management, respiratory syncytial virus protocols, and pediatric dosing.',
      icon: Baby,
      color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
      wardBeds: 'PED-501 to PED-504',
    },
    {
      name: 'Obstetrics & Gynecology',
      head: 'Dr. Addison Montgomery, MD',
      description: 'Labor & delivery suites, high-risk fetal maternal monitoring, emergency C-sections, and postpartum care.',
      icon: Sparkles,
      color: 'text-pink-400 border-pink-800 bg-pink-950/40',
      wardBeds: 'L&D-401 to L&D-404',
    },
    {
      name: 'Orthopedics',
      head: 'Dr. Callie Torres, MD',
      description: 'Open fracture fixation, joint replacement, spinal trauma stabilization, and casting suites.',
      icon: Activity,
      color: 'text-blue-400 border-blue-800 bg-blue-950/40',
      wardBeds: 'MS-302 to MS-304',
    },
    {
      name: 'Internal Medicine',
      head: 'Dr. John Dorian, MD',
      description: 'Complex multiorgan comorbidities, septicemia, diabetic ketoacidosis, and hospitalist inpatient rounds.',
      icon: Stethoscope,
      color: 'text-indigo-400 border-indigo-800 bg-indigo-950/40',
      wardBeds: 'MS-301 to MS-306',
    },
    {
      name: 'Oncology',
      head: 'Dr. James Wilson, MD',
      description: 'Inpatient chemotherapy infusion, neutropenic isolation, biological immunotherapy, and palliative oncology care.',
      icon: ShieldAlert,
      color: 'text-teal-400 border-teal-800 bg-teal-950/40',
      wardBeds: 'SD-203 to SD-204',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
            <Layers className="w-4 h-4" />
            <span>Hospital Clinical Architecture & Specialized Wings</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            10 Dedicated Clinical Departments & Operating Services
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Interdepartmental consultations, specialized patient cohorts, attending physician leadership, and dedicated bed bays.
          </p>
        </div>
      </div>

      {/* 10 Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map(dept => {
          const Icon = dept.icon;
          const queuedPatients = doctorQueue.filter(
            p => p.targetDepartment === dept.name
          );
          const deptStaff = staff.filter(s => s.department === dept.name);

          return (
            <div
              key={dept.name}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl border ${dept.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{dept.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Chief: {dept.head}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{dept.description}</p>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Assigned Wards:</span>
                    <span className="text-white font-semibold">{dept.wardBeds}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Queued Triaged Patients:</span>
                    <span
                      className={`font-bold ${
                        queuedPatients.length > 0 ? 'text-cyan-400' : 'text-slate-500'
                      }`}
                    >
                      {queuedPatients.length} Waiting
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Clinicians on Duty:</span>
                    <span className="text-emerald-400">{deptStaff.length} Active</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    onFilterDoctorQueueByDept(dept.name);
                    onNavigateTab('doctor_queue');
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open Dept Queue ({queuedPatients.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
