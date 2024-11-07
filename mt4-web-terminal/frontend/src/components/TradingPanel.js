import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { RefreshCw, X, Edit2, TrendingUp, TrendingDown } from 'lucide-react';

const TradingPanel = ({ positions = [] }) => {
    // State for new orders
    const [newOrder, setNewOrder] = useState({
        symbol: 'EURUSD',
        lots: 0.01,
        stopLoss: 0,
        takeProfit: 0,
    });

    // State for modify order
    const [modifyOrder, setModifyOrder] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

    // Execute new market order
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

            const data = await response.json();
            if (data.success) {
                setSuccess(`Order executed successfully!`);
                setError(null);
            } else {
                setError(data.error || 'Failed to execute order');
            }
        } catch (error) {
            setError('Network error: ' + error.message);
        }
    };

    // Modify existing position
    const modifyPosition = async (ticket) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'modify',
                    ticket,
                    stopLoss: modifyOrder.stopLoss,
                    takeProfit: modifyOrder.takeProfit
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

    // Close position
    const closePosition = async (ticket, partial = false, lots = null) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'close',
                    ticket,
                    partial,
                    lots
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

    // Close all positions
    const closeAllPositions = async (symbol = null, type = null) => {
        try {
            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'closeAll',
                    symbol,
                    type
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
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="p-2 border rounded"
                            value={newOrder.symbol}
                            onChange={(e) => setNewOrder({...newOrder, symbol: e.target.value})}
                        >
                            {symbols.map(sym => (
                                <option key={sym} value={sym}>{sym}</option>
                            ))}
                        </select>

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

                    <div className="flex gap-4 mt-4">
                        <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => executeMarketOrder(0)}
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Buy
                        </Button>
                        <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => executeMarketOrder(1)}
                        >
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Sell
                        </Button>
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
                        <div className="flex gap-2">
                            <Button onClick={() => closeAllPositions()}>
                                Close All Positions
                            </Button>
                            <Button onClick={() => closeAllPositions(null, 0)}>
                                Close All Buys
                            </Button>
                            <Button onClick={() => closeAllPositions(null, 1)}>
                                Close All Sells
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2">Ticket</th>
                                        <th className="px-4 py-2">Symbol</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Lots</th>
                                        <th className="px-4 py-2">Open Price</th>
                                        <th className="px-4 py-2">S/L</th>
                                        <th className="px-4 py-2">T/P</th>
                                        <th className="px-4 py-2">Profit</th>
                                        <th className="px-4 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((position) => (
                                        <tr key={position.ticket}>
                                            <td className="px-4 py-2">{position.ticket}</td>
                                            <td className="px-4 py-2">{position.symbol}</td>
                                            <td className="px-4 py-2">
                                                {position.type === 0 ? 
                                                    <TrendingUp className="text-green-600" /> : 
                                                    <TrendingDown className="text-red-600" />
                                                }
                                            </td>
                                            <td className="px-4 py-2">{position.lots}</td>
                                            <td className="px-4 py-2">{position.openPrice}</td>
                                            <td className="px-4 py-2">{position.stopLoss}</td>
                                            <td className="px-4 py-2">{position.takeProfit}</td>
                                            <td className="px-4 py-2">{position.profit}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setModifyOrder(position)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => closePosition(position.ticket)}
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
                                    <Button onClick={() => modifyPosition(modifyOrder.ticket)}>
                                        Save Changes
                                    </Button>
                                    <Button variant="secondary" onClick={() => setModifyOrder(null)}>
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
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="bg-green-50 text-green-700">
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default TradingPanel;