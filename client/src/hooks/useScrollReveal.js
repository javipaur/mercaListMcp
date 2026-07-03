import { useEffect, useRef } from 'react';

export function useScrollReveal(selector = '.reveal', options = {}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const elements = rootRef.current
      ? rootRef.current.querySelectorAll(selector)
      : document.querySelectorAll(selector);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px',
        ...options,
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [selector, options]);
}
