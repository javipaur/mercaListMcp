import { useCallback, useState, useRef, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import ProductCard from './components/ProductCard';
import ShoppingList from './components/ShoppingList';
import Pantry from './components/Pantry';
import Toast from './components/Toast';
import CategoryBar from './components/CategoryBar';
import PostalCodeInput from './components/PostalCodeInput';
import CpGate from './components/CpGate';
import VoiceAssistant from './components/VoiceAssistant';
import FrequentProducts from './components/FrequentProducts';
import DiscountedCarousel from './components/DiscountedCarousel';
import { useProducts, useShoppingList, usePostalCode, getStoredCP, usePantry, usePurchaseHistory } from './hooks/useProducts';
import { useWebMCP } from './hooks/useWebMCP';
import './App.css';

export default function App() {
  const { query, setQuery, results, setResults, loading, error, searchByCategory, searchDiscounted, markVoiceSearchDone, clearVoiceSearchRef } = useProducts();
  const { items, addItem, removeItem, updateQuantity, clearList } = useShoppingList();
  const { cp, setCp, warehouse, cpError } = usePostalCode();
  const pantry = usePantry();
  const purchaseHistory = usePurchaseHistory();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('list');
  const [cartOpen, setCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState('browse');
  const [navPath, setNavPath] = useState({ section: '', category: '' });
  const [discountedProducts, setDiscountedProducts] = useState([]);
  const [catalogBuilding, setCatalogBuilding] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);
  const resultsRef = useRef(null);

  const inListIds = new Set(items.map(i => i.id));

  // Pre-warm warehouse when CP is set, and poll until ready
  useEffect(() => {
    if (!warehouse?.warehouse) return;

    const wh = warehouse.warehouse;

    setCatalogBuilding(true);
    fetch(`/api/catalog/build/${wh}`).catch(() => {});

    let timer;
    async function check() {
      try {
        const r = await fetch(`/api/catalog/status?wh=${wh}`);
        const data = await r.json();
        if (data.ready) {
          setCatalogBuilding(false);
          if (timer) clearInterval(timer);
        }
      } catch {}
    }

    const startTimer = setTimeout(() => {
      check();
      timer = setInterval(check, 3000);
    }, 1000);

    return () => { clearTimeout(startTimer); if (timer) clearInterval(timer); };
  }, [warehouse]);

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
  }

  const handleAdd = useCallback((product) => {
    addItem(product);
    showToast(`${product.name} añadido a la lista`);
  }, [addItem]);

  const handleRemove = useCallback((id) => {
    const item = items.find(i => i.id === id);
    removeItem(id);
    if (item) showToast(`${item.name} eliminado de la lista`, 'info');
  }, [items, removeItem]);

  const handleClear = useCallback(() => {
    if (items.length === 0) return;
    clearList();
    showToast('Lista vaciada', 'info');
  }, [items, clearList]);

  const handleBuy = useCallback((item) => {
    pantry.addOrUpdate(item, item.quantity);
    purchaseHistory.trackPurchase(item, item.quantity);
    removeItem(item.id);
    showToast(`${item.name} añadido a la bodega`, 'success');
  }, [pantry, purchaseHistory, removeItem]);

  const handleBuyAll = useCallback(() => {
    if (items.length === 0) return;
    const count = items.length;
    items.forEach(item => {
      pantry.addOrUpdate(item, item.quantity);
      purchaseHistory.trackPurchase(item, item.quantity);
    });
    clearList();
    showToast(`${count} producto${count !== 1 ? 's' : ''} añadido${count !== 1 ? 's' : ''} a la bodega`, 'success');
  }, [items, pantry, purchaseHistory, clearList]);

  const handleSearch = useCallback(async (q) => {
    try {
      const cp = getStoredCP();
      let url = `/api/products/search?q=${encodeURIComponent(q)}`;
      if (cp) url += `&cp=${cp}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status} al buscar`);
      const data = await res.json();
      const results = data.results || [];
      markVoiceSearchDone(q);
      setQuery(q);
      setViewMode('search');
      setResults(results);
      return results;
    } catch (err) {
      console.error('Voice search error:', err);
      return [];
    }
  }, [markVoiceSearchDone, setQuery, setResults]);

  const handleGetList = useCallback(() => items, [items]);

  useWebMCP({
    onSearch: handleSearch,
    onAddItem: addItem,
    onRemoveItem: removeItem,
    onGetList: handleGetList,
    onClearList: clearList,
    onGetPantry: () => pantry.items,
    onGetLowStock: () => pantry.lowStock,
  });

  const handleCategorySelect = useCallback((catName, sectionName) => {
    searchByCategory(catName);
    setQuery(catName);
    setNavPath({ section: sectionName || '', category: catName });
    setViewMode('category');
  }, [searchByCategory, setQuery]);

  const handleBackToBrowse = useCallback(() => {
    setQuery('');
    setViewMode('browse');
    setNavPath({ section: '', category: '' });
  }, [setQuery]);

  const handleDiscounted = useCallback(async () => {
    searchDiscounted();
    setQuery('');
    setViewMode('discounted');
  }, [searchDiscounted]);

  const handleQueryChange = useCallback((q) => {
    clearVoiceSearchRef();
    setQuery(q);
    if (!q.trim()) {
      setViewMode('browse');
      setNavPath({ section: '', category: '' });
    } else {
      setViewMode('search');
    }
  }, [setQuery, clearVoiceSearchRef]);

  // Preload discounted for carousel
  useEffect(() => {
    const cp = getStoredCP();
    let url = '/api/products/discounted';
    if (cp) url += `?cp=${cp}`;
    fetch(url)
      .then(r => r.json())
      .then(data => setDiscountedProducts(data.results?.slice(0, 20) || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('reveal-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
      );

      const cards = resultsRef.current.querySelectorAll('.product-card');
      cards.forEach((el, i) => {
        el.style.transitionDelay = `${i * 50}ms`;
        observer.observe(el);
      });

      return () => observer.disconnect();
    }
  }, [results]);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  if (!cp && !gatePassed) {
    return <CpGate onConfirm={(value) => { setCp(value); setGatePassed(true); }} />;
  }

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">
              <span className="app-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </span>
              <span>Mercalist</span>
            </h1>
          </div>
          <div className="header-controls">
            <SearchBar query={query} onChange={handleQueryChange} loading={loading} />
            <VoiceAssistant onSearch={handleSearch} onAddItem={handleAdd} currentResults={results} pantryItems={pantry.items} lowStock={pantry.lowStock} />
          </div>
          <div className="header-cart-btn">
            <button
              className="cart-toggle"
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir lista, ${items.length} productos`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="cart-toggle-badge">{totalQty}</span>
            </button>
          </div>
          <PostalCodeInput cp={cp} onChange={setCp} warehouse={warehouse} error={cpError} />
        </div>
      </header>

      {/* Horizontal category bar under header */}
      <CategoryBar onSelectCategory={handleCategorySelect} cp={cp} />

      <div className="app-content" id="main-content" tabIndex={-1}>
        <main className="app-main">
          {/* Main content */}
          <section className="main-column" aria-label="Productos">
            {error && <p className="error-msg" role="alert">Error: {error}</p>}

            {catalogBuilding && (
              <div className="catalog-building-banner reveal">
                <span className="catalog-building-spinner" />
                <span>Cargando catálogo de productos... (puede tardar hasta 1 minuto en la primera carga)</span>
              </div>
            )}

            {/* Navigation context */}
            {(viewMode === 'category' || viewMode === 'discounted' || viewMode === 'search') && (
              <div className="nav-context reveal">
                <button className="nav-back-btn" onClick={handleBackToBrowse}>
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="none" stroke="currentColor" strokeWidth="2" d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {viewMode === 'discounted' ? 'Volver' : 'Limpiar'}
                </button>
                {viewMode === 'category' && navPath.category && (
                  <span className="nav-context-label">
                    {navPath.section && `${navPath.section} / `}{navPath.category}
                  </span>
                )}
                {viewMode === 'discounted' && <span className="nav-context-label">Rebajados</span>}
                {viewMode === 'search' && query && <span className="nav-context-label">Búsqueda: {query}</span>}
              </div>
            )}

            {/* Discounted carousel on browse */}
            {viewMode === 'browse' && discountedProducts.length > 0 && (
              <DiscountedCarousel products={discountedProducts} onAdd={handleAdd} inListIds={inListIds} />
            )}

            {/* Quick actions */}
            {viewMode === 'browse' && (
              <div className="quick-access reveal">
                <button className="quick-btn discounted-btn" onClick={handleDiscounted}>
                  <span className="quick-btn-icon" aria-hidden="true">%</span>
                  <span>Todos los rebajados</span>
                </button>
              </div>
            )}

            {loading && results.length === 0 && (
              <div className="results-loading" aria-label="Cargando">
                <span className="results-spinner" />
              </div>
            )}

            {results.length > 0 && (
              <div className="results-top reveal">
                <div className="results-count" role="status">
                  {results.length} resultado{results.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {results.length > 0 ? (
              <div className="results-grid" ref={resultsRef} role="list" aria-label="Productos">
                {results.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAdd}
                    inList={inListIds.has(product.id)}
                  />
                ))}
              </div>
            ) : null}

            {viewMode === 'browse' && !loading && (
              <p className="hint-text">Elige una categoría o busca un producto</p>
            )}

            {viewMode === 'search' && !loading && results.length === 0 && query && (
              <p className="no-results reveal">
                No se encontraron productos para &quot;<strong>{query}</strong>&quot;
              </p>
            )}

            {viewMode === 'discounted' && !loading && results.length === 0 && (
              <p className="no-results reveal">No hay productos rebajados</p>
            )}
            {viewMode === 'category' && !loading && results.length === 0 && (
              <p className="no-results reveal">No se encontraron productos en esta categoría</p>
            )}
          </section>

          {/* Right column */}
          <aside className="list-column" aria-label="Lista y bodega">
            <div className="list-section-sticky reveal">
              <div className="sidebar-tabs" role="tablist">
                <button
                  className={`sidebar-tab ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveTab('list')}
                  role="tab" aria-selected={activeTab === 'list'}
                  aria-controls="panel-list" id="tab-list"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M3 6h18M3 12h18M3 18h18"/>
                  </svg>
                  Lista
                  {items.length > 0 && <span className="tab-badge">{items.length}</span>}
                </button>
                <button
                  className={`sidebar-tab ${activeTab === 'pantry' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pantry')}
                  role="tab" aria-selected={activeTab === 'pantry'}
                  aria-controls="panel-pantry" id="tab-pantry"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h12"/>
                  </svg>
                  Bodega
                  {pantry.lowStock.length > 0 && <span className="tab-badge alert">{pantry.lowStock.length}</span>}
                </button>
              </div>
              <div role="tabpanel" id="panel-list" aria-labelledby="tab-list" hidden={activeTab !== 'list'}>
                <ShoppingList items={items} onUpdateQuantity={updateQuantity} onRemove={handleRemove} onClear={handleClear} onBuyItem={handleBuy} onBuyAll={handleBuyAll} />
              </div>
              <div role="tabpanel" id="panel-pantry" aria-labelledby="tab-pantry" hidden={activeTab !== 'pantry'}>
                <Pantry items={pantry.items} onConsume={pantry.consume} onSetThreshold={pantry.setThreshold} onRemove={pantry.removeItem} cp={cp} />
              </div>
            </div>

            {purchaseHistory.frequent.length > 0 && (
              <div className="frequent-sidebar">
                <FrequentProducts items={purchaseHistory.frequent} onAdd={handleAdd} />
              </div>
            )}
          </aside>
        </main>
      </div>

      {/* Cart drawer */}
      <div className={`cart-overlay${cartOpen ? ' open' : ''}`} onClick={() => setCartOpen(false)} aria-hidden="true" />
      <div className={`cart-drawer${cartOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Lista">
        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">Tu lista</h2>
          <button className="cart-drawer-close" onClick={() => setCartOpen(false)} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="cart-drawer-body">
          <ShoppingList items={items} onUpdateQuantity={updateQuantity} onRemove={handleRemove} onClear={handleClear} onBuyItem={handleBuy} onBuyAll={handleBuyAll} compact />
        </div>
      </div>

      <footer className="app-footer">
        <p>Datos de la API pública de Mercadona. Proyecto no oficial.</p>
      </footer>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(s => ({ ...s, visible: false }))} />
    </div>
  );
}
