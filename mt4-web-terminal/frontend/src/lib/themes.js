export const THEME_COLORS = {
    // Default theme (Dark Blue)
    default: {
        name: 'Default',
        colors: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            accent: '#60A5FA',
            background: '#1E293B',
            foreground: '#F8FAFC',
            muted: '#64748B',
            border: '#334155'
        }
    },
    // Emerald theme
    emerald: {
        name: 'Emerald',
        colors: {
            primary: '#10B981',
            secondary: '#059669',
            accent: '#34D399',
            background: '#1A2F3B',
            foreground: '#F8FAFC',
            muted: '#64748B',
            border: '#2D4B5A'
        }
    },
    // Violet theme
    violet: {
        name: 'Violet',
        colors: {
            primary: '#8B5CF6',
            secondary: '#6D28D9',
            accent: '#A78BFA',
            background: '#2D1B69',
            foreground: '#F8FAFC',
            muted: '#7C7C9C',
            border: '#4C3399'
        }
    },
    // Amber theme
    amber: {
        name: 'Amber',
        colors: {
            primary: '#F59E0B',
            secondary: '#D97706',
            accent: '#FBBF24',
            background: '#2D2410',
            foreground: '#F8FAFC',
            muted: '#92754E',
            border: '#4D3F1D'
        }
    },
    // Rose theme
    rose: {
        name: 'Rose',
        colors: {
            primary: '#F43F5E',
            secondary: '#E11D48',
            accent: '#FB7185',
            background: '#2D1619',
            foreground: '#F8FAFC',
            muted: '#9C5260',
            border: '#4D2428'
        }
    }
};

export const THEME_PRESETS = {
    Default: {
        theme: 'dark',
        radius: 8,
        saturation: 100,
        colors: THEME_COLORS.default.colors
    },
    Modern: {
        theme: 'dark',
        radius: 16,
        saturation: 90,
        colors: THEME_COLORS.emerald.colors
    },
    Elegant: {
        theme: 'dark',
        radius: 12,
        saturation: 85,
        colors: THEME_COLORS.violet.colors
    },
    Minimal: {
        theme: 'dark',
        radius: 4,
        saturation: 80,
        colors: THEME_COLORS.amber.colors
    },
    Bold: {
        theme: 'dark',
        radius: 10,
        saturation: 120,
        colors: THEME_COLORS.rose.colors
    }
};