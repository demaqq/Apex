import type { Patient, PatientStatus, VitalSigns } from '../types';

export function minutesSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

export function formatWait(iso: string, now = Date.now()) {
  const minutes = minutesSince(iso, now);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function relativeTime(iso: string, now = Date.now()) {
  const minutes = minutesSince(iso, now);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function getPatientDisplayName(patient: Patient): string {
  return patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown Patient';
}

export function getEncounterType(patient: Patient): 'inpatient' | 'outpatient' {
  if (patient.encounterType) return patient.encounterType;
  return ['admitted', 'observation'].includes(patient.status) ? 'inpatient' : 'outpatient';
}

export const statusLabels: Record<PatientStatus, string> = {
  'awaiting-triage': 'Awaiting triage',
  waiting: 'Waiting',
  'in-treatment': 'In treatment',
  observation: 'Observation',
  admitted: 'Admitted',
  discharged: 'Discharged',
};

function patientDiagnoses(patient: Patient): string[] {
  const list = patient.diagnoses ?? patient.conditions;
  return list?.length ? list : [patient.complaint];
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function patientCsv(patients: Patient[], departmentNames: Record<string, string>) {
  downloadCsv(`patient-census-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['MRN', 'Patient', 'Age', 'Sex', 'Encounter', 'Presenting complaint', 'Department', 'Location', 'Status', 'Assigned clinician', 'Arrival'],
    ...patients.map((patient) => [patient.mrn, getPatientDisplayName(patient), patient.age, patient.sex ?? patient.gender ?? '', getEncounterType(patient), patientDiagnoses(patient).join('; '), departmentNames[patient.department] || patient.department, patient.location || patient.roomNumber || patient.assignedBed || 'N/A', statusLabels[patient.status] || patient.status, patient.assignedTo || patient.attendingPhysician || patient.attendingDoctor || 'Unassigned', patient.arrival || patient.admissionDate || 'N/A']),
  ]);
}

export function downloadPatientSummary(patient: Patient, departmentName: string) {
  const vitals = patient.vitals;
  const hr = vitals.hr ?? vitals.heartRate;
  const rr = vitals.rr ?? vitals.respiratoryRate;
  const spo2 = vitals.spo2 ?? vitals.oxygenSaturation;
  const bpSys = vitals.bpSys ?? vitals.bloodPressureSystolic;
  const bpDia = vitals.bpDia ?? vitals.bloodPressureDiastolic;
  const temp = vitals.temp ?? vitals.temperature;
  const pain = vitals.pain ?? vitals.painScale ?? vitals.painLevel;
  const num = (value: number | undefined) => (value === undefined || Number.isNaN(value) ? 'N/A' : value);
  const vitalsStr = `HR ${num(hr)}/min · RR ${num(rr)}/min · SpO2 ${num(spo2)}%\nBP ${num(bpSys)}/${num(bpDia)} mmHg · Temp ${num(temp)}°C · GCS ${num(vitals.gcs)}/15 · Pain ${num(pain)}/10`;

  const notesStr = patient.notes?.length
    ? patient.notes.map((note) => `${formatDate(note.timestamp)} ${formatTime(note.timestamp)} — ${note.subject || note.type}\n${note.note || note.content || ''} (${note.author})`).join('\n\n')
    : patient.timeline?.length
      ? patient.timeline.map((event) => `${formatDate(event.at)} ${formatTime(event.at)} — ${event.title}\n${event.detail} (${event.author})`).join('\n\n')
      : 'No clinical notes recorded.';

  const content = `HOSPITAL MANAGEMENT SYSTEM\nClinical episode summary\n\n${getPatientDisplayName(patient)} (${patient.mrn})\n${patient.age} years · ${patient.sex ?? patient.gender ?? ''}\nDepartment: ${departmentName}\nLocation: ${patient.location || patient.roomNumber || patient.assignedBed || 'N/A'}\nEncounter: ${getEncounterType(patient)}\nStatus: ${statusLabels[patient.status] || patient.status}\n\nPRESENTING COMPLAINT\n${patientDiagnoses(patient).join('\n')}\n\nHISTORY\n${patient.history || 'No additional history recorded.'}\n\nALLERGIES\n${patient.allergies.join(', ')}\n\nLATEST VITALS\n${vitalsStr}\n\nCLINICAL NOTES\n${notesStr}\n\nExported ${new Date().toLocaleString('en-GB')}\n`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${patient.mrn}-episode-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}