import { Router } from 'express';
import {
  createClass, getClasses,
  getClassById, updateClass, deleteClass
} from '../controllers/class.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createClassSchema, updateClassSchema } from '../validations/class.validation';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), validate(createClassSchema), createClass);
router.get('/', getClasses);
router.get('/:id', getClassById);
router.put('/:id', restrictTo('admin'), validate(updateClassSchema), updateClass);
router.delete('/:id', restrictTo('admin'), deleteClass);

export default router;