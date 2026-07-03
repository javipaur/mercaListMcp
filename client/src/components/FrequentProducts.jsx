import './FrequentProducts.css';

function fmt(n) {
  return n != null ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n) : null;
}

export default function FrequentProducts({ items, onAdd, onSelectCategory }) {
  if (items.length === 0) return null;

  return (
    <div className="frequent-section">
      <h2 className="frequent-title">Tus habituales</h2>
      <p className="frequent-sub">Productos que compras con frecuencia</p>
      <div className="frequent-grid">
        {items.map(item => (
          <button
            key={item.id}
            className="frequent-chip"
            onClick={() => onAdd({ id: item.id, name: item.name, price: item.price, thumbnail: item.thumbnail })}
            title={`Añadir ${item.name} a la lista`}
          >
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="frequent-chip-img"
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="frequent-chip-name">{item.name}</span>
            {item.price != null && (
              <span className="frequent-chip-price">{fmt(item.price)}</span>
            )}
            <span className="frequent-chip-count">{item.count}×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
