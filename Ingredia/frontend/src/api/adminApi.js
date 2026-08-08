import api from './axios'

export const getDashboard = async () => {
  const { data } = await api.get('/admin/analytics/dashboard')
  return data.data || {}
}

export const getAdminRecipes = async (page = 1, status = '') => {
  const params = { page, per_page: 20 }
  if (status) params.status = status
  const { data } = await api.get('/admin/recipes', { params })
  return data
}

export const approveRecipe = (id) => api.patch(`/admin/recipes/${id}/approve`)
export const rejectRecipe = (id) => api.patch(`/admin/recipes/${id}/reject`)
export const deleteAdminRecipe = (id) => api.delete(`/admin/recipes/${id}`)
export const updateAdminRecipe = (id, payload) => api.put(`/admin/recipes/${id}`, payload)

export const getUsers = async (page = 1) => {
  const { data } = await api.get('/admin/users', { params: { page } })
  return data
}

export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role })
