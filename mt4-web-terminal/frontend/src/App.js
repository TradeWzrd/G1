import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WebTerminal from './components/WebTerminal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    const [accountData, setAccountData] = useState(null);
    const [equityHistory, setEquityHistory] = useState([]);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);

    // WebSocket reference and reconnection settings
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;
    const reconnectBackoff = 1.5;

    // Connect WebSocket function
    const connectWebSocket = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            ws.current = new WebSocket('wss://g1-back.onrender.com');

            ws.current.onopen = () => {
                console.log('WebSocket Connected');
                setConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket Disconnected', event.code, event.reason);
                setConnected(false);
                setEAConnected(false);

                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = reconnectDelay * Math.pow(reconnectBackoff, reconnectAttempts.current);
                    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
                    
                    setTimeout(() => {
                        reconnectAttempts.current++;
                        connectWebSocket();
                    }, delay);
                } else {
                    setError('Unable to establish connection. Please refresh the page.');
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setError('Connection error occurred');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received data:', data);
                    
                    if (data.type === 'update' || data.type === 'status') {
                        setEAConnected(data.connected);
                        if (data.data) {
                            // Update account data
                            if (data.data.account) {
                                setAccountData({
                                    balance: parseFloat(data.data.account.balance || 0),
                                    equity: parseFloat(data.data.account.equity || 0),
                                    margin: parseFloat(data.data.account.margin || 0),
                                    freeMargin: parseFloat(data.data.account.freeMargin || 0),
                                    number: data.data.account.number || 'N/A',
                                    currency: data.data.account.currency || 'USD',
                                    leverage: data.data.account.leverage || '1:100',
                                    server: data.data.account.server || 'Unknown'
                                });

                                // Update equity history
                                if (data.data.account.equity) {
                                    setEquityHistory(prev => [
                                        ...prev,
                                        {
                                            time: new Date().toLocaleTimeString(),
                                            value: parseFloat(data.data.account.equity)
                                        }
                                    ].slice(-20)); // Keep last 20 points
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            setError('Failed to create WebSocket connection');
        }
    }, []);

    // Initialize WebSocket connection
    useEffect(() => {
        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [connectWebSocket]);

    return (
        <BrowserRouter>
            <div className="bg-gray-900 min-h-screen">
                <Layout>
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                <Dashboard 
                                    accountData={accountData} 
                                    equityHistory={equityHistory}
                                    connected={connected}
                                    eaConnected={eaConnected}
                                />
                            } 
                        />
                        <Route 
                            path="/trading" 
                            element={
                                <WebTerminal 
                                    accountData={accountData}
                                    connected={connected}
                                    eaConnected={eaConnected}
                                />
                            } 
                        />
                    </Routes>
                </Layout>
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