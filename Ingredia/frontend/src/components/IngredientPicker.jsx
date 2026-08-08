import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ingredientAutocomplete } from '../api/recipeApi'

// ─── Popular ingredients shown as a product-card grid.
//     `tint` colours the image tile; `cat` shows under the name;
//     `diet` drives the FSSAI-style indicator (veg / nonveg / egg / dairy).
const POPULAR = [
  // Proteins
  { emoji: '🍗', v: 'chicken',  cat: 'Protein',   tint: '#FBD9CF', diet: 'nonveg' },
  { emoji: '🥩', v: 'beef',     cat: 'Protein',   tint: '#F2C4BA', diet: 'nonveg' },
  { emoji: '🐟', v: 'fish',     cat: 'Protein',   tint: '#D4E6F1', diet: 'nonveg' },
  { emoji: '🍤', v: 'shrimp',   cat: 'Protein',   tint: '#FBD0C2', diet: 'nonveg' },
  { emoji: '🥚', v: 'eggs',     cat: 'Eggetarian',tint: '#FBE7B5', diet: 'egg'    },
  { emoji: '🧀', v: 'paneer',   cat: 'Dairy',     tint: '#FFF1C2', diet: 'dairy'  },
  // Vegetables (all veg)
  { emoji: '🧅', v: 'onion',    cat: 'Vegetable', tint: '#F3D9B5', diet: 'veg' },
  { emoji: '🧄', v: 'garlic',   cat: 'Vegetable', tint: '#F0E7D2', diet: 'veg' },
  { emoji: '🍅', v: 'tomato',   cat: 'Vegetable', tint: '#F8C4BA', diet: 'veg' },
  { emoji: '🥕', v: 'carrot',   cat: 'Vegetable', tint: '#FBD7B0', diet: 'veg' },
  { emoji: '🥦', v: 'broccoli', cat: 'Vegetable', tint: '#D9E7BD', diet: 'veg' },
  { emoji: '🍄', v: 'mushroom', cat: 'Vegetable', tint: '#EAD7C2', diet: 'veg' },
  { emoji: '🥔', v: 'potato',   cat: 'Vegetable', tint: '#EBDAB7', diet: 'veg' },
  { emoji: '🌶️', v: 'chilli',  cat: 'Vegetable', tint: '#F7C5B5', diet: 'veg' },
  // Staples (mix of veg and dairy)
  { emoji: '🍚', v: 'rice',     cat: 'Staple',    tint: '#F6EFE0', diet: 'veg'   },
  { emoji: '🍝', v: 'pasta',    cat: 'Staple',    tint: '#F7E1B5', diet: 'veg'   },
  { emoji: '🌾', v: 'flour',    cat: 'Staple',    tint: '#F0E2C2', diet: 'veg'   },
  { emoji: '🫒', v: 'olive oil',cat: 'Staple',    tint: '#DDE6B5', diet: 'veg'   },
  { emoji: '🥛', v: 'milk',     cat: 'Dairy',     tint: '#E9EEF5', diet: 'dairy' },
  { emoji: '🧈', v: 'butter',   cat: 'Dairy',     tint: '#FBE7B5', diet: 'dairy' },
]

// Translation keys (resolved at render-time via t()).
const DIET_TKEY = { veg: 'picker.dietVeg', nonveg: 'picker.dietNonveg', egg: 'picker.dietEgg', dairy: 'picker.dietDairy' }
const SECTION_TKEY = { veg: 'picker.sectionVeg', nonveg: 'picker.sectionNonveg', egg: 'picker.sectionEgg', dairy: 'picker.sectionDairy' }
// Order the groups are rendered in. Non-veg first so meat-eaters see proteins immediately,
// then veg as the largest set, then egg + dairy as the smaller specialty groups.
const DIET_ORDER = ['nonveg', 'veg', 'egg', 'dairy']

const MAX_INGREDIENTS = 10

