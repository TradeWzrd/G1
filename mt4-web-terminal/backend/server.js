const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const WebSocket = require('ws');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();
let lastUpdate = null;
let eaConnected = false;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.text());

// Parse MT4 data
function parseData(data) {
    try {
        const parts = data.split('|');
        if (parts.length < 4) return null;

        const accountData = parts[1].split(';');
        const positions = parts[3] ? parts[3].split(';') : [];

        const result = {
            account: {
                balance: parseFloat(accountData[0]),
                equity: parseFloat(accountData[1]),
                margin: parseFloat(accountData[2]),
                freeMargin: parseFloat(accountData[3])
            },
            positions: positions.map(pos => {
                const p = pos.split(',');
                return {
                    ticket: parseInt(p[0]),
                    symbol: p[1],
                    type: parseInt(p[2]),
                    lots: parseFloat(p[3]),
                    openPrice: parseFloat(p[4]),
                    stopLoss: parseFloat(p[5]),
                    takeProfit: parseFloat(p[6]),
                    profit: parseFloat(p[7])
                };
            })
        };

        return result;
    } catch (error) {
        console.error('Error parsing data:', error);
        return null;
    }
}

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received data:', req.body);
        
        const parsedData = parseData(req.body);
        if (parsedData) {
            lastUpdate = parsedData;
            eaConnected = true;
            
            // Broadcast to clients
            broadcast({
                type: 'update',
                connected: true,
                data: parsedData
            });
            
            res.send('OK');
        } else {
            res.send('ERROR:Invalid data format');
        }
    } catch (error) {
        console.error('Error:', error);
        res.send('ERROR:' + error.message);
    }
});

// Trade endpoint
app.post('/api/trade', (req, res) => {
    try {
        const { action, symbol, lots, stopLoss, takeProfit, ticket, type } = req.body;
        let command = '';

        switch(action) {
            case 'open':
                command = `${type === 0 ? 'BUY' : 'SELL'},${symbol},${lots},${stopLoss || 0},${takeProfit || 0}`;
                break;
            case 'close':
                command = `CLOSE,${ticket}`;
                break;
            case 'modify':
                command = `MODIFY,${ticket},${stopLoss || 0},${takeProfit || 0}`;
                break;
            case 'closeAll':
                command = `CLOSEALL${type !== undefined ? ',' + type : ''}`;
                break;
        }

        console.log('Generated command:', command);
        
        // Send JSON response
        res.json({ 
            success: true,
            message: 'Command sent successfully',
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

// WebSocket handling
wss.on('connection', (ws) => {
    clients.add(ws);
    
    if (lastUpdate) {
        ws.send(JSON.stringify({
            type: 'update',
            connected: eaConnected,
            data: lastUpdate
        }));
    }
    
    ws.on('close', () => {
        clients.delete(ws);
    });
});

function broadcast(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});