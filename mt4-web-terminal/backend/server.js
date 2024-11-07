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

// Clean and validate JSON
function cleanAndParseJSON(data) {
    try {
        // Remove any BOM and non-printable characters
        let cleaned = data.toString()
            .replace(/^\uFEFF/, '')
            .replace(/[\u0000-\u001F]/g, '')
            .replace(/[\u007F-\u009F]/g, '')
            .replace(/\\/g, '\\\\')
            .trim();

        // Log the cleaned data
        console.log('Cleaned data:', cleaned);

        // Parse the JSON
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('JSON cleaning/parsing error:', error);
        throw error;
    }
}

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Custom middleware for MT4 updates
app.post('/api/mt4/update', (req, res) => {
    let data = '';
    
    req.on('data', chunk => {
        data += chunk;
    });
    
    req.on('end', () => {
        try {
            console.log('Received raw data:', data);
            
            // Clean and parse the data
            const parsedData = cleanAndParseJSON(data);
            console.log('Parsed data:', parsedData);
            
            // Update state
            lastEAUpdate = parsedData;
            eaConnected = true;
            
            // Broadcast to WebSocket clients
            broadcast({
                type: 'update',
                connected: true,
                data: lastEAUpdate
            });
            
            // Send success response
            res.json({
                success: true,
                commands: []
            });
        } catch (error) {
            console.error('Error processing data:', error);
            console.log('Data that caused error:', data);
            res.status(200).json({ 
                success: false,
                error: error.message,
                commands: []
            });
        }
    });
});

// Regular JSON parser for other routes
app.use(express.json());

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send current state
    try {
        ws.send(JSON.stringify({
            type: 'status',
            connected: eaConnected,
            data: lastEAUpdate
        }));
    } catch (error) {
        console.error('Error sending initial state:', error);
    }

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
app.post('/api/trade', (req, res) => {
    try {
        console.log('Received trade command:', req.body);
        res.json({
            success: true,
            message: 'Trade command received'
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/trade/pending', (req, res) => {
    res.json({ commands: [] });
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