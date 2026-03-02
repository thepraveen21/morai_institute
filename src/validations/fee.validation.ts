import { z } from 'zod';

const months = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
] as const;

export const createFeeSchema = z.object({
  body: z.object({
    student_id: z.string({ required_error: 'Student ID is required' })
      .uuid('Invalid student ID'),
    class_id: z.string({ required_error: 'Class ID is required' })
      .uuid('Invalid class ID'),
    month: z.enum(months, {
      errorMap: () => ({ message: 'Invalid month name' })
    }),
    year: z.number({ required_error: 'Year is required' })
      .int()
      .min(2020, 'Year must be 2020 or later')
      .max(2100, 'Invalid year'),
    amount: z.number({ required_error: 'Amount is required' })
      .positive('Amount must be greater than 0')
  })
});

export const updateFeeStatusSchema = z.object({
  body: z.object({
    status: z.enum(['paid', 'unpaid', 'partial'], {
      errorMap: () => ({ message: 'Status must be paid, unpaid or partial' })
    }),
    amount: z.number().positive().optional(),
    notes: z.string().optional()
  }),
  params: z.object({
    id: z.string().uuid('Invalid fee ID')
  })
});

export const uploadProofSchema = z.object({
  body: z.object({
    proof_url: z.string({ required_error: 'Proof URL is required' })
      .url('Invalid URL format')
  }),
  params: z.object({
    id: z.string().uuid('Invalid fee ID')
  })
});