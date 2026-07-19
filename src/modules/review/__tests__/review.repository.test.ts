import crypto from 'crypto';
import { Subjects } from '@teleshop/common';
import { prisma } from '../../../db/prisma';
import { ReviewRepository } from '../review.repository';

describe('ReviewRepository integration', () => {
  beforeEach(async () => {
    await prisma.outboxEvent.deleteMany();
    await prisma.processedEvent.deleteMany();
    await prisma.review.deleteMany();
    await prisma.purchaseRecord.deleteMany();
  });

  it('returns true when a matching purchase record exists', async () => {
    const userId = crypto.randomUUID();
    const productId = crypto.randomUUID();

    await prisma.purchaseRecord.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        productId,
        orderId: crypto.randomUUID(),
      },
    });

    await expect(ReviewRepository.hasPurchased(userId, productId)).resolves.toBe(true);
    await expect(ReviewRepository.hasPurchased(userId, crypto.randomUUID())).resolves.toBe(false);
  });

  it('creates a review and writes ReviewCreated to outbox', async () => {
    const userId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();

    const review = await ReviewRepository.createReview(
      userId,
      productId,
      5,
      'Excellent product',
      correlationId,
    );

    expect(review.userId).toBe(userId);
    expect(review.productId).toBe(productId);
    expect(review.rating).toBe(5);

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { subject: Subjects.ReviewCreated },
    });

    expect(outboxEvents).toHaveLength(1);

    const payload = outboxEvents[0].payload as {
      id: string;
      type: string;
      version: number;
      correlationId?: string;
      productId: string;
      rating: number;
      reviewId: string;
    };

    expect(payload.type).toBe(Subjects.ReviewCreated);
    expect(payload.version).toBe(1);
    expect(payload.correlationId).toBe(correlationId);
    expect(payload.productId).toBe(productId);
    expect(payload.rating).toBe(5);
    expect(payload.reviewId).toBe(review.id);
    expect(payload.id).toBeTruthy();
  });

  it('returns paginated reviews with metadata', async () => {
    const productId = crypto.randomUUID();
    const otherProductId = crypto.randomUUID();

    await prisma.review.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          productId,
          rating: 5,
          comment: 'First review',
        },
        {
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          productId,
          rating: 4,
          comment: 'Second review',
        },
        {
          id: crypto.randomUUID(),
          userId: crypto.randomUUID(),
          productId: otherProductId,
          rating: 3,
          comment: 'Other product review',
        },
      ],
    });

    const result = await ReviewRepository.getReviewsByProduct(productId, 1, 10);

    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
    expect(result.meta.totalPages).toBe(1);
    expect(result.data.every((review) => review.productId === productId)).toBe(true);
  });

  it('deletes a review and writes ReviewDeleted to outbox', async () => {
    const review = await prisma.review.create({
      data: {
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        rating: 4,
        comment: 'Will be deleted',
      },
    });

    const correlationId = crypto.randomUUID();
    const deleted = await ReviewRepository.deleteReview(review.id, correlationId);

    expect(deleted.id).toBe(review.id);

    const persistedReview = await prisma.review.findUnique({
      where: { id: review.id },
    });
    expect(persistedReview).toBeNull();

    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { subject: Subjects.ReviewDeleted },
    });

    expect(outboxEvents).toHaveLength(1);

    const payload = outboxEvents[0].payload as {
      id: string;
      type: string;
      version: number;
      correlationId?: string;
      productId: string;
      rating: number;
      reviewId: string;
    };

    expect(payload.type).toBe(Subjects.ReviewDeleted);
    expect(payload.version).toBe(1);
    expect(payload.correlationId).toBe(correlationId);
    expect(payload.productId).toBe(review.productId);
    expect(payload.rating).toBe(review.rating);
    expect(payload.reviewId).toBe(review.id);
    expect(payload.id).toBeTruthy();
  });

  it('finds a review by id', async () => {
    const review = await prisma.review.create({
      data: {
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        rating: 5,
        comment: 'Lookup me',
      },
    });

    await expect(ReviewRepository.findById(review.id)).resolves.toMatchObject({
      id: review.id,
      productId: review.productId,
      rating: 5,
    });
  });
});
