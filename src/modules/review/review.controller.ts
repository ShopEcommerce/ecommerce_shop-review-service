import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { CreateReviewInput, GetProductReviewsQuery } from './review.schema';
import pino from 'pino';

const logger = pino({ name: 'ReviewController' });

export class ReviewController {
  static async createReview(req: Request<unknown, unknown, CreateReviewInput>, res: Response) {
    const userId = req.currentUser!.id;
    const { productId, rating, comment } = req.body;
    const correlationId = req.correlationId;

    logger.info({ userId, productId, rating }, 'Received request to create new review');

    const review = await ReviewService.createReview(
      userId,
      productId,
      rating,
      comment,
      correlationId,
    );

    res.status(201).send({ message: 'Review created successfully', data: review });
  }

  static async getProductReviews(
    req: Request<{ productId: string }, unknown, unknown, GetProductReviewsQuery>,
    res: Response,
  ) {
    const { productId } = req.params;
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const reviews = await ReviewService.getProductReviews(productId, page, limit);
    res.status(200).send(reviews);
  }

  static async deleteReview(req: Request<{ reviewId: string }, unknown, unknown>, res: Response) {
    const userId = req.currentUser!.id;
    const { reviewId } = req.params;
    const correlationId = req.correlationId;

    await ReviewService.deleteReview(reviewId, userId, correlationId);
    res.status(200).send({ message: 'Review deleted successfully' });
  }
}
