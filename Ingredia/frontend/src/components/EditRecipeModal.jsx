import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { updateAdminRecipe } from '../api/adminApi'
import { fetchRecipeBySlug } from '../api/recipeApi'
import { useToast } from '../context/ToastContext'

const DIFFICULTIES = ['easy', 'medium', 'hard']
const STATUSES = ['published', 'pending', 'rejected']
const CUISINES = ['Indian', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'American', 'Thai', 'French', 'Mediterranean', 'South Indian Recipes', 'Other']

const normaliseIngredient = (raw) => {
  if (raw && typeof raw === 'object') {
    return { name: raw.name || '', amount: raw.amount || raw.quantity || '' }
  }
  return { name: String(raw || ''), amount: '' }
}

const buildForm = (recipe) => ({
  title: recipe.title || '',
  description: recipe.description || '',
  cuisine: recipe.cuisine || '',
  difficulty: (recipe.difficulty || 'medium').toLowerCase(),
  status: recipe.status || 'published',
  cook_time: recipe.cook_time ?? '',
  prep_time: recipe.prep_time ?? '',
  servings: recipe.servings ?? '',
  image_url: recipe.image_url || '',
  tags: Array.isArray(recipe.tags) ? recipe.tags.join(', ') : (recipe.tags || ''),
  ingredients: (recipe.ingredients?.length ? recipe.ingredients : [{ name: '', amount: '' }]).map(normaliseIngredient),
  instructions: (recipe.instructions?.length
    ? recipe.instructions.map((s) => (typeof s === 'string' ? s : (s?.text || s?.description || s?.step || '')))
    : ['']),
})

