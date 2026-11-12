import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi, catalogApi } from '../../api/admin'
import MediaManager from '../../components/admin/MediaManager'
import { PageHeader, Panel, StatusBadge } from '../../components/admin/AdminLayout'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { inputClass } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import { formatWhen } from '../../lib/formatWhen'
import { describeAction } from '../../lib/adminFormat'
import { formatINR, previewSellingPrice, toPaise, toRupees } from '../../lib/money'

const EMPTY = {
  name: '', slug: '', sku: '', description: '', category: '', status: 'draft',
  mrp: '', costPrice: '', discountType: 'none', discountValue: '',
  stock: '0', useSizes: false, sizes: [], lowStockThreshold: '3',
  madeToOrder: false, makingDays: '', handmade: true,
  metal: '925-sterling-silver', purity: '925', stones: [],
  weightGrams: '', lengthMm: '', widthMm: '', heightMm: '',
  careNotes: '', tags: '', featured: false, variantLabel: '', media: [],
}

/** API product → form fields (rupees as text, flat lists). */
function toForm(p) {
  return {
    ...EMPTY,
    name: p.name, slug: p.slug, sku: p.sku, description: p.description || '',
    category: p.category?.id || p.category?._id || p.category || '', status: p.status,
    mrp: toRupees(p.mrp), costPrice: toRupees(p.costPrice),
    discountType: p.discount?.type || 'none',
    discountValue: p.discount?.type === 'flat' ? toRupees(p.discount.value) : String(p.discount?.value ?? ''),
    stock: String(p.stock ?? 0), useSizes: p.sizes?.length > 0,
    sizes: (p.sizes || []).map((s) => ({ label: s.label, stock: String(s.stock) })),
    lowStockThreshold: String(p.lowStockThreshold ?? 3),
    madeToOrder: Boolean(p.madeToOrder), makingDays: p.makingDays ?? '', handmade: p.handmade !== false,
    metal: p.metal || '', purity: p.purity || '',
    stones: (p.stones || []).map((s) => ({ gem: s.gem, shape: s.shape || '', sizeMm: s.sizeMm || '', carat: s.carat ?? '', count: String(s.count ?? 1) })),
    weightGrams: p.weightGrams ?? '', lengthMm: p.dimensions?.lengthMm ?? '', widthMm: p.dimensions?.widthMm ?? '', heightMm: p.dimensions?.heightMm ?? '',
    careNotes: p.careNotes || '', tags: (p.tags || []).join(', '), featured: Boolean(p.featured),
    variantLabel: p.variantLabel || '', media: p.media || [],
  }
}

const num = (v) => (v === '' || v == null ? null : Number(v))

/** Form → API body (paise, nested objects). */
function toBody(f) {
  const body = {
    name: f.name, description: f.description, category: f.category, status: f.status,
    mrp: toPaise(f.mrp), costPrice: toPaise(f.costPrice),
    discount: {
      type: f.discountType,
      value: f.discountType === 'flat' ? toPaise(f.discountValue) || 0 : f.discountType === 'percent' ? Number(f.discountValue) || 0 : 0,
    },
    lowStockThreshold: Number(f.lowStockThreshold) || 0,
    madeToOrder: f.madeToOrder, makingDays: f.madeToOrder ? num(f.makingDays) : null, handmade: f.handmade,
    metal: f.metal || null, purity: f.purity,
    stones: f.stones.filter((s) => s.gem).map((s) => ({ gem: s.gem, shape: s.shape, sizeMm: s.sizeMm, carat: num(s.carat), count: Number(s.count) || 1 })),
    weightGrams: num(f.weightGrams),
    dimensions: { lengthMm: num(f.lengthMm), widthMm: num(f.widthMm), heightMm: num(f.heightMm) },
    careNotes: f.careNotes,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    featured: f.featured, variantLabel: f.variantLabel,
    media: f.media.map(({ type, url, publicId, alt, width, height }) => ({ type, url, publicId, alt, width, height })),
  }
  if (f.slug) body.slug = f.slug
  if (f.sku) body.sku = f.sku
  if (f.useSizes) body.sizes = f.sizes.filter((s) => s.label.trim()).map((s) => ({ label: s.label.trim(), stock: Number(s.stock) || 0 }))
  else {
    body.sizes = []
    body.stock = Number(f.stock) || 0
  }
  return body
}

