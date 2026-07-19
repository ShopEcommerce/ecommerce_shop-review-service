import { Message } from 'amqplib';
import { BaseListener, DomainEvent, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'OrderCompletedListener' });

type OrderCompletedEvent = Extract<DomainEvent, { subject: Subjects.OrderCompleted }>;

export class OrderCompletedListener extends BaseListener<OrderCompletedEvent> {
  readonly subject = Subjects.OrderCompleted;
  queueGroupName = QueueGroupNames.ReviewService;

  async onMessage(data: OrderCompletedEvent['data'], _msg: Message) {
    const eventId = data.id || (data as OrderCompletedEvent['data'] & { eventId?: string }).eventId;
    const { orderId, userId, items } = data;
    const correlationId = data.correlationId || 'N/A';

    if (!eventId || !orderId || !userId || !items) {
      throw new Error(
        'Invalid OrderCompleted payload: missing event identifier, orderId, userId, or items',
      );
    }

    logger.info(
      { correlationId, eventId, orderId },
      'Received signal: Order completed. Updating review permissions.',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) {
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const exists = await tx.purchaseRecord.findUnique({
            where: {
              userId_productId_orderId: {
                userId,
                productId: item.productId,
                orderId,
              },
            },
          });

          if (!exists) {
            await tx.purchaseRecord.create({
              data: {
                userId,
                productId: item.productId,
                orderId,
              },
            });
          }
        }

        await InboxRepository.markAsProcessed(eventId, this.subject, tx);
      });

      logger.info({ correlationId, orderId }, 'Successfully updated review permissions.');
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error occurred while processing OrderCompleted event');
      throw error;
    }
  }
}
