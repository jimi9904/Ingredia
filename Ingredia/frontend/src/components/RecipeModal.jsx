import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { saveRecipe, unsaveRecipe } from '../api/savedApi'
import { getReviews, submitReview, deleteReview } from '../api/reviewApi'
import { fetchSimilarRecipes, fetchRecipeBySlug } from '../api/recipeApi'
import { useTranslation } from 'react-i18next'
import { parseIngredient } from '../utils/parseIngredient'
import { classifyDiet } from '../utils/dietType'
import { useTranslatedText, useTranslatedList } from '../hooks/useTranslatedText'
import { getFoodEmoji, getFoodGradient } from '../utils/foodVisuals'

// Per-diet visual theme for the top band, accent text, and nutrition pills.
const DIET_THEME = {
  veg: {
    band: '#B6D58A',
    accent: '#365E1F',
    pillOuter: '#A8C97A',
    pillInner: '#7FB05A',
    pillText: '#FFFFFF',
    ring: 'rgba(255,255,255,0.45)',
  },
  egg: {
    band: '#F0CC85',
    accent: '#7A4F12',
    pillOuter: '#E5BE74',
    pillInner: '#D9A044',
    pillText: '#FFFFFF',
    ring: 'rgba(255,255,255,0.45)',
  },
  nonveg: {
    band: '#E5A7A0',
    accent: '#7A1F18',
    pillOuter: '#D87970',
    pillInner: '#C44A3F',
    pillText: '#FFFFFF',
    ring: 'rgba(255,255,255,0.45)',
  },
}

const DIET_LABEL_KEY = { veg: 'recipe.veg', egg: 'recipe.egg', nonveg: 'recipe.nonveg' }

function renderStars(n) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < n ? 'text-gold' : 'text-cream-3'}>★</span>
  ))
}

