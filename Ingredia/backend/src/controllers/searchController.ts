import { Request, Response } from 'express';
import { Recipe } from '../models/Recipe.js';
import { Ingredient } from '../models/Ingredient.js';
import { SearchLog } from '../models/SearchLog.js';
import { scoreRecipeAgainstUserIngredients } from '../services/ingredientMatchService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const search = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const q = (req.query.q as string)?.trim() || '';
    const ingredientsRaw = (req.query.ingredients as string)?.trim() || '';
    const cuisine = (req.query.cuisine as string)?.trim() || '';
    const tagsParam = req.query.tags;
    const maxTime = parseInt(req.query.max_time as string, 10);
    const difficulty = (req.query.difficulty as string)?.trim() || '';
    const minCalories = parseInt(req.query.min_calories as string, 10);
    const maxCalories = parseInt(req.query.max_calories as string, 10);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(48, Math.max(1, parseInt(req.query.per_page as string, 10) || 12));
    const sort = (req.query.sort as string)?.trim() || '';

    const filter: Record<string, any> = { status: 'published' };

    if (q) {
      filter.title = { $regex: q, $options: 'i' };
    }

    if (cuisine) {
      filter.cuisine = cuisine;
    }

    if (tagsParam) {
      const tagsList = Array.isArray(tagsParam)
        ? (tagsParam as string[])
        : [tagsParam as string];
      filter.tags = { $all: tagsList };
    }

    if (!isNaN(maxTime) && maxTime > 0) {
      filter.cook_time = { $lte: maxTime };
    }

    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      filter.difficulty = difficulty;
    }

    if (!isNaN(minCalories) && minCalories > 0) {
      filter['nutrition.calories'] = { ...(filter['nutrition.calories'] || {}), $gte: minCalories };
    }

    if (!isNaN(maxCalories) && maxCalories > 0) {
      filter['nutrition.calories'] = { ...(filter['nutrition.calories'] || {}), $lte: maxCalories };
    }

    const userIngredients = ingredientsRaw
      ? ingredientsRaw
          .split(',')
          .map((i) => i.trim().toLowerCase())
          .filter((i) => i.length > 0)
      : [];

    let total = 0;
    let items: any[] = [];

    if (userIngredients.length > 0) {
      // Partial regex match for candidates in MongoDB
      filter.$or = userIngredients.map((ing) => ({
        $or: [
          { 'ingredients.name': { $regex: ing, $options: 'i' } },
          { 'ingredients.normalized': { $regex: ing, $options: 'i' } },
          { ingredients: { $regex: ing, $options: 'i' } },
        ],
      }));

      const candidates = await Recipe.find(filter).limit(500);

      const scored = candidates
        .map((recipe) => {
          const matchData = scoreRecipeAgainstUserIngredients(
            userIngredients,
            recipe.ingredients || []
          );
          return {
            recipe,
            match_score: matchData.score,
            matched_ingredients: matchData.matched,
            missing_ingredients: matchData.missing,
          };
        })
        .filter((item) => item.match_score >= 10);

      if (sort === 'rating') {
        scored.sort((a, b) => (b.recipe.avg_rating || 0) - (a.recipe.avg_rating || 0));
      } else if (sort === 'quickest') {
        scored.sort((a, b) => (a.recipe.cook_time || 0) - (b.recipe.cook_time || 0));
      } else if (sort === 'fewest') {
        scored.sort((a, b) => a.missing_ingredients.length - b.missing_ingredients.length);
      } else {
        // Default ranking: match_score, then real image, then rating
        scored.sort((a, b) => {
          if (b.match_score !== a.match_score) return b.match_score - a.match_score;
          if (b.recipe.has_real_image !== a.recipe.has_real_image)
            return (b.recipe.has_real_image ? 1 : 0) - (a.recipe.has_real_image ? 1 : 0);
          return (b.recipe.avg_rating || 0) - (a.recipe.avg_rating || 0);
        });
      }

      total = scored.length;
      const paginatedScored = scored.slice((page - 1) * perPage, page * perPage);

      items = paginatedScored.map((item) => {
        const r: Record<string, any> = item.recipe.toJSON();
        r.match_score = item.match_score;
        r.matched_ingredients = item.matched_ingredients;
        r.missing_ingredients = item.missing_ingredients;
        return r;
      });
    } else {
      const sortObj: Record<string, any> = {};
      if (sort === 'rating') {
        sortObj.avg_rating = -1;
      } else if (sort === 'quickest') {
        sortObj.cook_time = 1;
      } else {
        sortObj.has_real_image = -1;
        sortObj.created_at = -1;
      }

      total = await Recipe.countDocuments(filter);
      const recipes = await Recipe.find(filter)
        .sort(sortObj)
        .skip((page - 1) * perPage)
        .limit(perPage);

      items = recipes.map((r) => r.toJSON());
    }

    // Async search log (fire & forget)
    SearchLog.create({
      user_id: req.user?._id?.toString() || null,
      query: q,
      ingredients_searched: userIngredients,
      filters: { cuisine, difficulty, max_time: maxTime, tags: tagsParam },
      results_count: total,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      data: items,
      total,
      meta: {
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage),
        has_more: page < Math.ceil(total / perPage),
      },
    });
  } catch (error: any) {
    console.error('[Search error]', error);
    return errorResponse(res, error.message || 'Search failed.', 500);
  }
};

export const autocomplete = async (req: Request, res: Response): Promise<any> => {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase() || '';
    if (!q) {
      return successResponse(res, []);
    }

    const ingredients = await Ingredient.find({
      $or: [
        { canonical_name: { $regex: q, $options: 'i' } },
        { aliases: { $regex: q, $options: 'i' } },
      ],
    }).limit(20);

    const names = new Set<string>();
    for (const ing of ingredients) {
      if (ing.canonical_name.toLowerCase().includes(q)) {
        names.add(ing.canonical_name);
      }
      for (const alias of ing.aliases || []) {
        if (alias.toLowerCase().includes(q)) {
          names.add(alias);
        }
      }
      if (names.size >= 10) break;
    }

    return successResponse(res, Array.from(names).slice(0, 10));
  } catch (error: any) {
    return errorResponse(res, error.message || 'Autocomplete failed.', 500);
  }
};
