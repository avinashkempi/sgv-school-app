import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from "react";
import storage from "../utils/storage";
import { queryClient } from "../utils/queryClient";
import apiFetch from "../utils/apiFetch";
import apiConfig from "../config/apiConfig";

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
  const [selectedYear, setSelectedYear] = useState(null); // Stores the full year object
  const [isYearReady, setIsYearReady] = useState(false);
  // Track the userId to detect account switches
  const lastUserIdRef = useRef(null);

  // Sync academic year with backend
  const syncYear = async () => {
    try {
      const token = await storage.getItem("@auth_token");
      if (!token) return;

      // Avoid network calls in demo mode
      if (token === "demo-token") {
        const storedYear = await storage.getItem("selectedAcademicYear");
        if (!storedYear) {
          const { DEMO_ACADEMIC_YEARS } = require("../constants/demoData");
          const activeYear =
            DEMO_ACADEMIC_YEARS.find((y) => y.isActive) ||
            DEMO_ACADEMIC_YEARS[0];
          setSelectedYear(activeYear);
        }
        return;
      }

      const userStr = await storage.getItem("@auth_user");
      const user = userStr ? JSON.parse(userStr) : null;
      const currentUserId = user?.id || user?._id;
      const isSuperAdmin = user?.role === "super admin";

      // Detect account switch — reset year if different user
      if (
        lastUserIdRef.current &&
        currentUserId &&
        lastUserIdRef.current !== String(currentUserId)
      ) {
        if (__DEV__)
          console.log(
            "[AcademicYearContext] Account switch detected, resetting year"
          );
        await storage.removeItem("selectedAcademicYear");
        setSelectedYear(null);
      }
      lastUserIdRef.current = currentUserId ? String(currentUserId) : null;

      const response = await apiFetch(`${apiConfig.baseUrl}/academic-year`);
      if (response.ok) {
        const data = await response.json();
        await storage.setItem("@cached_academic_years", JSON.stringify(data));
        const activeYear =
          data.find((y) => y.isActive) ||
          data.find((y) => y.status === "current") ||
          data[0];

        if (!activeYear) return;

        const storedYearStr = await storage.getItem("selectedAcademicYear");
        const storedYear = storedYearStr ? JSON.parse(storedYearStr) : null;

        if (isSuperAdmin) {
          // Super Admin: check if stored year is still valid in the list
          const isValid =
            storedYear && data.some((y) => y._id === storedYear._id);
          if (isValid) {
            // If stored year is valid, check if its status/isActive properties updated
            const updatedStoredYear = data.find(
              (y) => y._id === storedYear._id
            );
            if (
              JSON.stringify(storedYear) !== JSON.stringify(updatedStoredYear)
            ) {
              await storage.setItem(
                "selectedAcademicYear",
                JSON.stringify(updatedStoredYear)
              );
              setSelectedYear(updatedStoredYear);
            }
          } else {
            // Default to active year
            await storage.setItem(
              "selectedAcademicYear",
              JSON.stringify(activeYear)
            );
            setSelectedYear(activeYear);
          }
        } else {
          // Non-Super Admin: ALWAYS force current active year
          if (
            !storedYear ||
            storedYear._id !== activeYear._id ||
            JSON.stringify(storedYear) !== JSON.stringify(activeYear)
          ) {
            await storage.setItem(
              "selectedAcademicYear",
              JSON.stringify(activeYear)
            );
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
        const storedYear = await storage.getItem("selectedAcademicYear");
        if (storedYear) {
          setSelectedYear(JSON.parse(storedYear));
        } else {
          // Offline fallback: try to load active year from cached academic years list
          const cachedYears = await storage.getItem("@cached_academic_years");
          if (cachedYears) {
            const parsed = JSON.parse(cachedYears);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const active = parsed.find((y) => y.isActive) || parsed[0];
              if (active) {
                setSelectedYear(active);
                await storage.setItem("selectedAcademicYear", JSON.stringify(active));
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading selected academic year:", error);
      } finally {
        setIsYearReady(true);
      }

      // Sync with backend non-blockingly in background
      syncYear().catch((err) => {
        console.log(
          "[AcademicYearContext] Background sync skipped/failed:",
          err
        );
      });
    };

    loadPersistedYear();
  }, []);

  // Function to manually set the year (used by YearSelector dropdown)
  const setYear = async (yearObj) => {
    try {
      if (yearObj) {
        await storage.setItem("selectedAcademicYear", JSON.stringify(yearObj));
        setSelectedYear(yearObj);
        queryClient.invalidateQueries();
      } else {
        await storage.removeItem("selectedAcademicYear");
        setSelectedYear(null);
        queryClient.invalidateQueries();
      }
    } catch (error) {
      console.error("Error saving selected academic year:", error);
    }
  };

  // Allow external updates (like from fetch interceptor) and manual resets
  useEffect(() => {
    activeYearSetter = setSelectedYear;
    globalSyncYear = syncYear;
    return () => {
      activeYearSetter = null;
      globalSyncYear = null;
    };
  }, []);

  return (
    <AcademicYearContext.Provider
      value={{
        selectedYear,
        setYear,
        syncYear,
        isYearReady,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

let activeYearSetter = null;
let globalSyncYear = null;

export const notifyAcademicYearChange = (newYear) => {
  if (activeYearSetter) {
    activeYearSetter(newYear);
  }
};

export const resetAcademicYearState = () => {
  if (activeYearSetter) {
    activeYearSetter(null);
  }
};

export const triggerAcademicYearSync = () => {
  if (globalSyncYear) {
    globalSyncYear().catch((err) => {
      console.log("[AcademicYearContext] manual sync failed:", err);
    });
  }
};

export const useAcademicYear = () => {
  return useContext(AcademicYearContext);
};
