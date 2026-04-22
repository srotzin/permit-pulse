const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname)));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'permit-pulse' }));
app.listen(5000, () => console.log('Permit Pulse running on port 5000'));
