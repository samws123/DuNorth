// Hydration system for converting static HTML to React islands
import React from 'react';
import { hydrateRoot } from 'react-dom/client';

// Component registry
const registry = {};

// Register a component for hydration
export function registerComponent(name, component) {
  registry[name] = component;
}

// Get initial props from DOM data attributes
function getInitialProps(el) {
  const json = el.getAttribute('data-props');
  return json ? JSON.parse(json) : {};
}

// Hydrate all marked elements
export function hydrateAll() {
  document.querySelectorAll('[data-react-hydrate]').forEach((el) => {
    const name = el.getAttribute('data-react-hydrate');
    const Component = registry[name];
    
    if (Component) {
      const props = getInitialProps(el);
      hydrateRoot(el, React.createElement(Component, props));
    } else {
      console.warn(`Component ${name} not found in registry`);
    }
  });
}

// Auto-hydrate when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAll);
  } else {
    hydrateAll();
  }
}
