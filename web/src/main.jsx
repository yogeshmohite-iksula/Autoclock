import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import LogPage from './pages/LogPage';
import PreviewPage from './pages/PreviewPage';
import DashboardPage from './pages/DashboardPage';
import './assets/tokens.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/log" replace />} />
          <Route path="log" element={<LogPage />} />
          <Route path="preview" element={<PreviewPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
