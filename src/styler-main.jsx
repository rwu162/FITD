import React from 'react';
import { createRoot } from 'react-dom/client';
import './styler-page.css';
import './index.css';
import './fullpage.css';
import './styling.css';
import StylerPage from './StylerPage';

console.log('Styler Main Script Loaded');

// Create root and render the styler page component
try {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <StylerPage />
    </React.StrictMode>
  );
  console.log('Styler Page Rendered Successfully');
} catch (error) {
  console.error('Error rendering Styler Page:', error);
}