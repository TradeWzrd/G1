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

// Store connected clients
const clients = new Set();

// Import routes
const tradeRoutes = require('./routes/tradeRoutes');

// Use routes
app.use('/api', tradeRoutes);

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Broadcast function
function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        const data = req.body;
        console.log('Received MT4 update:', data);
        
        // Broadcast update to all connected clients
        broadcast({
            type: 'update',
            data: data
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({ 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        clientsCount: clients.size
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});