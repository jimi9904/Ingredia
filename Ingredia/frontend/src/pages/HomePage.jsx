import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import IngredientPicker from '../components/IngredientPicker'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import { fetchRecipes, fetchPopularRecipes, searchRecipes, fetchRecipeBySlug } from '../api/recipeApi'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { useTranslation } from 'react-i18next'
import { classifyDiet } from '../utils/dietType'

const TABS = [
  { value: 'all',    key: 'home.all' },
  { value: 'veg',    key: 'home.vegetarian' },
  { value: 'nonveg', key: 'home.nonVeg' },
]

const CATEGORIES = [
  { value: '',          key: 'home.allCategories' },
  { value: 'Breakfast', key: 'home.breakfast' },
  { value: 'Lunch',     key: 'home.lunch' },
  { value: 'Dinner',    key: 'home.dinner' },
  { value: 'Snacks',    key: 'home.snacks' },
  { value: 'Dessert',   key: 'home.desserts' },
]

const inferType = (recipe) => classifyDiet(recipe)

function mapCategory(recipe) {
  const title = (recipe.title || '').toLowerCase()
  const tagsArr = Array.isArray(recipe.tags) ? recipe.tags : []
  const tags   = tagsArr.map(t => (t || '').toLowerCase()).join(' ')
  const ings   = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).join(' ').toLowerCase()

  // ── Dessert ────────────────────────────────────────────────────────────
  const dessertWords = [
    'cake','cookie','brownie','pie','tart','pudding','custard','fudge',
    'trifle','tiramisu','baklava','halwa','kheer','donut','doughnut',
    'macaron','sorbet','meringue','praline','truffle','parfait',
    'panna cotta','cobbler','crumble','strudel','shortbread','cannoli',
    'churro','bread pudding','rice pudding','caramel','cheesecake',
    'mousse','gelato','ice cream','lemon curd','flapjack','nougat',
    'biscuit','millionaire','banoffee','sticky toffee','black forest',
    'carrot cake','red velvet','pavlova','clafoutis','profiterole',
    'danish','pastry','eclair','compote','jam tart','chocolate cake',
    'sponge','traybake','sweet bread','jalebi','gulab jamun','rasgulla',
    'barfi','ladoo','mithai','mochi','wagashi','crepe suzette',
    'bombe','semifreddo','granita','affogato','sundae',
  ]
  if (dessertWords.some(w => title.includes(w))) return 'Dessert'
  if (tags.includes('dessert') || tags.includes('sweet') || tags.includes('baking') || tags.includes('pastry')) return 'Dessert'
  // Title starts with "chocolate " — nearly always a dessert
  if (title.startsWith('chocolate ') || title.endsWith(' cake') || title.endsWith(' tart') || title.endsWith(' pie')) return 'Dessert'

  // ── Breakfast ──────────────────────────────────────────────────────────
  const breakfastWords = [
    'pancake','waffle','french toast','porridge','oatmeal','granola',
    'muesli','bagel','scrambled egg','benedict','omelette','omelet',
    'frittata','shakshuka','crumpet','crepe','blintz','congee',
    'kedgeree','full english','brunch','smoothie bowl','açai bowl',
    'egg muffin','breakfast burrito','breakfast sandwich','breakfast casserole',
    'hash brown','hash browns','morning','cereal','yoghurt parfait',
    'overnight oat','bircher','poha','upma','idli','dosa','uttapam',
    'appam','paratha','aloo paratha','puri aloo','sabudana','dhokla',
    'rava','semolina porridge','french omelette','spanish omelette',
  ]
  if (breakfastWords.some(w => title.includes(w))) return 'Breakfast'
  if (tags.includes('breakfast') || tags.includes('brunch')) return 'Breakfast'

  // ── Snacks / Starters ──────────────────────────────────────────────────
  const snackWords = [
    'samosa','fritter','spring roll','gyoza','dim sum','nacho','chip',
    'hummus','guacamole','salsa','bruschetta','crostini','pakora',
    'bhaji','onion ring','chicken wing','buffalo wing','nugget','popcorn',
    'pretzel','kebab','satay','tapa','mezze','deviled egg','canapé',
    'baba ganoush','dolma','arancini','falafel','puff pastry','bite',
    'slider','mini burger','pinwheel','roll-up','poppadom','papad',
    'chaat','bhel','sev puri','pani puri','golgappa','aloo tikki',
    'dipping sauce','tzatziki','aioli','pesto','bruschetta','toast er',
    'croquette','vol-au-vent','empanada','pierogi','wonton','soup dumpling',
    'chicken tikka','seekh kebab','sheekh','kabab','starter',
    'garlic bread','garlic toast','cheese toast','french dip',
  ]
  if (snackWords.some(w => title.includes(w))) return 'Snacks'
  if (tags.includes('starter') || tags.includes('appetizer') || tags.includes('snack') ||
      tags.includes('side') || tags.includes('finger food') || tags.includes('canape')) return 'Snacks'

  // ── Lunch ─────────────────────────────────────────────────────────────
  const lunchWords = [
    'salad','sandwich','wrap','panini','sub ','club sandwich','blt',
    'soup','chowder','bisque','gazpacho','minestrone','tomato soup',
    'quiche','noodle soup','ramen','pho','udon','soba','laksa',
    'pasta salad','grain bowl','poke bowl','buddha bowl','nicoise',
    'caesar','coleslaw','waldorf','caprese','pasta','spaghetti',
    'penne','linguine','fettuccine','tagliatelle','rigatoni','fusilli',
    'pizza','flatbread pizza','risotto','noodle','lo mein','pad thai',
    'fried rice','pilaf','pilau','tabbouleh','fattoush','greek salad',
    'couscous salad','lentil soup','vegetable soup','chicken soup',
    'fish soup','french onion soup','miso soup','tom yum','tom kha',
  ]
  if (lunchWords.some(w => title.includes(w))) return 'Lunch'

  // Egg-centric lighter dishes (not omelette, already caught above) → Lunch
  if (title.includes('egg') && (ings.includes('bread') || ings.includes('tomato') || ings.includes('cheese'))) return 'Lunch'

  // ── Dinner (default for all hearty mains) ─────────────────────────────
  return 'Dinner'
}

