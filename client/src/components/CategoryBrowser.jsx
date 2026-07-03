import { useState, useEffect } from 'react';
import './CategoryBrowser.css';

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

export default function CategoryBrowser({ onSelectCategory, cp }) {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveSection(null);
    setSubcategories([]);
    let url = '/api/categories';
    if (cp && cp.length === 5) url += `?cp=${cp}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setSections(data.results || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cp]);

  function handleSection(section) {
    if (activeSection?.id === section.id) {
      setActiveSection(null);
      setSubcategories([]);
      return;
    }
    setActiveSection(section);
    const subs = [];
    function collect(cats) {
      for (const c of cats) {
        if (c.published === false) continue;
        if (c.categories && c.categories.length > 0) {
          const hasMore = c.categories.some(sc => sc.categories?.length > 0);
          if (hasMore) {
            collect(c.categories);
          } else {
            for (const sc of c.categories) {
              if (sc.published !== false) subs.push(sc);
            }
          }
        } else {
          subs.push(c);
        }
      }
    }
    if (section.categories) collect(section.categories);
    setSubcategories(subs);
  }

  function handleSubcategory(cat, sectionName) {
    onSelectCategory(cat.name, sectionName);
    setActiveSection(null);
    setSubcategories([]);
  }

  return (
    <div className="category-browser">
      <h2 className="category-title">Categorías</h2>
      {loading ? (
        <div className="category-loading" aria-label="Cargando categorías">
          <span className="category-spinner" />
        </div>
      ) : (
        <>
          <div className="category-tabs" role="tablist" aria-label="Secciones">
            {sections.map(section => (
              <button
                key={section.id}
                className={`category-tab ${activeSection?.id === section.id ? 'active' : ''}`}
                onClick={() => handleSection(section)}
                role="tab"
                aria-selected={activeSection?.id === section.id}
                aria-controls={`panel-${section.id}`}
              >
                <span className="category-tab-icon" aria-hidden="true">
                  {getIcon(section.name)}
                </span>
                <span className="category-tab-name">{section.name}</span>
              </button>
            ))}
          </div>
          {activeSection && subcategories.length > 0 && (
            <div className="category-subs-wrap" id={`panel-${activeSection.id}`} role="tabpanel">
              <div className="category-subs-section-label">
                {getIcon(activeSection.name)} {activeSection.name}
              </div>
              <div className="category-subs-grid">
                {subcategories.slice(0, 30).map(sub => (
                  <button
                    key={sub.id}
                    className="category-sub-chip"
                    onClick={() => handleSubcategory(sub, activeSection.name)}
                  >
                    {sub.name}
                  </button>
                ))}
                {subcategories.length > 30 && (
                  <span className="category-more">+{subcategories.length - 30} más</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
