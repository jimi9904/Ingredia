import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { submitRecipe } from '../api/authApi'
import { useToast } from '../context/ToastContext'

const EMPTY_INGREDIENT = { name: '', amount: '' }
const DIFFICULTIES = ['easy', 'medium', 'hard']
const CUISINES = ['Indian', 'Italian', 'Mexican', 'Chinese', 'Japanese', 'American', 'Thai', 'French', 'Mediterranean', 'Other']

export default function SubmitRecipeModal({ onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [form, setForm] = useState({
    title: '', description: '', cuisine: '', difficulty: 'easy',
    cook_time: '', prep_time: '', servings: '', image_url: '',
    ingredients: [{ ...EMPTY_INGREDIENT }],
    instructions: [''],
    tags: '',
  })
  const [errors, setErrors] = useState({})

  const mut = useMutation({
    mutationFn: () => submitRecipe({
      ...form,
      cook_time:    Number(form.cook_time),
      prep_time:    Number(form.prep_time),
      servings:     Number(form.servings),
      tags:         form.tags.split(',').map(t => t.trim()).filter(Boolean),
      ingredients:  form.ingredients.filter(i => i.name.trim()),
      instructions: form.instructions.filter(s => s.trim()),
    }),
    onSuccess: () => {
      toast('Recipe submitted for review! You\'ll be notified when it\'s approved.')
      onClose()
    },
    onError: (err) => {
      if (err?.response?.data?.errors) setErrors(err.response.data.errors)
      else toast(err?.response?.data?.message || 'Submission failed. Please try again.')
    },
  })

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_INGREDIENT }] }))
  const removeIngredient = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))
  const setIngredient = (i, field, val) => setForm(f => {
    const ings = [...f.ingredients]; ings[i] = { ...ings[i], [field]: val }; return { ...f, ingredients: ings }
  })

  const addStep = () => setForm(f => ({ ...f, instructions: [...f.instructions, ''] }))
  const removeStep = (i) => setForm(f => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }))
  const setStep = (i, val) => setForm(f => {
    const steps = [...f.instructions]; steps[i] = val; return { ...f, instructions: steps }
  })

  const err = (field) => errors[field]?.[0]

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 sm:p-6 bg-deep/70 backdrop-blur-sm overflow-y-auto">
      <div onClick={e => e.stopPropagation()} className="bg-cream rounded-2xl max-w-2xl w-full my-4 overflow-hidden shadow-soft">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-cream-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-deep">{t('modal.submitRecipe')}</h2>
            <p className="text-xs text-muted mt-0.5">{t('modal.submitNote')}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-cream-2 hover:bg-cream-3 flex items-center justify-center text-muted transition-colors">✕</button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.recipeTitle')} *</label>
              <input className="input-cream" value={form.title} onChange={e => set('title', e.target.value)} placeholder={t('modal.titlePlaceholder')} />
              {err('title') && <p className="form-error">{err('title')}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.description')} *</label>
              <textarea className="input-cream resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('modal.descriptionPlaceholder')} />
            </div>
            <div>
              <label className="form-label">{t('modal.cuisine')} *</label>
              <select className="input-cream" value={form.cuisine} onChange={e => set('cuisine', e.target.value)}>
                <option value="">{t('modal.selectCuisine')}</option>
                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('modal.difficulty')} *</label>
              <select className="input-cream" value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{t(`recipe.${d}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('modal.prepTime')} *</label>
              <input className="input-cream" type="number" min="1" value={form.prep_time} onChange={e => set('prep_time', e.target.value)} placeholder="15" />
            </div>
            <div>
              <label className="form-label">{t('modal.cookTime')} *</label>
              <input className="input-cream" type="number" min="1" value={form.cook_time} onChange={e => set('cook_time', e.target.value)} placeholder="30" />
            </div>
            <div>
              <label className="form-label">{t('modal.servings')} *</label>
              <input className="input-cream" type="number" min="1" value={form.servings} onChange={e => set('servings', e.target.value)} placeholder="4" />
            </div>
            <div>
              <label className="form-label">{t('modal.tags')}</label>
              <input className="input-cream" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder={t('modal.tagsPlaceholder')} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">{t('modal.imageUrl')}</label>
              <input className="input-cream" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">{t('modal.ingredients')} *</label>
              <button onClick={addIngredient} className="text-xs text-terra font-semibold hover:text-terra-2">{t('modal.addIngredient')}</button>
            </div>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input-cream flex-1" placeholder={t('modal.ingredientName')} value={ing.name} onChange={e => setIngredient(i, 'name', e.target.value)} />
                  <input className="input-cream w-32" placeholder={t('modal.ingredientAmount')} value={ing.amount} onChange={e => setIngredient(i, 'amount', e.target.value)} />
                  {form.ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(i)} className="text-muted hover:text-red-500 px-2 text-sm transition-colors">✕</button>
                  )}
                </div>
              ))}
            </div>
            {err('ingredients') && <p className="form-error mt-1">{err('ingredients')}</p>}
          </div>

          {/* Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">{t('modal.instructions')} *</label>
              <button onClick={addStep} className="text-xs text-terra font-semibold hover:text-terra-2">{t('modal.addStep')}</button>
            </div>
            <div className="space-y-2">
              {form.instructions.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-7 h-7 flex-shrink-0 rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center mt-2">{i + 1}</span>
                  <textarea
                    className="input-cream flex-1 resize-none"
                    rows={2}
                    placeholder={t('modal.stepPlaceholder', { n: i + 1 })}
                    value={step}
                    onChange={e => setStep(i, e.target.value)}
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

        {/* Footer */}
        <div className="px-8 py-5 border-t border-cream-3 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">{t('modal.cancel')}</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.title || !form.cuisine || !form.cook_time || !form.prep_time || !form.servings || !form.description}
            className="btn-primary disabled:opacity-50"
          >
            {mut.isPending ? t('modal.submitting') : t('modal.submitForReview')}
          </button>
        </div>
      </div>
    </div>
  )
}
