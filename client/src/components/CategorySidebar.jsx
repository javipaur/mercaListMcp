import { useState, useEffect } from 'react';
import './CategorySidebar.css';

const SECTION_ICONS = {
  'Aceite, especias y salsas': '🫒',
  'Agua y refrescos': '💧',
  'Aperitivos': '🥨',
  'Arroz, legumbres y pasta': '🍚',
  'Azúcar, caramelos y chocolate': '🍫',
  'Bebé': '👶',
  'Bodega': '🍷',
  'Cacao, café e infusiones': '☕',
  'Carne': '🥩',
  'Cereales y galletas': '🥣',
  'Charcutería y quesos': '🧀',
  'Congelados': '❄️',
  'Conservas, caldos y cremas': '🥫',
  'Cuidado del cabello': '💇',
  'Cuidado facial y corporal': '🧴',
  'Fitoterapia y parafarmacia': '💊',
  'Fruta y verdura': '🥬',
  'Huevos, leche y mantequilla': '🥛',
  'Limpieza y hogar': '🧹',
  'Maquillaje': '💄',
  'Marisco y pescado': '🐟',
  'Mascotas': '🐾',
  'Panadería y pastelería': '🥖',
  'Pizzas y platos preparados': '🍕',
  'Postres y yogures': '🍦',
  'Zumos': '🧃',
};

function getIcon(name) {
  return SECTION_ICONS[name] || '📦';
}

export default function CategorySidebar({ onSelectCategory, cp, activeSection, onClearSection }) {
  const [sections, setSections] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let url = '/api/categories';
    if (cp && cp.length === 5) url += `?cp=${cp}`;
    fetch(url)
      .then(r => r.json())
      .then(data => setSections(data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cp]);

  function toggleSection(section) {
    if (expandedSection?.id === section.id) {
      setExpandedSection(null);
      setSubcategories([]);
      onClearSection?.();
      return;
    }
    setExpandedSection(section);
    const subs = [];
    function collect(cats) {
      for (const c of cats) {
        if (c.published === false) continue;
        if (c.categories && c.categories.length > 0) {
          const hasMore = c.categories.some(sc => sc.categories?.length > 0);
          if (hasMore) collect(c.categories);
          else for (const sc of c.categories) { if (sc.published !== false) subs.push(sc); }
        } else subs.push(c);
      }
    }
    if (section.categories) collect(section.categories);
    setSubcategories(subs);
  }

  return (
    <nav className="cat-sidebar" aria-label="Categorías">
      <div className="cat-sidebar-header">
        <h2 className="cat-sidebar-title">Categorías</h2>
        {loading && <span className="cat-sidebar-spinner" />}
      </div>
      <div className="cat-sidebar-list">
        {sections.map(section => {
          const isExpanded = expandedSection?.id === section.id;
          return (
            <div key={section.id} className="cat-sidebar-group">
              <button
                className={`cat-sidebar-btn ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleSection(section)}
                aria-expanded={isExpanded}
              >
                <span className="cat-sidebar-icon" aria-hidden="true">{getIcon(section.name)}</span>
                <span className="cat-sidebar-label">{section.name}</span>
                <svg
                  className={`cat-sidebar-chevron ${isExpanded ? 'open' : ''}`}
                  viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"
                >
                  <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </button>
              {isExpanded && (
                <div className="cat-sidebar-subs" role="list">
                  {subcategories.slice(0, 15).map(sub => (
                    <button
                      key={sub.id}
                      className="cat-sidebar-sub"
                      onClick={() => {
                        onSelectCategory(sub.name, section.name);
                        setExpandedSection(null);
                        setSubcategories([]);
                      }}
                      role="listitem"
                    >
                      {sub.name}
                    </button>
                  ))}
                  {subcategories.length > 15 && (
                    <span className="cat-sidebar-more">+{subcategories.length - 15}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
