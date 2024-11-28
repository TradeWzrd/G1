// backend/websocket.js
const clients = new Set();

module.exports = (wss) => {
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
};

module.exports.broadcastUpdate = (data) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};