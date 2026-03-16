import axios from 'axios';

// 🚀 CLOUD DEPLOYMENT URL 🚀
// Once you deploy the backend to Render, replace the http://localhost... URL below
// with your actual Render URL (e.g., 'https://drone-backend.onrender.com')
export const API_URL = 'https://rajthespaceman-drone-api.hf.space';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getHistory = async () => {
  const response = await api.get('/detect/history');
  return response.data.history;
};

export const clearHistory = async () => {
  const response = await api.delete('/detect/history');
  return response.data;
};

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/detect/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getWebSocketUrl = () => {
  const wsBase = API_URL
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return `${wsBase}/detect/stream?token=${localStorage.getItem('token') || ''}`;
};

export default api;
