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
const HISTORY_REQUEST_TIMEOUT = 30000; // 30 seconds

// Store last known state
let lastKnownState = {
    account: {
        balance: null,
        equity: null,
        margin: null,
        freeMargin: null
    },
    positions: [],
    connected: false,
    lastUpdateTime: null
};

// Store trade history
let tradeHistory = [];
let lastUpdate = null;
let eaConnected = false;
let lastEAUpdate = null;

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

// Use text parser instead of JSON parser for MT4 updates
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Function to validate and merge account data
function validateAndMergeAccountData(newData) {
    if (!newData || typeof newData !== 'object') return lastKnownState.account;

    return {
        balance: parseFloat(newData.balance) || lastKnownState.account.balance || 0,
        equity: parseFloat(newData.equity) || lastKnownState.account.equity || 0,
        margin: parseFloat(newData.margin) || lastKnownState.account.margin || 0,
        freeMargin: parseFloat(newData.freeMargin) || lastKnownState.account.freeMargin || 0
    };
}

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
            account: { ...lastKnownState.account },
            positions: [...lastKnownState.positions],
            connected: true,
            lastUpdateTime: Date.now()
        };

        // Parse account data
        if (parts[0] === 'ACCOUNT' && parts[1]) {
            const [balance, equity, margin, freeMargin] = parts[1].split(';');
            const newAccountData = {
                balance: parseFloat(balance),
                equity: parseFloat(equity),
                margin: parseFloat(margin),
                freeMargin: parseFloat(freeMargin)
            };
            
            // Only update if we have valid non-zero values
            data.account = validateAndMergeAccountData(newAccountData);
        }

        // Parse positions
        if (parts[2] === 'POSITIONS' && parts[3]) {
            const positionsData = parts[3];
            data.positions = positionsData.split(';').map(position => {
                const [ticket, symbol, type, lots, openPrice, sl, tp, profit, openTime] = position.split(',');
                return {
                    ticket: parseInt(ticket),
                    symbol,
                    type: parseInt(type),
                    lots: parseFloat(lots),
                    openPrice: parseFloat(openPrice),
                    stopLoss: parseFloat(sl),
                    takeProfit: parseFloat(tp),
                    profit: parseFloat(profit),
                    openTime: parseInt(openTime)
                };
            });
        }

        // Update last known state
        lastKnownState = { ...data };
        return data;
    } catch (error) {
        console.error('Error parsing data:', error);
        return lastKnownState; // Return last known state on error
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
            lastKnownState = { ...data };
            eaConnected = true;
            lastEAUpdate = Date.now();

            // Get any pending commands and send them to EA
            const commands = [...pendingCommands];
            pendingCommands.length = 0; // Clear the array without reassignment
            console.log('Sending pending commands to EA:', commands);

            // Broadcast update to clients with validated data
            broadcast({
                type: 'update',
                connected: true,
                data: lastKnownState
            });

            // Send response with pending commands
            res.json({ 
                status: 'success',
                commands: commands 
            });
        } else {
            // If parsing fails, send last known state
            broadcast({
                type: 'update',
                connected: true,
                data: lastKnownState
            });
            res.json({ 
                status: 'error',
                message: 'Failed to parse data',
                commands: []
            });
        }
    } catch (error) {
        console.error('Error processing MT4 update:', error);
        // On error, still broadcast last known state
        broadcast({
            type: 'update',
            connected: true,
            data: lastKnownState
        });
        res.status(500).json({ error: error.message });
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
            balance: parseFloat(balance) || lastKnownState.account.balance,
            equity: parseFloat(equity) || lastKnownState.account.equity,
            margin: parseFloat(margin) || lastKnownState.account.margin,
            freeMargin: parseFloat(freeMargin) || lastKnownState.account.freeMargin
        };

        // Process positions
        const positions = [];
        if (positionsSection) {
            const [posData, histData] = positionsSection.split('|HISTORY|');
            if (posData) {
                const positionStrings = posData.split(';');
                positionStrings.forEach(pos => {
                    if (pos) {
                        const [ticket, symbol, type, lots, openPrice, sl, tp, profit, openTime] = pos.split(',');
                        positions.push({
                            ticket: parseInt(ticket),
                            symbol,
                            type: parseInt(type),
                            lots: parseFloat(lots),
                            openPrice: parseFloat(openPrice),
                            stopLoss: parseFloat(sl),
                            takeProfit: parseFloat(tp),
                            profit: parseFloat(profit),
                            openTime: parseInt(openTime)
                        });
                    }
                });
            }
        }

        // Update last known state
        lastKnownState = { 
            account: { ...account }, 
            positions: [...positions] 
        };

        // Update last update with new state
        lastUpdate = lastKnownState;
        eaConnected = true;
        lastEAUpdate = Date.now();

        // Broadcast update to all connected clients
        broadcast({
            type: 'update',
            connected: true,
            data: lastUpdate
        });

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error processing EA data:', error);
        
        // On error, broadcast last known state
        broadcast({
            type: 'update',
            connected: true,
            data: lastKnownState
        });
        
        res.status(500).json({ error: error.message });
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

// Function to process and forward commands to EA
function processCommand(command) {
    console.log('Processing command:', command);
    if (typeof command.data === 'string') {
        if (command.data.startsWith('GET_HISTORY')) {
            const requestId = command.id || Date.now().toString();
            console.log(`Processing history request ${requestId}:`, command.data);

            // Store request details
            historyRequests.set(requestId, {
                timestamp: Date.now(),
                command: command.data
            });

            // Forward command to EA
            pendingCommands.push(command.data);
            
            // Broadcast command to EA
            broadcast(JSON.stringify({
                type: 'command',
                command: command.data,
                requestId
            }));
        } else if (command.command === 'TRADE') {
            // Handle trade commands
            console.log('Processing trade command:', command.data);
            pendingCommands.push(command.data);
            
            // Broadcast command to EA
            broadcast(JSON.stringify({
                type: 'command',
                command: command.data
            }));
        } else {
            // Handle other commands
            console.log('Processing other command:', command.data);
            pendingCommands.push(command.data);
            
            // Broadcast command to EA
            broadcast(JSON.stringify({
                type: 'command',
                command: command.data
            }));
        }
    }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send initial state
    if (lastKnownState) {
        // Send status
        ws.send(JSON.stringify({
            type: 'status',
            data: {
                connected: eaConnected
            }
        }));

        // Send account data
        ws.send(JSON.stringify({
            type: 'account',
            data: lastKnownState.account
        }));

        // Send positions
        ws.send(JSON.stringify({
            type: 'positions',
            data: lastKnownState.positions
        }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);

            if (data.data) {
                // Process command and add to pending commands
                console.log('Processing command:', data);
                pendingCommands.push(data.data);
                
                // Broadcast command to EA
                broadcast(JSON.stringify({
                    type: 'command',
                    commands: pendingCommands
                }));
            }
            else if (data.command === 'GET_STATUS') {
                // Send current state
                ws.send(JSON.stringify({
                    type: 'status',
                    data: {
                        connected: eaConnected
                    }
                }));
            }
            else if (data.command === 'GET_POSITIONS') {
                // Send current positions
                ws.send(JSON.stringify({
                    type: 'positions',
                    data: lastKnownState.positions
                }));
            }
            else if (data.command === 'GET_ACCOUNT') {
                // Send current account data
                ws.send(JSON.stringify({
                    type: 'account',
                    data: lastKnownState.account
                }));
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
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
