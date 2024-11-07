import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line } from 'recharts';

const BACKEND_WS_URL = 'ws://localhost:3000';
const BACKEND_HTTP_URL = 'http://localhost:3000';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);
    const [equityHistory, setEquityHistory] = useState([]);
    const [serverStatus, setServerStatus] = useState(null);

    const testHttpConnection = async () => {
        try {
            const response = await fetch(`${BACKEND_HTTP_URL}/ping`);
            const data = await response.json();
            setServerStatus(data);
            setEAConnected(data.eaConnected);
        } catch (error) {
            console.error('HTTP Test Failed:', error);
            setError('Failed to connect to server');
        }
    };

    useEffect(() => {
        testHttpConnection();
        const httpInterval = setInterval(testHttpConnection, 30000);

        const connectWebSocket = () => {
            console.log('Attempting WebSocket connection...');
            const ws = new WebSocket(BACKEND_WS_URL);
            
            ws.onopen = () => {
                setConnected(true);
                setError(null);
                console.log('WebSocket connected successfully');
            };
            
            ws.onclose = () => {
                setConnected(false);
                setEAConnected(false);
                setError('WebSocket disconnected');
                console.log('WebSocket disconnected, attempting to reconnect...');
                setTimeout(connectWebSocket, 5000);
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket data:', data);
                    
                    if (data.type === 'update' || data.type === 'status') {
                        setEAConnected(data.connected);
                        if (data.data) {
                            setAccountData(data.data);
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

            return ws;
        };

        const ws = connectWebSocket();

        return () => {
            clearInterval(httpInterval);
            if (ws) ws.close();
        };
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

            {/* Equity Chart */}
            {eaConnected && equityHistory.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Equity History</h2>
                    <div className="h-64">
                        <LineChart width={800} height={200} data={equityHistory}>
                            <XAxis dataKey="time" />
                            <YAxis domain={['auto', 'auto']} />
                            <Tooltip />
                            <Line type="monotone" dataKey="equity" stroke="#8884d8" />
                        </LineChart>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-700">{error}</p>
                </div>
            )}
        </div>
    );
};

export default WebTerminal;