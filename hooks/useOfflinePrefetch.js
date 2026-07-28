import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiFetch from '../utils/apiFetch';
import apiConfig from '../config/apiConfig';
import storage from '../utils/storage';

export default function useOfflinePrefetch() {
    const queryClient = useQueryClient();

    useEffect(() => {
        let isMounted = true;

        const prefetchAll = async () => {
            try {
                // Only run if we have a token
                const token = await storage.getItem('@auth_token');
                if (!token) return;

                // Helper to prefetch a single endpoint
                const prefetch = (key, path) => {
                    queryClient.prefetchQuery({
                        queryKey: key,
                        queryFn: async () => {
                            const response = await apiFetch(`${apiConfig.baseUrl}${path}`);
                            if (!response.ok) {
                                throw new Error('Network error during prefetch');
                            }
                            return response.json();
                        },
                        staleTime: 1000 * 60 * 5, // 5 minutes
                    });
                };

                // Prefetch common core data that applies globally
                prefetch(['events'], '/events');
                prefetch(['notifications'], '/notifications');

                // Fetch user info first to safely determine role before prefetching role-restricted endpoints
                const meRes = await apiFetch(`${apiConfig.baseUrl}/auth/me`);
                if (!isMounted || !meRes.ok) return;
                const meData = await meRes.json();
                const role = meData?.user?.role;

                if (!role) return;

                // Pre-fetch based on role to avoid triggering 403 Forbidden errors
                if (role === 'student') {
                    const userId = meData?.user?._id;
                    prefetch(['studentDashboard'], '/dashboard/student');
                    prefetch(['myLeaves'], '/leaves/my-leaves');
                    prefetch(['timetable'], '/timetable/my-timetable');
                    if (userId) {
                        prefetch(['studentFees', userId], `/fees/student/${userId}`);
                    }
                    prefetch(['studentExams'], '/exams/schedule/student');
                } else if (role === 'teacher') {
                    prefetch(['teacherDashboard'], '/dashboard/teacher');
                    prefetch(['teacherSubjects'], '/teachers/my-subjects');
                    prefetch(['myLeaves'], '/leaves/my-leaves');
                } else if (role === 'admin' || role === 'super admin') {
                    prefetch(['adminClassesInit'], '/classes/admin/init');
                }
                
            } catch (err) {
                console.log('[Prefetch] Failed to execute offline prefetching:', err);
            }
        };

        prefetchAll();

        return () => {
            isMounted = false;
        };
    }, [queryClient]);
}
