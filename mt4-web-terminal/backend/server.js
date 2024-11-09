const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const path = require('path');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.post('/api/mt4/update', (req, res) => {
    // Existing MT4 update code...
});

app.post('/api/trade', (req, res) => {
    // Existing trade code...
});

// Important: Place this after all API routes
// This will handle all other routes and send the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
