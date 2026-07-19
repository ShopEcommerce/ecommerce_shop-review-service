import { prisma } from '../../db/prisma';
import { DomainEvent, Subjects } from '@teleshop/common';
import crypto from 'crypto';

type ReviewCreatedEventData = Extract<DomainEvent, { subject: Subjects.ReviewCreated }>['data'];
type ReviewDeletedEventData = Extract<DomainEvent, { subject: Subjects.ReviewDeleted }>['data'];

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

  static async createReview(
    userId: string,
    productId: string,
    rating: number,
    comment?: string,
    correlationId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { userId, productId, rating, comment },
      });

      const payload: ReviewCreatedEventData = {
        id: crypto.randomUUID(),
        type: Subjects.ReviewCreated,
        occurredAt: new Date().toISOString(),
        version: 1,
        correlationId,
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
    const [data, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async deleteReview(id: string, correlationId?: string) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.delete({ where: { id } });

      const payload: ReviewDeletedEventData = {
        id: crypto.randomUUID(),
        type: Subjects.ReviewDeleted,
        occurredAt: new Date().toISOString(),
        version: 1,
        correlationId,
        productId: review.productId,
        rating: review.rating,
        reviewId: review.id,
      };

      await tx.outboxEvent.create({
        data: {
          subject: Subjects.ReviewDeleted,
          payload: payload as any,
        },
      });

      return review;
    });
  }
}
