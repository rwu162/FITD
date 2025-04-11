import React from 'react';
import { createRoot } from 'react-dom/client';
import CategorySelector from './CategorySelector';
import './index.css';
import './styling.css';
import './category-selector.css';

console.log('Category Selector Main Script Loaded');

// Create root and render the category selector
try {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <CategorySelector />
    </React.StrictMode>
  );
  console.log('Category Selector Rendered Successfully');
} catch (error) {
  console.error('Error rendering Category Selector:', error);
}