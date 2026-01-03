const request = require('supertest');
const app = require('../src/app');

let authToken;
let userId;
let productId;
let orderId;

describe('Payment Flow Integration Test', () => {

  // Step 1: Register user
  test('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test@123'
      });

    expect(res.statusCode).toBe(201);
    authToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  // Step 2: Create product (as admin)
  test('should create a product', async () => {
    // First create admin user and get token
    // Then create product
    // Store productId
  });

  // Step 3: Add to cart
  test('should add product to cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId: productId,
        quantity: 2
      });

    expect(res.statusCode).toBe(200);
  });

  // Step 4: Create order
  test('should create order from cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        shippingAddress: {
          name: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Test Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001'
        },
        paymentMethod: 'razorpay'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.payment).toHaveProperty('razorpayOrderId');
    orderId = res.body.data.order.id;
  });

  // Step 5: Verify payment (simulated)
  test('should verify payment', async () => {
    // In real scenario, this would come from Razorpay callback
    // For testing, you need to simulate or mock the signature
  });
});