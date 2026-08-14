import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import SpinnerButton from '../components/SpinnerButton'

export default function CreateCompany() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [ein, setEin] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [hasAddress, setHasAddress] = useState(false)
  const [address, setAddress] = useState({ country: '', state: '', city: '', street: '', building: '', unit: '', zip: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setAddressField<K extends keyof typeof address>(key: K, value: string) {
    setAddress((a) => ({ ...a, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Company name is required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const created = await api.createCompany({
        name: name.trim(),
        ein: ein.trim() || undefined,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        address: hasAddress
          ? { ...address, is_default: false }
          : null,
      })
      localStorage.setItem('wf_company_id', String(created.id))
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
      setLoading(false)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', to: '/app' },
        ]}
      />
      <h1>New company</h1>
      <p className="page-subtitle">Create a new company entity.</p>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <div className="form-grid-row-ein">
          <label className="name-field">
            Company name *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Corp" required autoFocus />
          </label>
          <label className="ein-field">
            EIN
            <input value={ein} onChange={(e) => setEin(e.target.value)} placeholder="12-3456789" size={10} />
          </label>
        </div>
        <label className="form-full">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does the company do?" rows={4} />
        </label>
        <label className="form-full">
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
        </label>
        <label className="form-full">
          Website
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
        </label>
        <label className="checkbox-label form-full">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          Company address is specified
        </label>
        {hasAddress && (
          <>
            <div className="form-grid-row-stcity">
              <label>
                Country
                <input value={address.country} onChange={(e) => setAddressField('country', e.target.value)} placeholder="USA" />
              </label>
              <label>
                State
                <input value={address.state} onChange={(e) => setAddressField('state', e.target.value)} placeholder="State / region" />
              </label>
            </div>
            <div className="form-grid-row-cityzip">
              <label>
                Street
                <input value={address.street} onChange={(e) => setAddressField('street', e.target.value)} placeholder="Main St 12" />
              </label>
              <label>
                Building
                <input value={address.building} onChange={(e) => setAddressField('building', e.target.value)} placeholder="Bld" />
              </label>
            </div>
            <div className="form-grid-row-two">
              <label>
                City
                <input value={address.city} onChange={(e) => setAddressField('city', e.target.value)} placeholder="Berlin" />
              </label>
              <div className="form-grid-row-two">
                <label>
                  Unit
                  <input value={address.unit} onChange={(e) => setAddressField('unit', e.target.value)} placeholder="Unit" />
                </label>
                <label>
                  Zip
                  <input value={address.zip} onChange={(e) => setAddressField('zip', e.target.value)} placeholder="10115" />
                </label>
              </div>
            </div>
          </>
        )}
        {error && <div className="alert form-full">{error}</div>}
        <div className="form-actions form-full">
          <SpinnerButton type="submit" className="btn primary" loading={loading}>
            {loading ? 'Creating…' : 'Create company'}
          </SpinnerButton>
          <Link to="/app" className="btn ghost">
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}