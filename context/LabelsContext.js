import React, { createContext, useContext } from "react";
import useLabels from "../hooks/useLabels";

const LabelsContext = createContext(null);

/**
 * LabelsProvider — wraps the app to share labels across all screens.
 *
 * The heavy lifting (fetch, cache, merge, fallback) is done by useLabels().
 * This context simply exposes { t, labels } to all descendants via useLabel().
 */
export function LabelsProvider({ children }) {
  const labelsData = useLabels();

  return (
    <LabelsContext.Provider value={labelsData}>
      {children}
    </LabelsContext.Provider>
  );
}

/**
 * useLabel() — consume labels from context.
 *
 * Returns { t, labels, isLoading, error, refetch }.
 *
 * Usage:
 *   const { t } = useLabel();
 *   <Text>{t('common.save')}</Text>
 */
export function useLabel() {
  const context = useContext(LabelsContext);
  if (!context) {
    throw new Error("useLabel must be used within a LabelsProvider");
  }
  return context;
}
