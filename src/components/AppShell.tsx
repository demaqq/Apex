import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowLeftRight, Bell, Check, ChevronDown, CircleHelp, Clock3, Download, Keyboard, LogOut, Megaphone, Menu, Monitor, Moon, Network, RefreshCcw, Search, ShieldAlert, ShieldCheck, Sparkles, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { departmentById, roleProfiles } from '../data'
import { stagesFor, orderStage } from '../lib/clinical'
import { patientCsv, relativeTime } from '../lib/format'
import { beep, useAmbientPref, useNow, useSoundPref, useTheme } from '../lib/hooks'
import { ALL_NAV, canSee, moduleEnabled, navFor, pageName as pageNameFor, sectionName as sectionNameFor } from '../lib/nav'
import { ROLE_HOME, useHospital } from '../store/HospitalStore'
import { SPECIALTY } from '../lib/specialty'
import { applyDeptTheme, themeFor } from '../lib/deptTheme'
import { activePositions, positionById } from '../lib/positions'
import { Ambient } from './Ambient'
import { disabledRoutes } from '../lib/modules'
import type { DepartmentId, RoleId } from '../types'
import PatientDrawer from './PatientDrawer'
import { Avatar, Brand, Button, Modal } from './ui'

type Hit = { key: string; label: string; detail?: string; run: () => void }

