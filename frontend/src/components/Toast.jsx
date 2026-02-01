import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

// Toast types with Material icons and colors
const TOAST_CONFIG = {
  success: {
    icon: 'check',
    bgColor: '#DCFCE7',
    borderColor: '#22C55E',
    textColor: '#166534',
    iconBg: '#22C55E'
  },
  error: {
    icon: 'close',
    bgColor: '#FEE2E2',
    borderColor: '#EF4444',
    textColor: '#991B1B',
    iconBg: '#EF4444'
  },
  warning: {
    icon: 'warning',
    bgColor: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#92400E',
    iconBg: '#F59E0B'
  },
  info: {
    icon: 'info',
    bgColor: '#DBEAFE',
    borderColor: '#3B82F6',
    textColor: '#1E40AF',
    iconBg: '#3B82F6'
  }
};

// Single Toast Component
function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '320px',
        maxWidth: '420px',
        animation: isExiting ? 'slideOut 0.3s ease forwards' : 'slideIn 0.3s ease',
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        opacity: isExiting ? 0 : 1,
        transition: 'all 0.3s ease'
      }}
    >
      {/* Icon */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: config.iconBg,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {config.icon}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{
            fontWeight: '600',
            fontSize: '0.9rem',
            color: config.textColor,
            marginBottom: '2px'
          }}>
            {toast.title}
          </div>
        )}
        <div style={{
          fontSize: '0.85rem',
          color: config.textColor,
          opacity: 0.9
        }}>
          {toast.message}
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: config.textColor,
          opacity: 0.6,
          fontSize: '16px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title = null, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message, title, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message, title) => addToast('success', message, title),
    error: (message, title) => addToast('error', message, title),
    warning: (message, title) => addToast('warning', message, title),
    info: (message, title) => addToast('info', message, title),
    remove: removeToast
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
