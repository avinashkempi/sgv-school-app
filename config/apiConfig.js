// Centralized API configuration for the app.
// Keep environment-specific URLs here so the rest of the app doesn't hardcode them.

// Production API base
const BASE_URL = 'https://sgv-school-backend.onrender.com/api';

// Local development (uncomment to use local server)
// const BASE_URL = 'http://localhost:10000/api';

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
  news: {
    list: '/news',
    create: '/news',
    getById: (id) => `/news/${id}`,
    update: (id) => `/news/${id}`,
    delete: (id) => `/news/${id}`,
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
  },
  fcm: {
    register: '/fcm/register',
    unregister: '/fcm/unregister',
  }
};

const url = (path) => `${BASE_URL}${path}`;

export default {
  baseUrl: BASE_URL,
  endpoints,
  url,
};
