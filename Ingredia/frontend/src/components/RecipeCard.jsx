import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTranslatedText } from '../hooks/useTranslatedText'
import { getFoodEmoji, getFoodGradient } from '../utils/foodVisuals'

// ── Per-diet color theme. Card outer band tints by veg / egg / nonveg. ──
const DIET_THEME = {
  veg: {
    band: '#B6D58A',        // light green
    bandSoft: '#D8E9BD',    // pale green for the body
    accent: '#365E1F',      // dark green text
    pill: '#7FB05A',        // pill body
    pillRing: '#A8C97A',    // outer faint ring
    pillText: '#1E3A0F',
    label: 'text-emerald-800',
  },
  egg: {
    band: '#F0CC85',
    bandSoft: '#F8E7C2',
    accent: '#7A4F12',
    pill: '#D9A044',
    pillRing: '#E5BE74',
    pillText: '#3A2308',
    label: 'text-amber-800',
  },
  nonveg: {
    band: '#E5A7A0',
    bandSoft: '#F2D2CD',
    accent: '#7A1F18',
    pill: '#C44A3F',
    pillRing: '#D87970',
    pillText: '#3A0E0A',
    label: 'text-red-800',
  },
}

const DIET_LABEL_KEY = { veg: 'recipe.veg', egg: 'recipe.egg', nonveg: 'recipe.nonveg' }

function diffClass(d) {
  const v = String(d || '').toLowerCase()
  if (v === 'easy') return 'badge-diff-easy'
  if (v === 'hard') return 'badge-diff-hard'
  return 'badge-diff-medium'
}

export default function RecipeCard({ recipe, onClick, isFavorite, onToggleFavorite }) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [recipe.image])

  const diet = recipe.type === 'veg' || recipe.type === 'egg' || recipe.type === 'nonveg' ? recipe.type : 'veg'
  const theme = DIET_THEME[diet]
  const description = recipe.description ||
    (recipe.cuisine ? `A delicious ${recipe.cuisine} ${diet === 'nonveg' ? 'non-vegetarian' : diet === 'egg' ? 'eggetarian' : 'vegetarian'} dish.` : '')

  // Auto-translate recipe text when the user has switched to Hindi.
  const title       = useTranslatedText(recipe.title)
  const descriptionT = useTranslatedText(description)
  const cuisineT    = useTranslatedText(recipe.cuisine || '')

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

  return (
    <div
      onClick={() => onClick?.(recipe)}
      className="group rounded-[24px] overflow-hidden cursor-pointer shadow-card hover:-translate-y-1.5 hover:shadow-card-hover transition-all flex flex-col relative border-2"
      style={{ background: '#FAF5E6', borderColor: theme.band }}
    >
      {/* ── Full-bleed cover image ── */}
      <div className="relative w-full h-[200px] overflow-hidden bg-cream-3">
        {recipe.image && !imgError ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
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

        {/* Subtle bottom gradient so the badges stay readable on bright food photos */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-transparent" />

        {/* Diet badge — top-left */}
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[12px] font-bold shadow-md"
          style={{ color: theme.accent }}
        >
          <span className={`diet-mark diet-mark--${diet}`} aria-hidden="true" />
          {t(DIET_LABEL_KEY[diet])}
        </span>

        {/* Favorite — top-right */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe) }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-base shadow-md transition-transform hover:scale-110 ${isFavorite ? 'bg-white' : 'bg-white/90 backdrop-blur'}`}
            title={t(isFavorite ? 'recipe.removeFav' : 'recipe.addFav')}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
        {/* Rating + meta — fixed height keeps the title position uniform across cards.
           overflow:hidden so a long cuisine name like "South Indian Recipes" can't push
           the title down by wrapping to a second line. */}
        <div
          className="flex items-center flex-wrap gap-1.5 text-[12px] text-deep-2 mb-3 overflow-hidden"
          style={{ height: '1.25rem' }}
        >
          {recipe.rating > 0 ? (
            <>
              <span className="text-gold text-sm leading-none">★</span>
              <span className="font-bold">{Number(recipe.rating).toFixed(1)}</span>
              <span className="text-muted">·</span>
            </>
          ) : null}
          <span className="text-muted">{recipe.cookTime}</span>
          {recipe.cuisine && (
            <>
              <span className="text-muted">·</span>
              <span className="text-muted capitalize">{cuisineT}</span>
            </>
          )}
          {recipe.difficulty && (
            <span className={`${diffClass(recipe.difficulty)} ml-auto`}>
              {t(`recipe.${String(recipe.difficulty).toLowerCase()}`, recipe.difficulty)}
            </span>
          )}
        </div>

        {/* Title — locked to exactly 2 lines of space so 1-line and 2-line titles take
           identical vertical room. 20px font × 1.25 line-height × 2 = 50px, rounded up. */}
        <h3
          className="font-display font-bold text-deep leading-tight capitalize line-clamp-2 mb-2 overflow-hidden"
          style={{ fontSize: '20px', height: '3.25rem' }}
        >
          {title}
        </h3>

        {/* Description — locked to exactly 2 lines (12px × 1.625 × 2 ≈ 39px, rounded up). */}
        <p
          className="text-[12px] text-muted leading-relaxed line-clamp-2 mb-4 overflow-hidden"
          style={{ height: '2.6rem' }}
        >
          {descriptionT}
        </p>

        {/* Nutrition Quantity */}
        {nutCells.length > 0 && (
          <>
            <h4 className="text-[12px] font-bold mb-2" style={{ color: theme.accent }}>
              {t('recipe.nutritionQuantity', 'Nutrition Quantity')}
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {nutCells.map((cell) => (
                <NutritionPill key={cell.label} {...cell} theme={theme} />
              ))}
            </div>
          </>
        )}

        {/* Push footer to bottom — full ingredients list lives in the modal */}
        <div className="flex-1" />

        {/* Match score + missing ingredients (when arriving from ingredient search) */}
        {(recipe.matchScore != null || recipe.missingIngredients?.length > 0) && (
          <div className="mt-4 pt-3 border-t border-cream-3 flex items-center justify-between gap-2 text-[11px]">
            {recipe.matchScore != null && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full font-bold text-white"
                style={{ background: theme.pill }}
              >
                {t('recipe.match', { score: recipe.matchScore })}
              </span>
            )}
            {recipe.missingIngredients?.length > 0 && (
              <span className="text-muted truncate">
                {t('recipe.missing', { count: recipe.missingIngredients.length })}
                <span className="text-terra">
                  {recipe.missingIngredients.slice(0, 2).map((m) => m.name || m).join(', ')}
                  {recipe.missingIngredients.length > 2 ? '…' : ''}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Capsule pill: number sits in a darker inner pill, label + unit stacked below.
function NutritionPill({ value, label, unit, theme }) {
  return (
    <div
      className="rounded-[20px] flex flex-col items-center pt-1 pb-2 px-1"
      style={{ background: `${theme.pillRing}55` }}
    >
      <div
        className="w-full rounded-full flex items-center justify-center py-1.5"
        style={{ background: theme.pillRing }}
      >
        <span className="font-display font-extrabold text-deep leading-none" style={{ fontSize: 14 }}>
          {value}
        </span>
      </div>
      <div className="font-display font-bold text-deep leading-none text-[11px] mt-1.5">{label}</div>
      <div className="text-[9px] text-muted font-semibold leading-none mt-0.5">{unit}</div>
    </div>
  )
}
