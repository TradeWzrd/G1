import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'system',
    setTheme: () => null,
    radius: 8,
    setRadius: () => null,
    saturation: 100,
    setSaturation: () => null,
    activeTheme: 'Blue',
    setActiveTheme: () => null,
});

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    defaultRadius = 8,
    defaultSaturation = 100,
    defaultActiveTheme = 'Blue',
    ...props
}) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('theme') || defaultTheme;
        } catch {
            return defaultTheme;
        }
    });

    const [radius, setRadius] = useState(() => {
        try {
            return Number(localStorage.getItem('radius')) || defaultRadius;
        } catch {
            return defaultRadius;
        }
    });

    const [saturation, setSaturation] = useState(() => {
        try {
            return Number(localStorage.getItem('saturation')) || defaultSaturation;
        } catch {
            return defaultSaturation;
        }
    });

    const [activeTheme, setActiveTheme] = useState(() => {
        try {
            return localStorage.getItem('activeTheme') || defaultActiveTheme;
        } catch {
            return defaultActiveTheme;
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--radius', `${radius}px`);
    }, [radius]);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--saturation-factor', `${saturation}%`);
    }, [saturation]);

    useEffect(() => {
        try {
            localStorage.setItem('theme', theme);
            localStorage.setItem('radius', String(radius));
            localStorage.setItem('saturation', String(saturation));
            localStorage.setItem('activeTheme', activeTheme);
        } catch {
            // Ignore write errors.
        }
    }, [theme, radius, saturation, activeTheme]);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
        } else {
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
        }
    }, [theme]);

    const value = {
        theme,
        setTheme,
        radius,
        setRadius,
        saturation,
        setSaturation,
        activeTheme,
        setActiveTheme,
    };

    return (
        <ThemeContext.Provider {...props} value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};
