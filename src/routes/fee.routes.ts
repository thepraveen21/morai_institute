import { Router } from 'express';
import {
  createFee,
  getFees,
  getFeeById,
  updateFeeStatus,
  uploadProof,
  getReceipt,
  getUnpaidSummary
} from '../controllers/fee.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin'), createFee);
router.get('/', getFees);
router.get('/unpaid', restrictTo('admin'), getUnpaidSummary);
router.get('/:id', getFeeById);
router.patch('/:id/status', restrictTo('admin'), updateFeeStatus);
router.patch('/:id/proof', uploadProof);
router.get('/:id/receipt', getReceipt);

export default router;