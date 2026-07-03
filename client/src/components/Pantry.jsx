import './Pantry.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function Pantry({ items, onConsume, onSetThreshold, onRemove, cp }) {
  if (items.length === 0) {
    return (
      <div className="pantry">
        <div className="pantry-header">
          <h2 className="pantry-title">Bodega</h2>
        </div>
        <div className="pantry-empty">
          <p>No tienes productos en tu bodega</p>
          <p className="pantry-empty-hint">Marca productos como comprados desde la lista de la compra</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pantry">
      <div className="pantry-header">
        <h2 className="pantry-title">Bodega</h2>
        <span className="pantry-count">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="pantry-low-info">
        <span className="pantry-low-text">
          Productos con stock bajo: <strong>{items.filter(i => i.stock <= i.threshold).length}</strong>
        </span>
      </div>
      <ul className="pantry-items" role="list">
        {items.map(item => {
          const low = item.stock <= item.threshold;
          return (
            <li key={item.id} className={`pantry-item${low ? ' low-stock' : ''}`}>
              <div className="pantry-item-main">
                <div className="pantry-item-info">
                  <span className="pantry-item-name">{item.name}</span>
                  <span className="pantry-item-stock" aria-label={`Stock: ${item.stock} unidades`}>
                    <span className="stock-count">{item.stock}</span>
                    <span className="stock-label">ud{item.stock !== 1 ? 's' : ''}</span>
                    {low && <span className="pantry-low-badge">¡Poco stock!</span>}
                  </span>
                  {item.last_purchased && (
                    <span className="pantry-item-date">Comprado {item.last_purchased}</span>
                  )}
                </div>
                <div className="pantry-item-actions">
                  <button
                    className="pantry-consume-btn"
                    onClick={() => onConsume(item.id, 1)}
                    aria-label={`Consumir 1 unidad de ${item.name}`}
                    title="Consumir 1 unidad"
                  >
                    −
                  </button>
                  <button
                    className="pantry-consume-btn"
                    onClick={() => onConsume(item.id, item.stock)}
                    aria-label={`Consumir todas las unidades de ${item.name}`}
                    title="Consumir todo"
                  >
                    ✕
                  </button>
                  <div className="pantry-threshold-group">
                    <label className="pantry-threshold-label">
                      Alertar al llegar a
                    </label>
                    <select
                      className="pantry-threshold-select"
                      value={item.threshold}
                      onChange={e => onSetThreshold(item.id, Number(e.target.value))}
                      aria-label={`Umbral de stock bajo para ${item.name}`}
                    >
                      {[0, 1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="pantry-remove-btn"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Eliminar ${item.name} de la bodega`}
                    title="Eliminar de la bodega"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
