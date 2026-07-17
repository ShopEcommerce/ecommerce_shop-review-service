import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string({ error: 'Missing product ID' }).uuid('Invalid product ID'),
    rating: z
      .number({ error: 'Missing rating' })
      .int('Rating must be an integer')
      .min(1, 'Minimum rating is 1 star')
      .max(5, 'Maximum rating is 5 stars'),
    comment: z.string().max(500, 'Comment must not exceed 500 characters').optional(),
  }),
});

export const getProductReviewsSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
  }),
});

export const deleteReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().uuid('Invalid review ID'),
  }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type GetProductReviewsQuery = z.infer<typeof getProductReviewsSchema>['query'];
