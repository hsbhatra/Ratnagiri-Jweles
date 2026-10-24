import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { userApi } from '../../api/auth'
import Button, { FormMessage } from '../../components/ui/Button'
import Field, { inputClass } from '../../components/ui/Field'
import { readError } from '../../lib/authHelpers'
import { selectAuth, userUpdated } from '../../store/authSlice'

const COUNTRY_CODES = [
  'IN', 'US', 'GB', 'CA', 'AU', 'NZ', 'AE', 'SA', 'QA', 'SG', 'MY', 'HK', 'JP',
  'DE', 'FR', 'NL', 'BE', 'IE', 'IT', 'ES', 'PT', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI',
]
const regionNames = new Intl.DisplayNames(undefined, { type: 'region' })
const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: regionNames.of(code) })).sort((a, b) => a.name.localeCompare(b.name))

const EMPTY = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'IN', isDefault: false }

function AddressForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = { ...form }
      delete body._id
      delete body.createdAt
      delete body.updatedAt
      const result = initial?._id ? await userApi.updateAddress(initial._id, body) : await userApi.addAddress(body)
      onSaved(result.addresses)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  const fields = error?.fields || {}
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" autoComplete="name" value={form.fullName} onChange={update('fullName')} error={fields.fullName} />
      <Field label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} error={fields.phone} />
      <Field className="sm:col-span-2" label="Address" autoComplete="address-line1" value={form.line1} onChange={update('line1')} error={fields.line1} />
      <Field className="sm:col-span-2" label="Apartment, suite, landmark (optional)" autoComplete="address-line2" value={form.line2} onChange={update('line2')} error={fields.line2} />
      <Field label="City" autoComplete="address-level2" value={form.city} onChange={update('city')} error={fields.city} />
      <Field label="State / region (optional)" autoComplete="address-level1" value={form.state} onChange={update('state')} error={fields.state} />
      <Field label="Postal code" autoComplete="postal-code" value={form.postalCode} onChange={update('postalCode')} error={fields.postalCode} />
      <Field label="Country" error={fields.country}>
        {({ id, describedBy }) => (
          <select id={id} aria-describedby={describedBy} autoComplete="country" value={form.country} onChange={update('country')} className={inputClass}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Label (optional)" placeholder="Home, Office…" value={form.label} onChange={update('label')} error={fields.label} />
      <label className="flex items-center gap-3 self-end pb-3 text-sm text-brand-forest-900">
        <input type="checkbox" checked={form.isDefault} onChange={update('isDefault')} className="size-4 accent-brand-forest-900" />
        Use as my default address
      </label>
      {error && !Object.keys(fields).length && (
        <div className="sm:col-span-2">
          <FormMessage>{error.message}</FormMessage>
        </div>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" loading={loading}>
          Save address
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default function AddressBook({ addresses }) {
  const dispatch = useDispatch()
  const { user } = useSelector(selectAuth)
  const [editing, setEditing] = useState(null) // null | 'new' | address
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const saved = (next) => {
    dispatch(userUpdated({ ...user, addresses: next }))
    setEditing(null)
  }

  async function remove(id) {
    setDeleting(id)
    setError(null)
    try {
      saved((await userApi.deleteAddress(id)).addresses)
    } catch (err) {
      setError(readError(err))
    } finally {
      setDeleting(null)
    }
  }

  if (editing) {
    return <AddressForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={saved} />
  }

  return (
    <div>
      <FormMessage>{error?.message}</FormMessage>
      {addresses.length === 0 ? (
        <p className="text-[15px] text-brand-forest-900/75">No saved addresses yet.</p>
      ) : (
        <ul className="divide-y divide-brand-forest-900/10">
          {addresses.map((a) => (
            <li key={a._id} className="flex flex-col gap-3 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
              <address className="not-italic text-[15px] leading-relaxed text-brand-forest-900">
                <span className="font-medium text-brand-forest-950">
                  {a.label || a.fullName}
                  {a.isDefault && <span className="ml-2 text-sm font-normal text-brand-forest-800">(default)</span>}
                </span>
                <br />
                {a.fullName}, {a.phone}
                <br />
                {[a.line1, a.line2].filter(Boolean).join(', ')}
                <br />
                {[a.city, a.state, a.postalCode].filter(Boolean).join(', ')}, {regionNames.of(a.country)}
              </address>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" className="h-10 px-5 text-sm" onClick={() => setEditing(a)}>
                  Edit
                </Button>
                <Button variant="outline" className="h-10 px-5 text-sm" loading={deleting === a._id} onClick={() => remove(a._id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {addresses.length < 5 && (
        <Button variant="outline" className="mt-6" onClick={() => setEditing('new')}>
          Add an address
        </Button>
      )}
    </div>
  )
}
