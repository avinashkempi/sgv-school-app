import apiFetch, { setApiFetchToken, clearApiFetchToken } from '../../utils/apiFetch';
import storage from '../../utils/storage';

describe('apiFetch Utility', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearApiFetchToken();
    global.fetch = jest.fn();
    jest.spyOn(storage, 'getItem').mockResolvedValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('manages in-memory token overrides via setApiFetchToken and clearApiFetchToken', () => {
    setApiFetchToken('mem-token-123');
    // Token is set in memory
    clearApiFetchToken();
    // Token is cleared
  });

  it('intercepts demo mode mutations locally without firing network fetch', async () => {
    setApiFetchToken('demo-token');

    const response = await apiFetch('https://api.school.test/api/events', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Event' }),
      silent: true
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/(Demo|simulated)/i);
    // Real network fetch must NEVER be invoked in demo mode mutation
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('automatically attaches Bearer Authorization header when token exists', async () => {
    setApiFetchToken('active-jwt-token-999');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: async () => ({ success: true, data: [] })
    });

    await apiFetch('https://api.school.test/api/classes', {
      method: 'GET',
      silent: true
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = global.fetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.school.test/api/classes');
    expect(calledInit.headers.Authorization).toBe('Bearer active-jwt-token-999');
  });

  it('handles regular fetch without token when unauthenticated', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: async () => ({ status: 'online' })
    });

    const res = await apiFetch('https://api.school.test/api/health', {
      method: 'GET',
      silent: true
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, calledInit] = global.fetch.mock.calls[0];
    expect(calledInit.headers.Authorization).toBeUndefined();
  });
});
