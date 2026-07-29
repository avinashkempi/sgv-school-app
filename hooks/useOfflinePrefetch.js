import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';
import apiConfig from '../config/apiConfig';
import storage from '../utils/storage';
import { CACHE_TIERS } from '../utils/cacheConfig';

// Minimum interval between prefetch runs (5 minutes)
const PREFETCH_COOLDOWN_MS = 5 * 60 * 1000;

export default function useOfflinePrefetch() {
    const queryClient = useQueryClient();
    const lastPrefetchRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        let isMounted = true;

        const prefetchAll = async () => {
            // Cooldown check — don't prefetch if we did it recently
            const now = Date.now();
            if (now - lastPrefetchRef.current < PREFETCH_COOLDOWN_MS) {
                return;
            }
            lastPrefetchRef.current = now;

            try {
                // Only run if we have a token
                const token = await storage.getItem('@auth_token');
                if (!token || token === 'demo-token') return;

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

                // Prefetch common core data that applies globally
                prefetch(['events'], '/events', CACHE_TIERS.MODERATE);
                prefetch(['notifications'], '/notifications', CACHE_TIERS.REAL_TIME);
                prefetch(['schoolInfo'], apiConfig.endpoints.schoolInfo.get, CACHE_TIERS.STATIC);

                // Fetch user info first to safely determine role before prefetching role-restricted endpoints
                const meRes = await apiFetch(`${apiConfig.baseUrl}/auth/me`, { silent: true });
                if (!isMounted || !meRes.ok) return;
                const meData = await meRes.json();
                const role = meData?.user?.role;

                if (!role) return;

                // Pre-fetch based on role to avoid triggering 403 Forbidden errors
                if (role === 'student') {
                    const userId = meData?.user?._id;
                    prefetch(['studentDashboard'], '/dashboard/student', CACHE_TIERS.MODERATE);
                    prefetch(['myLeaves'], '/leaves/my-leaves', CACHE_TIERS.MODERATE);
                    prefetch(['studentTimetable'], '/timetable/my-timetable', CACHE_TIERS.STABLE);
                    if (userId) {
                        prefetch(['studentFees', userId], `/fees/student/${userId}`, CACHE_TIERS.STABLE);
                        prefetch(['studentAttendanceSummary', userId], `/attendance/student/${userId}/summary`, CACHE_TIERS.MODERATE);
                    }
                    prefetch(['studentExamSchedule'], '/exams/schedule/student', CACHE_TIERS.STABLE);
                } else if (role === 'teacher') {
                    prefetch(['teacherDashboard'], '/teachers/my-classes-and-subjects', CACHE_TIERS.MODERATE);
                    prefetch(['teacherSubjects'], '/teachers/my-subjects', CACHE_TIERS.STABLE);
                    prefetch(['myLeaves'], '/leaves/my-leaves', CACHE_TIERS.MODERATE);
                    prefetch(['schoolTimetable'], '/timetable/all', CACHE_TIERS.STABLE);
                } else if (role === 'admin' || role === 'super admin') {
                    prefetch(['adminClassesInit'], '/classes/admin/init', CACHE_TIERS.STABLE);
                }

            } catch (err) {
                console.log('[Prefetch] Failed to execute offline prefetching:', err);
            }
        };

        // Delay prefetching slightly (1.5s) to allow initial screen render
        // and critical queries to finish without network contention
        const timer = setTimeout(() => {
            if (isMounted) {
                prefetchAll();
            }
        }, 1500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [queryClient]);
}
