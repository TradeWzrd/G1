import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WebTerminal = ({ connected, eaConnected, accountData: propAccountData, positions: propPositions = [] }) => {
    const [accountData, setAccountData] = useState(propAccountData);
    const [positions, setPositions] = useState(propPositions);
    const [loading, setLoading] = useState(false);
    const [newOrder, setNewOrder] = useState({
        symbol: 'XAUUSDm',
        lots: 0.01,
        stopLoss: '',
        takeProfit: '',
        comment: 'Web Terminal'
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
            toast.error('Not connected to trading server');
            return;
        }

        setLoading(true);
        try {
            const params = {
                risk: parseFloat(newOrder.lots)
            };

            if (newOrder.stopLoss) params.sl = parseFloat(newOrder.stopLoss);
            if (newOrder.takeProfit) params.tp = parseFloat(newOrder.takeProfit);
            if (newOrder.comment) params.comment = newOrder.comment;
            if (ticket) params.ticket = ticket;

            const command = {
                action,
                symbol: newOrder.symbol,
                params
            };

            const response = await fetch('https://g1-back.onrender.com/api/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(command)
            });

            const data = await response.json();
            if (data.status === 'command_sent') {
                toast.success(`${action.toUpperCase()} order sent successfully`);
            } else {
                toast.error('Failed to send order: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error sending trade command:', error);
            toast.error('Error sending trade command: ' + error.message);
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
        <div className="p-6 space-y-6">
            <div className="bg-[#1a1f2e] shadow-lg rounded-lg p-6 border border-[#2a3441]">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        MT4 Web Terminal
                    </h1>
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

                {/* Account Information */}
                {accountData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#111827] p-3 rounded-lg border border-[#2a3441]">
                            <div className="text-sm text-gray-400">Balance</div>
                            <div className="font-semibold text-white">${accountData.balance?.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#111827] p-3 rounded-lg border border-[#2a3441]">
                            <div className="text-sm text-gray-400">Equity</div>
                            <div className="font-semibold text-white">${accountData.equity?.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#111827] p-3 rounded-lg border border-[#2a3441]">
                            <div className="text-sm text-gray-400">Margin</div>
                            <div className="font-semibold text-white">${accountData.margin?.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#111827] p-3 rounded-lg border border-[#2a3441]">
                            <div className="text-sm text-gray-400">Free Margin</div>
                            <div className="font-semibold text-white">${accountData.freeMargin?.toFixed(2)}</div>
                        </div>
                    </div>
                )}

                {/* Trading Interface */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-white">New Order</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Symbol</label>
                                <input
                                    type="text"
                                    name="symbol"
                                    value={newOrder.symbol}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-lg border-[#2a3441] bg-[#111827] text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Lots</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="lots"
                                    value={newOrder.lots}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-lg border-[#2a3441] bg-[#111827] text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Stop Loss</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="stopLoss"
                                    value={newOrder.stopLoss}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-lg border-[#2a3441] bg-[#111827] text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Take Profit</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="takeProfit"
                                    value={newOrder.takeProfit}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-lg border-[#2a3441] bg-[#111827] text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Comment</label>
                                <input
                                    type="text"
                                    name="comment"
                                    value={newOrder.comment}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-lg border-[#2a3441] bg-[#111827] text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => sendTradeCommand('buy')}
                                    className={`flex-1 ${loading ? 'bg-gray-600' : 'bg-green-500 hover:bg-green-600'} 
                                        text-white px-4 py-2 rounded-lg transition-colors duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={!connected || !eaConnected || loading}
                                >
                                    {loading ? 'Sending...' : 'Buy'}
                                </button>
                                <button
                                    onClick={() => sendTradeCommand('sell')}
                                    className={`flex-1 ${loading ? 'bg-gray-600' : 'bg-red-500 hover:bg-red-600'}
                                        text-white px-4 py-2 rounded-lg transition-colors duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed`}
                                    disabled={!connected || !eaConnected || loading}
                                >
                                    {loading ? 'Sending...' : 'Sell'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Open Positions */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-white">Open Positions</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#2a3441]">
                                <thead className="bg-[#111827]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ticket</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lots</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Profit</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#1a1f2e] divide-y divide-[#2a3441]">
                                    {positions.map((position) => (
                                        <tr key={position.ticket}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.ticket}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.symbol}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={position.type === 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {position.type === 0 ? 'BUY' : 'SELL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.lots}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{position.openPrice}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={position.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {position.profit.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => sendTradeCommand('close', position.ticket)}
                                                    className="text-red-400 hover:text-red-300 transition-colors duration-200"
                                                    disabled={loading}
                                                >
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
        </div>
    );
};

export default WebTerminal;