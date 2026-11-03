import { Router } from 'express';
import * as recipeController from '../controllers/recipeController.js';
import * as searchController from '../controllers/searchController.js';
import * as reviewController from '../controllers/reviewController.js';
import * as savedController from '../controllers/savedController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// Order matters: specific paths before parameterised /:slug paths!
router.get('/popular', recipeController.popular);
router.get('/search', optionalAuthenticate, searchController.search);
router.get('/', recipeController.index);
router.post('/', authenticate, recipeController.submitUserRecipe);

// Reviews on recipe
router.get('/:id/reviews', reviewController.index);
router.post('/:id/reviews', authenticate, reviewController.store);

// Save / Unsave on recipe
router.post('/:id/save', authenticate, savedController.save);
router.delete('/:id/save', authenticate, savedController.destroy);

// Slug-based detail routes
router.get('/:slug/similar', recipeController.similar);
router.get('/:slug', recipeController.show);

export default router;

