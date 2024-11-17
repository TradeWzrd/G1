import React from 'react';
import { X } from 'lucide-react';
import { colors } from '../styles/colors';

export const Dialog = ({ isOpen, onClose, title, children, className = '' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                onClick={onClose}
            />

            {/* Dialog */}
            <div 
                className={`relative rounded-xl shadow-lg ${className}`}
                style={{ 
                    backgroundColor: colors.background.secondary,
                    borderColor: colors.border.light,
                    borderWidth: '1px'
                }}
            >
                {/* Header */}
                <div 
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: colors.border.light }}
                >
                    <h2 
                        className="text-lg font-medium"
                        style={{ color: colors.text.primary }}
                    >
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg transition-all duration-200 hover:bg-opacity-80"
                        style={{ 
                            backgroundColor: colors.background.hover,
                            color: colors.text.muted
                        }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div 
                    className="p-4"
                    style={{ 
                        backgroundColor: colors.background.primary,
                        color: colors.text.primary
                    }}
                >
                    {children}
                </div>
            </div>
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
