import { Router } from 'express';
import {
  createAnnouncement, getAnnouncements, getAnnouncementById,
  updateAnnouncement, deleteAnnouncement,
  sendFeeReminders, sendCustomSMS
} from '../controllers/announcement.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createAnnouncementSchema,
  sendReminderSchema,
  sendCustomSMSSchema
} from '../validations/announcement.validation';

const router = Router();

router.use(protect);

router.post('/', restrictTo('admin', 'teacher'), validate(createAnnouncementSchema), createAnnouncement);
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);
router.put('/:id', restrictTo('admin', 'teacher'), updateAnnouncement);
router.delete('/:id', restrictTo('admin'), deleteAnnouncement);
router.post('/sms/fee-reminders', restrictTo('admin'), validate(sendReminderSchema), sendFeeReminders);
router.post('/sms/custom', restrictTo('admin'), validate(sendCustomSMSSchema), sendCustomSMS);

export default router;