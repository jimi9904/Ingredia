import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authApi'
import { useTranslation } from 'react-i18next'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-[42px] font-bold text-deep">Ingre<span className="text-terra">dia</span></Link>
          <p className="text-muted text-sm mt-2">{t('forgotPwd.tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-cream-3 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="font-display text-2xl font-bold text-deep mb-2">{t('auth.checkInbox')}</h2>
              <p className="text-sm text-muted mb-6">
                {t('auth.checkInboxSub', { email })}
              </p>
              <Link to="/login" className="btn-primary inline-block">{t('auth.backToLogin')}</Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-deep mb-1">{t('auth.forgotTitle')}</h2>
              <p className="text-sm text-muted mb-6">{t('auth.forgotSub')}</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deep mb-1.5 uppercase tracking-wider">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-cream"
                    placeholder={t('auth.emailPlaceholder')}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading || !email} className="btn-primary w-full disabled:opacity-50">
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </button>
              </form>

              <p className="text-center text-sm text-muted mt-6">
                {t('auth.rememberedIt')}{' '}
                <Link to="/login" className="text-terra font-semibold hover:underline">{t('auth.signInLink')}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
