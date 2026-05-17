FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/teleshop-common-1.0.0.tgz ./shared/
COPY shared/teleshop-common-1.0.3.tgz ./shared/
COPY review-service/package*.json ./review-service/

WORKDIR /app/review-service
RUN npm ci

COPY review-service/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner

WORKDIR /app/review-service
ENV NODE_ENV=production

COPY --from=builder /app/review-service /app/review-service

EXPOSE 3007
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
