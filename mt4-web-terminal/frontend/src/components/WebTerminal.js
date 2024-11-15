import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, X, DollarSign, Wallet, Activity, RefreshCw, BarChart2, Clock } from 'lucide-react';

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

    // WebSocket reference and reconnection settings
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000; // 2 seconds
    const reconnectBackoff = 1.5; // Exponential backoff multiplier

    // Format numbers with commas and 2 decimal places
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    // Format price with 5 decimal places
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
        }).format(price);
    };

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
                reconnectAttempts.current = 0; // Reset reconnection attempts on successful connection
            };

            ws.current.onclose = (event) => {
                console.log('WebSocket Disconnected', event.code, event.reason);
                setConnected(false);
                setEAConnected(false);

                // Only attempt to reconnect if we haven't exceeded max attempts
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
                    
                    if (data.type === 'update') {
                        setEAConnected(data.connected);
                        if (data.data) {
                            if (data.data.account) {
                                setAccountData({
                                    balance: parseFloat(data.data.account.balance || 0),
                                    equity: parseFloat(data.data.account.equity || 0),
                                    margin: parseFloat(data.data.account.margin || 0),
                                    freeMargin: parseFloat(data.data.account.freeMargin || 0)
                                });
                            }
                            if (data.data.positions) {
                                setPositions(data.data.positions);
                            }
                            if (data.data.equityHistory) {
                                setEquityHistory(data.data.equityHistory);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
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

        // Cleanup function
        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [connectWebSocket]);

    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1a1f2e] p-3 rounded-lg border border-[#2a3441] shadow-lg">
                    <p className="text-gray-400 text-sm">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {entry.name}: ${formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Handle trade execution
    const executeTrade = async (type) => {
        try {
            console.log('Executing trade:', { type, ...newOrder });
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'open',
                    symbol: newOrder.symbol,
                    type: type,
                    lots: parseFloat(newOrder.lots),
                    stopLoss: parseFloat(newOrder.stopLoss || 0),
                    takeProfit: parseFloat(newOrder.takeProfit || 0)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Trade response:', data);
            
            if (data.success) {
                setSuccess('Order executed successfully!');
                setError(null);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Failed to execute order');
            }
        } catch (error) {
            console.error('Trade error:', error);
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
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || 'Failed to close position');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    const handleCloseAll = async () => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'closeAll'
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('All positions closed successfully!');
                setError(null);
            } else {
                setError(data.error || 'Failed to close positions');
            }
        } catch (error) {
            console.error('Close all error:', error);
            setError('Network error: ' + error.message);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Web Terminal
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time Trading Interface</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm
                        ${eaConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${eaConnected ? 'bg-blue-500' : 'bg-yellow-500'} animate-pulse`}></div>
                        {eaConnected ? 'EA Connected' : 'EA Disconnected'}
                    </div>
                </div>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
                {/* Trading Panel */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* New Order Form */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-4">New Order</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Symbol</label>
                                <input
                                    type="text"
                                    value={newOrder.symbol}
                                    onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                                    className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                             focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                    placeholder="Enter symbol"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Lots</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newOrder.lots}
                                    onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                    className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                             focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                    placeholder="Enter lots"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Stop Loss</label>
                                    <input
                                        type="number"
                                        value={newOrder.stopLoss}
                                        onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                        className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                                 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                        placeholder="Stop Loss"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Take Profit</label>
                                    <input
                                        type="number"
                                        value={newOrder.takeProfit}
                                        onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                        className="w-full h-10 bg-[#1a1f2e] border border-[#2a3441] rounded-lg px-3 text-sm
                                                 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                                        placeholder="Take Profit"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={() => executeTrade(0)}
                                    className="h-10 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Buy
                                </button>
                                <button
                                    onClick={() => executeTrade(1)}
                                    className="h-10 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                                             font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    <TrendingDown className="w-4 h-4" />
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Account Overview */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-4">Account Overview</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Balance', value: accountData?.balance || 0, Icon: Wallet, color: 'text-blue-500' },
                                { label: 'Equity', value: accountData?.equity || 0, Icon: DollarSign, color: 'text-emerald-500' },
                                { label: 'Margin', value: accountData?.margin || 0, Icon: Activity, color: 'text-purple-500' },
                                { label: 'Free Margin', value: accountData?.freeMargin || 0, Icon: BarChart2, color: 'text-amber-500' }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg bg-opacity-10 ${item.color}`}>
                                            <item.Icon className={`w-4 h-4 ${item.color}`} />
                                        </div>
                                        <span className="text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="font-semibold">${formatCurrency(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Market Status */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Market Status</h3>
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                <span className="text-gray-400">Server Time</span>
                                <span className="font-semibold">
                                    {new Date().toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-[#1a1f2e] rounded-lg">
                                <span className="text-gray-400">Trading Session</span>
                                <span className="text-green-400 font-semibold">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart and Positions */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Chart Section */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Price Chart</h2>
                                <p className="text-sm text-gray-400">Real-time market visualization</p>
                            </div>
                            <div className="flex space-x-4">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-sm text-gray-400">Price</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                                    <span className="text-sm text-gray-400">Volume</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={equityHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis 
                                        dataKey="time" 
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280' }}
                                    />
                                    <YAxis 
                                        stroke="#6B7280"
                                        tick={{ fill: '#6B7280' }}
                                        tickFormatter={(value) => `$${formatCurrency(value)}`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Open Positions</h2>
                                <p className="text-sm text-gray-400">Manage your active trades</p>
                            </div>
                            <button
                                onClick={handleCloseAll}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                                         flex items-center gap-2 transition-all"
                            >
                                <X className="w-4 h-4" />
                                Close All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[#2a3441]">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Symbol</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Lots</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Open Price</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Current Price</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Profit</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.ticket} className="border-b border-[#2a3441] last:border-0">
                                            <td className="py-3 px-4 text-sm">{position.symbol}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm
                                                    ${position.type === 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {position.type === 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {position.type === 0 ? 'Buy' : 'Sell'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-sm">{position.lots?.toFixed(2)}</td>
                                            <td className="py-3 px-4 text-right text-sm">{formatPrice(position.openPrice)}</td>
                                            <td className="py-3 px-4 text-right text-sm">{formatPrice(position.currentPrice)}</td>
                                            <td className={`py-3 px-4 text-right text-sm font-medium
                                                ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${formatCurrency(position.profit)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => handleClosePosition(position.ticket)}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                                                             transition-all inline-flex items-center gap-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Close
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mt-4 p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 p-4 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                    {success}
                </div>
            )}
        </div>
    );
};

export default WebTerminal;