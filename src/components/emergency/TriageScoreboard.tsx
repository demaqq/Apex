import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  ShieldAlert,
  Sliders,
  Thermometer,
  Zap,
} from 'lucide-react';
import { EsiLevel, VitalSigns } from '../../types';

interface TriageScoreboardProps {
  onApplyCalculatedTriage?: (calc: { esiLevel: EsiLevel; vitals: VitalSigns; complaint: string }) => void;
  selectedCase?: {
    vitals: VitalSigns;
    chiefComplaint: string;
    patientName?: string;
  } | null;
}

export const TriageScoreboard: React.FC<TriageScoreboardProps> = ({
  onApplyCalculatedTriage,
  selectedCase,
}) => {
  // Telemetry vitals inputs
  const [hr, setHr] = useState<number>(selectedCase?.vitals.heartRate ?? 95);
  const [bpSys, setBpSys] = useState<number>(selectedCase?.vitals.bloodPressureSystolic ?? 135);
  const [bpDia, setBpDia] = useState<number>(selectedCase?.vitals.bloodPressureDiastolic ?? 85);
  const [rr, setRr] = useState<number>(selectedCase?.vitals.respiratoryRate ?? 20);
  const [spo2, setSpo2] = useState<number>(selectedCase?.vitals.oxygenSaturation ?? 96);
  const [temp, setTemp] = useState<number>(selectedCase?.vitals.temperature ?? 37.8);
  const [pain, setPain] = useState<number>(selectedCase?.vitals.painScale ?? 4);

  // Red-flag danger zone alerts
  const [isUnresponsive, setIsUnresponsive] = useState<boolean>(false);
  const [hasSevereAirwayCompromise, setHasSevereAirwayCompromise] = useState<boolean>(false);
  const [hasSevereCrushingChestPain, setHasSevereCrushingChestPain] = useState<boolean>(false);
  const [hasAcuteNeuroDeficit, setHasAcuteNeuroDeficit] = useState<boolean>(false);
  const [resourceEstimate, setResourceEstimate] = useState<'many' | 'one' | 'none'>('many');
  const [chiefComplaint, setChiefComplaint] = useState<string>(
    selectedCase?.chiefComplaint ?? 'Acute clinical presentation requiring triage evaluation'
  );

  // ESI Acuity Calculation Algorithm
  const triageResult = useMemo(() => {
    const rationale: string[] = [];
    const vitalsAlerts: string[] = [];

    // STEP 1: ESI Level 1 (Immediate Life Threat / Resuscitation)
    if (isUnresponsive) {
      rationale.push('Patient unresponsive / GCS <= 8 (Critical airway risk)');
    }
    if (hasSevereAirwayCompromise) {
      rationale.push('Severe acute airway / breathing compromise / stridor');
    }
    if (spo2 < 86) {
      vitalsAlerts.push(`Profound Life-Threatening Hypoxemia (SpO2: ${spo2}%)`);
    }
    if (hr === 0 || (hr > 160 && bpSys < 80) || hr < 35) {
      vitalsAlerts.push(`Profound Hemodynamic Collapse (HR: ${hr} bpm, Sys BP: ${bpSys})`);
    }
    if (bpSys < 70 && bpSys > 0) {
      vitalsAlerts.push(`Profound Decompensated Shock (Systolic BP: ${bpSys} mmHg)`);
    }

    if (
      isUnresponsive ||
      hasSevereAirwayCompromise ||
      spo2 < 86 ||
      (hr > 160 && bpSys < 80) ||
      hr < 35 ||
      (bpSys < 70 && bpSys > 0) ||
      hr === 0
    ) {
      return {
        esiLevel: 1 as EsiLevel,
        urgencyLabel: 'ESI 1: RESUSCITATION (STAT)',
        badgeColor: 'bg-rose-600 text-white border-rose-500 shadow-rose-900/50',
        rationale: rationale.length > 0 ? rationale : ['Profound physiological collapse requiring immediate resuscitation team.'],
        vitalsAlerts,
        recommendedBay: 'Trauma / Resuscitation Bay 1 (STAT Alert)',
        resourceCount: 4,
        timeLimitMinutes: 0,
      };
    }

    // STEP 2: ESI Level 2 (High risk, confused, severe pain, danger-zone vitals)
    const isDangerZoneVitals =
      hr > 115 ||
      hr < 48 ||
      rr > 24 ||
      rr < 10 ||
      spo2 < 93 ||
      bpSys > 200 ||
      bpSys < 85 ||
      temp >= 39.2 ||
      temp < 35.5;

    if (hasSevereCrushingChestPain) {
      rationale.push('High-risk acute coronary syndrome presentation (crushing substernal pain)');
    }
    if (hasAcuteNeuroDeficit) {
      rationale.push('Acute stroke / focal neurological deficit alert (time-sensitive window)');
    }
    if (pain >= 8) {
      rationale.push(`Excruciating severe pain score (${pain}/10)`);
    }

    if (hr > 115) vitalsAlerts.push(`Severe Tachycardia (${hr} bpm)`);
    if (hr < 48 && hr > 0) vitalsAlerts.push(`Symptomatic Bradycardia (${hr} bpm)`);
    if (rr > 24) vitalsAlerts.push(`Tachypnea / Respiratory distress (${rr} bpm)`);
    if (spo2 < 93) vitalsAlerts.push(`Moderate Hypoxemia (SpO2: ${spo2}%)`);
    if (bpSys > 200) vitalsAlerts.push(`Hypertensive Urgency (${bpSys} mmHg)`);
    if (bpSys < 85 && bpSys > 0) vitalsAlerts.push(`Hypotension / Borderline Perfusion (${bpSys} mmHg)`);
    if (temp >= 39.2) vitalsAlerts.push(`Severe Hyperpyrexia (${temp}°C)`);

    if (
      hasSevereCrushingChestPain ||
      hasAcuteNeuroDeficit ||
      (pain >= 8 && isDangerZoneVitals) ||
      (spo2 < 92 && spo2 >= 86) ||
      (hr > 130 && bpSys < 90)
    ) {
      return {
        esiLevel: 2 as EsiLevel,
        urgencyLabel: 'ESI 2: EMERGENT (High Risk)',
        badgeColor: 'bg-amber-600 text-white border-amber-500 shadow-amber-900/50',
        rationale: rationale.length > 0 ? rationale : ['High-risk presentation or severe danger-zone vitals trigger.'],
        vitalsAlerts,
        recommendedBay: 'Acute Treatment Bay (< 10 mins)',
        resourceCount: 3,
        timeLimitMinutes: 10,
      };
    }

    // STEP 3: ESI Level 3, 4, 5 by Resource Requirements
    if (resourceEstimate === 'many') {
      if (isDangerZoneVitals) {
        return {
          esiLevel: 2 as EsiLevel,
          urgencyLabel: 'ESI 2: EMERGENT (Vitals Exceeded)',
          badgeColor: 'bg-amber-600 text-white border-amber-500 shadow-amber-900/50',
          rationale: ['Multiple resources needed AND abnormal danger-zone vitals trigger.'],
          vitalsAlerts,
          recommendedBay: 'Monitored Observation Bay',
          resourceCount: 3,
          timeLimitMinutes: 10,
        };
      }
      return {
        esiLevel: 3 as EsiLevel,
        urgencyLabel: 'ESI 3: URGENT (2+ Resources)',
        badgeColor: 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-yellow-900/40',
        rationale: [
          'Expected to require multiple diagnostic/therapeutic resources (Labs, IV, ECG, Imaging).',
          'Hemodynamically stable at triage.',
        ],
        vitalsAlerts,
        recommendedBay: 'Urgent Care Treatment Room (< 30 mins)',
        resourceCount: 2,
        timeLimitMinutes: 30,
      };
    } else if (resourceEstimate === 'one') {
      return {
        esiLevel: 4 as EsiLevel,
        urgencyLabel: 'ESI 4: LESS URGENT (1 Resource)',
        badgeColor: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/40',
        rationale: ['Expected to require exactly 1 diagnostic or therapeutic resource (e.g. Simple X-Ray or Suture).'],
        vitalsAlerts,
        recommendedBay: 'Fast-Track / Minor Procedures Clinic (< 60 mins)',
        resourceCount: 1,
        timeLimitMinutes: 60,
      };
    } else {
      return {
        esiLevel: 5 as EsiLevel,
        urgencyLabel: 'ESI 5: NON-URGENT (0 Resources)',
        badgeColor: 'bg-blue-600 text-white border-blue-500 shadow-blue-900/40',
        rationale: ['No acute diagnostic resources required (e.g. prescription refill, wound check, follow-up).'],
        vitalsAlerts,
        recommendedBay: 'Ambulatory Polyclinic (< 120 mins)',
        resourceCount: 0,
        timeLimitMinutes: 120,
      };
    }
  }, [
    hr,
    bpSys,
    bpDia,
    rr,
    spo2,
    temp,
    pain,
    isUnresponsive,
    hasSevereAirwayCompromise,
    hasSevereCrushingChestPain,
    hasAcuteNeuroDeficit,
    resourceEstimate,
  ]);

  const loadPreset = (preset: 'cardiac' | 'stroke' | 'respiratory' | 'minor' | 'normal') => {
    if (preset === 'cardiac') {
      setHr(118);
      setBpSys(155);
      setBpDia(95);
      setRr(22);
      setSpo2(94);
      setTemp(37.2);
      setPain(9);
      setIsUnresponsive(false);
      setHasSevereAirwayCompromise(false);
      setHasSevereCrushingChestPain(true);
      setHasAcuteNeuroDeficit(false);
      setResourceEstimate('many');
      setChiefComplaint('Severe crushing substernal chest pain radiating to left jaw & cold diaphoresis');
    } else if (preset === 'stroke') {
      setHr(84);
      setBpSys(188);
      setBpDia(105);
      setRr(18);
      setSpo2(97);
      setTemp(36.8);
      setPain(2);
      setIsUnresponsive(false);
      setHasSevereAirwayCompromise(false);
      setHasSevereCrushingChestPain(false);
      setHasAcuteNeuroDeficit(true);
      setResourceEstimate('many');
      setChiefComplaint('Acute right-sided facial droop, arm weakness, and expressive dysphasia');
    } else if (preset === 'respiratory') {
      setHr(135);
      setBpSys(105);
      setBpDia(65);
      setRr(32);
      setSpo2(85);
      setTemp(39.1);
      setPain(5);
      setIsUnresponsive(false);
      setHasSevereAirwayCompromise(true);
      setHasSevereCrushingChestPain(false);
      setHasAcuteNeuroDeficit(false);
      setResourceEstimate('many');
      setChiefComplaint('Severe acute respiratory failure, stridor, accessory muscle use, cyanosis');
    } else if (preset === 'minor') {
      setHr(76);
      setBpSys(120);
      setBpDia(78);
      setRr(16);
      setSpo2(99);
      setTemp(36.7);
      setPain(3);
      setIsUnresponsive(false);
      setHasSevereAirwayCompromise(false);
      setHasSevereCrushingChestPain(false);
      setHasAcuteNeuroDeficit(false);
      setResourceEstimate('one');
      setChiefComplaint('Simple superficial distal wrist laceration, bleeding controlled');
    } else {
      setHr(72);
      setBpSys(118);
      setBpDia(76);
      setRr(14);
      setSpo2(99);
      setTemp(36.6);
      setPain(0);
      setIsUnresponsive(false);
      setHasSevereAirwayCompromise(false);
      setHasSevereCrushingChestPain(false);
      setHasAcuteNeuroDeficit(false);
      setResourceEstimate('none');
      setChiefComplaint('Routine medication refill and blood pressure check');
    }
  };

  const handleApply = () => {
    if (onApplyCalculatedTriage) {
      onApplyCalculatedTriage({
        esiLevel: triageResult.esiLevel,
        vitals: {
          heartRate: hr,
          bloodPressureSystolic: bpSys,
          bloodPressureDiastolic: bpDia,
          respiratoryRate: rr,
          oxygenSaturation: spo2,
          temperature: temp,
          painScale: pain,
          recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
        complaint: chiefComplaint,
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 via-amber-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 shrink-0">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Emergency Severity Index (ESI) Triage Scoreboard & Acuity Engine
              </h2>
              <span className="text-[10px] font-mono uppercase bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold">
                Automated Clinical Decision Support
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Input telemetry vitals & clinical danger-zone alerts to calculate automated patient triage priority (ESI 1–5).
            </p>
          </div>
        </div>

        {/* Clinical Simulation Presets */}
        <div className="flex items-center flex-wrap gap-1.5 self-start md:self-auto">
          <span className="text-[10px] uppercase font-mono text-slate-500 font-bold mr-1">
            Simulate Case:
          </span>
          <button
            onClick={() => loadPreset('respiratory')}
            className="px-2 py-1 text-[11px] font-bold rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors cursor-pointer"
          >
            Airway Crash (ESI 1)
          </button>
          <button
            onClick={() => loadPreset('cardiac')}
            className="px-2 py-1 text-[11px] font-bold rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors cursor-pointer"
          >
            STEMI / Chest Pain (ESI 2)
          </button>
          <button
            onClick={() => loadPreset('stroke')}
            className="px-2 py-1 text-[11px] font-bold rounded bg-yellow-950/80 hover:bg-yellow-900 text-yellow-300 border border-yellow-800 transition-colors cursor-pointer"
          >
            Acute Stroke (ESI 2)
          </button>
          <button
            onClick={() => loadPreset('minor')}
            className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer"
          >
            Fast Track (ESI 4)
          </button>
          <button
            onClick={() => loadPreset('normal')}
            className="px-2 py-1 text-[11px] font-bold rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800 transition-colors cursor-pointer"
          >
            Non-Urgent (ESI 5)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Vitals Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 font-bold mb-1.5">
              Presenting Chief Complaint / Trauma Mechanism
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="e.g. Acute substernal chest discomfort with shortness of breath..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Vitals Telemetry Sliders / Number Inputs */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center space-x-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Live Telemetry Vitals Input</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Dynamic Multi-Threshold Evaluation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Heart Rate */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>Heart Rate</span>
                  <span className={`font-bold ${hr > 110 || hr < 50 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {hr} bpm
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="190"
                  value={hr}
                  onChange={e => setHr(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Systolic BP */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>Systolic BP</span>
                  <span className={`font-bold ${bpSys > 180 || bpSys < 90 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {bpSys} mmHg
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="240"
                  value={bpSys}
                  onChange={e => setBpSys(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Diastolic BP */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>Diastolic BP</span>
                  <span className="font-bold text-slate-200">{bpDia} mmHg</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="130"
                  value={bpDia}
                  onChange={e => setBpDia(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Respiratory Rate */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>Resp. Rate</span>
                  <span className={`font-bold ${rr > 24 || rr < 10 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {rr} /min
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="45"
                  value={rr}
                  onChange={e => setRr(Number(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* SpO2 */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>SpO2 (Pulse Ox)</span>
                  <span className={`font-bold ${spo2 < 92 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {spo2}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  value={spo2}
                  onChange={e => setSpo2(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Temperature */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                  <span>Temperature</span>
                  <span className={`font-bold ${temp >= 38.5 ? 'text-amber-400' : 'text-slate-200'}`}>
                    {temp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="34.0"
                  max="41.0"
                  step="0.1"
                  value={temp}
                  onChange={e => setTemp(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Pain Scale Bar */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono mb-1">
                <span>Subjective Pain Score (0–10)</span>
                <span className={`font-bold ${pain >= 8 ? 'text-rose-400' : pain >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {pain} / 10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={pain}
                onChange={e => setPain(Number(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* High-Risk Danger Flags */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-xs font-mono font-bold uppercase text-slate-300 block mb-1">
              Critical Red-Flag Alarms & Resource Projection
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnresponsive}
                  onChange={e => setIsUnresponsive(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-slate-200">Patient Unresponsive / GCS ≤ 8 (ESI 1)</span>
              </label>

              <label className="flex items-center space-x-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSevereAirwayCompromise}
                  onChange={e => setHasSevereAirwayCompromise(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-slate-200">Acute Airway Compromise / Stridor (ESI 1)</span>
              </label>

              <label className="flex items-center space-x-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSevereCrushingChestPain}
                  onChange={e => setHasSevereCrushingChestPain(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-200">Crushing Substernal Chest Pain (ESI 2)</span>
              </label>

              <label className="flex items-center space-x-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcuteNeuroDeficit}
                  onChange={e => setHasAcuteNeuroDeficit(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-200">Acute Stroke / Focal Deficit Window (ESI 2)</span>
              </label>
            </div>

            {/* Resource Requirement Estimation */}
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">
                Projected Clinical Diagnostic Resources (Labs, IV, ECG, Imaging):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResourceEstimate('many')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                    resourceEstimate === 'many'
                      ? 'bg-amber-950 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  2+ Resources (ESI 3)
                </button>
                <button
                  type="button"
                  onClick={() => setResourceEstimate('one')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                    resourceEstimate === 'one'
                      ? 'bg-emerald-950 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  1 Resource (ESI 4)
                </button>
                <button
                  type="button"
                  onClick={() => setResourceEstimate('none')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                    resourceEstimate === 'none'
                      ? 'bg-blue-950 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  0 Resources (ESI 5)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Acuity Gauge & Action (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <span className="text-xs font-mono font-bold uppercase text-slate-400 block">
              Automated Acuity Output
            </span>

            {/* Big Acuity Badge */}
            <div className={`p-4 rounded-xl border text-center font-black transition-all ${triageResult.badgeColor}`}>
              <div className="text-[10px] uppercase font-mono tracking-widest opacity-90">
                Decision Support Output
              </div>
              <div className="text-2xl font-black tracking-tight my-1">
                {triageResult.urgencyLabel}
              </div>
              <div className="text-xs font-medium opacity-90">
                Recommended Area: {triageResult.recommendedBay}
              </div>
            </div>

            {/* Vitals Alerts */}
            {triageResult.vitalsAlerts.length > 0 && (
              <div className="space-y-1.5 bg-rose-950/40 border border-rose-800 p-3 rounded-lg text-xs">
                <span className="font-bold text-rose-300 font-mono text-[10px] uppercase flex items-center space-x-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>Vitals Threshold Alarms ({triageResult.vitalsAlerts.length})</span>
                </span>
                <ul className="space-y-1 mt-1">
                  {triageResult.vitalsAlerts.map((alt, idx) => (
                    <li key={idx} className="text-rose-200 text-[11px] flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decision Rationale */}
            <div className="space-y-1.5 bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-xs">
              <span className="font-bold text-slate-400 font-mono text-[10px] uppercase block">
                Clinical Rationale:
              </span>
              <ul className="space-y-1">
                {triageResult.rationale.map((rat, idx) => (
                  <li key={idx} className="text-slate-300 text-[11px] flex items-start space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{rat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Operational Time Limits */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] uppercase text-slate-500">Max Time to Doctor</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {triageResult.timeLimitMinutes === 0 ? 'STAT / 0m' : `< ${triageResult.timeLimitMinutes} mins`}
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[9px] uppercase text-slate-500">Resource Load</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {triageResult.resourceCount} projected
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          {onApplyCalculatedTriage && (
            <button
              onClick={handleApply}
              className="w-full bg-gradient-to-r from-rose-600 via-amber-600 to-cyan-600 hover:from-rose-500 hover:to-cyan-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Apply Calculated ESI {triageResult.esiLevel} to Patient Intake</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