export default function EditRecipeModal({ recipe, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  // Parent remounts this modal each time editing becomes non-null, so initial state
  // is derived directly from the prop — no setState-in-effect race.
  const [form, setForm] = useState(() => buildForm(recipe))
  const [errors, setErrors] = useState({})

  // Async refinement: the admin row may only have a summary; fetch the full doc by slug
  // to populate ingredients/instructions that were trimmed for the table view.
  useEffect(() => {
    if (!recipe?.slug) return
    let cancelled = false
    fetchRecipeBySlug(recipe.slug)
      .then((full) => {
        if (cancelled || !full) return
        setForm((current) => ({
          ...current,
          description: current.description || full.description || '',
          cuisine: current.cuisine || full.cuisine || '',
          tags: current.tags || (Array.isArray(full.tags) ? full.tags.join(', ') : ''),
          ingredients: full.ingredients?.length ? full.ingredients.map(normaliseIngredient) : current.ingredients,
          instructions: full.instructions?.length
            ? full.instructions.map((s) => (typeof s === 'string' ? s : (s?.text || s?.description || s?.step || '')))
            : current.instructions,
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [recipe?.slug])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const recipeId = recipe?.id || recipe?._id

  const mut = useMutation({
    mutationFn: () => updateAdminRecipe(recipeId, {
      title: form.title,
      description: form.description,
      cuisine: form.cuisine,
      difficulty: form.difficulty,
      status: form.status,
      cook_time: Number(form.cook_time) || 1,
      prep_time: Number(form.prep_time) || 1,
      servings: Number(form.servings) || 1,
      image_url: form.image_url,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: form.ingredients.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), amount: i.amount?.trim?.() || '' })),
      instructions: form.instructions.filter((s) => s.trim()),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-recipes'] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['popular'] })
      toast(t('admin.updated'))
      onClose()
    },
    onError: (err) => {
      if (err?.response?.data?.errors) setErrors(err.response.data.errors)
      else toast(err?.response?.data?.message || t('admin.updateFailed'))
    },
  })

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))
  const addIngredient = () => set('ingredients', [...form.ingredients, { name: '', amount: '' }])
  const removeIngredient = (i) => set('ingredients', form.ingredients.filter((_, idx) => idx !== i))
  const setIngredient = (i, field, val) => {
    const next = [...form.ingredients]
    next[i] = { ...next[i], [field]: val }
    set('ingredients', next)
  }
  const addStep = () => set('instructions', [...form.instructions, ''])
  const removeStep = (i) => set('instructions', form.instructions.filter((_, idx) => idx !== i))
  const setStep = (i, val) => {
    const next = [...form.instructions]
    next[i] = val
    set('instructions', next)
  }

  const err = (field) => errors[field]?.[0]

  return (
    <div onClick={onClose} className="fixed inset-0 z-[999] flex items-start justify-center p-4 sm:p-6 bg-deep/70 backdrop-blur-sm overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="bg-cream rounded-2xl max-w-2xl w-full my-4 overflow-hidden shadow-soft">
        <div className="flex items-center justify-between px-8 py-5 border-b border-cream-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-deep">{t('modal.editRecipe')}</h2>
            <p className="text-xs text-muted mt-0.5 truncate max-w-[420px]">{recipe.title}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-cream-2 hover:bg-cream-3 flex items-center justify-center text-muted transition-colors">✕</button>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.recipeTitle')} *</label>
              <input className="input-cream" value={form.title} onChange={(e) => set('title', e.target.value)} />
              {err('title') && <p className="form-error">{err('title')}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.description')}</label>
              <textarea className="input-cream resize-none" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('modal.cuisine')} *</label>
              <input className="input-cream" list="cuisine-options" value={form.cuisine} onChange={(e) => set('cuisine', e.target.value)} />
              <datalist id="cuisine-options">
                {CUISINES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="form-label">{t('modal.difficulty')} *</label>
              <select className="input-cream" value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{t(`recipe.${d}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('modal.prepTime')}</label>
              <input className="input-cream" type="number" min="1" value={form.prep_time} onChange={(e) => set('prep_time', e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('modal.cookTime')}</label>
              <input className="input-cream" type="number" min="1" value={form.cook_time} onChange={(e) => set('cook_time', e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('modal.servings')}</label>
              <input className="input-cream" type="number" min="1" value={form.servings} onChange={(e) => set('servings', e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('modal.status')}</label>
              <select className="input-cream" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{t(`admin.filter${s.charAt(0).toUpperCase()}${s.slice(1)}`)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.tags')}</label>
              <input className="input-cream" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder={t('modal.tagsPlaceholder')} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.imageUrl')}</label>
              <input className="input-cream" value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">{t('modal.ingredients')} *</label>
              <button onClick={addIngredient} className="text-xs text-terra font-semibold hover:text-terra-2">{t('modal.addIngredient')}</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input-cream flex-1" placeholder={t('modal.ingredientName')} value={ing.name} onChange={(e) => setIngredient(i, 'name', e.target.value)} />
                  <input className="input-cream w-32" placeholder={t('modal.ingredientAmount')} value={ing.amount || ''} onChange={(e) => setIngredient(i, 'amount', e.target.value)} />
                  {form.ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(i)} className="text-muted hover:text-red-500 px-2 text-sm transition-colors">✕</button>
                  )}
                </div>
              ))}
            </div>
            {err('ingredients') && <p className="form-error mt-1">{err('ingredients')}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">{t('modal.instructions')} *</label>
              <button onClick={addStep} className="text-xs text-terra font-semibold hover:text-terra-2">{t('modal.addStep')}</button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {form.instructions.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-7 h-7 flex-shrink-0 rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center mt-2">{i + 1}</span>
                  <textarea
                    className="input-cream flex-1 resize-none"
                    rows={2}
                    value={typeof step === 'string' ? step : (step?.text || step?.description || step?.step || '')}
                    onChange={(e) => setStep(i, e.target.value)}
                  />
                  {form.instructions.length > 1 && (
                    <button onClick={() => removeStep(i)} className="text-muted hover:text-red-500 px-1 text-sm transition-colors mt-2">✕</button>
                  )}
                </div>
              ))}
            </div>
            {err('instructions') && <p className="form-error mt-1">{err('instructions')}</p>}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-cream-3 flex justify-end gap-3 bg-cream">
          <button onClick={onClose} className="btn-outline">{t('modal.cancel')}</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title || !form.cuisine}
            className="btn-primary disabled:opacity-50"
          >
            {mut.isPending ? t('modal.saving') : t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
