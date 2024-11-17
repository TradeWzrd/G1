import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { colors } from '../styles/colors';

const getToastStyles = (type) => {
    switch (type) {
        case 'success':
            return {
                background: colors.status.success.bg,
                border: colors.status.success.border,
                text: colors.status.success.base,
                icon: <CheckCircle className="w-5 h-5" />
            };
        case 'error':
            return {
                background: colors.status.error.bg,
                border: colors.status.error.border,
                text: colors.status.error.base,
                icon: <AlertCircle className="w-5 h-5" />
            };
        case 'warning':
            return {
                background: colors.status.warning.bg,
                border: colors.status.warning.border,
                text: colors.status.warning.base,
                icon: <AlertTriangle className="w-5 h-5" />
            };
        default:
            return {
                background: colors.status.info.bg,
                border: colors.status.info.border,
                text: colors.status.info.base,
                icon: <AlertCircle className="w-5 h-5" />
            };
    }
};

export const Toast = ({ message, type = 'info', onClose }) => {
    const styles = getToastStyles(type);

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md animate-slideIn"
            style={{
                backgroundColor: styles.background,
                borderColor: styles.border,
                color: styles.text
            }}
        >
            <span className="flex-shrink-0">
                {styles.icon}
            </span>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={onClose}
                className="p-1 rounded-lg transition-colors duration-200 hover:bg-black/10"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 left-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};
