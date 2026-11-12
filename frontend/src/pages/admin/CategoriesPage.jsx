import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import { PageHeader, Panel } from '../../components/admin/AdminLayout'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { inputClass } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'

const EMPTY = { name: '', slug: '', parent: '', description: '', sortOrder: '0', isActive: true }

function CategoryForm({ initial, parents, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const body = { name: form.name, description: form.description, parent: form.parent || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive }
    if (form.slug) body.slug = form.slug
    try {
      if (initial?.id) await adminApi.updateCategory(initial.id, body)
      else await adminApi.createCategory(body)
      onSaved()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }
  const fields = error?.fields || {}
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-none border border-line bg-field p-4">
      {error && !Object.keys(fields).length && <FormMessage>{error.message}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={set('name')} error={fields.name} maxLength={60} />
        <Field label="Inside" error={fields.parent}>
          {({ id, describedBy }) => (
            <select id={id} aria-describedby={describedBy} value={form.parent || ''} onChange={set('parent')} className={inputClass}>
              <option value="">— Top level —</option>
              {parents.filter((p) => p.id !== initial?.id).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Link name (URL)" value={form.slug} onChange={set('slug')} error={fields.slug} hint={`/collections/${form.slug || '…'}`} maxLength={80} />
        <Field label="Order" type="number" value={form.sortOrder} onChange={set('sortOrder')} hint="Lower numbers show first." />
      </div>
      <Field label="Description" value={form.description} onChange={set('description')} error={fields.description} maxLength={500} />
      <label className="flex items-center gap-3 text-[15px]">
        <input type="checkbox" checked={form.isActive} onChange={set('isActive')} className="size-4 accent-action" />
        Visible in the shop
      </label>
      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function CategoriesPage() {
  const [tree, setTree] = useState(null)
  const [editing, setEditing] = useState(null) // 'new' | category
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    adminApi.categories().then((r) => setTree(r.categories)).catch((err) => setError(readError(err)))
  }, [])
  useEffect(load, [load])

  async function remove(c) {
    setError(null)
    try {
      await adminApi.deleteCategory(c.id)
      load()
    } catch (err) {
      setError(readError(err))
    }
  }

  const saved = () => {
    setEditing(null)
    load()
  }
  const row = (c, child = false) => (
    <li key={c.id} className={child ? 'pl-6' : ''}>
      {editing?.id === c.id ? (
        <CategoryForm initial={{ ...c, parent: c.parent || '', sortOrder: String(c.sortOrder ?? 0) }} parents={tree} onSaved={saved} onCancel={() => setEditing(null)} />
      ) : (
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-medium text-ink">
              {child && <span className="text-muted">— </span>}
              {c.name}
              {!c.isActive && <span className="ml-2 rounded-none bg-ink/5 px-2 py-0.5 text-xs text-muted">Hidden</span>}
            </p>
            <p className="text-[13px] text-muted">/collections/{c.slug}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setEditing(c)} className="rounded-none border border-line px-4 py-2 text-sm hover:border-ink">
              Edit
            </button>
            <button type="button" onClick={() => remove(c)} className="rounded-none px-3 py-2 text-sm text-danger hover:bg-danger/10">
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  )

  return (
    <>
      <PageHeader
        title="Collections"
        description="Group pieces for the shop. One level of sub-collections, e.g. Rings → Stackable Rings."
        actions={<Button onClick={() => setEditing('new')}>Add collection</Button>}
      />
      {error && <div className="mb-4"><FormMessage>{error.message}</FormMessage></div>}
      {editing === 'new' && (
        <div className="mb-6">
          <CategoryForm parents={tree || []} onSaved={saved} onCancel={() => setEditing(null)} />
        </div>
      )}
      <Panel>
        {!tree ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-muted">No collections yet. Suggested start: Rings, Earrings, Necklaces &amp; Pendants, Bracelets.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tree.map((c) => (
              <li key={c.id}>
                <ul>
                  {row(c)}
                  {c.children.map((k) => row(k, true))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
