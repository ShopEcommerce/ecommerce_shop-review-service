import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string({ error: 'Missing product ID' }).uuid('Invalid product ID'),
    rating: z.number({ error: 'Missing rating' })
      .int('Rating must be an integer')
      .min(1, 'Minimum rating is 1 star')
      .max(5, 'Maximum rating is 5 stars'),
    comment: z.string()
      .max(500, 'Comment must not exceed 500 characters')
      .optional(),
  }),
});