import React, { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import '../styles/toast.css';

const TOAST_DURATION = 3000;

const getToastStyles = (type) => {
    switch (type) {
        case 'success':
            return {
                background: '#1A1B23',
                text: '#fff',
                progressColor: '#10B981',
                icon: <CheckCircle className="w-5 h-5 text-[#10B981]" />
            };
        case 'error':
            return {
                background: '#1A1B23',
                text: '#fff',
                progressColor: '#EF4444',
                icon: <AlertCircle className="w-5 h-5 text-[#EF4444]" />
            };
        case 'warning':
            return {
                background: '#1A1B23',
                text: '#fff',
                progressColor: '#F59E0B',
                icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            };
        default:
            return {
                background: '#1A1B23',
                text: '#fff',
                progressColor: '#3B82F6',
                icon: <AlertCircle className="w-5 h-5 text-[#3B82F6]" />
            };
    }
};

const Toast = ({ message, type = 'info', onClose }) => {
    const styles = getToastStyles(type);
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => {
            if (onClose) onClose();
        }, TOAST_DURATION);
        
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [onClose]);

    const handleClose = (e) => {
        e.stopPropagation();
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        if (onClose) onClose();
    };

    return (
        <div className="toast-wrapper">
            <div
                className="flex items-center gap-3 px-4 py-3 rounded shadow-lg min-w-[300px] max-w-md"
                style={{
                    backgroundColor: styles.background,
                    color: styles.text,
                }}
            >
                <span className="flex-shrink-0">
                    {styles.icon}
                </span>
                <p className="flex-1 text-sm font-medium">{message}</p>
                <button
                    onClick={handleClose}
                    className="p-1 rounded-lg transition-colors duration-200 hover:bg-white/10"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div 
                className="progress-bar"
                style={{ 
                    '--progress-color': styles.progressColor,
                    '--duration': `${TOAST_DURATION}ms`
                }}
            />
        </div>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 left-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div key={toast.id} className="toast-enter">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
};

export { Toast, ToastContainer };
