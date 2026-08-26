'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit, X, Check, Loader2 } from 'lucide-react'
import {
  createScholar, updateScholar, deleteScholar,
  createSource, updateSource, deleteSource,
  createCategory, updateCategory, deleteCategory
} from '@/app/actions/taxonomy-actions'

// ==================== SCHOLAR MANAGER ====================

interface ScholarItem {
  id: string
  english_name: string
  arabic_name: string | null
  slug: string
  death_year: string | null
  biography: string | null
}

export function ScholarManager({ initialData }: { initialData: ScholarItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<ScholarItem[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ english_name: '', arabic_name: '', slug: '', death_year: '', biography: '' })

  const resetForm = () => {
    setForm({ english_name: '', arabic_name: '', slug: '', death_year: '', biography: '' })
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleCreate = async () => {
    if (!form.english_name || !form.slug) { setError('Name and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const created = await createScholar({
        english_name: form.english_name,
        arabic_name: form.arabic_name || undefined,
        slug: form.slug,
        death_year: form.death_year || undefined,
        biography: form.biography || undefined
      })
      setItems([...items, created])
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !form.english_name || !form.slug) { setError('Name and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const updated = await updateScholar(editingId, {
        english_name: form.english_name,
        arabic_name: form.arabic_name || undefined,
        slug: form.slug,
        death_year: form.death_year || undefined,
        biography: form.biography || undefined
      })
      setItems(items.map(i => i.id === editingId ? updated : i))
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this scholar? Quotes referencing them will be affected.')) return
    setLoading(true)
    try {
      await deleteScholar(id)
      setItems(items.filter(i => i.id !== id))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete — scholar may have quotes linked.')
    }
    setLoading(false)
  }

  const startEdit = (item: ScholarItem) => {
    setEditingId(item.id)
    setForm({
      english_name: item.english_name,
      arabic_name: item.arabic_name || '',
      slug: item.slug,
      death_year: item.death_year || '',
      biography: item.biography || ''
    })
    setShowForm(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Scholars ({items.length})</CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Scholar'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

        {showForm && (
          <div className="border rounded-lg p-4 bg-muted/30 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">English Name *</label>
                <Input
                  placeholder="e.g. Ibn al-Qayyim"
                  value={form.english_name}
                  onChange={e => setForm({ ...form, english_name: e.target.value, slug: editingId ? form.slug : autoSlug(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Arabic Name</label>
                <Input dir="rtl" placeholder="e.g. ابن قيم الجوزية" value={form.arabic_name} onChange={e => setForm({ ...form, arabic_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">URL Slug *</label>
                <Input placeholder="ibn-al-qayyim" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Death Year</label>
                <Input placeholder="e.g. 751 AH" value={form.death_year} onChange={e => setForm({ ...form, death_year: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Biography</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Brief biography..."
                value={form.biography}
                onChange={e => setForm({ ...form, biography: e.target.value })}
              />
            </div>
            <Button className="gap-1 self-end" size="sm" disabled={loading} onClick={editingId ? handleUpdate : handleCreate}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {editingId ? 'Save Changes' : 'Create Scholar'}
            </Button>
          </div>
        )}

        {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No scholars yet. Add your first one above.</p>}

        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{item.english_name}</span>
                {item.arabic_name && <span className="text-sm text-muted-foreground font-arabic">{item.arabic_name}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>/{item.slug}</span>
                {item.death_year && <span>· d. {item.death_year}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ==================== SOURCE MANAGER ====================

interface SourceItem {
  id: string
  title: string
  arabic_title: string | null
  slug: string
  author: string | null
  publisher: string | null
}

export function SourceManager({ initialData }: { initialData: SourceItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<SourceItem[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', arabic_title: '', slug: '', author: '', publisher: '' })

  const resetForm = () => {
    setForm({ title: '', arabic_title: '', slug: '', author: '', publisher: '' })
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleCreate = async () => {
    if (!form.title || !form.slug) { setError('Title and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const created = await createSource({
        title: form.title,
        arabic_title: form.arabic_title || undefined,
        slug: form.slug,
        author: form.author || undefined,
        publisher: form.publisher || undefined
      })
      setItems([...items, created])
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !form.title || !form.slug) { setError('Title and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const updated = await updateSource(editingId, {
        title: form.title,
        arabic_title: form.arabic_title || undefined,
        slug: form.slug,
        author: form.author || undefined,
        publisher: form.publisher || undefined
      })
      setItems(items.map(i => i.id === editingId ? updated : i))
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this source?')) return
    setLoading(true)
    try {
      await deleteSource(id)
      setItems(items.filter(i => i.id !== id))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    }
    setLoading(false)
  }

  const startEdit = (item: SourceItem) => {
    setEditingId(item.id)
    setForm({ title: item.title, arabic_title: item.arabic_title || '', slug: item.slug, author: item.author || '', publisher: item.publisher || '' })
    setShowForm(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Sources / Books ({items.length})</CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Source'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

        {showForm && (
          <div className="border rounded-lg p-4 bg-muted/30 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Title *</label>
                <Input
                  placeholder="e.g. Al-Fawa'id"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value, slug: editingId ? form.slug : autoSlug(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Arabic Title</label>
                <Input dir="rtl" placeholder="e.g. الفوائد" value={form.arabic_title} onChange={e => setForm({ ...form, arabic_title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Slug *</label>
                <Input placeholder="al-fawaid" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Author</label>
                <Input placeholder="e.g. Ibn al-Qayyim" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Publisher</label>
                <Input placeholder="e.g. Dar al-Kutub" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} />
              </div>
            </div>
            <Button className="gap-1 self-end" size="sm" disabled={loading} onClick={editingId ? handleUpdate : handleCreate}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {editingId ? 'Save Changes' : 'Create Source'}
            </Button>
          </div>
        )}

        {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No sources yet. Add your first one above.</p>}

        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{item.title}</span>
                {item.arabic_title && <span className="text-sm text-muted-foreground font-arabic">{item.arabic_title}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>/{item.slug}</span>
                {item.author && <span>· by {item.author}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ==================== CATEGORY MANAGER ====================

interface CategoryItem {
  id: string
  name: string
  arabic_name: string | null
  slug: string
  description: string | null
}

export function CategoryManager({ initialData }: { initialData: CategoryItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<CategoryItem[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', arabic_name: '', slug: '', description: '' })

  const resetForm = () => {
    setForm({ name: '', arabic_name: '', slug: '', description: '' })
    setShowForm(false)
    setEditingId(null)
    setError('')
  }

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleCreate = async () => {
    if (!form.name || !form.slug) { setError('Name and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const created = await createCategory({
        name: form.name,
        arabic_name: form.arabic_name || undefined,
        slug: form.slug,
        description: form.description || undefined
      })
      setItems([...items, created])
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !form.name || !form.slug) { setError('Name and slug are required'); return }
    setLoading(true)
    setError('')
    try {
      const updated = await updateCategory(editingId, {
        name: form.name,
        arabic_name: form.arabic_name || undefined,
        slug: form.slug,
        description: form.description || undefined
      })
      setItems(items.map(i => i.id === editingId ? updated : i))
      resetForm()
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category?')) return
    setLoading(true)
    try {
      await deleteCategory(id)
      setItems(items.filter(i => i.id !== id))
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    }
    setLoading(false)
  }

  const startEdit = (item: CategoryItem) => {
    setEditingId(item.id)
    setForm({ name: item.name, arabic_name: item.arabic_name || '', slug: item.slug, description: item.description || '' })
    setShowForm(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Categories ({items.length})</CardTitle>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => { resetForm(); setShowForm(!showForm) }}>
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Category'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}

        {showForm && (
          <div className="border rounded-lg p-4 bg-muted/30 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Name *</label>
                <Input
                  placeholder="e.g. Tawhid"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : autoSlug(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Arabic Name</label>
                <Input dir="rtl" placeholder="e.g. التوحيد" value={form.arabic_name} onChange={e => setForm({ ...form, arabic_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Slug *</label>
                <Input placeholder="tawhid" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">Description</label>
                <Input placeholder="Brief description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <Button className="gap-1 self-end" size="sm" disabled={loading} onClick={editingId ? handleUpdate : handleCreate}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {editingId ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        )}

        {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No categories yet. Add your first one above.</p>}

        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/20 transition-colors">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{item.name}</span>
                {item.arabic_name && <span className="text-sm text-muted-foreground font-arabic">{item.arabic_name}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>/{item.slug}</span>
                {item.description && <span>· {item.description}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)} disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
