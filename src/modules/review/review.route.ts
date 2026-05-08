import express, { RequestHandler } from 'express';
import { ReviewController } from './review.controller';
import { requireAuth, asyncHandler } from '@teleshop/common';
import { validateZod } from '../../middlewares/validate.middleware';
import { createReviewSchema } from './review.schema';

const router = express.Router();
const requireAuthMw = requireAuth as unknown as RequestHandler;

// PUBLIC ROUTES
router.get(
  '/:productId',
  asyncHandler(ReviewController.getProductReviews as any)
);

// PRIVATE ROUTES
router.post(
  '/',
  requireAuthMw,
  validateZod(createReviewSchema),
  asyncHandler(ReviewController.createReview as any)
);

export { router as reviewRouter };