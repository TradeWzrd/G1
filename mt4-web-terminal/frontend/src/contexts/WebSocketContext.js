import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Create WebSocket connection
        const ws = new WebSocket('wss://g1-back.onrender.com');

        ws.onopen = () => {
            console.log('Connected to WebSocket');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            // For history data, pass through as is
            if (event.data.startsWith('HISTORY|')) {
                setLastMessage({ data: event.data });
                return;
            }

            // For other messages, try to parse as before
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
            } catch {
                // If not JSON, pass through as is
                setLastMessage({ data: event.data });
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        };

        setSocket(ws);

        // Cleanup on unmount
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    const sendMessage = (message) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        } else {
            console.error('WebSocket is not connected');
        }
    };

    return (
        <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};

export default WebSocketContext;
