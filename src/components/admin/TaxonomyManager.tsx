'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { TaxonomyKind } from '@/data/admin'
import { deleteTaxonomyAction, mergeTagsAction, saveTaxonomyAction } from '@/app/actions/taxonomy-actions'
import type { ActionResult } from '@/app/actions/quote-actions'
import { slugify } from '@/lib/validation'

type Row = Record<string, unknown>
type FormValue = Record<string, string | number | boolean | null>

const FieldErrorsContext = createContext<NonNullable<ActionResult['fieldErrors']>>({})

const names: Record<TaxonomyKind, string> = { scholar: 'Scholar', source: 'Source', category: 'Category', translator: 'Translator', tag: 'Tag' }
const primary: Record<TaxonomyKind, string> = { scholar: 'english_name', source: 'title', category: 'name', translator: 'name', tag: 'name' }

export function TaxonomyManager({ kind, rows, categoryOptions = [] }: { kind: TaxonomyKind; rows: Row[]; categoryOptions?: Array<{ id: string; name: string }> }) {
  return <TaxonomyManagerContent key={kind} kind={kind} rows={rows} categoryOptions={categoryOptions} />
}

function TaxonomyManagerContent({ kind, rows, categoryOptions }: { kind: TaxonomyKind; rows: Row[]; categoryOptions: Array<{ id: string; name: string }> }) {
  const [editing, setEditing] = useState<Row | null>(null); const [creating, setCreating] = useState(false); const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null); const [query, setQuery] = useState(''); const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'archived'>('all'); const [pending, startTransition] = useTransition(); const router = useRouter()
  const [fieldErrors, setFieldErrors] = useState<ActionResult['fieldErrors']>({})
  const [formVersion, setFormVersion] = useState(0)
  const inFlight = useRef(false)
  const [mergeVersion, setMergeVersion] = useState(0)
  const formOpen = creating || Boolean(editing)
  const label = names[kind]
  function openForm(row: Row | null) {
    if (inFlight.current) return
    setEditing(row)
    setCreating(!row)
    setFormVersion((current) => current + 1)
    setMessage(null)
    setFieldErrors({})
  }
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return rows.filter((row) => {
      const archived = Boolean(row.is_archived)
      if (stateFilter === 'active' && archived) return false
      if (stateFilter === 'archived' && !archived) return false
      if (!normalized) return true
      return [row[primary[kind]], row.slug, row.arabic_name, row.arabic_title, row.author]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalized))
    })
  }, [kind, query, rows, stateFilter])
  function act(action: () => Promise<ActionResult>, close = true, onSuccess?: () => void) {
    if (inFlight.current) return
    inFlight.current = true
    setMessage(null)
    setFieldErrors({})
    startTransition(async () => {
      try {
        const result = await action()
        setMessage({ ok: result.ok, text: result.message })
        setFieldErrors(result.fieldErrors ?? {})
        if (result.ok) {
          if (close) { setEditing(null); setCreating(false) }
          onSuccess?.()
          router.refresh()
        }
      } catch {
        setMessage({ ok: false, text: 'The change could not be confirmed. Check the record before retrying; if your session expired, sign in again.' })
      } finally {
        inFlight.current = false
      }
    })
  }
  return <div className="admin-page" aria-busy={pending}>
    <div className="admin-page-heading"><div><p className="eyebrow">Archive vocabulary</p><h1>{label}s</h1><p>{filteredRows.length.toLocaleString()} shown of {rows.length.toLocaleString()} {rows.length === 1 ? 'record' : 'records'}.</p></div><button className="button button-primary" type="button" disabled={pending} onClick={() => openForm(null)}><Plus aria-hidden="true" />New {label.toLowerCase()}</button></div>
    {message && <div className={`form-alert form-alert-${message.ok ? 'success' : 'error'}`} role={message.ok ? 'status' : 'alert'}>{message.text}{Object.entries(fieldErrors ?? {}).some(([, errors]) => errors?.length) && <ul>{Object.entries(fieldErrors ?? {}).flatMap(([field, errors]) => (errors ?? []).map((error, index) => <li key={`${field}-${index}`}><span>{field.replace(/_/g, ' ')}: {error}</span></li>))}</ul>}</div>}
    {(creating || editing) && <TaxonomyForm key={`${kind}:${editing?.id ?? 'new'}:${formVersion}`} kind={kind} row={editing} categoryOptions={categoryOptions} pending={pending} fieldErrors={fieldErrors ?? {}} onFieldChange={(field) => setFieldErrors((current) => ({ ...current, [field]: undefined }))} onCancel={() => { setCreating(false); setEditing(null); setMessage(null); setFieldErrors({}) }} onSave={(value) => act(() => saveTaxonomyAction(kind, value))} />}
    {kind === 'tag' && rows.length > 1 && <TagMerge key={`${mergeVersion}:${rows.map((row) => String(row.id)).join(':')}`} rows={rows} pending={pending || formOpen} onMerge={(source, target) => act(() => mergeTagsAction(source, target), false, () => setMergeVersion((current) => current + 1))} />}
    <div className="admin-filter-bar"><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search {label.toLowerCase()}s</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}s`} /></label><label><span className="sr-only">Record state</span><select className="field-control" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as 'all' | 'active' | 'archived')}><option value="all">All states</option><option value="active">Active</option><option value="archived">Archived</option></select></label>{(query || stateFilter !== 'all') && <button className="button button-secondary" type="button" onClick={() => { setQuery(''); setStateFilter('all') }}>Clear</button>}</div>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">{label}</th><th scope="col">Slug</th><th scope="col">State</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredRows.map((row) => { const id = String(row.id); const title = String(row[primary[kind]] ?? 'Untitled'); const secondary = String(row.arabic_name ?? row.arabic_title ?? row.author ?? ''); const archived = Boolean(row.is_archived); return <tr key={id}><td><strong>{title}</strong>{secondary && <span className="table-secondary" dir={row.arabic_name || row.arabic_title ? 'rtl' : undefined}>{secondary}</span>}</td><td><code>{String(row.slug)}</code></td><td><span className={`status-badge ${archived ? 'status-archived' : 'status-published'}`}>{archived ? 'archived' : 'active'}</span></td><td><div className="table-actions"><button className="icon-button" type="button" aria-label={`Edit ${title}`} disabled={pending} onClick={() => openForm(row)}><Pencil aria-hidden="true" /></button><button className="icon-button" type="button" aria-label={`${archived ? 'Restore' : 'Archive'} ${title}`} disabled={pending || formOpen} onClick={() => act(() => saveTaxonomyAction(kind, { ...row, is_archived: !archived }), false)}><Archive aria-hidden="true" /></button><button className="icon-button danger-icon" type="button" aria-label={`Delete ${title}`} disabled={pending || formOpen} onClick={() => { if (window.confirm(`Delete ${title}? Linked records will make this operation fail safely.`)) act(() => deleteTaxonomyAction(kind, id), false) }}><Trash2 aria-hidden="true" /></button></div></td></tr>})}{!filteredRows.length && <tr><td colSpan={4} className="empty-cell">{rows.length ? 'No records match this search.' : `No ${label.toLowerCase()} records exist yet.`}</td></tr>}</tbody></table></div>
  </div>
}

function TaxonomyForm({ kind, row, categoryOptions, pending, fieldErrors, onFieldChange, onCancel, onSave }: { kind: TaxonomyKind; row: Row | null; categoryOptions: Array<{ id: string; name: string }>; pending: boolean; fieldErrors: NonNullable<ActionResult['fieldErrors']>; onFieldChange: (field: string) => void; onCancel: () => void; onSave: (value: FormValue) => void }) {
  const [form, setForm] = useState<FormValue>(() => initialForm(kind, row)); const main = primary[kind]
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)
  const interactedSinceSubmit = useRef(false)
  const [slugEdited, setSlugEdited] = useState(false)
  useEffect(() => { formRef.current?.querySelector<HTMLInputElement>('input')?.focus() }, [])
  useEffect(() => {
    if (wasPending.current && !pending && !interactedSinceSubmit.current) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    wasPending.current = pending
  }, [pending])
  const set = (key: string, value: FormValue[string]) => {
    interactedSinceSubmit.current = true
    setForm((current) => ({ ...current, [key]: value }))
    onFieldChange(key)
  }
  return <FieldErrorsContext.Provider value={fieldErrors}><section className="admin-card"><form ref={formRef} aria-label={`${row ? 'Edit' : 'Create'} ${names[kind].toLowerCase()}`} onSubmit={(event) => { event.preventDefault(); if (!pending) { interactedSinceSubmit.current = false; onSave(form) } }}><fieldset className="form-section" disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div><h2>{row ? 'Edit' : 'Create'} {names[kind].toLowerCase()}</h2><p>Fields left blank remain absent from public pages.</p></div><div className="form-grid-two"><TextInput id={main} label={`${names[kind]} name *`} value={String(form[main] ?? '')} onChange={(value) => { set(main, value); if (!row && !slugEdited) set('slug', slugify(value)) }} required /><TextInput id="slug" label="Slug *" value={String(form.slug ?? '')} onChange={(value) => { setSlugEdited(true); set('slug', value) }} required /></div>
      {kind === 'scholar' && <><div className="form-grid-two"><TextInput id="arabic_name" label="Arabic name" value={String(form.arabic_name ?? '')} onChange={(value) => set('arabic_name', value)} dir="rtl" /><TextInput id="death_year" label="Death year / notation" value={String(form.death_year ?? '')} onChange={(value) => set('death_year', value)} /></div><TextArea id="biography" label="Biography" value={String(form.biography ?? '')} onChange={(value) => set('biography', value)} /><TextInput id="image_url" label="Image URL" type="url" value={String(form.image_url ?? '')} onChange={(value) => set('image_url', value)} /></>}
      {kind === 'source' && <><div className="form-grid-two"><TextInput id="arabic_title" label="Arabic title" value={String(form.arabic_title ?? '')} onChange={(value) => set('arabic_title', value)} dir="rtl" /><TextInput id="author" label="Author" value={String(form.author ?? '')} onChange={(value) => set('author', value)} /></div><div className="form-grid-two"><TextInput id="publisher" label="Publisher" value={String(form.publisher ?? '')} onChange={(value) => set('publisher', value)} /><TextInput id="edition" label="Edition" value={String(form.edition ?? '')} onChange={(value) => set('edition', value)} /></div></>}
      {kind === 'category' && <><div className="form-grid-two"><TextInput id="arabic_name" label="Arabic name" value={String(form.arabic_name ?? '')} onChange={(value) => set('arabic_name', value)} dir="rtl" /><div className="field-group"><label className="field-label" htmlFor="parent_id">Parent category</label><select id="parent_id" aria-invalid={Boolean(fieldErrors.parent_id?.length)} aria-describedby={fieldErrors.parent_id?.length ? 'parent_id-error' : undefined} className="field-control" value={String(form.parent_id ?? '')} onChange={(e) => set('parent_id', e.target.value)}><option value="">No parent</option>{categoryOptions.filter((item) => item.id !== row?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><TaxonomyFieldError id="parent_id" errors={fieldErrors.parent_id} /></div></div><TextArea id="description" label="Description" value={String(form.description ?? '')} onChange={(value) => set('description', value)} /><TextInput id="sort_order" label="Sort order" type="number" value={String(form.sort_order ?? 0)} onChange={(value) => set('sort_order', Number(value))} /></>}
      {kind === 'translator' && <TextArea id="bio" label="Biography / about" value={String(form.bio ?? '')} onChange={(value) => set('bio', value)} />}
      <label className="check-row"><input type="checkbox" aria-invalid={Boolean(fieldErrors.is_archived?.length)} aria-describedby={fieldErrors.is_archived?.length ? 'is_archived-error' : undefined} checked={Boolean(form.is_archived)} onChange={(e) => set('is_archived', e.target.checked)} /><span>Archived</span></label><TaxonomyFieldError id="is_archived" errors={fieldErrors.is_archived} /><div className="button-row"><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button><button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button></div></fieldset></form></section></FieldErrorsContext.Provider>
}

function initialForm(kind: TaxonomyKind, row: Row | null): FormValue { const common = { id: row?.id ? String(row.id) : null, slug: String(row?.slug ?? ''), is_archived: Boolean(row?.is_archived) }; if (kind === 'scholar') return { ...common, english_name: String(row?.english_name ?? ''), arabic_name: String(row?.arabic_name ?? ''), death_year: String(row?.death_year ?? ''), biography: String(row?.biography ?? ''), image_url: String(row?.image_url ?? '') }; if (kind === 'source') return { ...common, title: String(row?.title ?? ''), arabic_title: String(row?.arabic_title ?? ''), author: String(row?.author ?? ''), publisher: String(row?.publisher ?? ''), edition: String(row?.edition ?? '') }; if (kind === 'category') return { ...common, name: String(row?.name ?? ''), arabic_name: String(row?.arabic_name ?? ''), description: String(row?.description ?? ''), parent_id: String(row?.parent_id ?? ''), sort_order: Number(row?.sort_order ?? 0) }; if (kind === 'translator') return { ...common, name: String(row?.name ?? ''), bio: String(row?.bio ?? '') }; return { ...common, name: String(row?.name ?? '') } }
function TaxonomyFieldError({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.length ? <p className="field-error" id={`${id}-error`}>{errors.join(' ')}</p> : null
}

function TextInput({ id, label, value, onChange, required, type = 'text', dir }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; dir?: 'rtl' }) {
  const errors = useContext(FieldErrorsContext)[id]
  return <div className="field-group">
    <label className="field-label" htmlFor={id}>{label}</label>
    <input id={id} className="field-control" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} dir={dir} aria-invalid={Boolean(errors?.length)} aria-describedby={errors?.length ? `${id}-error` : undefined} />
    <TaxonomyFieldError id={id} errors={errors} />
  </div>
}

function TextArea({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const errors = useContext(FieldErrorsContext)[id]
  return <div className="field-group">
    <label className="field-label" htmlFor={id}>{label}</label>
    <textarea id={id} className="field-control field-textarea" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(errors?.length)} aria-describedby={errors?.length ? `${id}-error` : undefined} />
    <TaxonomyFieldError id={id} errors={errors} />
  </div>
}

function TagMerge({ rows, pending, onMerge }: { rows: Row[]; pending: boolean; onMerge: (source: string, target: string) => void }) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const valid = source !== target && rows.some((row) => String(row.id) === source) && rows.some((row) => String(row.id) === target)
  return <section className="admin-card tag-merge">
    <div><h2>Merge duplicate tags</h2><p>Moves quote relationships to the target tag, then removes the source tag.</p></div>
    <select className="field-control" aria-label="Source tag" disabled={pending} value={source} onChange={(e) => setSource(e.target.value)}><option value="">Source tag</option>{rows.map((row) => <option key={String(row.id)} value={String(row.id)}>{String(row.name)}</option>)}</select>
    <select className="field-control" aria-label="Target tag" disabled={pending} value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Target tag</option>{rows.map((row) => <option key={String(row.id)} value={String(row.id)}>{String(row.name)}</option>)}</select>
    <button className="button button-secondary" type="button" disabled={pending || !valid} onClick={() => { if (!pending && valid) onMerge(source, target) }}>Merge tags</button>
  </section>
}
