import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const API_URL = 'http://localhost:8000/api/v1';

const StatusBadge = ({ status, isRefunded }) => {
  if (isRefunded) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium border bg-purple-900/30 text-purple-400 border-purple-800">REFUNDED</span>;
  }

  const styles = {
    paid: 'bg-green-900/30 text-green-400 border-green-800',
    success: 'bg-green-900/30 text-green-400 border-green-800',
    pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    failed: 'bg-red-900/30 text-red-400 border-red-800',
    created: 'bg-slate-700 text-slate-300 border-slate-600',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.created}`}>
      {status ? status.toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

const TransactionsContent = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRefund, setProcessingRefund] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const storedMerchant = localStorage.getItem('merchant');
    if (!storedMerchant) return;
    const merchant = JSON.parse(storedMerchant);

    try {
      const res = await fetch(`${API_URL}/orders?limit=50`, {
        headers: { 'X-Api-Key': merchant.api_key, 'X-Api-Secret': merchant.api_secret }
      });
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (orderId, paymentId, fullAmount) => {
    if (!paymentId) return;
    if (!window.confirm(`Are you sure you want to refund ₹${(fullAmount).toFixed(2)}?`)) return;

    setProcessingRefund(orderId);
    const storedMerchant = localStorage.getItem('merchant');
    const merchant = JSON.parse(storedMerchant);

    try {
        const res = await fetch(`${API_URL}/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Api-Key': merchant.api_key, 
                'X-Api-Secret': merchant.api_secret 
            },
            body: JSON.stringify({ amount: fullAmount, reason: "Merchant Dashboard Request" })
        });

        if (res.ok) {
            alert("Refund Processed Successfully!");
            fetchTransactions(); // This will now fetch the updated refunded_amount
        } else {
            const data = await res.json();
            alert(`Refund Failed: ${data.error?.description || "Unknown Error"}`);
        }
    } catch (err) {
        alert("Network Error");
    } finally {
        setProcessingRefund(null);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Transactions...</div>;

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-white mb-6">Transactions</h2>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {transactions.map((txn) => {
                 // Check if the order is fully refunded
                 const isRefunded = parseInt(txn.refunded_amount) >= parseInt(txn.amount);
                 
                 return (
                    <tr key={txn.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-white">{txn.id}</td>
                      <td className="px-6 py-4 font-medium text-white">{(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">{txn.currency}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={txn.status} isRefunded={isRefunded} />
                      </td>
                      <td className="px-6 py-4">{new Date(txn.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {txn.status === 'paid' && !isRefunded && (
                           <button 
                             onClick={() => handleRefund(txn.id, txn.payment_id, txn.amount)}
                             disabled={processingRefund === txn.id}
                             className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-1 rounded transition text-xs font-medium border border-red-900/50"
                           >
                             {processingRefund === txn.id ? 'Processing...' : 'Refund'}
                           </button>
                        )}
                        {isRefunded && (
                            <span className="text-slate-500 text-xs italic">Refund Processed</span>
                        )}
                      </td>
                    </tr>
                 );
              })}
              {transactions.length === 0 && (
                 <tr><td colSpan="6" className="px-6 py-8 text-center">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Transactions = () => (
  <Layout>
    <TransactionsContent />
  </Layout>
);

export default Transactions;