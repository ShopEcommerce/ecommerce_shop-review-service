import { ReviewRepository } from './review.repository';
import { BadRequestError, ForbiddenError, NotFoundError } from '@teleshop/common';
import { prisma } from '../../db/prisma';

export class ReviewService {
  static async createReview(
    userId: string,
    productId: string,
    rating: number,
    comment?: string,
    correlationId?: string,
  ) {
    const hasPurchased = await ReviewRepository.hasPurchased(userId, productId);
    if (!hasPurchased) {
      throw new ForbiddenError(
        'You can only review a product after purchasing and successfully receiving it.',
      );
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existingReview) {
      throw new BadRequestError('You have already reviewed this product.');
    }

    return ReviewRepository.createReview(userId, productId, rating, comment, correlationId);
  }

  static async getProductReviews(productId: string, page: number, limit: number) {
    return ReviewRepository.getReviewsByProduct(productId, page, limit);
  }

  static async deleteReview(reviewId: string, userId: string, correlationId?: string) {
    const review = await ReviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Review not found');

    if (review.userId !== userId) throw new ForbiddenError('You are not the owner of this review');

    return ReviewRepository.deleteReview(reviewId, correlationId);
  }
}
