import { useRef, useState, useEffect, useCallback } from 'react';
import './DiscountedCarousel.css';

function fmt(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function DiscountedCarousel({ products, onAdd, inListIds }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const imgErrors = useRef(new Set());

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function checkScroll() {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }
    el.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [products]);

  function scroll(dir) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  if (products.length === 0) return null;

  return (
    <div className="discounted-carousel reveal">
      <div className="carousel-header">
        <h2 className="carousel-title">
          <span className="carousel-title-icon" aria-hidden="true">%</span>
          Rebajados
        </h2>
        {canScrollLeft && (
          <button className="carousel-arrow carousel-arrow-left" onClick={() => scroll(-1)} aria-label="Anterior">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button className="carousel-arrow carousel-arrow-right" onClick={() => scroll(1)} aria-label="Siguiente">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      <div className="carousel-track-wrap">
        <div className="carousel-track" ref={scrollRef} role="list" aria-label="Productos rebajados">
          {products.map(product => {
            const inList = inListIds?.has(product.id);
            const hasDiscount = product.previous_price != null && product.previous_price > product.price;
            const discountPct = hasDiscount
              ? Math.round((1 - product.price / product.previous_price) * 100)
              : 0;

            return (
              <article key={product.id} className="carousel-card" role="listitem">
                <div className="carousel-card-img-wrap">
                  {product.thumbnail && !imgErrors.current.has(product.id) ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="carousel-card-img"
                      loading="lazy"
                      onError={() => { imgErrors.current.add(product.id); }}
                    />
                  ) : (
                    <div className="carousel-card-placeholder" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                        <path d="M21 15l-5-5L6 21" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {discountPct > 0 && (
                    <span className="carousel-discount-badge">-{discountPct}%</span>
                  )}
                </div>
                <div className="carousel-card-info">
                  <h3 className="carousel-card-name">{product.name}</h3>
                  <div className="carousel-card-price-row">
                    <span className="carousel-card-price">{fmt(product.price)}</span>
                    {hasDiscount && (
                      <span className="carousel-card-old-price">{fmt(product.previous_price)}</span>
                    )}
                  </div>
                </div>
                <button
                  className={`carousel-card-btn ${inList ? 'in-list' : ''}`}
                  onClick={() => onAdd(product)}
                  aria-label={`Añadir ${product.name} a la lista`}
                >
                  {inList ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path fill="none" stroke="currentColor" strokeWidth="2.5" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path fill="none" stroke="currentColor" strokeWidth="2.5" d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
