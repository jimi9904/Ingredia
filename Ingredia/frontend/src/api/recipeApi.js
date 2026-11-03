import api from './axios'

const parseJsonArray = (v) => {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
  return []
}

const parseNutrition = (v) => {
  if (!v) return {}
  if (typeof v === 'string') { try { const p = JSON.parse(v); return typeof p === 'object' && p ? p : {} } catch { return {} } }
  if (typeof v === 'object') return v
  return {}
}

const parseInstructions = (v) => {
  const arr = parseJsonArray(v)
  if (!arr.length && typeof v === 'string') {
    // plain text split by newlines
    return v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  }
  return arr.map((s) => {
    if (typeof s === 'string') return s
    return s?.text || s?.description || s?.step || ''
  }).filter(Boolean)
}

const formatRecipe = (r) => ({
  ...r,
  id: String(r.id || r._id || r.slug),
  image: r.image_url || null,
  cookTime: r.cook_time ? `${r.cook_time} min` : '—',
  prepTime: r.prep_time ? `${r.prep_time} min` : '—',
  rating: Number(r.avg_rating || 0),
  reviewCount: r.rating_count || 0,
  cuisine: r.cuisine
    ? r.cuisine.charAt(0).toUpperCase() + r.cuisine.slice(1).toLowerCase()
    : 'International',
  difficulty: r.difficulty
    ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1)
    : 'Medium',
  tags: parseJsonArray(r.tags),
  ingredients: parseJsonArray(r.ingredients).map((i) => (typeof i === 'string' ? i : i?.name || '')),
  instructions: parseInstructions(r.instructions),
  nutrition: parseNutrition(r.nutrition),
  matchScore: r.match_score ?? null,
  missingIngredients: r.missing_ingredients || [],
  matchedIngredients: r.matched_ingredients || [],
})

export const fetchRecipes = async ({ page = 1, perPage = 48, featured = false } = {}) => {
  const params = { page, per_page: perPage }
  if (featured) params.featured = 'true'
  const { data } = await api.get('/recipes', { params })
  return {
    items: (data.data || []).map(formatRecipe),
    total: data.meta?.total ?? 0,
    hasMore: data.meta?.has_more ?? false,
    page: data.meta?.page ?? page,
  }
}

export const fetchPopularRecipes = async (limit = 6) => {
  const { data } = await api.get('/recipes/popular')
  return (data.data || []).slice(0, limit).map(formatRecipe)
}

export const fetchRecipeBySlug = async (slug) => {
  const { data } = await api.get(`/recipes/${encodeURIComponent(slug)}`)
  return data.data ? formatRecipe(data.data) : null
}

export const fetchSimilarRecipes = async (slug) => {
  if (!slug) return []
  const { data } = await api.get(`/recipes/${encodeURIComponent(slug)}/similar`)
  return (data.data || []).map(formatRecipe)
}

export const searchRecipes = async ({
  ingredients = [],
  cuisine,
  tags,
  maxTime,
  difficulty,
  sort,
  q,
  page = 1,
  perPage = 48,
} = {}) => {
  const params = { page, per_page: perPage }
  if (q) params.q = q
  if (ingredients.length) params.ingredients = ingredients.join(',')
  if (cuisine) params.cuisine = cuisine.toLowerCase()
  if (tags?.length) params['tags[]'] = tags
  if (maxTime) params.max_time = maxTime
  if (difficulty) params.difficulty = difficulty
  if (sort) params.sort = sort
  const { data } = await api.get('/recipes/search', { params })
  return {
    items: (data.data || []).map(formatRecipe),
    total: data.meta?.total ?? 0,
  }
}

export const ingredientAutocomplete = async (q) => {
  if (!q || q.length < 2) return []
  const { data } = await api.get('/ingredients/autocomplete', { params: { q } })
  return data.data || []
}
