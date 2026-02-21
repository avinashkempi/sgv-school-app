import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
    const [selectedYear, setSelectedYear] = useState(null); // Stores the full year object
    const [isYearReady, setIsYearReady] = useState(false);

    // Load persisted year on startup
    useEffect(() => {
        const loadPersistedYear = async () => {
            try {
                const storedYear = await AsyncStorage.getItem('selectedAcademicYear');
                if (storedYear) {
                    setSelectedYear(JSON.parse(storedYear));
                }
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
                await AsyncStorage.setItem('selectedAcademicYear', JSON.stringify(yearObj));
                setSelectedYear(yearObj);
            } else {
                await AsyncStorage.removeItem('selectedAcademicYear');
                setSelectedYear(null);
            }
        } catch (error) {
            console.error("Error saving selected academic year:", error);
        }
    };

    return (
        <AcademicYearContext.Provider value={{
            selectedYear,
            setYear,
            isYearReady
        }}>
            {children}
        </AcademicYearContext.Provider>
    );
};

export const useAcademicYear = () => {
    return useContext(AcademicYearContext);
};
