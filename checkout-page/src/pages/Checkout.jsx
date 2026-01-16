import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Success from './Success';
import Failure from './Failure';

const API_URL = 'http://localhost:8000/api/v1';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState(null); // 'upi' or 'card'
  const [status, setStatus] = useState('initial'); // initial, processing, success, failed
  const [paymentId, setPaymentId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form States
  const [vpa, setVpa] = useState('');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });

  useEffect(() => {
    if (orderId) {
      fetch(`${API_URL}/orders/${orderId}/public`)
        .then(res => res.json())
        .then(data => {
            if(data.error) throw new Error(data.error);
            setOrder(data);
        })
        .catch(err => {
            setStatus('failed');
            setErrorMsg('Invalid Order ID');
        });
    }
  }, [orderId]);

  // Polling logic
  useEffect(() => {
    let interval;
    if (status === 'processing' && paymentId) {
      interval = setInterval(() => {
        fetch(`${API_URL}/payments/${paymentId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
                setStatus('success');
                clearInterval(interval);
            } else if (data.status === 'failed') {
                setStatus('failed');
                setErrorMsg(data.error_description || 'Payment Failed');
                clearInterval(interval);
            }
          });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, paymentId]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setStatus('processing');

    const payload = {
        order_id: orderId,
        method: method,
    };

    if (method === 'upi') {
        payload.vpa = vpa;
    } else {
        const cleanNumber = cardData.number.replace(/\s/g, '');
        const [month, year] = cardData.expiry.split('/');
        
        payload.card = {
            number: cleanNumber,
            expiry_month: month,
            expiry_year: year,
            cvv: cardData.cvv,
            holder_name: cardData.name
        };
    }

    try {
        const res = await fetch(`${API_URL}/payments/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            setPaymentId(data.id);
        } else {
            setStatus('failed');
            setErrorMsg(data.error?.description || 'Validation Failed');
        }
    } catch (err) {
        setStatus('failed');
        setErrorMsg('Network Error');
    }
  };

  if (!orderId) return <div className="text-center p-10 text-red-500">Missing Order ID</div>;
  if (!order && status !== 'failed') return <div className="text-center p-10">Loading Order...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" data-test-id="checkout-container">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Order Summary */}
        <div className="bg-indigo-600 p-6 text-white" data-test-id="order-summary">
          <h2 className="text-xl font-bold mb-4 opacity-90">Complete Payment</h2>
          <div className="flex justify-between items-end">
            <div>
               <div className="text-indigo-200 text-sm">Amount to pay</div>
               {/* MODIFIED: Display Raw Amount directly (50000 instead of 500.00) */}
               <div className="text-3xl font-bold" data-test-id="order-amount">
                  {order?.amount} {order?.currency || 'INR'}
               </div>
            </div>
            <div className="text-right">
                <div className="text-indigo-200 text-xs">Order ID</div>
                <div className="font-mono text-sm" data-test-id="order-id">{orderId}</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {status === 'success' && <Success paymentId={paymentId} />}
          
          {status === 'failed' && <Failure errorMsg={errorMsg} onRetry={() => setStatus('initial')} />}

          {status === 'processing' && (
             <div data-test-id="processing-state" className="text-center py-12">
                 <div className="spinner w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                 <span data-test-id="processing-message" className="text-gray-600 font-medium animate-pulse">
                     Processing payment...
                 </span>
             </div>
          )}

          {status === 'initial' && (
            <>
              <div data-test-id="payment-methods" className="flex space-x-4 mb-8">
                <button 
                  data-test-id="method-upi" 
                  data-method="upi"
                  onClick={() => setMethod('upi')}
                  className={`flex-1 py-3 border rounded-xl font-medium transition-all ${method === 'upi' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  UPI
                </button>
                <button 
                  data-test-id="method-card" 
                  data-method="card"
                  onClick={() => setMethod('card')}
                  className={`flex-1 py-3 border rounded-xl font-medium transition-all ${method === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  Card
                </button>
              </div>

              {method === 'upi' && (
                <form data-test-id="upi-form" onSubmit={handlePayment} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Virtual Payment Address</label>
                      <input
                        data-test-id="vpa-input"
                        type="text"
                        placeholder="username@bank"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={vpa}
                        onChange={(e) => setVpa(e.target.value)}
                        required
                      />
                  </div>
                  {/* MODIFIED: Display Raw Amount in Button */}
                  <button data-test-id="pay-button" type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                    Pay {order.amount} {order.currency}
                  </button>
                </form>
              )}

              {method === 'card' && (
                <form data-test-id="card-form" onSubmit={handlePayment} className="space-y-4">
                  <div>
                     <input
                        data-test-id="card-number-input"
                        type="text"
                        placeholder="Card Number"
                        className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                        value={cardData.number}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').substring(0, 16);
                            const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
                            setCardData({...cardData, number: formatted});
                        }}
                        maxLength="19" 
                        required
                     />
                     <div className="flex space-x-4 mb-4">
                        <input
                            data-test-id="expiry-input"
                            type="text"
                            placeholder="MM/YY"
                            className="w-1/2 p-3 border border-gray-300 rounded-lg"
                            value={cardData.expiry}
                            onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                            required
                        />
                        <input
                            data-test-id="cvv-input"
                            type="text"
                            placeholder="CVV"
                            className="w-1/2 p-3 border border-gray-300 rounded-lg"
                            value={cardData.cvv}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setCardData({...cardData, cvv: value});
                            }}
                            required
                        />
                     </div>
                     <input
                        data-test-id="cardholder-name-input"
                        type="text"
                        placeholder="Name on Card"
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        value={cardData.name}
                        onChange={(e) => setCardData({...cardData, name: e.target.value})}
                        required
                     />
                  </div>
                  {/* MODIFIED: Display Raw Amount in Button */}
                  <button data-test-id="pay-button" type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                    Pay {order.amount} {order.currency}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;