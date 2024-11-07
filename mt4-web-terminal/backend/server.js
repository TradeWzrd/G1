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

// Custom JSON parsing middleware
app.use(express.text({ type: 'application/json' }), (req, res, next) => {
    try {
        if (req.body) {
            req.body = JSON.parse(req.body);
        }
        next();
    } catch (error) {
        console.error('JSON Parse Error:', error);
        console.log('Raw Body:', req.body);
        res.status(400).json({ error: 'Invalid JSON' });
    }
});

app.use(cors());
app.use(morgan('dev'));

// Store connected clients and EA data
const clients = new Set();
let lastEAUpdate = null;
let eaConnected = false;

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);
        lastEAUpdate = req.body;
        eaConnected = true;

        // Broadcast to WebSocket clients
        broadcast({
            type: 'update',
            connected: true,
            data: lastEAUpdate
        });

        res.json({ success: true });
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
});

// Broadcast to all clients
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Trade routes
app.get('/api/trade/pending', (req, res) => {
    res.json({ commands: [] });
});

app.post('/api/trade', (req, res) => {
    try {
        const command = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            timestamp: new Date()
        };
        console.log('New trade command:', command);
        res.json({ success: true, commandId: command.id });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/trade/status', (req, res) => {
    console.log('Trade status update:', req.body);
    res.json({ success: true });
});

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        eaConnected,
        clientsCount: clients.size
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});