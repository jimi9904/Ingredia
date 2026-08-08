import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import { getSaved, unsaveRecipe, getCollections, createCollection } from '../api/savedApi'
import { useToast } from '../context/ToastContext'
import { useTranslation } from 'react-i18next'
import { classifyDiet } from '../utils/dietType'

const inferType = (recipe) => classifyDiet(recipe)

export default function SavedPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [newColName, setNewColName] = useState('')
  const [showColForm, setShowColForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['saved'],
    queryFn: getSaved,
    select: (items) => items.map((r) => ({ ...r, type: inferType(r) })),
  })

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
  })

  const unsaveMut = useMutation({
    mutationFn: unsaveRecipe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved'] }); toast(t('saved.removed')) },
  })

  const createColMut = useMutation({
    mutationFn: createCollection,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); setNewColName(''); setShowColForm(false); toast('Collection created!') },
  })

  const filtered = activeFilter === 'all' ? saved : saved.filter((r) => r.type === activeFilter)

  return (
    <div className="min-h-screen bg-cream">
      <Navbar variant="home" />

      <div className="container-x py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="section-label mb-2">{t('saved.library')}</div>
            <h1 className="font-display font-bold text-deep" style={{ fontSize: 'clamp(28px, 3.5vw, 42px)' }}>
              {t('saved.title')}
            </h1>
            <p className="text-sm text-muted mt-1">{t('saved.subtitle', { count: saved.length })}</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="btn-primary self-start sm:self-auto"
          >
            {t('saved.discoverMore')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar — Collections */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-5 sticky top-24">
              <h3 className="font-display text-lg font-bold text-deep mb-4">{t('saved.collections')}</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeFilter === 'all' ? 'bg-terra/10 text-terra font-semibold' : 'text-muted hover:bg-cream-2'}`}
                >
                  {t('saved.allSaved')} ({saved.length})
                </button>
                <button
                  onClick={() => setActiveFilter('veg')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeFilter === 'veg' ? 'bg-sage/10 text-sage font-semibold' : 'text-muted hover:bg-cream-2'}`}
                >
                  {t('saved.vegetarian')} ({saved.filter((r) => r.type === 'veg').length})
                </button>
                <button
                  onClick={() => setActiveFilter('nonveg')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${activeFilter === 'nonveg' ? 'bg-terra/10 text-terra font-semibold' : 'text-muted hover:bg-cream-2'}`}
                >
                  {t('saved.nonVeg')} ({saved.filter((r) => r.type === 'nonveg').length})
                </button>
              </div>

              {collections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cream-3 space-y-1">
                  {collections.map((col) => (
                    <div key={col.id || col.name} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:bg-cream-2 cursor-pointer">
                      <span>📁</span>
                      <span className="truncate">{col.name}</span>
                      <span className="ml-auto text-xs text-cream-3">{col.recipe_ids?.length || 0}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-cream-3">
                {showColForm ? (
                  <div className="space-y-2">
                    <input
                      className="input-cream text-sm"
                      placeholder={t('saved.collectionPlaceholder')}
                      value={newColName}
                      onChange={(e) => setNewColName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && newColName.trim()) createColMut.mutate(newColName.trim()) }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => createColMut.mutate(newColName.trim())}
                        disabled={!newColName.trim() || createColMut.isPending}
                        className="btn-primary text-xs px-3 py-1.5 flex-1"
                      >
                        {t('saved.create')}
                      </button>
                      <button onClick={() => setShowColForm(false)} className="text-xs text-muted hover:text-terra px-2">
                        {t('saved.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowColForm(true)}
                    className="w-full text-left px-3 py-2 text-sm text-terra/80 hover:text-terra hover:bg-terra/5 rounded-xl transition-colors"
                  >
                    {t('saved.newCollection')}
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Recipe grid */}
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-cream-3 shadow-card animate-pulse">
                    <div className="h-[200px] bg-cream-3 rounded-t-2xl" />
                    <div className="p-5 space-y-2.5">
                      <div className="h-4 bg-cream-3 rounded w-3/4" />
                      <div className="h-3 bg-cream-3 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-cream-3 py-24 text-center">
                <div className="text-6xl mb-4">🔖</div>
                <h3 className="font-display text-2xl font-bold text-deep mb-2">{t('saved.emptyTitle')}</h3>
                <p className="text-sm text-muted mb-6">{t('saved.emptySub')}</p>
                <button onClick={() => navigate('/home')} className="btn-primary">
                  {t('saved.browseRecipes')}
                </button>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((recipe) => (
                  <div key={recipe.id} className="relative">
                    <RecipeCard
                      recipe={recipe}
                      onClick={setSelectedRecipe}
                      isFavorite={true}
                      onToggleFavorite={() => unsaveMut.mutate(recipe.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </div>
  )
}
