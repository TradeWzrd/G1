import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import TradingPanel from './TradingPanel';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, X, Edit2, RefreshCw } from 'lucide-react';

const WebTerminal = () => {
    const [accountData, setAccountData] = useState(null);
    const [positions, setPositions] = useState([]);
    const [connected, setConnected] = useState(false);
    const [eaConnected, setEAConnected] = useState(false);
    const [error, setError] = useState(null);
    const [equityHistory, setEquityHistory] = useState([]);
    const [success, setSuccess] = useState(null);
    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0
    });

    useEffect(() => {
        const ws = new WebSocket('wss://g1-back.onrender.com');
        
        ws.onopen = () => {
            console.log('WebSocket Connected');
            setConnected(true);
            setError(null);
        };
        
        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setConnected(false);
            setEAConnected(false);
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received data:', data);
                
                if (data.type === 'update' || data.type === 'status') {
                    setEAConnected(data.connected);
                    if (data.data) {
                        // Set account data
                        setAccountData(data.data.account);
                        // Set positions if available
                        if (data.data.positions) {
                            setPositions(data.data.positions);
                        }
                        
                        // Track equity history
                        if (data.data.account?.equity) {
                            setEquityHistory(prev => [
                                ...prev,
                                {
                                    time: new Date().toLocaleTimeString(),
                                    equity: parseFloat(data.data.account.equity)
                                }
                            ].slice(-20)); // Keep only the last 20 entries
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value || 0);
    };

    const executeTrade = async (type) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'open',
                    type,
                    symbol: newOrder.symbol,
                    lots: newOrder.lots,
                    stopLoss: newOrder.stopLoss,
                    takeProfit: newOrder.takeProfit
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Order executed successfully!');
                setError(null);
                setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
            } else {
                setError(data.error || 'Failed to execute order');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    const handleClosePosition = async (ticket) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'close',
                    ticket
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Position closed successfully!');
                setError(null);
                setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
            } else {
                setError(data.error || 'Failed to close position');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    const handleCloseAll = async (type) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'closeAll',
                    type
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('All positions closed successfully!');
                setError(null);
                setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
            } else {
                setError(data.error || 'Failed to close positions');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
            {/* Status Messages */}
            {error && (
                <div className="mb-4 p-4 bg-red-500/20 text-red-500 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-4 bg-green-500/20 text-green-500 rounded-lg">
                    {success}
                </div>
            )}
            
            {/* Equity History Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={equityHistory}>
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="equity" stroke="#8884d8" />
                </LineChart>
            </ResponsiveContainer>

            {/* Connection Status */}
            <div className={`p-4 rounded-lg ${connected ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${connected ? 'text-green-700' : 'text-red-700'}`}>
                    {connected ? 'Connected to Trading Server' : 'Disconnected from Trading Server'}
                </p>
                <p className={`text-sm mt-2 ${eaConnected ? 'text-green-700' : 'text-yellow-700'}`}>
                    {eaConnected ? 'EA Connected' : 'EA Not Connected'}
                </p>
                {accountData && (
                    <div className="mt-2 text-sm text-gray-600">
                        <p>Account: {accountData.number}</p>
                        <p>Leverage: {accountData.leverage}</p>
                    </div>
                )}
            </div>

            {/* Account Overview */}
            {accountData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Account Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Balance</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.balance)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Equity</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.equity)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Margin</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.margin)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Free Margin</p>
                                <p className="text-lg font-medium">{formatCurrency(accountData.freeMargin)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trading Panel */}
            {eaConnected && (
                <TradingPanel positions={positions} />
            )}
        </div>
    );
};

export default WebTerminal;