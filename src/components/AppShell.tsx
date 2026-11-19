import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Bell, Building2, Check, ChevronDown, CircleHelp, Clock3, Command, Download, LayoutDashboard, LogOut, Menu, Network, RefreshCcw, Search, ShieldCheck, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useHospital } from '../store/HospitalStore'
import { departmentById } from '../data'
import { patientCsv, relativeTime } from '../lib/format'
import type { DepartmentId } from '../types'
import PatientDrawer from './PatientDrawer'
import { Avatar, Brand, Button, EsiBadge, Modal } from './ui'

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/triage', label: 'Live triage', icon: Activity },
  { to: '/patients', label: 'Patient records', icon: UsersRound },
  { to: '/departments', label: 'Departments & beds', icon: Building2 },
  { to: '/network', label: 'Care network', icon: Network },
  { to: '/pharmacy', label: 'Pharmacy', icon: Building2 },
  { to: '/lab-imaging', label: 'Lab & Imaging', icon: Activity },
  { to: '/billing', label: 'Billing', icon: UsersRound },
  { to: '/telehealth', label: 'Telehealth', icon: Network },
  { to: '/staff', label: 'Staff & Schedule', icon: UsersRound },
  { to: '/audit', label: 'Audit & Emergency', icon: Activity },
]

const pageNames: Record<string, string> = {
  '/dashboard': 'Operational overview',
  '/triage': 'Live triage & waiting room',
  '/patients': 'Shared patient records',
  '/departments': 'Departments & live capacity',
  '/network': 'Interdepartmental care network',
  '/pharmacy': 'Pharmacy Management',
  '/lab-imaging': 'Laboratory & Imaging',
  '/billing': 'Billing & Invoicing',
  '/telehealth': 'Telehealth Visits',
  '/staff': 'Staff & Scheduling',
  '/audit': 'Audit & Emergency Codes',
}

