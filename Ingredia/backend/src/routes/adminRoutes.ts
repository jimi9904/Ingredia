import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

router.use(authenticate, requireAdmin);

// Dashboard
router.get('/analytics/dashboard', adminController.dashboard);

// Recipe moderation & management
router.get('/recipes', adminController.recipes);
router.post('/recipes', adminController.storeRecipe);
router.post('/recipes/bulk-import', adminController.bulkImport);
router.put('/recipes/:id', adminController.updateRecipe);
router.delete('/recipes/:id', adminController.destroyRecipe);
router.patch('/recipes/:id/approve', adminController.approveRecipe);
router.patch('/recipes/:id/reject', adminController.rejectRecipe);

// User management
router.get('/users', adminController.users);
router.get('/users/:id', adminController.userShow);
router.patch('/users/:id/role', adminController.updateUserRole);

export default router;

