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

    useEffect(() => {
        const connectWebSocket = () => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                console.log('WebSocket already connected');
                return;
            }

            try {
                reconnectAttempts.current++;
                const wsUrl = 'wss://g1-back.onrender.com';
                console.log('Connecting to WebSocket:', wsUrl);
                
                ws.current = new WebSocket(wsUrl);

                ws.current.onopen = () => {
                    console.log('WebSocket connected successfully');
                    setConnected(true);
                    reconnectAttempts.current = 0;
                    if (reconnectAttempts.current === 1) {
                        // toast.success('Connected to server');
                    }
                };

                ws.current.onclose = () => {
                    console.log('WebSocket disconnected');
                    setConnected(false);
                    setEAConnected(false);
                    
                    if (connected && reconnectAttempts.current < maxReconnectAttempts) {
                        console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
                        setTimeout(connectWebSocket, 5000);
                    } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                        // toast.error('Failed to connect after multiple attempts. Please refresh the page.');
                    }
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    if (reconnectAttempts.current >= maxReconnectAttempts) {
                        // toast.error('Connection error. Please check your internet connection.');
                    }
                };

                ws.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('Received message:', message);
                        
                        switch (message.type) {
                            case 'update':
                                if (message.data) {
                                    if (message.data.account) {
                                        setAccountData(prevData => ({
                                            ...prevData,
                                            balance: parseFloat(message.data.account.balance || 0),
                                            equity: parseFloat(message.data.account.equity || 0),
                                            margin: parseFloat(message.data.account.margin || 0),
                                            freeMargin: parseFloat(message.data.account.freeMargin || 0),
                                            number: message.data.account.number || 'N/A',
                                            currency: message.data.account.currency || 'USD',
                                            leverage: message.data.account.leverage || '1:100',
                                            server: message.data.account.server || 'Unknown'
                                        }));

                                        // Update equity history
                                        setEquityHistory(prev => [
                                            ...prev,
                                            {
                                                time: new Date().toLocaleTimeString(),
                                                value: parseFloat(message.data.account.equity || 0)
                                            }
                                        ].slice(-20)); // Keep last 20 points
                                    }
                                    if (message.data.positions) {
                                        setPositions(message.data.positions);
                                    }
                                    if (message.data.equityHistory) {
                                        setEquityHistory(message.data.equityHistory);
                                    }
                                }
                                break;
                            case 'status':
                                if (message.eaConnected !== undefined) {
                                    setEAConnected(message.eaConnected);
                                }
                                break;
                            default:
                                console.log('Unknown message type:', message.type);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
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
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connected]);

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