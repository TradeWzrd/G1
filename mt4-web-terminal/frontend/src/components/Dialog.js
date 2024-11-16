import React from 'react';

export const Dialog = ({ open, onClose, children, className }) => {
    if (!open) return null;

    return (
        <div className={className}>
            {children}
        </div>
    );
};

Dialog.Title = ({ children, className }) => (
    <h2 className={className}>
        {children}
    </h2>
);

Dialog.Panel = ({ children, className }) => (
    <div className={className}>
        {children}
    </div>
);
