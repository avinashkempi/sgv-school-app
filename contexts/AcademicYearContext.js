import React, { createContext, useState, useContext, useEffect } from 'react';
import storage from '../utils/storage';
import { queryClient } from '../utils/queryClient';
import apiFetch from '../utils/apiFetch';
import apiConfig from '../config/apiConfig';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
    const [selectedYear, setSelectedYear] = useState(null); // Stores the full year object
    const [isYearReady, setIsYearReady] = useState(false);

    // Sync academic year with backend
    const syncYear = async () => {
        try {
            const token = await storage.getItem('@auth_token');
            if (!token) return;

            // Avoid network calls in demo mode
            if (token === 'demo-token') {
                const storedYear = await storage.getItem('selectedAcademicYear');
                if (!storedYear) {
                    const { DEMO_ACADEMIC_YEARS } = require('../constants/demoData');
                    const activeYear = DEMO_ACADEMIC_YEARS.find(y => y.isActive) || DEMO_ACADEMIC_YEARS[0];
                    setSelectedYear(activeYear);
                }
                return;
            }

            const userStr = await storage.getItem('@auth_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const isSuperAdmin = user?.role === 'super admin';

            const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`);
            if (response.ok) {
                const data = await response.json();
                const activeYear = data.find(y => y.isActive) || data.find(y => y.status === 'current') || data[0];

                if (!activeYear) return;

                const storedYearStr = await storage.getItem('selectedAcademicYear');
                const storedYear = storedYearStr ? JSON.parse(storedYearStr) : null;

                if (isSuperAdmin) {
                    // Super Admin: check if stored year is still valid in the list
                    const isValid = storedYear && data.some(y => y._id === storedYear._id);
                    if (isValid) {
                        // If stored year is valid, check if its status/isActive properties updated
                        const updatedStoredYear = data.find(y => y._id === storedYear._id);
                        if (JSON.stringify(storedYear) !== JSON.stringify(updatedStoredYear)) {
                            await storage.setItem('selectedAcademicYear', JSON.stringify(updatedStoredYear));
                            setSelectedYear(updatedStoredYear);
                        }
                    } else {
                        // Default to active year
                        await storage.setItem('selectedAcademicYear', JSON.stringify(activeYear));
                        setSelectedYear(activeYear);
                    }
                } else {
                    // Non-Super Admin: ALWAYS force current active year
                    if (!storedYear || storedYear._id !== activeYear._id || JSON.stringify(storedYear) !== JSON.stringify(activeYear)) {
                        await storage.setItem('selectedAcademicYear', JSON.stringify(activeYear));
                        setSelectedYear(activeYear);
                        queryClient.invalidateQueries();
                    }
                }
            }
        } catch (error) {
            console.error("Error syncing academic year:", error);
        }
    };

    // Load persisted year on startup
    useEffect(() => {
        const loadPersistedYear = async () => {
            try {
                const storedYear = await storage.getItem('selectedAcademicYear');
                if (storedYear) {
                    setSelectedYear(JSON.parse(storedYear));
                }
                await syncYear();
            } catch (error) {
                console.error("Error loading selected academic year:", error);
            } finally {
                setIsYearReady(true);
            }
        };

        loadPersistedYear();
    }, []);

    // Function to manually set the year (used by YearSelector dropdown)
    const setYear = async (yearObj) => {
        try {
            if (yearObj) {
                await storage.setItem('selectedAcademicYear', JSON.stringify(yearObj));
                setSelectedYear(yearObj);
                queryClient.invalidateQueries();
            } else {
                await storage.removeItem('selectedAcademicYear');
                setSelectedYear(null);
                queryClient.invalidateQueries();
            }
        } catch (error) {
            console.error("Error saving selected academic year:", error);
        }
    };

    return (
        <AcademicYearContext.Provider value={{
            selectedYear,
            setYear,
            syncYear,
            isYearReady
        }}>
            {children}
        </AcademicYearContext.Provider>
    );
};

export const useAcademicYear = () => {
    return useContext(AcademicYearContext);
};
