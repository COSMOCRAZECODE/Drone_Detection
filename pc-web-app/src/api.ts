import axios from 'axios';

export const API_BASE_URL = 'https://rajthespaceman-drone-api.hf.space';

const api = axios.create({
  baseURL: API_BASE_URL,
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

export const deleteHistory = async () => {
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
  const wsBase = API_BASE_URL
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return `${wsBase}/detect/stream?token=${localStorage.getItem('token') || ''}`;
};

export default api;
