import { useRef } from 'react';
import './PostalCodeInput.css';

export default function PostalCodeInput({ cp, onChange, warehouse, error }) {
  const inputRef = useRef(null);

  function handleInput(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    onChange(val);
  }

  const isValid = cp.length === 5 && warehouse?.valid;
  const hasError = cp.length === 5 && !warehouse?.valid;

  return (
    <div className="cp-section">
      <div className={`cp-input-wrap${isValid ? ' valid' : ''}${hasError ? ' error' : ''}`}>
        <label htmlFor="cp-input" className="cp-label" aria-label="Código postal">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </label>
        <input
          id="cp-input"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={cp}
          onChange={handleInput}
          placeholder="CP"
          maxLength={5}
          className="cp-input"
          aria-label="Código postal para ver productos de tu zona"
          aria-invalid={hasError}
        />
        {isValid && (
          <span className="cp-valid-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </span>
        )}
      </div>
      {isValid && (
        <span className="cp-wh-city">{warehouse.info?.city || warehouse.warehouse}</span>
      )}
    </div>
  );
}
