import React from 'react';
import Layout from '../components/Layout';

const CodeBlock = ({ children }) => (
  <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto border border-slate-800 text-sm font-mono text-slate-300 my-4">
    {children}
  </pre>
);

const DocsContent = () => {
  const storedMerchant = localStorage.getItem('merchant');
  const merchant = storedMerchant ? JSON.parse(storedMerchant) : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-2">Developer Documentation</h1>
      <p className="text-slate-400 mb-8">Integrate Gateway payments into your application.</p>

      {merchant && (
        <div className="bg-blue-900/20 border border-blue-800 p-6 rounded-xl mb-10">
          <h3 className="text-blue-400 font-bold uppercase text-sm tracking-wider mb-4">Your API Credentials</h3>
          <div className="grid gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase block mb-1">Public Key</label>
              <code className="bg-slate-900 text-white px-3 py-2 rounded block border border-slate-700 font-mono select-all">
                {merchant.api_key}
              </code>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase block mb-1">Secret Key</label>
              <code className="bg-slate-900 text-white px-3 py-2 rounded block border border-slate-700 font-mono select-all">
                {merchant.api_secret}
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-12 text-slate-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">1. Create an Order</h2>
          <p>Create an order on your backend to initialize a payment intent.</p>
          <CodeBlock>
{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_KEY" \\
  -H "X-Api-Secret: YOUR_SECRET" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt#1"
  }'`}
          </CodeBlock>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">2. Integration Code</h2>
          <p>Add this script to your checkout page to launch the payment modal.</p>
          <CodeBlock>
{`<script src="http://localhost:3001/checkout.js"></script>
<script>
  const gateway = new PaymentGateway({
    key: '${merchant?.api_key || 'YOUR_KEY'}',
    orderId: 'ORDER_ID_FROM_BACKEND',
    
    onSuccess: (data) => {
       console.log("Payment Success:", data);
    },
    onFailure: (error) => {
       console.error("Payment Failed:", error);
    }
  });

  document.getElementById('pay-btn').onclick = () => {
    gateway.open();
  };
</script>`}
          </CodeBlock>
        </section>
      </div>
    </div>
  );
};

const Docs = () => (
    <Layout>
        <DocsContent />
    </Layout>
);

export default Docs;