import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Response interceptor
api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.error || err.message;
    if (err.response?.status === 401) {
      localStorage.removeItem('cw_token');
      window.location.href = '/';
    }
    return Promise.reject(new Error(msg));
  }
);

export default api;
