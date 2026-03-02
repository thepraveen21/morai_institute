import { Router } from 'express';
import {
  createInstitute, getInstitutes,
  getInstituteById, updateInstitute, deleteInstitute
} from '../controllers/institute.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createInstituteSchema,
  updateInstituteSchema
} from '../validations/institute.validation';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), validate(createInstituteSchema), createInstitute);
router.get('/', getInstitutes);
router.get('/:id', getInstituteById);
router.put('/:id', restrictTo('admin'), validate(updateInstituteSchema), updateInstitute);
router.delete('/:id', restrictTo('admin'), deleteInstitute);

export default router;