export default function IngredientPicker({ ingredients, onChange, onSearch }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSugs, setShowSugs] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!text || text.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(() => {
      ingredientAutocomplete(text)
        .then((s) => { setSuggestions(s); setActiveIdx(-1) })
        .catch(() => setSuggestions([]))
    }, 200)
  }, [text])

  const add = (val) => {
    const v = String(val || text).trim().toLowerCase()
    if (!v) return
    if (ingredients.includes(v)) { setText(''); return }
    if (ingredients.length >= MAX_INGREDIENTS) return
    onChange([...ingredients, v])
    setText('')
    setSuggestions([])
    setActiveIdx(-1)
    inputRef.current?.focus()
  }
  const remove = (v) => onChange(ingredients.filter((i) => i !== v))

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && suggestions[activeIdx]) add(suggestions[activeIdx])
      else add()
    } else if (e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && text === '' && ingredients.length > 0) {
      // Convenience: backspace on empty input removes the last chip
      e.preventDefault()
      remove(ingredients[ingredients.length - 1])
    } else if (e.key === 'Escape') {
      setShowSugs(false)
    }
  }

  const atLimit = ingredients.length >= MAX_INGREDIENTS

  // Visual emoji for the chip — best-effort lookup against the popular grid
  const emojiFor = (name) => {
    const n = name.toLowerCase()
    const hit = POPULAR.find((it) => it.v === n)
    return hit ? hit.emoji : '🌿'
  }

  return (
    <section
      className="relative py-16 px-6 md:px-12 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #F7E8D5 0%, #FAF5E6 50%, #F0E4D0 100%)' }}
    >
      {/* Soft decorative glows */}
      <div className="absolute top-[-160px] left-[-80px] w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(192,75,46,0.07) 0%, transparent 65%)' }} />
      <div className="absolute bottom-[-160px] right-[-80px] w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(107,124,94,0.07) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-[920px] mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-terra/10 border border-terra/20 text-terra text-[11px] font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            {t('picker.badge')}
          </span>
          <h2 className="font-display font-bold text-deep leading-[1.1] mt-4" style={{ fontSize: 'clamp(28px, 3.6vw, 46px)' }}>
            {t('picker.title')}
          </h2>
          <p className="text-[14px] text-muted max-w-md mx-auto mt-3">
            {t('picker.subtitle', { max: MAX_INGREDIENTS })}
          </p>
        </div>

        {/* ── Main card ── */}
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(60,30,12,0.12)] border border-cream-3 overflow-hidden">

          {/* Row 1: search input + add button */}
          <div className="relative px-5 sm:px-7 pt-5 pb-4">
            <div className="flex items-stretch gap-2 bg-cream-2/70 border-2 border-cream-3 focus-within:border-terra/40 transition-colors rounded-2xl px-3 sm:px-4">
              <span className="self-center text-xl text-muted" aria-hidden="true">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 py-3.5 bg-transparent text-deep text-[15px] outline-none placeholder:text-muted/70"
                placeholder={atLimit ? t('picker.atLimitPlaceholder', { max: MAX_INGREDIENTS }) : t('picker.inputPlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setShowSugs(true)}
                onBlur={() => setTimeout(() => setShowSugs(false), 150)}
                disabled={atLimit}
              />
              <button
                onClick={() => add()}
                disabled={atLimit || !text.trim()}
                className="self-center my-1.5 px-5 py-2.5 bg-terra text-white rounded-xl text-[13px] font-bold whitespace-nowrap shadow-md hover:bg-terra-2 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {t('picker.add')}
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {showSugs && suggestions.length > 0 && (
              <ul className="absolute left-5 right-5 sm:left-7 sm:right-7 top-full mt-1 bg-white rounded-2xl shadow-card-hover border border-cream-3 max-h-64 overflow-y-auto z-30">
                {suggestions.map((s, idx) => (
                  <li
                    key={s}
                    onMouseDown={(e) => { e.preventDefault(); add(s) }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`px-4 py-2.5 text-sm capitalize cursor-pointer flex items-center gap-2 transition-colors ${
                      idx === activeIdx ? 'bg-terra/8 text-terra' : 'text-deep hover:bg-cream-2'
                    }`}
                  >
                    <span>{emojiFor(s)}</span> {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Row 2: selected ingredients area */}
          <div className="px-5 sm:px-7 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                {t('picker.yourIngredients')}
              </p>
              {ingredients.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-terra border border-terra/30 bg-terra/5 hover:bg-terra hover:text-white transition-colors"
                  title={t('picker.clearAllTitle')}
                >
                  <span className="text-[10px]">✕</span>
                  {t('picker.clearAll')}
                </button>
              )}
            </div>

            {ingredients.length === 0 ? (
              <div className="border-2 border-dashed border-cream-3 rounded-2xl py-10 text-center">
                <div className="text-3xl mb-2 select-none" aria-hidden="true">🥬 🧄 🍅</div>
                <p className="text-[13px] text-muted">{t('picker.emptyHint')}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-terra/8 border border-terra/25 rounded-full text-terra-2 text-[13px] font-semibold capitalize transition-all"
                  >
                    <span aria-hidden="true">{emojiFor(i)}</span>
                    {i}
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="w-5 h-5 rounded-full bg-terra/15 hover:bg-terra hover:text-white text-[10px] flex items-center justify-center transition-colors"
                      aria-label={`Remove ${i}`}
                    >✕</button>
                  </span>
                ))}
              </div>
            )}

            {/* Progress dots */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex-1 flex gap-1">
                {Array.from({ length: MAX_INGREDIENTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < ingredients.length ? 'bg-terra' : 'bg-cream-3'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-muted whitespace-nowrap">
                {ingredients.length} / {MAX_INGREDIENTS}
              </span>
            </div>
          </div>

          {/* Row 3: CTA bar — Find Recipes is the primary action, Clear All sits beside it
              so users can reset without scrolling back up after viewing search results. */}
          <div className="px-5 sm:px-7 py-4 bg-cream-2/60 border-t border-cream-3 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onSearch}
              disabled={ingredients.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-white text-[15px] font-bold shadow-cta hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              style={{ background: ingredients.length === 0 ? '#9C8569' : '#C04B2E' }}
            >
              <span className="text-base">🍳</span>
              {ingredients.length === 0
                ? t('picker.addToStart')
                : t('picker.findRecipes', { n: ingredients.length, count: ingredients.length })}
              {ingredients.length > 0 && <span className="text-base">→</span>}
            </button>
            {ingredients.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-terra/25 text-terra-2 text-[14px] font-bold hover:bg-terra hover:text-white hover:border-terra transition-all whitespace-nowrap"
                title={t('picker.clearAllStartOver')}
              >
                <span>🗑️</span>
                {t('picker.clearAllBig')}
              </button>
            )}
          </div>
        </div>

        {/* ── Popular ingredients — grouped by diet (Veg / Non-Veg / Egg / Dairy) ── */}
        <div className="mt-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                {t('picker.popularEyebrow')}
              </p>
              <h3 className="font-display text-[22px] font-bold text-deep leading-tight mt-1">
                {t('picker.popularTitle')}
              </h3>
            </div>
            <span className="text-[12px] text-muted hidden sm:block">
              {POPULAR.length} {t('admin.options')}
            </span>
          </div>

          <div className="space-y-7">
            {DIET_ORDER.map((diet) => {
              const items = POPULAR.filter((p) => p.diet === diet)
              if (items.length === 0) return null
              const sectionLabel = t(SECTION_TKEY[diet])
              return (
                <div key={diet}>
                  {/* Section divider with diet mark + label + count */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`diet-mark diet-mark--${diet}`} aria-hidden="true" />
                    <h4
                      className={`font-display text-[15px] font-bold uppercase tracking-wider ${
                        diet === 'veg'    ? 'text-emerald-700'
                      : diet === 'nonveg' ? 'text-red-700'
                      : diet === 'egg'    ? 'text-amber-700'
                      : /* dairy */          'text-blue-700'
                      }`}
                    >
                      {sectionLabel}
                    </h4>
                    <span className="text-[11px] text-muted font-semibold">({items.length})</span>
                    <span className="flex-1 h-px bg-cream-3" />
                  </div>

                  {/* Cards in this diet group */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
                    {items.map((s) => {
                      const isSelected = ingredients.includes(s.v)
                      const disabled = isSelected || atLimit
                      return (
                        <button
                          key={s.v}
                          onClick={() => !disabled && add(s.v)}
                          disabled={disabled}
                          className={`group relative bg-white rounded-2xl p-2.5 border transition-all text-left overflow-hidden ${
                            isSelected
                              ? 'border-sage/40 cursor-default'
                              : atLimit
                                ? 'border-cream-3 opacity-40 cursor-not-allowed'
                                : 'border-cream-3 hover:border-terra/40 hover:-translate-y-1 hover:shadow-card cursor-pointer'
                          }`}
                        >
                          {/* Image tile */}
                          <div
                            className="relative w-full aspect-square rounded-xl flex items-center justify-center"
                            style={{ background: s.tint }}
                          >
                            <span
                              className={`diet-mark diet-mark--${s.diet} absolute top-1.5 left-1.5 shadow-sm`}
                              title={t(DIET_TKEY[s.diet])}
                              aria-label={t(DIET_TKEY[s.diet])}
                            />
                            <span
                              className="text-4xl select-none transition-transform group-hover:scale-110"
                              aria-hidden="true"
                              style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.08))' }}
                            >
                              {s.emoji}
                            </span>
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-sage text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                                ✓
                              </span>
                            )}
                          </div>

                          {/* Card body */}
                          <div className="pt-2.5 pb-1 px-1">
                            <p className="font-display text-[13px] font-bold text-deep capitalize leading-tight truncate">
                              {s.v}
                            </p>
                            <div className="flex items-center justify-end mt-1 gap-2">
                              {!isSelected && !atLimit && (
                                <span className="text-[14px] text-terra font-bold opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                                  +
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] text-sage font-bold">{t('picker.added')}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
