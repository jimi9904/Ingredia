import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo') || '/home'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = await login({ email, password })
      toast(`Welcome back, ${u.name}!`)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
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
        <p className="text-sm text-muted mb-9">{t('auth.welcomeBack')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-10 shadow-soft text-left space-y-4">
          <Field label={t('auth.email')}>
            <input type="email" required className="input-cream" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label={t('auth.password')}>
            <input type="password" required className="input-cream" placeholder={t('auth.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="text-sm text-terra">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full py-4 bg-terra text-white rounded-lg text-[15px] font-semibold hover:bg-terra-2 transition-colors disabled:opacity-60">
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="text-[13px] text-muted mt-5">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="text-terra font-semibold hover:underline">{t('auth.signUpFree')}</Link>
        </p>
        <p className="text-[13px] text-muted mt-2">
          {t('auth.forgotPassword')}{' '}
          <Link to="/forgot-password" className="text-terra font-semibold hover:underline">{t('auth.resetIt')}</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-deep-2 mb-1.5 tracking-wide uppercase">{label}</div>
      {children}
    </div>
  )
}
