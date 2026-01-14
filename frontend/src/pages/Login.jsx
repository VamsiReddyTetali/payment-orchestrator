import React, { useState } from 'react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', secret: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login failed');

      // SUCCESS: Save merchant details to LocalStorage
      localStorage.setItem('merchant', JSON.stringify(data));
      
      // Redirect to Dashboard
      window.location.href = '/dashboard';

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Merchant Login</h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded focus:outline-none focus:border-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm mb-1">API Secret (Password)</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded focus:outline-none focus:border-blue-500"
              value={formData.secret}
              onChange={(e) => setFormData({...formData, secret: e.target.value})}
              placeholder="secret_test_..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-xs text-slate-500">
          For testing use:<br/>
          Email: test@example.com <br/>
          Secret: secret_test_xyz789
        </div>
      </div>
    </div>
  );
};

export default Login;