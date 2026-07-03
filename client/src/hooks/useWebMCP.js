import { useState, useEffect, useRef } from 'react';

export function useWebMCP({ onSearch, onAddItem, onRemoveItem, onGetList, onClearList, onGetPantry, onGetLowStock }) {
  const [ready, setReady] = useState(false);
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;

    async function setup() {
      const { createKit, defineTool } = await import('webmcp-sdk');
      const kit = createKit({ prefix: 'mercalist' });

      kit.register(defineTool('search_products', {
        description: 'Busca productos de Mercadona por nombre o categoría',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Término de búsqueda' },
          },
          required: ['query'],
        },
        execute: async ({ query }) => {
          const results = await onSearch(query);
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        },
      }));

      kit.register(defineTool('add_to_list', {
        description: 'Añade un producto a la lista de la compra',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'ID del producto' },
            name: { type: 'string', description: 'Nombre del producto' },
            price: { type: 'number', description: 'Precio del producto' },
            thumbnail: { type: 'string', description: 'URL de la imagen' },
          },
          required: ['id', 'name'],
        },
        execute: async ({ id, name, price, thumbnail }) => {
          onAddItem({ id, name, price, thumbnail });
          return { content: [{ type: 'text', text: `"${name}" añadido a la lista` }] };
        },
      }));

      kit.register(defineTool('remove_from_list', {
        description: 'Elimina un producto de la lista de la compra',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'ID del producto a eliminar' },
          },
          required: ['id'],
        },
        execute: async ({ id }) => {
          onRemoveItem(id);
          return { content: [{ type: 'text', text: 'Producto eliminado de la lista' }] };
        },
      }));

      kit.register(defineTool('get_list', {
        description: 'Obtiene la lista de la compra actual',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          const list = onGetList();
          return { content: [{ type: 'text', text: JSON.stringify(list, null, 2) }] };
        },
      }));

      kit.register(defineTool('clear_list', {
        description: 'Vacía la lista de la compra',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          onClearList();
          return { content: [{ type: 'text', text: 'Lista vaciada' }] };
        },
      }));

      if (onGetPantry) {
        kit.register(defineTool('get_pantry', {
          description: 'Obtiene la bodega/despensa actual con cantidades de stock',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => {
            const pantry = onGetPantry();
            return { content: [{ type: 'text', text: JSON.stringify(pantry, null, 2) }] };
          },
        }));
      }

      if (onGetLowStock) {
        kit.register(defineTool('get_low_stock', {
          description: 'Obtiene los productos de la bodega con poco stock (por debajo del umbral)',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => {
            const low = onGetLowStock();
            return { content: [{ type: 'text', text: JSON.stringify(low, null, 2) }] };
          },
        }));
      }

      registered.current = true;
      setReady(true);
    }

    setup();
  }, []);

  return { ready };
}
