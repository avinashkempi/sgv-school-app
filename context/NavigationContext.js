import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useCallback,
} from "react";

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const scrollListenersRef = useRef(new Map());

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  const subscribeScrollToTop = useCallback((route, callback) => {
    if (!scrollListenersRef.current.has(route)) {
      scrollListenersRef.current.set(route, new Set());
    }
    scrollListenersRef.current.get(route).add(callback);

    return () => {
      const listeners = scrollListenersRef.current.get(route);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          scrollListenersRef.current.delete(route);
        }
      }
    };
  }, []);

  const emitScrollToTop = useCallback((route) => {
    const listeners = scrollListenersRef.current.get(route);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback();
        } catch {
          // Ignore listener errors
        }
      });
    }
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        subscribeScrollToTop,
        emitScrollToTop,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigationContext = () => useContext(NavigationContext);
