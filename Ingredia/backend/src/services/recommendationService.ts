import { Recipe, IRecipe } from '../models/Recipe.js';
import { Review } from '../models/Review.js';
import { IUser } from '../models/User.js';
import { normalizeIngredient } from './normalizerService.js';

export const getRecommendationsForUser = async (user: IUser): Promise<IRecipe[]> => {
  const prefs = user.preferences || {};
  const dietary = prefs.dietary || [];
  const allergies = prefs.allergies || [];
  const cuisines = (prefs.cuisine_preference || []).map((c) => c.toLowerCase());

  // 1. Content-based candidates
  const contentFilter: Record<string, any> = { status: 'published' };
  if (dietary.length > 0) {
    contentFilter.tags = { $in: dietary };
  }

  if (allergies.length > 0) {
    const normAllergies = await Promise.all(allergies.map((a) => normalizeIngredient(a)));
    contentFilter['ingredients.normalized'] = { $nin: normAllergies };
  }

  const contentCandidates = await Recipe.find(contentFilter).limit(30);

  const scoredContent = contentCandidates
    .map((recipe) => {
      let score = 0;
      if (recipe.cuisine && cuisines.includes(recipe.cuisine.toLowerCase())) {
        score += 15;
      }
      score += (recipe.avg_rating || 0) * 10;
      return { recipe, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map((item) => item.recipe);

  // 2. Collaborative filtering candidates
  let collaborativeRecipes: IRecipe[] = [];
  try {
    const userRatings = await Review.find({
      user_id: user._id.toString(),
      rating: { $gte: 4 },
    }).distinct('recipe_id');

    if (userRatings.length > 0) {
      const similarUserIds = await Review.find({
        recipe_id: { $in: userRatings },
        rating: { $gte: 4 },
        user_id: { $ne: user._id.toString() },
      }).distinct('user_id');

      if (similarUserIds.length > 0) {
        const likedByOthers = await Review.aggregate([
          {
            $match: {
              user_id: { $in: similarUserIds },
              rating: { $gte: 4 },
              recipe_id: { $nin: userRatings },
            },
          },
          { $group: { _id: '$recipe_id', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        const ids = likedByOthers.map((item) => item._id);
        collaborativeRecipes = await Recipe.find({
          _id: { $in: ids },
          status: 'published',
        }).limit(10);
      }
    }
  } catch (error) {
    console.error('Error during collaborative filtering:', error);
  }

  // 3. Merge & Deduplicate
  const mergedMap = new Map<string, IRecipe>();
  for (const r of [...scoredContent, ...collaborativeRecipes]) {
    mergedMap.set(r._id.toString(), r);
    if (mergedMap.size >= 20) break;
  }

  // 4. Fill with popular recipes if < 10
  if (mergedMap.size < 10) {
    const existingIds = Array.from(mergedMap.keys());
    const popularFallback = await Recipe.find({
      _id: { $nin: existingIds },
      status: 'published',
    })
      .sort({ avg_rating: -1, rating_count: -1 })
      .limit(10);

    for (const r of popularFallback) {
      mergedMap.set(r._id.toString(), r);
      if (mergedMap.size >= 20) break;
    }
  }

  return Array.from(mergedMap.values());
};

