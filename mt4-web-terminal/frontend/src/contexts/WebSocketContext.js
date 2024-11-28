import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const WebSocketContext = createContext();
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

export const WebSocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const connectWebSocket = useCallback(() => {
        try {
            const ws = new WebSocket('wss://g1-back.onrender.com');

            ws.onopen = () => {
                console.log('Connected to WebSocket');
                setIsConnected(true);
                setRetryCount(0); // Reset retry count on successful connection
            };

            ws.onmessage = (event) => {
                console.log('Received message:', event.data);
                // For history data, pass through as is
                if (typeof event.data === 'string' && event.data.startsWith('HISTORY|')) {
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

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('Disconnected from WebSocket');
                setIsConnected(false);
                
                // Attempt to reconnect if we haven't exceeded max retries
                if (retryCount < MAX_RETRIES) {
                    console.log(`Attempting to reconnect... (${retryCount + 1}/${MAX_RETRIES})`);
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        connectWebSocket();
                    }, RETRY_DELAY);
                }
            };

            setSocket(ws);

            return ws;
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            return null;
        }
    }, [retryCount]);

    useEffect(() => {
        const ws = connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [connectWebSocket]);

    const sendMessage = (message) => {
        if (socket?.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            socket.send(message);
        } else {
            console.error('WebSocket is not connected. State:', socket?.readyState);
            // Attempt to reconnect if disconnected
            if (!isConnected && retryCount < MAX_RETRIES) {
                connectWebSocket();
            }
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
