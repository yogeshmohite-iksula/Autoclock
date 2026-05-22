// main.jsx — React + Router bootstrap.
// Imports the canonical theme FIRST so token resolution is deterministic.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles/autoclock-theme.css';   // brand tokens + base components
import './styles/global.css';            // sizing + sr-only
import './styles/chrome.css';            // shared chrome corners
import './styles/backgrounds.css';       // bg-* layers

import { AuthProvider } from './auth/AuthContext';
import AppRoutes from './routes';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
