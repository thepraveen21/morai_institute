import { z } from 'zod';

export const createClassSchema = z.object({
  body: z.object({
    institute_id: z.string({ required_error: 'Institute ID is required' })
      .uuid('Invalid institute ID'),
    teacher_id: z.string().uuid('Invalid teacher ID').optional(),
    name: z.string({ required_error: 'Class name is required' })
      .min(2, 'Class name must be at least 2 characters'),
    subject: z.string().optional(),
    schedule: z.object({
      day: z.string(),
      time: z.string()
    }).optional(),
    fee_amount: z.number({ required_error: 'Fee amount is required' })
      .positive('Fee amount must be greater than 0')
  })
});

export const updateClassSchema = z.object({
  body: z.object({
    teacher_id: z.string().uuid('Invalid teacher ID').optional(),
    name: z.string().min(2).optional(),
    subject: z.string().optional(),
    schedule: z.object({
      day: z.string(),
      time: z.string()
    }).optional(),
    fee_amount: z.number().positive().optional()
  }),
  params: z.object({
    id: z.string().uuid('Invalid class ID')
  })
});