function enrich(r) {
  return { ...r, type: inferType(r), category: mapCategory(r) }
}

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [ingredients, setIngredients] = useState(() => {
    const p = searchParams.get('pantry')
    return p ? p.split(',').map(decodeURIComponent).map(s => s.trim()).filter(Boolean) : []
  })
  const [searchTrigger, setSearchTrigger] = useState(() => (searchParams.get('pantry') ? 1 : 0))
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [page, setPage] = useState(1)
  const [clientPage, setClientPage] = useState(1)
  const [tab, setTab] = useState('all')
  const [category, setCategory] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const [nameSearchDebounced, setNameSearchDebounced] = useState('')
  const resultsRef = useRef(null)

  // Reset client page whenever a filter changes
  useEffect(() => { setClientPage(1) }, [tab, category, nameSearchDebounced, ingredients, cuisine])

  // Sync URL cuisine filter — stored as its own state, not mixed into meal-type category
  useEffect(() => {
    const c = searchParams.get('cuisine')
    if (c) setCuisine(c.toLowerCase())
  }, [])

  // When arriving from Pantry page with ingredients pre-filled, scroll straight to results
  useEffect(() => {
    if (searchParams.get('pantry')) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Open a specific recipe modal when arriving with ?recipe=<slug> (e.g. from Landing trending cards)
  useEffect(() => {
    const slug = searchParams.get('recipe')
    if (!slug) return
    let cancelled = false
    fetchRecipeBySlug(slug)
      .then((r) => { if (!cancelled && r) setSelectedRecipe(enrich(r)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce name search
  useEffect(() => {
    const t = setTimeout(() => { setNameSearchDebounced(nameSearch); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [nameSearch])

  const ingredientSearchActive = ingredients.length > 0 && searchTrigger > 0
  const searchActive = ingredientSearchActive || cuisine !== '' || nameSearchDebounced !== ''

  const popularQuery = useQuery({
    queryKey: ['popular'],
    queryFn: () => fetchPopularRecipes(8),
    staleTime: 5 * 60_000,
    select: (items) => items.map(enrich),
  })

  const recommendQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data } = await api.get('/recommendations')
      const items = data.data || []
      return items.map((r) => {
        const fmt = {
          ...r,
          id: String(r.id || r._id || r.slug),
          image: r.image_url || null,
          cookTime: r.cook_time ? `${r.cook_time} min` : '—',
          rating: Number(r.avg_rating || 0),
          reviewCount: r.rating_count || 0,
          cuisine: r.cuisine ? r.cuisine.charAt(0).toUpperCase() + r.cuisine.slice(1) : 'International',
          difficulty: r.difficulty ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1) : 'Medium',
          ingredients: Array.isArray(r.ingredients)
            ? r.ingredients.map((i) => (typeof i === 'string' ? i : i?.name || ''))
            : [],
        }
        return enrich(fmt)
      })
    },
    staleTime: 10 * 60_000,
    // Recommendations endpoint requires auth — skip for guests
    enabled: !!user && !searchActive,
  })

  // When a client-side filter (tab or category) is active, fetch a big batch so we
  // can show all matches without forcing the user to page through sparse results.
  const filterActive = tab !== 'all' || category !== ''
  const CLIENT_PER_PAGE = 48

  const listQuery = useQuery({
    queryKey: searchActive
      ? ['search', ingredients.join(','), cuisine, nameSearchDebounced, page]
      : filterActive
        ? ['recipes-filtered', tab, category]   // one big fetch per filter combination
        : ['recipes', page],
    queryFn: () =>
      searchActive
        ? searchRecipes({
            ingredients: ingredientSearchActive ? ingredients : [],
            cuisine: cuisine || undefined,
            q: nameSearchDebounced || undefined,
            page,
            perPage: 48,
          })
        : fetchRecipes({ page: filterActive ? 1 : page, perPage: filterActive ? 600 : 48 }),
    placeholderData: keepPreviousData,
    select: (d) => ({ ...d, items: d.items.map(enrich) }),
  })

  const allItems = listQuery.data?.items || []
  const total    = listQuery.data?.total || 0

  // All items after client-side filtering.
  // Eggetarian recipes are bucketed with non-veg for the binary tab filter so they
  // don't disappear from both lists, but render with their own badge below.
  const allFiltered = allItems.filter((r) => {
    if (tab === 'veg' && r.type !== 'veg') return false
    if (tab === 'nonveg' && r.type === 'veg') return false
    if (category && r.category !== category) return false
    return true
  })

  // Client-side pagination over filtered results
  const totalFiltered = allFiltered.length
  const recipes = filterActive || searchActive
    ? allFiltered.slice((clientPage - 1) * CLIENT_PER_PAGE, clientPage * CLIENT_PER_PAGE)
    : allFiltered

  const handleSearch = () => {
    setPage(1)
    setSearchTrigger((n) => n + 1)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }
  const clearSearch = () => {
    setIngredients([])
    setSearchTrigger(0)
    setPage(1)
    setClientPage(1)
    setCuisine('')
    setNameSearch('')
    setNameSearchDebounced('')
    setTab('all')
    setCategory('')
    setSearchParams({})
  }

  const openRecipe = async (r) => {
    setSelectedRecipe(r)
    if (r.slug && (!r.instructions || r.instructions.length === 0)) {
      try {
        const full = await fetchRecipeBySlug(r.slug)
        if (full) setSelectedRecipe(enrich(full))
      } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar variant="home" />

      {/* ===== HERO (FOODEAT-style) ===== */}
      <section
        id="hero"
        className="relative grid md:grid-cols-[1.05fr_1fr] items-center gap-10 lg:gap-16 px-6 md:px-16 lg:px-24 pt-10 pb-16 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F7E8D5 0%, #EFD8B6 55%, #E8C99A 100%)' }}
      >
        {/* Subtle warm glow blobs */}
        <div className="absolute top-[-200px] right-[-160px] w-[640px] h-[640px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,75,46,0.10) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-180px] left-[-80px] w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(107,124,94,0.08) 0%, transparent 65%)' }} />

        {/* ── Left column: editorial copy ── */}
        <div className="relative z-10 animate-fade-up">
          <h1
            className="font-hero leading-[1.02] text-deep tracking-tight"
            style={{ fontSize: 'clamp(44px, 5.5vw, 76px)' }}
          >
            {t('landing.heroTitleA', 'Delicious Food')}<br />
            {t('landing.heroTitleB', 'Is Waiting')}<br />
            {t('landing.heroTitleC', 'For You')}
          </h1>

          <p className="text-[15px] font-light leading-[1.75] text-deep-2 max-w-[420px] mt-6 mb-8">
            {t('landing.heroSub')}
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="#kitchen"
              className="inline-flex items-center px-7 py-3.5 bg-terra text-white font-bold rounded-full text-[15px] shadow-cta hover:bg-terra-2 hover:-translate-y-0.5 transition-all"
            >
              🍳 {t('nav.myKitchen', 'My Kitchen')}
            </a>
            <a
              href="#trending"
              className="inline-flex items-center px-7 py-3.5 bg-deep/10 text-deep font-semibold rounded-full text-[15px] hover:bg-deep/15 transition-colors"
            >
              {t('landing.heroCtaSecondary', 'Top Dishes')}
            </a>
          </div>
        </div>

        {/* ── Right column: clean circular hero plate ── */}
        <div className="relative z-10 hidden md:block">
          <div className="relative w-full max-w-[480px] aspect-square mx-auto">
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

      {/* Services strip */}
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

      {/* Ingredient search bar */}
      <div id="kitchen">
        <IngredientPicker
          ingredients={ingredients}
          onChange={setIngredients}
          onSearch={handleSearch}
        />
      </div>

      {/* Recommendations carousel (auth users, no active search) */}
      {!searchActive && recommendQuery.data?.length > 0 && (
        <section className="bg-cream py-10 px-6 md:px-12">
          <div className="container-x">
            <div className="section-label mb-2">{t('home.forYou')}</div>
            <h3 className="font-display text-2xl font-bold text-deep mb-6">{t('home.recommended')}</h3>
            <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
              {recommendQuery.data.map((r) => (
                <div key={r.id} className="flex-shrink-0 w-[280px]">
                  <RecipeCard recipe={r} onClick={openRecipe} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular carousel */}
      {!searchActive && popularQuery.data?.length > 0 && (
        <section className="bg-cream-2 py-12 px-6 md:px-12">
          <div className="container-x">
            <div className="section-label mb-2">{t('home.trending')}</div>
            <h3 className="font-display text-3xl font-bold text-deep mb-7">{t('home.popular')}</h3>
            <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
              {popularQuery.data.map((r) => (
                <div key={r.id} className="flex-shrink-0 w-[300px]">
                  <RecipeCard recipe={r} onClick={openRecipe} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main recipe grid */}
      <section ref={resultsRef} className="py-20 px-6 md:px-12 scroll-mt-4">
        <div className="container-x">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="section-label mb-2">{searchActive ? t('home.results') : t('home.explore')}</div>
              <h2 className="font-display font-bold text-deep leading-[1.15]" style={{ fontSize: 'clamp(28px, 3.2vw, 44px)' }}>
                {searchActive
                  ? t('home.matchingRecipes', { total: total.toLocaleString(), cuisine: cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) + ' ' : '' })
                  : user
                    ? t('home.greeting', { name: user.name?.split(' ')[0] })
                    : t('home.greetingGuest', 'Discover recipes')}
              </h2>
              {filterActive && (
                <p className="text-sm text-muted mt-1">
                  {listQuery.isLoading ? t('home.loading') : t('home.showingAfterFilter', { count: totalFiltered })}
                </p>
              )}
            </div>
            {searchActive && (
              <button onClick={clearSearch} className="text-[13px] font-semibold text-terra border-b border-terra/30 hover:border-terra pb-0.5">
                {t('home.clearSearch')}
              </button>
            )}
          </div>

          {/* Name search */}
          <div className="relative mb-8">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-base pointer-events-none">🔍</span>
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              className="w-full pl-10 pr-10 py-3 bg-white border border-cream-3 rounded-xl text-sm text-deep placeholder-muted focus:outline-none focus:border-terra/50 transition-colors shadow-sm"
            />
            {nameSearch && (
              <button
                onClick={() => { setNameSearch(''); setNameSearchDebounced('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>

          {/* Veg / Non-Veg tabs */}
          <div className="flex gap-1 bg-cream-2 rounded-full p-1 w-fit mb-9">
            {TABS.map((tb) => (
              <button
                key={tb.value}
                onClick={() => setTab(tb.value)}
                className={`px-5 py-2 rounded-full text-[13px] transition-all ${
                  tab === tb.value ? 'bg-white text-deep font-semibold shadow-card' : 'text-muted hover:text-deep'
                }`}
              >
                {t(tb.key)}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2.5 mb-9">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-4.5 py-2 rounded-full text-[13px] border-[1.5px] transition-all ${
                  category === c.value
                    ? 'bg-terra border-terra text-white shadow-cta'
                    : 'bg-white border-cream-3 text-muted hover:border-terra hover:text-terra'
                }`}
                style={{ paddingLeft: 18, paddingRight: 18 }}
              >
                {t(c.key)}
              </button>
            ))}
          </div>

          {/* Error state */}
          {listQuery.isError && (
            <div className="bg-white rounded-2xl border border-red-100 py-20 text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="font-display text-2xl font-bold text-deep mb-2">{t('home.errorTitle')}</h3>
              <p className="text-sm text-muted mb-6">{t('home.errorSub')}</p>
              <button onClick={() => listQuery.refetch()} className="px-6 py-2.5 bg-terra text-white rounded-lg text-sm font-semibold hover:bg-terra-2 transition-colors">
                {t('home.tryAgain')}
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {listQuery.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-deep/5 shadow-card animate-pulse">
                  <div className="h-[200px] bg-cream-3" />
                  <div className="p-5 space-y-2.5">
                    <div className="h-4 bg-cream-3 rounded w-3/4" />
                    <div className="h-3 bg-cream-3 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!listQuery.isLoading && !listQuery.isError && recipes.length === 0 && (
            <div className="bg-white rounded-2xl border border-cream-3 py-20 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-display text-2xl font-bold text-deep mb-2">{t('home.noRecipes')}</h3>
              <p className="text-sm text-muted">{t('home.noRecipesSub')}</p>
            </div>
          )}

          {/* Recipe grid */}
          {recipes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
              {recipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} onClick={openRecipe} />
              ))}
            </div>
          )}

          {/* Pagination — only shown when there are genuinely more results than fit one page */}
          {(() => {
            // Client-side filtered view
            if (filterActive) {
              const totalPages = Math.ceil(totalFiltered / CLIENT_PER_PAGE)
              if (totalPages <= 1) return null
              return (
                <div className="flex justify-center gap-3 mt-12">
                  <button onClick={() => setClientPage((p) => Math.max(1, p - 1))} disabled={clientPage === 1} className="btn-outline disabled:opacity-40">{t('home.prevPage')}</button>
                  <span className="px-5 py-2.5 text-sm text-muted">{t('home.pageOf', { n: clientPage, total: totalPages })}</span>
                  <button onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))} disabled={clientPage >= totalPages} className="btn-outline disabled:opacity-40">{t('home.nextPage')}</button>
                </div>
              )
            }
            // Search results or plain browse
            if (recipes.length === 0) return null
            const canGoNext = searchActive ? allItems.length >= 48 : allItems.length >= 48
            if (page === 1 && !canGoNext) return null  // single page, no nav needed
            return (
              <div className="flex justify-center gap-3 mt-12">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline disabled:opacity-40">{t('home.prevPage')}</button>
                <span className="px-5 py-2.5 text-sm text-muted">{t('home.page', { n: page })}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={!canGoNext} className="btn-outline disabled:opacity-40">{t('home.nextPage')}</button>
              </div>
            )
          })()}
        </div>
      </section>

      <RecipeModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onRecipeChange={setSelectedRecipe}
      />
    </div>
  )
}
