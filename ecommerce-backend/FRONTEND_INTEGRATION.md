# Frontend Integration Guide - E-commerce Backend API

This guide will help you integrate the e-commerce backend API with your frontend application built in Lovable.

## Table of Contents

- [Base Configuration](#base-configuration)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)
- [State Management](#state-management)
- [Common Patterns](#common-patterns)

---

## Base Configuration

### Base URL

```
Development: http://localhost:5001
Production: https://your-api-domain.com
```

### Environment Variables

Create a `.env` file or configure environment variables in Lovable:

```env
VITE_API_BASE_URL=http://localhost:5001
# or
REACT_APP_API_BASE_URL=http://localhost:5001
```

### API Response Format

All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message"
}
```

---

## Authentication

### Authentication Flow

1. **Register/Login** → Get `accessToken` and `refreshToken`
2. **Store tokens** in localStorage or secure storage
3. **Include token** in Authorization header for protected routes
4. **Refresh token** when access token expires

### Register User

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123",
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": "customer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "Password123"
}
```

**Response:** Same structure as register

### Refresh Token

**Endpoint:** `POST /api/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

## API Endpoints

### Products

#### Get All Products (Public)

**Endpoint:** `GET /api/products`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `categoryId` (optional)
- `minPrice` (optional)
- `maxPrice` (optional)
- `search` (optional)
- `sortBy` (optional: createdAt, price, name)
- `sortOrder` (optional: ASC, DESC)

**Example:**
```
GET /api/products?page=1&limit=20&minPrice=1000&maxPrice=50000&sortBy=price&sortOrder=ASC
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

#### Get Product by ID (Public)

**Endpoint:** `GET /api/products/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Product Name",
    "description": "Product description",
    "price": 999.99,
    "discountPrice": 799.99,
    "stockQuantity": 50,
    "images": ["url1", "url2"],
    "category": {
      "id": "uuid",
      "name": "Category Name"
    }
  }
}
```

### Cart (Requires Authentication)

#### Get Cart

**Endpoint:** `GET /api/cart`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "quantity": 2,
        "product": {
          "id": "uuid",
          "name": "Product Name",
          "price": 999.99,
          "discountPrice": 799.99,
          "images": ["url1"]
        }
      }
    ],
    "total": "1599.98",
    "count": 1
  }
}
```

#### Add to Cart

**Endpoint:** `POST /api/cart/items`

**Request:**
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

#### Update Cart Item

**Endpoint:** `PUT /api/cart/items/:id`

**Request:**
```json
{
  "quantity": 3
}
```

#### Remove from Cart

**Endpoint:** `DELETE /api/cart/items/:id`

#### Clear Cart

**Endpoint:** `DELETE /api/cart`

### Orders (Requires Authentication)

#### Create Order

**Endpoint:** `POST /api/orders`

**Request:**
```json
{
  "shippingAddress": {
    "name": "John Doe",
    "phone": "9876543210",
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "billingAddress": { ... }, // Optional, defaults to shippingAddress
  "paymentMethod": "razorpay", // or "cod"
  "notes": "Please deliver before 5 PM"
}
```

**Response (Razorpay):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": { ... },
    "payment": {
      "id": "razorpay_order_id",
      "amount": 100000,
      "currency": "INR",
      "key": "razorpay_key_id"
    }
  }
}
```

**Response (COD):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": { ... }
  }
}
```

#### Verify Payment (Razorpay)

**Endpoint:** `POST /api/orders/verify-payment`

**Request:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx"
}
```

#### Get User Orders

**Endpoint:** `GET /api/orders`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `status` (optional: pending, confirmed, shipped, delivered, cancelled)

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

#### Get Order by ID

**Endpoint:** `GET /api/orders/:id`

#### Cancel Order

**Endpoint:** `PUT /api/orders/:id/cancel`

**Request:**
```json
{
  "cancelReason": "Changed my mind"
}
```

