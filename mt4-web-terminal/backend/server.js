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

// Clean JSON string
function cleanJsonString(str) {
    // Remove BOM and non-printable characters
    let cleaned = str.replace(/^\uFEFF/, '');
    cleaned = cleaned.replace(/[\u0000-\u001F]/g, '');
    cleaned = cleaned.replace(/[\u007F-\u009F]/g, '');
    cleaned = cleaned.replace(/\\/g, '\\\\');
    cleaned = cleaned.trim();
    return cleaned;
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
            // Log raw data for debugging
            console.log('Raw data received:', data);
            
            // Clean and parse the data
            const cleanData = cleanJsonString(data);
            console.log('Cleaned data:', cleanData);
            
            // Parse the JSON
            const parsedData = JSON.parse(cleanData);
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
    
    req.on('error', (error) => {
        console.error('Request error:', error);
        res.status(200).json({ 
            success: false,
            error: error.message,
            commands: []
        });
    });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);
    
    // Send initial state
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
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        eaConnected,
        clientsCount: clients.size
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(200).json({ 
        success: false,
        error: err.message,
        commands: []
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});