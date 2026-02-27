import { Router } from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  sendFeeReminders,
  sendCustomSMS
} from '../controllers/announcement.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Announcement routes
router.post('/', restrictTo('admin', 'teacher'), createAnnouncement);
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);
router.put('/:id', restrictTo('admin', 'teacher'), updateAnnouncement);
router.delete('/:id', restrictTo('admin'), deleteAnnouncement);

// SMS routes
router.post('/sms/fee-reminders', restrictTo('admin'), sendFeeReminders);
router.post('/sms/custom', restrictTo('admin'), sendCustomSMS);

export default router;