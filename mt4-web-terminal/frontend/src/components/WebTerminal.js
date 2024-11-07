import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line } from 'recharts';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);
    const [equityHistory, setEquityHistory] = useState([]);
    const [serverStatus, setServerStatus] = useState(null);

    useEffect(() => {
        let ws;
        
        const connectWebSocket = () => {
            console.log('Attempting WebSocket connection...');
            ws = new WebSocket('wss://g1-back.onrender.com');
            
            ws.onopen = () => {
                console.log('WebSocket Connected');
                setConnected(true);
                setError(null);
            };
            
            ws.onclose = () => {
                console.log('WebSocket Disconnected');
                setConnected(false);
                setEAConnected(false);
                setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setError('WebSocket connection error');
            };
            
            ws.onmessage = (event) => {
                try {
                    console.log('Received message:', event.data);
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'update' || data.type === 'status') {
                        console.log('Processing update:', data);
                        setEAConnected(data.connected);
                        if (data.data) {
                            setAccountData(data.data);
                            // Update equity history
                            if (data.data.equity) {
                                setEquityHistory(prev => [...prev, {
                                    time: new Date().toLocaleTimeString(),
                                    equity: parseFloat(data.data.equity)
                                }].slice(-20));
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };
        };

        connectWebSocket();

        // Cleanup on unmount
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    // Regular polling for server status
    useEffect(() => {
        const fetchServerStatus = async () => {
            try {
                const response = await fetch('https://g1-back.onrender.com/ping');
                const data = await response.json();
                setServerStatus(data);
                console.log('Server status:', data);
            } catch (error) {
                console.error('Error fetching server status:', error);
            }
        };

        fetchServerStatus();
        const interval = setInterval(fetchServerStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 p-4">
            {/* Connection Status */}
            <div className={`p-4 rounded-md ${connected ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${connected ? 'text-green-700' : 'text-red-700'}`}>
                    {connected ? 'Connected to Trading Server' : 'Disconnected from Trading Server'}
                </p>
                <p className={`text-sm mt-2 ${eaConnected ? 'text-green-700' : 'text-yellow-700'}`}>
                    {eaConnected ? 'EA Connected' : 'EA Not Connected'}
                </p>
                {serverStatus && (
                    <div className="mt-2 text-sm">
                        <p>Server Time: {new Date(serverStatus.timestamp).toLocaleString()}</p>
                        <p>Connected Clients: {serverStatus.clientsCount}</p>
                    </div>
                )}
            </div>

            {/* Account Overview */}
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
                {eaConnected && accountData ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Balance</p>
                            <p className="text-lg font-medium">
                                ${parseFloat(accountData.balance || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Equity</p>
                            <p className="text-lg font-medium">
                                ${parseFloat(accountData.equity || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Margin</p>
                            <p className="text-lg font-medium">
                                ${parseFloat(accountData.margin || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Free Margin</p>
                            <p className="text-lg font-medium">
                                ${parseFloat(accountData.freeMargin || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500">Waiting for EA connection...</p>
                )}
            </div>

            {/* Debug Information */}
            <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-500">Debug Information</h3>
                <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify({
                        wsConnected: connected,
                        eaConnected,
                        serverStatus,
                        accountData
                    }, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default WebTerminal;