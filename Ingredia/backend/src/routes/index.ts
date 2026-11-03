import { Router } from 'express';
import authRoutes from './authRoutes.js';
import recipeRoutes from './recipeRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import pantryRoutes from './pantryRoutes.js';
import savedRoutes from './savedRoutes.js';
import profileRoutes from './profileRoutes.js';
import recommendationRoutes from './recommendationRoutes.js';
import shoppingListRoutes from './shoppingListRoutes.js';
import adminRoutes from './adminRoutes.js';
import * as searchController from '../controllers/searchController.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/recipes', recipeRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/pantry', pantryRoutes);
apiRouter.use('/saved', savedRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/recommendations', recommendationRoutes);
apiRouter.use('/shopping-list', shoppingListRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.get('/ingredients/autocomplete', searchController.autocomplete);

export default apiRouter;

