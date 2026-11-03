import { Request, Response } from 'express';
import { Recipe, IRecipe } from '../models/Recipe.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

const REAL_IMAGE_DOMAINS = ['archanaskitchen.com', 'themealdb.com'];

const isRealImageUrl = (url?: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return REAL_IMAGE_DOMAINS.some((domain) => lower.includes(domain));
};

const extractKeywords = (title: string, tags: string[]): string[] => {
  const keywords = [
    'chicken', 'paneer', 'mutton', 'beef', 'lamb', 'pork', 'fish', 'salmon',
    'prawn', 'shrimp', 'tofu', 'egg', 'biryani', 'pulao', 'pilaf', 'risotto',
    'rice', 'dal', 'sambar', 'rasam', 'lentil', 'curry', 'masala', 'tikka',
    'korma', 'sabzi', 'samosa', 'pakora', 'fritter', 'cutlet', 'kachori',
    'pasta', 'pizza', 'noodle', 'ramen', 'cake', 'cookie', 'brownie',
    'halwa', 'kheer', 'jalebi', 'ladoo', 'soup', 'salad', 'sandwich',
    'wrap', 'idli', 'dosa', 'upma', 'paratha', 'naan', 'roti',
  ];
  const hay = `${title} ${tags.join(' ')}`.toLowerCase();
  return keywords.filter((k) => hay.includes(k));
};

const classifyDiet = (tags: string[], title: string, ingredients: any[]): string => {
  for (const t of tags) {
    const lt = t.toLowerCase();
    if (lt.includes('non vegetarian') || lt.includes('non vegeterian')) return 'nonveg';
  }
  for (const t of tags) {
    if (t.toLowerCase().includes('eggetarian')) return 'egg';
  }
  for (const t of tags) {
    const lt = t.toLowerCase();
    if (lt === 'vegan' || lt.includes('vegetarian')) return 'veg';
  }

  const ingsText = ingredients
    .map((i) => (typeof i === 'object' && i !== null ? i.name || '' : String(i)))
    .join(' ');
  const hay = `${title} ${ingsText}`.toLowerCase();
  const meats = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'lamb', 'mutton',
    'bacon', 'turkey', 'prawn', 'tuna', 'crab', 'lobster', 'duck', 'sausage', 'ham',
  ];
  for (const m of meats) {
    if (hay.includes(m)) return 'nonveg';
  }
  if (/\begg\b/.test(hay)) return 'egg';
  return 'veg';
};

export const index = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const perPage = Math.min(48, Math.max(1, parseInt(req.query.per_page as string, 10) || 12));
    const featured = req.query.featured === 'true' || req.query.featured === '1';

    const filter: Record<string, any> = { status: 'published' };
    const sort: Record<string, any> = {};

    if (featured) {
      filter.rating_count = { $gte: 5 };
      sort.avg_rating = -1;
    } else {
      sort.has_real_image = -1;
      sort.created_at = -1;
    }

    const total = await Recipe.countDocuments(filter);
    const recipes = await Recipe.find(filter)
      .sort(sort)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const items = recipes.map((r) => r.toJSON());
    const lastPage = Math.ceil(total / perPage);

    return paginatedResponse(res, items, {
      total,
      page,
      per_page: perPage,
      last_page: lastPage,
      has_more: page < lastPage,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch recipes.', 500);
  }
};

export const popular = async (_req: Request, res: Response): Promise<any> => {
  try {
    const recipes = await Recipe.find({ status: 'published' })
      .sort({ avg_rating: -1, rating_count: -1 })
      .limit(8);

    const items = recipes.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      slug: r.slug,
      cuisine: r.cuisine,
      tags: r.tags || [],
      cook_time: r.cook_time,
      prep_time: r.prep_time,
      difficulty: r.difficulty,
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      image_url: r.image_url,
      servings: r.servings,
    }));

    return successResponse(res, items);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch popular recipes.', 500);
  }
};

