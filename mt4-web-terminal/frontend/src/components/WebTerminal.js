import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WebTerminal = ({ connected, eaConnected, accountData: propAccountData, positions: propPositions = [] }) => {
    const [accountData, setAccountData] = useState(propAccountData);
    const [positions, setPositions] = useState(propPositions);
    const [loading, setLoading] = useState(false);
    const [newOrder, setNewOrder] = useState({
        symbol: '',
        lots: '0.01',
        stopLoss: '',
        takeProfit: '',
        comment: ''
    });

    // Update accountData when prop changes
    useEffect(() => {
        if (propAccountData) {
            setAccountData(propAccountData);
        }
    }, [propAccountData]);

    // Update positions when prop changes
    useEffect(() => {
        setPositions(propPositions);
    }, [propPositions]);

    // Send trade command
    const sendTradeCommand = async (action, ticket = null) => {
        if (!connected || !eaConnected) {
            toast.error('Not connected to server or MT4');
            return;
        }

        if (!ticket && !newOrder.symbol) {
            toast.error('Symbol is required');
            return;
        }

        setLoading(true);
        try {
            const command = {
                action,
                // For close action, use ticket as symbol
                symbol: action === 'close' ? ticket : newOrder.symbol,
                // Only include params for buy/sell actions
                params: action === 'close' ? undefined : {
                    lots: parseFloat(newOrder.lots) || 0.01,
                    sl: parseFloat(newOrder.stopLoss) || 0,
                    tp: parseFloat(newOrder.takeProfit) || 0,
                    comment: newOrder.comment || 'Web Terminal'
                }
            };

            console.log('Sending trade command:', command);

            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Trade command failed');
            }

            const result = await response.json();
            console.log('Trade response:', result);

            toast.success(`${action.toUpperCase()} order sent successfully`);
            
            // Clear form after successful order
            if (!ticket) {
                setNewOrder({
                    symbol: '',
                    lots: '0.01',
                    stopLoss: '',
                    takeProfit: '',
                    comment: ''
                });
            }
        } catch (error) {
            console.error('Trade error:', error);
            toast.error(`Failed to send ${action} order: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewOrder(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="p-4 bg-gray-900 text-white min-h-screen">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Web Terminal</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span>Server:</span>
                        <span className={`px-2 py-1 rounded ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>MT4:</span>
                        <span className={`px-2 py-1 rounded ${eaConnected ? 'bg-green-600' : 'bg-red-600'}`}>
                            {eaConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Account Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Balance</div>
                    <div className="text-lg font-semibold">${(accountData?.balance || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Equity</div>
                    <div className="text-lg font-semibold">${(accountData?.equity || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Margin</div>
                    <div className="text-lg font-semibold">${(accountData?.margin || 0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">Free Margin</div>
                    <div className="text-lg font-semibold">${(accountData?.freeMargin || 0).toFixed(2)}</div>
                </div>
            </div>

            {/* Trading Interface */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Form */}
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">New Order</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Symbol</label>
                            <input
                                type="text"
                                name="symbol"
                                value={newOrder.symbol}
                                onChange={handleInputChange}
                                placeholder="e.g., EURUSD"
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Lots</label>
                            <input
                                type="number"
                                name="lots"
                                step="0.01"
                                min="0.01"
                                value={newOrder.lots}
                                onChange={handleInputChange}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Stop Loss</label>
                            <input
                                type="number"
                                name="stopLoss"
                                step="0.00001"
                                value={newOrder.stopLoss}
                                onChange={handleInputChange}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Take Profit</label>
                            <input
                                type="number"
                                name="takeProfit"
                                step="0.00001"
                                value={newOrder.takeProfit}
                                onChange={handleInputChange}
                                className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => sendTradeCommand('buy')}
                                disabled={!connected || !eaConnected || loading || !newOrder.symbol}
                                className={`flex-1 py-2 px-4 rounded-md ${
                                    !connected || !eaConnected || loading || !newOrder.symbol
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {loading ? 'Sending...' : 'Buy'}
                            </button>
                            <button
                                onClick={() => sendTradeCommand('sell')}
                                disabled={!connected || !eaConnected || loading || !newOrder.symbol}
                                className={`flex-1 py-2 px-4 rounded-md ${
                                    !connected || !eaConnected || loading || !newOrder.symbol
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {loading ? 'Sending...' : 'Sell'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Positions Table */}
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-sm">
                                    <th className="py-2">Ticket</th>
                                    <th className="py-2">Symbol</th>
                                    <th className="py-2">Type</th>
                                    <th className="py-2">Lots</th>
                                    <th className="py-2">Price</th>
                                    <th className="py-2">Profit</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions && positions.length > 0 ? (
                                    positions.map((position) => (
                                        <tr key={position.ticket} className="border-t border-gray-700">
                                            <td className="py-2">{position.ticket}</td>
                                            <td className="py-2">{position.symbol}</td>
                                            <td className="py-2">
                                                <span className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="py-2">{(position.lots || 0).toFixed(2)}</td>
                                            <td className="py-2">{(position.openPrice || 0).toFixed(5)}</td>
                                            <td className="py-2">
                                                <span className={(position.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {(position.profit || 0).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="py-2">
                                                <button
                                                    onClick={() => sendTradeCommand('close', position.ticket)}
                                                    disabled={!connected || !eaConnected || loading}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Close
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="py-4 text-center text-gray-400">
                                            No open positions
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebTerminal;