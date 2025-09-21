import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export function setAuthToken(token) {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

export const api = {
  async register(email, password) {
    const { data } = await axios.post(`${API_BASE}/auth/register`, { email, password });
    return data;
  },
  async login(email, password) {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return data;
  },
  async createOrder(payload) {
    const { data } = await axios.post(`${API_BASE}/orders`, payload);
    return data;
  },
  async myOrders() {
    const { data } = await axios.get(`${API_BASE}/orders`);
    return data;
  },
  async adminAll() {
    const { data } = await axios.get(`${API_BASE}/orders/admin/all`);
    return data;
  },
  async adminSetStatus(id, status) {
    const { data } = await axios.put(`${API_BASE}/orders/admin/${id}/status`, { status });
    return data;
  }
};

// Initialize token from storage
const token = localStorage.getItem('token');
if (token) setAuthToken(token);

