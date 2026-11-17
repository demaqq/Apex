import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  HeartPulse,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Plus,
  Search,
  User,
  Video,
  VideoOff,
  Volume2,
  X,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { Appointment } from '../../types';

export const TelehealthView: React.FC = () => {
  const { appointments, scheduleAppointment, updateAppointmentStatus, patients } = useHospital();

  const [activeCall, setActiveCall] = useState<Appointment | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New appointment form
  const [patientId, setPatientId] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Allison Cameron, MD');
  const [appointmentDate, setAppointmentDate] = useState('2026-10-01');
  const [appointmentTime, setAppointmentTime] = useState('14:30');
  const [chiefComplaint, setChiefComplaint] = useState('Post-discharge follow-up');

  const telehealthVisits = appointments.filter(a => a.type === 'Telehealth' || a.type === 'In-Person');

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    scheduleAppointment({
      patientId: patient.id,
      patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient',
      doctorName,
      department: 'Internal Medicine',
      date: appointmentDate,
      time: appointmentTime,
      type: 'Telehealth',
      reason: chiefComplaint,
    });

    setShowScheduleModal(false);
    setPatientId('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-teal-400 uppercase tracking-widest font-semibold">
            <Video className="w-4 h-4" />
            <span>Virtual Care & Remote Telemedicine OS</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Telehealth Consultations & Scheduled Visits
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Encrypted HD video encounters, digital waiting room, in-call vitals telemetry HUD, and electronic chart synchronization.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-md shadow-teal-950/40 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Telehealth Visit</span>
        </button>
      </div>

      {/* If Call is Active: Video Room Viewport */}
      {activeCall ? (
        <div className="bg-slate-900 border border-teal-500/50 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <h2 className="text-base font-bold text-white">
                  Active Consultation with {activeCall.patientName}
                </h2>
                <div className="text-xs text-slate-400 font-mono">
                  Attending: {activeCall.doctorName} • Reason: {activeCall.reason}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                updateAppointmentStatus(activeCall.id, 'Completed');
                setActiveCall(null);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End & Sign Consultation</span>
            </button>
          </div>

          {/* Video Frames Split: Doctor & Patient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-80">
            {/* Patient Remote Video */}
            <div className="bg-black rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-teal-400 font-bold text-xl">
                  {activeCall.patientName.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-white">{activeCall.patientName}</div>
                <div className="text-xs text-emerald-400 font-mono">Remote Video Stream Connected (1080p 60fps)</div>
              </div>
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[11px] font-mono text-white">
                Patient Remote Feed
              </div>
            </div>

            {/* Doctor Local Video */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 relative flex items-center justify-center overflow-hidden">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-teal-950 border border-teal-700 flex items-center justify-center mx-auto text-teal-300 font-bold text-xl">
                  DR
                </div>
                <div className="text-sm font-semibold text-white">{activeCall.doctorName}</div>
                <div className="text-xs text-slate-400 font-mono">Local Clinical Terminal</div>
              </div>
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[11px] font-mono text-white">
                Physician Feed
              </div>
            </div>
          </div>

          {/* Call Control Strip */}
          <div className="flex items-center justify-center space-x-3 pt-3">
            <button
              onClick={() => setMicMuted(!micMuted)}
              className={`p-3 rounded-full cursor-pointer transition-colors ${
                micMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCameraOff(!cameraOff)}
              className={`p-3 rounded-full cursor-pointer transition-colors ${
                cameraOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ) : null}

      {/* Scheduled Telehealth Queue */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Today's Scheduled Virtual Consultations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {telehealthVisits.map(visit => {
            const isCompleted = visit.status === 'Completed';
            return (
              <div
                key={visit.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs font-mono text-teal-400 font-semibold">{visit.time}</div>
                    <h3 className="text-sm font-bold text-white mt-0.5">{visit.patientName}</h3>
                    <div className="text-[11px] text-slate-400 font-mono">Attending: {visit.doctorName}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-teal-950 text-teal-300 border border-teal-800'
                    }`}
                  >
                    {visit.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Chief Reason:</span> {visit.reason}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-[11px] text-slate-500 font-mono">{visit.date}</span>
                  {!isCompleted && (
                    <button
                      onClick={() => setActiveCall(visit)}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Start Video Call</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSchedule}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Schedule Telehealth Encounter</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Patient</label>
              <select
                required
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.mrn})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Time</label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={e => setAppointmentTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 uppercase font-mono font-semibold">Chief Reason</label>
              <input
                type="text"
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!patientId}
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg transition-colors cursor-pointer"
              >
                Book Virtual Room
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
