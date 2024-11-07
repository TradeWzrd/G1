const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            console.error('Invalid JSON:', buf.toString());
            res.status(400).json({ error: 'Invalid JSON format' });
            throw new Error('Invalid JSON');
        }
    }
}));
app.use(morgan('dev'));

// Store connected clients and EA status
const clients = new Set();
let eaConnected = false;
let lastEAData = null;

// Handle MT4 updates
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received MT4 update:', JSON.stringify(req.body, null, 2));
        
        const data = req.body;
        if (data.source === 'EA') {
            eaConnected = true;
            lastEAData = data;
            
            // Broadcast to all WebSocket clients
            const message = JSON.stringify({
                type: 'update',
                connected: true,
                data: data.account
            });
            
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
            
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid data format' });
        }
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);
    
    // Send current EA status
    ws.send(JSON.stringify({
        type: 'status',
        connected: eaConnected,
        data: lastEAData ? lastEAData.account : null
    }));
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        clientsCount: clients.size,
        eaConnected
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});