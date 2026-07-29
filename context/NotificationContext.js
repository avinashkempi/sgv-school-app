import React, { createContext, useContext, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';
import storage from '../utils/storage';
import apiConfig from '../config/apiConfig';
import { useApiQuery } from '../hooks/useApi';
import { CACHE_TIERS } from '../utils/cacheConfig';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const queryClient = useQueryClient();

    // ── Fetch notifications via React Query ──
    // This query is now persisted to AsyncStorage via PersistQueryClientProvider,
    // so notifications are available immediately on app open (even offline).
    const {
        data: notificationData,
        refetch,
    } = useApiQuery(
        ['notifications'],
        `${apiConfig.baseUrl}/notifications`,
        {
            ...CACHE_TIERS.REAL_TIME,
            // Don't fetch if not authenticated (prevents 401 on login screen)
            enabled: true,
        }
    );

    const notifications = notificationData?.notifications || [];
    const unreadCount = notificationData?.unreadCount
        ?? notifications.filter(n => !n.isRead).length;

    // ── Listen for push notifications to invalidate cache ──
    useEffect(() => {
        let notificationListener = null;

        const init = async () => {
            const token = await storage.getItem('@auth_token');
            if (token) {
                notificationListener = Notifications.addNotificationReceivedListener(_notification => {
                    if (__DEV__) {
                        console.log('[FCM] Notification received in foreground, invalidating cache...');
                    }
                    // Invalidate the query — React Query will refetch automatically
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                });
            }
        };

        init();

        return () => {
            if (notificationListener) {
                notificationListener.remove();
            }
        };
    }, [queryClient]);

    // ── Optimistic mutations ──

    const markAsRead = useCallback(async (id) => {
        try {
            // Optimistic update
            queryClient.setQueryData(['notifications'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    notifications: (old.notifications || []).map(n =>
                        n._id === id ? { ...n, isRead: true } : n
                    ),
                    unreadCount: Math.max(0, (old.unreadCount || 0) - 1),
                };
            });

            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/${id}/read`, {
                method: 'PUT',
            });

            if (response.ok) {
                return true;
            } else {
                // Revert on failure
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
        } catch (error) {
            console.error('[NotificationContext] Mark Read Error:', error);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        return false;
    }, [queryClient]);

    const deleteNotification = useCallback(async (id) => {
        // Snapshot for rollback
        const previousData = queryClient.getQueryData(['notifications']);

        try {
            // Optimistic update
            queryClient.setQueryData(['notifications'], (old) => {
                if (!old) return old;
                const deletedNotif = (old.notifications || []).find(n => n._id === id);
                const wasUnread = deletedNotif && !deletedNotif.isRead;
                return {
                    ...old,
                    notifications: (old.notifications || []).filter(n => n._id !== id),
                    unreadCount: wasUnread
                        ? Math.max(0, (old.unreadCount || 0) - 1)
                        : (old.unreadCount || 0),
                };
            });

            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                return true;
            } else {
                // Rollback
                queryClient.setQueryData(['notifications'], previousData);
            }
        } catch (error) {
            console.error('[NotificationContext] Delete Error:', error);
            queryClient.setQueryData(['notifications'], previousData);
        }
        return false;
    }, [queryClient]);

    const markAllRead = useCallback(async () => {
        try {
            // Optimistic update
            queryClient.setQueryData(['notifications'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    notifications: (old.notifications || []).map(n => ({ ...n, isRead: true })),
                    unreadCount: 0,
                };
            });

            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/mark-all-read`, {
                method: 'PUT',
            });

            if (response.ok) {
                return true;
            } else {
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }
        } catch (error) {
            console.error('[NotificationContext] Mark All Read Error:', error);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        return false;
    }, [queryClient]);

    const fetchNotifications = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            fetchNotifications,
            markAsRead,
            markAllRead,
            deleteNotification,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
