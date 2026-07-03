import { useState, useEffect, useRef } from 'react';
import './CategoryBar.css';

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

export default function CategoryBar({ onSelectCategory, cp }) {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setLoading(true);
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

  function collectSubs(section) {
    const subs = [];
    if (!section.categories) return subs;
    for (const cat of section.categories) {
      if (cat.published === false) continue;
      if (cat.categories && cat.categories.length > 0) {
        for (const sub of cat.categories) {
          if (sub.published !== false) subs.push(sub);
        }
      } else {
        subs.push(cat);
      }
    }
    return subs;
  }

  function toggleSection(section) {
    if (activeSection?.id === section.id) {
      setActiveSection(null);
      return;
    }
    setActiveSection(section);

    if (scrollRef.current) {
      const btn = scrollRef.current.querySelector(`[data-id="${section.id}"]`);
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  function handleSubcategory(cat, sectionName) {
    onSelectCategory(cat.name, sectionName);
    setActiveSection(null);
  }

  return (
    <nav className="cat-bar" aria-label="Categorías">
      <div className="cat-bar-scroll" ref={scrollRef}>
        {loading && sections.length === 0 && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="cat-bar-skeleton" />
            ))}
          </>
        )}
        {sections.map(section => (
          <button
            key={section.id}
            data-id={section.id}
            className={`cat-bar-btn ${activeSection?.id === section.id ? 'active' : ''}`}
            onClick={() => toggleSection(section)}
            aria-expanded={activeSection?.id === section.id}
          >
            <span className="cat-bar-icon" aria-hidden="true">{getIcon(section.name)}</span>
            <span className="cat-bar-label">{section.name}</span>
          </button>
        ))}
      </div>

      {activeSection && (() => {
        const subs = collectSubs(activeSection);
        return subs.length > 0 ? (
          <div className="cat-bar-dropdown" role="list">
            <div className="cat-bar-dropdown-inner">
              {subs.slice(0, 50).map(sub => (
                <button
                  key={sub.id}
                  className="cat-bar-sub"
                  onClick={() => handleSubcategory(sub, activeSection.name)}
                  role="listitem"
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </nav>
  );
}
