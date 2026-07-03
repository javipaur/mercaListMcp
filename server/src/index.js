import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const MERCADONA_API = 'https://tienda.mercadona.es/api';

const CP_WAREHOUSE = {
  '01': 'bil1', '02': 'alc1', '03': 'alc1', '04': 'svq1', '05': 'mad1',
  '06': 'svq1', '07': 'pmr1', '08': 'bcn1', '09': 'bil1',
  '10': 'svq1', '11': 'svq1', '12': 'vlc1', '13': 'mad1',
  '14': 'svq1', '15': 'ags1', '16': 'mad1', '17': 'bcn1',
  '18': 'svq1', '19': 'mad1',
  '20': 'bil1', '21': 'svq1', '22': 'mad1', '23': 'svq1',
  '24': 'mad1', '25': 'bcn1', '26': 'bil1', '27': 'ags1',
  '28': 'mad1', '29': 'svq1',
  '30': 'alc1', '31': 'bil1', '32': 'ags1', '33': 'ags1',
  '34': 'mad1', '35': 'lpa1', '36': 'ags1', '37': 'mad1',
  '38': 'tfe1', '39': 'bil1',
  '40': 'mad1', '41': 'svq1', '42': 'mad1', '43': 'bcn1',
  '44': 'mad1', '45': 'mad1', '46': 'vlc1', '47': 'mad1',
  '48': 'bil1', '49': 'mad1',
  '50': 'mad1', '51': 'svq1', '52': 'svq1',
};

const PROVINCE_BY_PREFIX = {
  '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería', '05': 'Ávila',
  '06': 'Badajoz', '07': 'Illes Balears', '08': 'Barcelona', '09': 'Burgos',
  '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón', '13': 'Ciudad Real', '14': 'Córdoba',
  '15': 'A Coruña', '16': 'Cuenca', '17': 'Girona', '18': 'Granada', '19': 'Guadalajara',
  '20': 'Guipúzcoa', '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León',
  '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid', '29': 'Málaga',
  '30': 'Murcia', '31': 'Navarra', '32': 'Ourense', '33': 'Asturias', '34': 'Palencia',
  '35': 'Las Palmas', '36': 'Pontevedra', '37': 'Salamanca', '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria', '40': 'Segovia', '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona',
  '44': 'Teruel', '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Bizkaia',
  '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla',
};

const WAREHOUSE_INFO = {
  'mad1': { city: 'Madrid', region: 'Comunidad de Madrid' },
  'bcn1': { city: 'Barcelona', region: 'Cataluña' },
  'vlc1': { city: 'Valencia', region: 'Comunidad Valenciana' },
  'bil1': { city: 'Bilbao', region: 'País Vasco' },
  'svq1': { city: 'Sevilla', region: 'Andalucía' },
  'alc1': { city: 'Alicante', region: 'Comunidad Valenciana' },
  'ags1': { city: 'A Coruña', region: 'Galicia' },
  'pmr1': { city: 'Palma', region: 'Illes Balears' },
  'lpa1': { city: 'Las Palmas', region: 'Canarias' },
  'tfe1': { city: 'Santa Cruz de Tenerife', region: 'Canarias' },
};

const ALL_WAREHOUSES = ['mad1', 'bcn1', 'vlc1', 'bil1', 'svq1', 'alc1', 'ags1', 'pmr1', 'lpa1', 'tfe1'];
const CACHE_TTL = 24 * 60 * 60 * 1000;

// --- Algolia search ---
const ALGOLIA_FALLBACK = {
  app_id: '7UZJKL1DJ0',
  api_key: '9d8f2e39e90df472b4f2e559a116fe17',
  index_base: 'products_prod',
};

let algoliaCreds = { ...ALGOLIA_FALLBACK };
let algoliaCacheFile = path.join(__dirname, '..', 'algolia_creds.json');

