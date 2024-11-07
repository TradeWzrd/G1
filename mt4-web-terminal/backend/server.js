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

// Store trade commands
const tradeCommands = new Map();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// MT4 update endpoint
app.post('/api/mt4/update', express.text({ type: 'application/json' }), (req, res) => {
    try {
        // Log raw data
        console.log('Raw data received:', req.body);
        
        // Parse and validate JSON
        const data = JSON.parse(req.body);
        console.log('Parsed data:', data);

        if (!data || !data.source || data.source !== 'EA') {
            throw new Error('Invalid data format');
        }

        // Update state
        lastEAUpdate = data;
        eaConnected = true;

        // Get pending commands
        const pendingCommands = Array.from(tradeCommands.values())
            .filter(cmd => cmd.status === 'pending');

        // Broadcast to WebSocket clients
        broadcast({
            type: 'update',
            connected: true,
            data: lastEAUpdate
        });

        // Send response
        res.json({ 
            success: true,
            commands: pendingCommands
        });
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        console.log('Data that caused error:', req.body);
        res.status(200).json({ 
            success: false,
            error: error.message,
            commands: []
        });
    }
});

// Trade endpoints
app.post('/api/trade', (req, res) => {
    try {
        const command = {
            id: Date.now().toString(),
            status: 'pending',
            timestamp: new Date(),
            ...req.body
        };

        console.log('Received trade command:', command);
        tradeCommands.set(command.id, command);

        // Clean up old commands
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (const [id, cmd] of tradeCommands) {
            if (cmd.timestamp < fiveMinutesAgo) {
                tradeCommands.delete(id);
            }
        }

        res.json({
            success: true,
            message: 'Trade command queued',
            commandId: command.id
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get pending trade commands
app.get('/api/trade/pending', (req, res) => {
    const pendingCommands = Array.from(tradeCommands.values())
        .filter(cmd => cmd.status === 'pending');
    res.json({ commands: pendingCommands });
});

// Update trade command status
app.post('/api/trade/status', (req, res) => {
    try {
        const { commandId, status, result } = req.body;
        
        if (tradeCommands.has(commandId)) {
            const command = tradeCommands.get(commandId);
            command.status = status;
            command.result = result;
            tradeCommands.set(commandId, command);
            
            console.log('Updated command status:', command);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send initial state
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
