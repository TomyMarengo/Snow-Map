// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Sidebar from '@/components/Sidebar';
import HomePage from '@/pages/HomePage';
import SnowMapPage from '@/pages/SnowMapPage';

const App: React.FC = () => {
  const menuItems = [
    { key: 'home', label: 'Inicio', path: '/' },
    {
      key: 'snow-map',
      label: 'Análisis de mapa',
      path: '/snow-map',
    },
  ];

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />{' '}
        <Route path="/snow-map" element={<SnowMapPage />} />
        <Route path="*" element={<div>Pagina no encontrada</div>} />
      </Routes>
    );
  };

  return (
    <Router>
      <Sidebar items={menuItems} />
      <div className="ml-60 p-4 h-screen overflow-auto transition-all duration-300">
        {renderContent()}
      </div>
    </Router>
  );
};

export default App;
