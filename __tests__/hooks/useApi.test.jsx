import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApiQuery, useApiMutation, createApiMutationFn } from '../../hooks/useApi';
import apiFetch from '../../utils/apiFetch';
import * as offlineQueueModule from '../../utils/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

jest.mock('../../utils/apiFetch');
jest.mock('../../utils/offlineQueue');

describe('useApi Hook Suite', () => {
  let queryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, networkMode: 'always' },
        mutations: { retry: false, networkMode: 'always' },
      },
    });
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useApiQuery', () => {
    it('successfully fetches and returns data for 200 response', async () => {
      apiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [{ id: 1, name: 'Notice 1' }] }),
      });

      const { result } = await renderHook(
        () => useApiQuery(['notices'], 'https://api.school.com/api/notices'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        success: true,
        data: [{ id: 1, name: 'Notice 1' }],
      });
      expect(apiFetch).toHaveBeenCalledWith('https://api.school.com/api/notices');
    });

    it('returns null and skips network call if URL contains undefined or null', async () => {
      const { result } = await renderHook(
        () => useApiQuery(['class-details', undefined], 'https://api.school.com/api/classes/undefined'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it('throws ApiError with isAuthError=true on 401 response', async () => {
      apiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token has expired' }),
      });

      const { result } = await renderHook(
        () => useApiQuery(['user-profile'], 'https://api.school.com/api/users/me', { retry: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error.status).toBe(401);
      expect(result.current.error.isAuthError).toBe(true);
      expect(result.current.error.message).toBe('Token has expired');
    });

    it('wraps fetch network failures into offline ApiError', async () => {
      apiFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const { result } = await renderHook(
        () => useApiQuery(['timetable'], 'https://api.school.com/api/timetable', { retry: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error.message).toBe('You are currently offline');
      expect(result.current.error.status).toBe(0);
    });

    it('returns null instead of throwing when silent=true on network error', async () => {
      apiFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      const { result } = await renderHook(
        () => useApiQuery(['badges'], 'https://api.school.com/api/badges', { silent: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('createApiMutationFn', () => {
    it('executes POST request with serialized body and headers', async () => {
      apiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, id: 'item-101' }),
      });

      const mutationFn = createApiMutationFn('https://api.school.com/api/leaves', 'POST');
      const result = await mutationFn({ reason: 'Sick leave', days: 2 });

      expect(apiFetch).toHaveBeenCalledWith('https://api.school.com/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Sick leave', days: 2 }),
      });
      expect(result).toEqual({ success: true, id: 'item-101' });
    });

    it('does not flag 401 as isAuthError when url is auth login endpoint', async () => {
      apiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid phone or password' }),
      });

      const loginMutationFn = createApiMutationFn('https://api.school.com/api/auth/login', 'POST');

      await expect(loginMutationFn({ phone: '9999999999', password: 'bad' }))
        .rejects.toMatchObject({
          message: 'Invalid phone or password',
          status: 401,
          isAuthError: false,
        });
    });
  });

  describe('useApiMutation with Offline Queue', () => {
    it('enqueues mutation when offline and queueConfig is provided', async () => {
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });
      jest.spyOn(offlineQueueModule, 'enqueueAction').mockResolvedValueOnce({
        id: 'offline-action-1',
        type: 'APPLY_LEAVE',
      });

      const onSuccess = jest.fn();

      const { result } = await renderHook(
        () =>
          useApiMutation({
            offlineQueue: {
              type: 'APPLY_LEAVE',
              url: 'https://api.school.com/api/leaves',
              description: 'Applying for leave',
            },
            mutationFn: jest.fn(),
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ reason: 'Family Function' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(offlineQueueModule.enqueueAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APPLY_LEAVE',
          description: 'Applying for leave',
          body: { reason: 'Family Function' },
        })
      );
      expect(result.current.data.offlineQueued).toBe(true);
    });
  });
});
