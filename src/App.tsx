import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HospitalProvider } from './store/HospitalStore'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import { ROLE_HOME, useHospital } from './store/HospitalStore'

function HomeRedirect() {
  const { currentRole } = useHospital()
  return <Navigate to={currentRole ? ROLE_HOME[currentRole] : '/login'} replace />
}

const TriageBoard = lazy(() => import('./pages/TriageBoard'))
const Patients = lazy(() => import('./pages/Patients'))
const Departments = lazy(() => import('./pages/Departments'))
const Network = lazy(() => import('./pages/Network'))
const PharmacyView = lazy(() => import('./pages/PharmacyView'))
const LabImagingView = lazy(() => import('./pages/LabImagingView'))
const BillingView = lazy(() => import('./pages/BillingView'))
const TelehealthView = lazy(() => import('./pages/TelehealthView'))
const StaffView = lazy(() => import('./pages/StaffView'))
const AuditView = lazy(() => import('./pages/AuditView'))
const CareFlow = lazy(() => import('./pages/CareFlow'))
const OpsCenter = lazy(() => import('./pages/OpsCenter'))
const BedBoard = lazy(() => import('./pages/BedBoard'))
const Handover = lazy(() => import('./pages/Handover'))
const MedRound = lazy(() => import('./pages/MedRound'))

export default function App() {
  return (
    <HospitalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppShell />}>
            <Route index element={<HomeRedirect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/triage" element={<TriageBoard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/network" element={<Network />} />
            <Route path="/pharmacy" element={<PharmacyView />} />
            <Route path="/lab-imaging" element={<LabImagingView />} />
            <Route path="/billing" element={<BillingView />} />
            <Route path="/telehealth" element={<TelehealthView />} />
            <Route path="/staff" element={<StaffView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/flow" element={<CareFlow />} />
            <Route path="/ops" element={<OpsCenter />} />
            <Route path="/beds" element={<BedBoard />} />
            <Route path="/handover" element={<Handover />} />
            <Route path="/med-round" element={<MedRound />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HospitalProvider>
  )
}
