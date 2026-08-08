import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import LoginModal from '../components/LoginModal'
import SignupModal from '../components/SignupModal'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { fetchPopularRecipes } from '../api/recipeApi'
import { useTranslatedText } from '../hooks/useTranslatedText'

const features = [
  { num: '01', icon: '🌿', title: 'Add Ingredients',  desc: "Tell us what you have in your fridge or pantry — any combination of fresh produce, proteins, and pantry staples." },
  { num: '02', icon: '🔍', title: 'Discover Recipes', desc: 'Our intelligent engine matches your ingredients to thousands of authentic recipes, ranked by how well they match.' },
  { num: '03', icon: '🍱', title: 'Cook & Save',      desc: 'Follow step-by-step instructions, save favorites, and build your personal recipe library.' },
  { num: '04', icon: '📊', title: 'Nutrition Tracker',desc: 'Every recipe comes with detailed nutritional information — calories, macros, and micronutrients per serving.' },
  { num: '05', icon: '⏱️', title: 'Built-in Timers',  desc: 'Interactive cooking timers integrated directly into each recipe step so you never lose track of timing.' },
  { num: '06', icon: '🌍', title: '20+ World Cuisines', desc: 'Explore authentic recipes from Indian, Italian, Japanese, Mexican, Thai, and many more traditions.' },
]

const cuisines = [
  {
    name: 'Indian', count: '2,700+ recipes', emoji: '🍛',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-orange-900 to-amber-800',
  },
  {
    name: 'Italian', count: '3 recipes', emoji: '🍕',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-red-900 to-orange-800',
  },
  {
    name: 'Chinese', count: '3 recipes', emoji: '🥟',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-red-950 to-yellow-900',
  },
  {
    name: 'Mexican', count: '1 recipe', emoji: '🌮',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-green-900 to-yellow-800',
  },
  {
    name: 'Thai', count: '2 recipes', emoji: '🍜',
    image: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-yellow-900 to-orange-800',
  },
  {
    name: 'Japanese', count: '1 recipe', emoji: '🍣',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&h=260&q=80',
    grad: 'from-pink-950 to-red-900',
  },
]