### Search (Public)

#### Search Products

**Endpoint:** `GET /api/search`

**Query Parameters:**
- `q` (required, min 2 characters)
- `page` (default: 1)
- `limit` (default: 20)
- `categoryId` (optional)
- `minPrice` (optional)
- `maxPrice` (optional)
- `brands` (optional, comma-separated)
- `tags` (optional, comma-separated)
- `inStock` (optional, true/false)
- `sortBy` (optional: relevance, price_asc, price_desc)

**Example:**
```
GET /api/search?q=laptop&minPrice=20000&maxPrice=50000&sortBy=price_asc
```

#### Autocomplete

**Endpoint:** `GET /api/search/autocomplete`

**Query Parameters:**
- `q` (required, min 2 characters)
- `limit` (default: 5)

**Response:**
```json
{
  "success": true,
  "data": ["laptop", "laptops", "laptop bag"]
}
```

#### Search Suggestions

**Endpoint:** `GET /api/search/suggestions`

**Query Parameters:**
- `q` (required, min 2 characters)
- `limit` (default: 10)

#### Trending Searches

**Endpoint:** `GET /api/search/trending`

**Query Parameters:**
- `limit` (default: 10)

#### Get Search Filters

**Endpoint:** `GET /api/search/filters`

**Query Parameters:**
- `q` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [...],
    "brands": [...],
    "priceRanges": [...],
    "priceStats": {
      "avg": 25000,
      "min": 5000,
      "max": 100000
    }
  }
}
```

#### Natural Language Search

**Endpoint:** `GET /api/search/nlp`

**Query Parameters:**
- `q` (required, e.g., "show me laptops under 50000")
- `page` (default: 1)
- `limit` (default: 20)

### Admin Endpoints (Requires Admin Role)

All admin endpoints require:
- Authentication token
- User role must be `admin`

#### Admin Products

- `GET /api/admin/products` - Get all products (admin)
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product

#### Admin Categories

- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

#### Admin Orders

- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/stats` - Get order statistics
- `PUT /api/admin/orders/:id/status` - Update order status

**Update Order Status Request:**
```json
{
  "status": "shipped", // pending, confirmed, shipped, delivered, cancelled
  "trackingNumber": "TRACK123456",
  "estimatedDelivery": "2024-12-30",
  "notes": "Shipped via FedEx"
}
```

#### Admin Users

- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

#### Admin Analytics

