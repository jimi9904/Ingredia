import { Response } from 'express';
import { Recipe } from '../models/Recipe.js';
import { Pantry } from '../models/Pantry.js';
import { normalizeIngredient } from '../services/normalizerService.js';
import { createShoppingListPDF } from '../services/shoppingListPdfService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

const buildShoppingListData = async (recipeId: string, userId: string) => {
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) {
    throw new Error('Recipe not found');
  }

  const pantry = await Pantry.findOne({ user_id: userId });
  const rawPantry = pantry?.ingredients || [];

  const normalizedPantry = Array.from(
    new Set(
      await Promise.all(
        rawPantry.map((ing) => {
          const n = typeof ing === 'object' && ing !== null ? ing.name : String(ing);
          return normalizeIngredient(n);
        })
      )
    )
  );

  const missing: any[] = [];
  const pantryHas: any[] = [];

  for (const ing of recipe.ingredients || []) {
    let ingName = '';
    let normalized = '';

    if (typeof ing === 'object' && ing !== null) {
      ingName = ing.name || '';
      normalized = ing.normalized || (await normalizeIngredient(ingName));
    } else {
      ingName = String(ing);
      normalized = await normalizeIngredient(ingName);
    }

    let inPantry = false;
    for (const pIng of normalizedPantry) {
      if (
        normalized === pIng ||
        normalized.includes(pIng) ||
        pIng.includes(normalized)
      ) {
        inPantry = true;
        break;
      }
    }

    if (inPantry) {
      pantryHas.push(ing);
    } else {
      missing.push(ing);
    }
  }

  return {
    recipe,
    missing,
    pantry_has: pantryHas,
  };
};

export const preview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const recipeId = String(req.params.recipeId || '');
    const userId = req.user!._id.toString();

    const data = await buildShoppingListData(recipeId, userId);

    return successResponse(res, {
      recipe: {
        id: data.recipe._id.toString(),
        title: data.recipe.title,
        servings: data.recipe.servings,
      },
      missing: data.missing,
      pantry_has: data.pantry_has,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to generate shopping list.', 500);
  }
};

export const download = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const recipeId = String(req.params.recipeId || '');
    const userId = req.user!._id.toString();

    const data = await buildShoppingListData(recipeId, userId);
    const pdfBuffer = await createShoppingListPDF(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="shopping-list-${data.recipe.slug}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to download shopping list.', 500);
  }
};
