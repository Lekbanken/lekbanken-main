'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Tenant = {
  id: string
  name?: string
  type?: string
  status?: string
  default_language?: string | null
  default_theme?: string | null
  demo_flag?: boolean | null
}

type TenantSettings = {
  modules?: Record<string, unknown>
  product_access?: Record<string, unknown>
  preferences?: Record<string, unknown>
}

type TenantBranding = {
  logo_media_id?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  theme?: string | null
  brand_name_override?: string | null
}

type Membership = {
  user_id: string
  role: string
  status: string
  is_primary: boolean
  created_at?: string
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload?.error || res.statusText)
  }
  return res.json()
}

export default function TenantAdminPage() {
  const search = useSearchParams()
  const initialTenantId = search.get('tenantId') ?? ''
  const [tenantId, setTenantId] = useState(initialTenantId)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [modulesText, setModulesText] = useState<string>(() => JSON.stringify({}, null, 2))
  const [productText, setProductText] = useState<string>(() => JSON.stringify({}, null, 2))

  const modulesJson = useMemo(() => JSON.stringify(settings?.modules ?? {}, null, 2), [settings])
  const productJson = useMemo(() => JSON.stringify(settings?.product_access ?? {}, null, 2), [settings])

  async function loadAll(id: string) {
    if (!id) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const [{ tenant }, settingsResp, brandingResp, membersResp] = await Promise.all([
        fetchJson<{ tenant: Tenant }>(`/api/tenants/${id}`),
        fetchJson<{ settings: TenantSettings | null }>(`/api/tenants/${id}/settings`),
        fetchJson<{ branding: TenantBranding | null }>(`/api/tenants/${id}/branding`),
        fetchJson<{ members: Membership[] }>(`/api/tenants/${id}/members`),
      ])
      setTenant(tenant)
      setSettings(settingsResp.settings ?? {})
      setBranding(brandingResp.branding ?? {})
      setMembers(membersResp.members ?? [])
      setModulesText(JSON.stringify(settingsResp.settings?.modules ?? {}, null, 2))
      setProductText(JSON.stringify(settingsResp.settings?.product_access ?? {}, null, 2))
    } catch (e: any) {
      setError(e.message ?? 'Kunde inte ladda tenant')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialTenantId) {
      loadAll(initialTenantId)
    }
  }, [initialTenantId])

  async function saveTenant() {
    if (!tenantId || !tenant) return
    setMessage(null)
    setError(null)
    try {
      const { tenant: updated } = await fetchJson<{ tenant: Tenant }>(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenant.name,
          type: tenant.type,
          status: tenant.status,
          default_language: tenant.default_language,
          default_theme: tenant.default_theme,
          demo_flag: tenant.demo_flag,
        }),
      })
      setTenant(updated)
      setMessage('Tenant sparad')
    } catch (e: any) {
      setError(e.message ?? 'Kunde inte spara tenant')
    }
  }

  async function saveSettings(modulesStr: string, productStr: string) {
    if (!tenantId) return
    setMessage(null)
    setError(null)
    try {
      const modules = modulesStr ? JSON.parse(modulesStr) : {}
      const product_access = productStr ? JSON.parse(productStr) : {}
      const { settings: updated } = await fetchJson<{ settings: TenantSettings }>(`/api/tenants/${tenantId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules, product_access }),
      })
      setSettings(updated)
      setMessage('Settings sparade')
    } catch (e: any) {
      setError(e.message ?? 'Kunde inte spara settings')
    }
  }

  async function saveBranding() {
    if (!tenantId) return
    setMessage(null)
    setError(null)
    try {
      const { branding: updated } = await fetchJson<{ branding: TenantBranding }>(`/api/tenants/${tenantId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding ?? {}),
      })
      setBranding(updated)
      setMessage('Branding sparad')
    } catch (e: any) {
      setError(e.message ?? 'Kunde inte spara branding')
    }
  }

  async function createInvite(email: string, role: string) {
    if (!tenantId) return
    setMessage(null)
    setError(null)
    try {
      await fetchJson(`/api/tenants/${tenantId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      setMessage('Inbjudan skapad')
    } catch (e: any) {
      setError(e.message ?? 'Kunde inte skapa inbjudan')
    }
  }

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Tenant Admin</h1>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Tenant ID</label>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 w-full"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="Ange tenantId"
          />
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={() => loadAll(tenantId)}
            disabled={!tenantId || loading}
          >
            Ladda
          </button>
        </div>
      </div>

      {loading && <div>Laddar...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {message && <div className="text-green-700">{message}</div>}

      {tenant && (
        <>
          <section className="space-y-2 border rounded p-3">
            <h2 className="text-lg font-semibold">Grunddata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="border rounded px-2 py-1"
                value={tenant.name ?? ''}
                onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                placeholder="Namn"
              />
              <input
                className="border rounded px-2 py-1"
                value={tenant.type ?? ''}
                onChange={(e) => setTenant({ ...tenant, type: e.target.value })}
                placeholder="Typ (school/sports/workplace/private/demo)"
              />
              <input
                className="border rounded px-2 py-1"
                value={tenant.status ?? ''}
                onChange={(e) => setTenant({ ...tenant, status: e.target.value })}
                placeholder="Status (active/suspended/trial/demo/archived)"
              />
              <input
                className="border rounded px-2 py-1"
                value={tenant.default_language ?? ''}
                onChange={(e) => setTenant({ ...tenant, default_language: e.target.value })}
                placeholder="Default språk"
              />
              <input
                className="border rounded px-2 py-1"
                value={tenant.default_theme ?? ''}
                onChange={(e) => setTenant({ ...tenant, default_theme: e.target.value })}
                placeholder="Default tema (light/dark)"
              />
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!tenant.demo_flag}
                  onChange={(e) => setTenant({ ...tenant, demo_flag: e.target.checked })}
                />
                Demo-tenant
              </label>
            </div>
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveTenant}>
              Spara grunddata
            </button>
          </section>

          <section className="space-y-2 border rounded p-3">
            <h2 className="text-lg font-semibold">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm">modules (JSON)</label>
                <textarea
                  className="border rounded px-2 py-1 w-full h-32"
                  value={modulesText}
                  onChange={(e) => setModulesText(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">product_access (JSON)</label>
                <textarea
                  className="border rounded px-2 py-1 w-full h-32"
                  value={productText}
                  onChange={(e) => setProductText(e.target.value)}
                />
              </div>
            </div>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white"
              onClick={() => saveSettings(modulesText || modulesJson, productText || productJson)}
            >
              Spara settings
            </button>
          </section>

          <section className="space-y-2 border rounded p-3">
            <h2 className="text-lg font-semibold">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="border rounded px-2 py-1"
                value={branding?.logo_media_id ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), logo_media_id: e.target.value })}
                placeholder="logo_media_id"
              />
              <input
                className="border rounded px-2 py-1"
                value={branding?.primary_color ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), primary_color: e.target.value })}
                placeholder="primary_color"
              />
              <input
                className="border rounded px-2 py-1"
                value={branding?.secondary_color ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), secondary_color: e.target.value })}
                placeholder="secondary_color"
              />
              <input
                className="border rounded px-2 py-1"
                value={branding?.accent_color ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), accent_color: e.target.value })}
                placeholder="accent_color"
              />
              <input
                className="border rounded px-2 py-1"
                value={branding?.theme ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), theme: e.target.value })}
                placeholder="theme (light/dark)"
              />
              <input
                className="border rounded px-2 py-1"
                value={branding?.brand_name_override ?? ''}
                onChange={(e) => setBranding({ ...(branding ?? {}), brand_name_override: e.target.value })}
                placeholder="brand_name_override"
              />
            </div>
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={saveBranding}>
              Spara branding
            </button>
          </section>

          <section className="space-y-2 border rounded p-3">
            <h2 className="text-lg font-semibold">Medlemmar</h2>
            <ul className="space-y-1 text-sm">
              {members.map((m) => (
                <li key={m.user_id} className="border rounded px-2 py-1 flex justify-between">
                  <span>
                    {m.user_id} · {m.role} · {m.status} {m.is_primary ? '· primary' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2 border rounded p-3">
            <h2 className="text-lg font-semibold">Bjud in</h2>
            <InviteForm onSubmit={(email, role) => createInvite(email, role)} />
          </section>
        </>
      )}
    </div>
  )
}

function InviteForm({ onSubmit }: { onSubmit: (email: string, role: string) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('organisation_user')
  return (
    <div className="flex gap-2 flex-wrap">
      <input
        className="border rounded px-2 py-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <input
        className="border rounded px-2 py-1"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="role"
      />
      <button
        className="px-3 py-1 rounded bg-blue-600 text-white"
        onClick={() => {
          if (!email) return
          onSubmit(email, role)
          setEmail('')
        }}
      >
        Skicka inbjudan
      </button>
    </div>
  )
}
