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

// Format trade command
function formatTradeCommand(data) {
    const { action, symbol, type, lots, stopLoss, takeProfit, ticket } = data;
    console.log('Formatting trade command:', data);

    switch(action) {
        case 'open':
            return `${type === 0 ? 'BUY' : 'SELL'},${symbol},${lots},${stopLoss || 0},${takeProfit || 0}`;
        case 'close':
            return `CLOSE,${ticket}`;
        case 'modify':
            return `MODIFY,${ticket},${stopLoss || 0},${takeProfit || 0}`;
        case 'closeAll':
            return `CLOSEALL${type !== undefined ? ',' + type : ''}`;
        default:
            throw new Error('Invalid action');
    }
}

// MT4 update endpoint
app.post('/api/mt4/update', express.text(), (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);
        
        // Process any pending commands
        const commands = pendingCommands.splice(0, pendingCommands.length);
        console.log('Sending commands to EA:', commands);
        
        res.json({ 
            success: true,
            commands: commands 
        });
        
        // Parse and broadcast update
        const parts = req.body.split('|');
        if (parts[0] === 'ACCOUNT') {
            // Broadcast update to all clients
            broadcast({
                type: 'update',
                connected: true,
                data: parseData(req.body)
            });
        }
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        res.json({ success: false, error: error.message });
    }
});

// Trade endpoint
app.post('/api/trade', (req, res) => {
    try {
        console.log('Received trade request:', req.body);
        
        const command = formatTradeCommand(req.body);
        console.log('Formatted command:', command);
        
        // Store command for next EA update
        pendingCommands.push(command);
        
        console.log('Current pending commands:', pendingCommands);
        
        res.json({ 
            success: true,
            message: 'Trade command queued',
            command: command
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Parse MT4 data
function parseData(data) {
    const parts = data.split('|');
    if (parts.length < 4 || parts[0] !== 'ACCOUNT') return null;

    const accountData = parts[1].split(';');
    const positions = parts[3] ? parts[3].split(';').filter(p => p) : [];

    return {
        account: {
            balance: parseFloat(accountData[0]),
            equity: parseFloat(accountData[1]),
            margin: parseFloat(accountData[2]),
            freeMargin: parseFloat(accountData[3])
        },
        positions: positions.map(pos => {
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
        })
    };
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);
    
    if (lastUpdate) {
        ws.send(JSON.stringify({
            type: 'update',
            connected: eaConnected,
            data: lastUpdate
        }));
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});