const testimonials = [
  { name: 'Priya Raghavan', city: 'Home cook, Chennai', avatar: '#C04B2E', initials: 'PR', text: "I had leftover chicken, some tomatoes, and garlic — typed them in and got Butter Chicken. Made it that night and my family couldn't believe it. Absolutely brilliant app." },
  { name: 'Marco Kessler',  city: 'Food blogger, Berlin', avatar: '#6B7C5E', initials: 'MK', text: "The ingredient search is genuinely magic. I've reduced my food waste by about 70% since I started using Ingredia. The step timers are a game-changer too." },
  { name: 'Sarah Atkins',   city: 'Recipe enthusiast, London', avatar: '#C9973A', initials: 'SA', text: "Amazing recipe variety from so many countries. The Japanese and Korean sections are incredibly authentic. I've been cooking dishes I never would have attempted before." },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [authModal, setAuthModal] = useState(null) // 'login' | 'signup' | null
  const [trendingRecipes, setTrendingRecipes] = useState([])
  const [recipesLoading, setRecipesLoading] = useState(true)

  useEffect(() => {
    fetchPopularRecipes(6)
      .then(setTrendingRecipes)
      .catch(() => {})
      .finally(() => setRecipesLoading(false))
  }, [])

  const openLogin = () => setAuthModal('login')
  const openSignup = () => setAuthModal('signup')
  const closeModal = () => setAuthModal(null)

  const handleCta = (e) => {
    if (!isAuthenticated) {
      e?.preventDefault()
      openLogin()
    }
  }

  return (
    <div className="bg-cream text-deep overflow-x-hidden">
      <Navbar variant="landing" onLogin={openLogin} onSignup={openSignup} />

      {/* ===== HERO (FOODEAT-style) — clean editorial grid with a single circular hero plate ===== */}
      <section
        id="hero"
        className="relative grid md:grid-cols-[1.05fr_1fr] items-center gap-10 lg:gap-16 px-6 md:px-16 lg:px-24 pt-32 pb-20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F7E8D5 0%, #EFD8B6 55%, #E8C99A 100%)' }}
      >
        {/* Subtle warm glow blobs in the corners — no noisy sparkles */}
        <div className="absolute top-[-200px] right-[-160px] w-[640px] h-[640px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,75,46,0.10) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-180px] left-[-80px] w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(107,124,94,0.08) 0%, transparent 65%)' }} />

        {/* ── Left column: editorial copy ── */}
        <div className="relative z-10 animate-fade-up">
          <h1
            className="font-hero leading-[1.02] text-deep tracking-tight"
            style={{ fontSize: 'clamp(48px, 6.5vw, 88px)' }}
          >
            {t('landing.heroTitleA', 'Delicious Food')}<br />
            {t('landing.heroTitleB', 'Is Waiting')}<br />
            {t('landing.heroTitleC', 'For You')}
          </h1>

          <p className="text-[15px] font-light leading-[1.75] text-deep-2 max-w-[420px] mt-7 mb-9">
            {t('landing.heroSub')}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/home"
              onClick={handleCta}
              className="inline-flex items-center px-7 py-3.5 bg-terra text-white font-bold rounded-full text-[15px] shadow-cta hover:bg-terra-2 hover:-translate-y-0.5 transition-all"
            >
              {isAuthenticated ? t('landing.heroCtaAuth') : t('landing.heroCtaPrimary', 'Browse Recipes')}
            </Link>
            <a
              href="#trending"
              onClick={handleCta}
              className="inline-flex items-center px-7 py-3.5 bg-deep/10 text-deep font-semibold rounded-full text-[15px] hover:bg-deep/15 transition-colors"
            >
              {t('landing.heroCtaSecondary', 'Top Dishes')}
            </a>
          </div>
        </div>

        {/* ── Right column: clean circular hero plate ── */}
        <div className="relative z-10 hidden md:block">
          <div className="relative w-full max-w-[520px] aspect-square mx-auto">
            {/* Soft halo behind the plate */}
            <div className="absolute inset-[-24px] rounded-full bg-white/40 backdrop-blur-sm" />
            {/* Plate */}
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_24px_60px_rgba(60,30,12,0.25)] ring-[10px] ring-white/60">
              <img
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80&auto=format"
                alt="Fresh, colourful bowl"
                className="w-full h-full object-cover animate-float-food"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
              />
              <div
                className="w-full h-full items-center justify-center text-[140px]"
                style={{ display: 'none', background: 'linear-gradient(135deg, #C25A00 0%, #F4A228 100%)' }}
              >
                🍲
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services strip — replaces the old stats row with the FOODEAT-style icon+label row */}
      <section className="bg-cream border-y border-deep/5 px-6 md:px-12">
        <div className="container-x flex flex-wrap items-center justify-around gap-x-8 gap-y-3 py-5 text-[13px] text-deep">
          {[
            { icon: '🔍', key: 'landing.svcSearch' },
            { icon: '🧺', key: 'landing.svcPantry' },
            { icon: '⭐', key: 'landing.svcReviews' },
            { icon: '🔖', key: 'landing.svcSaved' },
            { icon: '🌍', key: 'landing.svcCuisines' },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="text-lg leading-none">{s.icon}</span>
              <span className="font-medium">{t(s.key)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== INGREDIENT SEARCH CTA ===== */}
      <section className="relative bg-deep py-20 px-6 md:px-12 overflow-hidden">
        <div className="absolute top-[-40px] right-[-20px] font-display font-bold text-white/[0.02] select-none pointer-events-none leading-none" style={{ fontSize: 280 }}>
          Search
        </div>
        <div className="relative z-10 max-w-[860px] mx-auto text-center">
          <div className="inline-block px-4 py-1.5 mb-5 rounded-full bg-terra/15 text-terra-3 text-xs font-semibold tracking-widest uppercase">
            {t('landing.searchBadge')}
          </div>
          <h2 className="font-display font-bold text-white leading-[1.15] mb-4" style={{ fontSize: 'clamp(36px, 4vw, 54px)' }}>
            {t('landing.searchTitle')}
          </h2>
          <p className="text-base font-light leading-relaxed text-white/55 mb-12 max-w-xl mx-auto">
            {t('landing.searchSub')}
          </p>
          <Link
            to="/home"
            onClick={handleCta}
            className="inline-flex items-center justify-center gap-2.5 px-9 py-5 bg-terra text-white rounded-xl text-base font-semibold shadow-cta hover:bg-terra-2 hover:-translate-y-0.5 transition-all"
          >
            🔍 {isAuthenticated ? t('landing.searchCtaAuth') : t('landing.searchCta')}
          </Link>
        </div>
      </section>

      {/* ===== TOP LIST (FOODEAT-style mainstay menu) ===== */}
      <section id="trending" className="px-6 md:px-12 py-20" style={{ background: 'linear-gradient(180deg, #F7E8D5 0%, #F2DEC0 100%)' }}>
        <div className="container-x">
          <h2 className="font-display font-bold text-deep leading-tight mb-12" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
            {t('landing.topListLabel', 'Top List')}{' '}
            <span className="text-muted font-light">— {t('landing.topListSub', 'Our mainstay menu')}</span>
          </h2>

          {recipesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-cream rounded-3xl overflow-hidden shadow-card animate-pulse">
                  <div className="w-full h-56 bg-cream-3" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-cream-3 rounded w-3/4" />
                    <div className="h-3 bg-cream-3 rounded w-1/2" />
                    <div className="h-3 bg-cream-3 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingRecipes.slice(0, 3).map((recipe) => (
                <TopListCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          <div className="mt-14 text-center">
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-terra text-white font-bold rounded-full text-[15px] shadow-cta hover:bg-terra-2 hover:-translate-y-0.5 transition-all"
            >
              {t('landing.browseRecipes')} →
            </Link>
            {!isAuthenticated && (
              <p className="text-muted text-xs mt-4">
                Free to browse — <button onClick={openSignup} className="text-terra font-semibold hover:underline">create an account</button> to save favourites and leave reviews.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURED DISH (FOODEAT "Best Potatoes" style) ===== */}
      <section className="px-6 md:px-12 py-20" style={{ background: 'linear-gradient(135deg, #F2DEC0 0%, #E8CFA5 100%)' }}>
        <div className="container-x grid md:grid-cols-2 items-center gap-12">
          <div>
            <h2 className="font-display font-bold text-deep leading-[1.05] mb-5" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
              {t('landing.featuredTitleA', "Cook with what's")}<br />
              {t('landing.featuredTitleB', 'in your pantry')}
            </h2>
            <p className="text-[15px] text-deep-2/80 leading-[1.75] mb-7 max-w-[460px]">
              {t('landing.featuredBody')}
            </p>
            <Link
              to="/home"
              onClick={handleCta}
              className="inline-flex items-center gap-2 font-bold text-terra border-b-2 border-terra/40 hover:border-terra pb-1 transition-colors"
            >
              {t('landing.featuredCta', 'Try the pantry search')} →
            </Link>
          </div>
          <div className="relative max-w-[440px] aspect-square mx-auto">
            <div className="absolute inset-[-20px] rounded-full bg-white/30" />
            <div className="relative w-full h-full rounded-full overflow-hidden shadow-[0_20px_50px_rgba(60,30,12,0.22)] ring-[8px] ring-white/50">
              <img
                src="https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=800&q=80&auto=format"
                alt="Featured dish"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
              />
              <div className="w-full h-full items-center justify-center text-[120px]" style={{ display: 'none', background: 'linear-gradient(135deg, #C25A00, #F4A228)' }}>
                🥘
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="bg-cream-2 py-24 px-6 md:px-12">
        <div className="container-x">
          <div className="text-center max-w-[600px] mx-auto">
            <div className="section-label">{t('landing.howItWorksLabel')}</div>
            <h2 className="font-display font-bold leading-[1.15] text-deep mt-2" style={{ fontSize: 'clamp(32px, 3.5vw, 48px)' }}>
              {t('landing.howItWorksTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {features.map((f) => (
              <div key={f.num} className="relative bg-white rounded-2xl p-10 border border-deep/5 shadow-card hover:-translate-y-1.5 hover:shadow-card-hover transition-all overflow-hidden">
                <div className="absolute right-6 top-5 font-display font-bold leading-none select-none text-deep/[0.04]" style={{ fontSize: 64 }}>{f.num}</div>
                <div className="w-14 h-14 rounded-2xl bg-cream-2 flex items-center justify-center text-3xl mb-6">{f.icon}</div>
                <h3 className="font-display text-2xl font-bold text-deep mb-3">{f.title}</h3>
                <p className="text-sm text-muted leading-[1.8] font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CUISINES ===== */}
      <section id="cuisines" className="bg-deep py-20 px-6 md:px-12">
        <div className="container-x">
          <div className="text-center max-w-[600px] mx-auto">
            <div className="text-xs font-semibold tracking-widest uppercase text-terra/70">{t('landing.cuisinesLabel')}</div>
            <h2 className="font-display font-bold leading-[1.15] text-white text-center mt-2" style={{ fontSize: 'clamp(32px, 3.5vw, 48px)' }}>
              {t('landing.cuisinesTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mt-12">
            {cuisines.map((c) => (
              <Link
                key={c.name}
                to={`/home?cuisine=${c.name.toLowerCase()}`}
                onClick={handleCta}
                className="group block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-terra/40 hover:-translate-y-1.5 hover:shadow-[0_8px_32px_rgba(192,75,46,0.25)] transition-all duration-300"
              >
                {/* Image area */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name + ' cuisine'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextSibling.style.display = 'flex'
                    }}
                  />
                  {/* Emoji fallback — hidden unless img fails */}
                  <div
                    className={`hidden absolute inset-0 items-center justify-center text-6xl bg-gradient-to-br ${c.grad}`}
                  >
                    {c.emoji}
                  </div>
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>

                {/* Label */}
                <div className="px-4 py-3 text-center">
                  <div className="text-[13px] font-semibold text-white/85">{c.name}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{c.count}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="bg-cream py-24 px-6 md:px-12">
        <div className="container-x">
          <div className="text-center max-w-[600px] mx-auto">
            <div className="section-label">{t('landing.testimonialsLabel')}</div>
            <h2 className="font-display font-bold leading-[1.15] text-deep mt-2" style={{ fontSize: 'clamp(32px, 3.5vw, 48px)' }}>
              {t('landing.testimonialsTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mt-14">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-8 border border-cream-3 shadow-card hover:-translate-y-1 transition-transform">
                <div className="text-gold text-base mb-4">★★★★★</div>
                <p className="text-sm italic leading-[1.85] text-muted mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: t.avatar }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-deep">{t.name}</div>
                    <div className="text-xs text-muted">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER CTA ===== */}
      <section className="relative bg-terra py-24 px-6 md:px-12 overflow-hidden text-center">
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(-45deg, transparent 0, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 40px)' }} />
        <div className="container-x relative z-10">
          <h2 className="font-display font-bold text-white leading-[1.1] mb-4" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-white/70 text-[17px] font-light mb-10">{t('landing.ctaSub')}</p>
          <Link
            to="/home"
            onClick={handleCta}
            className="inline-flex items-center gap-2 bg-white text-terra font-bold text-base px-9 py-4 rounded-full hover:bg-cream hover:-translate-y-0.5 transition-all"
          >
            {isAuthenticated ? t('landing.ctaBtnAuth') : t('landing.ctaBtn')} →
          </Link>
        </div>
      </section>

      {authModal === 'login' && (
        <LoginModal onClose={closeModal} onSwitchToSignup={() => setAuthModal('signup')} />
      )}
      {authModal === 'signup' && (
        <SignupModal onClose={closeModal} onSwitchToLogin={() => setAuthModal('login')} />
      )}

      {/* ===== FOOTER ===== */}
      <footer className="bg-deep-2 px-6 md:px-12 py-16">
        <div className="container-x">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="font-display text-[36px] font-bold text-white mb-3">Ingredia</div>
              <p className="text-[13px] leading-[1.8] text-white/45 max-w-[260px]">
                {t('landing.footerTagline')}
              </p>
            </div>
            <FooterCol title={t('landing.footerExplore')} links={[
              t('landing.footerAllRecipes'),
              t('landing.footerCuisines'),
              t('landing.footerVegetarian'),
              t('landing.footerQuickMeals'),
            ]} />
            <FooterCol title={t('landing.footerAccount')} links={[
              { label: t('landing.footerSignUp'), onClick: isAuthenticated ? null : openSignup, to: isAuthenticated ? null : null },
              { label: t('landing.footerLogIn'), onClick: isAuthenticated ? null : openLogin, to: isAuthenticated ? null : null },
              { label: t('nav.myKitchen'), to: isAuthenticated ? '/home' : null, onClick: isAuthenticated ? null : openLogin },
            ]} />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-7 border-t border-white/5 gap-3">
            <div className="text-xs text-white/30">{t('landing.footerRights', { year: new Date().getFullYear() })}</div>
            <div className="text-xs text-white/30">{t('landing.footerMadeWith')}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-xs font-bold tracking-widest uppercase text-white/50 mb-5">{title}</div>
      <ul className="space-y-3 list-none">
        {links.map((l) => {
          const label = typeof l === 'string' ? l : l.label
          const to = typeof l === 'string' ? null : l.to
          const onClick = typeof l === 'string' ? null : l.onClick
          return (
            <li key={label}>
              {to ? (
                <Link to={to} className="text-[13px] text-white/55 hover:text-terra-3 transition-colors">{label}</Link>
              ) : onClick ? (
                <button onClick={onClick} className="text-[13px] text-white/55 hover:text-terra-3 transition-colors">{label}</button>
              ) : (
                <a href="#" className="text-[13px] text-white/55 hover:text-terra-3 transition-colors">{label}</a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// FOODEAT-style "Top List" card: rounded image at top, then a row with the dish name
// and a bold terracotta rating number, a short description, and a stars + meta footer.
function TopListCard({ recipe }) {
  const desc = recipe.cuisine
    ? `${recipe.cuisine} · ${recipe.difficulty || 'Medium'}`
    : (recipe.difficulty || 'Medium')

  const ratingNumber = recipe.rating > 0
    ? Number(recipe.rating).toFixed(1)
    : '★'
  const stars = Math.max(0, Math.min(3, Math.round((recipe.rating || 0) / 5 * 3))) || 3

  const titleT = useTranslatedText(recipe.title)
  const descT  = useTranslatedText(desc)

  return (
    <Link
      to={recipe.slug ? `/home?recipe=${encodeURIComponent(recipe.slug)}` : '/home'}
      className="group block bg-cream rounded-3xl overflow-hidden shadow-card hover:-translate-y-1.5 hover:shadow-card-hover transition-all"
    >
      <div className="p-3">
        <div className="relative w-full aspect-[5/3] overflow-hidden rounded-2xl bg-cream-3">
          {recipe.image ? (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex' }}
            />
          ) : null}
          <div
            className="w-full h-full items-center justify-center text-5xl"
            style={{ display: recipe.image ? 'none' : 'flex', background: 'linear-gradient(135deg, #C27A50 0%, #E8B88A 100%)' }}
          >
            🍽
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-display text-[20px] font-bold text-deep leading-tight capitalize line-clamp-2 flex-1" style={{ minHeight: '2.6rem' }}>
            {titleT}
          </h3>
          <span className="font-display text-[28px] font-extrabold text-terra leading-none">
            {ratingNumber}
          </span>
        </div>

        <p className="text-[13px] text-muted capitalize mb-3 line-clamp-1">{descT}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-0.5 text-gold text-base">
            {'★'.repeat(stars)}<span className="text-cream-3">{'★'.repeat(3 - stars)}</span>
          </div>
          <span className="font-display text-[17px] font-bold text-deep">{recipe.cookTime}</span>
        </div>
      </div>
    </Link>
  )
}

