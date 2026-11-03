import { Request, Response } from 'express';
import { Recipe } from '../models/Recipe.js';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { SavedCollection } from '../models/SavedCollection.js';
import { SearchLog } from '../models/SearchLog.js';
import { normalizeIngredient } from '../services/normalizerService.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const dashboard = async (_req: Request, res: Response): Promise<any> => {
  try {
    const totalRecipes = await Recipe.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalReviews = await Review.countDocuments();
    const pendingRecipes = await Recipe.countDocuments({ status: 'pending' });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const searchesToday = await SearchLog.countDocuments({
      created_at: { $gte: startOfToday },
    });

    // Top searched ingredients (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await SearchLog.find({ created_at: { $gte: thirtyDaysAgo } }).select(
      'ingredients_searched'
    );
    const ingCounts: Record<string, number> = {};
    for (const log of logs) {
      for (const ing of log.ingredients_searched || []) {
        const norm = ing.toLowerCase().trim();
        ingCounts[norm] = (ingCounts[norm] || 0) + 1;
      }
    }
    const topIngredients = Object.entries(ingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

    // Top cuisines
    const cuisineAgg = await Recipe.aggregate([
      { $match: { status: 'published', cuisine: { $ne: '' } } },
      { $group: { _id: '$cuisine', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const topCuisines = cuisineAgg.map((item) => ({
      cuisine: item._id,
      count: item.count,
    }));

    // Recent sign-ups
    const recentSignups = (
      await User.find().sort({ created_at: -1 }).limit(10).select('name email created_at')
    ).map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      created_at: u.created_at,
    }));

    // Top rated recipes
    const topRated = (
      await Recipe.find({ status: 'published' })
        .sort({ avg_rating: -1, rating_count: -1 })
        .limit(10)
        .select('title slug avg_rating rating_count cuisine')
    ).map((r) => ({
      id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      cuisine: r.cuisine,
    }));

    // Searches & users per day (last 30 days)
    const searchesPerDay: Array<{ date: string; count: number }> = [];
    const usersPerDay: Array<{ date: string; count: number }> = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const sCount = await SearchLog.countDocuments({
        created_at: { $gte: dayStart, $lte: dayEnd },
      });
      searchesPerDay.push({ date: dateStr, count: sCount });

      const uCount = await User.countDocuments({
        created_at: { $gte: dayStart, $lte: dayEnd },
      });
      usersPerDay.push({ date: dateStr, count: uCount });
    }

    return successResponse(res, {
      total_recipes: totalRecipes,
      total_users: totalUsers,
      total_reviews: totalReviews,
      pending_recipes: pendingRecipes,
      searches_today: searchesToday,
      top_cuisines: topCuisines,
      recent_signups: recentSignups,
      top_ingredients: topIngredients,
      top_rated_recipes: topRated,
      searches_per_day: searchesPerDay,
      users_per_day: usersPerDay,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to load dashboard.', 500);
  }
};

export const recipes = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 20));
    const status = (req.query.status as string)?.trim();

    const filter: Record<string, any> = {};
    if (status) {
      filter.status = status;
    }

    const total = await Recipe.countDocuments(filter);
    const list = await Recipe.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    return paginatedResponse(
      res,
      list.map((r) => r.toJSON()),
      {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
        has_more: page < Math.ceil(total / perPage),
      }
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch admin recipes.', 500);
  }
};

export const storeRecipe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const data = req.body;
    const baseSlug = String(data.title || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let count = 1;
    while (await Recipe.exists({ slug })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    const ingredients = await Promise.all(
      (data.ingredients || []).map(async (ing: any) => {
        const name = typeof ing === 'object' && ing !== null ? ing.name : String(ing);
        const norm = await normalizeIngredient(name);
        return typeof ing === 'object' && ing !== null ? { ...ing, normalized: norm } : { name, normalized: norm };
      })
    );

    const recipe = await Recipe.create({
      ...data,
      slug,
      ingredients,
      source: 'admin',
      status: 'published',
      created_by: req.user!._id.toString(),
    });

    return successResponse(res, recipe.toJSON(), 'Recipe created.', 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to create recipe.', 500);
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const data = req.body;

    if (data.ingredients && Array.isArray(data.ingredients)) {
      data.ingredients = await Promise.all(
        data.ingredients.map(async (ing: any) => {
          const name = typeof ing === 'object' && ing !== null ? ing.name : String(ing);
          const norm = await normalizeIngredient(name);
          return typeof ing === 'object' && ing !== null ? { ...ing, normalized: norm } : { name, normalized: norm };
        })
      );
    }

    const recipe = await Recipe.findByIdAndUpdate(id, data, { new: true });
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }

    return successResponse(res, recipe.toJSON(), 'Recipe updated.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to update recipe.', 500);
  }
};

export const destroyRecipe = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const recipe = await Recipe.findByIdAndDelete(id);
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, null, 'Recipe deleted.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to delete recipe.', 500);
  }
};

export const approveRecipe = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const recipe = await Recipe.findByIdAndUpdate(id, { status: 'published' }, { new: true });
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, null, 'Recipe approved.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to approve recipe.', 500);
  }
};

export const rejectRecipe = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const recipe = await Recipe.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }
    return successResponse(res, null, 'Recipe rejected.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to reject recipe.', 500);
  }
};

export const bulkImport = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const recipesList = req.body.recipes;
    if (!Array.isArray(recipesList) || recipesList.length === 0) {
      return errorResponse(res, 'Recipes array is required.', 422);
    }

    let createdCount = 0;
    for (const rData of recipesList) {
      const baseSlug = String(rData.title || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      let slug = baseSlug;
      let count = 1;
      while (await Recipe.exists({ slug })) {
        count++;
        slug = `${baseSlug}-${count}`;
      }

      await Recipe.create({
        ...rData,
        slug,
        source: 'admin',
        status: 'published',
        created_by: req.user!._id.toString(),
      });
      createdCount++;
    }

    return successResponse(res, { imported: createdCount }, `${createdCount} recipes imported.`);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Bulk import failed.', 500);
  }
};

export const users = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 20));
    const emailFilter = (req.query.email as string)?.trim();

    const filter: Record<string, any> = {};
    if (emailFilter) {
      filter.email = { $regex: emailFilter, $options: 'i' };
    }

    const total = await User.countDocuments(filter);
    const list = await User.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const items = list.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
      verified: !!u.email_verified_at,
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
    return errorResponse(res, error.message || 'Failed to fetch users.', 500);
  }
};

export const userShow = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    const reviewsWritten = await Review.countDocuments({ user_id: id });
    const collections = await SavedCollection.find({ user_id: id });
    const recipesSaved = collections.reduce((acc, c) => acc + (c.recipe_ids || []).length, 0);

    return successResponse(res, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      preferences: user.preferences,
      created_at: user.created_at,
      stats: {
        reviews_written: reviewsWritten,
        recipes_saved: recipesSaved,
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch user.', 500);
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const { role } = req.body;
    if (!role || !['user', 'admin'].includes(role)) {
      return errorResponse(res, 'Valid role is required (user, admin).', 422);
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    return successResponse(res, null, 'User role updated.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to update user role.', 500);
  }
};
