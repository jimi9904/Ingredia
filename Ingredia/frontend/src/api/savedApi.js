import api from './axios'

const fmt = (r) => ({
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
})

export const getSaved = async () => {
  const { data } = await api.get('/saved')
  return (data.data || []).map(fmt)
}

export const saveRecipe = (id) => api.post(`/recipes/${id}/save`)
export const unsaveRecipe = (id) => api.delete(`/recipes/${id}/save`)

export const getCollections = async () => {
  const { data } = await api.get('/saved/collections')
  return data.data || []
}

export const createCollection = (name) => api.post('/saved/collections', { name })

export const getShoppingList = async (recipeId) => {
  const { data } = await api.get(`/shopping-list/${recipeId}`)
  return data.data || []
}

export const downloadShoppingListPdf = (recipeId) =>
  api.get(`/shopping-list/${recipeId}/download`, { responseType: 'blob' })
