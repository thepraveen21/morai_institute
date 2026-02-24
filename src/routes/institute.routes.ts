import { Router } from 'express';
import {
  createInstitute,
  getInstitutes,
  getInstituteById,
  updateInstitute,
  deleteInstitute
} from '../controllers/institute.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// All routes protected — admin only
router.use(protect);

router.post('/', restrictTo('admin'), createInstitute);
router.get('/', getInstitutes);
router.get('/:id', getInstituteById);
router.put('/:id', restrictTo('admin'), updateInstitute);
router.delete('/:id', restrictTo('admin'), deleteInstitute);

export default router;