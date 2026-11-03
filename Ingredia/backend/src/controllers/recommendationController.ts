import { Response } from 'express';
import { getRecommendationsForUser } from '../services/recommendationService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const index = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const recipes = await getRecommendationsForUser(user);

    const items = recipes.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      cuisine: r.cuisine,
      tags: r.tags || [],
      cook_time: r.cook_time,
      difficulty: r.difficulty,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      image_url: r.image_url,
    }));

    return successResponse(res, items);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch recommendations.', 500);
  }
};

