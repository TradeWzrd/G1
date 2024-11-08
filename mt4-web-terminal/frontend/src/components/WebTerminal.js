import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, X, Edit2, RefreshCw, Activity, DollarSign, Wallet } from 'lucide-react';

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
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        };
        
        ws.onmessage = (event) => {
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

                            if (data.data.account.equity) {
                                setEquityHistory(prev => [
                                    ...prev,
                                    {
                                        time: new Date().toLocaleTimeString(),
                                        equity: parseFloat(data.data.account.equity)
                                    }
                                ].slice(-20));
                            }
                        }

                        if (Array.isArray(data.data.positions)) {
                            const formattedPositions = data.data.positions.map(pos => ({
                                ticket: pos.ticket,
                                symbol: pos.symbol,
                                type: parseInt(pos.type || 0),
                                lots: parseFloat(pos.lots || 0),
                                openPrice: parseFloat(pos.openPrice || 0),
                                currentPrice: parseFloat(pos.currentPrice || 0),
                                stopLoss: parseFloat(pos.stopLoss || 0),
                                takeProfit: parseFloat(pos.takeProfit || 0),
                                profit: parseFloat(pos.profit || 0),
                                swap: parseFloat(pos.swap || 0)
                            }));
                            setPositions(formattedPositions);
                        } else {
                            setPositions([]);
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
        <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-6">
            {/* Glassmorphism Card for Status */}
            <div className="backdrop-blur-md bg-white/10 rounded-2xl p-6 mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Trading Terminal
                        </h1>
                        <p className="text-gray-400 mt-1">Real-time market execution</p>
                    </div>
                    <div className="flex gap-4">
                        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            <Activity className="w-4 h-4" />
                            {connected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${eaConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            <RefreshCw className="w-4 h-4" />
                            {eaConnected ? 'EA Active' : 'EA Inactive'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg border border-white/10">
                    <div className="flex flex-col p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-400">Balance</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(accountData?.balance || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="text-sm text-blue-400">
                                +${((accountData?.equity || 0) - (accountData?.balance || 0)).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg border border-white/10">
                    <div className="flex flex-col p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-400">Equity</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(accountData?.equity || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Wallet className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                        <div className="h-16 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={equityHistory}>
                                    <Line 
                                        type="monotone" 
                                        dataKey="equity" 
                                        stroke="rgba(168, 85, 247, 0.5)" 
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/10 to-red-500/10 backdrop-blur-lg border border-white/10">
                    <div className="flex flex-col p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-400">Free Margin</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${(accountData?.freeMargin || 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="text-sm text-gray-400">
                                Used: ${(accountData?.margin || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trading Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Order Card */}
                <div className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-xl font-bold mb-6">New Order</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={newOrder.symbol}
                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            placeholder="Symbol"
                        />
                        <input
                            type="number"
                            step="0.01"
                            value={newOrder.lots}
                            onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            placeholder="Lots"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                step="0.00001"
                                value={newOrder.stopLoss}
                                onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                placeholder="Stop Loss"
                            />
                            <input
                                type="number"
                                step="0.00001"
                                value={newOrder.takeProfit}
                                onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                placeholder="Take Profit"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => executeTrade(0)}
                                className="group relative w-full"
                            >
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative w-full bg-black/50 rounded-lg px-6 py-3 flex items-center justify-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Buy
                                </div>
                            </button>
                            <button
                                onClick={() => executeTrade(1)}
                                className="group relative w-full"
                            >
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                                <div className="relative w-full bg-black/50 rounded-lg px-6 py-3 flex items-center justify-center gap-2">
                                    <TrendingDown className="w-5 h-5" />
                                    Sell
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Positions Table */}
                <div className="lg:col-span-2 backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Open Positions</h3>
                        <button 
                            onClick={() => handleCloseAll()}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                            Close All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="text-gray-400 border-b border-white/10">
                                    <th className="text-left py-3 px-4">Symbol</th>
                                    <th className="text-left py-3 px-4">Type</th>
                                    <th className="text-right py-3 px-4">Lots</th>
                                    <th className="text-right py-3 px-4">Open Price</th>
                                    <th className="text-right py-3 px-4">Profit</th>
                                    <th className="text-right py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions && positions.map((position) => (
                                    <tr key={position.ticket} className="border-b border-white/5">
                                        <td className="py-3 px-4">{position.symbol}</td>
                                        <td className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                                            <div className="flex items-center gap-1">
                                                {position.type === 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {position.type === 0 ? 'Buy' : 'Sell'}
                                            </div>
                                        </td>
                                        <td className="text-right py-3 px-4">{position.lots?.toFixed(2) || '0.00'}</td>
                                        <td className="text-right py-3 px-4">{position.openPrice?.toFixed(5) || '0.00000'}</td>
                                        <td className={`text-right py-3 px-4 ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${position.profit?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="text-right py-3 px-4">
                                            <button
                                                onClick={() => handleClosePosition(position.ticket)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="fixed bottom-6 right-6 max-w-md p-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 backdrop-blur-md">
                    {error}
                </div>
            )}
            {success && (
                <div className="fixed bottom-6 right-6 max-w-md p-4 bg-green-500/20 text-green-400 rounded-lg border border-green-500/20 backdrop-blur-md">
                    {success}
                </div>
            )}
        </div>
    );
};

export default WebTerminal;