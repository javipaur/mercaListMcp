import { useEffect, useRef } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success', visible, onClose }) {
  const timerRef = useRef(null);
  const liveRef = useRef(null);

  useEffect(() => {
    if (visible) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onClose, 3000);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`toast toast-${type}`}
      role="status"
      aria-live="polite"
      ref={liveRef}
    >
      <span className="toast-icon" aria-hidden="true">
        {type === 'success' ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        ) : type === 'error' ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        )}
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Cerrar notificacion">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
      </button>
    </div>
  );
}
