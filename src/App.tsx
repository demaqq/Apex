import React, { useState, useEffect } from 'react';
import { HospitalProvider, useHospital } from './context/HospitalContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';

// Views
import { DashboardView } from './components/views/DashboardView';
import { TriageCenterView } from './components/views/TriageCenterView';
import { DoctorQueueView } from './components/views/DoctorQueueView';
import { DepartmentsView } from './components/views/DepartmentsView';
import { PatientsView } from './components/views/PatientsView';
import { BedsView } from './components/views/BedsView';
import { PharmacyView } from './components/views/PharmacyView';
import { LabImagingView } from './components/views/LabImagingView';
import { BillingView } from './components/views/BillingView';
import { TelehealthView } from './components/views/TelehealthView';
import { StaffView } from './components/views/StaffView';
import { AuditView } from './components/views/AuditView';

// Common Components
import { Breadcrumbs } from './components/common/Breadcrumbs';
import { ToastContainer } from './components/common/ToastContainer';

// Modals
import { TriageEncounterModal } from './components/modals/TriageEncounterModal';
import { PatientEvaluationModal } from './components/modals/PatientEvaluationModal';
import { EmergencyCodeModal } from './components/modals/EmergencyCodeModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { LoginModal } from './components/modals/LoginModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';

import { Patient, HospitalDepartment, TriageRecord } from './types';

const HospitalWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal states
  const [activeTriageRecord, setActiveTriageRecord] = useState<TriageRecord | null>(null);
  const [evaluatingPatient, setEvaluatingPatient] = useState<Patient | null>(null);
  const [showEmergencyCodeModal, setShowEmergencyCodeModal] = useState<boolean>(false);
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  const { registerNewIntake, patients, setSelectedPatient, selectedPatient } = useHospital();

  // Global Keyboard Shortcuts handler (PC-first Linear/Vim-inspired navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or select
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable);

      if (e.key === 'Escape') {
        setActiveTriageRecord(null);
        setEvaluatingPatient(null);
        setShowEmergencyCodeModal(false);
        setShowGlobalSearchModal(false);
        setShowLoginModal(false);
        setShowShortcutsModal(false);
        return;
      }

      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        setShowGlobalSearchModal(true);
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'd') {
        setActiveTab('dashboard');
      } else if (key === 't') {
        setActiveTab('triage');
      } else if (key === 'q') {
        setActiveTab('doctor_queue');
      } else if (key === 'p') {
        setActiveTab('patients');
      } else if (key === 'b') {
        setActiveTab('beds');
      } else if (key === 'r') {
        setActiveTab('pharmacy');
      } else if (key === 'l') {
        setActiveTab('lab');
      } else if (key === 'i') {
        setActiveTab('imaging');
      } else if (key === 'm') {
        setActiveTab('billing');
      } else if (key === 'c') {
        setShowEmergencyCodeModal(true);
      } else if (key === 'n') {
        // Quick new intake
        const newRecord = registerNewIntake({
          patientName: 'Incoming Rapid Patient',
          age: 45,
          gender: 'Female',
          chiefComplaint: 'Acute chest pain radiating to left arm',
          carePathway: 'Emergency',
        });
        setActiveTriageRecord(newRecord);
        setActiveTab('triage');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [registerNewIntake]);

  // Quick triage intake trigger
  const handleOpenTriageIntake = () => {
    const newRecord = registerNewIntake({
      patientName: 'Walk-In Patient',
      age: 38,
      gender: 'Male',
      chiefComplaint: 'Sudden onset respiratory distress and high fever',
      carePathway: 'Emergency',
    });
    setActiveTriageRecord(newRecord);
    setActiveTab('triage');
  };

  // Start triage for an existing registered patient
  const handleStartTriageForPatient = (patient: Patient) => {
    const newRecord = registerNewIntake({
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`,
      patientMrn: patient.mrn,
      age: patient.age,
      gender: patient.gender,
      chiefComplaint: (patient.conditions && patient.conditions[0]) || (patient.diagnoses && patient.diagnoses[0]) || 'Scheduled clinical intake & evaluation',
      carePathway: patient.status === 'Inpatient' ? 'Inpatient' : 'Outpatient',
    });
    setActiveTriageRecord(newRecord);
    setActiveTab('triage');
  };

  // Open clinical evaluation for a patient
  const handleOpenPatientEvaluation = (patientMrn: string) => {
    const pat = patients.find(p => p.mrn === patientMrn);
    if (pat) {
      setEvaluatingPatient(pat);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Header */}
      <Header
        onOpenTriageIntake={handleOpenTriageIntake}
        onOpenEmergencyCode={() => setShowEmergencyCodeModal(true)}
        onOpenGlobalSearch={() => setShowGlobalSearchModal(true)}
        onOpenLogin={() => setShowLoginModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Layout: Left Sidebar + Center Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
          {/* Site Orientation: Breadcrumb Navigation Hierarchy */}
          <Breadcrumbs
            activeTab={activeTab}
            onNavigateTab={setActiveTab}
            activeTriageRecord={activeTriageRecord}
            onCloseTriageRecord={() => setActiveTriageRecord(null)}
            evaluatingPatient={evaluatingPatient}
            onCloseEvaluation={() => setEvaluatingPatient(null)}
            selectedPatient={selectedPatient}
            onClearSelectedPatient={() => setSelectedPatient(null)}
          />

          {/* Active Clinical Module View */}
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setActiveTab}
              onOpenTriageIntake={handleOpenTriageIntake}
              onOpenEmergencyCode={() => setShowEmergencyCodeModal(true)}
            />
          )}

          {activeTab === 'triage' && (
            <TriageCenterView
              onOpenEvaluation={(p: Patient) => setEvaluatingPatient(p)}
              onOpenPatientChart={(p: Patient) => {
                setSelectedPatient(p);
                setActiveTab('patients');
              }}
            />
          )}

          {activeTab === 'doctor_queue' && (
            <DoctorQueueView
              onOpenEvaluation={(p: Patient) => setEvaluatingPatient(p)}
              onOpenPatientChart={(p: Patient) => {
                setSelectedPatient(p);
                setActiveTab('patients');
              }}
              onOpenPrescribe={(p: Patient) => {
                setSelectedPatient(p);
                setActiveTab('pharmacy');
              }}
              onOpenLabOrder={(p: Patient) => {
                setSelectedPatient(p);
                setActiveTab('lab');
              }}
              onOpenImagingOrder={(p: Patient) => {
                setSelectedPatient(p);
                setActiveTab('imaging');
              }}
            />
          )}

          {activeTab === 'departments' && (
            <DepartmentsView
              onNavigateTab={setActiveTab}
              onFilterDoctorQueueByDept={(_dept: HospitalDepartment) => {
                setActiveTab('doctor_queue');
              }}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              onStartTriageForPatient={handleStartTriageForPatient}
              onOpenPatientEvaluation={handleOpenPatientEvaluation}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'beds' && <BedsView onNavigateTab={setActiveTab} />}

          {activeTab === 'pharmacy' && <PharmacyView />}

          {activeTab === 'lab' && <LabImagingView />}

          {activeTab === 'imaging' && <LabImagingView />}

          {activeTab === 'billing' && <BillingView />}

          {activeTab === 'telehealth' && <TelehealthView />}

          {activeTab === 'staff' && <StaffView />}

          {activeTab === 'audit' && <AuditView />}
        </main>
      </div>

      {/* Global Modals */}

      {/* 1. Universal Triage Encounter Modal (Nurse Assessment) */}
      {activeTriageRecord && (
        <TriageEncounterModal
          triageRecord={activeTriageRecord}
          onClose={() => setActiveTriageRecord(null)}
          onCompleted={() => {
            setActiveTriageRecord(null);
            setActiveTab('doctor_queue');
          }}
        />
      )}

      {/* 2. Physician Patient Evaluation Modal (Doctor Consultation) */}
      {evaluatingPatient && (
        <PatientEvaluationModal
          patient={evaluatingPatient}
          onClose={() => setEvaluatingPatient(null)}
          onOpenPrescribe={() => {
            setEvaluatingPatient(null);
            setActiveTab('pharmacy');
          }}
        />
      )}

      {/* 3. Emergency Code Broadcast Modal */}
      {showEmergencyCodeModal && (
        <EmergencyCodeModal onClose={() => setShowEmergencyCodeModal(false)} />
      )}

      {/* 4. Global Command Search Modal */}
      {showGlobalSearchModal && (
        <GlobalSearchModal
          onClose={() => setShowGlobalSearchModal(false)}
          onNavigateTab={tab => {
            setActiveTab(tab);
            setShowGlobalSearchModal(false);
          }}
          onOpenPatientEvaluation={mrn => {
            setShowGlobalSearchModal(false);
            handleOpenPatientEvaluation(mrn);
          }}
          onOpenEmergencyCode={() => {
            setShowGlobalSearchModal(false);
            setShowEmergencyCodeModal(true);
          }}
        />
      )}

      {/* 5. RBAC User / Role Switch Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onRedirectTab={tab => setActiveTab(tab)}
        />
      )}

      {/* 6. Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Centralized Toast Notification Stack */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <HospitalProvider>
      <HospitalWorkspace />
    </HospitalProvider>
  );
}
