const request = require('supertest');
const app = require('../src/app');

describe('Search API Tests', () => {

  describe('GET /api/search', () => {
    it('should search products', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ q: 'laptop', page: 1, limit: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('products');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should return error for short query', async () => {
      const res = await request(app)
        .get('/api/search')
        .query({ q: 'a' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/search/autocomplete', () => {
    it('should return suggestions', async () => {
      const res = await request(app)
        .get('/api/search/autocomplete')
        .query({ q: 'lap' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/search/trending', () => {
    it('should return trending searches', async () => {
      const res = await request(app)
        .get('/api/search/trending');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/search/nlp', () => {
    it('should parse natural language query', async () => {
      const res = await request(app)
        .get('/api/search/nlp')
        .query({ q: 'red shoes under 2000' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('parsed');
      expect(res.body.data.parsed.filters).toHaveProperty('maxPrice');
    });
  });
});