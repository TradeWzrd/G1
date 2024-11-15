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

// Store latest account data
let latestAccountData = null;
let eaConnected = false;
let lastEAUpdate = Date.now();

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

// Broadcast to all web clients
function broadcast(data) {
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

    // Broadcast update to all web clients
    broadcast({
        type: 'update',
        data,
        connected: true,
        timestamp: Date.now()
    });

    res.send('OK');
});

// Trade command endpoint
app.post('/api/trade', (req, res) => {
    const { action, symbol, risk, sl, tp, comment } = req.body;
    console.log('Trade command received:', req.body);

    // Format command in PineConnector style
    let command = `${action},${symbol}`;
    if (risk) command += `,risk=${risk}`;
    if (sl) command += `,sl=${sl}`;
    if (tp) command += `,tp=${tp}`;
    if (comment) command += `,comment=${comment}`;

    // Send response immediately
    res.json({ status: 'command_sent', command });

    // Broadcast command to EA
    broadcast({
        type: 'command',
        data: command
    });
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    // Add to web clients
    webClients.add(ws);

    // Send initial data if available
    if (latestAccountData) {
        ws.send(JSON.stringify({
            type: 'update',
            data: latestAccountData,
            connected: eaConnected,
            timestamp: lastEAUpdate
        }));
    }

    ws.on('close', () => {
        webClients.delete(ws);
        console.log('Client disconnected');
    });
});

// Check EA connection status
setInterval(() => {
    if (Date.now() - lastEAUpdate > 10000) {
        eaConnected = false;
        broadcast({
            type: 'status',
            connected: false,
            timestamp: Date.now()
        });
    }
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
