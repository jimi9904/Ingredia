import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SubmitRecipeModal from './SubmitRecipeModal'
import { useTranslation } from 'react-i18next'
import { setLanguage, LANGUAGES } from '../i18n/index.js'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase()
}

// Labels resolved inside the component via t() — see usage below.
// `authOnly: true`  → hidden from unauthenticated guests
// `hideForAdmin: true` → hidden for admin accounts (admins manage content, they don't cook from a personal pantry)
const HOME_NAV_KEYS = [
  { to: '/home',   icon: '🍳', key: 'nav.myKitchen' },
  { to: '/pantry', icon: '🧺', key: 'nav.pantry', authOnly: true, hideForAdmin: true },
  { to: '/saved',  icon: '🔖', key: 'nav.saved',  authOnly: true, hideForAdmin: true },
]

export default function Navbar({ variant = 'landing', onLogin, onSignup }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (variant !== 'landing') return
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [variant])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  const navClass = variant === 'landing'
    ? `fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-cream/85 backdrop-blur-md border-b border-terra/10 transition-all duration-300 ${
        scrolled ? 'py-3.5 px-12 shadow-card' : 'py-5 px-12'
      }`
    : 'sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-terra/10'

  return (
    <nav className={navClass}>
      <div className={variant === 'home' ? 'flex justify-between items-center h-[60px] px-6 md:px-12 max-w-[1200px] mx-auto w-full' : 'contents'}>
        <Link to={isAuthenticated ? '/home' : '/'} className="font-display text-[34px] font-bold tracking-wide text-deep">
          Ingre<span className="text-terra">dia</span>
        </Link>

        {/* Landing nav links */}
        {variant === 'landing' && (
          <ul className="hidden md:flex gap-9 list-none text-[14px] font-medium text-muted">
            <li><a href="#hero" className="hover:text-terra transition-colors">{t('landingNav.home')}</a></li>
            <li><a href="#trending" className="hover:text-terra transition-colors">{t('landingNav.trending')}</a></li>
            <li><a href="#features" className="hover:text-terra transition-colors">{t('landingNav.features')}</a></li>
            <li><a href="#cuisines" className="hover:text-terra transition-colors">{t('landingNav.cuisines')}</a></li>
            <li><a href="#testimonials" className="hover:text-terra transition-colors">{t('landingNav.testimonials')}</a></li>
          </ul>
        )}

        {/* Home app nav links */}
        {variant === 'home' && (
          <ul className="hidden md:flex gap-1 list-none">
            {HOME_NAV_KEYS.filter((l) => (!l.authOnly || isAuthenticated) && !(l.hideForAdmin && isAdmin)).map((link) => {
              const active = location.pathname === link.to
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      active ? 'bg-terra/10 text-terra font-semibold' : 'text-muted hover:text-deep hover:bg-cream-2'
                    }`}
                  >
                    <span>{link.icon}</span>
                    {t(link.key)}
                  </Link>
                </li>
              )
            })}
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    location.pathname === '/admin' ? 'bg-gold/15 text-gold font-semibold' : 'text-muted hover:text-gold hover:bg-gold/5'
                  }`}
                >
                  <span>🛡</span> {t('nav.admin')}
                </Link>
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5 bg-cream-2 rounded-full p-0.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                title={lang.name}
                className={`px-2.5 py-1 rounded-full text-[12px] font-bold transition-all ${
                  i18n.language === lang.code
                    ? 'bg-terra text-white shadow-sm'
                    : 'text-muted hover:text-deep'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {isAdmin && variant === 'home' && (
            <button
              onClick={() => setSubmitOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-terra text-white text-[13px] font-semibold rounded-full hover:bg-terra-2 transition-colors"
            >
              {t('nav.submitRecipe')}
            </button>
          )}
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
                className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 border-[1.5px] border-cream-3 rounded-full hover:border-terra transition-colors"
              >
                <div className="w-[30px] h-[30px] rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center">
                  {initials(user.name)}
                </div>
                <span className="text-sm font-semibold text-deep hidden sm:inline">{user.name}</span>
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-card-hover py-2 border border-cream-3 z-50">
                  <div className="px-4 py-2 text-xs text-muted truncate">{user.email}</div>
                  <div className="h-px bg-cream-3 my-1" />
                  {variant === 'landing' && (
                    <Link to="/home" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-deep">🍳 {t('nav.myKitchen')}</Link>
                  )}
                  {variant === 'home' && (
                    <>
                      <Link to="/home" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-deep">🍳 {t('nav.myKitchen')}</Link>
                      {!isAdmin && <Link to="/pantry" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-deep">🧺 {t('nav.pantry')}</Link>}
                      {!isAdmin && <Link to="/saved" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-deep">{t('nav.savedRecipes')}</Link>}
                      <Link to="/profile" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-deep">👤 {t('nav.profile')}</Link>
                      {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-cream-2 text-gold">🛡 {t('nav.adminPanel')}</Link>}
                      <div className="h-px bg-cream-3 my-1" />
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-cream-2 text-terra font-medium">{t('nav.signOut')}</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {onLogin
                ? <button onClick={onLogin} className="btn-outline">{t('nav.logIn')}</button>
                : <Link to="/login" className="btn-outline">{t('nav.logIn')}</Link>
              }
              {onSignup
                ? <button onClick={onSignup} className="btn-primary">{t('nav.getStarted')}</button>
                : <Link to="/signup" className="btn-primary">{t('nav.getStarted')}</Link>
              }
            </>
          )}
        </div>
      </div>

      {/* Mobile nav for home variant */}
      {variant === 'home' && (
        <div className="md:hidden flex gap-1 overflow-x-auto pb-1 px-4 w-full border-t border-cream-3 bg-white">
          {HOME_NAV_KEYS.filter((l) => (!l.authOnly || isAuthenticated) && !(l.hideForAdmin && isAdmin)).map((link) => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 text-[12px] font-medium transition-colors ${
                  active ? 'text-terra' : 'text-muted'
                }`}
              >
                {link.icon} {t(link.key)}
              </Link>
            )
          })}
          {isAdmin && (
            <Link to="/admin" className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-gold">
              🛡 {t('nav.admin')}
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={() => setSubmitOpen(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-terra"
            >
              {t('nav.submitRecipe')}
            </button>
          )}
        </div>
      )}

      {submitOpen && <SubmitRecipeModal onClose={() => setSubmitOpen(false)} />}
    </nav>
  )
}
