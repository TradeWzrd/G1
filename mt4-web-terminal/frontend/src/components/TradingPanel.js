import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, X, Edit2, TrendingUp, TrendingDown } from 'lucide-react';

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
                    ...newOrder
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

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
        <div className="space-y-6">
            {/* New Order Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>New Market Order</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Symbol Input */}
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={symbolInput}
                                    onChange={handleSymbolInputChange}
                                    placeholder="Enter symbol"
                                    className="flex-grow"
                                />
                                <select
                                    className="p-2 border rounded"
                                    onChange={(e) => handleSymbolSelect(symbolInput + e.target.value)}
                                >
                                    <option value="">No Suffix</option>
                                    {symbolSuffixes.map(suffix => (
                                        <option key={suffix} value={suffix}>{suffix || 'None'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {commonSymbols.map(symbol => (
                                    <button
                                        key={symbol}
                                        onClick={() => handleSymbolSelect(symbol)}
                                        className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={newOrder.lots}
                                onChange={(e) => setNewOrder({...newOrder, lots: parseFloat(e.target.value)})}
                                placeholder="Lots"
                            />
                            <Input
                                type="number"
                                step="0.00001"
                                value={newOrder.stopLoss}
                                onChange={(e) => setNewOrder({...newOrder, stopLoss: parseFloat(e.target.value)})}
                                placeholder="Stop Loss"
                            />
                            <Input
                                type="number"
                                step="0.00001"
                                value={newOrder.takeProfit}
                                onChange={(e) => setNewOrder({...newOrder, takeProfit: parseFloat(e.target.value)})}
                                placeholder="Take Profit"
                            />
                        </div>

                        {/* Buy/Sell Buttons */}
                        <div className="flex gap-4">
                            <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => executeMarketOrder(0)}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Buy
                            </Button>
                            <Button 
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => executeMarketOrder(1)}
                            >
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Sell
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Open Positions */}
            <Card>
                <CardHeader>
                    <CardTitle>Open Positions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Close All Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            <Button 
                                variant="destructive" 
                                onClick={() => handleCloseAll()}
                            >
                                Close All Positions
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => handleCloseAll(0)}
                            >
                                Close All Buys
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => handleCloseAll(1)}
                            >
                                Close All Sells
                            </Button>
                        </div>

                        {/* Positions Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lots</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/L</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T/P</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {positions.map((position) => (
                                        <tr key={position.ticket}>
                                            <td className="px-6 py-4 whitespace-nowrap">{position.ticket}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{position.symbol}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {position.type === 0 ? 
                                                    <span className="text-green-600">Buy</span> : 
                                                    <span className="text-red-600">Sell</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatLots(position.lots)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatPrice(position.openPrice)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatPrice(position.stopLoss)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formatPrice(position.takeProfit)}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap ${position.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {Number(position.profit).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setModifyOrder(position)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleClosePosition(position.ticket)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modify Position Modal */}
            {modifyOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Card className="w-96">
                        <CardHeader>
                            <CardTitle>Modify Position #{modifyOrder.ticket}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Input
                                    type="number"
                                    step="0.00001"
                                    value={modifyOrder.stopLoss}
                                    onChange={(e) => setModifyOrder({
                                        ...modifyOrder,
                                        stopLoss: parseFloat(e.target.value)
                                    })}
                                    placeholder="Stop Loss"
                                />
                                <Input
                                    type="number"
                                    step="0.00001"
                                    value={modifyOrder.takeProfit}
                                    onChange={(e) => setModifyOrder({
                                        ...modifyOrder,
                                        takeProfit: parseFloat(e.target.value)
                                    })}
                                    placeholder="Take Profit"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleModifyPosition(
                                            modifyOrder.ticket,
                                            modifyOrder.stopLoss,
                                            modifyOrder.takeProfit
                                        )}
                                    >
                                        Save Changes
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        variant="outline"
                                        onClick={() => setModifyOrder(null)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        </Card>
                </div>
            )}

            {/* Error/Success Messages */}
            {error && (
                <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default TradingPanel;