import api from './axios'

export const getPantry = async () => {
  const { data } = await api.get('/pantry/ingredients')
  return data.data || []
}

export const addIngredient = (name) => api.post('/pantry/ingredients', { ingredient: name })

export const removeIngredient = (name) =>
  api.delete(`/pantry/ingredients/${encodeURIComponent(name)}`)

export const syncPantry = (ingredients) =>
  api.post('/pantry/sync', { ingredients })
