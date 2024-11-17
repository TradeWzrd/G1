// Professional Trading Platform Color Palette

export const colors = {
    // Base Background Colors
    background: {
        primary: '#0A0B0D',     // Main background
        secondary: '#12131A',   // Card/Container background
        tertiary: '#1A1B23',    // Elevated elements
        overlay: '#000000B3',   // 70% opacity black for modals
    },

    // Text Colors
    text: {
        primary: '#FFFFFF',     // Primary text
        secondary: '#B3B3B3',   // Secondary text
        muted: '#737373',       // Muted text
        inverse: '#0A0B0D',     // Text on light backgrounds
    },

    // Border Colors
    border: {
        light: '#FFFFFF1A',     // 10% white
        medium: '#FFFFFF33',    // 20% white
        focus: '#3B82F620',     // Focus state
    },

    // Action Colors
    action: {
        buy: {
            base: '#10B981',    // Buy button base
            hover: '#059669',   // Buy button hover
            bg: '#10B98110',    // Buy button background
        },
        sell: {
            base: '#EF4444',    // Sell button base
            hover: '#DC2626',   // Sell button hover
            bg: '#EF444410',    // Sell button background
        },
    },

    // Status Colors
    status: {
        success: {
            base: '#10B981',
            bg: '#10B98110',
            border: '#10B98120',
        },
        warning: {
            base: '#F59E0B',
            bg: '#F59E0B10',
            border: '#F59E0B20',
        },
        error: {
            base: '#EF4444',
            bg: '#EF444410',
            border: '#EF444420',
        },
        info: {
            base: '#3B82F6',
            bg: '#3B82F610',
            border: '#3B82F620',
        },
    },

    // Interactive Elements
    interactive: {
        hover: '#FFFFFF0A',     // Hover state background
        active: '#FFFFFF14',    // Active state background
        focus: '#3B82F640',     // Focus ring color
    },

    // Chart Colors
    chart: {
        grid: '#FFFFFF0A',      // Chart grid lines
        axis: '#FFFFFF14',      // Chart axes
        tooltip: '#1A1B23F2',   // Chart tooltip background
    },
};

// Common color combinations for components
export const componentColors = {
    card: {
        bg: colors.background.secondary,
        border: colors.border.light,
        hoverBorder: colors.border.medium,
    },
    input: {
        bg: colors.background.tertiary,
        border: colors.border.light,
        focusBorder: colors.border.focus,
        text: colors.text.primary,
        placeholder: colors.text.muted,
    },
    button: {
        primary: {
            bg: colors.status.info.base,
            hover: colors.status.info.border,
            text: colors.text.primary,
        },
        secondary: {
            bg: colors.background.tertiary,
            hover: colors.interactive.hover,
            text: colors.text.secondary,
        },
    },
};

// Utility function to add opacity to hex colors
export const addOpacity = (hex, opacity) => {
    const rgb = hex.match(/^#(.{2})(.{2})(.{2})$/).slice(1)
        .map(c => parseInt(c, 16));
    return `rgba(${rgb.join(', ')}, ${opacity})`;
};
