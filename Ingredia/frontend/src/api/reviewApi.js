import api from './axios'

export const getReviews = async (recipeId) => {
  const { data } = await api.get(`/recipes/${recipeId}/reviews`)
  return data.data || []
}

export const submitReview = (recipeId, { rating, comment, photo }) => {
  if (photo) {
    const fd = new FormData()
    fd.append('rating', rating)
    if (comment) fd.append('comment', comment)
    fd.append('photo', photo)
    return api.post(`/recipes/${recipeId}/reviews`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return api.post(`/recipes/${recipeId}/reviews`, { rating, comment })
}
export const deleteReview = (reviewId) => api.delete(`/reviews/${reviewId}`)
