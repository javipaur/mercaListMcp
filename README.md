# Mercalist

Lista de la compra inteligente para Mercadona con búsqueda instantánea, asistente por voz y agente AI.

## Características

- **Búsqueda instantánea** vía Algolia (búsqueda oficial de Mercadona) + catálogo propio con scrape
- **Navegación por categorías** estilo Mercadona (píldoras horizontales con emojis, subcategorías desplegables)
- **Productos rebajados** en carrusel con badge de descuento
- **Asistente por voz** (Web Speech API) — busca productos, añade a la lista, consulta la bodega
- **Agente AI** vía WebMCP (`navigator.modelContext`) — el navegador puede interactuar con la lista
- **Bodega / despensa virtual** — control de stock, umbrales de poco stock, historial de compras
- **Finalizar compra** — pasa todos los productos de la lista a la bodega de una vez
- **Productos frecuentes** basados en historial de compras con boost de recencia
- **Asignación CP → almacén** real de Mercadona (10 almacenes: mad1, bcn1, vlc1, bil1, svq1, alc1, ags1, pmr1, lpa1, tfe1)
- **Catálogo bajo demanda** — se construye solo para el almacén del CP introducido, con caché en disco
- **Responsive** — funcionando en móvil con header de 2 filas, drawer de carrito a ancho completo

## Tecnologías

| Capa | Stack |
|------|-------|
| Frontend | React 18, Vite, CSS vanilla |
| Backend | Express, node-fetch |
| Búsqueda | Algolia (API pública de Mercadona) + catálogo propio |
| Voz | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| AI Agent | WebMCP SDK (`navigator.modelContext`) |
| Proxy | Vite dev server → Express (puerto 3001) |
| Cache | localStorage (cliente) + disco `/server/cache/` (servidor) |

## Requisitos

- Node.js ≥ 18
- Navegador con Web Speech API (Chrome / Edge) para el asistente de voz
- Navegador con WebMCP (Chrome 146+) para el agente AI

## Instalación

```bash
git clone <repo-url>
cd mercalist-mcp
npm install                   # raíz (concurrently)
npm install --prefix client   # React + webmcp-sdk
npm install --prefix server   # Express + node-fetch
```

## Desarrollo

```bash
npm run dev
```

Arranca simultáneamente:
- **Cliente** en `http://localhost:5173` (Vite con proxy `/api → :3001`)
- **Servidor** en `http://localhost:3001` (Express, recarga automática con `--watch`)

## Build producción

```bash
npm run build             # build client → client/dist/
```

Sirve `client/dist/` con cualquier servidor estático apuntando `/api` al backend.
En producción el propio servidor Express sirve los estáticos de `client/dist/`.

## Despliegue con Dokploy (Nixpacks)

El proyecto está configurado para Nixpacks (auto-detecta Node.js, instala deps, build y start).

### En Dokploy:

1. **Crear servicio** → Application
2. **Source**: tu repositorio de GitHub
3. **Build**: dejar Nixpacks (por defecto)
4. **Puerto**: `3001`
5. **Volumen persistente** (opcional pero recomendado):
   - Ruta en el contenedor: `/app/server/cache`
   - Conserva los catálogos entre despliegues
6. **Variables de entorno**: ninguna requerida (opcional: `PORT`)

Nixpacks ejecuta automáticamente:
- `npm install` + `postinstall` → instala raíz, cliente y servidor
- `npm run build` → build de Vite a `client/dist/`
- `npm start` → Express sirve API + frontend juntos en el puerto 3001

## API (servidor)

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/products/search?q=leche&cp=01008` | Busca productos (Algolia + catálogo + scrape) |
| `GET /api/products/search?category=Lácteos&cp=01008` | Búsqueda por categoría |
| `GET /api/products/discounted?cp=01008` | Productos rebajados |
| `GET /api/categories?wh=bil1` | Categorías de un almacén |
| `GET /api/warehouse?cp=01008` | Almacén correspondiente al CP |
| `GET /api/catalog/status?wh=bil1` | Estado de construcción del catálogo |
| `POST /api/catalog/build/bil1` | Inicia construcción del catálogo |

## Asistente de voz

Comandos disponibles (español):

| Comando | Acción |
|---------|--------|
| "busca leche" | Busca productos |
| "añade leche" | Busca y añade el primero |
| "añade el segundo" | Añade el 2º resultado visible |
| "el cuarto" (standalone) | Añade el 4º resultado |
| "qué tengo en la bodega" | Resumen de la bodega |
| "qué se está acabando" | Productos con poco stock |
| "cuánta leche tengo" | Stock de un producto |
| "tengo huevos en la bodega" | Stock de un producto |

## Agente AI (WebMCP)

Herramientas registradas con prefijo `mercalist.*`:

- `mercalist.search_products` — busca productos
- `mercalist.add_to_list` — añade a la lista
- `mercalist.remove_from_list` — elimina de la lista
- `mercalist.get_list` — obtiene la lista actual
- `mercalist.clear_list` — vacía la lista
- `mercalist.get_pantry` — obtiene la bodega con stocks
- `mercalist.get_low_stock` — productos con poco stock

## Estructura

```
mercalist-mcp/
├── package.json            # Raíz: scripts dev/build con concurrently
├── .gitignore
├── test-search.mjs         # 24 tests de búsqueda
├── client/                 # React + Vite
│   ├── package.json
│   ├── vite.config.js      # Proxy /api → localhost:3001
│   └── src/
│       ├── main.jsx
│       ├── index.css       # Variables CSS (tokens de diseño)
│       ├── App.jsx         # Orquestador principal
│       ├── App.css
│       ├── hooks/
│       │   ├── useProducts.js  # Estado: productos, lista, bodega, historial
│       │   └── useWebMCP.js    # Integración WebMCP SDK
│       └── components/
│           ├── VoiceAssistant.jsx  # Reconocimiento de voz
│           ├── ShoppingList.jsx    # Lista de la compra
│           ├── Pantry.jsx          # Bodega / despensa
│           ├── ProductCard.jsx     # Tarjeta de producto
│           ├── CategoryBar.jsx     # Barra de categorías horizontal
│           ├── FrequentProducts.jsx # Productos frecuentes
│           ├── DiscountedCarousel.jsx # Carrusel de rebajados
│           ├── PostalCodeInput.jsx    # Input de CP
│           ├── Toast.jsx          # Notificaciones
│           └── SearchBar.jsx      # Barra de búsqueda
└── server/                 # Express API
    ├── package.json
    ├── .gitignore          # Ignora cache/ (catálogos generados)
    └── src/
        └── index.js        # Proxy, Algolia, scraping, warehouses, catálogo
```

## Licencia

Proyecto no oficial. Datos de la API pública de Mercadona.
