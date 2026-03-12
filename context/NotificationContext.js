import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import apiFetch from '../utils/apiFetch';
import storage from '../utils/storage';
import apiConfig from '../config/apiConfig';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/notifications`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                // Use the server-supplied unreadCount; fall back to local count if absent
                setUnreadCount(data.unreadCount ?? (data.notifications || []).filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error('[NotificationContext] Fetch Error:', error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let notificationListener = null;

        const init = async () => {
            const token = await storage.getItem('@auth_token');
            if (token && isMounted) {
                // Initial fetch
                fetchNotifications();

                // Listen for new push notifications (Foreground)
                notificationListener = Notifications.addNotificationReceivedListener(_notification => {
                    console.log('[FCM] Notification received in foreground, refetching...');
                    // Automatically refetch notifications to update UI
                    fetchNotifications();
                });
            }
        };

        init();

        return () => {
            isMounted = false;
            if (notificationListener) {
                notificationListener.remove();
            }
        };
    }, [fetchNotifications]);

    const markAsReadContext = async (id) => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/${id}/read`, {
                method: 'PUT'
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
                return true;
            }
        } catch (error) {
            console.error('[NotificationContext] Mark Read Error:', error);
        }
        return false;
    };

    const deleteNotificationContext = async (id) => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setNotifications(prev => prev.filter(n => n._id !== id));
                // Recalculate unread count
                setUnreadCount(prev => {
                    const deletedNotif = notifications.find(n => n._id === id);
                    if (deletedNotif && !deletedNotif.isRead && prev > 0) {
                        return prev - 1;
                    }
                    return prev;
                });
                return true;
            }
        } catch (error) {
            console.error('[NotificationContext] Delete Error:', error);
        }
        return false;
    };

    const markAllReadContext = async () => {
        try {
            const response = await apiFetch(`${apiConfig.baseUrl}/notifications/mark-all-read`, {
                method: 'PUT'
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                return true;
            }
        } catch (error) {
            console.error('[NotificationContext] Mark All Read Error:', error);
        }
        return false;
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            fetchNotifications,
            markAsRead: markAsReadContext,
            markAllRead: markAllReadContext,
            deleteNotification: deleteNotificationContext
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
