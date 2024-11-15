const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

// Global variables
const pendingCommands = []; 
const historyRequests = new Map();
const HISTORY_REQUEST_TIMEOUT = 30000; // 30 seconds

// Clear timed out history requests
setInterval(() => {
    const now = Date.now();
    for (const [requestId, request] of historyRequests.entries()) {
        if (now - request.timestamp > HISTORY_REQUEST_TIMEOUT) {
            console.log(`History request ${requestId} timed out`);
            if (request.ws && request.ws.readyState === WebSocket.OPEN) {
                request.ws.send(JSON.stringify({
                    type: 'history_response',
                    status: 'error',
                    error: 'Request timed out',
                    requestId
                }));
            }
            historyRequests.delete(requestId);
        }
    }
}, 10000);

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

            // Extract request ID if present
            let requestId = null;
            let historyContent = historyData;
            if (historyData.includes('REQUEST_ID|')) {
                const parts = historyData.split('REQUEST_ID|');
                requestId = parts[1].split('|')[0];
                historyContent = parts[1].split('|')[1];
            }

            // Parse history data
            const trades = historyContent.split(';').filter(Boolean).map(trade => {
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
                    openTime: parseInt(openTime),
                    closeTime: parseInt(closeTime),
                    profit: parseFloat(profit),
                    commission: parseFloat(commission),
                    swap: parseFloat(swap)
                };
            });

            // Update trade history
            tradeHistory = trades;
            lastUpdate = new Date().toISOString();

            // Find the client who requested this history
            const request = requestId ? historyRequests.get(requestId) : null;
            if (request && request.ws && request.ws.readyState === WebSocket.OPEN) {
                // Send response directly to requesting client
                request.ws.send(JSON.stringify({
                    type: 'history_response',
                    status: 'success',
                    requestId,
                    data: trades
                }));
                historyRequests.delete(requestId);
            } else {
                // Broadcast to all clients if no specific requester
                broadcast(JSON.stringify({
                    type: 'history_data',
                    data: trades
                }));
            }

            res.status(200).send('History processed');
            return;
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

// Handle trade commands
app.post('/api/trade', (req, res) => {
    console.log('Received trade command:', req.body);
    const { action, symbol, params } = req.body;
    
    if (!action || !symbol) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Build command in PineConnector format
    let command = [action, symbol];
    
    // Add additional parameters if present
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            command.push(`${key}=${value}`);
        });
    }

    // Join with commas to create final command
    const finalCommand = command.join(',');
    console.log('Sending command to MT4:', finalCommand);
    
    // Send command to all MT4 clients
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            const message = JSON.stringify({
                type: 'command',
                data: finalCommand
            });
            console.log('Sending WebSocket message:', message);
            client.send(message);
        }
    });

    res.json({ success: true, command: finalCommand });
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
        console.log('Received WebSocket message:', message.toString());
        try {
            const data = JSON.parse(message);
            
            // Handle MT4 updates
            if (message.toString().startsWith('ACCOUNT|')) {
                console.log('Received MT4 update:', message.toString());
                // Broadcast to all clients except the sender
                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message.toString());
                    }
                });
            }
            
            // Handle history data
            if (data.type === 'history_data') {
                console.log('Received history data:', data);
                // Broadcast history data to all clients
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'history_response',
                            data: data.data
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
        
        // Clean up any pending requests from this client
        for (const [requestId, request] of historyRequests.entries()) {
            if (request.ws === ws) {
                historyRequests.delete(requestId);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
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
