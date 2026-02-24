import { Router } from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} from '../controllers/class.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), createClass);
router.get('/', getClasses);
router.get('/:id', getClassById);
router.put('/:id', restrictTo('admin'), updateClass);
router.delete('/:id', restrictTo('admin'), deleteClass);

export default router;