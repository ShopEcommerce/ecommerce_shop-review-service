import { ReviewRepository } from './review.repository';
import { BadRequestError, ForbiddenError, NotFoundError } from '@teleshop/common';
import { prisma } from '../../db/prisma';

export class ReviewService {
  
  static async createReview(userId: string, productId: string, rating: number, comment?: string) {
    const hasPurchased = await ReviewRepository.hasPurchased(userId, productId);
    if (!hasPurchased) {
      throw new ForbiddenError('Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận hàng thành công.');
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: { userId, productId }
      }
    });

    if (existingReview) {
      throw new BadRequestError('Bạn đã đánh giá sản phẩm này rồi.');
    }

    return ReviewRepository.createReview(userId, productId, rating, comment);
  }

  static async getProductReviews(productId: string, page: number, limit: number) {
    return ReviewRepository.getReviewsByProduct(productId, page, limit);
  }

  static async deleteReview(reviewId: string, userId: string) {
    const review = await ReviewRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Không tìm thấy đánh giá');

    if (review.userId !== userId) throw new ForbiddenError('Bạn không có quyền xóa đánh giá này');

    return ReviewRepository.deleteReview(reviewId, review.productId);
  }
}