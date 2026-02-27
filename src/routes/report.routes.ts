import { Router } from 'express';
import {
  unpaidFeeReport,
  feeCollectionSummary,
  attendanceSummaryReport,
  chronicAbsenteeReport,
  studentFullReport,
  dashboardSummary
} from '../controllers/report.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/unpaid-fees', unpaidFeeReport);
router.get('/fee-summary', feeCollectionSummary);
router.get('/attendance', attendanceSummaryReport);
router.get('/chronic-absentees', chronicAbsenteeReport);
router.get('/student/:student_id', studentFullReport);
router.get('/dashboard', dashboardSummary);

export default router;