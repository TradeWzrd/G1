const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Store connected clients and EA status
const clients = new Set();
let eaConnected = false;
let lastEAData = null;

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send current EA status
    ws.send(JSON.stringify({
        type: 'status',
        connected: eaConnected,
        data: lastEAData
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.source === 'EA') {
                eaConnected = true;
                lastEAData = data;
                // Broadcast to all clients
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'update',
                            connected: true,
                            data: data
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Test HTTP endpoint
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