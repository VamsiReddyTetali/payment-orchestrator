import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const API_URL = 'http://localhost:8000/api/v1';

const StatCard = ({ title, value, subtext, color }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
    <div className={`text-3xl font-bold mt-2 ${color}`}>{value}</div>
    {subtext && <div className="text-slate-500 text-xs mt-1">{subtext}</div>}
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    success: 'bg-green-900/30 text-green-400 border-green-800',
    pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    processing: 'bg-blue-900/30 text-blue-400 border-blue-800',
    failed: 'bg-red-900/30 text-red-400 border-red-800',
  };
  const defaultStyle = 'bg-slate-700 text-slate-300';
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || defaultStyle}`}>
      {status ? status.toUpperCase() : 'UNKNOWN'}
    </span>
  );
};

const DashboardContent = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ volume: 0, count: 0, successRate: 0 });

  useEffect(() => {
    // 1. GET CREDENTIALS FROM LOCAL STORAGE (The "Logged In" User)
    const storedMerchant = localStorage.getItem('merchant');

    if (!storedMerchant) {
      // If not logged in, kick them out to login page
      window.location.href = '/login';
      return;
    }

    const merchant = JSON.parse(storedMerchant);
    console.log("✅ Dashboard loaded for:", merchant.email);

    // 2. Fetch Orders using the logged-in merchant's keys
    fetch(`${API_URL}/orders?limit=50`, {
      headers: { 
        'X-Api-Key': merchant.api_key,
        'X-Api-Secret': merchant.api_secret 
      }
    })
      .then(res => res.json())
      .then(data => {
        const txns = Array.isArray(data) ? data : (data.data || []);
        setOrders(txns);
        
        // Calculate Live Stats
        const successful = txns.filter(t => t.status === 'paid' || t.status === 'success');
        const volume = successful.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const rate = txns.length > 0 ? ((successful.length / txns.length) * 100).toFixed(1) : 0;
        
        setStats({
          volume: volume,
          count: txns.length,
          successRate: rate
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-10 text-white animate-pulse">Loading Analytics...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Overview</h2>
          <p className="text-slate-400 mt-1">Real-time payment analytics</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => window.location.reload()} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition text-sm">
            Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard 
          title="Total Volume" 
          value={`₹${(stats.volume).toLocaleString()}`} 
          subtext="Processed successfully"
          color="text-emerald-400"
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.successRate}%`} 
          subtext="Based on recent transactions"
          color="text-blue-400"
        />
        <StatCard 
          title="Total Transactions" 
          value={stats.count} 
          subtext="All attempts"
          color="text-indigo-400"
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No transactions found</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-white">{order.id}</td>
                    <td className="px-6 py-4 text-white font-medium">
                      {order.currency} {(order.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(order.created_at).toLocaleDateString()} <span className="text-slate-600 text-xs">{new Date(order.created_at).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => (
    <Layout>
        <DashboardContent />
    </Layout>
);

export default Dashboard;