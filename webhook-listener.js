const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    console.log('✅ Webhook Received:', req.body);
    res.status(200).send('OK'); // Sending 200 OK tells the worker "Success"
});

app.listen(4000, () => console.log('🎧 Webhook Receiver running on port 4000...'));