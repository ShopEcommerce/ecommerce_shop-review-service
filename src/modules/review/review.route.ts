import express, { RequestHandler } from 'express';
import { ReviewController } from './review.controller';
import { requireAuth, asyncHandler } from '@teleshop/common';
import { validateZod } from '../../middlewares/validate.middleware';
import { createReviewSchema, deleteReviewSchema, getProductReviewsSchema } from './review.schema';

const router = express.Router();
const requireAuthMw = requireAuth as unknown as RequestHandler;

router.get(
  '/:productId',
  validateZod(getProductReviewsSchema),
  asyncHandler(ReviewController.getProductReviews as any),
);

router.post(
  '/',
  requireAuthMw,
  validateZod(createReviewSchema),
  asyncHandler(ReviewController.createReview as any),
);

router.delete(
  '/:reviewId',
  requireAuthMw,
  validateZod(deleteReviewSchema),
  asyncHandler(ReviewController.deleteReview as any),
);

export { router as reviewRouter };
