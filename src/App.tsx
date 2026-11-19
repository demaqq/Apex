import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HospitalProvider } from './store/HospitalStore'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import TriageBoard from './pages/TriageBoard'
import Patients from './pages/Patients'
import Departments from './pages/Departments'
import Network from './pages/Network'
import PharmacyView from './pages/PharmacyView'
import LabImagingView from './pages/LabImagingView'
import BillingView from './pages/BillingView'
import TelehealthView from './pages/TelehealthView'
import StaffView from './pages/StaffView'
import AuditView from './pages/AuditView'
import Login from './pages/Login'
import './index.css'

export default function App() {
  return (
    <HospitalProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </HospitalProvider>
  )
}