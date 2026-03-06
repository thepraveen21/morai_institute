import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validations/auth.validation';
import { authLimiter } from '../middleware/security.middleware'; 

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register); 
router.post('/login', authLimiter, validate(loginSchema), login);           
router.get('/me', protect, getMe);

export default router;