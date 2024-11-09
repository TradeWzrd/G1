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
let pendingCommands = [];

// Middleware
app.use(express.text());
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// WebSocket connection handler
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');

    if (lastUpdate) {
        ws.send(JSON.stringify({
            type: 'status',
            connected: true,
            data: lastUpdate
        }));
    }

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// MT4 update endpoint
app.post('/api/mt4/update', (req, res) => {
    try {
        console.log('Received MT4 update:', req.body);
        const data = req.body;
        
        if (data && data.startsWith('ACCOUNT|')) {
            lastUpdate = data;
            eaConnected = true;

            // Get pending commands
            const commands = pendingCommands;
            pendingCommands = []; // Clear the queue

            // Broadcast to all connected clients
            const wsMessage = JSON.stringify({
                type: 'update',
                data: data
            });

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(wsMessage);
                }
            });

            // Send text response with commands
            const commandString = commands.join(';');
            res.send(commandString || '');
            
            console.log('Sending commands to EA:', commandString);
        } else {
            console.log('Invalid data format received');
            res.send('');
        }
    } catch (error) {
        console.error('Error processing update:', error);
        res.send('');
    }
});

// Trade endpoint
app.post('/api/trade', (req, res) => {
    try {
        const command = req.body;
        console.log('Received trade command:', command);

        let formattedCommand = '';

        switch (command.action) {
            case 'open':
                formattedCommand = `${command.type === 0 ? 'buy' : 'sell'},${command.symbol},risk=${command.lots}`;
                if (command.stopLoss) formattedCommand += `,sl=${command.stopLoss}`;
                if (command.takeProfit) formattedCommand += `,tp=${command.takeProfit}`;
                break;

            case 'close':
                formattedCommand = `close,${command.ticket}`;
                break;

            case 'closeAll':
                formattedCommand = `closeall,${command.symbol || 'ALL'}`;
                break;
        }

        if (formattedCommand) {
            pendingCommands.push(formattedCommand);
            console.log('Added command to queue:', formattedCommand);
        }

        res.json({
            success: true,
            message: 'Command queued successfully'
        });
    } catch (error) {
        console.error('Trade error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        wsClients: clients.size,
        eaConnected
    });
});

// For the frontend SPA
app.get('*', (req, res) => {
    // Instead of serving a file, send a minimal HTML that loads your React app
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MT4 Web Terminal</title>
            <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
            <script src="https://unpkg.com/react-router-dom@6/umd/react-router-dom.production.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-[#0a0f1a] text-white">
            <div id="root"></div>
            <script type="module">
                // Your bundled React app will be loaded here
                import { App } from '/static/js/main.js';
                ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
