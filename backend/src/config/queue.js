const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

// Log the URL we are trying to use (masking password if any)
console.log(`Attempting Redis Connection to: ${process.env.REDIS_URL || 'localhost'}`);

const connection = new IORedis(process.env.REDIS_URL, { 
    maxRetriesPerRequest: null,
    retryStrategy: function(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

connection.on('connect', () => console.log('✅ Redis Connection Established'));
connection.on('ready', () => console.log('✅ Redis Client Ready'));
connection.on('error', (err) => console.error('❌ Redis Connection Error:', err.message));

const paymentQueue = new Queue('payment-queue', { connection });
const webhookQueue = new Queue('webhook-queue', { connection });
const refundQueue = new Queue('refund-queue', { connection });

module.exports = { paymentQueue, webhookQueue, refundQueue, connection };