function Check({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-3 text-[15px] text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-action" />
      <span>
        {label}
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
    </label>
  )
}

function Select({ label, value, onChange, options, error, hint, placeholder }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export default function ProductEditPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [product, setProduct] = useState(null)
  const [variants, setVariants] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({ allMetals: [], allStones: [] })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    adminApi.categories().then((r) => setCategories(r.categories)).catch(() => {})
    catalogApi.meta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) return
    adminApi
      .product(id)
      .then(({ product: p, variants: v }) => {
        setProduct(p)
        setVariants(v)
        setForm(toForm(p))
      })
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value?.target ? value.target.value : value }))
  const fields = error?.fields || {}
  const selling = previewSellingPrice(toPaise(form.mrp), { type: form.discountType, value: form.discountType === 'flat' ? toPaise(form.discountValue) : form.discountValue })
  const cost = toPaise(form.costPrice)
  const margin = selling && cost != null ? Math.round(((selling - cost) / selling) * 100) : null
  const sizeTotal = form.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)

  const categoryOptions = useMemo(
    () => categories.flatMap((c) => [{ value: c.id, label: c.name }, ...c.children.map((k) => ({ value: k.id, label: `— ${k.name}` }))]),
    [categories]
  )

  async function save(statusOverride) {
    setSaving(true)
    setError(null)
    try {
      const body = toBody({ ...form, status: statusOverride || form.status })
      if (isNew) {
        const { product: created } = await adminApi.createProduct(body)
        navigate(`/admin/products/${created.id}`, { replace: true })
      } else {
        const { product: updated } = await adminApi.updateProduct(id, body)
        setProduct(updated)
        setForm(toForm(updated))
        setSavedAt(new Date())
      }
    } catch (err) {
      setError(readError(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleArchive() {
    setSaving(true)
    setError(null)
    try {
      const { product: p } = product.status === 'archived' ? await adminApi.restore(id) : await adminApi.archive(id)
      setProduct(p)
      setForm(toForm(p))
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>

  const archived = product?.status === 'archived'
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <PageHeader
        title={isNew ? 'New product' : form.name || 'Product'}
        description={
          isNew ? 'Save as a draft first; publish when the photos and description are ready.' : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} /> {product.sku}
              {product.status === 'active' && (
                <Link to={`/products/${product.slug}`} target="_blank" className="underline decoration-gold underline-offset-4">
                  View in shop
                </Link>
              )}
            </span>
          )
        }
        actions={<Link to="/admin/products" className="text-sm font-medium underline decoration-gold underline-offset-4">Back to products</Link>}
      />

      {error && <div className="mb-6"><FormMessage>{error.message}{Object.keys(fields).length > 0 && ' — see the highlighted fields below.'}</FormMessage></div>}
      {archived && <div className="mb-6"><FormMessage tone="info">This product is archived: hidden from the shop, kept for order history. Restore it to edit and sell again.</FormMessage></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={archived || saving} className="min-w-0 space-y-6">
          <Panel title="Basics">
            <div className="space-y-5">
              <Field label="Name" value={form.name} onChange={set('name')} error={fields.name} maxLength={120} required />
              <Select label="Collection" value={form.category} onChange={set('category')} options={categoryOptions} placeholder="Choose a collection" error={fields.category} hint={categories.length ? undefined : 'Create collections first (Collections tab).'} />
              <Field label="Description" error={fields.description} hint="What it is, how it's made, how it feels to wear. Required to publish.">
                {({ id: fid, describedBy, invalid }) => (
                  <textarea id={fid} aria-describedby={describedBy} aria-invalid={invalid} value={form.description} onChange={set('description')} rows={6} maxLength={5000} className={`${inputClass} h-auto py-3`} />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="SKU" value={form.sku} onChange={(e) => set('sku')(e.target.value.toUpperCase())} error={fields.sku} hint={isNew ? 'Leave blank to generate one.' : undefined} maxLength={40} />
                <Field label="Link name (URL)" value={form.slug} onChange={set('slug')} error={fields.slug} hint={isNew ? 'Leave blank to use the name.' : `/products/${form.slug}`} maxLength={80} />
              </div>
            </div>
          </Panel>

          <Panel title="Photos & videos" description="At least one photo is needed to publish.">
            <MediaManager media={form.media} onChange={set('media')} error={fields.media} />
          </Panel>

          <Panel title="Pricing" description="Enter rupees. The selling price is calculated for you.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="MRP (₹)" type="number" inputMode="decimal" min="1" step="1" value={form.mrp} onChange={set('mrp')} error={fields.mrp} required />
              <Field label="Cost price (₹)" type="number" inputMode="decimal" min="0" step="1" value={form.costPrice} onChange={set('costPrice')} error={fields.costPrice} hint="Private — never shown to customers." />
              <Select
                label="Discount"
                value={form.discountType}
                onChange={set('discountType')}
                options={[{ value: 'none', label: 'No discount' }, { value: 'percent', label: 'Percentage (%)' }, { value: 'flat', label: 'Flat amount (₹)' }]}
                error={fields.discount}
              />
              {form.discountType !== 'none' && (
                <Field label={form.discountType === 'percent' ? 'Discount (%)' : 'Discount (₹)'} type="number" min="0" step="1" value={form.discountValue} onChange={set('discountValue')} />
              )}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 rounded-none bg-ink/5 px-4 py-3 text-sm">
              <span>
                Selling price: <strong className="font-semibold">{formatINR(selling)}</strong>
              </span>
              {margin != null && (
                <span className={margin < 0 ? 'text-danger' : ''}>
                  Margin: <strong className="font-semibold">{margin}%</strong> ({formatINR(selling - cost)})
                </span>
              )}
            </div>
          </Panel>

          <Panel title="Inventory">
            <div className="space-y-5">
              <Check label="This piece comes in sizes" hint="Ring sizes, chain lengths… stock is counted per size." checked={form.useSizes} onChange={(v) => setForm((f) => ({ ...f, useSizes: v, sizes: v && !f.sizes.length ? [{ label: '', stock: '0' }] : f.sizes }))} />
              {form.useSizes ? (
                <div>
                  <ul className="space-y-2">
                    {form.sizes.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <input aria-label={`Size ${i + 1}`} value={s.label} placeholder="e.g. US 7" maxLength={20} onChange={(e) => set('sizes')(form.sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={inputClass} />
                        <input aria-label={`Stock for size ${i + 1}`} type="number" min="0" value={s.stock} onChange={(e) => set('sizes')(form.sizes.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} className={`${inputClass} w-28`} />
                        <button type="button" aria-label={`Remove size ${i + 1}`} onClick={() => set('sizes')(form.sizes.filter((_, j) => j !== i))} className="shrink-0 rounded-none px-3 text-danger hover:bg-danger/10">
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <button type="button" onClick={() => set('sizes')([...form.sizes, { label: '', stock: '0' }])} className="font-medium underline decoration-gold underline-offset-4">
                      Add size
                    </button>
                    <span className="text-muted">Total stock: {sizeTotal}</span>
                  </div>
                  {fields.sizes && <p className="mt-2 text-[13px] text-danger">{fields.sizes}</p>}
                </div>
              ) : (
                <Field label="Stock" type="number" min="0" value={form.stock} onChange={set('stock')} error={fields.stock} />
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Warn when stock is at or below" type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
              </div>
              <Check label="Made to order" hint="Can be ordered even when stock is 0." checked={form.madeToOrder} onChange={set('madeToOrder')} />
              {form.madeToOrder && <Field label="Days to make" type="number" min="0" max="120" value={form.makingDays} onChange={set('makingDays')} error={fields.makingDays} />}
            </div>
          </Panel>

          <Panel title="Details">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Select label="Metal" value={form.metal} onChange={set('metal')} options={meta.allMetals.map((m) => ({ value: m.slug, label: m.name }))} placeholder="Not specified" error={fields.metal} />
                <Field label="Purity" value={form.purity} onChange={set('purity')} placeholder="925" maxLength={40} />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Stones</p>
                <ul className="space-y-3">
                  {form.stones.map((s, i) => {
                    const upd = (k) => (e) => set('stones')(form.stones.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))
                    return (
                      <li key={i} className="grid grid-cols-2 gap-2 rounded-none border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                        <select aria-label="Stone" value={s.gem} onChange={upd('gem')} className={`${inputClass} col-span-2 sm:col-span-1`}>
                          <option value="">Choose stone</option>
                          {meta.allStones.map((g) => (
                            <option key={g.slug} value={g.slug}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <input aria-label="Shape" placeholder="Shape" value={s.shape} onChange={upd('shape')} maxLength={40} className={inputClass} />
                        <input aria-label="Size in mm" placeholder="Size mm" value={s.sizeMm} onChange={upd('sizeMm')} maxLength={20} className={inputClass} />
                        <input aria-label="Carat" placeholder="Carat" type="number" min="0" step="0.01" value={s.carat} onChange={upd('carat')} className={inputClass} />
                        <input aria-label="Count" placeholder="Count" type="number" min="1" value={s.count} onChange={upd('count')} className={inputClass} />
                        <button type="button" aria-label="Remove stone" onClick={() => set('stones')(form.stones.filter((_, j) => j !== i))} className="rounded-none px-3 text-danger hover:bg-danger/10">
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button type="button" onClick={() => set('stones')([...form.stones, { gem: '', shape: '', sizeMm: '', carat: '', count: '1' }])} className="mt-3 text-sm font-medium underline decoration-gold underline-offset-4">
                  Add stone
                </button>
                {fields.stones && <p className="mt-2 text-[13px] text-danger">{fields.stones}</p>}
              </div>

              <div className="grid gap-5 sm:grid-cols-4">
                <Field label="Weight (g)" type="number" min="0" step="0.01" value={form.weightGrams} onChange={set('weightGrams')} />
                <Field label="Length (mm)" type="number" min="0" value={form.lengthMm} onChange={set('lengthMm')} />
                <Field label="Width (mm)" type="number" min="0" value={form.widthMm} onChange={set('widthMm')} />
                <Field label="Height (mm)" type="number" min="0" value={form.heightMm} onChange={set('heightMm')} />
              </div>
              <Check label="Handmade" checked={form.handmade} onChange={set('handmade')} />
              <Field label="Care notes" error={fields.careNotes}>
                {({ id: fid, describedBy }) => <textarea id={fid} aria-describedby={describedBy} value={form.careNotes} onChange={set('careNotes')} rows={3} maxLength={1000} className={`${inputClass} h-auto py-3`} />}
              </Field>
              <Field label="Tags" value={form.tags} onChange={set('tags')} hint="Comma separated, e.g. gift, minimal, everyday. Used by search." error={fields.tags} />
            </div>
          </Panel>
        </fieldset>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <fieldset disabled={archived || saving}>
          <Panel title="Publish">
            <div className="space-y-4">
              <Select label="Status" value={form.status} onChange={set('status')} options={[{ value: 'draft', label: 'Draft — hidden' }, { value: 'active', label: 'Live in the shop' }]} error={fields.status} />
              <Check label="Featured" hint="Shown first in collections." checked={form.featured} onChange={set('featured')} />
              <Button type="submit" loading={saving} className="w-full">
                {isNew ? 'Save product' : 'Save changes'}
              </Button>
              {savedAt && <p role="status" className="text-center text-sm text-gold">Saved</p>}
            </div>
          </Panel>
          </fieldset>

          {!isNew && !archived && <VariantsPanel product={product} variants={variants} onChange={setVariants} label={form.variantLabel} setLabel={set('variantLabel')} />}

          {!isNew && (
            <Panel title={archived ? 'Archived' : 'Archive'} description={archived ? 'Bring it back as a draft.' : 'Hide it from the shop for good. Nothing is deleted.'}>
              <Button type="button" variant={archived ? 'outline' : 'danger'} onClick={toggleArchive} loading={saving} className="w-full">
                {archived ? 'Restore product' : 'Archive product'}
              </Button>
            </Panel>
          )}

          {!isNew && <HistoryPanel productId={product.id} key={`${savedAt?.getTime()}-${product.status}`} />}
        </aside>
      </div>
    </form>
  )
}

function VariantsPanel({ product, variants, onChange, label, setLabel }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (q.trim().length < 2) return undefined
    const t = setTimeout(() => {
      adminApi.products({ q: q.trim(), limit: 8 }).then((r) => setResults(r.products.filter((p) => p.id !== product.id))).catch(() => {})
    }, 250)
    return () => clearTimeout(t)
  }, [q, product.id])

  async function link(other) {
    setError(null)
    try {
      const { variants: v } = await adminApi.linkVariant(product.id, { productId: other.id, variantLabel: label || undefined })
      onChange(v)
      setQ('')
      setResults([])
    } catch (err) {
      setError(readError(err).message)
    }
  }
  async function unlink() {
    try {
      await adminApi.unlinkVariant(product.id)
      onChange([])
    } catch (err) {
      setError(readError(err).message)
    }
  }

  return (
    <Panel title="Variants" description="Separate products shown together on one page, e.g. the same ring in other stones.">
      <div className="space-y-4">
        <Field label="This product's label" value={label} onChange={setLabel} placeholder="e.g. Citrine" maxLength={40} hint="Shown in the selector. Saved with the product." />
        {variants.length > 0 && (
          <ul className="space-y-1 text-sm">
            {variants.map((v) => (
              <li key={v._id || v.id} className="flex justify-between gap-2">
                <Link to={`/admin/products/${v._id || v.id}`} className="truncate underline decoration-gold/60 underline-offset-4">
                  {v.variantLabel || v.name}
                </Link>
                <span className="shrink-0 text-muted">{v.sku}</span>
              </li>
            ))}
          </ul>
        )}
        <div>
          <label htmlFor="variant-search" className="mb-1.5 block text-sm font-medium text-ink">
            Link another product
          </label>
          <input id="variant-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className={inputClass} />
          {q.trim().length >= 2 && results.length > 0 && (
            <ul className="mt-2 divide-y divide-line rounded-none border border-line bg-field">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => link(r)} className="w-full px-3 py-2 text-left text-sm hover:bg-ink/5">
                    {r.name} <span className="text-muted">· {r.sku}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {variants.length > 0 && (
          <button type="button" onClick={unlink} className="text-sm font-medium text-danger underline underline-offset-4">
            Remove this product from the group
          </button>
        )}
        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </Panel>
  )
}

function HistoryPanel({ productId }) {
  const [entries, setEntries] = useState(null)
  useEffect(() => {
    adminApi.auditLog({ entity: 'product', entityId: productId }).then((r) => setEntries(r.entries)).catch(() => setEntries([]))
  }, [productId])
  if (!entries?.length) return null
  return (
    <Panel title="History">
      <ul className="space-y-3 text-[13px]">
        {entries.slice(0, 12).map((e) => (
          <li key={e._id}>
            <p className="font-medium text-ink">{describeAction(e)}</p>
            <p className="text-muted">
              {e.actorEmail} · {formatWhen(e.at)}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
