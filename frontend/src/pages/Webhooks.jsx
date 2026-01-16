import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const API_URL = 'http://localhost:8000/api/v1';

const WebhooksContent = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    const storedMerchant = localStorage.getItem('merchant');
    if (!storedMerchant) return;
    const merchant = JSON.parse(storedMerchant);

    try {
      const res = await fetch(`${API_URL}/webhooks?limit=20`, {
        headers: { 'X-Api-Key': merchant.api_key, 'X-Api-Secret': merchant.api_secret }
      });
      const data = await res.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (logId) => {
    const storedMerchant = localStorage.getItem('merchant');
    const merchant = JSON.parse(storedMerchant);
    
    try {
        const res = await fetch(`${API_URL}/webhooks/${logId}/retry`, {
            method: 'POST',
            headers: { 'X-Api-Key': merchant.api_key, 'X-Api-Secret': merchant.api_secret }
        });
        if(res.ok) {
            alert("Retry Scheduled!");
            fetchWebhooks(); // Refresh list
        }
    } catch(err) {
        alert("Retry Failed");
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Webhooks...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Webhook Logs</h2>
          <button onClick={fetchWebhooks} className="text-sm bg-slate-700 text-white px-3 py-1 rounded hover:bg-slate-600">Refresh</button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Event Type</th>
              <th className="px-6 py-4">Delivery Status</th>
              <th className="px-6 py-4">Response</th>
              <th className="px-6 py-4">Attempts</th>
              <th className="px-6 py-4">Last Attempt</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 font-mono font-medium">
                    {/* Color code the event name for clarity */}
                    <span className={log.event.includes('success') ? 'text-green-400' : 'text-red-400'}>
                        {log.event}
                    </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs border ${
                    log.status === 'success' ? 'border-green-800 text-green-400 bg-green-900/20' : 
                    log.status === 'pending' ? 'border-yellow-800 text-yellow-400 bg-yellow-900/20' : 
                    'border-red-800 text-red-400 bg-red-900/20'
                  }`}>{log.status}</span>
                </td>
                <td className="px-6 py-4 font-mono">{log.response_code || '-'}</td>
                <td className="px-6 py-4">{log.attempts}</td>
                <td className="px-6 py-4 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                <td className="px-6 py-4">
                    {log.status !== 'success' && (
                        <button onClick={() => handleRetry(log.id)} className="text-blue-400 hover:underline">Retry</button>
                    )}
                </td>
              </tr>
            ))}
             {logs.length === 0 && (
                 <tr><td colSpan="6" className="px-6 py-8 text-center">No logs found</td></tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Webhooks = () => (
    <Layout>
        <WebhooksContent />
    </Layout>
);

export default Webhooks;