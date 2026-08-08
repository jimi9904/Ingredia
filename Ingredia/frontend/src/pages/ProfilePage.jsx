import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { updateProfile } from '../api/authApi'
import { useTranslation } from 'react-i18next'

const DIETARY_OPTIONS = [
  { value: 'vegetarian', label: '🥗 Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'gluten-free', label: '🌾 Gluten-Free' },
  { value: 'keto', label: '🥑 Keto' },
  { value: 'dairy-free', label: '🥛 Dairy-Free' },
  { value: 'nut-free', label: '🥜 Nut-Free' },
]

const CUISINE_OPTIONS = [
  'Indian','Italian','Chinese','Mexican','Thai','Japanese','Mediterranean','American','French','Korean',
]

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase()
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout, updateUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [dietary, setDietary] = useState(user?.preferences?.dietary || [])
  const [allergies, setAllergies] = useState(user?.preferences?.allergies || [])
  const [cuisines, setCuisines] = useState(user?.preferences?.cuisine_preference || [])
  const [allergyInput, setAllergyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')

  const toggleDietary = (val) =>
    setDietary((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])

  const toggleCuisine = (val) =>
    setCuisines((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])

  const addAllergy = () => {
    const a = allergyInput.trim().toLowerCase()
    if (a && !allergies.includes(a)) { setAllergies((prev) => [...prev, a]); setAllergyInput('') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile({ name, preferences: { dietary, allergies, cuisine_preference: cuisines } })
      updateUser(updated)
      toast('Profile saved!')
    } catch {
      toast('Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const TABS = [
    { key: 'profile', label: t('profile.profileTab') },
    { key: 'preferences', label: t('profile.preferencesTab') },
    { key: 'account', label: t('profile.accountTab') },
  ]

  return (
    <div className="min-h-screen bg-cream">
      <Navbar variant="home" />

      <div className="container-x py-12">
        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-full bg-terra text-white text-xl font-bold flex items-center justify-center shadow-cta">
            {initials(user?.name)}
          </div>
          <div>
            <div className="section-label mb-1">{t('profile.myAccount')}</div>
            <h1 className="font-display font-bold text-deep text-3xl">{user?.name}</h1>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-cream-3 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === t.key ? 'bg-white border border-b-white border-cream-3 -mb-px text-terra' : 'text-muted hover:text-deep'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl">
          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7 space-y-5">
              <h2 className="font-display text-xl font-bold text-deep">{t('profile.personalInfo')}</h2>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t('profile.fullName')}</label>
                <input
                  className="input-cream"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t('profile.email')}</label>
                <input
                  className="input-cream opacity-60"
                  value={user?.email || ''}
                  disabled
                  readOnly
                />
                <p className="text-xs text-muted mt-1.5">{t('profile.emailCannotChange')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t('profile.memberSince')}</label>
                <p className="text-sm text-deep">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t('profile.role')}</label>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${user?.role === 'admin' ? 'bg-gold/15 text-gold' : 'bg-sage/15 text-sage'}`}>
                  {user?.role === 'admin' ? t('profile.adminRole') : t('profile.memberRole')}
                </span>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          )}

          {/* Preferences tab */}
          {tab === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
                <h2 className="font-display text-xl font-bold text-deep mb-5">{t('profile.dietaryPrefs')}</h2>
                <div className="flex flex-wrap gap-3">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleDietary(opt.value)}
                      className={`px-4 py-2 rounded-full text-sm border-[1.5px] transition-all ${
                        dietary.includes(opt.value)
                          ? 'bg-terra border-terra text-white shadow-cta'
                          : 'bg-white border-cream-3 text-muted hover:border-terra hover:text-terra'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
                <h2 className="font-display text-xl font-bold text-deep mb-2">{t('profile.allergies')}</h2>
                <p className="text-xs text-muted mb-4">{t('profile.allergyNote')}</p>
                <div className="flex gap-2 mb-4">
                  <input
                    className="input-cream flex-1"
                    placeholder={t('profile.allergyPlaceholder')}
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
                  />
                  <button onClick={addAllergy} className="btn-outline whitespace-nowrap">{t('profile.add')}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-sm text-red-700">
                      {a}
                      <button onClick={() => setAllergies((prev) => prev.filter((v) => v !== a))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </span>
                  ))}
                  {allergies.length === 0 && <p className="text-sm text-muted">{t('profile.noAllergies')}</p>}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
                <h2 className="font-display text-xl font-bold text-deep mb-5">{t('profile.favCuisines')}</h2>
                <div className="flex flex-wrap gap-3">
                  {CUISINE_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCuisine(c)}
                      className={`px-4 py-2 rounded-full text-sm border-[1.5px] transition-all ${
                        cuisines.includes(c)
                          ? 'bg-deep border-deep text-white'
                          : 'bg-white border-cream-3 text-muted hover:border-deep hover:text-deep'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? t('profile.saving') : t('profile.savePrefs')}
              </button>
            </div>
          )}

          {/* Account tab */}
          {tab === 'account' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
                <h2 className="font-display text-xl font-bold text-deep mb-5">{t('profile.accountSettings')}</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-cream-3">
                    <div>
                      <p className="text-sm font-semibold text-deep">{t('profile.emailNotifs')}</p>
                      <p className="text-xs text-muted">{t('profile.emailNotifsSub')}</p>
                    </div>
                    <div className="w-10 h-6 bg-terra rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-cream-3">
                    <div>
                      <p className="text-sm font-semibold text-deep">{t('profile.searchHistory')}</p>
                      <p className="text-xs text-muted">{t('profile.searchHistorySub')}</p>
                    </div>
                    <div className="w-10 h-6 bg-terra rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-red-100 shadow-card p-7">
                <h2 className="font-display text-xl font-bold text-red-600 mb-2">{t('profile.dangerZone')}</h2>
                <p className="text-sm text-muted mb-5">{t('profile.dangerZoneSub')}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 border-[1.5px] border-terra text-terra rounded-full text-sm font-semibold hover:bg-terra hover:text-white transition-all"
                  >
                    {t('nav.signOut')}
                  </button>
                  <button
                    onClick={() => toast('Account deletion — contact support.')}
                    className="px-5 py-2.5 border-[1.5px] border-red-300 text-red-500 rounded-full text-sm font-semibold hover:bg-red-50 transition-all"
                  >
                    {t('profile.deleteAccount')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