export default function AppShell() {
  const { state, currentRole, profile, myStaffId, selectedPatientId, can, login, signInBlock, logout, setSelectedPatientId, resetDemo, notify, toasts, dismissToast, activateCode, standDownCode, acknowledgePage } = useHospital()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { theme, cycle: cycleTheme } = useTheme()
  const [ambientOn, setAmbientOn] = useAmbientPref()
  const deptTheme = useMemo(() => themeFor(currentRole === 'administrator' || currentRole === 'provider' ? undefined : profile?.department, state.departments.find((item) => item.id === profile?.department)), [currentRole, profile?.department, state.departments])
  useEffect(() => { applyDeptTheme(deptTheme); return () => applyDeptTheme(null) }, [deptTheme])
  const [sound, setSound] = useSoundPref()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchIndex, setSearchIndex] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [codeId, setCodeId] = useState('code-blue')
  const [codeLocation, setCodeLocation] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  const now = useNow(15_000)
  const pageName = pageNameFor(location.pathname) ?? 'Page not found'
  const sectionLabel = sectionNameFor(location.pathname)
  const role = currentRole ?? 'physician'
  const disabled = useMemo(() => disabledRoutes(state.settings), [state.settings])
  const isProvider = role === 'provider'
  const isAdmin = role === 'administrator' || isProvider
  const hasSpecialty = Boolean(SPECIALTY[profile?.department ?? ''])
  const sections = useMemo(() => navFor(role, disabled).map((section) => ({ ...section, items: section.items.filter((item) => !item.specialty || hasSpecialty) })).filter((section) => section.items.length), [role, disabled, hasSpecialty])
  const visibleNav = useMemo(() => ALL_NAV.filter((item) => canSee(item, role) && moduleEnabled(item.to, disabled) && (!item.specialty || hasSpecialty)), [role, disabled, hasSpecialty])
  const routeItem = ALL_NAV.find((item) => item.to === location.pathname)
  const blocked = routeItem && !visibleNav.includes(routeItem)
  const facility = state.settings

  const activeCodes = state.codes.filter((code) => code.active)
  const myPages = state.pages.filter((page) => page.toStaffId === myStaffId && !page.acknowledgedAt)

  // Sound an alert when a new code is called or a new page arrives for me.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = [...activeCodes.map((code) => `${code.id}@${code.activatedAt}`), ...myPages.map((page) => page.id)]
    if (seen.current === null) { seen.current = new Set(ids); return }
    const fresh = ids.filter((id) => !seen.current!.has(id))
    ids.forEach((id) => seen.current!.add(id))
    if (fresh.length && sound) beep()
  }, [activeCodes, myPages, sound])

  useEffect(() => { setMobileOpen(false); setNotificationsOpen(false); setProfileOpen(false); setRoleSwitchOpen(false) }, [location.pathname])
  useEffect(() => { if (!profileOpen) setRoleSwitchOpen(false) }, [profileOpen])
  useEffect(() => { document.title = `${pageName} · ${facility.name}` }, [pageName, facility.name])
  useEffect(() => { if (!searchOpen) setSearch('') }, [searchOpen])
  useEffect(() => { setSearchIndex(0) }, [search, searchOpen])

  const urlPatient = searchParams.get('patient')
  const prevSelectedRef = useRef<string | null>(selectedPatientId)
  const prevUrlRef = useRef<string | null>(urlPatient)
  useEffect(() => {
    if (selectedPatientId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedPatientId
      if (selectedPatientId !== urlPatient) {
        const next = new URLSearchParams(searchParams)
        if (selectedPatientId) next.set('patient', selectedPatientId)
        else next.delete('patient')
        prevUrlRef.current = selectedPatientId
        setSearchParams(next)
      }
      return
    }
    if (urlPatient !== prevUrlRef.current || (urlPatient && !selectedPatientId && !isAdmin)) {
      prevUrlRef.current = urlPatient
      if (!isAdmin && urlPatient && state.patients.some((patient) => patient.id === urlPatient)) {
        if (selectedPatientId !== urlPatient) {
          prevSelectedRef.current = urlPatient
          setSelectedPatientId(urlPatient)
        }
      } else if (!urlPatient && selectedPatientId) {
        prevSelectedRef.current = null
        setSelectedPatientId(null)
      }
    }
  }, [selectedPatientId, urlPatient, searchParams, setSearchParams, setSelectedPatientId, isAdmin, state.patients])

  const anyDialog = searchOpen || helpOpen || resetOpen || codeOpen
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); return }
      if (event.key === 'Escape') { setNotificationsOpen(false); setProfileOpen(false); setMobileOpen(false); return }
      if (typing || anyDialog || event.metaKey || event.ctrlKey || event.altKey || document.querySelector('[role="dialog"]')) return
      const key = event.key.toLowerCase()
      if (key === '/') { event.preventDefault(); setSearchOpen(true); return }
      if (key === '?') { setHelpOpen(true); return }
      if (key === 'c' && !isProvider) { setCodeOpen(true); return }
      const item = visibleNav.find((candidate) => candidate.key === key)
      if (item) navigate(item.to)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [anyDialog, navigate, visibleNav, isProvider])

  useEffect(() => {
    if (!notificationsOpen && !profileOpen) return
    const handler = (event: MouseEvent) => { if (!popoverRef.current?.contains(event.target as Node)) { setNotificationsOpen(false); setProfileOpen(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notificationsOpen, profileOpen])

  const hits = useMemo<Array<{ group: string; items: Hit[] }>>(() => {
    const query = search.trim().toLowerCase()
    const close = () => setSearchOpen(false)
    if (!query) {
      if (isAdmin) return [{ group: 'Modules', items: visibleNav.map((item) => ({ key: item.to, label: item.label, run: () => { navigate(item.to); close() } })) }]
      return [{ group: 'Active patients', items: state.patients.filter((patient) => patient.status !== 'discharged').slice(0, 6).map((patient) => ({ key: patient.id, label: patient.name, detail: `${patient.mrn} · ${patient.location}`, run: () => { setSelectedPatientId(patient.id); close() } })) }]
    }
    const has = (...fields: Array<string | undefined>) => fields.join(' ').toLowerCase().includes(query)
    return [
      { group: 'Modules', items: visibleNav.filter((item) => has(item.label, item.page)).map((item) => ({ key: item.to, label: item.label, detail: item.key ? `Shortcut ${item.key.toUpperCase()}` : undefined, run: () => { navigate(item.to); close() } })) },
      { group: 'Patients', items: isAdmin ? [] : state.patients.filter((patient) => has(patient.name, patient.mrn, patient.complaint, patient.location)).slice(0, 6).map((patient) => ({ key: patient.id, label: patient.name, detail: `${patient.mrn} · ${patient.location}`, run: () => { setSelectedPatientId(patient.id); close() } })) },
      { group: 'Orders', items: isAdmin ? [] : state.orders.filter((order) => has(order.title, order.id)).slice(0, 4).map((order) => ({ key: order.id, label: order.title, detail: `${order.kind} · ${stagesFor(order)[orderStage(order)]} · ${state.patients.find((patient) => patient.id === order.patientId)?.name ?? ''}`, run: () => { setSelectedPatientId(order.patientId); close() } })) },
      { group: 'Staff', items: state.staff.filter((member) => has(member.name, member.role, member.pager)).slice(0, 4).map((member) => ({ key: member.id, label: member.name, detail: `${member.role} · pager ${member.pager}`, run: () => { navigate('/staff'); close() } })) },
    ].filter((group) => group.items.length)
  }, [search, state.patients, state.orders, state.staff, visibleNav, navigate, setSelectedPatientId, isAdmin])
  const flatHits = hits.flatMap((group) => group.items)

  const notifications = useMemo(() => {
    if (profile?.id === 'administrator' || profile?.id === 'provider') return []
    const referralItems = state.referrals.filter((referral) => referral.status === 'pending' && (profile?.id === 'administrator' || referral.to === profile?.department)).map((referral) => ({ id: referral.id, patientId: referral.patientId, title: `${referral.priority === 'emergent' ? 'Emergent' : 'New'} ${departmentById(state.departments, referral.to).shortName} referral`, detail: referral.reason, at: referral.createdAt, kind: 'referral' }))
    const orderItems = state.orders.filter((order) => order.status !== 'completed' && (profile?.id === 'administrator' || order.department === profile?.department)).map((order) => ({ id: order.id, patientId: order.patientId, title: `${order.status === 'ordered' ? 'New' : 'Active'} ${order.kind.toLowerCase()} order`, detail: order.title, at: order.createdAt, kind: 'order' }))
    return [...referralItems, ...orderItems].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [state.referrals, state.orders, state.departments, profile])

  if (!currentRole || !profile) return <Navigate to="/login" replace />

  const occupiedBeds = state.beds.filter((bed) => bed.patientId).length
  const awaitingTriage = state.patients.filter((patient) => patient.status === 'awaiting-triage').length
  const readyForDoctor = state.patients.filter((patient) => patient.department === 'emergency' && patient.status === 'waiting').length
  const navCount = (to: string) => to === '/triage' ? awaitingTriage + readyForDoctor : to === '/audit' ? activeCodes.length : to === '/review' ? state.cosignNotes.filter((note) => note.status === 'Pending review').length : to === '/front-desk' ? awaitingTriage : 0

  const activePatient = !isAdmin && selectedPatientId ? state.patients.find((patient) => patient.id === selectedPatientId) : undefined
  const queryParams = new URLSearchParams(location.search)
  const unitParam = queryParams.get('unit')
  const viewParam = queryParams.get('view')
  const subBreadcrumb = unitParam ? departmentById(state.departments, unitParam).shortName : viewParam && viewParam !== 'active' ? `${viewParam.charAt(0).toUpperCase()}${viewParam.slice(1)}` : undefined

  const switchRole = () => { logout(); navigate('/login') }
  const quickSwitchRole = (targetRole: RoleId) => {
    if (targetRole === role) { setProfileOpen(false); return }
    const reason = signInBlock(targetRole)
    if (reason) { notify(reason, 'warning'); return }
    login(targetRole, true, roleProfiles[targetRole].department)
    navigate(ROLE_HOME[targetRole])
    setProfileOpen(false)
    notify(`Switched to ${roleProfiles[targetRole].name} (${roleProfiles[targetRole].shortTitle})`, 'info')
  }
  const exportCensus = () => {
    patientCsv(state.patients, Object.fromEntries(state.departments.map((department) => [department.id, department.name])) as Record<DepartmentId, string>)
    notify('Patient census exported', 'info'); setProfileOpen(false)
  }
  const callCode = () => {
    if (codeLocation.trim().length < 3) { notify('Enter the exact location for the code', 'warning'); return }
    activateCode(codeId, codeLocation.trim())
    setCodeOpen(false); setCodeLocation('')
  }
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const themeLabel = theme === 'light' ? 'White' : theme === 'dark' ? 'Black' : 'Match device'

  return <div className="app-layout">
    <Ambient kind={deptTheme.ambient} />
    <AnimatePresence>{mobileOpen && <motion.div className="mobile-nav-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />}</AnimatePresence>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><Brand name={isProvider ? 'Northstar Cloud' : facility.name} tagline={isProvider ? 'Super admin' : `${facility.type} · ${facility.city || facility.tagline}`} /><button className="sidebar-mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>

      {!isProvider && <>
      <div className="pulse-panel" aria-label="Hospital live status">
        <div className="pulse-title"><span className="live-dot" />Live pulse</div>
        <div className="pulse-grid">
          <NavLink to="/beds"><b>{occupiedBeds}/{state.beds.length}</b>beds occupied</NavLink>
          <NavLink to="/front-desk"><b className={awaitingTriage ? 'warn' : ''}>{awaitingTriage}</b>awaiting triage</NavLink>
          <NavLink to="/triage"><b className={readyForDoctor ? 'warn' : ''}>{readyForDoctor}</b>ready for doctor</NavLink>
          <NavLink to="/audit"><b className={activeCodes.length ? 'alert' : ''}>{activeCodes.length}</b>active codes</NavLink>
        </div>
        <div className="pulse-row"><span>Occupancy</span><span className="mono">{Math.round(occupiedBeds / Math.max(1, state.beds.length) * 100)}%</span></div>
      </div>
      </>}

      <nav className="sidebar-nav" aria-label="Main navigation">
        {sections.map((section) => <div key={section.label} className="nav-section">
          <span className="nav-section-label">{section.label}</span>
          {section.items.map(({ to, label, icon: Icon }) => {
            const count = navCount(to)
            return <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} strokeWidth={1.8} /><span>{to === '/dashboard' ? profile.workspace : label}</span>{count > 0 && <b className={`nav-count ${to === '/audit' ? 'alert' : ''}`}>{count}</b>}</NavLink>
          })}
        </div>)}
      </nav>
      {!isProvider && <div className="sidebar-context">
        <span className="nav-section-label">Your shift</span>
        <div className="shift-card"><div><Clock3 size={16} /><span>On shift</span><b>{profile.shift.split(' – ')[0]}</b></div><p>{profile.title}</p><small>{profile.shift} · {departmentById(state.departments, profile.department).shortName}</small></div>
      </div>}
      <div className="sidebar-bottom">
        <button onClick={() => setHelpOpen(true)}><Keyboard size={18} /><span>Shortcuts</span><kbd className="kbd">?</kbd></button>
        <div className="system-health"><span className="live-dot" /><span>All systems operational</span><small>v3.0</small></div>
      </div>
    </aside>

    <div className="app-main">
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="mobile-logo"><Brand compact /></div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="breadcrumb-link" onClick={() => { setSelectedPatientId(null); navigate('/') }}>{isProvider ? 'Northstar Cloud' : facility.name}</button>
            {sectionLabel && <><i>/</i><span>{sectionLabel}</span></>}
            <i>/</i>
            {(activePatient || subBreadcrumb) ? <button type="button" className="breadcrumb-link" onClick={() => { setSelectedPatientId(null); if (location.search) navigate(location.pathname) }}>{pageName}</button> : <b>{pageName}</b>}
            {subBreadcrumb && <><i>/</i>{activePatient ? <button type="button" className="breadcrumb-link" onClick={() => setSelectedPatientId(null)}>{subBreadcrumb}</button> : <b>{subBreadcrumb}</b>}</>}
            {activePatient && <><i>/</i><b>{activePatient.name}</b></>}
          </nav>
        </div>
        <div className="topbar-right">
          <button className="global-search" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Search patients, orders, staff…</span><kbd>/</kbd></button>
          <div className="topbar-time"><b>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now)}</b><span>{new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(now)}</span></div>
          <div className="topbar-tools">
            {!isProvider && <button className="code-button" onClick={() => setCodeOpen(true)} title="Call an emergency code (C)"><Megaphone size={15} /><span>Emergency code</span></button>}
            <button className="icon-button" aria-pressed={sound} onClick={() => { setSound(!sound); if (!sound) beep(1) }} aria-label={sound ? 'Alert sound on' : 'Alert sound off'} title={sound ? 'Alert sound on' : 'Alert sound off'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
            <button className="icon-button" aria-pressed={ambientOn} onClick={() => setAmbientOn(!ambientOn)} aria-label={ambientOn ? 'Department animation on' : 'Department animation off'} title={`${deptTheme.name} theme · animation ${ambientOn ? 'on' : 'off'}`}><Sparkles size={18} /></button>
            <button className="icon-button" onClick={cycleTheme} aria-label={`Theme: ${themeLabel}`} title={`Theme: ${themeLabel} (click to change)`}><ThemeIcon size={18} /></button>
          </div>
          <div className="topbar-popovers" ref={popoverRef}>
            <div className="popover-anchor">
              <button className={`icon-button notification-button ${notificationsOpen ? 'active' : ''}`} aria-label={`Notifications (${notifications.length})`} aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false) }}><Bell size={19} />{notifications.length > 0 && <span>{notifications.length}</span>}</button>
              <AnimatePresence>{notificationsOpen && <motion.div className="popover notifications-popover" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><div className="popover-title"><div><h3>Team notifications</h3><p>{notifications.length} items need attention</p></div><Activity size={18} /></div><div className="notification-list">{notifications.length ? notifications.map((item) => <button key={item.id} onClick={() => { setSelectedPatientId(item.patientId); setNotificationsOpen(false) }}><span className={`notification-kind ${item.kind}`}>{item.kind === 'referral' ? <Network size={16} /> : <Activity size={16} />}</span><div><b>{item.title}</b><p>{item.detail}</p><small>{relativeTime(item.at)} · {item.id}</small></div></button>) : <div className="notifications-empty"><Check size={20} /><p>Your team inbox is clear.</p></div>}</div><button className="popover-footer" onClick={() => { navigate('/network'); setNotificationsOpen(false) }}>Open care network</button></motion.div>}</AnimatePresence>
            </div>
            <div className="popover-anchor">
              <button className="profile-button" aria-label="Account menu" aria-expanded={profileOpen} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false) }}><span className="profile-avatar" style={{ background: profile.accent }}>{profile.initials}</span><span><b>{profile.name}</b><small>{profile.shortTitle}</small></span><ChevronDown size={14} /></button>
              <AnimatePresence>{profileOpen && <motion.div className="popover profile-popover" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }}><div className="profile-popover-head"><span className="profile-avatar large" style={{ background: profile.accent }}>{profile.initials}</span><div><b>{profile.name}</b><span className="mono">{profile.employeeId}</span><small>{profile.title}</small>{activePositions(state.staff.find((member) => member.roleId === currentRole)).map((p) => <em key={p.id} className="profile-position">{positionById(p.id)?.title}{p.until ? ` · until ${p.until}` : ''}</em>)}</div></div><div className="profile-menu"><button onClick={() => setRoleSwitchOpen((value) => !value)} aria-expanded={roleSwitchOpen}><ArrowLeftRight size={17} />Switch workspace<ChevronDown size={14} className={`switch-chevron ${roleSwitchOpen ? 'open' : ''}`} /></button>{roleSwitchOpen && <div className="role-switcher-list" role="menu">{(Object.values(roleProfiles)).map((item) => <button key={item.id} type="button" role="menuitem" className={item.id === role ? 'active' : ''} onClick={() => quickSwitchRole(item.id)}><i className="role-dot" style={{ background: item.accent }} /><span><b>{item.shortTitle}</b><small>{item.name}</small></span>{item.id === role && <Check size={14} />}</button>)}</div>}{can('records-export') && <button onClick={exportCensus}><Download size={17} />Export patient census</button>}<button onClick={() => { setResetOpen(true); setProfileOpen(false) }}><RefreshCcw size={17} />Restore demo data</button><button onClick={switchRole}><LogOut size={17} />Sign out</button></div><div className="profile-security"><ShieldCheck size={14} />Role-based access active</div></motion.div>}</AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="content-area" id="main">
        {!isProvider && (activeCodes.length > 0 || myPages.length > 0) && <div className="alert-banners">
          {activeCodes.map((code) => <div key={code.id} className="alert-banner" role="alert">
            <ShieldAlert size={20} color="var(--danger)" />
            <div><b>{code.label}</b> · {code.location}<small>{code.description} · called by {code.activatedBy}{code.activatedAt ? ` ${relativeTime(code.activatedAt, now)}` : ''}</small></div>
            <Button size="sm" variant="danger" onClick={() => standDownCode(code.id)}>Resolve</Button>
          </div>)}
          {myPages.map((page) => <div key={page.id} className="alert-banner page" role="alert">
            <Bell size={20} color="var(--amber)" />
            <div><b>{page.urgent ? 'Urgent page' : 'Page'}</b> from {page.from}<small>{page.message} · {relativeTime(page.at, now)}</small></div>
            <Button size="sm" variant="secondary" onClick={() => acknowledgePage(page.id)}>Acknowledge</Button>
          </div>)}
        </div>}
        {blocked
          ? <div className="panel not-found"><div className="empty-state"><span><ShieldCheck size={21} /></span><h3>{!moduleEnabled(location.pathname, disabled) ? 'This module is switched off' : 'Not available in your workspace'}</h3><p>{!moduleEnabled(location.pathname, disabled) ? 'An administrator has switched this module off for your facility.' : isAdmin ? 'Administrators manage the facility and do not have access to patient records.' : 'Your role does not include this area. Ask an administrator if you need access.'}</p><Button onClick={() => navigate('/')}>Go to my home screen</Button></div></div>
          : <Suspense fallback={<div className="page-loading" role="status" aria-label="Loading page" />}><Outlet /></Suspense>}
      </main>
      <footer className="app-footer"><span>{facility.name} · {facility.type}{facility.city ? ` · ${facility.city}` : ''} · Synthetic demonstration data</span><span><span className="live-dot" />Changes saved on this device</span></footer>
    </div>

    <PatientDrawer />

    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search" subtitle="Patients, orders, staff and modules" size="md">
      <div className="command-search"><Search size={20} /><input aria-label="Search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSearchIndex((index) => Math.min(index + 1, Math.max(0, flatHits.length - 1))) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setSearchIndex((index) => Math.max(0, index - 1)) }
        if (event.key === 'Enter' && flatHits[searchIndex]) { event.preventDefault(); flatHits[searchIndex].run() }
      }} placeholder="Name, MRN, order, staff member or module…" /><kbd>ESC</kbd></div>
      {hits.map((group) => <div key={group.group} className="search-section"><span>{group.group}</span>{group.items.map((hit) => {
        const index = flatHits.indexOf(hit)
        return <button key={`${group.group}-${hit.key}`} className={`search-hit ${index === searchIndex ? 'active' : ''}`} onMouseEnter={() => setSearchIndex(index)} onClick={hit.run}>{group.group === 'Patients' || group.group === 'Active patients' ? <Avatar name={hit.label} size="sm" /> : null}<b>{hit.label}</b><small>{hit.detail}</small></button>
      })}</div>)}
      {search && !flatHits.length && <div className="search-no-results"><Search size={22} /><p>No matches for "{search}".</p></div>}
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Browse</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span></div>
    </Modal>

    <Modal open={codeOpen} onClose={() => setCodeOpen(false)} title="Call an emergency code" subtitle="Responders are paged and every screen shows a banner" size="sm">
      <div className="form-grid">
        <label className="form-field"><span>Code</span><select value={codeId} onChange={(event) => setCodeId(event.target.value)}>{state.codes.map((code) => <option key={code.id} value={code.id} disabled={code.active}>{code.label} — {code.description}{code.active ? ' (active)' : ''}</option>)}</select></label>
        <label className="form-field"><span>Location <b>*</b></span><input value={codeLocation} onChange={(event) => setCodeLocation(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') callCode() }} placeholder="e.g. Ward 5S · Bed 12" /></label>
      </div>
      <div className="modal-footer"><Button variant="ghost" onClick={() => setCodeOpen(false)}>Cancel</Button><Button variant="danger" icon={Megaphone} onClick={callCode}>Broadcast now</Button></div>
    </Modal>

    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" subtitle="Shortcuts work when you are not typing in a field" size="sm">
      <table className="shortcut-table"><tbody>
        {visibleNav.filter((item) => item.key).map((item) => <tr key={item.to}><td><span className="kbd">{item.key!.toUpperCase()}</span></td><td>{item.label}</td></tr>)}
        <tr><td><span className="kbd">C</span></td><td>Call an emergency code</td></tr>
        <tr><td><span className="kbd">/</span> or <span className="kbd">Ctrl K</span></td><td>Search</td></tr>
        <tr><td><span className="kbd">?</span></td><td>This list</td></tr>
        <tr><td><span className="kbd">Esc</span></td><td>Close a dialog</td></tr>
      </tbody></table>
      <div className="modal-footer"><span><CircleHelp size={14} /> Use the profile menu to sign in as another role.</span><Button onClick={() => setHelpOpen(false)}>Got it<Check size={16} /></Button></div>
    </Modal>

    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore the original demo?" subtitle="This replaces changes made in this browser." size="sm"><div className="confirm-copy warning"><span><RefreshCcw size={23} /></span><p>New patients, orders, notes, handovers, codes and payments will be replaced with the original synthetic dataset. You stay signed in.</p></div><div className="modal-footer"><Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button><Button onClick={() => { resetDemo(); setResetOpen(false) }}>Restore demo<RefreshCcw size={16} /></Button></div></Modal>

    <div className="toast-stack" aria-live="polite"><AnimatePresence>{toasts.map((toast) => <motion.div key={toast.id} className={`toast toast-${toast.tone}`} initial={{ opacity: 0, x: 25, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 15 }}><span>{toast.tone === 'success' ? <Check size={16} /> : toast.tone === 'warning' ? <ShieldAlert size={16} /> : <Activity size={16} />}</span><p>{toast.message}</p><button onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification"><X size={15} /></button></motion.div>)}</AnimatePresence></div>
  </div>
}

