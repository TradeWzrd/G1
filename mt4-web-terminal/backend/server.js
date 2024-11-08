const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Use text parser instead of JSON parser for MT4 updates
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Store connected clients and pending commands
const clients = new Set();
let lastUpdate = null;
let eaConnected = false;
const pendingCommands = [];

// Function to parse incoming data
function parseData(dataString) {
    try {
        if (typeof dataString !== 'string') {
            console.error('Invalid data type:', typeof dataString);
            return null;
        }

        const parts = dataString.split('|');
        if (parts.length < 4) {
            console.error('Invalid data format, insufficient parts:', parts.length);
            return null;
        }

        // Parse account data
        const [balance, equity, margin, freeMargin, accountNumber, currency, leverage, server] = parts[1].split(';');
        const accountInfo = {
            balance: parseFloat(balance || 0),
            equity: parseFloat(equity || 0),
            margin: parseFloat(margin || 0),
            freeMargin: parseFloat(freeMargin || 0),
            number: accountNumber || 'N/A',
            currency: currency || 'USD',
            leverage: leverage || '1:100',
            server: server || 'Unknown'
        };

        // Parse positions
        const positions = parts[3] ? parts[3].split(';').filter(p => p).map(pos => {
            const [ticket, symbol, type, lots, openPrice, sl, tp, profit] = pos.split(',');
            return {
                ticket: parseInt(ticket),
                symbol,
                type: parseInt(type),
                lots: parseFloat(lots),
                openPrice: parseFloat(openPrice),
                stopLoss: parseFloat(sl),
                takeProfit: parseFloat(tp),
                profit: parseFloat(profit)
            };
        }) : [];

        return {
            account: accountInfo,
            positions
        };
    } catch (error) {
        console.error('Error parsing data:', error);
        return null;
    }
}

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received raw data:', req.body);
        const data = parseData(req.body);
        
        if (data) {
            lastUpdate = data;
            eaConnected = true;

            // Broadcast to clients
            broadcast({
                type: 'update',
                connected: true,
                data: data
            });

            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Invalid data format' });
        }
    } catch (error) {
        console.error('Error processing update:', error);
        res.json({ success: false, error: error.message });
    }
});

// Trade command handler
app.post('/api/trade', (req, res) => {
    try {
        const command = req.body;
        console.log('Received trade command:', command);

        // Validate required trade parameters
        if (!command.action || !command.symbol || command.type === undefined || !command.lots) {
            return res.json({
                success: false,
                error: 'Missing required trade parameters'
            });
        }

        // Format command for EA
        const formattedCommand = formatTradeCommand(command);
        pendingCommands.push(formattedCommand);

        console.log('Formatted command:', formattedCommand);
        res.json({
            success: true,
            message: 'Trade command queued'
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Function to format trade commands
function formatTradeCommand(command) {
    switch(command.action) {
        case 'open':
            return `${command.type === 0 ? 'BUY' : 'SELL'},${command.symbol},${command.lots},${command.stopLoss || 0},${command.takeProfit || 0}`;
        case 'close':
            return `CLOSE,${command.ticket}`;
        case 'modify':
            return `MODIFY,${command.ticket},${command.stopLoss || 0},${command.takeProfit || 0}`;
        default:
            throw new Error('Invalid action');
    }
}

// Get pending commands
app.get('/api/trade/pending', (req, res) => {
    res.json({ commands: pendingCommands });
});

// Broadcast function
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    if (lastUpdate) {
        ws.send(JSON.stringify({
            type: 'status',
            connected: eaConnected,
            data: lastUpdate
        }));
    }

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
