const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Custom JSON parsing middleware
app.use(express.text({ type: 'application/json' }));
app.use(cors());
app.use(morgan('dev'));

// Store connected clients and EA status
const clients = new Set();
let eaConnected = false;
let lastEAData = null;

// Clean JSON string
function cleanJSONString(str) {
    // Remove any BOM and non-printable characters
    return str.replace(/^\uFEFF/, '')
              .replace(/[^\x20-\x7E]/g, '')
              .trim();
}

// Handle MT4 updates
app.post('/api/mt4/update', (req, res) => {
    try {
        // Clean and parse the JSON
        const cleanData = cleanJSONString(req.body);
        console.log('Received data length:', cleanData.length);
        console.log('Cleaned data:', cleanData);
        
        const data = JSON.parse(cleanData);
        console.log('Parsed data:', data);

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
        console.error('Raw data:', req.body);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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

// Debug endpoint
app.get('/debug/last-ea-data', (req, res) => {
    res.json({
        eaConnected,
        lastUpdate: lastEAData,
        connectedClients: clients.size,
        timestamp: new Date().toISOString()
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