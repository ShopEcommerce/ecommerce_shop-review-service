import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import pino from 'pino';

const logger = pino({ name: 'ReviewController' });

export class ReviewController {
  
  static async createReview(
    req: Request<{}, {}, { productId: string; rating: number; comment?: string }>, 
    res: Response
  ) {
    const userId = req.currentUser!.id;
    const { productId, rating, comment } = req.body;

    logger.info({ userId, productId, rating }, 'Received request to create new review');

    const review = await ReviewService.createReview(userId, productId, rating, comment);
    
    res.status(201).send({ message: 'Review created successfully', data: review });
  }

  static async getProductReviews(
    req: Request<{ productId: string }, {}, {}, { page?: string; limit?: string }>, 
    res: Response
  ) {
    const { productId } = req.params;
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '10');

    const reviews = await ReviewService.getProductReviews(productId, page, limit);
    res.status(200).send({ data: reviews, meta: { page, limit } });
  }

  
}