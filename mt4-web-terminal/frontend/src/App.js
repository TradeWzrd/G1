import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WebTerminal from './components/WebTerminal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [equityHistory, setEquityHistory] = useState([]);
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectTimeout = useRef(null);

    useEffect(() => {
        const connectWebSocket = () => {
            // Clear any existing timeout
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }

            // Don't try to reconnect if we're already connected
            if (ws.current?.readyState === WebSocket.OPEN) {
                console.log('WebSocket already connected');
                return;
            }

            // Don't try to reconnect if we're in the process of connecting
            if (ws.current?.readyState === WebSocket.CONNECTING) {
                console.log('WebSocket is already connecting');
                return;
            }

            try {
                // Clean up existing connection if any
                if (ws.current) {
                    ws.current.close();
                    ws.current = null;
                }

                reconnectAttempts.current++;
                const wsUrl = 'wss://g1-back.onrender.com';
                console.log(`Connecting to WebSocket (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}):`, wsUrl);
                
                ws.current = new WebSocket(wsUrl);

                ws.current.onopen = () => {
                    console.log('WebSocket connected successfully');
                    setConnected(true);
                    reconnectAttempts.current = 0;
                    // toast.success('Connected to server');
                };

                ws.current.onclose = (event) => {
                    console.log('WebSocket disconnected', event.code, event.reason);
                    setConnected(false);
                    setEAConnected(false);
                    
                    // Only attempt to reconnect if we haven't reached the maximum attempts
                    if (reconnectAttempts.current < maxReconnectAttempts) {
                        console.log(`Scheduling reconnect attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts}`);
                        reconnectTimeout.current = setTimeout(connectWebSocket, 5000);
                    } else {
                        console.log('Max reconnection attempts reached');
                        // toast.error('Connection lost. Please refresh the page.');
                    }
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };

                ws.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('Received message:', message);
                        
                        switch (message.type) {
                            case 'update':
                                if (message.data) {
                                    if (message.data.account) {
                                        const account = message.data.account;
                                        setAccountData(prevData => ({
                                            ...prevData,
                                            balance: parseFloat(account.balance) || 0,
                                            equity: parseFloat(account.equity) || 0,
                                            margin: parseFloat(account.margin) || 0,
                                            freeMargin: parseFloat(account.freeMargin) || 0,
                                            number: account.number || 'N/A',
                                            currency: account.currency || 'USD',
                                            leverage: account.leverage || '1:100',
                                            server: account.server || 'Unknown'
                                        }));

                                        // Update equity history
                                        setEquityHistory(prev => [
                                            ...prev,
                                            {
                                                timestamp: Date.now(),
                                                equity: parseFloat(account.equity) || 0
                                            }
                                        ].slice(-100)); // Keep last 100 points
                                    }

                                    if (message.data.positions) {
                                        setPositions(message.data.positions.map(pos => ({
                                            ...pos,
                                            lots: parseFloat(pos.lots) || 0,
                                            openPrice: parseFloat(pos.openPrice) || 0,
                                            sl: parseFloat(pos.sl) || 0,
                                            tp: parseFloat(pos.tp) || 0,
                                            commission: parseFloat(pos.commission) || 0,
                                            profit: parseFloat(pos.profit) || 0
                                        })));
                                    }
                                }
                                // Update EA connection status from update message
                                if (message.eaConnected !== undefined) {
                                    setEAConnected(message.eaConnected);
                                }
                                break;

                            case 'status':
                                // Update EA connection status from status message
                                if (message.eaConnected !== undefined) {
                                    setEAConnected(message.eaConnected);
                                }
                                break;

                            default:
                                console.log('Unknown message type:', message.type);
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                if (reconnectAttempts.current >= maxReconnectAttempts) {
                    // toast.error('Failed to establish connection. Please refresh the page.');
                }
            }
        };

        connectWebSocket();

        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, []); // Remove connected from dependencies

    return (
        <BrowserRouter>
            <div className="bg-[#0a0f1a] min-h-screen">
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={
                            <Dashboard 
                                accountData={accountData}
                                equityHistory={equityHistory}
                                connected={connected}
                                eaConnected={eaConnected}
                            />
                        } />
                        <Route path="terminal" element={
                            <WebTerminal 
                                accountData={accountData}
                                positions={positions}
                                connected={connected}
                                eaConnected={eaConnected}
                            />
                        } />
                    </Route>
                </Routes>
                <ToastContainer
                    position="bottom-right"
                    autoClose={2000}
                    hideProgressBar
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss={false}
                    draggable={false}
                    pauseOnHover={false}
                    theme="dark"
                />
            </div>
        </BrowserRouter>
    );
};

export default App;