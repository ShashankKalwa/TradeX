import axios from 'axios';
import * as mock from './mockApi.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('tradex.session');
      window.location.href = '/login';
    }
    const message = error.response?.data?.error?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(creds) {
  if (USE_MOCK) return mock.login(creds);
  const data = await client.post('/auth/login', creds);
  return data.data;
}

export async function register(creds) {
  if (USE_MOCK) return mock.register(creds);
  const data = await client.post('/auth/register', creds);
  return data.data;
}

export async function resendVerification() {
  if (USE_MOCK) return;
  const data = await client.post('/auth/resend-verification');
  return data.data;
}

export async function verifyEmail(token) {
  if (USE_MOCK) return;
  const data = await client.post('/auth/verify-email', { token });
  return data.data;
}

export async function fetchMe() {
  if (USE_MOCK) return;
  const data = await client.get('/auth/me');
  return data.data;
}

// ---------------------------------------------------------------------------
// Book / portfolio
// ---------------------------------------------------------------------------

export async function fetchBook(region) {
  if (USE_MOCK) return mock.fetchBook(region);
  const [portfolioData, ordersData, txData] = await Promise.all([
    client.get('/portfolio'),
    client.get('/trade/orders'),
    client.get('/trade/transactions')
  ]);

  const p = portfolioData.data;
  return {
    cash: p.cashBalance,
    transactions: txData.data.items || [],
    orders: ordersData.data.items || [],
    watchlist: p.watchlist || []
  };
}

export async function placeOrder({ region, symbol, side, type, qty, limitPrice, stopPrice, idempotencyKey, note }) {
  if (USE_MOCK) return mock.placeOrder(...arguments);
  
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
  
  if (type === 'MARKET') {
    const data = await client.post('/trade/market', {
      symbol, 
      side: side.toLowerCase(),
      quantity: Number(qty)
    }, { headers });
    // Translate to mock response shape
    return {
      status: 'FILLED',
      order: {
        id: data.data.transaction._id,
        symbol,
        side,
        type,
        qty: Number(qty),
        filledPrice: data.data.transaction.price,
        status: 'FILLED',
        resolvedAt: Date.now()
      },
      fill: {
        value: data.data.transaction.value,
        fee: data.data.transaction.fee
      }
    };
  }

  const data = await client.post('/trade/pending', {
    symbol,
    orderType: type.toLowerCase(),
    direction: side.toLowerCase(),
    quantity: Number(qty),
    targetPrice: limitPrice || stopPrice
  }, { headers });

  return { 
    status: 'PENDING', 
    order: {
      id: data.data._id,
      symbol,
      side,
      type,
      qty: Number(qty),
      status: 'PENDING'
    }
  };
}

export async function cancelOrder(region, orderId) {
  if (USE_MOCK) return mock.cancelOrder(region, orderId);
  const data = await client.delete(`/trade/orders/${orderId}`);
  return { order: data.data };
}

export async function sweepOrders(region) {
  if (USE_MOCK) return mock.sweepOrders(region);
  // Real backend does this via cron
  return { fills: [], cancels: [] };
}

export async function toggleWatch(region, symbol) {
  if (USE_MOCK) return mock.toggleWatch(region, symbol);
  const data = await client.post('/watchlist', { symbol });
  return { watchlist: data.data.watchlist };
}
