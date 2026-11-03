import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { errorResponse } from '../utils/apiResponse.js';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): any => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'Unauthorized. Admin access required.', 403);
  }
  next();
};

