import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authApi'
import { useTranslation } from 'react-i18next'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams]              = useSearchParams()
  const navigate                    = useNavigate()
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    try {
      await resetPassword({ token, email, password, password_confirmation: confirm })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired reset link.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-card border border-cream-3 p-10 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-display text-xl font-bold text-deep mb-2">{t('resetPwd.invalidTitle')}</h2>
          <p className="text-sm text-muted mb-5">{t('resetPwd.invalidSub')}</p>
          <Link to="/forgot-password" className="btn-primary inline-block">{t('resetPwd.requestNew')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-[42px] font-bold text-deep">Ingre<span className="text-terra">dia</span></Link>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-cream-3 p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-display text-2xl font-bold text-deep mb-2">{t('auth.passwordReset')}</h2>
              <p className="text-sm text-muted">{t('auth.redirectingToLogin')}</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-deep mb-1">{t('auth.setNewPassword')}</h2>
              <p className="text-sm text-muted mb-6">{t('auth.newPasswordSub', { email })}</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deep mb-1.5 uppercase tracking-wider">{t('auth.newPassword')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-cream"
                    placeholder={t('resetPwd.minChars')}
                    minLength={8}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-deep mb-1.5 uppercase tracking-wider">{t('auth.confirmPassword')}</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="input-cream"
                    placeholder={t('resetPwd.confirmHint')}
                    required
                  />
                </div>
                <button type="submit" disabled={loading || !password || !confirm} className="btn-primary w-full disabled:opacity-50">
                  {loading ? t('auth.saving') : t('auth.resetPassword')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
