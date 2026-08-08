import api from './axios'

export const login = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data.data
}

export const register = async ({ name, email, password }) => {
  const { data } = await api.post('/auth/register', {
    name,
    email,
    password,
    password_confirmation: password,
  })
  return data.data
}

export const logout = async () => {
  try { await api.post('/auth/logout') } catch {}
}

export const me = async () => {
  const { data } = await api.get('/auth/me')
  return data.data
}

export const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export const resetPassword = async ({ token, email, password, password_confirmation }) => {
  const { data } = await api.post('/auth/reset-password', { token, email, password, password_confirmation })
  return data
}

export const updateProfile = async (payload) => {
  const { data } = await api.put('/profile', payload)
  return data.data
}

export const submitRecipe = async (payload) => {
  const { data } = await api.post('/recipes', payload)
  return data.data
}
