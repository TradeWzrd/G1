import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, X, Edit2, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';

const TradingPanel = ({ positions = [] }) => {
    const [newOrder, setNewOrder] = useState({
        symbol: '',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0,
    });

    const [symbolSuffixes, setSymbolSuffixes] = useState(['', 'm', '-mini']);
    const [symbolInput, setSymbolInput] = useState('');
    const [modifyOrder, setModifyOrder] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const commonSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

    const formatPrice = (price) => Number(price).toFixed(5);
    const formatLots = (lots) => Number(lots).toFixed(2);

    const handleSymbolSelect = (symbol) => {
        setSymbolInput(symbol);
        setNewOrder({ ...newOrder, symbol });
    };

    const handleSymbolInputChange = (e) => {
        const value = e.target.value.toUpperCase();
        setSymbolInput(value);
        setNewOrder({ ...newOrder, symbol: value });
    };

    const executeMarketOrder = async (type) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'open',
                    type, // 0 for BUY, 1 for SELL
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
            } else {
                setError(data.error || 'Failed to close position');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    const handleModifyPosition = async (ticket, stopLoss, takeProfit) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'modify',
                    ticket,
                    stopLoss,
                    takeProfit
                })
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Position modified successfully!');
                setModifyOrder(null);
                setError(null);
            } else {
                setError(data.error || 'Failed to modify position');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    const handleCloseAll = async (type = null) => {
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
                setSuccess('Positions closed successfully!');
                setError(null);
            } else {
                setError(data.error || 'Failed to close positions');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-[#0a0f1a] text-white min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        Trading Terminal
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Execute and manage your trades</p>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center px-3 py-1 bg-green-500/10 text-green-500 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                        Market Open
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Trading Form */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <h3 className="text-lg font-bold mb-6">New Order</h3>
                        
                        {/* Symbol Input */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Symbol</label>
                                <Input
                                    type="text"
                                    value={symbolInput}
                                    onChange={handleSymbolInputChange}
                                    placeholder="Enter symbol..."
                                    className="bg-[#1a1f2e] border-[#2a3441] text-white"
                                />
                            </div>
                            
                            {/* Common Symbols */}
                            <div className="flex flex-wrap gap-2">
                                {commonSymbols.map(symbol => (
                                    <button
                                        key={symbol}
                                        onClick={() => handleSymbolSelect(symbol)}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 
                                            ${symbolInput === symbol 
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                                : 'bg-[#1a1f2e] text-gray-400 hover:text-gray-200 border border-[#2a3441]'}`}
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Lots</label>
                                <Input
                                    type="number"
                                    value={newOrder.lots}
                                    onChange={(e) => setNewOrder({ ...newOrder, lots: e.target.value })}
                                    step="0.01"
                                    min="0.01"
                                    className="bg-[#1a1f2e] border-[#2a3441] text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Stop Loss</label>
                                <Input
                                    type="number"
                                    value={newOrder.stopLoss}
                                    onChange={(e) => setNewOrder({ ...newOrder, stopLoss: e.target.value })}
                                    step="0.00001"
                                    className="bg-[#1a1f2e] border-[#2a3441] text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">Take Profit</label>
                                <Input
                                    type="number"
                                    value={newOrder.takeProfit}
                                    onChange={(e) => setNewOrder({ ...newOrder, takeProfit: e.target.value })}
                                    step="0.00001"
                                    className="bg-[#1a1f2e] border-[#2a3441] text-white"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <Button
                                onClick={() => executeMarketOrder(0)}
                                className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 py-5"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Buy
                            </Button>
                            <Button
                                onClick={() => executeMarketOrder(1)}
                                className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2 py-5"
                            >
                                <TrendingDown className="w-4 h-4" />
                                Sell
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Open Positions */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Open Positions</h3>
                                <p className="text-sm text-gray-400">Manage your active trades</p>
                            </div>
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-[#1a1f2e] hover:bg-[#2a3441] text-gray-400 hover:text-white"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-gray-400 border-b border-[#1f2937]">
                                        <th className="text-left p-3 font-medium">Ticket</th>
                                        <th className="text-left p-3 font-medium">Symbol</th>
                                        <th className="text-left p-3 font-medium">Type</th>
                                        <th className="text-right p-3 font-medium">Lots</th>
                                        <th className="text-right p-3 font-medium">Open Price</th>
                                        <th className="text-right p-3 font-medium">S/L</th>
                                        <th className="text-right p-3 font-medium">T/P</th>
                                        <th className="text-right p-3 font-medium">Profit</th>
                                        <th className="text-center p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.ticket} className="border-b border-[#1f2937] hover:bg-[#1a1f2e]">
                                            <td className="p-3">{position.ticket}</td>
                                            <td className="p-3">{position.symbol}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs
                                                    ${position.type === 0 
                                                        ? 'bg-green-500/20 text-green-400' 
                                                        : 'bg-red-500/20 text-red-400'}`}>
                                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">{formatLots(position.lots)}</td>
                                            <td className="p-3 text-right">{formatPrice(position.openPrice)}</td>
                                            <td className="p-3 text-right">{formatPrice(position.stopLoss)}</td>
                                            <td className="p-3 text-right">{formatPrice(position.takeProfit)}</td>
                                            <td className={`p-3 text-right font-medium
                                                ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${formatPrice(position.profit)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setModifyOrder(position)}
                                                        className="p-1 hover:bg-[#2a3441] rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-blue-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleClosePosition(position.ticket)}
                                                        className="p-1 hover:bg-[#2a3441] rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
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
                <Alert className="mt-4 bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="mt-4 bg-green-500/10 text-green-400 border border-green-500/20">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default TradingPanel;
