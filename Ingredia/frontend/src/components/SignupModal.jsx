import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'

export default function SignupModal({ onClose, onSwitchToLogin }) {
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
    setFieldErrors({})
    if (password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }
    setSubmitting(true)
    try {
      const u = await register({ name, email, password })
      toast(`Welcome to Ingredia, ${u.name}!`)
      onClose()
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
          <p className="text-sm text-muted">{t('auth.createAccount')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('auth.fullName')} error={fieldErrors.name?.[0]}>
            <input
              type="text"
              required
              className="input-cream"
              placeholder={t('auth.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label={t('auth.email')} error={fieldErrors.email?.[0]}>
            <input
              type="email"
              required
              className="input-cream"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('auth.password')} error={fieldErrors.password?.[0]}>
            <input
              type="password"
              required
              minLength={8}
              className="input-cream"
              placeholder={t('auth.createPasswordPlaceholder')}
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
            {submitting ? t('auth.creating') : t('auth.createFreeAccount')}
          </button>
        </form>

        <p className="text-[13px] text-muted text-center mt-5">
          {t('auth.alreadyAccount')}{' '}
          <button onClick={onSwitchToLogin} className="text-terra font-semibold hover:underline">
            {t('auth.signInLink')}
          </button>
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
