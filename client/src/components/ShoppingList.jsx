import { useCallback } from 'react';
import './ShoppingList.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function ShoppingList({ items, onUpdateQuantity, onRemove, onClear, onBuyItem, onBuyAll, compact }) {
  const handleExport = useCallback(() => {
    if (items.length === 0) return;
    const lines = items.map(i => {
      const price = i.price ? fmt(i.price) : '';
      const subtotal = i.price ? fmt(i.price * i.quantity) : '';
      return `${i.name} x${i.quantity} ${price ? `— ${price}/ud` : ''}${subtotal ? ` = ${subtotal}` : ''}`;
    });
    const total = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
    const totalSavings = items.reduce((s, i) => {
      if (i.previous_price && i.previous_price > i.price) {
        return s + (i.previous_price - i.price) * i.quantity;
      }
      return s;
    }, 0);
    lines.push('---');
    lines.push(`Total: ${fmt(total)}`);
    if (totalSavings > 0) lines.push(`Ahorro: ${fmt(totalSavings)}`);

    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="shopping-list">
        {!compact && (
          <div className="list-header">
            <h2 className="list-title">Lista de la compra</h2>
          </div>
        )}
        <div className="list-empty">
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" style={{ opacity: 0.2, marginBottom: '0.75rem' }}>
            <path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.17 14.75l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z"/>
          </svg>
          <p>Tu lista está vacía</p>
          <p className="list-empty-hint">Busca productos y añádelos a tu lista</p>
        </div>
      </div>
    );
  }

  let total = 0;
  let totalSavings = 0;

  const rows = items.map(item => {
    const unitPrice = item.price ?? 0;
    const previousPrice = item.previous_price;
    const hasDiscount = previousPrice != null && previousPrice > unitPrice;
    const subtotal = unitPrice * item.quantity;
    const savings = hasDiscount ? (previousPrice - unitPrice) * item.quantity : 0;
    total += subtotal;
    totalSavings += savings;
    return { ...item, unitPrice, hasDiscount, subtotal, savings };
  });

  return (
    <div className="shopping-list">
      {!compact && (
        <div className="list-header">
          <h2 className="list-title">Lista de la compra</h2>
          <div className="list-header-actions">
            <button className="list-buy-all-btn" onClick={onBuyAll} aria-label="Finalizar compra">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Finalizar
            </button>
            <button className="list-export-btn" onClick={handleExport} aria-label="Copiar lista al portapapeles">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              Copiar
            </button>
            <button className="list-clear-btn" onClick={onClear} aria-label="Vaciar lista">
              Vaciar
            </button>
          </div>
        </div>
      )}

      <ul className={`list-items ${compact ? 'list-items-compact' : ''}`} role="list">
        {rows.map(item => (
          <li key={item.id} className="list-item">
            <div className="list-item-info">
              <span className="list-item-name">{item.name}</span>
              {!compact && (
                <span className="list-item-price-detail">
                  {fmt(item.unitPrice)}
                  {item.hasDiscount && (
                    <span className="list-item-old-price">{fmt(item.previous_price)}</span>
                  )}
                  <span className="list-item-sep">×</span>
                  <span className="list-item-qty-label">{item.quantity}</span>
                  <span className="list-item-sep">=</span>
                  <span className="list-item-subtotal">{fmt(item.subtotal)}</span>
                </span>
              )}
              {item.hasDiscount && !compact && (
                <span className="list-item-savings">Ahorras {fmt(item.savings)}</span>
              )}
            </div>
            {!compact && (
              <div className="list-item-actions">
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  aria-label={`Reducir cantidad de ${item.name}`}
                >
                  −
                </button>
                <span className="qty-value" aria-label={`Cantidad: ${item.quantity}`}>
                  {item.quantity}
                </span>
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  aria-label={`Aumentar cantidad de ${item.name}`}
                >
                  +
                </button>
                <button
                  className="buy-btn"
                  onClick={() => onBuyItem(item)}
                  aria-label={`Marcar ${item.name} como comprado`}
                  title="Comprado — pasa a la bodega"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </button>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Eliminar ${item.name} de la lista`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )}
            {compact && (
              <div className="list-item-actions-compact">
                <span className="list-item-compact-qty">{item.quantity}</span>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Eliminar ${item.name} de la lista`}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {compact && items.length > 0 && (
        <div className="list-buy-all-compact">
          <button className="list-buy-all-btn list-buy-all-btn-full" onClick={onBuyAll}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Finalizar compra
          </button>
        </div>
      )}

      {!compact && (
        <div className="list-footer">
          <div className="list-total-row">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="list-savings-row">
              <span>Te ahorras</span>
              <span>{fmt(totalSavings)}</span>
            </div>
          )}
          <div className="list-items-count">
            {items.length} producto{items.length !== 1 ? 's' : ''} · {rows.reduce((s, i) => s + i.quantity, 0)} unidad{rows.reduce((s, i) => s + i.quantity, 0) !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
