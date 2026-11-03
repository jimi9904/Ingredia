import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Pantry } from '../models/Pantry.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, dietary, allergies, cuisine_preference } = req.body;

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return errorResponse(res, 'Validation failed.', 422, {
        email: ['The email has already been taken.'],
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      preferences: {
        dietary: Array.isArray(dietary) ? dietary : [],
        allergies: Array.isArray(allergies) ? allergies : [],
        cuisine_preference: Array.isArray(cuisine_preference) ? cuisine_preference : [],
      },
    });

    // Create empty pantry for new user
    await Pantry.create({
      user_id: user._id.toString(),
      ingredients: [],
    });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(
      res,
      {
        user: user.toJSON(),
        token,
      },
      'Registered successfully. Please verify your email.',
      201
    );
  } catch (error: any) {
    console.error('[Register error]', error);
    return errorResponse(res, error.message || 'Registration failed.', 500);
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse(res, 'Invalid credentials.', 401);
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(res, {
      user: user.toJSON(),
      token,
      role: user.role,
    });
  } catch (error: any) {
    console.error('[Login error]', error);
    return errorResponse(res, error.message || 'Login failed.', 500);
  }
};

export const logout = async (_req: Request, res: Response): Promise<any> => {
  return successResponse(res, null, 'Logged out successfully.');
};

export const me = async (req: AuthRequest, res: Response): Promise<any> => {
  return successResponse(res, req.user!.toJSON());
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;
  return successResponse(res, null, `Password reset link sent to ${email} (simulated).`);
};

export const resetPassword = async (_req: Request, res: Response): Promise<any> => {
  return successResponse(res, null, 'Password reset successful.');
};

