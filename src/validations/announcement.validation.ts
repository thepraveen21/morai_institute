import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z.object({
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID'),
    title: z.string({ required_error: 'Title is required' })
      .min(3, 'Title must be at least 3 characters')
      .max(255, 'Title cannot exceed 255 characters'),
    body: z.string({ required_error: 'Body is required' })
      .min(5, 'Body must be at least 5 characters')
  })
});

export const sendReminderSchema = z.object({
  body: z.object({
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID'),
    month: z.string({ required_error: 'Month is required' }),
    year: z.number({ required_error: 'Year is required' })
      .int()
      .min(2020)
      .max(2100)
  })
});

export const sendCustomSMSSchema = z.object({
  body: z.object({
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID'),
    message: z.string({ required_error: 'Message is required' })
      .min(5, 'Message must be at least 5 characters')
      .max(160, 'SMS message cannot exceed 160 characters')
  })
});