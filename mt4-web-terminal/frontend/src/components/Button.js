import React from 'react';

export const Button = React.forwardRef(({ 
    className = '',
    variant = 'default',
    size = 'default',
    children,
    disabled,
    type = 'button',
    ...props
}, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-magic-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
        default: 'bg-magic-primary text-white hover:bg-magic-primary/90',
        outline: 'border border-magic-border bg-transparent hover:bg-magic-hover',
        ghost: 'bg-transparent hover:bg-magic-hover',
        link: 'text-magic-primary underline-offset-4 hover:underline',
    };

    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
    };

    return (
        <button
            type={type}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            ref={ref}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';
