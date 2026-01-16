import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Checkout from './pages/Checkout';

function App() {
  return (
    <Router>
      <Routes>
        {/* The main route for the payment page */}
        <Route path="/checkout" element={<Checkout />} />
        
        {/* Fallback for root path */}
        <Route path="/" element={<div className="text-center p-10">Payment Gateway Checkout Service</div>} />
      </Routes>
    </Router>
  );
}

export default App;