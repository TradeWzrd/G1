const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const webClients = new Set();

// Store latest account data and pending commands
let latestAccountData = null;
let eaConnected = false;
let lastEAUpdate = Date.now();
let pendingCommands = [];

// Middleware
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Parse MT4 update data
function parseData(dataString) {
    try {
        if (typeof dataString !== 'string') {
            console.error('Invalid data type:', typeof dataString);
            return null;
        }

        const parts = dataString.split('|');
        if (parts.length < 2) return null;

        const data = {
            account: {},
            positions: []
        };

        // Parse account data
        if (parts[0] === 'ACCOUNT' && parts[1]) {
            const [balance, equity, margin, freeMargin] = parts[1].split(';');
            data.account = {
                balance: parseFloat(balance),
                equity: parseFloat(equity),
                margin: parseFloat(margin),
                freeMargin: parseFloat(freeMargin)
            };
        }

        // Parse positions
        if (parts[2] === 'POSITIONS' && parts[3]) {
            const positions = parts[3].split(';').filter(p => p);
            data.positions = positions.map(pos => {
                const [ticket, symbol, type, lots, openPrice, sl, tp, commission, profit, comment] = pos.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type,
                    lots: parseFloat(lots),
                    openPrice: parseFloat(openPrice),
                    sl: parseFloat(sl),
                    tp: parseFloat(tp),
                    commission: parseFloat(commission),
                    profit: parseFloat(profit),
                    comment
                };
            });
        }

        return data;
    } catch (error) {
        console.error('Error parsing data:', error);
        return null;
    }
}

// Broadcast to web clients
function broadcastToWeb(data) {
    webClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// MT4 EA update endpoint
app.post('/api/mt4/update', (req, res) => {
    const rawData = req.body;
    console.log('Received MT4 update:', rawData);

    const data = parseData(rawData);
    if (!data) {
        return res.status(400).send('Invalid data format');
    }

    latestAccountData = data;
    lastEAUpdate = Date.now();
    eaConnected = true;

    // Broadcast update to web clients
    broadcastToWeb({
        type: 'update',
        data,
        connected: true,
        eaConnected: true,
        timestamp: Date.now()
    });

    res.send('OK');
});

// EA command polling endpoint
app.get('/api/mt4/commands', (req, res) => {
    if (pendingCommands.length > 0) {
        const command = pendingCommands.shift(); // Get and remove first command
        res.json(command);
    } else {
        res.json(''); // No commands pending
    }
});

// Trade command endpoint
app.post('/api/trade', (req, res) => {
    if (!eaConnected) {
        return res.status(503).json({ error: 'EA is not connected' });
    }

    const { action, symbol, params } = req.body;
    console.log('Trade command received:', req.body);

    if (!action || !symbol) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Format command
    let command = `${action},${symbol}`;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            command += `,${key}=${value}`;
        });
    }

    // Add command to pending queue
    pendingCommands.push(command);
    res.json({ status: 'command_queued', command });
});

// WebSocket connection handler for web clients
wss.on('connection', (ws) => {
    console.log('New web client connected');
    webClients.add(ws);

    // Send initial data if available
    if (latestAccountData) {
        ws.send(JSON.stringify({
            type: 'update',
            data: latestAccountData,
            connected: true,
            eaConnected,
            timestamp: lastEAUpdate
        }));
    }

    // Send current status
    ws.send(JSON.stringify({
        type: 'status',
        connected: true,
        eaConnected,
        timestamp: Date.now()
    }));

    ws.on('close', () => {
        webClients.delete(ws);
        console.log('Web client disconnected');
    });
});

// Check EA connection status
setInterval(() => {
    const now = Date.now();
    const wasConnected = eaConnected;
    
    if (now - lastEAUpdate > 10000) {
        eaConnected = false;
        
        if (wasConnected) {
            broadcastToWeb({
                type: 'status',
                connected: true,
                eaConnected: false,
                timestamp: now
            });
        }
    }
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
