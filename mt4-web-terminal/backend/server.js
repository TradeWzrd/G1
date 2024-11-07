const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Raw body parser for MT4 requests
app.use('/api/mt4/update', express.text({ type: 'application/json' }), (req, res, next) => {
    try {
        if (req.body) {
            req.body = JSON.parse(req.body);
        }
        next();
    } catch (error) {
        console.error('JSON Parse Error:', error);
        console.log('Raw Body:', req.body);
        res.status(400).json({ error: 'Invalid JSON', details: error.message });
    }
});

// Regular JSON parser for other routes
app.use(express.json());

// Store connected clients and EA data
const clients = new Set();
let lastEAUpdate = null;
let eaConnected = false;

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received MT4 update:', typeof req.body, req.body);
        
        if (!req.body || typeof req.body !== 'object') {
            throw new Error('Invalid data format');
        }

        lastEAUpdate = req.body;
        eaConnected = true;

        // Broadcast to WebSocket clients
        broadcast({
            type: 'update',
            connected: true,
            data: lastEAUpdate
        });

        res.json({ 
            success: true,
            commands: [] // Empty array of pending commands
        });
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        res.status(500).json({ error: error.message });
    }
});

// WebSocket handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send current state
    ws.send(JSON.stringify({
        type: 'status',
        connected: eaConnected,
        data: lastEAUpdate
    }));

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast to all clients
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                console.error('Broadcast error:', error);
            }
        }
    });
}

// Trade routes
app.get('/api/trade/pending', (req, res) => {
    res.json({ commands: [] });
});

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        eaConnected,
        clientsCount: clients.size,
        lastUpdate: lastEAUpdate ? new Date(lastEAUpdate.timestamp).toISOString() : null
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});