export default function AppShell() {
  const { state, currentRole, profile, logout, selectedPatientId, setSelectedPatientId, resetDemo, notify, toasts, dismissToast } = useHospital()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchIndex, setSearchIndex] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMobileOpen(false); setNotificationsOpen(false); setProfileOpen(false) }, [location.pathname])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => { if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 80); else setSearch('') }, [searchOpen])
  useEffect(() => { setSearchIndex(0) }, [search, searchOpen])

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    const patients = query ? state.patients.filter((patient) => `${patient.name} ${patient.mrn} ${patient.complaint} ${patient.location}`.toLowerCase().includes(query)) : state.patients.filter((patient) => patient.status !== 'discharged')
    return patients.slice(0, 7)
  }, [search, state.patients])

  const notifications = useMemo(() => {
    const referralItems = state.referrals.filter((referral) => referral.status === 'pending' && (profile?.id === 'administrator' || referral.to === profile?.department)).map((referral) => ({ id: referral.id, patientId: referral.patientId, title: `${referral.priority === 'emergent' ? 'Emergent' : 'New'} ${departmentById(state.departments, referral.to).shortName} referral`, detail: referral.reason, at: referral.createdAt, kind: 'referral' }))
    const orderItems = state.orders.filter((order) => order.status !== 'completed' && (profile?.id === 'administrator' || order.department === profile?.department)).map((order) => ({ id: order.id, patientId: order.patientId, title: `${order.status === 'ordered' ? 'New' : 'Active'} ${order.kind.toLowerCase()} order`, detail: order.title, at: order.createdAt, kind: 'order' }))
    return [...referralItems, ...orderItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [state.referrals, state.orders, state.departments, profile])

  if (!currentRole || !profile) return <Navigate to="/login" replace />

  const switchRole = () => { logout(); navigate('/login') }
  const exportCensus = () => {
    const departmentNames = Object.fromEntries(state.departments.map((department) => [department.id, department.name])) as Record<DepartmentId, string>
    patientCsv(state.patients, departmentNames)
    notify('Patient census exported', 'info'); setProfileOpen(false)
  }

  return <div className="app-layout">
    <AnimatePresence>{mobileOpen && <motion.div className="mobile-nav-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />}</AnimatePresence>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><Brand /><button className="sidebar-mobile-close icon-button" onClick={() => setMobileOpen(false)}><X size={19} /></button></div>
      <div className="facility-chip"><span className="facility-symbol"><Building2 size={17} /></span><div><b>Northstar General</b><small>University Hospital</small></div><span className="live-dot" /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="nav-section-label">WORKSPACE</span>
        {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={19} strokeWidth={1.8} /><span>{to === '/dashboard' ? profile.workspace : label}</span>{to === '/triage' && <b className="nav-count">{state.patients.filter((patient) => patient.department === 'emergency' && !['discharged', 'in-treatment'].includes(patient.status)).length}</b>}<i /></NavLink>)}
      </nav>
      <div className="sidebar-context">
        <span className="nav-section-label">YOUR SHIFT</span>
        <div className="shift-card"><div><Clock3 size={16} /><span>On shift</span><b>{profile.shift.split(' – ')[0]}</b></div><p>{profile.title}</p><small>{profile.shift} · {departmentById(state.departments, profile.department).shortName}</small></div>
      </div>
      <div className="sidebar-bottom">
        <button onClick={() => setHelpOpen(true)}><CircleHelp size={18} /><span>Help & shortcuts</span></button>
        <div className="system-health"><span className="live-dot" /><span>All systems operational</span><small>v2.4</small></div>
      </div>
    </aside>

    <div className="app-main">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="mobile-logo"><Brand compact /></div><div className="breadcrumb"><span>Northstar General</span><i>/</i><b>{pageNames[location.pathname] ?? 'Workspace'}</b></div></div>
        <div className="topbar-right">
          <button className="global-search" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Find patient, MRN, location…</span><kbd><Command size={11} />K</kbd></button>
          <div className="topbar-time"><b>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</b><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</span></div>
          <div className="popover-anchor">
            <button className={`icon-button notification-button ${notificationsOpen ? 'active' : ''}`} aria-label="Notifications" onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false) }}><Bell size={19} />{notifications.length > 0 && <span>{notifications.length}</span>}</button>
            <AnimatePresence>{notificationsOpen && <motion.div className="popover notifications-popover" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><div className="popover-title"><div><h3>Team notifications</h3><p>{notifications.length} items need attention</p></div><Activity size={18} /></div><div className="notification-list">{notifications.length ? notifications.map((item) => <button key={item.id} onClick={() => { setSelectedPatientId(item.patientId); setNotificationsOpen(false) }}><span className={`notification-kind ${item.kind}`}>{item.kind === 'referral' ? <Network size={16} /> : <Activity size={16} />}</span><div><b>{item.title}</b><p>{item.detail}</p><small>{relativeTime(item.at)} · {item.id}</small></div></button>) : <div className="notifications-empty"><Check size={20} /><p>Your team inbox is clear.</p></div>}</div><button className="popover-footer" onClick={() => { navigate('/network'); setNotificationsOpen(false) }}>Open care network</button></motion.div>}</AnimatePresence>
          </div>
          <div className="popover-anchor">
            <button className="profile-button" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false) }}><span className="profile-avatar" style={{ background: profile.accent }}>{profile.initials}</span><span><b>{profile.name}</b><small>{profile.shortTitle}</small></span><ChevronDown size={14} /></button>
            <AnimatePresence>{profileOpen && <motion.div className="popover profile-popover" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><div className="profile-popover-head"><span className="profile-avatar large" style={{ background: profile.accent }}>{profile.initials}</span><div><b>{profile.name}</b><span>{profile.employeeId}</span><small>{profile.title}</small></div></div><div className="profile-menu"><button onClick={exportCensus}><Download size={17} />Export patient census</button><button onClick={() => { setResetOpen(true); setProfileOpen(false) }}><RefreshCcw size={17} />Restore demo data</button><button onClick={switchRole}><LogOut size={17} />Switch professional role</button></div><div className="profile-security"><ShieldCheck size={14} />Role-based access active</div></motion.div>}</AnimatePresence>
          </div>
        </div>
      </header>

      <main className="content-area"><Outlet /></main>
      <footer className="app-footer"><span>Northstar CareOS · Synthetic demonstration environment</span><span><span className="live-dot" />Changes saved on this device</span></footer>
    </div>

    <PatientDrawer />

    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Find a patient" subtitle="Search across the shared hospital census" size="md">
      <div className="command-search"><Search size={20} /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSearchIndex((index) => Math.min(index + 1, Math.max(0, searchResults.length - 1))) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setSearchIndex((index) => Math.max(0, index - 1)) }
        if (event.key === 'Enter' && searchResults[searchIndex]) { event.preventDefault(); setSelectedPatientId(searchResults[searchIndex].id); setSearchOpen(false) }
      }} placeholder="Name, MRN, complaint or location…" /><kbd>ESC</kbd></div>
      <div className="search-results"><span className="search-result-label">{search ? `${searchResults.length} MATCHING PATIENTS` : 'ACTIVE PATIENTS'}</span>{searchResults.map((patient, index) => <button key={patient.id} className={searchIndex === index ? 'active' : ''} onMouseEnter={() => setSearchIndex(index)} onClick={() => { setSelectedPatientId(patient.id); setSearchOpen(false) }}><Avatar name={patient.name} size="md" /><div><b>{patient.name}<small>{patient.mrn}</small></b><p>{patient.complaint}</p><span>{patient.location} · {departmentById(state.departments, patient.department).shortName}</span></div><EsiBadge level={patient.esi} compact /></button>)}{searchResults.length === 0 && <div className="search-no-results"><Search size={22} /><p>No patients match "{search}".</p><span>Try a name, MRN or current location.</span></div>}</div>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Browse results</span><span><kbd>ESC</kbd> Close</span></div>
    </Modal>

    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Workspace help" subtitle="A few ways to move faster through Northstar" size="sm">
      <div className="help-list"><div><Command size={18} /><span><b>Global patient search</b><small>Press Ctrl + K or ⌘ + K anywhere.</small></span></div><div><Activity size={18} /><span><b>Live shared episode</b><small>Triage, referrals, results and transfers appear in every relevant role.</small></span></div><div><ShieldCheck size={18} /><span><b>Professional workspaces</b><small>Use your profile menu to switch roles and experience role-specific priorities.</small></span></div><div><RefreshCcw size={18} /><span><b>Start fresh</b><small>Restore the original synthetic dataset from your profile menu.</small></span></div></div>
      <div className="modal-footer"><span /><Button onClick={() => setHelpOpen(false)}>Got it<Check size={16} /></Button></div>
    </Modal>

    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore the original demo?" subtitle="This replaces changes made in this browser." size="sm"><div className="confirm-copy warning"><span><RefreshCcw size={23} /></span><p>Your new patients, referrals, results, notes and transfers will be replaced with the original synthetic hospital dataset. Your professional login stays active.</p></div><div className="modal-footer"><Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button><Button onClick={() => { resetDemo(); setResetOpen(false) }}>Restore demo<RefreshCcw size={16} /></Button></div></Modal>

    <div className="toast-stack" aria-live="polite"><AnimatePresence>{toasts.map((toast) => <motion.div key={toast.id} className={`toast toast-${toast.tone}`} initial={{ opacity: 0, x: 25, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 15 }}><span>{toast.tone === 'success' ? <Check size={16} /> : <Activity size={16} />}</span><p>{toast.message}</p><button onClick={() => dismissToast(toast.id)}><X size={15} /></button></motion.div>)}</AnimatePresence></div>
    {selectedPatientId && <span className="sr-only">Patient record open</span>}
  </div>
}