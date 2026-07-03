import { useRef } from 'react';
import './SearchBar.css';

export default function SearchBar({ query, onChange, loading }) {
  const inputRef = useRef(null);

  return (
    <div className="search-bar" role="search">
      <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Busca productos..."
        aria-label="Buscar productos"
        autoComplete="off"
        className="search-input"
      />
      {loading && <span className="search-spinner" aria-label="Buscando..." />}
      {query && !loading && (
        <button
          className="search-clear"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Limpiar búsqueda"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
