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

// Store connected clients and EA data
const clients = new Set();
let lastEAUpdate = null;
let eaConnected = false;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Use raw body parser for MT4 endpoint
app.post('/api/mt4/update', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const jsonString = req.body.toString('utf8');
        console.log('Received raw data:', jsonString);
        
        const data = JSON.parse(jsonString);
        console.log('Parsed data:', data);

        lastEAUpdate = data;
        eaConnected = true;

        // Broadcast to WebSocket clients
        broadcast({
            type: 'update',
            connected: true,
            data: lastEAUpdate
        });

        // Send response to EA
        res.json({ 
            success: true,
            commands: [] 
        });
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});

// Use regular JSON parser for other routes
app.use(express.json());

// WebSocket connection handler
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

// Broadcast function
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

// Trade endpoints
app.get('/api/trade/pending', (req, res) => {
    res.json({ commands: [] });
});

app.post('/api/trade', (req, res) => {
    try {
        const command = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending'
        };
        console.log('New trade command:', command);
        res.json({ success: true, commandId: command.id });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(500).json({ error: error.message });
    }
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