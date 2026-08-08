import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPantry, addIngredient, removeIngredient } from '../api/pantryApi'
import { ingredientAutocomplete } from '../api/recipeApi'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'

// ─── Category metadata ───
// `tKey` resolves to a translated label at render time so the UI fully follows
// the i18n locale. `color` is a Tailwind colour token used elsewhere.
const CATEGORIES = {
  vegetable: { icon: '🥦', tKey: 'pantryPage.categoryVegetables', color: 'emerald' },
  fruit:     { icon: '🍓', tKey: 'pantryPage.categoryFruits',     color: 'rose'    },
  protein:   { icon: '🥩', tKey: 'pantryPage.categoryProteins',   color: 'red'     },
  dairy:     { icon: '🧀', tKey: 'pantryPage.categoryDairy',      color: 'amber'   },
  grain:     { icon: '🌾', tKey: 'pantryPage.categoryGrains',     color: 'yellow'  },
  spice:     { icon: '🌶️', tKey: 'pantryPage.categorySpices',    color: 'orange'  },
  other:     { icon: '🍶', tKey: 'pantryPage.categoryOther',      color: 'sage'    },
}

const CATEGORY_KEYWORDS = {
  vegetable: ['onion','garlic','tomato','potato','carrot','spinach','broccoli','cabbage','cauliflower','capsicum','pepper','celery','leek','zucchini','cucumber','peas','corn','beetroot','asparagus','kale','lettuce','mushroom','eggplant','aubergine','pumpkin','squash','beans','lentil','chickpea'],
  protein: ['chicken','beef','pork','lamb','fish','salmon','tuna','shrimp','prawn','egg','tofu','paneer','turkey','bacon','sausage','mutton','seafood','crab','lobster'],
  dairy: ['milk','butter','cheese','cream','yogurt','curd','ghee','mozzarella','parmesan','cheddar','ricotta','mascarpone','sour cream'],
  grain: ['rice','flour','pasta','bread','wheat','oats','barley','quinoa','noodle','rye','semolina','cornmeal','breadcrumb'],
  spice: ['salt','pepper','cumin','coriander','turmeric','chilli','chili','paprika','cinnamon','cardamom','cloves','nutmeg','oregano','basil','thyme','rosemary','bay','ginger','saffron','mustard','fennel','anise','cayenne','allspice'],
  fruit: ['apple','banana','lemon','lime','orange','mango','grape','strawberry','blueberry','raspberry','pineapple','coconut','avocado','cherry','peach','pear','plum','kiwi','watermelon','melon','pomegranate','fig','date'],
}

// Per-ingredient emoji map for nicer card art. Falls back to the category emoji.
const INGREDIENT_EMOJI = {
  onion: '🧅', garlic: '🧄', tomato: '🍅', potato: '🥔', carrot: '🥕',
  broccoli: '🥦', spinach: '🥬', corn: '🌽', mushroom: '🍄', eggplant: '🍆',
  cucumber: '🥒', pepper: '🫑', chilli: '🌶️', chili: '🌶️', ginger: '🫚',
  chicken: '🍗', beef: '🥩', fish: '🐟', salmon: '🐟', shrimp: '🦐', prawn: '🦐',
  egg: '🥚', eggs: '🥚', bacon: '🥓', sausage: '🌭', cheese: '🧀',
  milk: '🥛', butter: '🧈', yogurt: '🥣', cream: '🥛',
  rice: '🍚', pasta: '🍝', noodle: '🍜', bread: '🍞', flour: '🌾', oats: '🌾',
  salt: '🧂', sugar: '🍬', oil: '🫙', vinegar: '🧴', honey: '🍯',
  apple: '🍎', banana: '🍌', lemon: '🍋', lime: '🍋', orange: '🍊', mango: '🥭',
  grape: '🍇', strawberry: '🍓', pineapple: '🍍', avocado: '🥑', cherry: '🍒',
  peach: '🍑', pear: '🍐', kiwi: '🥝', watermelon: '🍉', coconut: '🥥',
}

function inferCategory(name) {
  const n = name.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => n.includes(k))) return cat
  }
  return 'other'
}

function emojiFor(name) {
  const n = name.toLowerCase().trim()
  if (INGREDIENT_EMOJI[n]) return INGREDIENT_EMOJI[n]
  // Try matching any keyword in the name
  for (const [key, emoji] of Object.entries(INGREDIENT_EMOJI)) {
    if (n.includes(key)) return emoji
  }
  const cat = inferCategory(name)
  return CATEGORIES[cat]?.icon ?? '🍽️'
}

