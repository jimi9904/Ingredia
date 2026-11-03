import { Router } from 'express';
import * as pantryController from '../controllers/pantryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/ingredients', pantryController.index);
router.post('/ingredients', pantryController.store);
router.delete('/ingredients/:name', pantryController.destroy);
router.post('/sync', pantryController.sync);

export default router;

