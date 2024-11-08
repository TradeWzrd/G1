import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, X, DollarSign, Wallet, Activity } from 'lucide-react';

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
        <div className="w-full max-w-[1920px] mx-auto min-h-screen bg-[#0A0A0A] p-4 md:p-6">
            {/* Header - More Compact */}
            <div className="backdrop-blur-md bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                            Trading Terminal
                        </h1>
                        <p className="text-sm text-gray-400">Real-time market execution</p>
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            <Activity className="w-3 h-3" />
                            {connected ? 'Connected' : 'Disconnected'}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${eaConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            <Activity className="w-3 h-3" />
                            {eaConnected ? 'EA Active' : 'EA Inactive'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid - More Compact */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Balance Card */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-400">Balance</p>
                            <p className="text-xl font-bold mt-1">
                                ${(accountData?.balance || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <DollarSign className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-400">
                        +${((accountData?.equity || 0) - (accountData?.balance || 0)).toFixed(2)}
                    </div>
                </div>

                {/* Equity Card */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-400">Equity</p>
                            <p className="text-xl font-bold mt-1">
                                ${(accountData?.equity || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Wallet className="w-4 h-4 text-purple-400" />
                        </div>
                    </div>
                    <div className="h-12 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={equityHistory}>
                                <Line type="monotone" dataKey="equity" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Free Margin Card */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-white/5">
                    <div>
                        <p className="text-xs text-gray-400">Free Margin</p>
                        <p className="text-xl font-bold mt-1">
                            ${(accountData?.freeMargin || 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                        Used: ${(accountData?.margin || 0).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Trading Interface */}
            <div className="grid grid-cols-[350px,1fr] gap-4">
                {/* New Order Panel */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-white/5">
                    <h3 className="text-base font-bold mb-3">New Order</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newOrder.symbol}
                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                            className="w-full h-9 bg-black/20 border border-white/5 rounded-lg px-3 text-sm text-white"
                            placeholder="Symbol"
                        />
                        <input
                            type="number"
                            step="0.01"
                            value={newOrder.lots}
                            onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                            className="w-full h-9 bg-black/20 border border-white/5 rounded-lg px-3 text-sm text-white"
                            placeholder="Lots"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                value={newOrder.stopLoss}
                                onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                className="w-full h-9 bg-black/20 border border-white/5 rounded-lg px-3 text-sm text-white"
                                placeholder="Stop Loss"
                            />
                            <input
                                type="number"
                                value={newOrder.takeProfit}
                                onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                className="w-full h-9 bg-black/20 border border-white/5 rounded-lg px-3 text-sm text-white"
                                placeholder="Take Profit"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => executeTrade(0)}
                                className="h-9 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Buy
                            </button>
                            <button
                                onClick={() => executeTrade(1)}
                                className="h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                            >
                                <TrendingDown className="w-4 h-4" />
                                Sell
                            </button>
                        </div>
                    </div>
                </div>

                {/* Positions Table */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-bold">Open Positions</h3>
                        <button 
                            onClick={() => handleCloseAll()}
                            className="px-3 h-7 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm"
                        >
                            Close All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-400">
                                    <th className="text-left py-2 font-medium">Symbol</th>
                                    <th className="text-left py-2 font-medium">Type</th>
                                    <th className="text-right py-2 font-medium">Lots</th>
                                    <th className="text-right py-2 font-medium">Open Price</th>
                                    <th className="text-right py-2 font-medium">Profit</th>
                                    <th className="text-right py-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions && positions.map((position) => (
                                    <tr key={position.ticket} className="border-t border-white/5">
                                        <td className="py-2 text-sm">{position.symbol}</td>
                                        <td className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                                            <div className="flex items-center gap-1 text-sm">
                                                {position.type === 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {position.type === 0 ? 'Buy' : 'Sell'}
                                            </div>
                                        </td>
                                        <td className="text-right text-sm">{position.lots?.toFixed(2) || '0.00'}</td>
                                        <td className="text-right text-sm">{position.openPrice?.toFixed(5) || '0.00000'}</td>
                                        <td className={`text-right text-sm ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ${position.profit?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => handleClosePosition(position.ticket)}
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg"
                                            >
                                                <X className="w-3 h-3" />
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
                <div className="fixed bottom-4 right-4 max-w-md p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/10 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="fixed bottom-4 right-4 max-w-md p-3 bg-green-500/10 text-green-400 rounded-lg border border-green-500/10 text-sm">
                    {success}
                </div>
            )}
        </div>
    );
};

export default WebTerminal;