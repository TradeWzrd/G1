const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Global variables
const clients = new Set();
let pendingCommands = []; 
const historyRequests = new Map();

// Store trade history
let tradeHistory = [];
let lastUpdate = null;
let eaConnected = false;
let lastEAUpdate = null;

// Use text parser instead of JSON parser for MT4 updates
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Function to parse incoming data
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
            positions: [],
            history: []
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
            const positions = parts[3].split(';');
            data.positions = positions.filter(p => p).map(pos => {
                const [ticket, symbol, type, lots, openPrice, sl, tp, profit] = pos.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type: parseInt(type),
                    lots: parseFloat(lots),
                    openPrice: parseFloat(openPrice),
                    sl: parseFloat(sl),
                    tp: parseFloat(tp),
                    profit: parseFloat(profit)
                };
            });
        }

        return data;
    } catch (error) {
        console.error('Error parsing data:', error);
        return null;
    }
}

// MT4 update endpoint
app.post('/api/mt4/update', express.text(), (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);

        // Check if this is a history update
        if (req.body.startsWith('HISTORY|')) {
            const historyData = req.body.substring(8); // Remove 'HISTORY|'
            console.log('Processing history data:', historyData);

            // Parse history data
            const trades = historyData.split(';').filter(Boolean).map(trade => {
                const [
                    ticket, symbol, type, lots, openPrice, closePrice, 
                    openTime, closeTime, profit, commission, swap
                ] = trade.split(',');
                return {
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
                };
            });

            // Store the history
            tradeHistory = trades;

            // Find the latest history request
            const requestId = [...historyRequests.keys()].find(key => {
                const request = historyRequests.get(key);
                return Date.now() - request.timestamp < 30000; // Within 30 seconds
            });

            if (requestId) {
                console.log('Found matching request:', requestId);
                historyRequests.delete(requestId);

                // Broadcast history data to clients
                broadcast({
                    type: 'tradeHistory',
                    data: trades
                });
            } else {
                console.log('No matching history request found');
            }

            return res.json({ success: true });
        }

        // Regular account update
        const data = parseData(req.body);
        
        if (data) {
            lastUpdate = data;
            eaConnected = true;
            lastEAUpdate = Date.now();

            // Get any pending commands and send them to EA
            const commands = [...pendingCommands];
            pendingCommands.length = 0; // Clear the array without reassignment
            console.log('Sending pending commands to EA:', commands);

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
            console.log('Invalid data format received from MT4');
            res.json({ 
                success: false,
                error: 'Invalid data format'
            });
        }
    } catch (error) {
        console.error('Error processing update:', error);
        res.json({ 
            success: false,
            error: error.message
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
        if (historySection) {
            const historyStrings = historySection.split(';');
            historyStrings.forEach(hist => {
                if (hist) {
                    const [ticket, symbol, type, lots, openPrice, closePrice, openTime, closeTime, profit, commission, swap] = hist.split(',');
                    const trade = {
                        ticket: parseInt(ticket),
                        symbol,
                        type: parseInt(type),
                        lots: parseFloat(lots),
                        openPrice: parseFloat(openPrice),
                        closePrice: parseFloat(closePrice),
                        openTime: new Date(openTime),
                        closeTime: new Date(closeTime),
                        profit: parseFloat(profit),
                        commission: parseFloat(commission),
                        swap: parseFloat(swap),
                        total: parseFloat(profit) + parseFloat(commission) + parseFloat(swap)
                    };
                    
                    // Only add if not already in history
                    if (!tradeHistory.find(t => t.ticket === trade.ticket)) {
                        tradeHistory.push(trade);
                    }
                }
            });
        }

        // Update last update
        lastUpdate = { account, positions };
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

// Get trade history with filters
app.get('/api/trade-history', (req, res) => {
    try {
        const { period } = req.query;
        let filteredHistory = [...tradeHistory];
        
        const now = new Date();
        switch (period) {
            case 'today':
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime.toDateString() === now.toDateString()
                );
                break;
            case 'last3days':
                const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime >= threeDaysAgo
                );
                break;
            case 'lastWeek':
                const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime >= weekAgo
                );
                break;
            case 'lastMonth':
                const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime >= monthAgo
                );
                break;
            case 'last3Months':
                const threeMonthsAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime >= threeMonthsAgo
                );
                break;
            case 'last6Months':
                const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
                filteredHistory = tradeHistory.filter(trade => 
                    trade.closeTime >= sixMonthsAgo
                );
                break;
            case 'custom':
                const { startDate, endDate } = req.query;
                if (startDate && endDate) {
                    filteredHistory = tradeHistory.filter(trade => 
                        trade.closeTime >= new Date(startDate) && 
                        trade.closeTime <= new Date(endDate)
                    );
                }
                break;
        }
        
        res.json(filteredHistory.sort((a, b) => b.closeTime - a.closeTime));
    } catch (error) {
        console.error('Error fetching trade history:', error);
        res.status(500).json({ error: 'Error fetching trade history' });
    }
});

