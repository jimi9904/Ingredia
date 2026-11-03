import { Ingredient } from '../models/Ingredient.js';

const cache = new Map<string, string>();

export const normalizeIngredient = async (ingredient: string): Promise<string> => {
  const raw = ingredient.toLowerCase().trim();
  if (!raw) return '';

  if (cache.has(raw)) {
    return cache.get(raw)!;
  }

  try {
    // Exact canonical match or alias match
    let found = await Ingredient.findOne({
      $or: [{ canonical_name: raw }, { aliases: raw }],
    });

    if (found) {
      cache.set(raw, found.canonical_name);
      return found.canonical_name;
    }

    // Substring match
    found = await Ingredient.findOne({
      $or: [
        { canonical_name: { $regex: raw, $options: 'i' } },
        { aliases: { $regex: raw, $options: 'i' } },
      ],
    });

    const result = found ? found.canonical_name : raw;
    cache.set(raw, result);
    return result;
  } catch (error) {
    return raw;
  }
};

export const normalizeManyIngredients = async (
  ingredients: string[]
): Promise<string[]> => {
  return Promise.all(ingredients.map((ing) => normalizeIngredient(ing)));
};

