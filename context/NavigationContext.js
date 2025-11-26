import React, { createContext, useState, useContext } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const openDrawer = () => setIsDrawerOpen(true);
    const closeDrawer = () => setIsDrawerOpen(false);
    const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

    return (
        <NavigationContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigationContext = () => useContext(NavigationContext);
