import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'OrderCompletedListener' });

export class OrderCompletedListener extends BaseListener<any> {
  readonly subject = Subjects.OrderCompleted;
  queueGroupName = QueueGroupNames.ReviewService;

  async onMessage(data: any, _msg: Message) {
    const { eventId, orderId, userId, items } = data;
    const correlationId = data.correlationId || 'N/A';

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
