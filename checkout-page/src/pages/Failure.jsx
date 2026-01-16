import React from 'react';

const Failure = ({ errorMsg, onRetry }) => {
  return (
    <div data-test-id="error-state" className="text-center py-8">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
      <p data-test-id="error-message" className="text-red-500 mb-6">
        {errorMsg}
      </p>
      <button 
        data-test-id="retry-button" 
        onClick={onRetry} 
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
      >
        Try Again
      </button>
    </div>
  );
};

export default Failure;