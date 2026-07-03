import { useRef, useEffect } from 'react';
import './CpGate.css';

export default function CpGate({ cp, onChange, warehouse, onContinue }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleInput(e) {
    onChange(e.target.value.replace(/\D/g, '').slice(0, 5));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && canContinue) onContinue();
  }

  const isValid = cp.length === 5 && warehouse?.valid;
  const canContinue = isValid;
  const hasError = cp.length === 5 && !warehouse?.valid;

  return (
    <div className="cp-gate">
      <div className="cp-gate-card">
        <div className="cp-gate-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        <h1 className="cp-gate-title">Mercalist</h1>
        <p className="cp-gate-subtitle">
          Introduce tu código postal para ver los productos de tu zona
        </p>

        <div className={`cp-gate-input-wrap${isValid ? ' valid' : ''}${hasError ? ' error' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={cp}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Código postal"
            maxLength={5}
            className="cp-gate-input"
            aria-label="Código postal"
            aria-invalid={hasError}
          />
          {isValid && (
            <span className="cp-gate-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </span>
          )}
        </div>

        {hasError && (
          <p className="cp-gate-error" role="alert">
            Código postal no válido
          </p>
        )}

        {isValid && warehouse?.warehouse && (
          <p className="cp-gate-wh">{warehouse.info?.city || warehouse.warehouse}</p>
        )}

        <button
          className="cp-gate-btn"
          disabled={!canContinue}
          onClick={onContinue}
          type="button"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
