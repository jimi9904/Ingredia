import { Request, Response } from 'express';
import { Review } from '../models/Review.js';
import { Recipe } from '../models/Recipe.js';
import { User } from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const index = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.per_page as string, 10) || 10));

    const total = await Review.countDocuments({ recipe_id: id });
    const reviews = await Review.find({ recipe_id: id })
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const userIds = reviews.map((r) => r.user_id);
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const items = reviews.map((r) => ({
      id: r._id.toString(),
      rating: r.rating,
      comment: r.comment,
      photo_url: r.photo_url,
      created_at: r.created_at,
      user: {
        id: r.user_id,
        name: userMap.get(r.user_id) || 'Anonymous',
      },
    }));

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
        has_more: page < Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch reviews.', 500);
  }
};

export const store = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!._id.toString();
    const { rating, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return errorResponse(res, 'Rating must be between 1 and 5.', 422);
    }

    const existing = await Review.findOne({ recipe_id: id, user_id: userId });
    if (existing) {
      return errorResponse(res, 'You have already reviewed this recipe.', 422);
    }

    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }

    const review = await Review.create({
      recipe_id: id,
      user_id: userId,
      rating: numRating,
      comment: comment || '',
      photo_url: req.file ? `/storage/reviews/${req.file.filename}` : null,
    });

    // Recalculate avg_rating and rating_count
    const allReviews = await Review.find({ recipe_id: id });
    const count = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

    recipe.avg_rating = avg;
    recipe.rating_count = count;
    await recipe.save();

    return successResponse(
      res,
      {
        id: review._id.toString(),
        rating: review.rating,
        comment: review.comment,
        photo_url: review.photo_url,
        created_at: review.created_at,
      },
      'Review submitted.',
      201
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to submit review.', 500);
  }
};

export const destroy = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) {
      return errorResponse(res, 'Review not found.', 404);
    }

    if (review.user_id !== req.user!._id.toString() && req.user!.role !== 'admin') {
      return errorResponse(res, 'Unauthorized.', 403);
    }

    const recipeId = review.recipe_id;
    await review.deleteOne();

    // Recalculate
    const remaining = await Review.find({ recipe_id: recipeId });
    const count = remaining.length;
    const sum = remaining.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

    await Recipe.findByIdAndUpdate(recipeId, {
      avg_rating: avg,
      rating_count: count,
    });

    return successResponse(res, null, 'Review deleted.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to delete review.', 500);
  }
};

