import { Response } from 'express';
import { Pantry } from '../models/Pantry.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const index = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const pantry = await Pantry.findOne({ user_id: userId });
    return successResponse(res, pantry?.ingredients || []);
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to fetch pantry.', 500);
  }
};

export const store = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const { name, ingredient } = req.body;
    const item = (name || ingredient || '').trim();

    if (!item) {
      return errorResponse(res, 'Ingredient name is required.', 422);
    }

    let pantry = await Pantry.findOne({ user_id: userId });
    if (!pantry) {
      pantry = await Pantry.create({ user_id: userId, ingredients: [] });
    }

    const current = pantry.ingredients || [];
    const exists = current.some((i) => {
      const n = typeof i === 'object' && i !== null ? i.name : String(i);
      return n.toLowerCase() === item.toLowerCase();
    });

    if (!exists) {
      current.push(item);
      pantry.ingredients = current;
      await pantry.save();
    }

    return successResponse(res, pantry.ingredients, 'Ingredient added to pantry.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to add ingredient.', 500);
  }
};

export const destroy = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const name = decodeURIComponent(String(req.params.name || '')).toLowerCase().trim();

    const pantry = await Pantry.findOne({ user_id: userId });
    if (pantry) {
      pantry.ingredients = (pantry.ingredients || []).filter((i) => {
        const n = typeof i === 'object' && i !== null ? i.name : String(i);
        return n.toLowerCase().trim() !== name;
      });
      await pantry.save();
    }

    return successResponse(res, null, 'Ingredient removed from pantry.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to remove ingredient.', 500);
  }
};

export const sync = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!._id.toString();
    const { ingredients } = req.body;

    const list = Array.isArray(ingredients) ? ingredients : [];
    let pantry = await Pantry.findOne({ user_id: userId });
    if (!pantry) {
      pantry = await Pantry.create({ user_id: userId, ingredients: list });
    } else {
      pantry.ingredients = list;
      await pantry.save();
    }

    return successResponse(res, pantry.ingredients, 'Pantry updated.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to sync pantry.', 500);
  }
};
