import { Router } from 'express';
import * as savedController from '../controllers/savedController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', savedController.index);
router.get('/collections', savedController.collections);
router.post('/collections', savedController.createCollection);

export default router;

