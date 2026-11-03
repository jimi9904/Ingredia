import { Router } from 'express';
import * as shoppingListController from '../controllers/shoppingListController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:recipeId', shoppingListController.preview);
router.get('/:recipeId/download', shoppingListController.download);

export default router;

