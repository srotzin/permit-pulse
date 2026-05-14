const express = require('express');
const path = require('path');
const app = express();

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve static files
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Permit Pulse on port ${PORT}`));
