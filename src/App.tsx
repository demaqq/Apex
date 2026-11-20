import { lazy } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'

// Static hosts without server-side routing (e.g. a shared preview) build with VITE_HASH_ROUTER=1.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter
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

/** The old combined page: send people to the half that matches their role. */
function LegacyDiagnostics() {
  const { currentRole } = useHospital()
  return <Navigate to={currentRole === 'diagnostics' ? '/imaging' : '/lab'} replace />
}

const TriageBoard = lazy(() => import('./pages/TriageBoard'))
const Patients = lazy(() => import('./pages/Patients'))
const Departments = lazy(() => import('./pages/Departments'))
const Network = lazy(() => import('./pages/Network'))
const PharmacyView = lazy(() => import('./pages/PharmacyView'))
const LaboratoryView = lazy(() => import('./pages/DiagnosticsView').then((m) => ({ default: m.LaboratoryView })))
const ImagingView = lazy(() => import('./pages/DiagnosticsView').then((m) => ({ default: m.ImagingView })))
const BillingView = lazy(() => import('./pages/BillingView'))
const TelehealthView = lazy(() => import('./pages/TelehealthView'))
const StaffView = lazy(() => import('./pages/StaffView'))
const AuditView = lazy(() => import('./pages/AuditView'))
const CareFlow = lazy(() => import('./pages/CareFlow'))
const OpsCenter = lazy(() => import('./pages/OpsCenter'))
const BedBoard = lazy(() => import('./pages/BedBoard'))
const Handover = lazy(() => import('./pages/Handover'))
const MedRound = lazy(() => import('./pages/MedRound'))
const FrontDesk = lazy(() => import('./pages/FrontDesk'))
const OpdView = lazy(() => import('./pages/OpdView'))
const Theatres = lazy(() => import('./pages/Theatres'))
const Services = lazy(() => import('./pages/Services'))
const Review = lazy(() => import('./pages/Review'))
const Admin = lazy(() => import('./pages/Admin'))
const Platform = lazy(() => import('./pages/Platform'))
const SpecialtyDashboard = lazy(() => import('./pages/SpecialtyDashboard'))

export default function App() {
  return (
    <HospitalProvider>
      <Router>
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
            <Route path="/lab" element={<LaboratoryView />} />
            <Route path="/imaging" element={<ImagingView />} />
            <Route path="/lab-imaging" element={<LegacyDiagnostics />} />
            <Route path="/billing" element={<BillingView />} />
            <Route path="/telehealth" element={<TelehealthView />} />
            <Route path="/staff" element={<StaffView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/flow" element={<CareFlow />} />
            <Route path="/ops" element={<OpsCenter />} />
            <Route path="/beds" element={<BedBoard />} />
            <Route path="/handover" element={<Handover />} />
            <Route path="/med-round" element={<MedRound />} />
            <Route path="/front-desk" element={<FrontDesk />} />
            <Route path="/opd" element={<OpdView />} />
            <Route path="/theatres" element={<Theatres />} />
            <Route path="/services" element={<Services />} />
            <Route path="/review" element={<Review />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/specialty" element={<SpecialtyDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </HospitalProvider>
  )
}
