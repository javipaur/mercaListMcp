import { useState } from 'react';
import './ProductCard.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function ProductCard({ product, onAdd, inList }) {
  const price = product.price != null ? fmt(product.price) : null;
  const hasDiscount = product.previous_price != null && product.previous_price > product.price;
  const outOfStock = product.in_stock === false;

  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.previous_price) * 100)
    : 0;

  const pi = product.price_instructions || {};
  const isNew = pi.is_new === true;

  const refPrice = pi.reference_price && pi.reference_format
    ? `${parseFloat(pi.reference_price).toFixed(2).replace('.', ',')}€/${pi.reference_format}`
    : null;

  const [imgError, setImgError] = useState(false);

  const packSize = pi.is_pack
    ? `Pack ${pi.unit_size || ''} ${pi.unit_name || ''}`.trim()
    : product.packaging || null;

  return (
    <article className={`product-card${outOfStock ? ' out-of-stock' : ''}${inList ? ' in-list' : ''}`}>
      <div className="product-image-wrap">
        {product.thumbnail && !imgError ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="product-image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-image-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L6 21" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {isNew && (
          <span className="product-new-badge">NUEVO</span>
        )}
        {hasDiscount && (
          <span className="product-discount-badge">-{discountPct}%</span>
        )}
        {outOfStock && (
          <span className="product-out-badge">Sin stock</span>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        {packSize && (
          <span className="product-packaging">{packSize}</span>
        )}
        <div className="product-price-row">
          <div className="product-prices">
            {price != null && <span className="product-price">{price}</span>}
            {hasDiscount && (
              <span className="product-old-price">{fmt(product.previous_price)}</span>
            )}
          </div>
          {refPrice && (
            <span className="product-ref-price">{refPrice}</span>
          )}
        </div>
      </div>
      <button
        className={`product-add-btn ${inList ? 'in-list' : ''}`}
        onClick={() => !outOfStock && onAdd(product)}
        disabled={outOfStock}
        aria-label={
          outOfStock
            ? `${product.name} — no disponible`
            : inList
              ? `${product.name} — ya en la lista`
              : `Añadir ${product.name} a la lista`
        }
      >
        {outOfStock ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>
          </svg>
        ) : inList ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="2.5" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="2.5" d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </article>
  );
}
