import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../../../app';
import { ReviewService } from '../review.service';

jest.mock('../review.service');

const VALID_PRODUCT_ID = '987fcdeb-51a2-43d7-9012-345678901234';
const VALID_REVIEW_ID = '123e4567-e89b-12d3-a456-426614174000';

const getAuthCookie = () => {
  const payload = {
    id: 'customer-user-id',
    email: 'customer@test.com',
    role: 'CUSTOMER',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!);
  const session = { jwt: token };
  const sessionJSON = JSON.stringify(session);
  const base64 = Buffer.from(sessionJSON).toString('base64');

  return [`session=${base64}`];
};

describe('Review API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/reviews/:productId', () => {
    it('returns paginated product reviews', async () => {
      (ReviewService.getProductReviews as jest.Mock).mockResolvedValue({
        data: [{ id: VALID_REVIEW_ID, productId: VALID_PRODUCT_ID, rating: 5 }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await request(app).get(`/api/reviews/${VALID_PRODUCT_ID}`).expect(200);

      expect(ReviewService.getProductReviews).toHaveBeenCalledWith(VALID_PRODUCT_ID, 1, 10);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(1);
    });

    it('returns 400 for invalid product id', async () => {
      await request(app).get('/api/reviews/not-a-uuid').expect(400);
    });
  });

  describe('POST /api/reviews', () => {
    it('creates a review for authenticated users', async () => {
      (ReviewService.createReview as jest.Mock).mockResolvedValue({
        id: VALID_REVIEW_ID,
        productId: VALID_PRODUCT_ID,
        rating: 5,
        comment: 'Great product',
      });

      const response = await request(app)
        .post('/api/reviews')
        .set('Cookie', getAuthCookie())
        .send({
          productId: VALID_PRODUCT_ID,
          rating: 5,
          comment: 'Great product',
        })
        .expect(201);

      expect(ReviewService.createReview).toHaveBeenCalledWith(
        'customer-user-id',
        VALID_PRODUCT_ID,
        5,
        'Great product',
        expect.any(String),
      );
      expect(response.body.data.id).toBe(VALID_REVIEW_ID);
    });
  });

  describe('DELETE /api/reviews/:reviewId', () => {
    it('deletes a review for its owner', async () => {
      (ReviewService.deleteReview as jest.Mock).mockResolvedValue({
        id: VALID_REVIEW_ID,
      });

      await request(app)
        .delete(`/api/reviews/${VALID_REVIEW_ID}`)
        .set('Cookie', getAuthCookie())
        .expect(200);

      expect(ReviewService.deleteReview).toHaveBeenCalledWith(
        VALID_REVIEW_ID,
        'customer-user-id',
        expect.any(String),
      );
    });

    it('returns 400 for invalid review id', async () => {
      await request(app)
        .delete('/api/reviews/invalid-id')
        .set('Cookie', getAuthCookie())
        .expect(400);
    });
  });
});
