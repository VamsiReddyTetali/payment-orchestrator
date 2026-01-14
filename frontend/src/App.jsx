import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Webhooks from './pages/Webhooks';
import Docs from './pages/Docs';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. Root Route: Redirect to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 2. Authentication Route */}
        <Route path="/login" element={<Login />} />

        {/* 3. Dashboard Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </Router>
  );
}

export default App;