const QUICK_ADD = ['Onion','Garlic','Tomato','Ginger','Rice','Chicken','Eggs','Butter','Salt','Olive Oil']

export default function PantryPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [filter, setFilter] = useState('all')
  const debounceRef = useRef(null)

  const { data: pantry = [], isLoading } = useQuery({
    queryKey: ['pantry'],
    queryFn: getPantry,
  })

  const addMut = useMutation({
    mutationFn: addIngredient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pantry'] }); setInput(''); setSuggestions([]); toast(t('pantry.added')) },
    onError: (e) => toast(e?.response?.data?.message || 'Could not add ingredient.'),
  })

  const removeMut = useMutation({
    mutationFn: removeIngredient,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pantry'] }); toast(t('pantry.removed')) },
  })

  const handleInput = (val) => {
    setInput(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const s = await ingredientAutocomplete(val)
      setSuggestions(s)
      setShowSug(true)
    }, 250)
  }

  const handleAdd = (name) => {
    const n = (name || input).trim()
    if (!n) return
    if (pantry.some((p) => (p.name || p).toLowerCase() === n.toLowerCase())) {
      toast(t('pantry.alreadyIn'))
      setInput('')
      return
    }
    addMut.mutate(n)
    setShowSug(false)
  }

  const pantryNames = pantry.map((p) => p.name || p)

  // Annotate each item with its category, then derive filtered list + per-category counts.
  const annotated = pantry.map((item) => {
    const name = item.name || item
    return { name, category: item.category || inferCategory(name) }
  })
  const counts = annotated.reduce((acc, it) => { acc[it.category] = (acc[it.category] || 0) + 1; return acc }, {})
  const filtered = filter === 'all' ? annotated : annotated.filter((it) => it.category === filter)

  const goSearch = () => {
    if (pantryNames.length === 0) return
    navigate(`/home?pantry=${pantryNames.map(encodeURIComponent).join(',')}`)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #F4F8EE 0%, #FAFBF4 100%)' }}>
      <Navbar variant="home" />

      <div className="container-x py-10">
        {/* ── HERO STRIP: title + category cards ── */}
        <section className="grid lg:grid-cols-[1.05fr_2fr] gap-6 items-stretch mb-8">
          {/* Left: title block */}
          <div className="relative rounded-3xl bg-white px-7 py-8 shadow-card border border-sage/15 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage/10 text-sage text-[11px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-sage" /> {t('pantryPage.badge')}
            </span>
            <h1 className="font-display font-bold text-deep mt-3 leading-[1.05]" style={{ fontSize: 'clamp(34px, 4vw, 52px)' }}>
              {t('pantryPage.titleLine1')}<br />
              <span className="text-sage">{t('pantryPage.titleLine2')}</span>
            </h1>
            <p className="text-[13px] text-muted leading-relaxed mt-3 max-w-[280px]">
              {t('pantryPage.heroDesc')}
            </p>
            {/* Leafy corner decoration */}
            <span className="absolute -bottom-2 -right-2 text-5xl opacity-25 select-none" aria-hidden="true">🌿</span>
          </div>

          {/* Right: 4 category cards (visual + click to filter) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'vegetable', tone: '#DDEBC2', img: '🥦', tagKey: 'pantryPage.tagFarmFresh' },
              { key: 'fruit',     tone: '#F8D5CC', img: '🍓', tagKey: 'pantryPage.tagSweetJuicy' },
              { key: 'protein',   tone: '#F2D2BC', img: '🥩', tagKey: 'pantryPage.tagEnergyBoost' },
              { key: 'dairy',     tone: '#FCEAB5', img: '🧀', tagKey: 'pantryPage.tagDailyCalcium' },
            ].map((c) => {
              const meta = CATEGORIES[c.key]
              const active = filter === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(active ? 'all' : c.key)}
                  className={`group relative rounded-3xl p-5 text-left transition-all overflow-hidden border-2 ${active ? 'border-sage scale-[1.02]' : 'border-transparent hover:-translate-y-1'}`}
                  style={{ background: c.tone }}
                >
                  <div className="text-3xl mb-12" aria-hidden="true">{c.img}</div>
                  <div className="font-display text-[17px] font-bold text-deep leading-tight">{t(meta.tKey)}</div>
                  <div className="text-[11px] text-deep/60 mt-0.5">{t(c.tagKey)}</div>
                  <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-sage text-white flex items-center justify-center text-base shadow-md group-hover:scale-110 transition-transform">
                    →
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── ADD + SEARCH BAR ── */}
        <section className="bg-white rounded-2xl border border-sage/15 shadow-card px-5 py-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-base pointer-events-none">🔍</span>
              <input
                className="w-full pl-11 pr-10 py-3 bg-cream-2 border border-cream-3 rounded-full text-sm text-deep placeholder-muted focus:outline-none focus:border-sage transition-colors"
                placeholder={t('pantry.addPlaceholder')}
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowSug(false) }}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
              />
              {input && (
                <button
                  onClick={() => { setInput(''); setSuggestions([]); setShowSug(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep w-6 h-6 flex items-center justify-center"
                >✕</button>
              )}
              {showSug && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-cream-3 rounded-2xl shadow-card-hover z-20 overflow-hidden">
                  {suggestions.slice(0, 8).map((s) => (
                    <button
                      key={s}
                      onClick={() => { handleAdd(s); setShowSug(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-deep hover:bg-sage/8 capitalize transition-colors flex items-center gap-2"
                    >
                      <span>{emojiFor(s)}</span> {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAdd()}
              disabled={!input.trim() || addMut.isPending}
              className="px-6 py-3 rounded-full text-white font-bold text-sm shadow-md disabled:opacity-50 hover:-translate-y-0.5 transition-all"
              style={{ background: '#3F8A4D' }}
            >
              {addMut.isPending ? t('pantry.adding') : '+ ' + t('pantry.addToPantry')}
            </button>
            <button
              onClick={goSearch}
              disabled={pantry.length === 0}
              className="px-6 py-3 rounded-full bg-sage/10 text-sage font-bold text-sm hover:bg-sage/20 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {t('pantryPage.findRecipes')}
            </button>
          </div>
        </section>

        {/* ── FILTER CHIP ROW ── */}
        <section className="flex flex-wrap items-center gap-2 mb-6">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} icon="🛒" label={t('pantryPage.allItems')} count={annotated.length} primary />
          {Object.entries(CATEGORIES).map(([key, meta]) => {
            const c = counts[key] || 0
            if (c === 0 && filter !== key) return null
            return (
              <FilterChip
                key={key}
                active={filter === key}
                onClick={() => setFilter(filter === key ? 'all' : key)}
                icon={meta.icon}
                label={t(meta.tKey)}
                count={c}
              />
            )
          })}
        </section>

        {/* ── PANTRY GRID ── */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white rounded-3xl border border-sage/10 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && pantry.length === 0 && (
          <div className="bg-white rounded-3xl border border-sage/15 py-20 text-center shadow-card">
            <div className="text-6xl mb-4">🧺</div>
            <h3 className="font-display text-2xl font-bold text-deep mb-2">{t('pantry.emptyTitle')}</h3>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">{t('pantry.emptySub')}</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
              {QUICK_ADD.slice(0, 6).map((ing) => (
                <button
                  key={ing}
                  onClick={() => handleAdd(ing)}
                  className="px-4 py-2 rounded-full text-sm border border-sage/30 text-sage font-medium hover:bg-sage/10 transition-colors"
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && pantry.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-3xl border border-sage/15 py-16 text-center shadow-card">
            <div className="text-4xl mb-3">{CATEGORIES[filter]?.icon ?? '🥗'}</div>
            <p className="text-sm text-muted">
              {t('pantryPage.nothingIn')}{' '}
              <span className="font-bold text-deep">{CATEGORIES[filter] ? t(CATEGORIES[filter].tKey) : filter}</span>.
            </p>
            <button onClick={() => setFilter('all')} className="text-sage font-bold text-sm mt-3 hover:underline">{t('pantryPage.showAll')}</button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map((it) => (
              <PantryItemCard
                key={it.name}
                item={it}
                onRemove={() => removeMut.mutate(it.name)}
              />
            ))}
          </div>
        )}

        {/* ── BOTTOM PROMO CARDS ── */}
        {pantry.length > 0 && (
          <section className="mt-10 grid md:grid-cols-3 gap-4">
            <PromoCard
              tone="#DDEBC2"
              title={t('pantryPage.promoFindTitle')}
              subtitle={t('pantryPage.promoFindSub', { count: pantry.length })}
              icon="🍳"
              cta={t('pantryPage.promoFindCta')}
              onClick={goSearch}
            />
            <PromoCard
              tone="#FCEAB5"
              title={t('pantryPage.promoQuickTitle')}
              subtitle={t('pantryPage.promoQuickSub')}
              icon="⚡"
              extra={
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_ADD.slice(0, 5).map((ing) => {
                    const inPantry = pantryNames.some((p) => p.toLowerCase() === ing.toLowerCase())
                    return (
                      <button
                        key={ing}
                        onClick={(e) => { e.stopPropagation(); !inPantry && handleAdd(ing) }}
                        disabled={inPantry}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          inPantry ? 'bg-sage/15 border-sage/20 text-sage cursor-default' : 'bg-white border-deep/15 text-deep hover:border-sage hover:text-sage'
                        }`}
                      >
                        {inPantry ? '✓ ' : '+ '}{ing}
                      </button>
                    )
                  })}
                </div>
              }
            />
            <PromoCard
              tone="#F8D5CC"
              title={t('pantryPage.promoClearTitle')}
              subtitle={t('pantryPage.promoClearSub')}
              icon="🗑️"
              cta={t('pantryPage.promoClearCta')}
              danger
              onClick={async () => {
                if (window.confirm(t('pantry.clearConfirm'))) {
                  for (const name of pantryNames) await removeIngredient(name)
                  qc.invalidateQueries({ queryKey: ['pantry'] })
                  toast(t('pantry.cleared'))
                }
              }}
            />
          </section>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───

function FilterChip({ active, onClick, icon, label, count, primary }) {
  const base = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition-all whitespace-nowrap border'
  if (active) {
    return (
      <button onClick={onClick} className={`${base} bg-sage border-sage text-white shadow-md`}>
        <span className="text-base leading-none">{icon}</span>
        {label}
        <span className="text-[11px] opacity-80">({count})</span>
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`${base} bg-white border-cream-3 text-deep hover:border-sage hover:text-sage ${primary ? 'text-deep' : ''}`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
      <span className="text-[11px] text-muted">({count})</span>
    </button>
  )
}

function PantryItemCard({ item, onRemove }) {
  const { t } = useTranslation()
  const cat = CATEGORIES[item.category] ?? CATEGORIES.other
  return (
    <div
      className="relative bg-white rounded-3xl border border-sage/10 shadow-card hover:shadow-card-hover transition-all group overflow-hidden"
    >
      {/* Category tint band */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: '#3F8A4D' }} />

      {/* Remove button (visible on hover or always on touch) */}
      <button
        onClick={onRemove}
        title={t('pantryPage.remove')}
        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/95 text-muted hover:bg-red-500 hover:text-white shadow-sm flex items-center justify-center text-xs opacity-60 group-hover:opacity-100 transition-all"
        title="Remove"
      >
        ✕
      </button>

      <div className="pt-7 pb-4 px-3 text-center">
        <div className="text-5xl mb-2 select-none" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}>
          {emojiFor(item.name)}
        </div>
        <div className="font-display text-[14px] font-bold text-deep capitalize leading-tight mb-0.5 line-clamp-2" style={{ minHeight: '2.4em' }}>
          {item.name}
        </div>
        <div className="text-[10px] text-muted uppercase tracking-wider font-semibold flex items-center justify-center gap-1">
          <span>{cat.icon}</span> {t(cat.tKey)}
        </div>
      </div>
    </div>
  )
}

function PromoCard({ tone, title, subtitle, icon, cta, extra, onClick, danger }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className="relative text-left rounded-3xl px-6 py-5 overflow-hidden hover:-translate-y-1 transition-transform"
      style={{ background: tone }}
    >
      <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>
      <div className="font-display text-[20px] font-bold text-deep leading-tight">{title}</div>
      <div className="text-[12px] text-deep/65 mt-1 leading-relaxed">{subtitle}</div>
      {extra}
      {cta && (
        <div
          className={`inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-white text-[13px] font-bold shadow-md ${danger ? 'bg-red-500' : ''}`}
          style={danger ? undefined : { background: '#3F8A4D' }}
        >
          {cta} →
        </div>
      )}
    </Tag>
  )
}
