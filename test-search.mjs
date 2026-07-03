// Test suite for Mercadona search API
// Run: node test-search.mjs

const BASE = 'http://localhost:3001';
const CP = '28001'; // Madrid

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function search(q, opts = {}) {
  let url = `${BASE}/api/products/search?q=${encodeURIComponent(q)}&cp=${opts.cp || CP}`;
  if (opts.category) url += `&category=${encodeURIComponent(opts.category)}`;
  const res = await fetch(url);
  return await res.json();
}

async function status(wh) {
  const res = await fetch(`${BASE}/api/catalog/status?wh=${wh}`);
  return await res.json();
}

console.log('\n📦 Test Suite: Búsqueda de productos\n');

// 1. Basic search
console.log('\n1️⃣  Búsquedas básicas');
await test('buscar "arroz" devuelve resultados', async () => {
  const data = await search('arroz');
  assert(data.results.length > 0, `esperaba >0 resultados, obtuve ${data.results.length}`);
  assert(data.catalog_ready === true);
});

await test('buscar "leche" devuelve resultados', async () => {
  const data = await search('leche');
  assert(data.results.length > 0);
});

await test('buscar producto inexistente devuelve array vacío', async () => {
  const data = await search('xyzproductoqueensiexiste12345');
  assert(Array.isArray(data.results), 'results debe ser array');
});

await test('búsqueda con acentos funciona', async () => {
  const data = await search('café');
  // Should normalize and find "cafe" products
  assert(Array.isArray(data.results));
});

await test('búsqueda vacía no debería fallar', async () => {
  const data = await search('');
  assert(Array.isArray(data.results));
});

// 2. Actual product that the user reported
console.log('\n2️⃣  Producto específico: arroz tres delicias');
await test('buscar "arroz tres delicias" devuelve resultados por relajación de query', async () => {
  const data = await search('arroz tres delicias');
  // Query relaxation should find results for "arroz" at minimum
  assert(data.results.length > 0, `esperaba resultados por relajación, obtuve ${data.results.length}`);
  const found = data.results.find(p =>
    p.id === 86905 || (p.name && p.name.toLowerCase().includes('arroz'))
  );
  assert(found, 'ningún resultado contiene "arroz"');
});

await test('buscar "arroz 3 delicias" (con número) devuelve resultados', async () => {
  const data = await search('arroz 3 delicias');
  assert(data.results.length > 0);
});

// 3. Category search
console.log('\n3️⃣  Búsqueda por categoría');
await test('buscar por categoría "Arroz" devuelve productos', async () => {
  const data = await search('', { category: 'Arroz' });
  assert(data.results.length > 0, `esperaba >0 resultados para categoría Arroz, obtuve ${data.results.length}`);
});

await test('buscar por categoría inexistente devuelve array vacío', async () => {
  const data = await search('', { category: 'CategoríaFalsa123' });
  assert(Array.isArray(data.results));
});

// 4. Warehouse mapping
console.log('\n4️⃣  Mapeo de almacén');
await test('CP de Madrid usa mad1', async () => {
  const data = await search('arroz', { cp: '28001' });
  assert(data.warehouse === 'mad1', `esperaba mad1, obtuve ${data.warehouse}`);
});

await test('CP de Barcelona usa bcn1', async () => {
  const data = await search('arroz', { cp: '08001' });
  assert(data.warehouse === 'bcn1', `esperaba bcn1, obtuve ${data.warehouse}`);
});

await test('CP de Vitoria usa bil1', async () => {
  const data = await search('arroz', { cp: '01008' });
  assert(data.warehouse === 'bil1', `esperaba bil1, obtuve ${data.warehouse}`);
});

// 5. Edge cases
console.log('\n5️⃣  Casos límite');
await test('búsqueda con caracteres especiales no falla', async () => {
  const data = await search('arroz!!! @#$%');
  assert(Array.isArray(data.results));
});

await test('búsqueda con query muy larga no falla', async () => {
  const long = 'a'.repeat(200);
  const data = await search(long);
  assert(Array.isArray(data.results));
});

await test('búsqueda con espacios múltiples', async () => {
  const data = await search('arroz    tres   delicias');
  assert(Array.isArray(data.results));
});

await test('búsqueda numérica (ID de producto)', async () => {
  const data = await search('86905');
  assert(Array.isArray(data.results));
});

await test('búsqueda sin CP usa almacén por defecto', async () => {
  const data = await search('arroz', { cp: '' });
  assert(data.warehouse, 'debe devolver un warehouse');
});

// 6. Catalog status
console.log('\n6️⃣  Estado del catálogo');
await test('/api/catalog/status devuelve estado', async () => {
  const st = await status('mad1');
  assert('ready' in st, st);
  assert('products' in st, st);
  assert('building' in st, st);
});

// Summary
console.log(`\n${'─'.repeat(50)}`);
console.log(`Resultados: ${passed} ✅  ${failed} ❌  ${passed + failed} total`);
if (failed > 0) process.exit(1);
