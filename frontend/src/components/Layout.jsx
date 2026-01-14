import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path 
    ? "bg-blue-600 text-white" 
    : "text-slate-400 hover:bg-slate-800 hover:text-white";

  const handleLogout = () => {
      localStorage.removeItem('merchant');
      window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">GATEWAY</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Merchant Dashboard</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <Link to="/dashboard" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive('/dashboard')}`}>
            Overview
          </Link>
          <Link to="/transactions" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive('/transactions')}`}>
            Transactions
          </Link>
          <Link to="/webhooks" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive('/webhooks')}`}>
            Webhooks
          </Link>
          <Link to="/docs" className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive('/docs')}`}>
            Developers
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-900 rounded transition">
                Logout
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Layout;