function loadAlgoliaCreds() {
  try {
    if (fs.existsSync(algoliaCacheFile)) {
      const raw = fs.readFileSync(algoliaCacheFile, 'utf-8');
      const data = JSON.parse(raw);
      if (data.app_id && data.api_key) {
        algoliaCreds = data;
        console.log(`[Algolia] Loaded cached credentials: ${data.app_id}`);
        return true;
      }
    }
  } catch {}
  return false;
}

function saveAlgoliaCreds(creds) {
  try {
    fs.writeFileSync(algoliaCacheFile, JSON.stringify(creds), 'utf-8');
  } catch (err) {
    console.error('[Algolia] Failed to cache credentials:', err.message);
  }
}

async function discoverAlgoliaCreds() {
  try {
    console.log('[Algolia] Discovering credentials from SPA bundle...');
    const res = await fetch('https://tienda.mercadona.es/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await res.text();

    const bundleMatch = html.match(/\/v\d+\/index-[A-Za-z0-9_-]+\.js/);
    if (!bundleMatch) {
      console.error('[Algolia] Entry bundle not found in SPA shell');
      return false;
    }

    const jsRes = await fetch(`https://tienda.mercadona.es${bundleMatch[0]}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const js = await jsRes.text();

    const pairMatch = js.match(/"([A-Z0-9]{10})",[A-Za-z0-9_$]+="([0-9a-f]{32})"/);
    if (pairMatch) {
      algoliaCreds.app_id = pairMatch[1];
      algoliaCreds.api_key = pairMatch[2];
      console.log(`[Algolia] Discovered app_id=${pairMatch[1]}, key=${pairMatch[2].slice(0, 8)}...`);
    }

    const ibMatch = js.match(/"products_prod[a-z_]*"/);
    if (ibMatch) {
      algoliaCreds.index_base = ibMatch[0].slice(1, -1);
      console.log(`[Algolia] Discovered index_base=${algoliaCreds.index_base}`);
    }

    saveAlgoliaCreds(algoliaCreds);
    return true;
  } catch (err) {
    console.error('[Algolia] Discovery failed:', err.message);
    return false;
  }
}

function algoliaURL() {
  // Use raw app_id (uppercase) for DNS — some resolvers fail on lowercase
  return `https://${algoliaCreds.app_id}-dsn.algolia.net`;
}

async function searchAlgolia(query, wh, limit = 60) {
  const index = `${algoliaCreds.index_base}_${wh}_es`;
  const url = `${algoliaURL()}/1/indexes/${index}/query`;

  const params = new URLSearchParams({ query, hitsPerPage: String(limit) });
  const body = JSON.stringify({ params: params.toString() });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-API-Key': algoliaCreds.api_key,
      'X-Algolia-Application-Id': algoliaCreds.app_id,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://tienda.mercadona.es/',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if ([401, 403, 404].includes(res.status)) {
      console.log(`[Algolia] Auth error (${res.status}), re-discovering credentials...`);
      await discoverAlgoliaCreds();
      // Retry once with new creds
      return searchAlgolia(query, wh, limit);
    }
    throw new Error(`Algolia HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log(`[Algolia] "${query}" → ${data.nbHits || 0} hits`);

  return (data.hits || [])
    .filter(h => h.published !== false && h.id != null)
    .map(hit => {
      const pi = hit.price_instructions || {};
      // Get leaf category name (last in hierarchy)
      let catName = '';
      let sectionName = '';
      if (hit.categories && hit.categories.length > 0) {
        const top = hit.categories[0];
        sectionName = top.name || '';
        if (top.categories && top.categories.length > 0) {
          const mid = top.categories[0];
          if (mid.categories && mid.categories.length > 0) {
            catName = mid.categories[0].name || mid.name;
          } else {
            catName = mid.name || '';
          }
        }
      }

      const thumb = hit.thumbnail || '';
      const fullThumb = thumb.startsWith('http') ? thumb : (thumb ? `https://tienda.mercadona.es${thumb}` : '');

      return {
        id: typeof hit.id === 'string' ? parseInt(hit.id, 10) : hit.id,
        name: hit.display_name || '',
        slug: hit.slug || '',
        price: pi.unit_price ? parseFloat(pi.unit_price) : null,
        previous_price: pi.previous_unit_price ? parseFloat(pi.previous_unit_price) : null,
        price_decreased: pi.price_decreased || false,
        thumbnail: fullThumb,
        category: catName,
        section: sectionName,
        share_url: hit.share_url || '',
        packaging: hit.packaging || null,
        price_instructions: pi,
        in_stock: hit.limit == null || hit.limit > 0,
        stock_limit: hit.limit,
      };
    });
}

// In-memory catalogs
const catalogs = {};
const buildingStatus = {}; // wh -> 'idle' | 'building' | 'ready'
let categoriesCache = null;

function cpToWarehouse(cp) {
  const prefix = cp?.toString().padStart(5, '0').slice(0, 2);
  return CP_WAREHOUSE[prefix] || 'mad1';
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mercalist/1.0', 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// --- Disk cache helpers ---
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cachePath(wh) {
  return path.join(CACHE_DIR, `${wh}.json`);
}

function loadFromDisk(wh) {
  try {
    const filePath = cachePath(wh);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (Date.now() - data.builtAt > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function saveToDisk(wh, data) {
  try {
    ensureCacheDir();
    fs.writeFileSync(cachePath(wh), JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.error(`[Cache] Failed to save ${wh}:`, err.message);
  }
}

function loadAllCached() {
  let loaded = 0;
  for (const wh of ALL_WAREHOUSES) {
    const data = loadFromDisk(wh);
    if (data) {
      catalogs[wh] = data;
      buildingStatus[wh] = 'ready';
      loaded++;
    }
  }
  console.log(`[Cache] Loaded ${loaded}/${ALL_WAREHOUSES.length} warehouses from disk`);
}

async function buildProductCatalog(wh) {
  if (buildingStatus[wh] === 'building') return;
  buildingStatus[wh] = 'building';
  console.log(`[Catalog] Building for warehouse: ${wh}`);

  try {
    const data = await fetchWithRetry(`${MERCADONA_API}/categories/?wh=${wh}`);
    if (wh === 'mad1' && !categoriesCache) categoriesCache = data;

    const allProducts = [];
    const seen = new Set();

    if (data.results) {
      const catIds = [];
      for (const section of data.results) {
        if (!section.categories) continue;
        for (const cat of section.categories) {
          if (cat.published !== false) {
            catIds.push({ id: cat.id, sectionName: section.name || '' });
          }
        }
      }

      console.log(`[Catalog] Fetching ${catIds.length} subcategories for ${wh}...`);

      const BATCH = 10;
      for (let i = 0; i < catIds.length; i += BATCH) {
        const slice = catIds.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          slice.map(c => fetchWithRetry(`${MERCADONA_API}/categories/${c.id}/?wh=${wh}`))
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status !== 'fulfilled') continue;
          const cat = result.value;
          if (!cat.categories) continue;

          const sectionName = slice[j].sectionName;

          for (const sub of cat.categories) {
            if (sub.published === false) continue;
            if (!sub.products) continue;

            for (const p of sub.products) {
              if (p.published === false) continue;
              const pid = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
              if (seen.has(pid)) continue;
              seen.add(pid);

              const pi = p.price_instructions || {};
              const inStock = p.limit == null || p.limit > 0 && p.status !== 'out_of_stock';
              const thumb = p.thumbnail || '';
              const fullThumb = thumb.startsWith('http') ? thumb : `https://tienda.mercadona.es${thumb}`;

              allProducts.push({
                id: pid,
                name: p.display_name || p.name || '',
                slug: p.slug || '',
                price: pi.unit_price ? parseFloat(pi.unit_price) : null,
                previous_price: pi.previous_unit_price ? parseFloat(pi.previous_unit_price) : null,
                price_decreased: pi.price_decreased || false,
                thumbnail: fullThumb,
                category: sub.name || '',
                section: cat.name || sectionName || '',
                share_url: p.share_url || '',
                packaging: p.packaging || null,
                price_instructions: pi,
                in_stock: inStock,
                stock_limit: p.limit,
              });
            }
          }
        }
      }
    }

    const store = { products: allProducts, builtAt: Date.now() };
    catalogs[wh] = store;
    buildingStatus[wh] = 'ready';
    saveToDisk(wh, store);
    console.log(`[Catalog] Built: ${allProducts.length} products for ${wh}`);
  } catch (err) {
    console.error(`[Catalog] Failed to build ${wh}:`, err.message);
    buildingStatus[wh] = 'idle';
  }
}

function ensureCatalog(wh) {
  const store = catalogs[wh];
  const stale = store && (Date.now() - store.builtAt > CACHE_TTL);
  if (store && buildingStatus[wh] === 'ready' && !stale) return true;
  // Trigger background build if not already building (also refreshes stale caches)
  if (stale) console.log(`[Catalog] Cache stale for ${wh}, refreshing...`);
  buildProductCatalog(wh);
  return stale ? true : false; // return true if stale (old catalog still usable while building)
}

// --- Search functions ---
function searchProducts(products, query) {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return products.filter(p => {
    const name = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cat = (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return name.includes(q) || cat.includes(q);
  });
}

function filterByCategory(products, category) {
  const catQuery = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return products.filter(p => {
    const cat = (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const section = (p.section || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return cat.includes(catQuery) || section.includes(catQuery);
  });
}

function respondWithProducts(res, wh, results) {
  results.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  res.json({
    results: results.slice(0, 60),
    total: results.length,
    warehouse: wh,
    warehouse_info: WAREHOUSE_INFO[wh] || { city: wh },
    catalog_ready: true,
  });
}

// --- Routes ---

// Categories: NO catalog needed, proxies directly to Mercadona
app.get('/api/categories', async (req, res) => {
  try {
    const { cp } = req.query;
    const wh = cpToWarehouse(cp);
    if (categoriesCache) return res.json(categoriesCache);
    const data = await fetchWithRetry(`${MERCADONA_API}/categories/?wh=${wh}`);
    categoriesCache = data;
    res.json(data);
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Error al cargar categorías' });
  }
});

function productFromRaw(p) {
  return {
    id: typeof p.id === 'string' ? parseInt(p.id, 10) : p.id,
    name: p.display_name || p.name || '',
    slug: p.slug || '',
    price: p.price_instructions?.unit_price ? parseFloat(p.price_instructions.unit_price) : null,
    previous_price: p.price_instructions?.previous_unit_price ? parseFloat(p.price_instructions.previous_unit_price) : null,
    price_decreased: p.price_instructions?.price_decreased || false,
    thumbnail: (p.thumbnail || '').startsWith('http') ? p.thumbnail : `https://tienda.mercadona.es${p.thumbnail || ''}`,
    category: p.category_name || p.category || '',
    section: p.section_name || p.section || '',
    share_url: p.share_url || '',
    packaging: p.packaging || null,
    price_instructions: p.price_instructions || {},
    in_stock: !p.limit || p.limit > 0,
    stock_limit: p.limit,
  };
}

/** Scrape product IDs from Mercadona's search HTML page.
 *  The HTML contains links like /product/{id}/{slug} for each result. */
async function scrapeSearchHTML(query, wh) {
  const url = `https://tienda.mercadona.es/search?q=${encodeURIComponent(query)}&wh=${wh}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Find all /product/{id}/... links
    const productRegex = /\/product\/(\d+)\/[^\s"']+/g;
    const ids = new Set();
    let match;
    while ((match = productRegex.exec(html)) !== null) {
      ids.add(parseInt(match[1], 10));
    }
    if (!ids.size) return [];
    console.log(`[Search] Scraped ${ids.size} product IDs from Mercadona search HTML for "${query}"`);

    // Fetch each product by ID from the API
    const products = [];
    for (const id of ids) {
      try {
        const apiRes = await fetch(`${MERCADONA_API}/products/${id}/?wh=${wh}`, {
          headers: { 'User-Agent': 'Mercalist/1.0', 'Accept': 'application/json' },
        });
        if (!apiRes.ok) continue;
        const data = await apiRes.json();
        if (data && data.id) {
          products.push(productFromRaw(data));
        }
      } catch {}
    }
    return products;
  } catch {
    return [];
  }
}

async function searchMercadonaDirect(query, wh) {
  // Try scraping the search HTML page (most reliable)
  const products = await scrapeSearchHTML(query, wh);
  if (products.length) return products;

  // Fallback: try JSON API patterns
  const headers = {
    'User-Agent': 'Mercalist/1.0',
    'Accept': 'application/json',
    'Origin': 'https://tienda.mercadona.es',
    'Referer': 'https://tienda.mercadona.es/',
  };

  const patterns = [
    (q) => `${MERCADONA_API}/search/?text=${q}&wh=${wh}`,
    (q) => `${MERCADONA_API}/search?q=${q}&wh=${wh}`,
    (q) => `${MERCADONA_API}/search/?text=${q}`,
    (q) => `${MERCADONA_API}/search?q=${q}`,
    (q) => `${MERCADONA_API}/products/?search=${q}&wh=${wh}`,
    (q) => `${MERCADONA_API}/products/?text=${q}&wh=${wh}`,
    (q) => `${MERCADONA_API}/products/?q=${q}&wh=${wh}`,
  ];

  for (const buildUrl of patterns) {
    try {
      const url = buildUrl(encodeURIComponent(query));
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data) continue;
      const items = data.results || data.products || data.data || [];
      if (!items.length) continue;
      const valid = items.filter(p => (p.id != null) && (p.display_name || p.name));
      if (!valid.length) continue;
      const result = valid.map(productFromRaw);
      if (result.length) {
        console.log(`[Search] JSON API found ${result.length} products via ${url.split('/api')[1]}`);
        return result;
      }
    } catch {}
  }
  return [];
}

app.get('/api/products/search', async (req, res) => {
  try {
    const { q, category, cp } = req.query;
    const wh = cpToWarehouse(cp);

    let results = [];

    // Text search: use Algolia first (instant, no catalog needed)
    if (q && q.trim()) {
      try {
        results = await searchAlgolia(q.trim(), wh, 60);
        if (results.length) {
          console.log(`[Search] Algolia found ${results.length} products for "${q}"`);
          return respondWithProducts(res, wh, results);
        }
      } catch (err) {
        console.error(`[Search] Algolia failed for "${q}":`, err.message);
      }
    }

    // Category-only search (no q) or Algolia fallback: use catalog
    const ready = ensureCatalog(wh);
    const store = catalogs[wh];

    if (store && ready) {
      if (q && q.trim()) {
        results = searchProducts(store.products, q.trim());
        if (!results.length) {
          // Query relaxation — remove last word and retry
          const words = q.trim().split(/\s+/);
          for (let i = words.length - 1; i >= 1; i--) {
            const sub = words.slice(0, i).join(' ');
            results = searchProducts(store.products, sub);
            if (results.length) {
              console.log(`[Search] Relaxed query "${q}" → "${sub}" (${results.length} results)`);
              break;
            }
          }
          if (!results.length && words.length === 1) {
            const normalized = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            results = searchProducts(store.products, normalized);
          }
        }
      }
      if (category) {
        results = filterByCategory(results.length ? results : store.products, category);
      }
    }

    // Last resort: scrape Mercadona search HTML
    if (!results.length && q && q.trim()) {
      const direct = await searchMercadonaDirect(q.trim(), wh);
      if (direct.length) {
        console.log(`[Search] Direct fallback found ${direct.length} products for "${q}"`);
        results = direct;
      }
    }

    respondWithProducts(res, wh, results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Error al buscar productos' });
  }
});

app.get('/api/products/discounted', async (req, res) => {
  try {
    const { cp } = req.query;
    const wh = cpToWarehouse(cp);

    const ready = ensureCatalog(wh);
    const store = catalogs[wh];
    if (!store || !ready) {
      return res.json({
        results: [],
        total: 0,
        warehouse: wh,
        catalog_ready: false,
        building: buildingStatus[wh] === 'building',
      });
    }

    const results = store.products.filter(p => {
      const hasPrev = p.previous_price != null && p.previous_price > 0;
      const priceDown = hasPrev && p.previous_price > p.price;
      return p.price_decreased || priceDown;
    });
    results.sort((a, b) => ((b.previous_price - b.price) / b.price) - ((a.previous_price - a.price) / a.price));

    respondWithProducts(res, wh, results);
  } catch (err) {
    console.error('Discounted error:', err);
    res.status(500).json({ error: 'Error al cargar rebajados' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { cp } = req.query;
    const wh = cpToWarehouse(cp);
    const store = catalogs[wh];
    if (store) {
      const found = store.products.find(p => p.id === parseInt(req.params.id));
      if (found) return res.json(found);
    }
    const data = await fetchWithRetry(`${MERCADONA_API}/products/${req.params.id}/?wh=${wh}`);
    res.json({ ...data, warehouse: wh });
  } catch (err) {
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

app.get('/api/warehouse', (req, res) => {
  const { cp } = req.query;
  if (!cp || !/^\d{5}$/.test(cp)) {
    return res.json({ valid: false, error: 'Código postal inválido' });
  }
  const prefix = cp.slice(0, 2);
  if (!CP_WAREHOUSE[prefix]) {
    return res.json({ valid: false, error: 'Código postal no corresponde a una provincia con tienda' });
  }
  const province = PROVINCE_BY_PREFIX[prefix];
  const wh = cpToWarehouse(cp);
  res.json({
    valid: true,
    warehouse: wh,
    cp,
    province: province || 'Desconocida',
    info: WAREHOUSE_INFO[wh] || { city: 'Otra' },
  });
});

app.get('/api/catalog/status', (req, res) => {
  const { wh } = req.query;
  if (wh) {
    const ready = catalogs[wh] && buildingStatus[wh] === 'ready';
    return res.json({
      warehouse: wh,
      ready,
      building: buildingStatus[wh] === 'building',
      products: catalogs[wh]?.products?.length || 0,
      builtAt: catalogs[wh]?.builtAt ? new Date(catalogs[wh].builtAt).toISOString() : null,
    });
  }
  // Return status for all requested (built) warehouses
  const warehouses = {};
  for (const wh of Object.keys(catalogs)) {
    warehouses[wh] = {
      status: buildingStatus[wh] || 'ready',
      products: catalogs[wh]?.products?.length || 0,
      builtAt: catalogs[wh]?.builtAt ? new Date(catalogs[wh].builtAt).toISOString() : null,
    };
  }
  res.json({ warehouses, categories_cached: !!categoriesCache });
});

app.get('/api/catalog/build/:wh', async (req, res) => {
  const { wh } = req.params;
  if (!ALL_WAREHOUSES.includes(wh)) return res.status(400).json({ error: 'Invalid warehouse' });
  res.json({ building: true, warehouse: wh });
  buildProductCatalog(wh);
});

app.get('/api/status', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
  });
});

// --- Static files (production) ---
const distPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`[Static] Serving ${distPath}`);
}

// --- Startup ---
// Load disk cache for any previously built warehouses (instant)
loadAllCached();

// Load cached Algolia credentials
loadAlgoliaCreds();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`[Startup] ${Object.keys(catalogs).length} warehouses loaded from disk cache`);

  // Check for stale caches and refresh in background
  for (const wh of Object.keys(catalogs)) {
    const store = catalogs[wh];
    if (store && (Date.now() - store.builtAt > CACHE_TTL)) {
      console.log(`[Startup] Cache stale for ${wh}, refreshing in background...`);
      buildProductCatalog(wh);
    }
  }
  console.log('[Startup] Categories and products load on demand');
});
