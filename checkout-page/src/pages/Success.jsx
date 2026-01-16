import React, { useEffect } from 'react';

const Success = ({ paymentId }) => {
  
  // Emit event to parent window (for Embeddable SDK)
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'payment_success',
        data: { paymentId }
      }, '*');
    }
  }, [paymentId]);

  return (
    <div className="text-center py-12 animate-fade-in" data-test-id="success-message">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
      <p className="text-gray-500 mb-6">Your transaction has been completed.</p>
      
      <div className="bg-gray-50 rounded-lg p-4 max-w-xs mx-auto border border-gray-200">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment ID</div>
        <div className="font-mono text-sm font-medium text-gray-700 select-all">{paymentId}</div>
      </div>
    </div>
  );
};

export default Success;