// Get trade history with filters and send request to EA
app.get('/api/trade-history/ea', (req, res) => {
    const { period, startDate, endDate } = req.query;
    const requestId = Date.now().toString();
    
    // Store the response object to resolve later
    historyRequests.set(requestId, res);
    
    // Send command to EA
    let command = `GET_HISTORY|${period}`;
    if (period === 'custom') {
        command += `|${startDate}|${endDate}`;
    }
    
    // Send the command to all connected clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(`COMMAND|${command}`);
        }
    });
    
    // Set timeout to clean up if no response
    setTimeout(() => {
        if (historyRequests.has(requestId)) {
            historyRequests.delete(requestId);
            res.status(408).json({ error: 'Request timeout' });
        }
    }, 30000); // 30 second timeout
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

    // Send initial state
    if (lastUpdate) {
        ws.send(JSON.stringify({
            type: 'update',
            connected: eaConnected,
            data: lastUpdate
        }));
    }

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const rawMessage = message.toString();
            console.log('Raw WebSocket message received:', rawMessage);
            
            const data = JSON.parse(rawMessage);
            console.log('Parsed WebSocket message:', data);

            if (data.type === 'command' && data.command) {
                const [cmd, ...params] = data.command.split('|');
                console.log('Processing command:', cmd, 'with params:', params);
                
                if (cmd === 'GET_HISTORY') {
                    console.log('Processing history request with params:', params);
                    
                    // Add command to pending queue for EA to process
                    pendingCommands.push(data.command);
                    console.log('Current pending commands:', pendingCommands);
                    
                    // Create a request tracker
                    const requestId = Date.now().toString();
                    historyRequests.set(requestId, ws);
                    console.log('Created history request tracker:', requestId);
                    
                    // Set timeout for request
                    setTimeout(() => {
                        if (historyRequests.has(requestId)) {
                            console.log('History request timed out:', requestId);
                            historyRequests.delete(requestId);
                            try {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    error: 'History request timed out'
                                }));
                            } catch (error) {
                                console.error('Error sending timeout message:', error);
                            }
                        }
                    }, 30000);
                }
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            try {
                ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Failed to process command: ' + error.message
                }));
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Trade history endpoint for EA
app.post('/api/trade-history/ea', express.text(), (req, res) => {
    try {
        console.log('Received trade history from EA:', req.body);
        const historyData = req.body;

        // Process history data
        if (historyData) {
            const trades = historyData.split(';').filter(Boolean).map(trade => {
                const [
                    ticket, symbol, type, lots, openPrice, closePrice, 
                    openTime, closeTime, profit, commission, swap
                ] = trade.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type: parseInt(type),
                    lots: parseFloat(lots),
                    openPrice: parseFloat(openPrice),
                    closePrice: parseFloat(closePrice),
                    openTime: new Date(openTime),
                    closeTime: new Date(closeTime),
                    profit: parseFloat(profit),
                    commission: parseFloat(commission),
                    swap: parseFloat(swap),
                    total: parseFloat(profit) + parseFloat(commission) + parseFloat(swap)
                };
            });

            // Find the history request tracker
            const requestId = [...historyRequests.keys()].find(key => {
                const request = historyRequests.get(key);
                return Date.now() - request.timestamp < 30000; // Within 30 seconds
            });

            if (requestId) {
                const request = historyRequests.get(requestId);
                historyRequests.delete(requestId);

                // Broadcast the history to the requesting client
                broadcast({
                    type: 'tradeHistory',
                    data: historyData,
                    requestId: requestId
                });
            }

            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'No history data received' });
        }
    } catch (error) {
        console.error('Error processing trade history:', error);
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
