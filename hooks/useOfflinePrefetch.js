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
                prefetch(['auth', 'me'], '/auth/me');

                // Pre-fetch based on role (simple heuristic: attempt to fetch student dashboard 
                // and if it succeeds, fetch student context, else it will just fail silently)
                // Note: To be more precise, we would decode the JWT or use auth context to check role.
                // For now, we defensively prefetch common paths that students/teachers rely on.
                
                // Student Data
                prefetch(['studentDashboard'], '/dashboard/student');
                prefetch(['myLeaves'], '/leaves/my-leaves');
                prefetch(['timetable'], '/timetable/my-timetable');
                prefetch(['studentFees'], '/fees/student');
                prefetch(['studentExams'], '/exams/schedule/student');
                
                // Teacher Data (these will naturally fail/noop if the user is a student)
                prefetch(['teacherDashboard'], '/dashboard/teacher');
                prefetch(['teacherSubjects'], '/teachers/my-subjects');
                
                
                // Admin Data
                prefetch(['adminClassesInit'], '/classes/admin/init');
                
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