export default function RecipeModal({ recipe: initialRecipe, onClose, onRecipeChange }) {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const requireLogin = (action) => {
    toast(`Sign in to ${action}.`)
    navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`)
  }
  // Local state lets the modal swap to a clicked similar recipe without unmounting.
  // It re-syncs when the parent opens a new recipe (initialRecipe prop changes).
  const [recipe, setRecipe] = useState(initialRecipe)
  const [tab, setTab] = useState('details')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [heroImgError, setHeroImgError] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    setRecipe(initialRecipe)
  }, [initialRecipe])

  useEffect(() => {
    setHeroImgError(false)
  }, [recipe?.image])

  useEffect(() => {
    if (!recipe) return
    setTab('details')
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [recipe?.id, onClose])

  // Similar recipes — fetched whenever the displayed recipe changes.
  const similarQuery = useQuery({
    queryKey: ['similar', recipe?.slug],
    queryFn: () => fetchSimilarRecipes(recipe.slug),
    enabled: !!recipe?.slug,
    staleTime: 5 * 60_000,
  })

  const handleSwapToRecipe = async (target) => {
    if (!target?.slug || target.slug === recipe?.slug) return
    setSwapping(true)
    try {
      const full = await fetchRecipeBySlug(target.slug)
      if (full) {
        // Apply diet classification so the theme + badge update correctly.
        const enriched = { ...full, type: classifyDiet(full) }
        setRecipe(enriched)
        onRecipeChange?.(enriched)
        setTab('details')
        if (scrollRef.current) {
          try {
            if (typeof scrollRef.current.scrollTo === 'function') {
              scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
              scrollRef.current.scrollTop = 0
            }
          } catch {
            scrollRef.current.scrollTop = 0
          }
        }
      }
    } catch (err) {
      console.error('Failed to swap recipe:', err)
      toast('Could not load recipe details.')
    } finally {
      setSwapping(false)
    }
  }

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', recipe?.id],
    queryFn: () => getReviews(recipe.id),
    enabled: !!recipe?.id && tab === 'reviews',
  })

  const saveMut = useMutation({
    mutationFn: () => isSaved ? unsaveRecipe(recipe.id) : saveRecipe(recipe.id),
    onSuccess: () => {
      setIsSaved((v) => !v)
      qc.invalidateQueries({ queryKey: ['saved'] })
      toast(isSaved ? 'Removed from saved.' : 'Recipe saved!')
    },
    onError: () => toast('Could not save recipe.'),
  })

  const reviewMut = useMutation({
    mutationFn: (vars) => submitReview(recipe.id, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', recipe?.id] })
      toast('Review submitted!')
      setRating(0)
      setComment('')
      setPhoto(null)
    },
    onError: (e) => {
      const msg = e?.response?.data?.message || e?.message || 'Could not submit review.'
      toast(msg)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteReview,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews', recipe?.id] }); toast('Review deleted.') },
  })

  // Hooks must run unconditionally on every render — compute these BEFORE the null-recipe
  // early return below, using safe defaults so an empty modal doesn't crash.
  const parsedIngredients = (recipe?.ingredients || [])
    .map(parseIngredient)
    .filter((i) => i.name)
  const titleT       = useTranslatedText(recipe?.title || '')
  const descriptionT = useTranslatedText(recipe?.description || '')
  const ingredientNamesT = useTranslatedList(parsedIngredients.map((i) => i.name))
  const ingredientAmountsT = useTranslatedList(parsedIngredients.map((i) => i.amount))
  const instructionsT = useTranslatedList(
    (recipe?.instructions || []).map((s) => (typeof s === 'string' ? s : (s?.text || s?.description || s?.step || '')))
  )

  if (!recipe) return null

  const diet = recipe.type === 'veg' || recipe.type === 'egg' || recipe.type === 'nonveg' ? recipe.type : 'veg'
  const theme = DIET_THEME[diet]
  const nutrition = recipe.nutrition || {}

  const hasNutrition = (nutrition.calories || 0) +
                       (nutrition.protein || 0) +
                       (nutrition.carbohydrates || nutrition.carbs || 0) +
                       (nutrition.total_fat || nutrition.fat || 0) > 0

  const nutCells = hasNutrition ? [
    { value: Math.round(nutrition.calories || 0), label: t('recipe.calories'), unit: 'kcal' },
    { value: Math.round(nutrition.protein || 0), label: t('recipe.protein'), unit: 'g' },
    { value: Math.round(nutrition.carbohydrates || nutrition.carbs || 0), label: t('recipe.carbs'), unit: 'g' },
    { value: Math.round(nutrition.total_fat || nutrition.fat || 0), label: t('recipe.fat'), unit: 'g' },
  ] : []

  const TABS = [
    { key: 'details', label: t('recipe.details') },
    { key: 'reviews', label: reviews.length > 0 ? `${t('recipe.reviews')} (${reviews.length})` : t('recipe.reviews') },
  ]

  return (
    <div
      ref={scrollRef}
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-start justify-center p-4 sm:p-6 bg-deep/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 max-w-[1080px] w-full my-4 relative"
        style={{ opacity: swapping ? 0.7 : 1, transition: 'opacity 0.15s' }}
      >
      {/* ── Left column: the recipe itself ── */}
      <div
        className="rounded-[28px] overflow-hidden shadow-soft relative"
        style={{ background: theme.band }}
      >
        {/* Close — top right, sits over the colored band */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 backdrop-blur hover:bg-white hover:scale-105 transition-all flex items-center justify-center text-lg shadow-md"
          aria-label="Close"
        >
          ✕
        </button>

        {/* ── Top colored band with circular hero image ── */}
        <div className="relative pt-9 pb-16 flex justify-center">
          <div
            className="relative w-[180px] h-[180px] rounded-full overflow-hidden bg-white shadow-2xl flex items-center justify-center"
            style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.22)', outline: `8px solid ${theme.ring}`, outlineOffset: '-4px' }}
          >
            {recipe.image && !heroImgError ? (
              <img
                src={recipe.image}
                alt={recipe.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={() => setHeroImgError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-6xl"
                style={{ background: getFoodGradient(recipe.title, recipe.cuisine) }}
              >
                <span style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>
                  {getFoodEmoji(recipe.title, recipe.cuisine)}
                </span>
              </div>
            )}
          </div>

          {/* Save button — overlaps the band/body seam like the "Add to cart" in the reference */}
          <button
            onClick={() => isAuthenticated ? saveMut.mutate() : requireLogin('save recipes')}
            disabled={saveMut.isPending}
            className="absolute left-1/2 -translate-x-1/2 -bottom-6 z-10 inline-flex items-center gap-2 pl-2 pr-5 py-2 rounded-full bg-white shadow-lg hover:scale-105 transition-transform text-sm font-bold disabled:opacity-60"
            style={{ color: theme.accent }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-base text-white"
              style={{ background: theme.pillInner }}
            >
              {isSaved ? '❤️' : '🤍'}
            </span>
            {isSaved ? 'Saved' : 'Save Recipe'}
          </button>
        </div>

        {/* ── Body sheet — cream, overlaps the band ── */}
        <div className="bg-cream rounded-t-[28px] px-7 pt-10 pb-8 -mt-2">
          {/* Rating · time · servings meta row */}
          <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-[13px] text-deep-2 mb-3">
            {recipe.rating > 0 && (
              <>
                <span className="text-gold">★</span>
                <span className="font-bold">{Number(recipe.rating).toFixed(1)}</span>
                <span className="text-muted">·</span>
              </>
            )}
            <span className="text-muted">⏱ {recipe.cookTime}</span>
            <span className="text-muted">·</span>
            <span className="text-muted">👥 {recipe.servings} {t('recipe.servings')}</span>
            {recipe.difficulty && (
              <>
                <span className="text-muted">·</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: `${theme.pillOuter}55`, color: theme.accent }}
                >
                  {t(`recipe.${String(recipe.difficulty).toLowerCase()}`, recipe.difficulty)}
                </span>
              </>
            )}
          </div>

          {/* Diet pill + title */}
          <div className="flex flex-col items-center gap-2.5 mb-2 text-center">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[12px] font-bold ring-2"
              style={{ color: theme.accent, '--tw-ring-color': theme.pillInner }}
            >
              <span className={`diet-mark diet-mark--${diet}`} aria-hidden="true" />
              {t(DIET_LABEL_KEY[diet])}
            </span>
            <h2
              className="font-display font-extrabold text-deep capitalize leading-[1.1] text-center"
              style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}
            >
              {titleT}
            </h2>
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-[13px] text-muted leading-relaxed text-center mb-6 max-w-[460px] mx-auto">
              {descriptionT}
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-cream-3 mb-6 justify-center">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className="px-4 py-2 text-sm font-semibold transition-colors -mb-px"
                style={{
                  color: tab === tb.key ? theme.accent : undefined,
                  borderBottom: tab === tb.key ? `2px solid ${theme.accent}` : '2px solid transparent',
                }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {tab === 'details' && (
            <div>
              {/* Nutrition Quantity */}
              {nutCells.length > 0 && (
                <>
                  <h3 className="font-display text-lg font-bold mb-4" style={{ color: theme.accent }}>
                    {t('recipe.nutritionQuantity', 'Nutrition Quantity')}
                  </h3>
                  <div className="grid grid-cols-4 gap-3 mb-8">
                    {nutCells.map((cell) => (
                      <NutritionPill key={cell.label} {...cell} theme={theme} />
                    ))}
                  </div>
                </>
              )}

              {/* Main Ingredients — two-column list (name | amount) */}
              {parsedIngredients.length > 0 && (
                <>
                  <h3 className="font-display text-lg font-bold mb-3" style={{ color: theme.accent }}>
                    {t('recipe.mainIngredients', 'Main Ingredients')}
                  </h3>
                  <ul className="list-none space-y-2 mb-8">
                    {parsedIngredients.map((ing, i) => {
                      const isMatched = recipe.matchedIngredients?.some(
                        (m) => String(m).toLowerCase() === ing.name.toLowerCase()
                      )
                      // Use the translated arrays; fall back to original if not yet ready.
                      const nameOut   = ingredientNamesT[i] ?? ing.name
                      const amountOut = ingredientAmountsT[i] ?? ing.amount
                      return (
                        <li key={i} className="flex items-baseline justify-between gap-4 text-[14px] border-b border-cream-3/60 pb-2 last:border-b-0">
                          <span className={`capitalize ${isMatched ? 'font-bold' : 'font-semibold'} text-deep`}>
                            {isMatched && <span style={{ color: theme.pillInner }}>✓ </span>}
                            {nameOut}
                          </span>
                          {amountOut && (
                            <span className="text-muted text-[13px] flex-shrink-0">{amountOut}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {/* Instructions */}
              {recipe.instructions?.length > 0 && (
                <>
                  <h3 className="font-display text-lg font-bold mb-4" style={{ color: theme.accent }}>
                    {t('recipe.instructions')}
                  </h3>
                  <ol className="list-none flex flex-col gap-4">
                    {recipe.instructions.map((step, i) => {
                      const original = typeof step === 'string' ? step : (step?.text || step?.description || step?.step || '')
                      const stepText = instructionsT[i] ?? original
                      return (
                        <li key={i} className="flex gap-3.5">
                          <span
                            className="flex-shrink-0 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                            style={{ background: theme.pillInner }}
                          >{i + 1}</span>
                          <p className="text-sm leading-[1.8] text-deep-2">{stepText}</p>
                        </li>
                      )
                    })}
                  </ol>
                </>
              )}

              {!recipe.instructions?.length && (
                <div className="bg-cream-2 rounded-xl p-5 text-center text-sm text-muted">
                  {t('recipe.noInstructions')}
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div>
              {/* Submit review form */}
              {isAuthenticated ? (
                <div className="bg-white rounded-2xl border border-cream-3 p-5 mb-6">
                  <h4 className="font-display text-base font-bold text-deep mb-3">{t('recipe.leaveReview')}</h4>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        className="text-2xl transition-transform hover:scale-110"
                      >
                        <span className={n <= (hoverRating || rating) ? 'text-gold' : 'text-cream-3'}>★</span>
                      </button>
                    ))}
                    {rating > 0 && <span className="ml-2 text-sm text-muted self-center">{rating}/5</span>}
                  </div>
                  <textarea
                    className="input-cream resize-none mb-3"
                    rows={3}
                    placeholder={t('recipe.reviewPlaceholder')}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files[0])}
                    className="block w-full text-sm text-muted mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-terra/10 file:text-terra hover:file:bg-terra/20"
                  />
                  <button
                    onClick={() => reviewMut.mutate({ rating, comment, photo })}
                    disabled={!rating || reviewMut.isPending}
                    className="btn-primary disabled:opacity-50"
                  >
                    {reviewMut.isPending ? t('recipe.submitting') : t('recipe.submitReview')}
                  </button>
                </div>
              ) : (
                <div className="bg-cream-2 rounded-xl p-4 text-center text-sm text-muted mb-6">
                  <Link to="/login" className="text-terra font-semibold hover:underline">{t('recipe.loginToReview')}</Link>{t('recipe.loginToReviewSuffix')}
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="py-10 text-center text-muted">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm">{t('recipe.noReviews')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id || rev._id} className="bg-white rounded-xl border border-cream-3 p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center">
                            {(rev.user?.name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-deep">{rev.user?.name || t('recipe.anonymous')}</p>
                            <div className="flex text-sm">{renderStars(rev.rating)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ''}
                          </span>
                          {(user?.id === (rev.user?.id || rev.user_id)) && (
                            <button
                              onClick={() => deleteMut.mutate(rev.id || rev._id)}
                              className="text-xs text-muted hover:text-red-500 transition-colors"
                            >
                              {t('recipe.deleteReview')}
                            </button>
                          )}
                        </div>
                      </div>
                      {rev.comment && <p className="text-sm text-muted leading-relaxed">{rev.comment}</p>}
                      {rev.photo_url && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-cream-3" style={{ maxHeight: '200px' }}>
                          <img src={rev.photo_url} alt="Review photo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column: similar recipes (Netflix-style "More like this") ── */}
      <aside className="rounded-[28px] bg-cream shadow-soft px-5 py-5 self-start lg:sticky lg:top-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <h3 className="font-display text-base font-bold mb-1" style={{ color: theme.accent }}>
          {t('recipe.moreLikeThis', 'More like this')}
        </h3>
        <p className="text-[11px] text-muted mb-4">
          {t('recipe.similarHelp', 'Similar dishes you might enjoy')}
        </p>

        {similarQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-cream-3 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-cream-3 rounded w-3/4" />
                  <div className="h-2 bg-cream-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!similarQuery.isLoading && (similarQuery.data?.length ?? 0) === 0 && (
          <p className="text-xs text-muted py-4">{t('recipe.noSimilar', 'No similar recipes found.')}</p>
        )}

        <ul className="list-none space-y-2.5">
          {(similarQuery.data ?? []).map((sim) => (
            <SimilarRow key={sim.id} recipe={sim} theme={theme} onClick={() => handleSwapToRecipe(sim)} />
          ))}
        </ul>
      </aside>
      </div>
    </div>
  )
}

function SimilarRow({ recipe, theme, onClick }) {
  const [imgFailed, setImgFailed] = useState(false)
  const diet = classifyDiet(recipe)
  const dietColor = { veg: '#00A83F', egg: '#F59E0B', nonveg: '#E60023' }[diet]
  const titleT = useTranslatedText(recipe.title)

  useEffect(() => {
    setImgFailed(false)
  }, [recipe.image])

  const cookTimeDisplay = recipe.cookTime || (recipe.cook_time ? `${recipe.cook_time} min` : '—')

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex gap-3 items-stretch text-left rounded-2xl p-2 transition-all hover:bg-cream-2 group cursor-pointer"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-cream-3 relative flex items-center justify-center">
          {recipe.image && !imgFailed ? (
            <img
              src={recipe.image}
              alt={recipe.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl"
              style={{ background: getFoodGradient(recipe.title, recipe.cuisine) }}
            >
              <span style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>
                {getFoodEmoji(recipe.title, recipe.cuisine)}
              </span>
            </div>
          )}
          <span
            className="absolute bottom-1 left-1 w-3 h-3 rounded-sm border-2 bg-white shadow-sm pointer-events-none"
            style={{ borderColor: dietColor }}
            aria-label={diet}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[13px] font-semibold text-deep leading-tight line-clamp-2 capitalize group-hover:text-deep" style={{ color: 'inherit' }}>
            {titleT}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
            {recipe.rating > 0 && (
              <>
                <span className="text-gold">★</span>
                <span>{Number(recipe.rating).toFixed(1)}</span>
                <span>·</span>
              </>
            )}
            <span>{cookTimeDisplay}</span>
          </div>
        </div>
        <span
          className="self-center text-base opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: theme?.accent || '#365E1F' }}
        >→</span>
      </button>
    </li>
  )
}

// Capsule nutrition pill — number sits in a darker inner pill, label below in a paler outer oval.
function NutritionPill({ value, label, unit, theme }) {
  return (
    <div
      className="rounded-[28px] flex flex-col items-center justify-start pt-2.5 pb-3 px-2"
      style={{ background: `${theme.pillOuter}55` }}
    >
      <div
        className="w-full rounded-full flex flex-col items-center justify-center py-2 mb-1.5"
        style={{ background: theme.pillOuter }}
      >
        <span className="font-display font-extrabold text-deep leading-none" style={{ fontSize: 22 }}>{value}</span>
      </div>
      <div className="font-display font-bold text-deep leading-none text-[13px]">{label}</div>
      <div className="text-[10px] text-muted font-semibold mt-0.5">{unit}</div>
    </div>
  )
}
