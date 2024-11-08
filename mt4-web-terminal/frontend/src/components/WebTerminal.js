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
            console.log('Executing trade:', { type, ...newOrder });
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'open',
                    symbol: newOrder.symbol,
                    type: type, // 0 for BUY, 1 for SELL
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
                setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
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
        <div className="w-full h-full overflow-hidden bg-[#0A0A0A] text-white">
            <div className="max-w-[1800px] mx-auto p-4 animate-blur-fade-in">
                {/* Header */}
                <div className="glass-effect rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="animate-slide-up">
                            <h1 className="text-2xl font-bold text-gradient">
                                Trading Terminal
                            </h1>
                            <p className="text-sm text-gray-400">Real-time market execution</p>
                        </div>
                        <div className="flex gap-2">
                            <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all duration-300 
                                ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                <Activity className="w-3 h-3" />
                                {connected ? 'Connected' : 'Disconnected'}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-all duration-300
                                ${eaConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                <Activity className="w-3 h-3" />
                                {eaConnected ? 'EA Active' : 'EA Inactive'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {['Balance', 'Equity', 'Free Margin'].map((title, index) => (
                        <div key={title} 
                             className="card-glow glass-effect rounded-xl p-4 animate-blur-fade-in"
                             style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-gray-400">{title}</p>
                                    <p className="text-xl font-bold mt-1 text-white">
                                        ${(accountData?.[title.toLowerCase().replace(' ', '')] || 0).toFixed(2)}
                                    </p>
                                </div>
                                {/* Icons can be added here */}
                            </div>
                            {title === 'Balance' && (
                                <div className="mt-2 text-xs text-blue-400">
                                    +${((accountData?.equity || 0) - (accountData?.balance || 0)).toFixed(2)}
                                </div>
                            )}
                            {title === 'Free Margin' && (
                                <div className="mt-2 text-xs text-gray-400">
                                    Used: ${(accountData?.margin || 0).toFixed(2)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Trading Interface */}
                <div className="grid grid-cols-[350px,1fr] gap-4">
                    {/* New Order Panel */}
                    <div className="glass-effect rounded-xl p-4 animate-blur-fade-in">
                        <h3 className="text-base font-bold mb-3 text-white">New Order</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={newOrder.symbol}
                                onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                                className="w-full h-9 bg-black/20 border border-white/10 rounded-lg px-3 text-sm text-white
                                         focus:ring-2 focus:ring-blue-500/40 transition-all duration-300"
                                placeholder="Symbol"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={newOrder.lots}
                                onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                className="w-full h-9 bg-black/20 border border-white/10 rounded-lg px-3 text-sm text-white
                                         focus:ring-2 focus:ring-blue-500/40 transition-all duration-300"
                                placeholder="Lots"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    value={newOrder.stopLoss}
                                    onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                    className="w-full h-9 bg-black/20 border border-white/10 rounded-lg px-3 text-sm text-white
                                             focus:ring-2 focus:ring-blue-500/40 transition-all duration-300"
                                    placeholder="Stop Loss"
                                />
                                <input
                                    type="number"
                                    value={newOrder.takeProfit}
                                    onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                    className="w-full h-9 bg-black/20 border border-white/10 rounded-lg px-3 text-sm text-white
                                             focus:ring-2 focus:ring-blue-500/40 transition-all duration-300"
                                    placeholder="Take Profit"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => executeTrade(0)}
                                    className="h-9 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg 
                                             text-sm font-medium flex items-center justify-center gap-1 transition-all duration-300"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Buy
                                </button>
                                <button
                                    onClick={() => executeTrade(1)}
                                    className="h-9 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg 
                                             text-sm font-medium flex items-center justify-center gap-1 transition-all duration-300"
                                >
                                    <TrendingDown className="w-4 h-4" />
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Positions Table */}
                    <div className="glass-effect rounded-xl p-4 animate-blur-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-bold text-white">Open Positions</h3>
                            <button 
                                onClick={() => handleCloseAll()}
                                className="px-3 h-7 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm
                                         transition-all duration-300"
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
                                <tbody className="text-white">
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
            </div>

            {/* Status Messages */}
            {error && (
                <div className="fixed bottom-4 right-4 max-w-md p-3 glass-effect text-red-400 rounded-lg
                             animate-blur-fade-in text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="fixed bottom-4 right-4 max-w-md p-3 glass-effect text-green-400 rounded-lg
                             animate-blur-fade-in text-sm">
                    {success}
                </div>
            )}
        </div>
    );
};

export default WebTerminal;