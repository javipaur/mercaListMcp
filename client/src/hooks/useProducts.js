import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api';
const CACHE_KEY = 'mercalist_product_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Local search cache for instant results
function getLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function setLocalCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch {}
}

function searchInCache(cache, query) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!q) return [];
  return cache.products.filter(p => {
    const name = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cat = (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return name.includes(q) || cat.includes(q);
  }).slice(0, 60).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

export function useProducts() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const categorySearch = useRef(null);
  const abortRef = useRef(null);
  const voiceSearchRef = useRef(null);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    if (categorySearch.current) {
      categorySearch.current = null;
      return;
    }

    // Skip if voice assistant already populated results for this query
    if (voiceSearchRef.current === query) {
      voiceSearchRef.current = null;
      return;
    }

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Try local cache first
    const cache = getLocalCache();
    if (cache) {
      const localResults = searchInCache(cache, query);
      if (localResults.length > 0) {
        setResults(localResults);
        setLoading(false);
        setError(null);
        return;
      }
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const cp = getStoredCP();
        let url = `${API}/products/search?q=${encodeURIComponent(query)}`;
        if (cp) url += `&cp=${cp}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Error en la búsqueda');
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [query, searchKey]);

  const searchByCategory = useCallback(async (categoryName) => {
    categorySearch.current = true;
    setSearchKey(k => k + 1);
    setLoading(true);
    setError(null);
    try {
      const cp = getStoredCP();
      let url = `${API}/products/search?category=${encodeURIComponent(categoryName)}`;
      if (cp) url += `&cp=${cp}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar categoría');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDiscounted = useCallback(async () => {
    categorySearch.current = true;
    setSearchKey(k => k + 1);
    setLoading(true);
    setError(null);
    try {
      const cp = getStoredCP();
      let url = `${API}/products/discounted`;
      if (cp) url += `?cp=${cp}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar rebajados');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markVoiceSearchDone = useCallback((q) => {
    voiceSearchRef.current = q;
  }, []);

  const clearVoiceSearchRef = useCallback(() => {
    voiceSearchRef.current = null;
  }, []);

  return { query, setQuery, results, setResults, loading, error, searchByCategory, searchDiscounted, markVoiceSearchDone, clearVoiceSearchRef };
}

export function useShoppingList() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mercalist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mercalist', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, delta) => {
    setItems(prev => prev.map(i => {
      if (i.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty <= 0 ? null : { ...i, quantity: newQty };
    }).filter(Boolean));
  }, []);

  const clearList = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearList, totalItems };
}

export function usePantry() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mercalist_pantry');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('mercalist_pantry', JSON.stringify(items));
  }, [items]);

  const addOrUpdate = useCallback((product, purchasedQty) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id
            ? { ...i, stock: i.stock + purchasedQty, last_purchased: new Date().toISOString().slice(0, 10) }
            : i
        );
      }
      return [{
        id: product.id,
        name: product.name,
        price: product.price,
        thumbnail: product.thumbnail,
        category: product.category,
        stock: purchasedQty,
        threshold: 1,
        last_purchased: new Date().toISOString().slice(0, 10),
      }, ...prev];
    });
  }, []);

  const consume = useCallback((productId, qty = 1) => {
    setItems(prev => prev.map(i => {
      if (i.id !== productId) return i;
      const newStock = i.stock - qty;
      return newStock <= 0 ? null : { ...i, stock: newStock };
    }).filter(Boolean));
  }, []);

  const setThreshold = useCallback((productId, threshold) => {
    setItems(prev => prev.map(i =>
      i.id === productId ? { ...i, threshold } : i
    ));
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.id !== productId));
  }, []);

  const lowStock = items.filter(i => i.stock <= i.threshold);

  return { items, addOrUpdate, consume, setThreshold, removeItem, lowStock };
}

// Postal code management
const CP_KEY = 'mercalist_cp';

// Purchase history for smart suggestions
const HISTORY_KEY = 'mercalist_history';

export function usePurchaseHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Track a purchase (called when item moves to pantry)
  const trackPurchase = useCallback((product, qty) => {
    setHistory(prev => {
      const existing = prev.find(h => h.id === product.id);
      if (existing) {
        return prev.map(h =>
          h.id === product.id
            ? { ...h, count: h.count + qty, last: Date.now() }
            : h
        ).sort((a, b) => b.count - a.count || b.last - a.last);
      }
      return [{
        id: product.id,
        name: product.name,
        price: product.price,
        thumbnail: product.thumbnail,
        category: product.category,
        section: product.section,
        count: qty,
        last: Date.now(),
      }, ...prev].sort((a, b) => b.count - a.count).slice(0, 100);
    });
  }, []);

  // Top frequent items (most purchased, with recency boost)
  const frequent = history
    .filter(h => h.count >= 2)
    .slice(0, 12)
    .map(h => ({
      ...h,
      score: h.count * 10 + (Date.now() - h.last < 7 * 24 * 3600 * 1000 ? 50 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, frequent, trackPurchase, clearHistory };
}

export function getStoredCP() {
  try { return localStorage.getItem(CP_KEY) || ''; } catch { return ''; }
}

export function usePostalCode() {
  const [cp, setCpState] = useState(() => getStoredCP());
  const [warehouse, setWarehouse] = useState(null);
  const [cpError, setCpError] = useState(null);

  const setCp = useCallback((value) => {
    setCpState(value);
    try { localStorage.setItem(CP_KEY, value); } catch {}
  }, []);

  useEffect(() => {
    if (!cp || cp.length < 5) {
      setWarehouse(null);
      setCpError(null);
      return;
    }
    if (cp.length === 5) {
      fetch(`/api/warehouse?cp=${cp}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setWarehouse(data);
            setCpError(null);
          } else {
            setWarehouse(null);
            setCpError(data.error || 'CP no válido');
          }
        })
        .catch(() => {
          setWarehouse(null);
          setCpError('Error al validar CP');
        });
    }
  }, [cp]);

  return { cp, setCp, warehouse, cpError };
}
