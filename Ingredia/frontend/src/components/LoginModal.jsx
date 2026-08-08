import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'

export default function LoginModal({ onClose, onSwitchToSignup }) {
  const { t } = useTranslation()
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const u = await login({ email, password })
      toast(`Welcome back, ${u.name}!`)
      onClose()
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[460px] bg-white rounded-3xl p-10 shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-cream-2 text-muted hover:bg-cream-3 hover:text-deep transition-colors text-xl leading-none"
        >
          ×
        </button>

        <div className="text-center mb-8">
          <div className="font-display text-[36px] font-bold text-terra mb-1">Ingredia</div>
          <p className="text-sm text-muted">{t('auth.welcomeBack')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              className="input-cream"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label={t('auth.password')}>
            <input
              type="password"
              required
              className="input-cream"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <div className="text-sm text-terra">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-terra text-white rounded-lg text-[15px] font-semibold hover:bg-terra-2 transition-colors disabled:opacity-60"
          >
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <p className="text-[13px] text-muted text-center mt-5">
          {t('auth.noAccount')}{' '}
          <button onClick={onSwitchToSignup} className="text-terra font-semibold hover:underline">
            {t('auth.signUpFree')}
          </button>
        </p>
        <p className="text-[13px] text-muted text-center mt-2">
          {t('auth.forgotPassword')}{' '}
          <Link to="/forgot-password" onClick={onClose} className="text-terra font-semibold hover:underline">
            {t('auth.resetIt')}
          </Link>
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
