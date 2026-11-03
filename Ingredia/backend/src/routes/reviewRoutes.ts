import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.delete('/:id', authenticate, reviewController.destroy);

export default router;

