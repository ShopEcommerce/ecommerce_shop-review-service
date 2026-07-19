import { Subjects } from '@teleshop/common';
import { OrderCompletedListener } from '../order-completed-listener';
import { InboxRepository } from '../../../modules/inbox/inbox.repository';
import { prisma } from '../../../db/prisma';

jest.mock('../../../modules/inbox/inbox.repository');
jest.mock('../../../db/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
  closePrisma: jest.fn(),
}));

describe('OrderCompletedListener', () => {
  const listener = new OrderCompletedListener({} as any);
  const tx = {
    purchaseRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const baseEvent = {
    id: 'evt-order-completed-1',
    type: Subjects.OrderCompleted,
    occurredAt: '2026-07-17T12:00:00.000Z',
    version: 1,
    correlationId: 'corr-review-1',
    orderId: '11111111-1111-1111-1111-111111111111',
    userId: 'user-1',
    items: [{ productId: '22222222-2222-2222-2222-222222222222', quantity: 1 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.purchaseRecord.findUnique.mockResolvedValue(null);
    tx.purchaseRecord.create.mockResolvedValue(undefined);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));
  });

  it('skips processing when the event was already handled', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(true);

    await listener.onMessage(baseEvent as any, {} as any);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates missing purchase records and marks the event as processed', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(baseEvent as any, {} as any);

    expect(tx.purchaseRecord.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.purchaseRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        productId: '22222222-2222-2222-2222-222222222222',
        orderId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      'evt-order-completed-1',
      Subjects.OrderCompleted,
      tx,
    );
  });

  it('accepts legacy eventId payload for compatibility', async () => {
    (InboxRepository.isEventProcessed as jest.Mock).mockResolvedValue(false);
    (InboxRepository.markAsProcessed as jest.Mock).mockResolvedValue(undefined);

    await listener.onMessage(
      {
        ...baseEvent,
        id: undefined,
        eventId: 'legacy-order-completed-event-id',
      } as any,
      {} as any,
    );

    expect(InboxRepository.markAsProcessed).toHaveBeenCalledWith(
      'legacy-order-completed-event-id',
      Subjects.OrderCompleted,
      tx,
    );
  });

  it('throws for invalid payload', async () => {
    await expect(
      listener.onMessage(
        {
          id: 'evt-order-completed-2',
          type: Subjects.OrderCompleted,
          occurredAt: '2026-07-17T12:00:00.000Z',
          version: 1,
          orderId: '11111111-1111-1111-1111-111111111111',
        } as any,
        {} as any,
      ),
    ).rejects.toThrow('Invalid OrderCompleted payload');
  });
});
