import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './fullpage.css';
import './styling.css';
import VirtualClosetFullPage from './fullpage';

// Create root and render the fullpage component
const root = createRoot(document.getElementById('app'));
root.render(
  <React.StrictMode>
    <VirtualClosetFullPage />
  </React.StrictMode>
);