import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';
import apiConfig from '../config/apiConfig';
import { CACHE_TIERS } from '../utils/cacheConfig';
import { useAuth } from '../context/AuthContext';

// Minimum interval between prefetch runs (5 minutes)
const PREFETCH_COOLDOWN_MS = 5 * 60 * 1000;

export default function useOfflinePrefetch() {
    const queryClient = useQueryClient();
    const lastPrefetchRef = useRef(0);
    const { isAuthenticated, isDemo, userId, token } = useAuth();

    useEffect(() => {
        // Don't prefetch if not authenticated or in demo mode
        if (!isAuthenticated || isDemo || !userId) return;

        let isMounted = true;

        const prefetchAll = async () => {
            // Cooldown check — don't prefetch if we did it recently
            const now = Date.now();
            if (now - lastPrefetchRef.current < PREFETCH_COOLDOWN_MS) {
                return;
            }
            lastPrefetchRef.current = now;

            try {
                // Helper to prefetch a single endpoint with proper cache tier
                const prefetch = (key, path, tier = CACHE_TIERS.MODERATE) => {
                    queryClient.prefetchQuery({
                        queryKey: key,
                        queryFn: async () => {
                            const response = await apiFetch(`${apiConfig.baseUrl}${path}`, { silent: true });
                            if (!response.ok) {
                                throw new Error('Network error during prefetch');
                            }
                            return response.json();
                        },
                        staleTime: tier.staleTime,
                    });
                };

                // Prefetch common core data (school-wide, not user-scoped)
                prefetch(['events'], '/events', CACHE_TIERS.MODERATE);
                prefetch(['schoolInfo'], apiConfig.endpoints.schoolInfo.get, CACHE_TIERS.STATIC);

                // Prefetch user-scoped notifications
                prefetch(['notifications', userId], '/notifications', CACHE_TIERS.REAL_TIME);

                // Fetch user info to determine role for role-specific prefetching
                const meRes = await apiFetch(`${apiConfig.baseUrl}/auth/me`, { silent: true });
                if (!isMounted || !meRes.ok) return;
                const meData = await meRes.json();
                const role = meData?.user?.role;

                if (!role) return;

                // Pre-fetch based on role to avoid triggering 403 Forbidden errors
                // All user-specific keys are scoped with userId
                if (role === 'student') {
                    prefetch(['studentDashboard', userId], '/dashboard/student', CACHE_TIERS.MODERATE);
                    prefetch(['studentLeaves', userId], '/leaves/my-leaves', CACHE_TIERS.MODERATE);
                    prefetch(['studentTimetable', userId], '/timetable/my-timetable', CACHE_TIERS.STABLE);
                    if (userId && userId !== 'undefined') {
                        prefetch(['studentFees', userId], `/fees/student/${userId}`, CACHE_TIERS.STABLE);
                        prefetch(['studentAttendanceSummary', userId], `/attendance/student/${userId}/summary`, CACHE_TIERS.MODERATE);
                    }
                    prefetch(['studentExamSchedule', userId], '/exams/schedule/student', CACHE_TIERS.STABLE);
                } else if (role === 'teacher') {
                    prefetch(['teacherDashboard', userId], '/teachers/my-classes-and-subjects', CACHE_TIERS.MODERATE);
                    prefetch(['teacherClasses', userId], '/classes/my-classes', CACHE_TIERS.STABLE);
                    prefetch(['teacherMyLeaves', userId], '/leaves/my-leaves', CACHE_TIERS.MODERATE);
                    prefetch(['schoolTimetable'], '/timetable/all', CACHE_TIERS.STABLE);
                } else if (role === 'admin' || role === 'super admin') {
                    prefetch(['adminClassesInit'], '/classes/admin/init', CACHE_TIERS.STABLE);
                }

            } catch (err) {
                console.log('[Prefetch] Failed to execute offline prefetching:', err);
            }
        };

        // Wait for all navigation and animations to finish before prefetching
        // to avoid frame drops on Android
        const interactionTask = InteractionManager.runAfterInteractions(() => {
            if (isMounted) {
                prefetchAll();
            }
        });

        return () => {
            isMounted = false;
            interactionTask.cancel();
        };
    }, [queryClient, isAuthenticated, isDemo, userId]);
}