- `GET /api/admin/analytics` - Get analytics dashboard data
- `GET /api/admin/analytics/sales` - Get sales analytics
- `GET /api/admin/analytics/products` - Get product analytics

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message",
  "errors": [  // For validation errors
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common Error Scenarios

1. **Token Expired (401)**
   - Call refresh token endpoint
   - Update stored tokens
   - Retry original request

2. **Validation Error (400)**
   - Display field-specific errors to user
   - Highlight invalid fields in form

3. **Forbidden (403)**
   - User doesn't have required role
   - Redirect to appropriate page

---

## Integration Examples

### Axios/Fetch Setup

```javascript
// api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// Create axios instance
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          // Retry original request
          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api.request(error.config);
        } catch (refreshError) {
          // Refresh failed, logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Authentication Hook (React)

```javascript
// useAuth.js
import { useState, useEffect } from 'react';
import api from './api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Verify token and get user info
      // You might need to decode JWT or call a /me endpoint
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user);
    return data;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return { user, login, logout, loading };
};
```

### Product Listing Component

```javascript
// ProductList.jsx
import { useState, useEffect } from 'react';
import api from './api';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    minPrice: '',
    maxPrice: '',
    categoryId: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      );
      const { data } = await api.get(`/api/products?${params}`);
      setProducts(data.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Cart Management

```javascript
// useCart.js
import { useState, useEffect } from 'react';
import api from './api';

export const useCart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/cart');
      setCart(data.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      const { data } = await api.post('/api/cart/items', {
        productId,
        quantity,
      });
      await fetchCart(); // Refresh cart
      return data;
    } catch (error) {
      throw error;
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const { data } = await api.put(`/api/cart/items/${itemId}`, {
        quantity,
      });
      await fetchCart();
      return data;
    } catch (error) {
      throw error;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const { data } = await api.delete(`/api/cart/items/${itemId}`);
      await fetchCart();
      return data;
    } catch (error) {
      throw error;
    }
  };

  return {
    cart,
    loading,
    fetchCart,
    addToCart,
    updateCartItem,
    removeFromCart,
  };
};
```

### Order Creation with Razorpay

```javascript
// Checkout.jsx
import { useState } from 'react';
import api from './api';

const Checkout = ({ cart }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (shippingAddress, paymentMethod) => {
    try {
      setLoading(true);
      const { data } = await api.post('/api/orders', {
        shippingAddress,
        paymentMethod,
      });

      if (paymentMethod === 'razorpay' && data.data.payment) {
        // Initialize Razorpay
        const options = {
          key: data.data.payment.key,
          amount: data.data.payment.amount,
          currency: data.data.payment.currency,
          order_id: data.data.payment.id,
          name: 'Your Store',
          description: 'Order Payment',
          handler: async (response) => {
            // Verify payment
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        // COD order - redirect to success page
        window.location.href = `/orders/${data.data.order.id}`;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const { data } = await api.post('/api/orders/verify-payment', paymentData);
      window.location.href = `/orders/${data.data.orderId}`;
    } catch (error) {
      console.error('Payment verification failed:', error);
    }
  };

  return (
    // Your checkout form
  );
};
```

### Search Implementation

```javascript
// SearchBar.jsx
import { useState, useEffect } from 'react';
import api from './api';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await api.get(`/api/search/autocomplete?q=${query}&limit=5`);
      setSuggestions(data.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSearch = async () => {
    try {
      const { data } = await api.get(`/api/search?q=${query}`);
      setResults(data.data.products);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={index} onClick={() => setQuery(suggestion)}>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## State Management

### Recommended Approach

For Lovable/React applications, consider using:

1. **Context API** for global state (auth, cart)
2. **React Query / TanStack Query** for server state
3. **Zustand** for simple global state management

### Example with React Query

```javascript
// queries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

export const useProducts = (filters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const { data } = await api.get(`/api/products?${params}`);
      return data.data;
    },
  });
};

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ productId, quantity }) => {
      const { data } = await api.post('/api/cart/items', {
        productId,
        quantity,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
    },
  });
};
```

---

## Common Patterns

### Loading States

```javascript
const { data, isLoading, error } = useProducts(filters);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <ProductList products={data.products} />;
```

### Error Boundaries

```javascript
// ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Form Validation

```javascript
const handleSubmit = async (formData) => {
  try {
    await api.post('/api/orders', formData);
  } catch (error) {
    if (error.response?.status === 400) {
      // Handle validation errors
      const errors = error.response.data.errors;
      errors.forEach((err) => {
        setFieldError(err.field, err.message);
      });
    }
  }
};
```

---

## Testing Your Integration

### Health Check

```javascript
const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  const data = await response.json();
  console.log('API Status:', data);
};
```

### Test Authentication Flow

1. Register a new user
2. Login with credentials
3. Make authenticated request (e.g., get cart)
4. Test token refresh
5. Test logout

---

## Additional Resources

- **Postman Collection**: Import `postman/*.json` files for API testing
- **Environment Setup**: Ensure backend is running on configured port
- **CORS**: Backend allows all origins in development, configure `ALLOWED_ORIGINS` for production

---

## Support

For issues or questions:
1. Check API health endpoint: `GET /health`
2. Verify authentication tokens are valid
3. Check network tab for request/response details
4. Review backend logs for server-side errors

---

**Last Updated:** December 2024

