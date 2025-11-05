// Centralized API configuration for the app.
// Keep environment-specific URLs here so the rest of the app doesn't hardcode them.

// Production API base
const BASE_URL = 'https://svg-school-backend.onrender.com/api';

// Local development (uncomment to use local server)
// const BASE_URL = 'http://localhost:5000/api';

const endpoints = {
  auth: {
    login: '/auth/login',
  },
  events: {
    list: '/events',
    create: '/events',
    getById: (id) => `/events/${id}`,
    update: (id) => `/events/${id}`,
    delete: (id) => `/events/${id}`,
  },
  schoolInfo: {
    get: '/school-info',
  },
  users: {
    list: '/users',
    create: '/users',
    getById: (id) => `/users/${id}`,
    update: (id) => `/users/${id}`,
    delete: (id) => `/users/${id}`,
  }
};

const url = (path) => `${BASE_URL}${path}`;

export default {
  baseUrl: BASE_URL,
  endpoints,
  url,
};
