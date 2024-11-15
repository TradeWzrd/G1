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

    useEffect(() => {
        const connectWebSocket = () => {
            reconnectAttempts.current++;
            const wsUrl = process.env.REACT_APP_WS_URL || 'wss://g1-back.onrender.com';
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setConnected(true);
                if (reconnectAttempts.current === 1) {
                    // toast.success('Connected to server');
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setConnected(false);
                setEAConnected(false);
                if (connected) {
                    // toast.error('Disconnected from server');
                }
                setTimeout(connectWebSocket, 5000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    switch (message.type) {
                        case 'update':
                            if (message.data) {
                                if (message.data.account) {
                                    setAccountData({
                                        balance: parseFloat(message.data.account.balance || 0),
                                        equity: parseFloat(message.data.account.equity || 0),
                                        margin: parseFloat(message.data.account.margin || 0),
                                        freeMargin: parseFloat(message.data.account.freeMargin || 0),
                                        number: message.data.account.number || 'N/A',
                                        currency: message.data.account.currency || 'USD',
                                        leverage: message.data.account.leverage || '1:100',
                                        server: message.data.account.server || 'Unknown'
                                    });
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