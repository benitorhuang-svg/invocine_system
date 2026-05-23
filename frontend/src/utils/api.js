/**
 * API Fetch wrapper with JWT injection and uniform error parsing
 */
const API_BASE = '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.message || data.error?.message || 'API 請求失敗');
      error.status = res.status;
      error.code = data.code || data.error?.code || 'ERR_UNKNOWN_ERROR';
      throw error;
    }

    return data.data; // Standard wrap data format: { success: true, data: [...] }
  } catch (err) {
    console.error(`API Error on [${config.method || 'GET'}] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  get: (url, options) => request(url, { method: 'GET', ...options }),
  post: (url, body, options) => request(url, { method: 'POST', body, ...options }),
  put: (url, body, options) => request(url, { method: 'PUT', body, ...options }),
  delete: (url, options) => request(url, { method: 'DELETE', ...options }),
};
