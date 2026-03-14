import { Router } from 'express';
import {
  generateCodes,
  getCodes,
  deleteCodes,
  registerWithCode,
  validateCode
} from '../controllers/regcode.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/security.middleware';

const router = Router();

// Public routes
router.post('/register', authLimiter, registerWithCode);
router.get('/validate/:code', validateCode);

// Admin only routes
router.post('/generate', protect, restrictTo('admin'), generateCodes);
router.get('/', protect, restrictTo('admin'), getCodes);
router.delete('/', protect, restrictTo('admin'), deleteCodes);

export default router;