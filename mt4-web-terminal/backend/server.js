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

// License ID for PineConnector format
const LICENSE_ID = "60123456789";  // Replace with actual license

// Middleware
app.use(express.text({ type: '*/*' }));  // Handle all content types as text
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

        // Remove any quotes and trim whitespace
        dataString = dataString.trim();
        if (dataString.startsWith('"') && dataString.endsWith('"')) {
            dataString = dataString.slice(1, -1);
        }

        console.log('Parsing data string:', dataString);

        const parts = dataString.split('|');
        if (parts.length < 2) {
            console.error('Invalid data format: not enough parts');
            console.error('Parts:', parts);
            return null;
        }

        const data = {
            account: {},
            positions: []
        };

        // Parse account data
        if (parts[0] === 'ACCOUNT' && parts[1]) {
            const [balance, equity, margin, freeMargin] = parts[1].split(';').map(Number);
            data.account = {
                balance,
                equity,
                margin,
                freeMargin
            };
        } else {
            console.error('Invalid account data format');
            console.error('First parts:', parts[0], parts[1]);
            return null;
        }

        // Parse positions
        if (parts[2] === 'POSITIONS' && parts[3]) {
            const positions = parts[3].split(';').filter(p => p);
            data.positions = positions.map(pos => {
                const [ticket, symbol, type, lots, openPrice, sl, tp, commission, profit, comment] = pos.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type: parseInt(type),
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

        console.log('Parsed data:', data);
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
    console.log('Received raw MT4 update:', rawData);
    
    const data = parseData(rawData);
    if (!data) {
        console.error('Failed to parse data');
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
        console.log('Sending command to EA:', command);
        res.send(command); // Send as plain text, not JSON
    } else {
        res.send(''); // No commands pending
    }
});

// Trade command endpoint
app.post('/api/trade', (req, res) => {
    if (!eaConnected) {
        return res.status(503).json({ error: 'EA is not connected' });
    }

    const { action, symbol, params } = req.body;
    console.log('Trade command received:', req.body);

    // Validate required parameters
    if (!action || !symbol) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate action
    const validActions = ['buy', 'sell', 'close'];
    if (!validActions.includes(action.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Validate symbol - allow letters, numbers, and common symbol suffixes
    const baseSymbol = symbol.split('-')[0];
    if (!/^[A-Za-z0-9.#]+$/i.test(baseSymbol)) {
        return res.status(400).json({ error: 'Invalid symbol format' });
    }

    // Format command string in PineConnector format
    let command = LICENSE_ID + ',';
    
    try {
        if (action === 'buy') {
            command += 'buy,' + symbol;
            if (params) {
                // Validate and normalize lots
                const lots = parseFloat(params.lots) || 0.01;
                if (lots < 0.01) {
                    return res.status(400).json({ error: 'Invalid lots value' });
                }
                command += ',lots=' + lots.toFixed(2);

                // Add optional parameters
                if (params.sl && !isNaN(params.sl)) command += ',sl=' + parseFloat(params.sl);
                if (params.tp && !isNaN(params.tp)) command += ',tp=' + parseFloat(params.tp);
            } else {
                command += ',lots=0.01'; // Default lots
            }
        }
        else if (action === 'sell') {
            command += 'sell,' + symbol;
            if (params) {
                // Validate and normalize lots
                const lots = parseFloat(params.lots) || 0.01;
                if (lots < 0.01) {
                    return res.status(400).json({ error: 'Invalid lots value' });
                }
                command += ',lots=' + lots.toFixed(2);

                // Add optional parameters
                if (params.sl && !isNaN(params.sl)) command += ',sl=' + parseFloat(params.sl);
                if (params.tp && !isNaN(params.tp)) command += ',tp=' + parseFloat(params.tp);
            } else {
                command += ',lots=0.01'; // Default lots
            }
        }
        else if (action === 'close') {
            const symbolParts = symbol.split('-');
            if (symbolParts.length > 1) {
                // Close specific position type
                const posType = symbolParts[0].toLowerCase();
                const actualSymbol = symbolParts[1];
                if (posType === 'buy') {
                    command += 'closelong,' + actualSymbol;
                } else if (posType === 'sell') {
                    command += 'closeshort,' + actualSymbol;
                } else {
                    return res.status(400).json({ error: 'Invalid position type' });
                }
            } else {
                // Close all positions for symbol
                command += 'closeall,' + symbol;
            }
        }

        console.log('Formatted command:', command);
        
        // Add command to pending queue
        pendingCommands.push(command);
        res.json({ status: 'command_queued', command });
    } catch (error) {
        console.error('Error formatting command:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
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
