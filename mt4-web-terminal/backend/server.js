const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients and pending commands
const clients = new Set();
let lastUpdate = null;
let eaConnected = false;
const pendingCommands = [];

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Function to parse incoming data
function parseData(dataString) {
    try {
        const parts = dataString.split('|');
        if (parts.length < 4) return null;

        // Parse account data
        const accountData = parts[1].split(';');
        const accountInfo = {
            balance: parseFloat(accountData[0] || 0),
            equity: parseFloat(accountData[1] || 0),
            margin: parseFloat(accountData[2] || 0),
            freeMargin: parseFloat(accountData[3] || 0),
            number: accountData[4] || 'N/A',
            currency: accountData[5] || 'USD',
            leverage: accountData[6] || '1:100',
            server: accountData[7] || 'Unknown'
        };

        // Parse positions
        const positions = parts[3] ? parts[3].split(';').map(pos => {
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
        const data = parseData(req.body);
        if (data) {
            // Broadcast to WebSocket clients
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

// WebSocket connection handling
wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // Handle incoming WebSocket messages
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
