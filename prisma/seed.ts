import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info('Seeding Review Service Database...');

  await prisma.outboxEvent.deleteMany({});
  await prisma.processedEvent.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.purchaseRecord.deleteMany({});

  await prisma.purchaseRecord.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000701',
        userId: '00000000-0000-0000-0000-000000000003',
        productId: '00000000-0000-0000-0000-000000000201',
        orderId: '00000000-0000-0000-0000-000000000401',
      },
      {
        id: '00000000-0000-0000-0000-000000000702',
        userId: '00000000-0000-0000-0000-000000000003',
        productId: '00000000-0000-0000-0000-000000000202',
        orderId: '00000000-0000-0000-0000-000000000401',
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000703',
        userId: '00000000-0000-0000-0000-000000000003',
        productId: '00000000-0000-0000-0000-000000000201',
        rating: 5,
        comment: 'Great phone for demo seed data.',
      },
      {
        id: '00000000-0000-0000-0000-000000000704',
        userId: '00000000-0000-0000-0000-000000000003',
        productId: '00000000-0000-0000-0000-000000000202',
        rating: 4,
        comment: 'Solid laptop with good performance.',
      },
    ],
  });

  logger.info('Review seed complete: purchase records and reviews created.');
}

main()
  .catch((error) => {
    logger.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
