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
  schoolInfo: {
    get: '/school-info',
  },
  labels: {
    get: '/labels',
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
    registerPublic: '/fcm/register-public',
    unregister: '/fcm/unregister',
  },
  subjects: {
    list: '/subjects',
    create: '/subjects',
    getById: (id) => `/subjects/${id}`,
    update: (id) => `/subjects/${id}`,
    delete: (id) => `/subjects/${id}`,
    usage: (id) => `/subjects/${id}/usage`,
  },
  posts: {
    list: '/posts',
    create: '/posts',
    getById: (id) => `/posts/${id}`,
    update: (id) => `/posts/${id}`,
    delete: (id) => `/posts/${id}`,
    togglePin: (id) => `/posts/${id}/pin`,
  },
  vibes: {
    list: '/vibes',
    getById: (id) => `/vibes/${id}`,
    create: '/vibes',
    update: (id) => `/vibes/${id}`,
    delete: (id) => `/vibes/${id}`,
    toggleLike: (id) => `/vibes/${id}/like`,
    getLikes: (id) => `/vibes/${id}/likes`,
    getComments: (id) => `/vibes/${id}/comments`,
    addComment: (id) => `/vibes/${id}/comments`,
    deleteComment: (commentId) => `/vibes/comments/${commentId}`,
    toggleBookmark: (id) => `/vibes/${id}/bookmark`,
    myVibes: '/vibes/user/my-vibes',
    saved: '/vibes/user/saved',
    highlights: '/vibes/highlights',
    spotlight: '/vibes/spotlight',
    userVibes: (userId) => `/vibes/user/${userId}`,
    adminPending: '/vibes/admin/pending',
    adminReview: (id) => `/vibes/admin/${id}/review`,
    adminPin: (id) => `/vibes/admin/${id}/pin`,
    adminSpotlight: (id) => `/vibes/admin/${id}/spotlight`,
  },
};

const url = (path) => `${BASE_URL}${path}`;

export default {
  baseUrl: BASE_URL,
  endpoints,
  url,
};
