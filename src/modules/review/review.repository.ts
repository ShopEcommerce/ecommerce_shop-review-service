import { prisma } from '../../db/prisma';
import { Subjects } from '@teleshop/common';
import crypto from 'crypto';

export class ReviewRepository {
  static async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const record = await prisma.purchaseRecord.findFirst({
      where: { userId, productId },
    });
    return !!record;
  }

  static async findById(id: string) {
    return prisma.review.findUnique({ where: { id } });
  }

  static async createReview(userId: string, productId: string, rating: number, comment?: string) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { userId, productId, rating, comment },
      });

      const payload = {
        eventId: crypto.randomUUID(),
        type: Subjects.ReviewCreated,
        occurredAt: new Date().toISOString(),
        productId,
        rating,
        reviewId: review.id,
      };

      await tx.outboxEvent.create({
        data: {
          subject: Subjects.ReviewCreated,
          payload: payload as any,
        },
      });

      return review;
    });
  }

  static async getReviewsByProduct(productId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return prisma.review.findMany({
      where: { productId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteReview(id: string) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.delete({ where: { id } });

      await tx.outboxEvent.create({
        data: {
          subject: 'review:deleted',
          payload: {
            eventId: crypto.randomUUID(),
            type: 'review:deleted',
            occurredAt: new Date().toISOString(),
            productId: review.productId,
            reviewId: review.id,
          } as any,
        },
      });

      return review;
    });
  }
}
