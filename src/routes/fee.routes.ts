import { Router } from 'express';
import {
  createFee, getFees, getFeeById,
  updateFeeStatus, uploadProof,
  getReceipt, getUnpaidSummary
} from '../controllers/fee.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createFeeSchema,
  updateFeeStatusSchema,
  uploadProofSchema
} from '../validations/fee.validation';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), validate(createFeeSchema), createFee);
router.get('/', getFees);
router.get('/unpaid', restrictTo('admin'), getUnpaidSummary);
router.get('/:id', getFeeById);
router.patch('/:id/status', restrictTo('admin'), validate(updateFeeStatusSchema), updateFeeStatus);
router.patch('/:id/proof', validate(uploadProofSchema), uploadProof);
router.get('/:id/receipt', getReceipt);

export default router;