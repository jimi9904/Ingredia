import { Response } from 'express';
import { User } from '../models/User.js';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { AuthRequest } from '../middleware/auth.js';

export const update = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user!;
    const { name, email, current_password, new_password, preferences } = req.body;

    if (name) {
      user.name = String(name).trim();
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return errorResponse(res, 'The email has already been taken.', 422, {
            email: ['The email has already been taken.'],
          });
        }
        user.email = normalizedEmail;
        user.email_verified_at = null;
      }
    }

    if (new_password) {
      if (!current_password) {
        return errorResponse(res, 'Current password is required to set new password.', 422);
      }
      const isValid = await verifyPassword(current_password, user.password || '');
      if (!isValid) {
        return errorResponse(res, 'Current password is incorrect.', 422);
      }
      user.password = await hashPassword(new_password);
    }

    if (preferences && typeof preferences === 'object') {
      user.preferences = {
        dietary: Array.isArray(preferences.dietary)
          ? preferences.dietary
          : user.preferences?.dietary || [],
        allergies: Array.isArray(preferences.allergies)
          ? preferences.allergies
          : user.preferences?.allergies || [],
        cuisine_preference: Array.isArray(preferences.cuisine_preference)
          ? preferences.cuisine_preference
          : user.preferences?.cuisine_preference || [],
      };
    }

    await user.save();

    return successResponse(res, user.toJSON(), 'Profile updated successfully.');
  } catch (error: any) {
    return errorResponse(res, error.message || 'Failed to update profile.', 500);
  }
};

