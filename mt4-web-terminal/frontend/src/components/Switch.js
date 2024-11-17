import React from 'react';

export const Switch = ({ checked, onChange }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`
                relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-magic-primary focus:ring-offset-2
                ${checked ? 'bg-magic-primary' : 'bg-magic-muted'}
            `}
            onClick={() => onChange(!checked)}
        >
            <span
                aria-hidden="true"
                className={`
                    pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out
                    ${checked ? 'translate-x-4' : 'translate-x-0'}
                `}
            />
        </button>
    );
};
