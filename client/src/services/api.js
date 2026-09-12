const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_URL}/api`;

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('eesa_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'An error occurred during the request');
  }

  return data;
};
