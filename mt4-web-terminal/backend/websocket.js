// backend/websocket.js
const WebSocket = require('ws');
const clients = new Set();
let metatraderClient = null;

module.exports = (wss) => {
    wss.on('connection', (ws, req) => {
        // Check if connection is from MetaTrader
        const isMetaTrader = req.headers['user-agent']?.includes('MetaTrader');
        
        if (isMetaTrader) {
            console.log('MetaTrader client connected');
            metatraderClient = ws;
        } else {
            console.log('Web client connected');
            clients.add(ws);
        }
        
        ws.on('message', (message) => {
            try {
                // Handle string messages (from MT4)
                if (typeof message === 'string' || message instanceof Buffer) {
                    const messageStr = message.toString();
                    
                    // If message starts with HISTORY, broadcast to web clients
                    if (messageStr.startsWith('HISTORY')) {
                        clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(messageStr);
                            }
                        });
                        return;
                    }
                }

                // Handle JSON messages (from web clients)
                const data = JSON.parse(message);
                
                // If message is HISTORY command, forward to MT4
                if (data === 'HISTORY' && metatraderClient?.readyState === WebSocket.OPEN) {
                    metatraderClient.send(data);
                    return;
                }
                
                // Handle other message types...
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });
        
        ws.on('close', () => {
            if (ws === metatraderClient) {
                console.log('MetaTrader client disconnected');
                metatraderClient = null;
            } else {
                console.log('Web client disconnected');
                clients.delete(ws);
            }
        });
    });
};

module.exports.broadcastUpdate = (data) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};