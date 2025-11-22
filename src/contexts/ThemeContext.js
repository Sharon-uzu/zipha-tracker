// src/contexts/ThemeContext.js (New File)

import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the Context object
export const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
    // 1. Initialize state from localStorage or default to 'dark'
    const [theme, setTheme] = useState(
        () => localStorage.getItem('theme') || 'dark'
    );

    // 2. Use useEffect to update the <body> class and localStorage
    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }, [theme]); // Runs whenever 'theme' changes

    // Function to toggle between 'light' and 'dark'
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook for easier access
export const useTheme = () => useContext(ThemeContext);