export const show = async (req: Request, res: Response): Promise<any> => {
  try {
    const slug = String(req.params.slug || '');
    let recipe = await Recipe.findOne({ slug, status: 'published' });
    if (!recipe && /^[0-9a-fA-F]{24}$/.test(slug)) {
      recipe = await Recipe.findOne({ _id: slug, status: 'published' });
    }

    if (!recipe) {
      return errorResponse(res, 'Recipe not found.', 404);
    }

    // Fetch reviews for this recipe
    const reviews = await Review.find({ recipe_id: recipe._id.toString() })
      .sort({ created_at: -1 })
      .limit(10);

    // Populate user names for reviews
    const userIds = reviews.map((rev) => rev.user_id);
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    const formattedReviews = reviews.map((rev) => ({
      id: rev._id.toString(),
      rating: rev.rating,
      comment: rev.comment,
      photo_url: rev.photo_url,
      created_at: rev.created_at,
      user: {
        id: rev.user_id,
        name: userMap.get(rev.user_id) || 'Anonymous',
      },
    }));

    const data: Record<string, any> = recipe.toJSON();
    data.reviews = formattedReviews;

    return successResponse(res, data);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch recipe.', 500);
  }
};

export const similar = async (req: Request, res: Response): Promise<any> => {
  try {
    const { slug } = req.params;
    const target = await Recipe.findOne({ slug, status: 'published' });
    if (!target) {
      return successResponse(res, []);
    }

    const cuisine = (target.cuisine || '').toLowerCase().trim();
    const targetId = target._id.toString();
    const targetTags = (target.tags || []).map((t) => t.toLowerCase());
    const targetTitle = (target.title || '').toLowerCase();

    const projection = 'title slug cuisine tags cook_time prep_time difficulty avg_rating rating_count image_url servings has_real_image ingredients';
    let candidates = await Recipe.find({
      _id: { $ne: targetId },
      status: 'published',
      cuisine: target.cuisine,
    }).select(projection).limit(400);

    if (candidates.length < 12) {
      candidates = await Recipe.find({
        _id: { $ne: targetId },
        status: 'published',
      }).select(projection).limit(400);
    }

    const targetKeywords = extractKeywords(targetTitle, targetTags);
    const targetDiet = classifyDiet(targetTags, targetTitle, target.ingredients || []);

    const scored = candidates
      .map((r) => {
        let score = 0;
        const cLower = (r.cuisine || '').toLowerCase().trim();
        if (cLower === cuisine && cuisine !== '') {
          score += 5;
        }

        const candidateTags = (r.tags || []).map((t) => t.toLowerCase());
        const candidateTitle = (r.title || '').toLowerCase();
        const candidateDiet = classifyDiet(candidateTags, candidateTitle, r.ingredients || []);
        if (candidateDiet === targetDiet) score += 4;

        const candidateKeywords = extractKeywords(candidateTitle, candidateTags);
        const sharedKeywords = targetKeywords.filter((k) => candidateKeywords.includes(k));
        score += 6 * sharedKeywords.length;

        const sharedTags = targetTags.filter((t) => candidateTags.includes(t));
        score += Math.min(5, sharedTags.length);

        if (r.has_real_image) score += 1;

        return { recipe: r, score };
      })
      .filter((item) => item.score >= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const results = scored.map((item) => {
      const r = item.recipe;
      return {
        id: r._id.toString(),
        title: r.title,
        slug: r.slug,
        cuisine: r.cuisine,
        tags: r.tags || [],
        cook_time: r.cook_time,
        prep_time: r.prep_time,
        difficulty: r.difficulty,
        avg_rating: r.avg_rating,
        rating_count: r.rating_count,
        image_url: r.image_url,
        servings: r.servings,
      };
    });

    return successResponse(res, results);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch similar recipes.', 500);
  }
};

export const submitUserRecipe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const {
      title,
      description,
      ingredients,
      instructions,
      cuisine,
      tags,
      cook_time,
      prep_time,
      servings,
      difficulty,
      nutrition,
      image_url,
    } = req.body;

    const baseSlug = String(title)
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

    const recipe = await Recipe.create({
      title,
      slug,
      description: description || '',
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      cuisine: cuisine || 'Other',
      tags: Array.isArray(tags) ? tags : [],
      cook_time: parseInt(cook_time, 10) || 0,
      prep_time: parseInt(prep_time, 10) || 0,
      servings: parseInt(servings, 10) || 1,
      difficulty: difficulty || 'medium',
      nutrition: nutrition || {},
      image_url: image_url || '',
      has_real_image: isRealImageUrl(image_url),
      source: 'user',
      status: 'pending',
      created_by: req.user!._id.toString(),
    });

    return successResponse(res, recipe.toJSON(), 'Recipe submitted for approval.', 201);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to submit recipe.', 500);
  }
};
