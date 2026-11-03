import { Router } from 'express';
import * as profileController from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.put('/', authenticate, profileController.update);

export default router;

