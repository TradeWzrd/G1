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
let lastEAUpdate = null;

// Store pending commands
let pendingCommands = [];

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
app.post('/api/mt4/update', express.text(), (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);
        const data = parseData(req.body);
        
        if (data) {
            lastUpdate = data;
            eaConnected = true;

            // Get any pending commands and send them to EA
            const commands = pendingCommands;
            pendingCommands = []; // Clear the queue

            // Broadcast update to clients
            broadcast({
                type: 'update',
                connected: true,
                data: data
            });

            // Send response with pending commands
            res.json({ 
                success: true,
                commands: commands 
            });
        } else {
            res.json({ 
                success: false, 
                error: 'Invalid data format',
                commands: []
            });
        }
    } catch (error) {
        console.error('Error processing update:', error);
        res.json({ 
            success: false, 
            error: error.message,
            commands: []
        });
    }
});

// Process EA data
app.post('/api/ea-data', (req, res) => {
    const data = req.body.data;
    if (!data) {
        return res.status(400).json({ error: 'No data provided' });
    }

    try {
        // Split data into sections
        const [accountSection, positionsSection, historySection] = data.split('|POSITIONS|');
        const [_, accountData] = accountSection.split('|');
        const [balance, equity, margin, freeMargin] = accountData.split(';');

        // Process account data
        const account = {
            balance: parseFloat(balance),
            equity: parseFloat(equity),
            margin: parseFloat(margin),
            freeMargin: parseFloat(freeMargin)
        };

        // Process positions
        const positions = [];
        if (positionsSection) {
            const [posData, histData] = positionsSection.split('|HISTORY|');
            if (posData) {
                const positionStrings = posData.split(';');
                positionStrings.forEach(pos => {
                    if (pos) {
                        const [ticket, symbol, type, lots, openPrice, sl, tp, profit] = pos.split(',');
                        positions.push({
                            ticket: parseInt(ticket),
                            symbol,
                            type: parseInt(type),
                            lots: parseFloat(lots),
                            openPrice: parseFloat(openPrice),
                            sl: parseFloat(sl),
                            tp: parseFloat(tp),
                            profit: parseFloat(profit)
                        });
                    }
                });
            }
        }

        // Process history
        const history = [];
        if (historySection) {
            const historyStrings = historySection.split(';');
            historyStrings.forEach(hist => {
                if (hist) {
                    const [ticket, symbol, type, lots, openPrice, closePrice, openTime, closeTime, profit, commission, swap] = hist.split(',');
                    history.push({
                        ticket: parseInt(ticket),
                        symbol,
                        type: parseInt(type),
                        lots: parseFloat(lots),
                        openPrice: parseFloat(openPrice),
                        closePrice: parseFloat(closePrice),
                        openTime,
                        closeTime,
                        profit: parseFloat(profit),
                        commission: parseFloat(commission),
                        swap: parseFloat(swap),
                        total: parseFloat(profit) + parseFloat(commission) + parseFloat(swap)
                    });
                }
            });
        }

        // Update last update and broadcast to clients
        lastUpdate = { account, positions, history };
        eaConnected = true;
        lastEAUpdate = Date.now();

        // Broadcast update to all connected clients
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'update',
                    connected: true,
                    data: lastUpdate
                }));
            }
        });

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error processing EA data:', error);
        res.status(500).json({ error: 'Error processing data' });
    }
});

// Trade command handler
app.post('/api/trade', (req, res) => {
    try {
        const command = req.body;
        console.log('Received trade command:', command);

        // Different validation for different actions
        if (command.action === 'closeAll') {
            const formattedCommand = 'CLOSEALL';
            console.log('Formatted close all command:', formattedCommand);
            pendingCommands.push(formattedCommand);
            
            return res.json({
                success: true,
                message: 'Close all command queued'
            });
        } 
        else if (command.action === 'open') {
            // Validate open trade parameters
            if (!command.symbol || command.type === undefined || !command.lots) {
                return res.json({
                    success: false,
                    error: 'Missing required trade parameters'
                });
            }

            const formattedCommand = `${command.type === 0 ? 'BUY' : 'SELL'},${command.symbol},${command.lots},${command.stopLoss || 0},${command.takeProfit || 0}`;
            console.log('Formatted open command:', formattedCommand);
            pendingCommands.push(formattedCommand);

            return res.json({
                success: true,
                message: 'Trade command queued'
            });
        }
        else if (command.action === 'close') {
            if (!command.ticket) {
                return res.json({
                    success: false,
                    error: 'Missing ticket number'
                });
            }

            const formattedCommand = `CLOSE,${command.ticket}`;
            console.log('Formatted close command:', formattedCommand);
            pendingCommands.push(formattedCommand);

            return res.json({
                success: true,
                message: 'Close command queued'
            });
        }
        else {
            return res.json({
                success: false,
                error: 'Invalid action'
            });
        }
    } catch (error) {
        console.error('Trade error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

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

    // Handle incoming messages from clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);

            if (data.type === 'command') {
                // Add command to pending queue
                pendingCommands.push(data.data);
                console.log('Added command to queue:', data.data);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
