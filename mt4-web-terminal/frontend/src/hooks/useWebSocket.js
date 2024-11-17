import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = 'wss://g1-back.onrender.com';
const RECONNECT_DELAY = 1000;
const RECONNECT_BACKOFF = 1.5;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocket = () => {
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const queryClient = useQueryClient();

    const connect = useCallback(() => {
        try {
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                queryClient.setQueryData('connectionStatus', true);
                reconnectAttempts.current = 0;
            };

            ws.current.onclose = () => {
                queryClient.setQueryData('connectionStatus', false);
                
                if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = RECONNECT_DELAY * Math.pow(RECONNECT_BACKOFF, reconnectAttempts.current);
                    console.log(`Reconnecting in ${delay}ms...`);
                    setTimeout(connect, delay);
                    reconnectAttempts.current++;
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                queryClient.setQueryData('connectionStatus', false);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'connection_status') {
                        queryClient.setQueryData('eaStatus', !!data.connected);
                        return;
                    }

                    if (data.type === 'update') {
                        if (data.data.account) {
                            queryClient.setQueryData('accountData', (old) => ({
                                balance: parseFloat(data.data.account.balance) || old?.balance || 0,
                                equity: parseFloat(data.data.account.equity) || old?.equity || 0,
                                margin: parseFloat(data.data.account.margin) || old?.margin || 0,
                                freeMargin: parseFloat(data.data.account.freeMargin) || old?.freeMargin || 0
                            }));
                        }

                        if (Array.isArray(data.data.positions)) {
                            queryClient.setQueryData('positions', data.data.positions);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            queryClient.setQueryData('connectionStatus', false);
        }
    }, [queryClient]);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    return { sendMessage };
};
