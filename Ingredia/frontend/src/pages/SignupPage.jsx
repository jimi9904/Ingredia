import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'

export default function SignupPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    if (password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }
    setSubmitting(true)
    try {
      const u = await register({ name, email, password })
      toast(`Welcome to Ingredia, ${u.name}!`)
      navigate('/home', { replace: true })
    } catch (err) {
      if (err.status === 422 && err.errors) {
        setFieldErrors(err.errors)
        setError(Object.values(err.errors)[0]?.[0] || 'Validation failed.')
      } else {
        setError(err.response?.data?.message || err.message || 'Could not create account.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-cream-gradient">
      <div className="w-full max-w-[460px] text-center">
        <Link to="/" className="inline-block font-display text-[42px] font-bold text-terra mb-2">
          Ingredia
        </Link>
        <p className="text-sm text-muted mb-9">{t('auth.createAccount')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-10 shadow-soft text-left space-y-4">
          <Field label={t('auth.fullName')} error={fieldErrors.name?.[0]}>
            <input type="text" required autoComplete="name" className="input-cream" placeholder={t('auth.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={t('auth.email')} error={fieldErrors.email?.[0]}>
            <input type="email" required autoComplete="email" className="input-cream" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={t('auth.password')} error={fieldErrors.password?.[0]}>
            <input type="password" required minLength={8} autoComplete="new-password" className="input-cream" placeholder={t('auth.createPasswordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="text-sm text-terra">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full py-4 bg-terra text-white rounded-lg text-[15px] font-semibold hover:bg-terra-2 transition-colors disabled:opacity-60">
            {submitting ? t('auth.creating') : t('auth.createFreeAccount')}
          </button>
        </form>

        <p className="text-[13px] text-muted mt-5">
          {t('auth.alreadyAccount')}{' '}
          <Link to="/login" className="text-terra font-semibold hover:underline">{t('auth.signInLink')}</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-deep-2 mb-1.5 tracking-wide uppercase">{label}</div>
      {children}
      {error && <div className="text-xs text-terra mt-1">{error}</div>}
    </div>
  )
}
