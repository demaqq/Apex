import type { ReactNode } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { Avatar } from './Avatar'

export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" role="tab" aria-selected={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>
          {option.label}
          {option.count !== undefined && <span className="tab-count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="search-field">
      <Search size={16} aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder.replace('…', '')} />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Clear search"><X size={14} /></button>}
    </label>
  )
}

export function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<string | { value: string; label: string }> }) {
  return (
    <label className="filter-select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{label}</option>
        {options.map((option) => typeof option === 'string'
          ? <option key={option} value={option}>{option}</option>
          : <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  )
}

export function PersonCell({ name, detail, onClick }: { name: string; detail?: string; onClick?: () => void }) {
  const body = <><Avatar name={name} size="sm" /><span><b>{name}</b>{detail && <small>{detail}</small>}</span></>
  return onClick
    ? <button type="button" className="person-cell" onClick={onClick}>{body}</button>
    : <span className="person-cell">{body}</span>
}

export function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="detail-grid">
      {items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
    </dl>
  )
}
