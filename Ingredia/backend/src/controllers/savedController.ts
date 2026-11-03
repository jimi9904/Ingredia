import { Response } from 'express';
import { SavedCollection } from '../models/SavedCollection.js';
import { Recipe } from '../models/Recipe.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const index = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const collections = await SavedCollection.find({ user_id: userId });

    const allIds = Array.from(
      new Set(collections.flatMap((c) => c.recipe_ids || []))
    );

    const recipes = await Recipe.find({ _id: { $in: allIds } });
    const items = recipes.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      image_url: r.image_url,
      cuisine: r.cuisine,
      tags: r.tags || [],
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      cook_time: r.cook_time,
      prep_time: r.prep_time,
      difficulty: r.difficulty,
      ingredients: r.ingredients || [],
      servings: r.servings,
    }));

    return successResponse(res, items);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch saved recipes.', 500);
  }
};

export const save = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const userId = req.user!._id.toString();
    const collectionName = (req.body.collection_name as string)?.trim() || 'Saved Recipes';

    let collection = await SavedCollection.findOne({
      user_id: userId,
      name: collectionName,
    });

    if (!collection) {
      collection = await SavedCollection.create({
        user_id: userId,
        name: collectionName,
        recipe_ids: [id],
      });
    } else {
      const ids = new Set(collection.recipe_ids || []);
      ids.add(id);
      collection.recipe_ids = Array.from(ids);
      await collection.save();
    }

    return successResponse(res, null, 'Recipe saved.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to save recipe.', 500);
  }
};

export const destroy = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id || '');
    const userId = req.user!._id.toString();

    const collections = await SavedCollection.find({ user_id: userId });
    for (const col of collections) {
      col.recipe_ids = (col.recipe_ids || []).filter((rId) => rId !== id);
      await col.save();
    }

    return successResponse(res, null, 'Recipe removed from saved.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to unsave recipe.', 500);
  }
};

export const collections = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const list = await SavedCollection.find({ user_id: userId });

    const items = list.map((c) => ({
      name: c.name,
      count: (c.recipe_ids || []).length,
    }));

    return successResponse(res, items);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch collections.', 500);
  }
};

export const createCollection = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const name = (req.body.name as string)?.trim();

    if (!name) {
      return errorResponse(res, 'Collection name is required.', 422);
    }

    const exists = await SavedCollection.findOne({ user_id: userId, name });
    if (exists) {
      return errorResponse(res, 'Collection with this name already exists.', 422);
    }

    const col = await SavedCollection.create({
      user_id: userId,
      name,
      recipe_ids: [],
    });

    return successResponse(
      res,
      { id: col._id.toString(), name: col.name },
      'Collection created.',
      201
    );
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to create collection.', 500);
  }
};
